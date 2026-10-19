import { createHash } from 'node:crypto';
import type { AuthorityTransitionRequest } from '../kernel/types';
import type { AuthorityProxy, CanonicalReceipt } from './authorityProxy';

export type ProofingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ProofingDisposition = 'PASS' | 'REJECTED' | 'REQUIRES_REEVALUATION';

export interface ProofingFinding {
  version: 'proofing-finding-v1';
  findingId: string;
  severity: ProofingSeverity;
  disposition: ProofingDisposition;
  invariant: string;
  receipt: CanonicalReceipt;
  requestHash: string;
  observedAt: number;
  reason: string;
  rootCause?: string;
  remediation?: RemediationProposal;
}

export interface RemediationProposal {
  version: 'proofing-remediation-v1';
  remediationId: string;
  findingId: string;
  control: string;
  proposedConstraint: string;
  requiresReevaluation: true;
}

export interface ProofingInput {
  receipt: CanonicalReceipt;
  request: AuthorityTransitionRequest;
  now: number;
  expectedAuthority?: string;
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function findingId(receipt: CanonicalReceipt, invariant: string): string {
  return `proof-${digest({ receipt, invariant }).slice(0, 32)}`;
}

/**
 * Post-decision proof boundary. It can invalidate a result and produce a
 * remediation proposal, but it has no method that grants or commits authority.
 */
export class AuthorityProofing {
  constructor(private readonly authority: AuthorityProxy) {}

  inspect(input: ProofingInput): ProofingFinding {
    const invariants: Array<{ id: string; pass: boolean; reason: string; severity: ProofingSeverity; remediation?: string }> = [
      {
        id: 'P-001-CANONICAL-AUTHORITY',
        pass: input.receipt.authority === (input.expectedAuthority ?? this.authority.authority),
        reason: 'Receipt authority must match the canonical authority boundary.',
        severity: 'CRITICAL',
        remediation: 'Reject receipts whose authority identifier is not canonical.',
      },
      {
        id: 'P-002-RECEIPT-INTEGRITY',
        pass: this.authority.verifyReceipt(input.receipt),
        reason: 'Receipt must verify against the durable authority store.',
        severity: 'CRITICAL',
        remediation: 'Require durable receipt verification before consequential execution.',
      },
      {
        id: 'P-003-REQUEST-BINDING',
        pass: input.receipt.requestHash.length === 64,
        reason: 'Receipt must contain a canonical SHA-256 request binding.',
        severity: 'CRITICAL',
        remediation: 'Reject authority receipts without a canonical request digest.',
      },
      {
        id: 'P-004-DECISION-BOUNDARY',
        pass: input.receipt.decision === 'Granted' || input.receipt.decision === 'Denied',
        reason: 'Proofing may only assess a completed canonical decision.',
        severity: 'CRITICAL',
        remediation: 'Require an explicit canonical decision before proofing.',
      },
    ];

    const failed = invariants.find((item) => !item.pass);
    if (!failed) {
      return {
        version: 'proofing-finding-v1',
        findingId: findingId(input.receipt, 'P-ALL-PASS'),
        severity: 'INFO',
        disposition: 'PASS',
        invariant: 'P-ALL-PASS',
        receipt: input.receipt,
        requestHash: input.receipt.requestHash,
        observedAt: input.now,
        reason: 'Post-decision proofing found no violation in the enforced proof boundary.',
      };
    }

    const id = findingId(input.receipt, failed.id);
    const remediation: RemediationProposal = {
      version: 'proofing-remediation-v1',
      remediationId: `rem-${digest({ id, control: failed.id }).slice(0, 32)}`,
      findingId: id,
      control: failed.id,
      proposedConstraint: failed.remediation ?? failed.reason,
      requiresReevaluation: true,
    };
    return {
      version: 'proofing-finding-v1',
      findingId: id,
      severity: failed.severity,
      disposition: 'REQUIRES_REEVALUATION',
      invariant: failed.id,
      receipt: input.receipt,
      requestHash: input.receipt.requestHash,
      observedAt: input.now,
      reason: failed.reason,
      rootCause: 'A post-decision invariant was not satisfied at the proof boundary.',
      remediation,
    };
  }
}
