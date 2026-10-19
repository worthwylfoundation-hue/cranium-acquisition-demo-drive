/**
 * Phase 3 — Bounded Synapse observation / intervention controller.
 *
 * Synapse may observe, score risk axes, and select an intervention within
 * an issued budget. It emits evidence (attestation inputs / dispositions).
 * It never grants authority, mutates Core state, or executes external actions.
 *
 * Non-claims:
 * - Not a full transformer-level activation-steering runtime
 * - Not a substitute for Core authorization
 * - Intervention here is policy selection, not weight mutation
 */

import { createHash, randomUUID } from 'node:crypto';
import type { SynapseAttestation } from '../kernel/types';
import { createSynapseAttestation, type SynapseAssessmentInput } from './SynapseRuntimeAdapter';

export type InterventionMode = 'OBSERVE' | 'SOFT_STEER' | 'CONSTRAIN' | 'ABSTAIN' | 'ESCALATE';

export type RiskAxisId =
  | 'tool-poisoning'
  | 'prompt-injection'
  | 'data-exfiltration'
  | 'privilege-escalation'
  | 'hallucinated-authority'
  | 'policy-drift'
  | string;

export interface ObservationProfile {
  profileId: string;
  policyPackVersion: string;
  monitoredLayers: number[];
  activeRiskAxes: RiskAxisId[];
  /** Axis id → weight in [0, 1]; missing axes score 0 */
  axisWeights?: Record<string, number>;
}

export interface InterventionBudget {
  allowedModes: InterventionMode[];
  allowedLayers: number[];
  maxNormDelta: number;
  maxInterventions: number;
}

export interface SynapseObservation {
  observationId: string;
  correlationId: string;
  layer: number;
  /** Per-axis scores in [0, 1] */
  axisScores: Record<string, number>;
  modelId: string;
  modelWeightsHash: string;
  inferenceRuntime: string;
  tracePayload: string;
  confidence?: number;
  observedAt?: string;
}

export interface ControllerConfig {
  profile: ObservationProfile;
  budget: InterventionBudget;
  /** Thresholds for riskClass mapping */
  thresholds?: {
    elevated: number;
    high: number;
    critical: number;
  };
}

export interface ControlDecision {
  decisionId: string;
  observationId: string;
  correlationId: string;
  profileId: string;
  profileHash: string;
  budgetHash: string;
  controllerConfigHash: string;
  compositeRiskScore: number;
  riskClass: SynapseAttestation['riskClass'];
  mode: InterventionMode;
  intervention: SynapseAttestation['intervention'];
  disposition: SynapseAttestation['disposition'];
  interventionApplied: boolean;
  interventionCount: number;
  budgetRemaining: number;
  activeRiskAxes: string[];
  reason: string;
  decidedAt: string;
}

