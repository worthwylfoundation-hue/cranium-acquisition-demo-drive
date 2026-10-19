import assert from 'node:assert/strict';
import { CapabilityAuthority, type CapabilityGrant, type DelegationGrant } from '../src/authority/capabilityAuthority';

const capability: CapabilityGrant = {
  version: 'capability-v1',
  capabilityId: 'cap-termux-read',
  subjectId: 'agent-operator',
  action: 'READ',
  scope: 'termux://workspace/*',
  riskCeiling: 0.4,
  grantor: 'cranium-kernel',
  issuedAt: 100,
  expiresAt: 1000,
};
const authority = new CapabilityAuthority([capability]);
assert.equal(authority.authorize({
  subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.2, now: 200,
}).allowed, true);
assert.equal(authority.authorize({
  subjectId: 'agent-operator', action: 'WRITE', resource: 'termux://workspace/file.txt', risk: 0.2, now: 200,
}).reason, 'CAPABILITY_NOT_FOUND');
assert.equal(authority.authorize({
  subjectId: 'agent-operator', action: 'READ', resource: 'termux://other/file.txt', risk: 0.2, now: 200,
}).reason, 'CAPABILITY_NOT_FOUND');
assert.equal(authority.authorize({
  subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.5, now: 200,
}).reason, 'RISK_CEILING_EXCEEDED');
assert.equal(authority.authorize({
  subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.2, now: 1000,
}).reason, 'CAPABILITY_EXPIRED');

const delegation: DelegationGrant = {
  version: 'delegation-v1',
  delegationId: 'del-1',
  delegator: 'owner',
  delegatee: 'agent-delegated',
  capabilityRef: 'cap-delegated',
  scope: 'termux://workspace/*',
  issuedAt: 100,
  expiresAt: 500,
};
const delegated: CapabilityGrant = {
  ...capability,
  capabilityId: 'cap-delegated',
  subjectId: 'agent-delegated',
  delegationChain: ['del-1'],
};
assert.equal(new CapabilityAuthority([delegated], [delegation]).authorize({
  subjectId: 'agent-delegated', action: 'READ', resource: 'termux://workspace/a', risk: 0.2, now: 200,
}).allowed, true);
assert.equal(new CapabilityAuthority([delegated], [{ ...delegation, revokedAt: 150 }]).authorize({
  subjectId: 'agent-delegated', action: 'READ', resource: 'termux://workspace/a', risk: 0.2, now: 200,
}).reason, 'DELEGATION_INVALID');

console.log('CAPABILITY_AUTHORITY_SUMMARY: PASS scope risk expiry revocation delegation');

const revokedCapability: CapabilityGrant = { ...capability, capabilityId: 'cap-revoked', revocationRef: 'rev-1' };
assert.equal(new CapabilityAuthority([revokedCapability], [], [{ revocationRef: 'rev-1', status: 'revoked', revokedAt: 150 }]).authorize({ subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.2, now: 200 }).reason, 'CAPABILITY_REVOKED');
assert.equal(new CapabilityAuthority([revokedCapability], [], [{ revocationRef: 'rev-1', status: 'active' }]).authorize({ subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.2, now: 200 }).allowed, true);
assert.equal(new CapabilityAuthority([capability]).authorize({ subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: Number.NaN, now: 200 }).reason, 'INVALID_AUTHORIZATION_INPUT');
const conditioned = { ...capability, capabilityId: 'cap-conditioned', conditions: ['risk <= 0.3'] };
assert.equal(new CapabilityAuthority([conditioned]).authorize({ subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.2, now: 200 }).allowed, true);
assert.equal(new CapabilityAuthority([conditioned]).authorize({ subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/file.txt', risk: 0.4, now: 200 }).reason, 'CAPABILITY_CONDITION_FAILED');
assert.equal(new CapabilityAuthority([capability]).authorize({ subjectId: 'agent-operator', action: 'READ', resource: 'termux://workspace/%ZZ/secret', risk: 0.2, now: 200 }).reason, 'CAPABILITY_NOT_FOUND');
