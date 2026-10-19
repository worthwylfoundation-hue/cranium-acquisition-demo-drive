import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AuthorityClass, AtomKind, CognitiveStatus, ExecutionState } from '../src/kernel/types';
import type { KernelState, AuthorityTransitionRequest } from '../src/kernel/types';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';
import { createConstitutionalPrinciples } from '../src/kernel/constitution';

const state: KernelState = {
  executionId: 'durable-check', state: ExecutionState.READY, cognitiveVersion: 1,
  authorityVersion: 0, canonVersion: 1, activeAtomIds: ['subject-1'], candidateHash: null,
  atomsById: { 'subject-1': { id: 'subject-1', kind: AtomKind.HYPOTHESIS, status: CognitiveStatus.ACTIVE, content: 'test subject', authority: { authorityClass: AuthorityClass.USER, weight: 0.5 }, provenance: { source: 'test', authorId: 'tester', sourceTimestamp: 1 }, createdAt: 1, tags: [] } },
  threatAssessment: { threatLevel: 'NOMINAL', suspectedVectors: [], replayAttemptsBlocked: 0, boundaryAnomaliesCount: 0, lastIncidentTimestamp: null },
  transitions: [], canonEntries: [], constitutionalPrinciples: createConstitutionalPrinciples(),
};
const request: AuthorityTransitionRequest = {
  requestId: 'req-durable-1', idempotencyKey: 'idem-durable-1', subjectId: 'subject-1',
  requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.6 }, evidence: [],
  justification: 'Durable boundary regression test', requesterId: 'tester', timestamp: 1000, targetAuthorityVersion: 0,
};
const dir = mkdtempSync(join(tmpdir(), 'cranium-authority-'));
const db = join(dir, 'authority.sqlite');
const first = new KernelAuthorityProxy(new SQLiteAuthorityStore(db, state));
const receipt = first.commit(request);
assert.equal(receipt.authority, 'cranium-kernel');
assert.equal(receipt.journalSequence, 1);
assert.equal(first.verifyReceipt(receipt), true);
assert.equal(first.verifyReceipt({ ...receipt, transactionId: 'forged-transaction' }), false);
assert.equal(first.verifyReceipt({ ...receipt, requestHash: 'forged-request' }), false);
assert.equal(first.verifyReceipt({ ...receipt, journalSequence: 2 }), false);
assert.equal(first.verifyReceipt({ ...receipt, decision: 'Denied' }), false);
const restarted = new KernelAuthorityProxy(new SQLiteAuthorityStore(db, state));
const loaded = new SQLiteAuthorityStore(db, state).load();
assert.equal(loaded.journalSequence, 1);
assert.equal(loaded.state.atomsById['subject-1'].authority.authorityClass, AuthorityClass.WORKING);
assert.equal(restarted.verifyReceipt(receipt), true);
assert.equal(restarted.verifyReceipt({ ...receipt, authority: 'simulator' as 'cranium-kernel' }), false);
assert.equal(restarted.verifyReceipt({ ...receipt, stateHash: 'forged' }), false);
const tamperDb = new DatabaseSync(db);
tamperDb.prepare("UPDATE authority_journal SET frame_hash = 'tampered' WHERE sequence = 1").run();
tamperDb.close();
assert.throws(() => new SQLiteAuthorityStore(db, state), /AUTHORITY_JOURNAL_HASH_FAILURE/);
assert.equal(existsSync(db), true);
console.log('Durable authority check passed: SQLite WAL state, canonical receipt, restart verification, and corruption failure path.');
