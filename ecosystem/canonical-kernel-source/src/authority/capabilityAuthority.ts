import { createHash } from 'node:crypto';

export type CapabilityAction =
  | 'READ' | 'WRITE' | 'EXECUTE' | 'COMMUNICATE'
  | 'TRANSACT' | 'DEPLOY' | 'MODIFY' | 'DELEGATE';

export interface CapabilityGrant {
  version: 'capability-v1';
  capabilityId: string;
  subjectId: string;
  action: CapabilityAction;
  scope: string;
  riskCeiling: number;
  grantor: string;
  issuedAt: number;
  conditions?: string[];
  delegationChain?: string[];
  expiresAt?: number;
  revocationRef?: string;
  policyId?: string;
  policyHash?: string;
  constitutionHash?: string;
}

export interface DelegationGrant {
  version: 'delegation-v1';
  delegationId: string;
  delegator: string;
  delegatee: string;
  capabilityRef: string;
  scope: string;
  issuedAt: number;
  conditions?: string[];
  expiresAt?: number;
  revokedAt?: number;
  parentDelegationRef?: string;
}

export type RevocationStatus = 'active' | 'revoked';
export interface RevocationRecord { revocationRef: string; status: RevocationStatus; revokedAt?: number; reason?: string; }

export interface CapabilityDecision {
  allowed: boolean;
  reason: string;
  capabilityId: string | null;
  matchedScope: boolean;
  delegationValid: boolean;
  revocationValid: boolean;
}

function canonicalScope(value: string): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096 || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'file:' || url.username || url.password) return null;
    const decodedPath = decodeURIComponent(url.pathname);
    const parts = decodedPath.split('/');
    if (parts.includes('..')) return null;
    return url.toString();
  } catch { return null; }
}

function scopeMatches(grantScope: string, resource: string): boolean {
  const grant = canonicalScope(grantScope); const target = canonicalScope(resource);
  if (!grant || !target) return false;
  if (grant === '*') return true;
  if (grant.endsWith('/*')) return target.startsWith(grant.slice(0, -1));
  return grant === target;
}

function validRisk(value: number): boolean { return Number.isFinite(value) && value >= 0 && value <= 1; }
function conditionHolds(condition: string, input: { now: number; resource: string; risk: number }): boolean {
  const m = /^([a-z_]+)\s*(==|<=|>=|<|>)\s*(.+)$/i.exec(condition.trim());
  if (!m) return false;
  const [, key, op, raw] = m; const value = raw.trim().replace(/^['"]|['"]$/g, '');
  const actual = key === 'resource' ? input.resource : key === 'risk' ? String(input.risk) : key === 'time' ? String(input.now) : null;
  if (actual === null) return false;
  if (['risk', 'time'].includes(key)) { const a = Number(actual), b = Number(value); if (!Number.isFinite(b)) return false; return op === '==' ? a === b : op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b; }
  return op === '==' && actual === value;
}

export function capabilityDigest(capability: CapabilityGrant): string {
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(capability).sort()))).digest('hex');
}

export class CapabilityAuthority {
  constructor(
    private readonly capabilities: readonly CapabilityGrant[],
    private readonly delegations: readonly DelegationGrant[] = [],
    private readonly revocations: readonly RevocationRecord[] = [],
  ) {}

  authorize(input: { subjectId: string; action: CapabilityAction; resource: string; risk: number; now: number }): CapabilityDecision {
    if (!validRisk(input.risk) || !Number.isFinite(input.now)) return { allowed: false, reason: 'INVALID_AUTHORIZATION_INPUT', capabilityId: null, matchedScope: false, delegationValid: false, revocationValid: false };
    const candidates = this.capabilities.filter((c) => c.subjectId === input.subjectId && c.action === input.action);
    for (const capability of candidates) {
      const scope = scopeMatches(capability.scope, input.resource);
      if (!scope) continue;
      if (input.now < capability.issuedAt) return { allowed: false, reason: 'CAPABILITY_NOT_YET_ACTIVE', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: true, revocationValid: true };
      if (capability.expiresAt !== undefined && input.now >= capability.expiresAt) return { allowed: false, reason: 'CAPABILITY_EXPIRED', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: true, revocationValid: true };
      const rev = capability.revocationRef ? this.revocations.find((r) => r.revocationRef === capability.revocationRef) : undefined;
      if (capability.revocationRef && (!rev || rev.status === 'revoked')) return { allowed: false, reason: 'CAPABILITY_REVOKED', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: true, revocationValid: false };
      if (!validRisk(capability.riskCeiling) || input.risk > capability.riskCeiling) return { allowed: false, reason: 'RISK_CEILING_EXCEEDED', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: true, revocationValid: true };
      const conditions = capability.conditions ?? [];
      if (!conditions.every((c) => conditionHolds(c, input))) return { allowed: false, reason: 'CAPABILITY_CONDITION_FAILED', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: true, revocationValid: true };
      const chain = capability.delegationChain ?? [];
      const seen = new Set<string>(); let delegatee = input.subjectId; let childScope = capability.scope;
      for (const id of [...chain].reverse()) {
        if (seen.has(id)) return { allowed: false, reason: 'DELEGATION_CYCLE', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: false, revocationValid: true };
        seen.add(id); const d = this.delegations.find((item) => item.delegationId === id);
        if (!d || d.delegatee !== delegatee || d.capabilityRef !== capability.capabilityId || !scopeMatches(d.scope, childScope) || d.issuedAt > input.now || (d.expiresAt !== undefined && input.now >= d.expiresAt) || d.revokedAt !== undefined || !(d.conditions ?? []).every((c) => conditionHolds(c, input))) return { allowed: false, reason: 'DELEGATION_INVALID', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: false, revocationValid: true };
        delegatee = d.delegator; childScope = d.scope;
      }
      return { allowed: true, reason: 'CAPABILITY_AUTHORIZED', capabilityId: capability.capabilityId, matchedScope: true, delegationValid: true, revocationValid: true };
    }
    return { allowed: false, reason: 'CAPABILITY_NOT_FOUND', capabilityId: null, matchedScope: false, delegationValid: false, revocationValid: true };
  }
}
