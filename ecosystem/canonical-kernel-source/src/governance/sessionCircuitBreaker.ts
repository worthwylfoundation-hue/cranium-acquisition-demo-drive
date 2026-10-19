import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

export type SessionCircuitState = 'CLOSED' | 'TRIPPED_OPEN' | 'RECOVERING_HALF_OPEN';

export interface SessionCheckpoint<TState = unknown> {
  checkpointId: string;
  sessionId: string;
  sequence: number;
  timestamp: number;
  stateSnapshot: TState;
  hash: string;
}

export interface CriticalSessionAlert {
  sessionId: string;
  severity: 'CRITICAL';
  reason: string;
  adversarialScore?: number;
  timestamp?: number;
}

export interface CircuitBreakerOptions<TState = unknown> {
  alertThreshold?: number;
  coolDownMs?: number;
  maxCheckpoints?: number;
  now?: () => number;
  cloneState?: (state: TState) => TState;
  hashState?: (state: TState) => string;
  onRollback?: (sessionId: string, checkpoint: SessionCheckpoint<TState>) => Promise<void>;
}

export interface GuardedExecutionContext {
  readonly sessionId: string;
  readonly signal: AbortSignal;
  assertActive(): void;
  assertCommitAllowed(): void;
}

export interface CircuitTripEvent {
  sessionId: string;
  state: 'TRIPPED_OPEN';
  reason: string;
  timestamp: number;
  checkpointId?: string;
}

export interface CircuitTransitionEvent {
  sessionId: string;
  from: SessionCircuitState;
  to: SessionCircuitState;
  timestamp: number;
  reason: string;
}

export interface SessionCircuitSnapshot {
  sessionId: string;
  state: SessionCircuitState;
  criticalAlerts: number;
  checkpointCount: number;
  lastCheckpointId?: string;
  trippedAt?: number;
}

/**
 * Runtime enforcement guard for asynchronous governance.
 *
 * An asynchronous evaluator cannot retroactively stop CPU instructions that
 * already executed. The enforceable boundary is therefore a revocable
 * execution lease: trip the session immediately, abort cooperative work,
 * block every subsequent tool/output commit, then restore the last verified
 * checkpoint. This closes the actual async enforcement gap.
 */
export class SessionCircuitBreaker<TState = unknown> {
  private readonly states = new Map<string, SessionCircuitState>();
  private readonly alertCounts = new Map<string, number>();
  private readonly checkpoints = new Map<string, SessionCheckpoint<TState>[]>();
  private readonly sequences = new Map<string, number>();
  private readonly tripTimes = new Map<string, number>();
  private readonly abortControllers = new Map<string, AbortController>();
  private readonly tripPromises = new Map<string, Promise<void>>();
  private readonly cooldownTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly events = new EventEmitter();
  private readonly options: {
    alertThreshold: number;
    coolDownMs: number;
    maxCheckpoints: number;
    now: () => number;
    cloneState: (state: TState) => TState;
    hashState: (state: TState) => string;
    onRollback?: (sessionId: string, checkpoint: SessionCheckpoint<TState>) => Promise<void>;
  };

  constructor(options: CircuitBreakerOptions<TState> = {}) {
    this.options = {
      alertThreshold: options.alertThreshold ?? 1,
      coolDownMs: options.coolDownMs ?? 30_000,
      maxCheckpoints: options.maxCheckpoints ?? 10,
      now: options.now ?? (() => Date.now()),
      cloneState: options.cloneState ?? ((state) => structuredClone(state)),
      hashState: options.hashState ?? ((state) =>
        createHash('sha256').update(JSON.stringify(state)).digest('hex')),
      onRollback: options.onRollback,
    };

    if (!Number.isSafeInteger(this.options.alertThreshold) || this.options.alertThreshold < 1) {
      throw new Error('INVALID_CIRCUIT_ALERT_THRESHOLD');
    }
    if (!Number.isFinite(this.options.coolDownMs) || this.options.coolDownMs < 0) {
      throw new Error('INVALID_CIRCUIT_COOLDOWN');
    }
    if (!Number.isSafeInteger(this.options.maxCheckpoints) || this.options.maxCheckpoints < 1) {
      throw new Error('INVALID_CIRCUIT_CHECKPOINT_LIMIT');
    }
  }

  getSessionState(sessionId: string): SessionCircuitState {
    return this.states.get(sessionId) ?? 'CLOSED';
  }

