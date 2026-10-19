import assert from 'node:assert/strict';
import { SynapseGovernanceAdapter } from '../src/synapseAdapter';
import type { SynapseAttestation } from '../src/kernel/types';

const makeAttestation = (overrides: Partial<SynapseAttestation> = {}): SynapseAttestation => ({
  assessmentId: 'assessment-1',
  correlationId: 'correlation-1',
  modelId: 'model-a',
  modelWeightsHash: 'weights-a',
  inferenceRuntime: 'runtime-a',
  policyPackVersion: 'policy-1',
  controllerConfigHash: 'config-a',
  riskClass: 'LOW',
  riskScore: 0.2,
  confidence: 0.9,
  intervention: 'NONE',
  traceCommitment: 'trace-1',
  disposition: 'ALLOW',
  ...overrides,
});

const allowed = SynapseGovernanceAdapter.validateAttestationQuorum({
  attestations: [makeAttestation()],
});
assert.equal(allowed.valid, true);
assert.equal(allowed.disposition, 'allow');
assert.deepEqual(allowed.participatingModels, ['model-a']);

const empty = SynapseGovernanceAdapter.validateAttestationQuorum({ attestations: [] });
assert.equal(empty.valid, false);
assert.equal(empty.disposition, 'deny');

const duplicate = SynapseGovernanceAdapter.validateAttestationQuorum({
  attestations: [makeAttestation(), makeAttestation({ modelId: 'model-a', assessmentId: 'assessment-2' })],
});
assert.equal(duplicate.valid, false);

const traceMismatch = SynapseGovernanceAdapter.validateAttestationQuorum({
  expectedTraceCommitment: 'expected-trace',
  attestations: [makeAttestation()],
});
assert.equal(traceMismatch.valid, false);

const highRiskSingle = SynapseGovernanceAdapter.validateAttestationQuorum({
  attestations: [makeAttestation({ riskClass: 'HIGH', riskScore: 0.7 })],
});
assert.equal(highRiskSingle.valid, false);

const hardCeiling = SynapseGovernanceAdapter.validateAttestationQuorum({
  attestations: [
    makeAttestation({ modelId: 'model-a', riskClass: 'CRITICAL', riskScore: 0.9 }),
    makeAttestation({ modelId: 'model-b', riskClass: 'CRITICAL', riskScore: 0.8 }),
    makeAttestation({ modelId: 'model-c', riskClass: 'CRITICAL', riskScore: 0.7 }),
  ],
});
assert.equal(hardCeiling.valid, false);

const configHash = SynapseGovernanceAdapter.hashConfig({
  maxAllowedRiskScore: 0.85,
  elevatedRiskThreshold: 0.5,
});
assert.equal(configHash.length, 64);
assert.match(configHash, /^[0-9a-f]{64}$/);

console.log('SYNAPSE_ADAPTER_PROOF: PASS quorum admission, duplicate-model rejection, trace binding, elevated-risk quorum, hard ceiling, and config hashing');
