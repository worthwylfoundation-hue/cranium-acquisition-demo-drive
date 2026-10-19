import type { RedisClientType } from 'redis';
import type { SessionAuthorityBackend, SessionLeaseRecord } from './distributedSessionAuthority';

const key = (tenantId: string, sessionId: string) => `cranium:session:${tenantId}:${sessionId}`;
const tripScript = `
local current = redis.call('HGET', KEYS[1], 'epoch')
local epoch = tonumber(current or '0') + 1
redis.call('HSET', KEYS[1], 'epoch', epoch, 'tenantId', ARGV[1], 'sessionId', ARGV[2], 'state', 'TRIPPED_OPEN', 'updatedAt', ARGV[3], 'reason', ARGV[4])
return {epoch, 'TRIPPED_OPEN', ARGV[3], ARGV[4]}
`;
const transitionScript = `
local current = tonumber(redis.call('HGET', KEYS[1], 'epoch') or '-1')
if current ~= tonumber(ARGV[3]) then return {0, current} end
redis.call('HSET', KEYS[1], 'epoch', current, 'tenantId', ARGV[1], 'sessionId', ARGV[2], 'state', ARGV[4], 'updatedAt', ARGV[5])
return {1, current, ARGV[4], ARGV[5]}
`;

export class RedisSessionAuthorityBackend implements SessionAuthorityBackend {
  constructor(private readonly redis: RedisClientType) {}

  async read(sessionId: string, tenantId: string): Promise<SessionLeaseRecord | null> {
    const data = await this.redis.hGetAll(key(tenantId, sessionId));
    if (!data.epoch) return null;
    return { sessionId, tenantId, epoch: Number(data.epoch), state: data.state as SessionLeaseRecord['state'], updatedAt: Number(data.updatedAt), ...(data.reason ? { reason: data.reason } : {}) };
  }

  async trip(sessionId: string, tenantId: string, reason: string, now: number): Promise<SessionLeaseRecord> {
    const result = await this.redis.eval(tripScript, { keys: [key(tenantId, sessionId)], arguments: [tenantId, sessionId, String(now), reason] }) as Array<string | number>;
    return { sessionId, tenantId, epoch: Number(result[0]), state: 'TRIPPED_OPEN', updatedAt: now, reason };
  }

  async transition(sessionId: string, tenantId: string, expectedEpoch: number, state: SessionLeaseRecord['state'], now: number): Promise<SessionLeaseRecord> {
    const result = await this.redis.eval(transitionScript, { keys: [key(tenantId, sessionId)], arguments: [tenantId, sessionId, String(expectedEpoch), state, String(now)] }) as Array<string | number>;
    if (Number(result[0]) !== 1) throw new Error(`CRANIUM_SESSION_EPOCH_CONFLICT:${result[1]}`);
    return { sessionId, tenantId, epoch: expectedEpoch, state, updatedAt: now };
  }
}
