import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';
import { CognitiveSubconsciousController } from '../src/authority/cognitiveSubconscious';
import { createInitialKernelState } from '../src/data/initialState';
import { AuthorityClass, BoundaryViolation, type AuthorityTransitionRequest } from '../src/kernel/types';

/**
 * Behavioral verification for acquisition vectors V-006 through V-008.
 *
 * This script deliberately targets the implemented contracts rather than a
 * hypothetical API: V-006 proves cognitive quarantine prevents authority
 * preparation; V-007 proves idempotent replay and conflicting-key reuse do not
 * create a second authoritative transition; V-008 proves durable receipt and
 * journal integrity checks reject tampered authority evidence.
 */

function makeBaseRequest(state = createInitialKernelState()): AuthorityTransitionRequest {
  return {
    requestId: 'denial-semantics-request',
    idempotencyKey: 'denial-semantics-idempotency',
    subjectId: 'atom-hypo-004',
    requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 },
    evidence: [],
    justification: 'Behavioral denial semantics verification',
    requesterId: 'CRANIUM_DENIAL_SEMANTICS_CHECK',
    timestamp: 1760000000000,
    targetAuthorityVersion: state.authorityVersion,
  };
}

// V-006: contradictory cognition is quarantined and cannot become authority-ready.
{
  const subconscious = new CognitiveSubconsciousController();
  const artifact = subconscious.observe({
    cognitionId: 'v006-contradiction',
    subjectId: 'atom-hypo-004',
    kind: 'CONTRADICTION',
    content: 'Contradictory candidate action',
    provenance: [{ source: 'v006', observedAt: 1760000000000 }],
    contradictionRefs: ['authoritative-state:conflict-001'],
    createdAt: 1760000000000,
  });

  assert.equal(artifact.state, 'OBSERVING');
  const quarantined = subconscious.quarantine(artifact.cognitionId, 'authoritative-state:conflict-001');
  assert.equal(quarantined.state, 'QUARANTINED');
  assert.equal(quarantined.contradictionRefs.includes('authoritative-state:conflict-001'), true);
  assert.throws(
    () => subconscious.advance(artifact.cognitionId, 'READY_FOR_AUTHORITY', {
      runtimeMs: 0,
      toolCalls: 0,
      networkCalls: 0,
      memoryBytes: 0,
    }),
    /COGNITION_TERMINAL/
  );
  assert.throws(
    () => subconscious.prepareAuthorization({
      cognitionId: artifact.cognitionId,
      action: 'mutate',
      resource: 'authority-state',
      requestedCapability: 'STATE_MUTATION',
      nonce: 'v006',
      evidenceIds: [],
    }),
    /COGNITION_NOT_READY_FOR_AUTHORITY/
  );
}

// V-007 and V-008 operate against the durable canonical authority boundary.
const state = createInitialKernelState();
const baseRequest = makeBaseRequest(state);
const dir = mkdtempSync(join(tmpdir(), 'cranium-denial-semantics-'));
const db = join(dir, 'authority.sqlite');
const proxy = new KernelAuthorityProxy(new SQLiteAuthorityStore(db, state));

const firstReceipt = proxy.commit(baseRequest);
assert.equal(firstReceipt.authority, 'cranium-kernel');
assert.equal(proxy.verifyReceipt(firstReceipt), true);

// V-007a: exact replay resolves to the existing authoritative transition.
const exactReplay = proxy.evaluate(baseRequest);
assert.equal(exactReplay.replayStatus.type, 'Existing');
assert.equal(exactReplay.transition.id, firstReceipt.transactionId);

const replayReceipt = proxy.commit(baseRequest);
assert.deepEqual(replayReceipt, firstReceipt);

// V-007b: same idempotency key with a different canonical request is denied.
const conflicting = proxy.evaluate({
  ...baseRequest,
  justification: 'Conflicting reuse must fail closed',
});
assert.equal(conflicting.replayStatus.type, 'ConflictingReuse');
assert.equal(conflicting.transition.decision.type, 'Denied');
assert.equal(conflicting.transition.boundary.violations.includes(BoundaryViolation.REPLAY_CONFLICT), true);
assert.equal(new SQLiteAuthorityStore(db, state).load().journalSequence, 1);

// V-008: receipt/evidence tampering is rejected by durable verification.
assert.equal(proxy.verifyReceipt({ ...firstReceipt, authority: 'provider' as 'cranium-kernel' }), false);
assert.equal(proxy.verifyReceipt({ ...firstReceipt, transactionId: 'forged-transaction' }), false);
assert.equal(proxy.verifyReceipt({ ...firstReceipt, requestHash: 'forged-request' }), false);
assert.equal(proxy.verifyReceipt({ ...firstReceipt, stateHash: 'forged-state' }), false);
assert.equal(proxy.verifyReceipt({ ...firstReceipt, journalSequence: firstReceipt.journalSequence + 1 }), false);

const tamperDb = new DatabaseSync(db);
tamperDb.prepare("UPDATE authority_journal SET frame_hash = 'tampered' WHERE sequence = 1").run();
tamperDb.close();
assert.throws(() => new SQLiteAuthorityStore(db, state), /AUTHORITY_JOURNAL_HASH_FAILURE/);
assert.equal(existsSync(db), true);

console.log(
  'AUTHORITY_DENIAL_SEMANTICS_PASS V-006=quarantine V-007=replay-blocked V-008=evidence-tamper-blocked canonical-authority=cranium-kernel'
);