  snapshot(sessionId: string): SessionCircuitSnapshot {
    const history = this.checkpoints.get(sessionId) ?? [];
    return {
      sessionId,
      state: this.getSessionState(sessionId),
      criticalAlerts: this.alertCounts.get(sessionId) ?? 0,
      checkpointCount: history.length,
      lastCheckpointId: history.at(-1)?.checkpointId,
      trippedAt: this.tripTimes.get(sessionId),
    };
  }

  onTrip(listener: (event: CircuitTripEvent) => void): () => void {
    this.events.on('trip', listener);
    return () => this.events.off('trip', listener);
  }

  onTransition(listener: (event: CircuitTransitionEvent) => void): () => void {
    this.events.on('transition', listener);
    return () => this.events.off('transition', listener);
  }

  /** Synchronous pre-flight boundary. */
  assertSessionAccess(sessionId: string): void {
    if (this.getSessionState(sessionId) === 'TRIPPED_OPEN') {
      throw new Error(`CRANIUM_SESSION_BLOCKED: session '${sessionId}' is TRIPPED_OPEN`);
    }
  }

  /** Register a verified restore point before mutation/inference. */
  registerCheckpoint(sessionId: string, state: TState, checkpointId?: string): SessionCheckpoint<TState> {
    this.assertSessionAccess(sessionId);
    const sequence = (this.sequences.get(sessionId) ?? 0) + 1;
    this.sequences.set(sessionId, sequence);

    const snapshot = this.options.cloneState(state);
    const checkpoint: SessionCheckpoint<TState> = {
      checkpointId: checkpointId ?? `chk_${this.options.now()}_${sequence}`,
      sessionId,
      sequence,
      timestamp: this.options.now(),
      stateSnapshot: snapshot,
      hash: this.options.hashState(snapshot),
    };

    const history = this.checkpoints.get(sessionId) ?? [];
    history.push(checkpoint);
    while (history.length > this.options.maxCheckpoints) history.shift();
    this.checkpoints.set(sessionId, history);
    return checkpoint;
  }

  /** Adapter entry point for any asynchronous subconscious/evaluator source. */
  acceptAlert(alert: CriticalSessionAlert): Promise<void> {
    const count = (this.alertCounts.get(alert.sessionId) ?? 0) + 1;
    this.alertCounts.set(alert.sessionId, count);
    if (count < this.options.alertThreshold) return Promise.resolve();

    return this.trip(
      alert.sessionId,
      alert.reason,
      alert.timestamp ?? this.options.now(),
    );
  }

  /**
   * Revokes the session lease BEFORE awaiting rollback. This ordering is the
   * key property that makes asynchronous detection enforceable at the runtime
   * boundary rather than merely advisory.
   */
  async trip(sessionId: string, reason: string, timestamp = this.options.now()): Promise<void> {
    const existing = this.tripPromises.get(sessionId);
    if (existing) return existing;

    const operation = this.tripInternal(sessionId, reason, timestamp);
    this.tripPromises.set(sessionId, operation);
    try {
      await operation;
    } finally {
      this.tripPromises.delete(sessionId);
    }
  }

  private async tripInternal(sessionId: string, reason: string, timestamp: number): Promise<void> {
    const previous = this.getSessionState(sessionId);
    if (previous === 'TRIPPED_OPEN') return;

    this.states.set(sessionId, 'TRIPPED_OPEN');
    this.tripTimes.set(sessionId, timestamp);
    this.getOrCreateAbortController(sessionId).abort(new Error(reason));

    const checkpoint = this.getLatestVerifiedCheckpoint(sessionId);
    this.events.emit('trip', {
      sessionId,
      state: 'TRIPPED_OPEN',
      reason,
      timestamp,
      ...(checkpoint ? { checkpointId: checkpoint.checkpointId } : {}),
    } satisfies CircuitTripEvent);
    this.emitTransition(sessionId, previous, 'TRIPPED_OPEN', reason);

    const existingTimer = this.cooldownTimers.get(sessionId);
    if (existingTimer) clearTimeout(existingTimer);
    this.cooldownTimers.set(sessionId, setTimeout(() => {
      if (this.getSessionState(sessionId) !== 'TRIPPED_OPEN') return;
      this.states.set(sessionId, 'RECOVERING_HALF_OPEN');
      this.getOrCreateAbortController(sessionId);
      this.emitTransition(sessionId, 'TRIPPED_OPEN', 'RECOVERING_HALF_OPEN', 'cooldown elapsed');
    }, this.options.coolDownMs));

    if (!checkpoint) {
      throw new Error(`CRANIUM_ROLLBACK_UNAVAILABLE: no verified checkpoint for session '${sessionId}'`);
    }

    this.verifyCheckpoint(checkpoint);
    await this.options.onRollback?.(sessionId, checkpoint);
  }

