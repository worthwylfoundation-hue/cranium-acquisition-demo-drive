import assert from 'node:assert/strict';
import { enterpriseNamespace, toEnterpriseKernelRequest, type EnterpriseAuthorityRequest } from '../src/integration/enterpriseBoundary';

const base: EnterpriseAuthorityRequest = {
  protocol: 'enterprise-integration-v1',
  context: {
    principal: {
      tenantId: 'acme',
      principalId: 'svc-agent-01',
      issuer: 'https://idp.example.test',
      authMethod: 'OIDC',
      scopes: ['cranium:authority:request'],
    },
    correlationId: 'corr-001',
  },
  request: {
    version: 'authority-request-v1',
    request_id: 'req-001',
    subject: { subject_id: 'agent-01' },
    action: 'READ',
    resource: 'customer:123',
    cognition: { proposal_hash: 'a'.repeat(64), agent_id: 'agent-01' },
    evidence: ['evidence-001'],
    requested_capability: 'customer.read',
    nonce: 'nonce-001',
  },
};

const mapped = toEnterpriseKernelRequest(base, 1, 1_760_000_000_000);
assert.equal(mapped.namespace, 'enterprise:acme');
assert.equal(mapped.subjectId, 'acme:agent-01');
assert.equal(mapped.requesterId, 'svc-agent-01');
assert.equal(mapped.idempotencyKey, 'acme:nonce-001');
assert.equal(enterpriseNamespace('acme'), 'enterprise:acme');

assert.throws(
  () => toEnterpriseKernelRequest({
    ...base,
    context: { ...base.context, principal: { ...base.context.principal, scopes: [] } },
  }, 1),
  /ENTERPRISE_SCOPE_REQUIRED/,
);

const otherTenant = toEnterpriseKernelRequest({
  ...base,
  context: { ...base.context, principal: { ...base.context.principal, tenantId: 'other' } },
}, 1);
assert.notEqual(mapped.namespace, otherTenant.namespace);
assert.notEqual(mapped.idempotencyKey, otherTenant.idempotencyKey);


console.log(JSON.stringify({
  pass: true,
  protocol: 'enterprise-integration-v1',
  tenantIsolation: mapped.namespace,
  subjectBoundary: mapped.subjectId,
  canonicalIssuer: 'cranium-kernel',
}));
