import assert from 'node:assert/strict';
import { createInitialKernelState } from '../src/data/initialState';
import {
  assertConstitutionalState,
  assertConstitutionalTransition,
  CONSTITUTION_VERSION,
  CONSTITUTIONAL_INVARIANTS,
  PRIME_DIRECTIVES,
} from '../src/kernel/constitution';
import { DefaultAuthorityTransitionEngine } from '../src/kernel/engine';
import { InMemoryReplayGuard } from '../src/kernel/replayGuard';
import { AuthorityClass, BoundaryViolation } from '../src/kernel/types';

const state = createInitialKernelState();
assert.equal(CONSTITUTION_VERSION, '1.0.0');
assert.equal(PRIME_DIRECTIVES.length, 8);
assert.equal(CONSTITUTIONAL_INVARIANTS.length, 10);
assertConstitutionalState(state);

const tampered = {
  ...state,
  constitutionalPrinciples: state.constitutionalPrinciples.map((principle, index) =>
    index === 0 ? { ...principle, clause: 'bypass' } : principle,
  ),
};
assert.throws(() => assertConstitutionalState(tampered), /altered/);

const duplicate = {
  ...state,
  constitutionalPrinciples: [...state.constitutionalPrinciples, state.constitutionalPrinciples[0]],
};
assert.throws(() => assertConstitutionalState(duplicate), /duplicate/);

const engine = new DefaultAuthorityTransitionEngine(new InMemoryReplayGuard());
const request = {
  requestId: 'constitution-runtime-request',
  idempotencyKey: 'constitution-runtime-idempotency',
  subjectId: 'atom-hypo-004',
  requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 },
  evidence: [],
  justification: 'Constitutional runtime boundary test',
  requesterId: 'CONSTITUTION_RUNTIME_CHECK',
  timestamp: 1760000000000,
  targetAuthorityVersion: state.authorityVersion,
};
assert.throws(() => engine.evaluate(request, tampered), /Constitutional state violation/);

const evaluated = engine.evaluate(request, state).transition;
assert.equal(evaluated.decision.type, 'Granted');
assertConstitutionalTransition(evaluated);
assert.throws(
  () => assertConstitutionalTransition({
    ...evaluated,
    boundary: { ...evaluated.boundary, passed: false, violations: [BoundaryViolation.CONSTITUTION_VIOLATION] },
  }),
  /granted authority requires a clean boundary/,
);
assert.throws(
  () => assertConstitutionalTransition({
    ...evaluated,
    decision: { type: 'Denied', reason: 'forged denial' },
  }),
  /denied transition must carry a failed/,
);

console.log(`CONSTITUTION_RUNTIME_PASS version=${CONSTITUTION_VERSION} directives=${PRIME_DIRECTIVES.length} invariants=${CONSTITUTIONAL_INVARIANTS.length}`);