  /**
   * Execute work under a revocable lease. Handlers must call
   * assertCommitAllowed() immediately before each externally visible side
   * effect, especially tool calls and stream/output writes.
   */
  async execute<T>(
    sessionId: string,
    state: TState,
    handler: (context: GuardedExecutionContext) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    this.assertSessionAccess(sessionId);
    this.registerCheckpoint(sessionId, state);

    const sessionController = this.getOrCreateAbortController(sessionId);
    const mergedSignal = this.mergeSignals(sessionController.signal, signal);

    const context: GuardedExecutionContext = {
      sessionId,
      signal: mergedSignal,
      assertActive: () => {
        if (mergedSignal.aborted || this.getSessionState(sessionId) === 'TRIPPED_OPEN') {
          throw new Error(`CRANIUM_SESSION_INTERRUPTED: session '${sessionId}'`);
        }
      },
      assertCommitAllowed: () => {
        if (mergedSignal.aborted || this.getSessionState(sessionId) === 'TRIPPED_OPEN') {
          throw new Error(`CRANIUM_COMMIT_BLOCKED: session '${sessionId}' lost its execution lease`);
        }
      },
    };

    context.assertActive();
    try {
      const result = await handler(context);
      context.assertCommitAllowed();
      return result;
    } catch (error) {
      if (mergedSignal.aborted && this.getSessionState(sessionId) === 'TRIPPED_OPEN') {
        throw new Error(`CRANIUM_SESSION_INTERRUPTED: session '${sessionId}'`, { cause: error });
      }
      throw error;
    }
  }

  /** Administrative/manual recovery after successful half-open probation. */
  resetSession(sessionId: string, reason = 'manual reset'): void {
    const previous = this.getSessionState(sessionId);
    const timer = this.cooldownTimers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.cooldownTimers.delete(sessionId);
    this.alertCounts.set(sessionId, 0);
    this.tripTimes.delete(sessionId);
    this.states.set(sessionId, 'CLOSED');
    this.abortControllers.set(sessionId, new AbortController());

    if (previous !== 'CLOSED') {
      this.emitTransition(sessionId, previous, 'CLOSED', reason);
    }
  }

  /** Gate for a half-open recovery probe. */
  assertHalfOpenProbe(sessionId: string): void {
    const state = this.getSessionState(sessionId);
    if (state === 'TRIPPED_OPEN') {
      throw new Error(`CRANIUM_PROBE_BLOCKED: session '${sessionId}' remains TRIPPED_OPEN`);
    }
    if (state !== 'CLOSED' && state !== 'RECOVERING_HALF_OPEN') {
      throw new Error(`CRANIUM_PROBE_INVALID_STATE: session '${sessionId}' is ${state}`);
    }
  }

  private getLatestVerifiedCheckpoint(sessionId: string): SessionCheckpoint<TState> | undefined {
    const history = this.checkpoints.get(sessionId) ?? [];
    for (let i = history.length - 1; i >= 0; i -= 1) {
      try {
        this.verifyCheckpoint(history[i]);
        return history[i];
      } catch {
        // Never restore an unverified checkpoint.
      }
    }
    return undefined;
  }

  private verifyCheckpoint(checkpoint: SessionCheckpoint<TState>): void {
    const expected = this.options.hashState(checkpoint.stateSnapshot);
    if (expected !== checkpoint.hash) {
      throw new Error(`CRANIUM_CHECKPOINT_TAMPERED: ${checkpoint.checkpointId}`);
    }
  }

  private getOrCreateAbortController(sessionId: string): AbortController {
    let controller = this.abortControllers.get(sessionId);
    if (!controller || controller.signal.aborted) {
      controller = new AbortController();
      this.abortControllers.set(sessionId, controller);
    }
    return controller;
  }

  private mergeSignals(primary: AbortSignal, secondary?: AbortSignal): AbortSignal {
    if (!secondary) return primary;
    if (secondary.aborted) return secondary;

    const controller = new AbortController();
    const abort = (event: Event) => controller.abort((event.target as AbortSignal).reason);
    primary.addEventListener('abort', abort, { once: true });
    secondary.addEventListener('abort', abort, { once: true });
    return controller.signal;
  }

  private emitTransition(
    sessionId: string,
    from: SessionCircuitState,
    to: SessionCircuitState,
    reason: string,
  ): void {
    this.events.emit('transition', {
      sessionId,
      from,
      to,
      timestamp: this.options.now(),
      reason,
    } satisfies CircuitTransitionEvent);
  }
}
