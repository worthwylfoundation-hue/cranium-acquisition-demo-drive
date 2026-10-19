import { createHash } from 'node:crypto';

export type SessionCircuitState = 'CLOSED' | 'TRIPPED_OPEN' | 'RECOVERING_HALF_OPEN';
export type CircuitSeverity = 'INFO' | 'ELEVATED' | 'CRITICAL';

export interface SessionCheckpoint<T> {
  checkpointId: string;
  sessionId: string;
  generation: number;
  sequence: number;
  createdAt: number;
  stateHash: string;
  state: T;
}

export interface CriticalSessionEvent {
  eventId: string;
  sessionId: string;
  generation: number;
  severity: CircuitSeverity;
  reason: string;
  observedAt: number;
  evidenceHash: string;
}

export interface CircuitReceipt {
  receiptId: string;
  type:
    | 'CHECKPOINT_CREATED'
    | 'CIRCUIT_TRIPPED'
    | 'EXECUTION_BLOCKED'
    | 'ROLLBACK_COMMITTED'
    | 'RECOVERY_STARTED'
    | 'RECOVERY_COMMITTED'
    | 'RECOVERY_REJECTED';
  sessionId: string;
  generation: number;
  sequence: number;
  eventId?: string;
  checkpointId?: string;
  previousState: SessionCircuitState;
  nextState: SessionCircuitState;
  timestamp: number;
  payloadHash: string;
}

export interface SessionCircuitSnapshot<T> {
  version: 'session-circuit-breaker-v1';
  sessionId: string;
  generation: number;
  state: SessionCircuitState;
  sequence: number;
  receipts: CircuitReceipt[];
  checkpoints: SessionCheckpoint<T>[];
  activeCheckpointId: string | null;
  trippedByEventId: string | null;
}

export class SessionCircuitBreakerError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SessionCircuitBreakerError';
  }
}

function hashCanonical(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
  }
  throw new SessionCircuitBreakerError('NON_CANONICAL_VALUE', 'Circuit payload contains an unsupported value');
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Synchronous enforcement bridge for asynchronous cognitive risk signals.
 * The evaluator can request a trip, but only this authority boundary changes
 * session state, selects a verified checkpoint, and commits rollback/recovery.
 */
