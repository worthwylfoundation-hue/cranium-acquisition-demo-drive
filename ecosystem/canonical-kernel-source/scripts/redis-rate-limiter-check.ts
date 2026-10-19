import assert from 'node:assert/strict';
import { createRedisRateLimiter } from '../src/integration/redisRateLimiter';

function request(remoteAddress: string, forwardedFor?: string): any {
  return { socket: { remoteAddress }, headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {} };
}

/** In-memory eval harness for limiter unit checks (not a production double name). */
class InMemoryRedisEvalHarness {
  readonly counts = new Map<string, number>();
  readonly expirations = new Map<string, string>();
  fail = false;

  async eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<number> {
    assert.match(script, /INCR/);
    assert.match(script, /PEXPIRE/);
    if (this.fail) throw new Error('REDIS_UNAVAILABLE');
    const key = options.keys[0];
    this.expirations.set(key, options.arguments[0]);
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return count <= Number(options.arguments[1]) ? 1 : 0;
  }
}

const redis = new InMemoryRedisEvalHarness();
const options = { redis, windowMs: 1_000, limit: 2, trustedProxyCidrs: [] };
const replicaA = createRedisRateLimiter(options);
const replicaB = createRedisRateLimiter(options);
const client = request('192.0.2.10');
assert.equal(await replicaA.allow(client), true);
assert.equal(await replicaB.allow(client), true, 'replicas must share a Redis bucket');
assert.equal(await replicaA.allow(client), false, 'shared limit must apply across replicas');
assert.deepEqual([...redis.expirations.values()], ['1000']);

const untrusted = request('10.0.0.10', '198.51.100.1');
const untrustedOtherHeader = request('10.0.0.10', '198.51.100.2');
const isolated = createRedisRateLimiter({ redis, windowMs: 1_000, limit: 1, trustedProxyCidrs: [] });
assert.equal(await isolated.allow(untrusted), true);
assert.equal(await isolated.allow(untrustedOtherHeader), false, 'untrusted forwarding must not bypass the bucket');

const trusted = createRedisRateLimiter({ redis, windowMs: 1_000, limit: 1, trustedProxyCidrs: ['10.0.0.0/8'] });
assert.equal(await trusted.allow(request('10.0.0.10', '198.51.100.10')), true);
assert.equal(await trusted.allow(request('10.0.0.10', '198.51.100.11')), true, 'trusted proxy clients may use separate buckets');

redis.fail = true;
assert.equal(await replicaA.allow(request('192.0.2.11')), false, 'Redis failures must fail closed');

console.log('REDIS_RATE_LIMITER_SUMMARY: PASS shared-window proxy-boundary expiry fail-closed');
