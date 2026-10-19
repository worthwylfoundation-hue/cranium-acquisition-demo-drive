import type { AuthorityTransitionRequest } from '../kernel/types';
import { AuthorityClass } from '../kernel/types';

export interface AuthorityRequestV1 {
  version: 'authority-request-v1';
  request_id: string;
  subject: { subject_id: string; owner_id?: string; agent_id?: string; model_id?: string };
  action: string;
  resource: string;
  cognition: { proposal_hash: string; model_id?: string; agent_id?: string; provider_id?: string };
  evidence: string[];
  requested_capability: string;
  delegation_ref?: string;
  human_approval_ref?: string;
  nonce?: string;
}

const VALID_ACTIONS = new Set([
  'READ', 'WRITE', 'EXECUTE', 'COMMUNICATE',
  'TRANSACT', 'DEPLOY', 'MODIFY', 'DELEGATE',
]);

export function toKernelAuthorityRequest(
  input: AuthorityRequestV1,
  targetAuthorityVersion: number,
  now = Date.now(),
): AuthorityTransitionRequest {
  if (input.version !== 'authority-request-v1') throw new Error('INVALID_AUTHORITY_REQUEST_VERSION');
  if (!input.request_id || !input.subject?.subject_id) throw new Error('INVALID_AUTHORITY_REQUEST_IDENTITY');
  if (!VALID_ACTIONS.has(input.action.toUpperCase())) throw new Error('INVALID_AUTHORITY_REQUEST_ACTION');
  if (!input.resource || !input.cognition?.proposal_hash || !input.requested_capability) {
    throw new Error('INVALID_AUTHORITY_REQUEST_CONTENT');
  }
  if (!Array.isArray(input.evidence) || input.evidence.some((ref) => typeof ref !== 'string')) {
    throw new Error('INVALID_AUTHORITY_REQUEST_EVIDENCE');
  }

  return {
    requestId: input.request_id,
    idempotencyKey: input.nonce ?? input.request_id,
    subjectId: input.subject.subject_id,
    requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 },
    evidence: input.evidence.map((id) => ({
      id,
      uri: `authority-evidence://${id}`,
      sha256Digest: input.cognition.proposal_hash,
      verified: false,
      description: `Authority Plane v1 evidence reference for ${input.action} ${input.resource}`,
    })),
    justification: `Authority Request v1: ${input.action} ${input.resource}; capability=${input.requested_capability}`,
    requesterId: input.subject.owner_id ?? input.subject.agent_id ?? input.subject.subject_id,
    timestamp: now,
    targetAuthorityVersion,
    namespace: 'authority-plane-v1',
    attestationStatus: 'unavailable',
    assessmentDisposition: 'unavailable',
  };
}
