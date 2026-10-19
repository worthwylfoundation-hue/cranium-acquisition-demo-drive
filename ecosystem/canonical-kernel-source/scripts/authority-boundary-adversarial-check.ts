import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';
import { createInitialKernelState } from '../src/data/initialState';
import { AuthorityClass, BoundaryViolation, type AuthorityTransitionRequest } from '../src/kernel/types';

const state = createInitialKernelState();
const baseRequest: AuthorityTransitionRequest = {
  requestId: 'adversarial-boundary-request',
  idempotencyKey: 'adversarial-boundary-idempotency',
  subjectId: 'atom-hypo-004',
  requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 },
  evidence: [],
  justification: 'Adversarial authority-boundary verification',
  requesterId: 'CRANIUM_ADVERSARIAL_CHECK',
  timestamp: 1760000000000,
  targetAuthorityVersion: state.authorityVersion,
};

const dir = mkdtempSync(join(tmpdir(), 'cranium-adversarial-'));
const db = join(dir, 'authority.sqlite');
const proxy = new KernelAuthorityProxy(new SQLiteAuthorityStore(db, state));
const receipt = proxy.commit(baseRequest);
assert.equal(receipt.authority, 'cranium-kernel');
assert.equal(proxy.verifyReceipt(receipt), true);

const exactReplay = proxy.evaluate(baseRequest);
assert.equal(exactReplay.replayStatus.type, 'Existing');
assert.equal(exactReplay.transition.id, receipt.transactionId);
assert.equal(proxy.verifyReceipt({ ...receipt, authority: 'provider' as 'cranium-kernel' }), false);
assert.equal(proxy.verifyReceipt({ ...receipt, transactionId: 'forged-transaction' }), false);
assert.equal(proxy.verifyReceipt({ ...receipt, requestHash: 'forged-request' }), false);
assert.equal(proxy.verifyReceipt({ ...receipt, stateHash: 'forged-state' }), false);
assert.equal(proxy.verifyReceipt({ ...receipt, journalSequence: receipt.journalSequence + 1 }), false);

const conflicting = proxy.evaluate({ ...baseRequest, justification: 'Conflicting reuse must fail closed' });
assert.equal(conflicting.replayStatus.type, 'ConflictingReuse');
assert.equal(conflicting.transition.decision.type, 'Denied');
assert.equal(conflicting.transition.boundary.violations.includes(BoundaryViolation.REPLAY_CONFLICT), true);
assert.equal(new SQLiteAuthorityStore(db, state).load().journalSequence, 1);

const tamperDb = new DatabaseSync(db);
tamperDb.prepare("UPDATE authority_journal SET frame_hash = 'tampered' WHERE sequence = 1").run();
tamperDb.close();
assert.throws(() => new SQLiteAuthorityStore(db, state), /AUTHORITY_JOURNAL_HASH_FAILURE/);
assert.equal(existsSync(db), true);

console.log('AUTHORITY_BOUNDARY_ADVERSARIAL_PASS replay=blocked receipt-tamper=blocked journal-tamper=detected canonical-authority=cranium-kernel');
