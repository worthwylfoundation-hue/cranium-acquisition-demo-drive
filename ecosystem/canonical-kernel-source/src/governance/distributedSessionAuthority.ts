import { createHash } from 'node:crypto';

export interface SessionLeaseRecord {
  sessionId: string;
  tenantId: string;
  epoch: number;
  state: 'CLOSED' | 'TRIPPED_OPEN' | 'RECOVERING_HALF_OPEN';
  updatedAt: number;
  reason?: string;
}

export interface SessionAuthorityBackend {
  read(sessionId: string, tenantId: string): Promise<SessionLeaseRecord | null>;
  /** Must atomically increment epoch and set the new state. */
  trip(sessionId: string, tenantId: string, reason: string, now: number): Promise<SessionLeaseRecord>;
  /** Only succeeds when expectedEpoch is still current. */
  transition(sessionId: string, tenantId: string, expectedEpoch: number, state: SessionLeaseRecord['state'], now: number): Promise<SessionLeaseRecord>;
}

export interface ExecutionFence {
  sessionId: string;
  tenantId: string;
  epoch: number;
  token: string;
}

/**
 * Distributed enforcement primitive. The monotonically increasing epoch is a
 * fencing token. A stale worker may continue executing CPU work, but it can
 * never commit through a newer epoch.
 */
export class DistributedSessionAuthority {
  constructor(private readonly backend: SessionAuthorityBackend) {}

  async acquire(sessionId: string, tenantId: string): Promise<ExecutionFence> {
    const record = await this.backend.read(sessionId, tenantId);
    if (record?.state === 'TRIPPED_OPEN') throw new Error('CRANIUM_SESSION_BLOCKED');
    const epoch = record?.epoch ?? 0;
    return this.fence(sessionId, tenantId, epoch);
  }

  async assertCurrent(fence: ExecutionFence): Promise<void> {
    const record = await this.backend.read(fence.sessionId, fence.tenantId);
    if (!record || record.epoch !== fence.epoch || record.state === 'TRIPPED_OPEN') {
      throw new Error('CRANIUM_FENCE_REVOKED');
    }
  }

  async trip(sessionId: string, tenantId: string, reason: string, now = Date.now()): Promise<SessionLeaseRecord> {
    return this.backend.trip(sessionId, tenantId, reason, now);
  }

  async halfOpen(sessionId: string, tenantId: string, expectedEpoch: number, now = Date.now()): Promise<SessionLeaseRecord> {
    return this.backend.transition(sessionId, tenantId, expectedEpoch, 'RECOVERING_HALF_OPEN', now);
  }

  private fence(sessionId: string, tenantId: string, epoch: number): ExecutionFence {
    const token = createHash('sha256').update(`${tenantId}:${sessionId}:${epoch}`).digest('hex');
    return { sessionId, tenantId, epoch, token };
  }
}