export class SynapseControllerError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = 'SynapseControllerError';
  }
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableHash(obj: unknown): string {
  return sha256Hex(JSON.stringify(obj));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

const DEFAULT_THRESHOLDS = { elevated: 0.25, high: 0.55, critical: 0.8 };

/** Map controller mode → existing attestation intervention / disposition. */
export function mapModeToAttestation(
  mode: InterventionMode,
  riskClass: SynapseAttestation['riskClass']
): {
  intervention: SynapseAttestation['intervention'];
  disposition: SynapseAttestation['disposition'];
} {
  switch (mode) {
    case 'OBSERVE':
      return { intervention: 'NONE', disposition: 'ALLOW' };
    case 'SOFT_STEER':
      return {
        intervention: 'STEER',
        disposition: riskClass === 'LOW' || riskClass === 'ELEVATED' ? 'ALLOW' : 'RESTRICT',
      };
    case 'CONSTRAIN':
      return { intervention: 'RESTRICT', disposition: 'RESTRICT' };
    case 'ABSTAIN':
      return { intervention: 'ABSTAIN', disposition: 'BLOCK' };
    case 'ESCALATE':
      return { intervention: 'ESCALATE', disposition: 'ESCALATE' };
  }
}

function selectMode(
  riskClass: SynapseAttestation['riskClass'],
  allowed: InterventionMode[]
): InterventionMode {
  const preference: InterventionMode[] =
    riskClass === 'CRITICAL'
      ? ['ABSTAIN', 'ESCALATE', 'CONSTRAIN', 'SOFT_STEER', 'OBSERVE']
      : riskClass === 'HIGH'
        ? ['CONSTRAIN', 'ESCALATE', 'ABSTAIN', 'SOFT_STEER', 'OBSERVE']
        : riskClass === 'ELEVATED'
          ? ['SOFT_STEER', 'CONSTRAIN', 'OBSERVE', 'ESCALATE', 'ABSTAIN']
          : ['OBSERVE', 'SOFT_STEER', 'CONSTRAIN', 'ESCALATE', 'ABSTAIN'];

  for (const mode of preference) {
    if (allowed.includes(mode)) return mode;
  }
  // Fail closed: if budget allows nothing matching preference, force ABSTAIN if allowed else first allowed
  if (allowed.includes('ABSTAIN')) return 'ABSTAIN';
  if (allowed.length === 0) throw new SynapseControllerError('Empty intervention budget', 'EMPTY_BUDGET');
  return allowed[0];
}

function riskClassFromScore(
  score: number,
  thresholds: { elevated: number; high: number; critical: number }
): SynapseAttestation['riskClass'] {
  if (score >= thresholds.critical) return 'CRITICAL';
  if (score >= thresholds.high) return 'HIGH';
  if (score >= thresholds.elevated) return 'ELEVATED';
  return 'LOW';
}

export class SynapseController {
  private interventionCount = 0;
  private readonly decisions: ControlDecision[] = [];
  readonly profileHash: string;
  readonly budgetHash: string;
  readonly controllerConfigHash: string;

  constructor(private readonly config: ControllerConfig) {
    if (!config.budget.allowedModes.length) {
      throw new SynapseControllerError('Intervention budget must allow at least one mode', 'EMPTY_BUDGET');
    }
    if (config.budget.maxInterventions < 0) {
      throw new SynapseControllerError('maxInterventions must be >= 0', 'INVALID_BUDGET');
    }
    this.profileHash = stableHash(config.profile);
    this.budgetHash = stableHash(config.budget);
    this.controllerConfigHash = stableHash({
      profile: config.profile,
      budget: config.budget,
      thresholds: config.thresholds ?? DEFAULT_THRESHOLDS,
    });
  }

  getInterventionCount(): number {
    return this.interventionCount;
  }

  getBudgetRemaining(): number {
    return Math.max(0, this.config.budget.maxInterventions - this.interventionCount);
  }

  decisionsLog(): readonly ControlDecision[] {
    return this.decisions;
  }

  /**
   * Evaluate one observation. Pure control-loop decision; no Core authority.
   */
  evaluate(observation: SynapseObservation): ControlDecision {
    const { profile, budget } = this.config;
    const thresholds = this.config.thresholds ?? DEFAULT_THRESHOLDS;

    if (!budget.allowedLayers.includes(observation.layer) && budget.allowedLayers.length > 0) {
      // Layer outside budget → fail closed to ABSTAIN if allowed
      return this.finalizeDecision(observation, 1, 'CRITICAL', 'ABSTAIN', 'LAYER_OUTSIDE_BUDGET');
    }

    // Score only active axes
    let weighted = 0;
    let weightSum = 0;
    const activeHit: string[] = [];
    for (const axis of profile.activeRiskAxes) {
      const raw = observation.axisScores[axis] ?? 0;
      const score = clamp01(raw);
      const w = clamp01(profile.axisWeights?.[axis] ?? 1);
      weighted += score * w;
      weightSum += w;
      if (score > 0) activeHit.push(axis);
    }
    const composite = weightSum > 0 ? clamp01(weighted / weightSum) : 0;
    const riskClass = riskClassFromScore(composite, thresholds);

    // Budget exhaustion → fail closed
    if (this.interventionCount >= budget.maxInterventions) {
      const mode: InterventionMode = budget.allowedModes.includes('ABSTAIN')
        ? 'ABSTAIN'
        : budget.allowedModes.includes('ESCALATE')
          ? 'ESCALATE'
          : budget.allowedModes[0];
      return this.finalizeDecision(observation, composite, riskClass, mode, 'INTERVENTION_BUDGET_EXHAUSTED');
    }

    const mode = selectMode(riskClass, budget.allowedModes);
    const reason =
      mode === 'OBSERVE'
        ? 'WITHIN_OBSERVE_BAND'
        : `SELECTED_${mode}_FOR_${riskClass}`;

    return this.finalizeDecision(observation, composite, riskClass, mode, reason);
  }

  private finalizeDecision(
    observation: SynapseObservation,
    composite: number,
    riskClass: SynapseAttestation['riskClass'],
    mode: InterventionMode,
    reason: string
  ): ControlDecision {
    const { intervention, disposition } = mapModeToAttestation(mode, riskClass);
    const interventionApplied = mode !== 'OBSERVE';
    if (interventionApplied) this.interventionCount += 1;

    const decision: ControlDecision = {
      decisionId: randomUUID(),
      observationId: observation.observationId,
      correlationId: observation.correlationId,
      profileId: this.config.profile.profileId,
      profileHash: this.profileHash,
      budgetHash: this.budgetHash,
      controllerConfigHash: this.controllerConfigHash,
      compositeRiskScore: composite,
      riskClass,
      mode,
      intervention,
      disposition,
      interventionApplied,
      interventionCount: this.interventionCount,
      budgetRemaining: this.getBudgetRemaining(),
      activeRiskAxes: [...this.config.profile.activeRiskAxes],
      reason,
      decidedAt: observation.observedAt ?? new Date().toISOString(),
    };
    this.decisions.push(decision);
    return decision;
  }

  /**
   * Build attestation input from a control decision + observation provenance.
   * Does not sign; caller seals via ArtifactLifecycle / KeyManager.
   */
  toAssessmentInput(
    decision: ControlDecision,
    observation: SynapseObservation,
    assessmentId?: string
  ): SynapseAssessmentInput {
    return {
      assessmentId: assessmentId ?? `assess-${decision.decisionId.slice(0, 8)}`,
      correlationId: decision.correlationId,
      modelId: observation.modelId,
      modelWeightsHash: observation.modelWeightsHash,
      inferenceRuntime: observation.inferenceRuntime,
      policyPackVersion: this.config.profile.policyPackVersion,
      controllerConfigHash: decision.controllerConfigHash,
      riskClass: decision.riskClass,
      riskScore: decision.compositeRiskScore,
      confidence: clamp01(observation.confidence ?? 0.9),
      intervention: decision.intervention,
      disposition: decision.disposition,
      tracePayload: observation.tracePayload,
    };
  }

  /** Convenience: evaluate → attestation object (unsigned evidence). */
  assess(observation: SynapseObservation, assessmentId?: string): {
    decision: ControlDecision;
    attestation: SynapseAttestation;
  } {
    const decision = this.evaluate(observation);
    const input = this.toAssessmentInput(decision, observation, assessmentId);
    const attestation = createSynapseAttestation(input);
    return { decision, attestation };
  }
}
