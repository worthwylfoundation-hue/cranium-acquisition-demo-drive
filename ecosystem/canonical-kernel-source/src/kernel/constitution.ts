import type { AuthorityTransition, ConstitutionalPrinciple, KernelState } from './types';

export const CONSTITUTION_VERSION = '1.0.0';

export const PRIME_DIRECTIVES = [
  { id: 'PD-01', title: 'Authority is singular', statement: 'Only the canonical Kernel may issue authority receipts or commit canonical authority state.' },
  { id: 'PD-02', title: 'Cognition is not permission', statement: 'Generated output, intent, assessment, attestation, UI state, and transport success are proposals or evidence, never authorization.' },
  { id: 'PD-03', title: 'Fail closed', statement: 'Missing, stale, malformed, unverifiable, conflicting, or unavailable evidence narrows authority to denial, quarantine, or escalation.' },
  { id: 'PD-04', title: 'Durable truth outranks transient state', statement: 'A transition is real only after canonical durable commit, and a receipt is issued only after commit.' },
  { id: 'PD-05', title: 'No replayed authority', statement: 'Exact replay returns the original transition; conflicting reuse is rejected; retries cannot create an unintended second effect.' },
  { id: 'PD-06', title: 'Evidence remains bound', statement: 'Decisions remain bound to request, policy, evidence, namespace, authority version, issuer, and durable commit position.' },
  { id: 'PD-07', title: 'Canon over convenience', statement: 'Constitutional law outranks implementation convenience, marketing pressure, benchmark theater, and feature velocity.' },
  { id: 'PD-08', title: 'Human intent and identity are sovereign constraints', statement: 'Identity, intent, and explicit human stop conditions are first-class governed inputs and may not be silently substituted or diluted.' },
] as const;

export const CONSTITUTIONAL_INVARIANTS = [
  { id: 'INV-01', title: 'Sole authority issuer', rule: 'SOLE_AUTHORITY_ISSUER' },
  { id: 'INV-02', title: 'Boundary before reduction', rule: 'BOUNDARY_BEFORE_REDUCTION' },
  { id: 'INV-03', title: 'Atomic authority commit', rule: 'ATOMIC_AUTHORITY_COMMIT' },
  { id: 'INV-04', title: 'Deterministic identity', rule: 'DETERMINISTIC_TRANSITION_IDENTITY' },
  { id: 'INV-05', title: 'Replay resistance', rule: 'REPLAY_RESISTANCE' },
  { id: 'INV-06', title: 'Fail-closed evidence', rule: 'FAIL_CLOSED_EVIDENCE' },
  { id: 'INV-07', title: 'Namespace isolation', rule: 'NAMESPACE_ISOLATION' },
  { id: 'INV-08', title: 'Receipt integrity', rule: 'RECEIPT_INTEGRITY' },
  { id: 'INV-09', title: 'Restart durability', rule: 'RESTART_DURABILITY' },
  { id: 'INV-10', title: 'Honest disclosure', rule: 'HONEST_DISCLOSURE' },
] as const;

export function createConstitutionalPrinciples(): ConstitutionalPrinciple[] {
  return PRIME_DIRECTIVES.map((directive) => ({
    id: directive.id,
    title: directive.title,
    category: 'PRIME_DIRECTIVE',
    clause: directive.statement,
    invariantRule: 'PRIME_DIRECTIVE',
    enforced: true,
  }));
}

export function assertConstitutionalState(state: KernelState): void {
  const ids = new Set(state.constitutionalPrinciples.map((principle) => principle.id));
  for (const directive of PRIME_DIRECTIVES) {
    const principle = state.constitutionalPrinciples.find((candidate) => candidate.id === directive.id);
    if (!principle || !principle.enforced || principle.clause !== directive.statement) {
      throw new Error(`Constitutional state violation: ${directive.id} is missing, altered, or unenforced`);
    }
  }
  if (ids.size !== state.constitutionalPrinciples.length) {
    throw new Error('Constitutional state violation: duplicate principle IDs');
  }
}

export function assertConstitutionalTransition(transition: AuthorityTransition): void {
  if (transition.decision.type === 'Granted') {
    if (!transition.boundary.passed || transition.boundary.violations.length > 0) {
      throw new Error('Constitutional transition violation: granted authority requires a clean boundary assessment');
    }
    if (!transition.receiptSignature || !transition.requestHash.hexDigest) {
      throw new Error('Constitutional transition violation: granted authority requires receipt and request integrity bindings');
    }
  }

  if (transition.decision.type === 'Denied' && transition.boundary.passed) {
    throw new Error('Constitutional transition violation: a denied transition must carry a failed or restricted boundary assessment');
  }
}
