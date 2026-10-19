# Cranium Constitution v1

> **Cognition can be generated anywhere. Authority can be acquired only through Cranium.**

## Preamble

Cranium exists to preserve the distinction between **what a system can generate** and **what a system is permitted to do**. Every model, adapter, interface, tool, workflow, and implementation detail is subordinate to that distinction.

The Constitution is not a branding document. It is the governing contract for authority-bearing code. A feature is incomplete when it works but weakens the authority boundary. A release is incomplete when it builds but cannot demonstrate which constitutional obligations it satisfies.

## Constitutional hierarchy

When rules conflict, the higher rule controls:

| Rank | Authority | Meaning |
|---|---|---|
| 0 | Human safety and lawful operation | No software decision overrides applicable law, safety controls, or an explicit human stop condition. |
| 1 | Prime Directives | The permanent purpose and non-negotiable system boundaries. |
| 2 | This Constitution | The enforceable invariants governing authority, evidence, state, replay, receipts, and disclosure. |
| 3 | Versioned protocol contract | The interoperable meaning of requests, transitions, receipts, and conformance vectors. |
| 4 | Policy and deployment configuration | Context-specific restrictions that may narrow authority but never expand it beyond the Constitution. |
| 5 | Application behavior and user experience | Interfaces may present or request authority but may not create it. |
| 6 | Model output and generated cognition | Inputs to evaluation only. Generated content is never authority by itself. |

No lower-ranked layer may silently reinterpret, bypass, or weaken a higher-ranked layer.

## Prime Directives

### Prime Directive 1 — Authority is singular

There is one canonical authority issuer for each governed namespace: the Cranium Kernel. Clients, models, Synapse adapters, user interfaces, local caches, and workflow engines may propose, assess, restrict, or escalate. They may not issue canonical authority receipts or commit canonical authority state.

### Prime Directive 2 — Cognition is not permission

Generated text, tool intent, confidence, semantic assessment, attestation, UI state, HTTP success, and local records are evidence or proposals. None is authorization.

### Prime Directive 3 — Fail closed

Missing, stale, malformed, unverifiable, conflicting, unauthorized, ambiguous, or unavailable evidence must deny, quarantine, or escalate. It must never become implicit permission through a default, fallback, timeout, or partial success path.

### Prime Directive 4 — Durable truth outranks transient state

An authority transition is real only after it is committed to the canonical durable store. A receipt must not be issued before commit. Restart, recovery, and independent verification must preserve the meaning of the committed transition.

### Prime Directive 5 — No replayed authority

A unique request may produce at most one committed transition. Exact replay returns the original transition. Conflicting reuse is rejected. No retry, race, duplicate message, or process restart may create an unintended second effect.

### Prime Directive 6 — Evidence remains bound

A decision must remain bound to the request, policy version, evidence commitments, semantic assessment, authority version, namespace, issuer identity, and durable commit position required by the protocol.

### Prime Directive 7 — Canon over convenience

The Canon and Constitution outrank implementation convenience, marketing pressure, benchmark theater, and feature velocity. A claim that the code cannot prove is not a feature; it is a defect in the claim.

### Prime Directive 8 — Human intent and identity are sovereign constraints

Identity, intent, and explicit human stop conditions are first-class governed inputs. They may not be diluted into disposable chat history, silently substituted, or overridden by generated cognition.

## Non-negotiable invariants