export class SessionCircuitBreaker<T> {
  private state: SessionCircuitState = 'CLOSED';
  private generation = 0;
  private sequence = 0;
  private checkpoints: SessionCheckpoint<T>[] = [];
  private receipts: CircuitReceipt[] = [];
  private activeCheckpointId: string | null = null;
  private trippedByEventId: string | null = null;
  private recoveryEventId: string | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly stateHasher: (state: T) => string = hashCanonical,
    private readonly now: () => number = Date.now,
  ) {
    if (!sessionId) throw new SessionCircuitBreakerError('INVALID_SESSION', 'sessionId is required');
  }

  get currentState(): SessionCircuitState { return this.state; }
  get currentGeneration(): number { return this.generation; }

  checkpoint(state: T): SessionCheckpoint<T> {
    this.assertExecutionAllowed();
    const checkpoint: SessionCheckpoint<T> = {
      checkpointId: `cp_${this.sessionId}_${this.generation}_${this.sequence + 1}`,
      sessionId: this.sessionId,
      generation: this.generation,
      sequence: ++this.sequence,
      createdAt: this.now(),
      stateHash: this.stateHasher(state),
      state: clone(state),
    };
    this.checkpoints.push(checkpoint);
    this.activeCheckpointId = checkpoint.checkpointId;
    this.record('CHECKPOINT_CREATED', this.state, this.state, checkpoint.checkpointId);
    return clone(checkpoint);
  }

  assertExecutionAllowed(): void {
    if (this.state !== 'CLOSED') {
      this.record('EXECUTION_BLOCKED', this.state, this.state, undefined, this.trippedByEventId ?? undefined);
      throw new SessionCircuitBreakerError('SESSION_EXECUTION_BLOCKED', `Session ${this.sessionId} is ${this.state}`);
    }
  }

  trip(event: CriticalSessionEvent): CircuitReceipt {
    this.assertEventForCurrentGeneration(event);
    if (event.severity !== 'CRITICAL') throw new SessionCircuitBreakerError('NON_CRITICAL_TRIP', 'Only CRITICAL events may trip the session circuit');
    if (this.state !== 'CLOSED') throw new SessionCircuitBreakerError('CIRCUIT_ALREADY_OPEN', 'Session circuit is already tripped or recovering');
    if (!this.activeCheckpointId) throw new SessionCircuitBreakerError('NO_VERIFIED_CHECKPOINT', 'Cannot trip without a verified checkpoint');
    this.state = 'TRIPPED_OPEN';
    this.trippedByEventId = event.eventId;
    return this.record('CIRCUIT_TRIPPED', event, event, this.activeCheckpointId, event.eventId);
  }

  rollback(): { checkpoint: SessionCheckpoint<T>; receipt: CircuitReceipt } {
    if (this.state !== 'TRIPPED_OPEN') throw new SessionCircuitBreakerError('ROLLBACK_NOT_AUTHORIZED', 'Rollback requires TRIPPED_OPEN state');
    const checkpoint = this.selectVerifiedCheckpoint();
    this.verifyCheckpoint(checkpoint);
    const previous = this.state;
    this.generation += 1;
    this.state = 'RECOVERING_HALF_OPEN';
    this.recoveryEventId = this.trippedByEventId;
    const receipt = this.record('ROLLBACK_COMMITTED', checkpoint, checkpoint, checkpoint.checkpointId, this.trippedByEventId ?? undefined, previous, this.state);
    return { checkpoint: clone({ ...checkpoint, generation: this.generation }), receipt };
  }

  beginRecovery(): CircuitReceipt {
    if (this.state !== 'RECOVERING_HALF_OPEN') throw new SessionCircuitBreakerError('RECOVERY_NOT_READY', 'Session is not in RECOVERING_HALF_OPEN state');
    return this.record('RECOVERY_STARTED', this.generation, this.generation);
  }

  commitRecovery(success: boolean, eventId?: string): CircuitReceipt {
    if (this.state !== 'RECOVERING_HALF_OPEN') throw new SessionCircuitBreakerError('RECOVERY_NOT_READY', 'Recovery requires RECOVERING_HALF_OPEN state');
    if (eventId && eventId !== this.recoveryEventId) throw new SessionCircuitBreakerError('STALE_RECOVERY_EVENT', 'Recovery event does not belong to the current recovery generation');
    const previous = this.state;
    this.state = success ? 'CLOSED' : 'TRIPPED_OPEN';
    if (success) this.trippedByEventId = null;
    return this.record(success ? 'RECOVERY_COMMITTED' : 'RECOVERY_REJECTED', success, this.state, this.activeCheckpointId ?? undefined, eventId, previous, this.state);
  }

  snapshot(): SessionCircuitSnapshot<T> {
    return {
      version: 'session-circuit-breaker-v1',
      sessionId: this.sessionId,
      generation: this.generation,
      state: this.state,
      sequence: this.sequence,
      receipts: clone(this.receipts),
      checkpoints: clone(this.checkpoints),
      activeCheckpointId: this.activeCheckpointId,
      trippedByEventId: this.trippedByEventId,
    };
  }

  restore(snapshot: SessionCircuitSnapshot<T>): void {
    if (snapshot.version !== 'session-circuit-breaker-v1' || snapshot.sessionId !== this.sessionId) throw new SessionCircuitBreakerError('INVALID_SNAPSHOT', 'Snapshot version or session binding is invalid');
    if (!Number.isSafeInteger(snapshot.generation) || snapshot.generation < 0 || !Number.isSafeInteger(snapshot.sequence) || snapshot.sequence < 0) throw new SessionCircuitBreakerError('INVALID_SNAPSHOT', 'Snapshot counters are invalid');
    for (const checkpoint of snapshot.checkpoints) {
      if (checkpoint.sessionId !== this.sessionId || checkpoint.stateHash !== this.stateHasher(checkpoint.state)) throw new SessionCircuitBreakerError('INVALID_CHECKPOINT', `Checkpoint ${checkpoint.checkpointId} failed integrity verification`);
    }
    if (snapshot.activeCheckpointId && !snapshot.checkpoints.some((cp) => cp.checkpointId === snapshot.activeCheckpointId)) throw new SessionCircuitBreakerError('INVALID_SNAPSHOT', 'Active checkpoint is missing');
    this.generation = snapshot.generation;
    this.sequence = snapshot.sequence;
    this.state = snapshot.state;
    this.receipts = clone(snapshot.receipts);
    this.checkpoints = clone(snapshot.checkpoints);
    this.activeCheckpointId = snapshot.activeCheckpointId;
    this.trippedByEventId = snapshot.trippedByEventId;
  }

  private assertEventForCurrentGeneration(event: CriticalSessionEvent): void {
    if (event.sessionId !== this.sessionId) throw new SessionCircuitBreakerError('SESSION_MISMATCH', 'Risk event belongs to another session');
    if (event.generation !== this.generation) throw new SessionCircuitBreakerError('STALE_GENERATION_EVENT', `Risk event generation ${event.generation} is stale; current generation is ${this.generation}`);
    if (!event.eventId || !event.evidenceHash || !event.reason) throw new SessionCircuitBreakerError('INVALID_CRITICAL_EVENT', 'Critical event requires identity, evidence hash, and reason');
  }

  private selectVerifiedCheckpoint(): SessionCheckpoint<T> {
    for (let index = this.checkpoints.length - 1; index >= 0; index -= 1) {
      const checkpoint = this.checkpoints[index];
      if (checkpoint.generation !== this.generation) continue;
      try {
        this.verifyCheckpoint(checkpoint);
        return checkpoint;
      } catch { /* continue to the previous verified checkpoint */ }
    }
    throw new SessionCircuitBreakerError('NO_VERIFIED_CHECKPOINT', 'No verified checkpoint exists for the current session generation');
  }

  private verifyCheckpoint(checkpoint: SessionCheckpoint<T>): void {
    if (checkpoint.sessionId !== this.sessionId || checkpoint.generation !== this.generation || checkpoint.stateHash !== this.stateHasher(checkpoint.state)) throw new SessionCircuitBreakerError('CHECKPOINT_INTEGRITY_FAILURE', `Checkpoint ${checkpoint.checkpointId} failed integrity verification`);
  }

  private record(type: CircuitReceipt['type'], payload: unknown, _next: unknown, checkpointId?: string, eventId?: string, previousState = this.state, nextState = this.state): CircuitReceipt {
    const receipt: CircuitReceipt = {
      receiptId: `receipt_${this.sessionId}_${++this.sequence}`,
      type,
      sessionId: this.sessionId,
      generation: this.generation,
      sequence: this.sequence,
      ...(eventId ? { eventId } : {}),
      ...(checkpointId ? { checkpointId } : {}),
      previousState,
      nextState,
      timestamp: this.now(),
      payloadHash: hashCanonical(payload),
    };
    this.receipts.push(receipt);
    return clone(receipt);
  }
}
