import { createHash } from 'node:crypto';
import type { AuthorityTransition, AuthorityTransitionRequest } from './types';
import { assertConstitutionalTransition, CONSTITUTION_VERSION } from './constitution';

export const CRANIUM_COMMAND_LAW_VERSION = '1.0.0';
export const CANONICAL_COMMAND_AUTHORITY = 'cranium-kernel';

export const COMMAND_LAW = Object.freeze({
  version: CRANIUM_COMMAND_LAW_VERSION,
  constitutionVersion: CONSTITUTION_VERSION,
  authoritySource: CANONICAL_COMMAND_AUTHORITY,
  cognitionMayPropose: true,
  nonKernelAuthorityForbidden: true,
  failClosed: true,
  canonicalCommitRequired: true,
  receiptRequiredForAuthority: true,
  replayResistanceRequired: true,
  evidenceBindingRequired: true,
});

export type CommandLawSubject = {
  namespace: string;
  subjectId: string;
  issuer: string;
};

export type CommandLawDecision = {
  allowed: boolean;
  reason: string;
  lawVersion: string;
  authoritySource: typeof CANONICAL_COMMAND_AUTHORITY;
};

export function commandLawDigest(): string {
  return createHash('sha256').update(JSON.stringify(COMMAND_LAW)).digest('hex');
}

export function assertCommandLawRequest(
  request: AuthorityTransitionRequest,
  subject: CommandLawSubject,
): void {
  if (!subject.namespace || !subject.subjectId || !subject.issuer) {
    throw new Error('CRANIUM_COMMAND_LAW: subject identity is required');
  }
  if (subject.issuer !== CANONICAL_COMMAND_AUTHORITY) {
    throw new Error(`CRANIUM_COMMAND_LAW: canonical authority issuer must be ${CANONICAL_COMMAND_AUTHORITY}`);
  }
  if (request.namespace !== subject.namespace) {
    throw new Error('CRANIUM_COMMAND_LAW: namespace isolation violation');
  }
  if (request.subjectId !== subject.subjectId) {
    throw new Error('CRANIUM_COMMAND_LAW: subject identity mismatch');
  }
}

export function assertCommandLawTransition(
  transition: AuthorityTransition,
  issuer: string,
): void {
  assertConstitutionalTransition(transition);
  if (issuer !== CANONICAL_COMMAND_AUTHORITY) {
    throw new Error(`CRANIUM_COMMAND_LAW: transition issuer must be ${CANONICAL_COMMAND_AUTHORITY}`);
  }
}

export function denyWithoutCanonicalAuthority(reason: string): CommandLawDecision {
  return {
    allowed: false,
    reason,
    lawVersion: CRANIUM_COMMAND_LAW_VERSION,
    authoritySource: CANONICAL_COMMAND_AUTHORITY,
  };
}
