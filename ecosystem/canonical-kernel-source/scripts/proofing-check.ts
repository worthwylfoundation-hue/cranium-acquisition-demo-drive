import assert from 'node:assert/strict';
import { AuthorityProofing } from '../src/authority/proofing';
import type { AuthorityProxy, CanonicalReceipt } from '../src/authority/authorityProxy';
import type { AuthorityTransitionRequest } from '../src/kernel/types';

const receipt: CanonicalReceipt = {
  authority: 'cranium-kernel', transactionId: 'tx-proof-1', requestHash: 'a'.repeat(64),
  journalSequence: 1, stateHash: 'b'.repeat(64), decision: 'Granted',
};
const request = {} as AuthorityTransitionRequest;
const proxy: AuthorityProxy = {
  authority: 'cranium-kernel',
  evaluate: () => { throw new Error('NOT_USED'); },
  commit: () => { throw new Error('NOT_USED'); },
  verifyReceipt: (value) => value === receipt,
};
const proof = new AuthorityProofing(proxy);
const pass = proof.inspect({ receipt, request, now: 100 });
assert.equal(pass.disposition, 'PASS');

const tampered = { ...receipt, requestHash: 'c'.repeat(64) };
const fail = proof.inspect({ receipt: tampered, request, now: 101 });
assert.equal(fail.disposition, 'REQUIRES_REEVALUATION');
assert.equal(fail.remediation?.requiresReevaluation, true);
assert.equal(typeof fail.remediation?.proposedConstraint, 'string');
console.log('PROOFING_SUMMARY: PASS canonical-integrity failure-remediation no-authority-escalation');
