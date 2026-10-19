# Switch Presentation Brief

## Convertible Cranium

**Positioning:** Convertible Cranium is a cognitive-authority-bound dual-engine governance substrate for governing cognition, authority, execution, provenance, continuity, and evolution across heterogeneous intelligence systems.

**Core thesis:** Models may propose cognition. Only Cranium determines whether cognition acquires authority.

## What the system does

Cognition can originate from models, agents, tools, memory, evaluators, or other sources. The substrate separates cognition from authority. Synapse evaluates evidence and governance conditions. The Kernel is the canonical authority boundary. Governed execution occurs only after authorization. Receipts and durable state make authority transitions inspectable and recoverable.

Canonical flow:

Cognition → Assessment → Authority Determination → Governed Execution → Attestation/Receipt → Durable Continuity

## Enterprise integration surface

- Enterprise protocol: enterprise-integration-v1
- API version: v1
- OIDC/JWT authentication with issuer, audience, JWKS, tenant, subject, and scope enforcement
- Tenant-scoped request identity and idempotency
- PostgreSQL durable authority state and hash-chained journal
- Redis distributed session authority with monotonically increasing fencing epochs
- Session circuit breaker with revocable execution lease, cancellation, verified checkpoints, and rollback
- Correlation IDs and security response headers
- Readiness and health endpoints
- Non-root production container
- Production readiness gate with 21 checks

## Evidence currently verified

The local verification suite passes TypeScript lint, production build, command law, execution gate, trust chain, Miracle Memory, Synapse, atomic recovery, durable authority, lifecycle, conformance, constitution, constitution runtime, and Coma checks.

Additional enterprise checks pass for enterprise integration, distributed session authority, session circuit breaker, cognitive/subconscious runtime, and proofing/remediation.

Miracle Memory integration currently reports 30 passed and 0 failed checks. Conformance reports 8 passed and 0 failed. Constitution verification reports 8 directives and 7 engine proofs with contract alignment passing. Production readiness reports 21 checks with no failures.

## Demonstration sequence

1. Show an ordinary cognition proposal.
2. Show Synapse assessment and provenance binding.
3. Show Kernel authority determination.
4. Attempt a replay and show rejection.
5. Attempt a forged or tampered attestation and show rejection.
6. Demonstrate session fencing: a stale worker cannot commit after a newer execution epoch exists.
7. Trip the session circuit breaker and show execution cancellation and commit denial.
8. Show durable receipt and journal continuity after restart.
9. Show tenant separation and scope enforcement.
10. Show the evidence commands and their machine-readable results.

## What is not claimed

The repository evidence demonstrates engineering behavior and integration readiness. It does not by itself constitute third-party certification such as SOC 2 or ISO 27001. Production deployment still requires environment-specific TLS, identity-provider configuration, managed database and Redis controls, backup and recovery procedures, observability, security review, and operational ownership.

## Commercial/IP framing

WorthWyl LLC is the owning/legal-commercial entity. Convertible Cranium is the product/platform family. Cranium Kernel and Synapse are technical components of the substrate. WorthWyl Forge and other applications can consume the substrate without redefining the underlying authority architecture.
## Questions a technical diligence team should be able to answer

### Where does authority live?

In the Cranium Kernel authority boundary. PostgreSQL stores durable state and journal evidence but is not the authority issuer.

### Can a model grant itself authority?

The architecture separates cognition from authority. Requests are admitted through the canonical Kernel boundary, with command-law, capability, provenance, scope, expiration, issuer, and receipt checks.

### What happens when a worker becomes stale?

Distributed session authority issues monotonically increasing epochs. A worker holding an older fencing token may complete local computation, but the commit boundary rejects the stale epoch.

### What happens when an active session must stop?

The session circuit breaker revokes the execution lease, signals cancellation, blocks subsequent commit, and can restore the latest verified checkpoint. Physical side effects outside a cooperative execution boundary still require downstream transactional controls.

### What proves continuity?

The durable authority store maintains state hashes, journal sequence, transaction identifiers, idempotency keys, and a hash-chained journal. Receipt verification checks the stored transition and integrity chain.

### What happens on replay?

Idempotency keys return the original committed receipt for the same canonical request. Reuse of the same key for a different request is rejected. Receipt and attestation replay paths are covered by executable conformance checks.

### What happens if evidence is tampered with?

Signature, payload-hash, state-hash, journal-chain, checkpoint, snapshot, and receipt verification paths fail closed when integrity is violated.

## Presentation discipline

Lead with the infrastructure problem, not the number of repositories. Use the repositories as evidence of implementation depth. Do not describe the Android/Termux development environment as the production architecture. Do not present simulated evidence as production evidence. Every performance or reliability figure shown to a buyer should identify its test scope and conditions.

## Current engineering gate

The canonical branch is feat/capability-authority-v1. Latest local verification is green. The branch contains the enterprise runtime, PostgreSQL durability, Redis fencing, session circuit breaker, and concurrency/idempotency hardening.

Before a final buyer-facing claim of production deployment readiness, complete the remaining environment, security, disaster-recovery, and observability controls and verify the latest GitHub Actions run for the exact presentation commit.
