import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AuthorityClass, type AuthorityTransitionRequest } from '../src/kernel/types';
import { createInitialKernelState } from '../src/data/initialState';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';

const dir = mkdtempSync(join(tmpdir(), 'cranium-lifecycle-'));
const db = join(dir, 'authority.sqlite');
const base: AuthorityTransitionRequest = {
  requestId: 'lifecycle-grant-1', idempotencyKey: 'lifecycle-key-1', subjectId: 'atom-hypo-004',
  requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 }, evidence: [],
  justification: 'Lifecycle matrix controlled-action grant', requesterId: 'lifecycle-test', timestamp: 1760000000000,
  targetAuthorityVersion: 104,
};
const clone = (patch: Partial<AuthorityTransitionRequest> = {}): AuthorityTransitionRequest => ({ ...base, ...patch });
const store = new SQLiteAuthorityStore(db, createInitialKernelState());
const first = new KernelAuthorityProxy(store);
const receipt = first.commit(base);
assert.equal(receipt.decision, 'Granted');
assert.equal(receipt.journalSequence, 1);
assert.equal(first.verifyReceipt(receipt), true);

const restartedStore = new SQLiteAuthorityStore(db, createInitialKernelState());
const restarted = new KernelAuthorityProxy(restartedStore);
const replay = restarted.evaluate(base);
assert.equal(replay.replayStatus.type, 'Existing');
assert.equal(replay.transition.id, receipt.transactionId);
assert.deepEqual(restarted.commit(base), receipt);

const conflict = restarted.commit(clone({ requestId: 'lifecycle-conflict-1', requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.46 } }));
assert.equal(conflict.decision, 'Denied');
assert.equal(restartedStore.load().state.transitions[0]?.boundary.violations.includes('REPLAY_CONFLICT' as never), true);

const stale = restarted.commit(clone({ requestId: 'lifecycle-stale-1', idempotencyKey: 'lifecycle-stale-key', targetAuthorityVersion: 104 }));
assert.equal(stale.decision, 'Denied');
assert.equal(restartedStore.load().state.transitions[0]?.boundary.violations.includes('STALE_AUTHORITY_VERSION' as never), true);

const tamperedDb = new DatabaseSync(db);
tamperedDb.prepare("UPDATE authority_journal SET frame_hash = 'tampered' WHERE sequence = 1").run();
tamperedDb.close();
assert.throws(() => new SQLiteAuthorityStore(db, createInitialKernelState()), /AUTHORITY_JOURNAL_HASH_FAILURE/);
for (const file of [db, `${db}-wal`, `${db}-shm`]) if (existsSync(file)) unlinkSync(file);
console.log('AUTHORITY_LIFECYCLE_MATRIX PASS grant=1 restart_replay=1 conflict=1 stale_version=1 tamper_detection=1');