| ID | Invariant | Proof obligation |
|---|---|---|
| `INV-01` | Sole authority issuer | Only the Kernel evaluator and reducer can produce canonical authority transitions and receipts. |
| `INV-02` | Boundary before reduction | A failed boundary assessment cannot mutate governed authority state. |
| `INV-03` | Atomic authority commit | A granted increase is evaluated against committed state and receipt-bound in the same durable operation. |
| `INV-04` | Deterministic identity | Equivalent canonical request inputs produce the same request hash and transition identity. |
| `INV-05` | Replay resistance | Exact replay is observationally idempotent; conflicting reuse is denied. |
| `INV-06` | Fail-closed evidence | Invalid, expired, unavailable, or conflicting evidence cannot produce a granted transition. |
| `INV-07` | Namespace isolation | Evidence and state from one governed namespace cannot authorize another. |
| `INV-08` | Receipt integrity | A receipt is independently verifiable against its transition, request hash, issuer, and durable record. |
| `INV-09` | Restart durability | A committed transition remains verifiable after process restart and recovery. |
| `INV-10` | Honest disclosure | Documentation and acquisition claims are constrained by implemented behavior and recorded evidence. |

## Definition of code perfection

In Cranium, **code perfection does not mean code without defects**. It means code that is maximally explicit about authority, impossible to mistake for permission, measurable against invariant obligations, honest about its limits, and unable to pass release gates while violating the Constitution.

A perfect Cranium change has all of the following properties:

1. **Traceability:** each authority-bearing behavior maps to a constitutional principle, protocol clause, test, and release gate.
2. **Separation:** cognition, evidence, policy, authority, persistence, and presentation are represented as distinct responsibilities.
3. **Determinism:** security-relevant identity and decisions do not depend on wall-clock timing, process-local randomness, iteration order, or UI state.
4. **Fail-closed behavior:** uncertainty narrows the action envelope instead of expanding it.
5. **Durability:** accepted and denied transitions have an inspectable, recoverable record.
6. **Idempotence:** retries are safe by construction rather than by convention.
7. **Verifiability:** an independent verifier can test the result without trusting the client that requested it.
8. **Adversarial coverage:** each discovered failure becomes a permanent regression test.
9. **Operational honesty:** build status, platform status, security status, and commercial claims are labeled precisely.
10. **Minimal authority:** the smallest component with the smallest privilege performs the irreversible operation.

## Change law

Every change to authority-bearing code must answer these questions before merge:

| Question | Required answer |
|---|---|
| Which constitutional principle does this change implement or preserve? | Named principle or explicit `NO_AUTHORITY_IMPACT` classification. |
| Does it change request meaning, hashing, replay, receipts, policy, or durable state? | Yes/no with protocol-version impact. |
| Can a model, client, adapter, or UI bypass the Kernel? | Demonstrably no. |
| What happens when evidence is missing, stale, malformed, or conflicting? | Explicit deny, quarantine, or escalation path. |
| How is the behavior tested after restart and retry? | Named automated test or documented gap. |
| What claim does the code prove, and what does it not prove? | Evidence label required. |

## Release law

A release may be called **constitutional** only when the following gates pass:

- typecheck and production build;
- canonical conformance vectors;
- durable authority and restart/recovery checks;
- replay and conflicting-reuse checks;
- Synapse evidence-separation checks;
- production-boundary scan;
- constitutional static audit;
- declared platform workflow for every claimed target;
- no unresolved claim/code mismatch.

A green build is evidence of the gates that ran. It is not a security certification, legal conclusion, market-uniqueness finding, or proof that every platform is production-ready.

## Amendment law

The Prime Directives and constitutional invariants may be changed only through an explicit versioned amendment that records the reason, affected protocol objects, compatibility impact, migration plan, tests, and approval authority. Implementation convenience is not sufficient grounds for amendment.

## Canonical statement

> **Cranium is not the place where cognition is generated. Cranium is the place where generated cognition is confronted with policy, evidence, identity, durable state, replay resistance, and accountable authority.**

## References

[1]: ./CRANIUM_AUTHORITY_PROTOCOL_V1.md "Cranium Authority Protocol v1"
[2]: ./CANONICAL_SEMANTIC_CONTRACT.md "Canonical Semantic Contract"
[3]: ../GOVERNANCE_BOUNDARY.md "Cranium Governance Boundary"
[4]: ./RELEASE_MATRIX.md "Cranium Release Readiness Matrix"
