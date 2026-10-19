/**
 * verify:synapse-controller — Phase 3 control-loop checks
 *
 * Proves: observe band, elevated steer, high constrain, budget exhaustion
 * fail-closed, layer outside budget, attestation emission, never-authority boundary.
 */

import assert from 'node:assert/strict';
import {
  SynapseController,
  mapModeToAttestation,
  type SynapseObservation,
} from '../src/governance/SynapseController';
import { validateSynapseAttestation } from '../src/governance/SynapseRuntimeAdapter';

function baseObservation(overrides: Partial<SynapseObservation> = {}): SynapseObservation {
  return {
    observationId: 'obs-1',
    correlationId: 'corr-ctrl-1',
    layer: 12,
    axisScores: { 'tool-poisoning': 0.05, 'prompt-injection': 0.02 },
    modelId: 'open-model-test',
    modelWeightsHash: 'weights-sha256',
    inferenceRuntime: 'runtime-v1',
    tracePayload: 'action=mock_read|tool=records',
    confidence: 0.95,
    observedAt: '2026-09-28T20:00:00.000Z',
    ...overrides,
  };
}

const profile = {
  profileId: 'profile-default',
  policyPackVersion: 'policy-v1',
  monitoredLayers: [8, 12],
  activeRiskAxes: ['tool-poisoning', 'prompt-injection', 'hallucinated-authority'],
  axisWeights: {
    'tool-poisoning': 1,
    'prompt-injection': 1,
    'hallucinated-authority': 1.2,
  },
};

const budget = {
  allowedModes: ['OBSERVE', 'SOFT_STEER', 'CONSTRAIN', 'ABSTAIN', 'ESCALATE'] as const,
  allowedLayers: [8, 12],
  maxNormDelta: 0.15,
  maxInterventions: 2,
};

function main(): void {
  console.log('SynapseController Phase 3 checks\n');

  // 1. LOW → OBSERVE
  const ctrl = new SynapseController({ profile, budget: { ...budget, allowedModes: [...budget.allowedModes] } });
  const low = ctrl.evaluate(baseObservation());
  assert.equal(low.riskClass, 'LOW');
  assert.equal(low.mode, 'OBSERVE');
  assert.equal(low.intervention, 'NONE');
  assert.equal(low.disposition, 'ALLOW');
  assert.equal(low.interventionApplied, false);
  assert.equal(ctrl.getInterventionCount(), 0);
  console.log('  PASS  LOW risk → OBSERVE (no budget consume)');

  // 2. ELEVATED → SOFT_STEER
  const elev = ctrl.evaluate(
    baseObservation({
      observationId: 'obs-2',
      axisScores: {
        'tool-poisoning': 0.5,
        'prompt-injection': 0.4,
        'hallucinated-authority': 0.4,
      },
    })
  );
  assert.equal(elev.riskClass, 'ELEVATED');
  assert.equal(elev.mode, 'SOFT_STEER');
  assert.equal(elev.intervention, 'STEER');
  assert.equal(elev.interventionApplied, true);
  assert.equal(ctrl.getInterventionCount(), 1);
  console.log('  PASS  ELEVATED → SOFT_STEER');

  // 3. HIGH → CONSTRAIN
  const high = ctrl.evaluate(
    baseObservation({
      observationId: 'obs-3',
      axisScores: {
        'tool-poisoning': 0.8,
        'prompt-injection': 0.7,
        'hallucinated-authority': 0.7,
      },
    })
  );
  assert.equal(high.riskClass, 'HIGH');
  assert.equal(high.mode, 'CONSTRAIN');
  assert.equal(high.intervention, 'RESTRICT');
  assert.equal(high.disposition, 'RESTRICT');
  assert.equal(ctrl.getInterventionCount(), 2);
  console.log('  PASS  HIGH → CONSTRAIN');

  // 4. Budget exhausted → fail closed (ABSTAIN)
  const exhausted = ctrl.evaluate(
    baseObservation({
      observationId: 'obs-4',
      axisScores: { 'tool-poisoning': 0.1 },
    })
  );
  assert.equal(exhausted.reason, 'INTERVENTION_BUDGET_EXHAUSTED');
  assert.equal(exhausted.mode, 'ABSTAIN');
  assert.equal(exhausted.disposition, 'BLOCK');
  console.log('  PASS  budget exhausted → ABSTAIN/BLOCK');

  // 5. Layer outside budget
  const ctrl2 = new SynapseController({
    profile,
    budget: { ...budget, allowedModes: [...budget.allowedModes], maxInterventions: 5 },
  });
  const badLayer = ctrl2.evaluate(baseObservation({ observationId: 'obs-layer', layer: 99 }));
  assert.equal(badLayer.reason, 'LAYER_OUTSIDE_BUDGET');
  assert.equal(badLayer.mode, 'ABSTAIN');
  console.log('  PASS  layer outside budget → ABSTAIN');

  // 6. CRITICAL prefers ABSTAIN when allowed
  const ctrl3 = new SynapseController({
    profile,
    budget: { ...budget, allowedModes: [...budget.allowedModes], maxInterventions: 10 },
  });
  const crit = ctrl3.evaluate(
    baseObservation({
      observationId: 'obs-crit',
      axisScores: {
        'tool-poisoning': 0.95,
        'prompt-injection': 0.95,
        'hallucinated-authority': 0.95,
      },
    })
  );
  assert.equal(crit.riskClass, 'CRITICAL');
  assert.equal(crit.mode, 'ABSTAIN');
  console.log('  PASS  CRITICAL → ABSTAIN');

  // 7. Attestation emission validates against policy envelope
  const { decision, attestation } = ctrl3.assess(
    baseObservation({
      observationId: 'obs-attest',
      axisScores: { 'tool-poisoning': 0.1 },
    }),
    'assessment-ctrl-1'
  );
  assert.equal(attestation.controllerConfigHash, decision.controllerConfigHash);
  assert.equal(attestation.riskScore, decision.compositeRiskScore);
  const violations = validateSynapseAttestation(attestation, {
    policyPackVersion: 'policy-v1',
    protectedAction: true,
    allowedInterventions: ['NONE', 'STEER', 'RESTRICT', 'ABSTAIN', 'ESCALATE'],
    failSafe: 'BLOCK_PROTECTED',
  });
  assert.deepEqual(violations, [], `attestation should validate: ${violations.join(',')}`);
  console.log('  PASS  assess() emits valid Synapse attestation');

  // 8. Mode mapping invariant
  assert.deepEqual(mapModeToAttestation('OBSERVE', 'LOW'), {
    intervention: 'NONE',
    disposition: 'ALLOW',
  });
  assert.deepEqual(mapModeToAttestation('CONSTRAIN', 'HIGH'), {
    intervention: 'RESTRICT',
    disposition: 'RESTRICT',
  });
  console.log('  PASS  mode → attestation mapping');

  // 9. Explicit non-authority: controller has no grant method surface
  const proto = Object.getOwnPropertyNames(SynapseController.prototype);
  assert.ok(!proto.includes('grant'));
  assert.ok(!proto.includes('authorize'));
  assert.ok(proto.includes('evaluate'));
  assert.ok(proto.includes('assess'));
  console.log('  PASS  no grant/authorize surface (evidence only)');

  console.log('\nSynapseController Phase 3 checks passed.');
  console.log('Non-claim: not a transformer-weight runtime; policy control loop only.');
}

main();
