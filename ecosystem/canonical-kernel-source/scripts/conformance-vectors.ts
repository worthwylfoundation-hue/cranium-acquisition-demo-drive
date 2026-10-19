import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, unlinkSync, rmSync } from 'node:fs';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import { createInitialKernelState } from '../src/data/initialState';
import { AuthorityClass, type AuthorityTransitionRequest } from '../src/kernel/types';
import vectors from '../docs/CRANIUM_CONFORMANCE_V1.json' with { type: 'json' };

const tempDir = mkdtempSync(join(tmpdir(), 'cranium-conformance-v1-'));
const tempDb = join(tempDir, 'authority.sqlite');
function cleanDb() {
  for (const file of [tempDb, `${tempDb}-wal`, `${tempDb}-shm`]) if (existsSync(file)) unlinkSync(file);
}
function cleanDir() {
  cleanDb();
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
}
function requestFor(vector: (typeof vectors.vectors)[number]): AuthorityTransitionRequest {
  const input = vector.input;
  const status = input.attestationStatus as AuthorityTransitionRequest['attestationStatus'];
  const disposition = input.assessmentDisposition as AuthorityTransitionRequest['assessmentDisposition'];
  return {
    requestId: input.proposalId,
    idempotencyKey: input.replayKey,
    subjectId: 'atom-hypo-004',
    requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 },
    evidence: [],
    justification: disposition !== 'allow' || status !== 'valid'
      ? 'Conformance vector requires explicit fail-closed handling.'
      : 'Conformance vector accepted transition.',
    requesterId: 'CRANIUM_CONFORMANCE_RUNNER',
    timestamp: 1760000000000 + vector.id.length,
    targetAuthorityVersion: 104,
    namespace: input.namespace,
    attestationNamespace: input.attestationNamespace,
    attestationStatus: status,
    assessmentDisposition: disposition,
  };
}
function runSingle(vector: (typeof vectors.vectors)[number]) {
  cleanDb();
  const store = new SQLiteAuthorityStore(tempDb, createInitialKernelState());
  const proxy = new KernelAuthorityProxy(store);
  const request = requestFor(vector);
  if (vector.id === 'replay-rejection') {
    const first = proxy.commit(request);
    const replay = proxy.evaluate(request);
    assert.equal(replay.replayStatus.type, 'Existing');
    assert.equal(replay.transition.id, first.transactionId);
    assert.equal(proxy.verifyReceipt(first), true);
    return { status: 'PASS', detail: 'replay returned the original committed transition and did not create a second receipt' };
  }
  const receipt = proxy.commit(request);
  const loaded = store.load();
  const expectedGranted = vector.id === 'accepted-transition' || vector.id === 'restart-recovery';
  assert.equal(receipt.decision, expectedGranted ? 'Granted' : 'Denied');
  if (!expectedGranted) {
    const expectedViolation = {
      'explicit-denial': 'SEMANTIC_POLICY_DENIAL',
      'tampered-attestation': 'INVALID_EVIDENCE_STATUS',
      'expired-attestation': 'STALE_EVIDENCE',
      'evidence-unavailable': 'EVIDENCE_UNAVAILABLE',
      'namespace-conflict': 'NAMESPACE_CONFLICT',
    }[vector.id];
    assert.equal(receipt.decision, 'Denied');
    assert.equal(store.load().state.transitions[0]?.boundary.violations[0], expectedViolation);
  }
  assert.equal(proxy.verifyReceipt(receipt), true);
  if (vector.id === 'restart-recovery') {
    const restartedStore = new SQLiteAuthorityStore(tempDb, createInitialKernelState());
    const restartedProxy = new KernelAuthorityProxy(restartedStore);
    assert.equal(restartedProxy.verifyReceipt(receipt), true);
    return { status: 'PASS', detail: `receipt verified after restart at journal sequence ${loaded.journalSequence}` };
  }
  return { status: 'PASS', detail: `${receipt.decision} committed at journal sequence ${receipt.journalSequence}` };
}

const results: Array<{ id: string; status: string; detail: string }> = [];
for (const vector of vectors.vectors) {
  try {
    results.push({ id: vector.id, ...runSingle(vector) });
  } catch (error) {
    results.push({ id: vector.id, status: 'FAIL', detail: error instanceof Error ? error.message : String(error) });
  }
}
cleanDir();
for (const result of results) console.log(`${result.status}\t${result.id}\t${result.detail}`);
const failures = results.filter((result) => result.status !== 'PASS');
console.log(`CONFORMANCE_SUMMARY total=${results.length} passed=${results.length - failures.length} failed=${failures.length}`);
if (failures.length) process.exit(1);
