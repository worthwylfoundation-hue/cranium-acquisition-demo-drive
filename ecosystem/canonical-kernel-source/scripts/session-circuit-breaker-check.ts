import assert from 'node:assert/strict';
import { SessionCircuitBreaker, SessionCircuitBreakerError, type CriticalSessionEvent } from '../src/kernel/sessionCircuitBreaker';

let now = 1_000;
const clock = () => now;
const breaker = new SessionCircuitBreaker<{ authorityVersion: number; value: string }>('session-A', undefined, clock);

const initial = { authorityVersion: 7, value: 'verified' };
breaker.checkpoint(initial);
assert.equal(breaker.currentState, 'CLOSED');
breaker.assertExecutionAllowed();

const event: CriticalSessionEvent = {
  eventId: 'risk-001', sessionId: 'session-A', generation: 0,
  severity: 'CRITICAL', reason: 'Asynchronous evaluator detected a critical invariant violation',
  observedAt: now, evidenceHash: 'a'.repeat(64),
};
breaker.trip(event);
assert.equal(breaker.currentState, 'TRIPPED_OPEN');
assert.throws(() => breaker.assertExecutionAllowed(), (error) => error instanceof SessionCircuitBreakerError && error.code === 'SESSION_EXECUTION_BLOCKED');
assert.throws(() => breaker.trip(event), (error) => error instanceof SessionCircuitBreakerError && error.code === 'CIRCUIT_ALREADY_OPEN');

const rolledBack = breaker.rollback();
assert.equal(breaker.currentState, 'RECOVERING_HALF_OPEN');
assert.equal(rolledBack.checkpoint.state.value, 'verified');
assert.equal(rolledBack.checkpoint.generation, 1);
breaker.beginRecovery();
breaker.commitRecovery(true, 'risk-001');
assert.equal(breaker.currentState, 'CLOSED');
assert.equal(breaker.currentGeneration, 1);

const stale: CriticalSessionEvent = { ...event, eventId: 'risk-stale', generation: 0 };
assert.throws(() => breaker.trip(stale), (error) => error instanceof SessionCircuitBreakerError && error.code === 'STALE_GENERATION_EVENT');

now += 100;
breaker.checkpoint({ authorityVersion: 8, value: 'next' });
const snapshot = breaker.snapshot();
const restored = new SessionCircuitBreaker<{ authorityVersion: number; value: string }>('session-A', undefined, clock);
restored.restore(snapshot);
assert.equal(restored.currentState, 'CLOSED');
assert.equal(restored.currentGeneration, 1);
assert.deepEqual(restored.snapshot().checkpoints, snapshot.checkpoints);

const tampered = structuredClone(snapshot);
tampered.checkpoints[0].state.value = 'tampered';
assert.throws(() => restored.restore(tampered), (error) => error instanceof SessionCircuitBreakerError && error.code === 'INVALID_CHECKPOINT');

console.log('SESSION_CIRCUIT_BREAKER_PROOF: PASS async critical trip, fail-closed execution fence, verified rollback, generation fencing, half-open recovery, snapshot integrity, and tamper rejection');
