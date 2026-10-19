import assert from 'node:assert/strict';
import path from 'node:path';

const synapseDir = process.env.CRANIUM_SYNAPSE_DIR ?? path.resolve(process.cwd(), '../cranium-synapse');
const contract = await import(path.join(synapseDir, 'src/contract.ts'));
const { isBoundedRiskScore, isSynapseAttestationV1 } = contract;

const base = {
  assessmentId: 'assessment-001',
  correlationId: 'correlation-001',
  modelId: 'model-001',
  modelWeightsHash: 'sha256:weights',
  inferenceRuntime: 'runtime-1',
  policyVersion: 'policy-1',
  policyPackVersion: 'policy-1',
  controllerConfigHash: 'sha256:controller',
  riskClass: 'LOW' as const,
  riskScore: 0.42,
  confidence: 0.98,
  intervention: 'NONE' as const,
  traceCommitment: 'sha256:trace',
  disposition: 'ALLOW' as const,
  attestationHash: 'sha256:legacy-fixture'
};
assert.equal(isBoundedRiskScore(0), true);
assert.equal(isBoundedRiskScore(1), true);
assert.equal(isBoundedRiskScore(-0.01), false);
assert.equal(isBoundedRiskScore(1.01), false);
assert.equal(isBoundedRiskScore(Number.NaN), false);
assert.equal(isSynapseAttestationV1(base), true);
assert.equal(isSynapseAttestationV1({ ...base, riskScore: 2 }), false);
assert.equal(isSynapseAttestationV1({ ...base, confidence: -0.1 }), false);
assert.equal(isSynapseAttestationV1({ ...base, traceCommitment: '' }), false);
assert.equal(isSynapseAttestationV1({ ...base, modelWeightsHash: undefined }), false);
console.log(`Synapse contract smoke test passed using ${synapseDir}; fixture is validator input only.`);
