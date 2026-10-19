import type {
  AuthorityTransition,
  AuthorityTransitionRequest,
  KernelState,
  ReplayStatus,
} from '../kernel/types';
import { DefaultAuthorityTransitionEngine, KernelStateReducer } from '../kernel/engine';
import { InMemoryReplayGuard } from '../kernel/replayGuard';
import { CanonicalEncoder } from '../kernel/engine';
import { assertCommandLawTransition } from '../kernel/commandLaw';

export const CANONICAL_AUTHORITY = 'cranium-kernel' as const;

export interface CanonicalReceipt {
  authority: typeof CANONICAL_AUTHORITY;
  transactionId: string;
  requestHash: string;
  journalSequence: number;
  stateHash: string;
  decision: AuthorityTransition['decision']['type'];
}

export interface DurableAuthorityStore {
  load(): { state: KernelState; journalSequence: number; stateHash: string };
  getReplayRecords?(): Array<{ idempotencyKey: string; canonicalRequestHashHex: string; transitionId: string; timestamp: number }>;
  getReceiptForTransition?(transitionId: string): CanonicalReceipt | null;
  verifyReceipt(receipt: CanonicalReceipt): boolean;
  commit(input: {
    expectedStateHash: string;
    request: AuthorityTransitionRequest;
    transition: AuthorityTransition;
    nextState: KernelState;
    replayStatus: ReplayStatus;
  }): CanonicalReceipt;
}

export interface AsyncDurableAuthorityStore {
  load(): Promise<{ state: KernelState; journalSequence: number; stateHash: string }>;
  getReplayRecords?(): Promise<Array<{ idempotencyKey: string; canonicalRequestHashHex: string; transitionId: string; timestamp: number }>>;
  getReceiptForTransition?(transitionId: string): Promise<CanonicalReceipt | null>;
  verifyReceipt(receipt: CanonicalReceipt): Promise<boolean>;
  commit(input: { expectedStateHash: string; request: AuthorityTransitionRequest; transition: AuthorityTransition; nextState: KernelState; replayStatus: ReplayStatus }): Promise<CanonicalReceipt>;
}

export interface AsyncAuthorityProxy {
  evaluate(request: AuthorityTransitionRequest): Promise<{ transition: AuthorityTransition; replayStatus: ReplayStatus }>;
  commit(request: AuthorityTransitionRequest): Promise<CanonicalReceipt>;
  verifyReceipt(receipt: CanonicalReceipt): Promise<boolean>;
  readonly authority: typeof CANONICAL_AUTHORITY;
}

export interface AuthorityProxy {
  evaluate(request: AuthorityTransitionRequest): {
    transition: AuthorityTransition;
    replayStatus: ReplayStatus;
  };
  commit(request: AuthorityTransitionRequest): CanonicalReceipt;
  verifyReceipt(receipt: CanonicalReceipt): boolean;
  readonly authority: typeof CANONICAL_AUTHORITY;
}

/**
 * The only supported external write boundary. Callers cannot provide a state
 * object or reducer; the proxy loads canonical state, evaluates through the
 * Kernel engine, reduces through the Kernel reducer, and durably commits the
 * resulting transition.
 */
export class KernelAuthorityProxy implements AuthorityProxy {
  readonly authority = CANONICAL_AUTHORITY;
  private readonly replayGuard = new InMemoryReplayGuard();
  private readonly engine = new DefaultAuthorityTransitionEngine(this.replayGuard);

  constructor(private readonly store: DurableAuthorityStore) {
    for (const record of store.getReplayRecords?.() ?? []) this.replayGuard.record(record);
  }

  evaluate(request: AuthorityTransitionRequest) {
    const loaded = this.store.load();
    const evaluated = this.engine.evaluate(request, loaded.state);
    assertCommandLawTransition(evaluated.transition, this.authority);
    return evaluated;
  }

  commit(request: AuthorityTransitionRequest): CanonicalReceipt {
    const loaded = this.store.load();
    const evaluated = this.engine.evaluate(request, loaded.state);
    assertCommandLawTransition(evaluated.transition, this.authority);
    if (evaluated.replayStatus.type === 'Existing') {
      const priorReceipt = this.store.getReceiptForTransition?.(evaluated.replayStatus.transitionId);
      if (priorReceipt) return priorReceipt;
    }
    const nextState = KernelStateReducer.reduce(
      loaded.state,
      evaluated.transition,
      this.replayGuard,
      request,
      evaluated.replayStatus,
    );
    return this.store.commit({
      expectedStateHash: loaded.stateHash,
      request,
      transition: evaluated.transition,
      nextState,
      replayStatus: evaluated.replayStatus,
    });
  }

  verifyReceipt(receipt: CanonicalReceipt): boolean {
    if (receipt.authority !== CANONICAL_AUTHORITY) return false;
    return this.store.verifyReceipt(receipt);
  }
}

export class AsyncKernelAuthorityProxy implements AsyncAuthorityProxy {
  readonly authority = CANONICAL_AUTHORITY;
  private readonly replayGuard = new InMemoryReplayGuard();
  private readonly engine = new DefaultAuthorityTransitionEngine(this.replayGuard);

  constructor(private readonly store: AsyncDurableAuthorityStore) {}

  private async hydrateReplayGuard(): Promise<void> {
    for (const record of await this.store.getReplayRecords?.() ?? []) this.replayGuard.record(record);
  }

  async evaluate(request: AuthorityTransitionRequest) {
    await this.hydrateReplayGuard();
    const loaded = await this.store.load();
    const evaluated = this.engine.evaluate(request, loaded.state);
    assertCommandLawTransition(evaluated.transition, this.authority);
    return evaluated;
  }

  async commit(request: AuthorityTransitionRequest): Promise<CanonicalReceipt> {
    await this.hydrateReplayGuard();
    const loaded = await this.store.load();
    const evaluated = this.engine.evaluate(request, loaded.state);
    assertCommandLawTransition(evaluated.transition, this.authority);
    if (evaluated.replayStatus.type === 'Existing') {
      const prior = await this.store.getReceiptForTransition?.(evaluated.replayStatus.transitionId);
      if (prior) return prior;
    }
    const nextState = KernelStateReducer.reduce(loaded.state, evaluated.transition, this.replayGuard, request, evaluated.replayStatus);
    return this.store.commit({ expectedStateHash: loaded.stateHash, request, transition: evaluated.transition, nextState, replayStatus: evaluated.replayStatus });
  }

  verifyReceipt(receipt: CanonicalReceipt): Promise<boolean> {
    if (receipt.authority !== CANONICAL_AUTHORITY) return Promise.resolve(false);
    return this.store.verifyReceipt(receipt);
  }
}
