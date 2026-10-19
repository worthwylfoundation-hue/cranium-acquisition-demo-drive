import { createHash } from 'node:crypto';
import {
  AssessmentDisposition,
  BoundaryViolation,
  SynapseAttestation,
} from './kernel/types';

export interface QuorumConfig {
  /** Threshold above which multi-model quorum is strictly required */
  elevatedRiskThreshold: number;
  /** Absolute hard ceiling for allowable risk scores */
  maxAllowedRiskScore: number;
  /** Minimum number of distinct models required for a valid quorum */
  minQuorumSize: number;
  /** Maximum allowable fraction of dissenting/blocking models */
  maxDissentRatio: number;
}

export interface MultiModelQuorumPayload {
  attestations: SynapseAttestation[];
  expectedTraceCommitment?: string;
}

export interface SynapseValidationResult {
  valid: boolean;
  violations: BoundaryViolation[];
  disposition: AssessmentDisposition;
  effectiveRiskScore: number;
  participatingModels: string[];
}

export class SynapseGovernanceAdapter {
  private static readonly DEFAULT_CONFIG: QuorumConfig = {
    elevatedRiskThreshold: 0.5,
    maxAllowedRiskScore: 0.85,
    minQuorumSize: 3,
    maxDissentRatio: 0.33,
  };

  /**
   * Validates single or multi-model attestations against kernel quorum & risk boundaries.
   */
  public static validateAttestationQuorum(
    payload: MultiModelQuorumPayload,
    config: Partial<QuorumConfig> = {},
  ): SynapseValidationResult {
    const activeConfig: QuorumConfig = { ...this.DEFAULT_CONFIG, ...config };
    const violations: BoundaryViolation[] = [];
    const { attestations, expectedTraceCommitment } = payload;

    if (!attestations || attestations.length === 0) {
      return {
        valid: false,
        violations: [BoundaryViolation.INVALID_SYNAPSE_ATTESTATION],
        disposition: 'deny',
        effectiveRiskScore: 1,
        participatingModels: [],
      };
    }

    const uniqueModels = new Set<string>();
    let maxObservedRisk = 0;
    let dissentCount = 0;

    for (const att of attestations) {
      if (uniqueModels.has(att.modelId)) {
        violations.push(BoundaryViolation.SYNAPSE_FAIL_SAFE_BLOCK);
      }
      uniqueModels.add(att.modelId);

      if (expectedTraceCommitment && att.traceCommitment !== expectedTraceCommitment) {
        violations.push(BoundaryViolation.INVALID_SYNAPSE_ATTESTATION);
      }

      if (att.riskScore > maxObservedRisk) maxObservedRisk = att.riskScore;
      if (att.disposition === 'BLOCK' || att.disposition === 'RESTRICT') dissentCount++;
    }

    if (maxObservedRisk > activeConfig.elevatedRiskThreshold) {
      if (uniqueModels.size < activeConfig.minQuorumSize) {
        violations.push(BoundaryViolation.SYNAPSE_FAIL_SAFE_BLOCK);
      }
      if (dissentCount / attestations.length > activeConfig.maxDissentRatio) {
        violations.push(BoundaryViolation.SYNAPSE_FAIL_SAFE_BLOCK);
      }
    }

    if (maxObservedRisk > activeConfig.maxAllowedRiskScore) {
      violations.push(BoundaryViolation.SYNAPSE_FAIL_SAFE_BLOCK);
    }

    const valid = violations.length === 0;
    return {
      valid,
      violations,
      disposition: valid ? 'allow' : 'deny',
      effectiveRiskScore: maxObservedRisk,
      participatingModels: Array.from(uniqueModels),
    };
  }

  /** Computes a canonical SHA-256 hash of controller configuration for attestation audit. */
  public static hashConfig(configPayload: Record<string, unknown>): string {
    const canonicalStr = JSON.stringify(configPayload, Object.keys(configPayload).sort());
    return createHash('sha256').update(canonicalStr, 'utf8').digest('hex');
  }
}
