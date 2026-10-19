import assert from 'node:assert/strict';
import { auditDecision, createRateLimiter } from '../src/integration/gatewaySecurity';

function request(remoteAddress: string, forwardedFor?: string): any {
  return { socket: { remoteAddress }, headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {} };
}

assert.equal(auditDecision({ allowed: true }), 'ALLOW');
assert.equal(auditDecision({ allowed: false }), 'DENY');

const untrusted = createRateLimiter({ windowMs: 1_000, limit: 1, maxEntries: 10, trustedProxyCidrs: [] });
assert.equal(untrusted.allow(request('10.0.0.10', '198.51.100.1'), 1_000), true);
assert.equal(untrusted.allow(request('10.0.0.10', '198.51.100.2'), 1_001), false, 'untrusted X-Forwarded-For must not rotate the bucket');

const trusted = createRateLimiter({ windowMs: 1_000, limit: 1, maxEntries: 10, trustedProxyCidrs: ['10.0.0.0/8'] });
assert.equal(trusted.allow(request('10.0.0.10', '198.51.100.1'), 2_000), true);
assert.equal(trusted.allow(request('10.0.0.10', '198.51.100.2'), 2_001), true, 'trusted proxy may identify separate clients');

const expiring = createRateLimiter({ windowMs: 1_000, limit: 1, maxEntries: 10, trustedProxyCidrs: [] });
assert.equal(expiring.allow(request('192.0.2.1'), 3_000), true);
assert.equal(expiring.allow(request('192.0.2.1'), 3_999), false);
assert.equal(expiring.allow(request('192.0.2.1'), 4_000), true);

const bounded = createRateLimiter({ windowMs: 10_000, limit: 1, maxEntries: 2, trustedProxyCidrs: [] });
bounded.allow(request('192.0.2.1'), 5_000);
bounded.allow(request('192.0.2.2'), 5_001);
bounded.allow(request('192.0.2.3'), 5_002);
assert.equal(bounded.size(), 2, 'local counters must remain bounded');

console.log(JSON.stringify({ pass: true, checks: 9 }));
