import { createHash } from 'node:crypto';
import type { AuthorityProxy, CanonicalReceipt } from './authorityProxy';
import { toKernelAuthorityRequest, type AuthorityRequestV1 } from './authorityRequestV1';

export type CognitiveSubconsciousKind =
  | 'OBSERVATION' | 'RESEARCH_FINDING' | 'HYPOTHESIS' | 'CONTRADICTION'
  | 'RISK_SIGNAL' | 'PLAN' | 'CANDIDATE_ACTION' | 'AUTHORIZATION_PROPOSAL'
  | 'QUARANTINED_COGNITION';

export type CognitiveSubconsciousState =
  | 'OBSERVING' | 'RESEARCHING' | 'HYPOTHESIZING' | 'CHALLENGING'
  | 'READY_FOR_AUTHORITY' | 'QUARANTINED' | 'EXPIRED';

export interface CognitiveEvidence {
  source: string;
  observedAt: number;
  evidenceHash?: string;
}

export interface CognitiveBudget {
  maxRuntimeMs: number;
  maxToolCalls: number;
  maxNetworkCalls: number;
  maxMemoryBytes: number;
}

export interface CognitiveArtifact {
  version: 'cognitive-subconscious-v1';
  cognitionId: string;
  subjectId: string;
  kind: CognitiveSubconsciousKind;
  state: CognitiveSubconsciousState;
  contentHash: string;
  content: string;
  provenance: CognitiveEvidence[];
  contradictionRefs: string[];
  createdAt: number;
  expiresAt?: number;
  budget: CognitiveBudget;
}

export interface SubconsciousUsage {
  runtimeMs: number;
  toolCalls: number;
  networkCalls: number;
  memoryBytes: number;
}

export interface PreparedAuthorization {
  artifact: CognitiveArtifact;
  request: AuthorityRequestV1;
  preparedAt: number;
}

export interface SubconsciousSnapshot {
  version: 'cognitive-subconscious-runtime-v1';
  artifacts: CognitiveArtifact[];
  budget: CognitiveBudget;
}

const DEFAULT_BUDGET: CognitiveBudget = {
  maxRuntimeMs: 30_000,
  maxToolCalls: 32,
  maxNetworkCalls: 8,
  maxMemoryBytes: 16 * 1024 * 1024,
};

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function assertBudget(usage: SubconsciousUsage, budget: CognitiveBudget): void {
  if (!Number.isSafeInteger(usage.runtimeMs) || usage.runtimeMs < 0 || usage.runtimeMs > budget.maxRuntimeMs) throw new Error('COGNITIVE_BUDGET_RUNTIME_EXCEEDED');
  if (!Number.isSafeInteger(usage.toolCalls) || usage.toolCalls < 0 || usage.toolCalls > budget.maxToolCalls) throw new Error('COGNITIVE_BUDGET_TOOL_CALLS_EXCEEDED');
  if (!Number.isSafeInteger(usage.networkCalls) || usage.networkCalls < 0 || usage.networkCalls > budget.maxNetworkCalls) throw new Error('COGNITIVE_BUDGET_NETWORK_CALLS_EXCEEDED');
  if (!Number.isSafeInteger(usage.memoryBytes) || usage.memoryBytes < 0 || usage.memoryBytes > budget.maxMemoryBytes) throw new Error('COGNITIVE_BUDGET_MEMORY_EXCEEDED');
}

/**
 * Bounded background cognition. This class can create and advance cognitive
 * artifacts, but has no method that grants authority. Conversion to authority
 * produces a canonical request that must cross AuthorityProxy explicitly.
 */
export class CognitiveSubconsciousController {
  private readonly artifacts = new Map<string, CognitiveArtifact>();
  private readonly budget: CognitiveBudget;

  constructor(budget: Partial<CognitiveBudget> = {}) {
    this.budget = { ...DEFAULT_BUDGET, ...budget };
    assertBudget({ runtimeMs: 0, toolCalls: 0, networkCalls: 0, memoryBytes: 0 }, this.budget);
  }

  observe(input: {
    cognitionId: string;
    subjectId: string;
    kind: CognitiveSubconsciousKind;
    content: string;
    provenance: CognitiveEvidence[];
    contradictionRefs?: string[];
    createdAt?: number;
    expiresAt?: number;
  }): CognitiveArtifact {
    if (!input.cognitionId || !input.subjectId || !input.content) throw new Error('INVALID_COGNITIVE_ARTIFACT');
    const artifact: CognitiveArtifact = {
      version: 'cognitive-subconscious-v1',
      cognitionId: input.cognitionId,
      subjectId: input.subjectId,
      kind: input.kind,
      state: 'OBSERVING',
      contentHash: hashContent(input.content),
      content: input.content,
      provenance: [...input.provenance],
      contradictionRefs: [...(input.contradictionRefs ?? [])],
      createdAt: input.createdAt ?? Date.now(),
      ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
      budget: { ...this.budget },
    };
    this.artifacts.set(artifact.cognitionId, artifact);
    return artifact;
  }

