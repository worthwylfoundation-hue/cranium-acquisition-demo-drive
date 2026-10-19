import assert from 'node:assert/strict';
import { toKernelAuthorityRequest } from '../src/authority/authorityRequestV1';

const request = toKernelAuthorityRequest({
  version: 'authority-request-v1',
  request_id: 'req-operator-001',
  subject: { subject_id: 'subject-001', agent_id: 'agent-001' },
  action: 'EXECUTE',
  resource: 'termux://authorized',
  cognition: { proposal_hash: 'a'.repeat(64), model_id: 'model-001' },
  evidence: ['evidence-001'],
  requested_capability: 'termux.execute',
  nonce: 'nonce-001',
}, 104, 1760000000000);

assert.equal(request.requestId, 'req-operator-001');
assert.equal(request.targetAuthorityVersion, 104);
assert.equal(request.evidence[0]?.verified, false);
assert.equal(request.assessmentDisposition, 'unavailable');
assert.equal(request.attestationStatus, 'unavailable');

assert.throws(() => toKernelAuthorityRequest({
  version: 'authority-request-v1',
  request_id: 'req-invalid',
  subject: { subject_id: 'subject-001' },
  action: 'SELF_AUTHORIZE',
  resource: 'anything',
  cognition: { proposal_hash: 'a'.repeat(64) },
  evidence: [],
  requested_capability: 'admin',
}, 104), /INVALID_AUTHORITY_REQUEST_ACTION/);

console.log('AUTHORITY_REQUEST_ADAPTER_SUMMARY: PASS fail-closed evidence semantics');
