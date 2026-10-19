# Cranium Authority Protocol v1

**Protocol family:** Cognitive Authority Substrate  
**Canonical authority source:** `cranium-kernel`  
**Status:** Versioned design and conformance target  
**Owner:** WorthWyl Media

## Abstract

The Cranium Authority Protocol defines the boundary between AI-derived cognition and permission to produce a governed real-world effect.

A conforming implementation MUST treat model output, tool intent, semantic assessment, and attestation as **evidence or proposals**. None of those inputs may independently grant authority. A conforming implementation MUST have one canonical authority component that evaluates the proposed transition, applies policy, checks replay and idempotency constraints, commits durable state, and emits a receipt that uniquely binds the accepted transition.

The protocol is intentionally implementation-neutral. The reference implementation is `cranium-kernel`. Independent implementations may use different languages, databases, runtimes, and model providers if they preserve the protocol invariants.

## Core invariant

> **Cognition may propose. Evidence may support. Policy may restrict. Only the canonical authority component may authorize and commit.**

## Protocol objects

### Authority proposal

An authority proposal represents a requested effect before authorization.

Required fields:

```text
proposalId
requesterId
subjectId
resourceScope
action
intent
inputCommitment
attestationCommitment
semanticAssessmentCommitment
policyVersion
clientTimestamp
nonce
```

The proposal is not permission. It is an input to evaluation.

### Attestation

An attestation binds bounded evidence about the cognitive process or upstream controller.

Required properties:

- issuer identity;
- issuer key identifier;
- signature algorithm and signature;
- model or controller provenance;
- policy binding;
- input or trace commitment;
- risk classification;
- disposition;
- issuance time and expiry policy.

An attestation MUST NOT be interpreted as an authority grant. The canonical authority component MUST validate its signature, freshness, policy binding, and relationship to the proposal before use.

### Semantic assessment

A semantic assessment records interpretation and risk findings without granting authority.

Required properties:

- contract version;
- domain or policy pack;
- normalized input commitment;
- risk class;
- keyed risk codes;
- matched evidence;
- confidence or uncertainty representation;
- recommended intervention;
- disposition.

An assessment MAY deny, quarantine, escalate, or require additional review. It MUST NOT bypass the canonical authority transition.

### Authority transition

An authority transition is the only protocol object that can change governed authority state.

Required fields:

```text
transitionId
proposalId
previousStateCommitment
nextStateCommitment
policyVersion
attestationCommitment
assessmentCommitment
decision
decisionReason
replayKey
committedAt
```

A transition MUST be deterministic for the same canonical input state, proposal, policy, and validated evidence.

### Receipt

A receipt is a durable, verifiable record of a committed transition.

A receipt MUST bind:

- transition identifier;
- proposal identifier;
- previous and next state commitments;
- decision and reason;
- policy version;
- evidence commitments;
- replay key;
- authority issuer identity;
- receipt signature or integrity commitment;
- commit position or durable journal reference.

A receipt MUST NOT be issued before the transition is durably committed.

## Required invariants

A conforming implementation MUST satisfy all of the following:

1. **Sole authority:** exactly one canonical component can issue an authority receipt for a governed namespace.
2. **Evidence separation:** model output, attestation, semantic assessment, and client intent are not authority by themselves.
3. **Determinism:** equivalent canonical inputs produce the same decision and state transition.
4. **Durability:** an accepted transition survives process restart and can be recovered from durable state.
5. **Replay resistance:** a replayed proposal cannot create an unintended second effect.
6. **Tamper detection:** mutation of committed state, evidence commitments, or receipt fields is detectable.
7. **Policy binding:** decisions identify the policy or contract version used.
8. **Explicit denial:** rejected, quarantined, expired, and unavailable states are represented explicitly.
9. **Fail closed:** missing, invalid, stale, or conflicting evidence cannot silently become authority.
10. **Traceability:** every accepted transition can be traced to its proposal, evidence, policy, and commit record.
11. **Namespace isolation:** one client or domain cannot silently mutate another governed namespace.
12. **Independent verification:** a verifier can validate a receipt without trusting the client UI.

## Conformance levels

| Level | Requirement | Intended audience |
|---|---|---|
| **C0 — Contract reader** | Publishes compatible object schemas and terminology | Researchers and integrators |
| **C1 — Evidence adapter** | Produces or consumes validated attestation and semantic assessment objects without issuing authority | Model and policy providers |
| **C2 — Transition verifier** | Verifies receipts, commitments, policy binding, and replay outcomes | Auditors and observability systems |
| **C3 — Authority implementation** | Satisfies all twelve invariants with durable state and independent tests | Infrastructure implementers |
| **C4 — Production operator** | Demonstrates clean deployment, incident response, external review, and real workload evidence | Enterprise adopters |

The Cranium Kernel is the reference implementation for C3. It is not automatically C4 merely because it passes local tests.

## Minimal integration sequence

```text
1. Client creates an authority proposal.
2. Upstream controller supplies bounded attestation.
3. Semantic layer supplies assessment or explicit unavailable state.
4. Kernel validates evidence and policy binding.
5. Kernel checks namespace, replay key, and current durable state.
6. Kernel evaluates the transition.
7. Kernel commits accepted or denied state durably.
8. Kernel emits a receipt after commit.
9. Side-effect adapter consumes only a valid, unexpired receipt.
10. Adapter records exact-once consumption outcome.
```

A client MUST NOT infer authorization from a generated response, UI state, HTTP success code, or unsigned local record.

## Interoperability requirements

External implementers SHOULD publish:

- protocol version;
- supported conformance level;
- object schemas;
- supported signature and hash algorithms;
- replay and idempotency semantics;
- durability model;
- failure and quarantine states;
- independent test results;
- known limitations.

The reference repository SHOULD NOT require external implementers to adopt the Cranium UI, model provider, database, or application framework.

## Security and scope limits

The protocol does not by itself prove that a semantic assessment is legally, medically, financially, or operationally correct. It governs the integrity and authority of the transition. Domain correctness requires domain-specific policy packs, validators, qualified review, and deployment controls.

The protocol does not eliminate compromised keys, malicious operators, insecure clients, or incorrect policies. It makes those dependencies explicit, bound, and testable.

## Versioning and compatibility

Protocol changes MUST identify whether they are:

- **patch:** clarifying language or non-breaking verification behavior;
- **minor:** additive fields or optional capabilities;
- **major:** changed invariants, object semantics, or receipt verification rules.

A receipt MUST identify the protocol version and policy version used at commit time. Verifiers MUST reject unknown major versions rather than silently interpreting them.

## Reference implementation and conformance corpus

The reference authority boundary is [`cranium-kernel`](https://github.com/worthwyl2022-cloud/cranium-kernel). The attestation surface is [`cranium-synapse`](https://github.com/worthwyl2022-cloud/cranium-synapse). The public architecture thesis is in [`cranium-portfolio`](https://github.com/worthwyl2022-cloud/cranium-portfolio).

The next release requirement is a shared, language-neutral conformance corpus containing accepted, denied, replayed, tampered, expired, quarantined, namespace-conflicting, and restart-recovery cases. Independent implementations SHOULD be able to run the corpus without importing the reference implementation.