  advance(cognitionId: string, next: CognitiveSubconsciousState, usage: SubconsciousUsage): CognitiveArtifact {
    const current = this.require(cognitionId);
    assertBudget(usage, current.budget);
    if (current.state === 'QUARANTINED' || current.state === 'EXPIRED') throw new Error('COGNITION_TERMINAL');
    if (next === 'READY_FOR_AUTHORITY') {
      if (current.provenance.length === 0) throw new Error('COGNITION_MISSING_PROVENANCE');
      if (current.contradictionRefs.length > 0) throw new Error('COGNITION_CONTRADICTION_UNRESOLVED');
      if (current.expiresAt !== undefined && Date.now() >= current.expiresAt) throw new Error('COGNITION_EXPIRED');
    }
    const updated = { ...current, state: next };
    this.artifacts.set(cognitionId, updated);
    return updated;
  }

  quarantine(cognitionId: string, contradictionRef?: string): CognitiveArtifact {
    const current = this.require(cognitionId);
    const refs = contradictionRef ? [...new Set([...current.contradictionRefs, contradictionRef])] : current.contradictionRefs;
    const updated = { ...current, state: 'QUARANTINED' as const, contradictionRefs: refs };
    this.artifacts.set(cognitionId, updated);
    return updated;
  }

  prepareAuthorization(input: {
    cognitionId: string;
    action: string;
    resource: string;
    requestedCapability: string;
    nonce: string;
    ownerId?: string;
    agentId?: string;
    modelId?: string;
    providerId?: string;
    evidenceIds: string[];
  }): PreparedAuthorization {
    const artifact = this.require(input.cognitionId);
    if (artifact.state !== 'READY_FOR_AUTHORITY') throw new Error('COGNITION_NOT_READY_FOR_AUTHORITY');
    if (artifact.contentHash !== hashContent(artifact.content)) throw new Error('COGNITION_CONTENT_TAMPERED');
    if (artifact.contradictionRefs.length > 0) throw new Error('COGNITION_CONTRADICTION_UNRESOLVED');
    const request: AuthorityRequestV1 = {
      version: 'authority-request-v1',
      request_id: `cognition:${artifact.cognitionId}`,
      subject: { subject_id: artifact.subjectId, ...(input.ownerId ? { owner_id: input.ownerId } : {}), ...(input.agentId ? { agent_id: input.agentId } : {}), ...(input.modelId ? { model_id: input.modelId } : {}) },
      action: input.action,
      resource: input.resource,
      cognition: { proposal_hash: artifact.contentHash, ...(input.modelId ? { model_id: input.modelId } : {}), ...(input.agentId ? { agent_id: input.agentId } : {}), ...(input.providerId ? { provider_id: input.providerId } : {}) },
      evidence: [...input.evidenceIds],
      requested_capability: input.requestedCapability,
      nonce: input.nonce,
    };
    return { artifact, request, preparedAt: Date.now() };
  }

  /** The only conversion-to-authority operation: it delegates to the canonical proxy. */
  authorize(prepared: PreparedAuthorization, proxy: AuthorityProxy, targetAuthorityVersion: number, now = Date.now()): CanonicalReceipt {
    const request = toKernelAuthorityRequest(prepared.request, targetAuthorityVersion, now);
    return proxy.commit(request);
  }

  get(cognitionId: string): CognitiveArtifact | undefined { return this.artifacts.get(cognitionId); }

  snapshot(): SubconsciousSnapshot {
    return { version: 'cognitive-subconscious-runtime-v1', artifacts: [...this.artifacts.values()].map((a) => ({ ...a, provenance: [...a.provenance], contradictionRefs: [...a.contradictionRefs], budget: { ...a.budget } })), budget: { ...this.budget } };
  }

  restore(snapshot: SubconsciousSnapshot): void {
    if (snapshot.version !== 'cognitive-subconscious-runtime-v1') throw new Error('INVALID_SUBCONSCIOUS_SNAPSHOT');
    for (const artifact of snapshot.artifacts) {
      if (artifact.version !== 'cognitive-subconscious-v1' || artifact.contentHash !== hashContent(artifact.content)) throw new Error('INVALID_SUBCONSCIOUS_ARTIFACT');
      if (artifact.state === 'READY_FOR_AUTHORITY' && artifact.contradictionRefs.length > 0) throw new Error('INVALID_AUTHORITY_READY_COGNITION');
      this.artifacts.set(artifact.cognitionId, { ...artifact, provenance: [...artifact.provenance], contradictionRefs: [...artifact.contradictionRefs], budget: { ...artifact.budget } });
    }
  }

  private require(cognitionId: string): CognitiveArtifact {
    const artifact = this.artifacts.get(cognitionId);
    if (!artifact) throw new Error('COGNITION_NOT_FOUND');
    return artifact;
  }
}
