# CRANIUM CORE CANON V1

**Status:** Canonical technical specification, version 1
**Reference implementation:** `cranium-kernel`
**Protocol reference:** Cranium Authority Protocol v1
**Constitution:** Cranium Constitution v1
**Scope:** Cranium Core / Convertible Cranium Processing
**Baseline:** `cranium-kernel` `origin/main` at the commit from which this Canon is introduced

> **Cognition can be generated anywhere. Authority can be acquired only through Cranium.**

This document freezes the technical identity of Cranium Core v1 for engineering, conformance, provenance, and diligence purposes. It is a technical specification, not a legal ownership opinion, patent claim, trademark determination, or substitute for counsel.

## I. Definition

Cranium Core is a bounded authority-processing architecture that separates generated cognition and upstream evidence from permission to create or commit governed authority.

The defining boundary is:

`cognition/proposal -> evidence -> policy/boundary evaluation -> authority transition -> durable commit -> receipt -> controlled execution`

Cognition is input. Evidence is support. Policy and constitutional constraints restrict the action envelope. The Kernel is the canonical authority boundary. Durable state establishes committed truth. The receipt is the verifiable record that a governed transition actually committed.

The reference implementation is `cranium-kernel`. Supporting implementations, applications, adapters, UIs, model providers, workbenches, and demonstrations are not alternative authority sources.

### Technical identity

An implementation is Cranium Core v1 only when it preserves the constitutional and protocol invariants defined in this Canon. Programming language, database, UI framework, deployment target, model provider, storage adapter, and presentation may vary unless a variation changes an invariant.

### Explicit non-definition

Cranium Core is not:

- a particular AI model;
- a prompt;
- a UI;
- a chat application;
- a database product;
- a model provider;
- a generic RAG system;
- a claim that every similar architecture is infringing or derivative;
- a claim of legal exclusivity over an abstract idea or processing concept.

## II. Convertible Cranium Processing Model

Convertible Cranium Processing describes how a proposed cognitive action is converted, or refused conversion, into authority-bearing state.

### Canonical lifecycle

1. Generation: a model, agent, human, adapter, or other source produces cognition or a proposed effect.
2. Normalization: the proposal becomes a typed authority request with identity, requested authority, evidence references, requester, namespace, protocol version, and replay identity.
3. Evidence admission: evidence, attestation, semantic assessment, and lifecycle state are checked. Evidence may restrict or support a decision. Evidence never becomes authority merely by existing.
4. Constitutional boundary evaluation: the Kernel evaluates identity, authority movement, evidence sufficiency, replay status, namespace, authority version, Synapse state where applicable, and constitutional rules.
5. Transition formation: the Kernel creates a deterministic authority transition containing the decision, boundary assessment, evidence bindings, request hash, authority version, timestamp, and receipt integrity material.
6. Reduction: only a boundary-valid Kernel evaluation is eligible for state reduction. Supporting callers cannot supply a replacement state or reducer.
7. Durable commit: canonical state and the authority journal are committed through the canonical persistence boundary.
8. Receipt issuance: a canonical receipt is returned only as the result of the durable commit path. It binds authority source, transaction identity, request hash, journal sequence, state hash, and decision.
9. Verification: a verifier can validate the receipt against the canonical durable store without trusting the client UI.
10. Controlled execution: external effectors may consume only valid authority artifacts. A model output, UI state, HTTP success response, or local cache is not permission.

### Convertible property

The architecture is convertible because cognition may originate from multiple interchangeable sources while the authority boundary remains fixed. The source of cognition may change without changing who is permitted to create canonical authority.

The conversion is therefore:

`proposal + validated evidence + policy + canonical state -> authority transition`

not:

`model output -> permission`

## III. Authority Model

### Canonical authority source

`cranium-kernel` is the sole canonical authority evaluator, reducer, replay boundary, canonical-state persistence boundary, journal writer, and canonical receipt issuer.

External callers use `KernelAuthorityProxy`. They do not provide canonical state, reducers, or receipts.

### Authority separation

The following are inputs or supporting mechanisms, not canonical authority issuers:

- model output;
- human or client intent;
- Synapse attestations;
- semantic assessments;
- provider adapters;
- UI state;
- browser storage;
- local caches;
- demonstration state;
- fixtures and test doubles;
- supporting repositories.

### Capability authority

The reference implementation contains a capability authority layer for capability, scope, risk ceiling, expiry, revocation, conditions, and delegation evaluation. Capability authorization is subordinate to the canonical authority boundary. A capability match does not independently create canonical authority state.

### Authority transition

A transition records:

- transition identity;
- subject;
- source and requested authority;
- evaluated authority version;
- decision;
- boundary assessment;
- evidence references;
- canonical request hash;
- timestamp;
- receipt integrity material.

### Receipt law

A canonical receipt is evidence of a committed Kernel transition, not a prediction that a transition could have been committed.

The receipt must remain bound to the transaction, canonical request hash, decision, journal position, and resulting durable state.

## IV. State & Provenance Model

### Canonical state

The Kernel state includes execution state, cognitive version, authority version, canon version, cognitive atoms, active identifiers, candidate hash, threat assessment, authority transitions, canon entries, and constitutional principles.

Canonical state is not represented by UI state, model output, browser storage, or arbitrary caller-owned objects.

### Identity

Authority requests have a canonical representation and SHA-256 request hash. Replay identity is bound to an idempotency key and canonical request hash.

Equivalent canonical inputs are required to produce stable request identity.

### State transitions

A committed transition advances the durable journal sequence and binds the resulting state hash to the receipt.

The durable SQLite reference store uses WAL mode, full synchronous durability, foreign-key enforcement, canonicalized JSON encoding, state hashing, sequential journal positions, previous-frame hashes, and frame hashes.

### Provenance

The engineering provenance chain is:

`source -> request -> canonical hash -> evaluation -> transition -> journal frame -> durable state -> receipt`

Development provenance is separately preserved through repository history, branches, commits, tests, CI runs, released artifacts, and evidence manifests.

This Canon does not itself establish legal authorship, inventorship, assignment, or ownership.

## V. Constitutional Invariants

The following invariants define the minimum constitutional identity of Cranium Core v1.

| ID | Invariant | Meaning |
|---|---|---|
| INV-01 | Sole authority issuer | Only the canonical Kernel may issue canonical authority transitions and receipts. |
| INV-02 | Boundary before reduction | A failed authority boundary cannot mutate governed authority state. |
| INV-03 | Atomic authority commit | The accepted transition, resulting state, and receipt bindings are committed as one durable authority operation. |
| INV-04 | Deterministic identity | Canonical request inputs produce deterministic request identity. |
| INV-05 | Replay resistance | Exact replay is idempotent; conflicting reuse is rejected. |
| INV-06 | Fail-closed evidence | Missing, stale, malformed, unavailable, conflicting, or unverifiable evidence cannot silently become permission. |
| INV-07 | Namespace isolation | Evidence and authority state cannot silently cross governed namespaces. |
| INV-08 | Receipt integrity | A receipt is independently checkable against the committed transaction and durable record. |
| INV-09 | Restart durability | A committed transition remains recoverable and verifiable after restart. |
| INV-10 | Honest disclosure | Claims are constrained by implemented behavior and recorded evidence. |

### Amendment rule

The invariants are immutable within v1. Changing their meaning requires a new Canon version and explicit compatibility treatment. A patch may clarify implementation without changing an invariant. A change to invariant semantics is a major architectural amendment.

## VI. Enforcement Boundaries

| Boundary | Canonical enforcement surface | Evidence |
|---|---|---|
| Request identity | `authorityRequestV1.ts`, Kernel canonical encoder | Authority request validation and canonical hashing |
| Authority evaluation | `kernel/engine.ts` | Boundary assessment and transition tests |
| State reduction | `kernel/engine.ts` / `KernelStateReducer` | Constitutional and lifecycle checks |
| Replay | `kernel/replayGuard.ts` plus durable replay reconstruction | Replay and conflicting-reuse tests |
| Durable authority | `authority/sqliteAuthorityStore.ts` | Durable authority and recovery checks |
| External write boundary | `authority/authorityProxy.ts` | Proxy contract and integration behavior |
| Capability | `authority/capabilityAuthority.ts` | Capability/risk/delegation logic |
| Synapse evidence | `governance/SynapseCoreTransaction.ts`, runtime adapter | Synapse integration and signature checks |
| Constitutional rules | `kernel/constitution.ts`, Constitution v1 | Static and runtime constitutional checks |
| Memory integrity | `memory/MiracleMemoryStore.ts` | 30/30 Miracle Memory integration checks |
| Atomic journal | `kernel/atomicJournal.ts`, `atomicTransaction.ts` | Crash/recovery and journal-integrity checks |
| Production boundary | `scripts/production-boundary-check.mjs` | Production-boundary release gate |

No supporting layer may create a competing canonical receipt or canonical authority state.

## VII. Evidence Model

Cranium Core v1 uses executable evidence as the primary engineering proof surface.

### Required evidence classes

1. Repository lineage: Git history, branches, commits, tags, releases, and migration history.
2. Static specification: Constitution, authority protocol, semantic contract, this Canon, architecture records, and provenance records.
3. Executable verification: typecheck, production build, integration checks, recovery checks, lifecycle checks, conformance vectors, constitutional checks, and production-boundary checks.
4. Adversarial verification: replay collision, tampering, stale evidence, namespace conflict, invalid signatures, malformed frames, duplicate frames, and other fail-closed cases.
5. CI evidence: reproducible workflow execution on declared platforms.
6. Release evidence: evidence manifests, generated artifacts, reproducible commands, and explicit limitations.

### Evidence language

Use these labels exactly:

- **implemented and verified**
- **implemented, not yet verified in CI**
- **designed, not implemented**
- **fixture**
- **test-only**
- **placeholder**

A placeholder, fixture, static report, screenshot, generated digest, or UI label must not be presented as authority-bearing execution proof.

### Reference verification baseline

At the time this Canon branch was established from `origin/main`, the reference Kernel verification suite completed successfully after a clean `npm ci`.

The verified baseline included:

- TypeScript typecheck;
- production build;
- Miracle Memory: 30 passed, 0 failed;
- Synapse integration and signature checks;
- atomic recovery;
- durable authority;
- authority lifecycle matrix;
- conformance corpus: 8 passed, 0 failed;
- constitutional static check;
- constitutional runtime check: 8 directives, 10 invariants;
- Coma conformance.

The build emitted a Vite chunk-size warning for a JavaScript bundle above 500 kB. This is an optimization warning, not a verification failure.

The reference repository documents limitations including production key custody, rotation/revocation, HSM operation, and the distinction between local verification and production deployment.

### Evidence does not establish

Passing engineering tests does not by itself establish:

- legal ownership;
- patentability;
- trademark rights;
- market uniqueness;
- security certification;
- production readiness in every deployment topology;
- commercial success;
- infringement by another implementation.

## VIII. Permitted Implementations

A conforming implementation may vary:

- programming language;
- runtime;
- database;
- filesystem or cloud storage;
- UI;
- model provider;
- inference engine;
- transport;
- deployment topology;
- cryptographic library, provided required semantics and security properties are preserved;
- provider adapters;
- observability system;
- external execution adapter.

The following may not vary without a versioned constitutional/protocol amendment:

- the sole canonical authority boundary;
- separation of cognition from authority;
- fail-closed treatment of invalid or unavailable evidence;
- canonical request identity semantics;
- replay semantics;
- namespace isolation;
- durable transition semantics;
- receipt integrity requirements;
- independent verification requirements;
- honest evidence labeling.

### Independent implementation requirement

An independent implementation should be capable of implementing the protocol without importing the reference implementation. It should be tested against the same language-neutral conformance corpus.

The purpose of independent implementation is engineering validation and interoperability testing, not proof of legal ownership or exclusivity.

## IX. Non-Canonical Implementations

The following are explicitly non-canonical unless and until they conform to this Canon and are designated through the versioned governance process:

- UI-only authority simulations;
- browser/localStorage authority stores;
- model outputs presented as permission;
- unsigned local approval records;
- mock receipts;
- static reports presented as live execution;
- independent reducers that bypass `KernelAuthorityProxy`;
- simulator-only authority state;
- historical or experimental Core repositories;
- application-specific authority implementations;
- fixtures and test doubles used outside their declared test boundary.

A system may resemble Cranium Core while remaining non-conforming because resemblance is not conformance.

Conversely, an independently developed implementation may conform to the protocol while remaining independently authored. Conformance and authorship are separate engineering and legal questions.

## X. Versioning & Lineage

### Canon versioning

`CRANIUM_CORE_CANON_V1.md` defines Cranium Core v1.

Future versions must preserve the historical record of v1. They must not silently rewrite v1's meaning.

Version changes follow:

- **Patch:** editorial clarification or non-semantic verification improvement.
- **Minor:** additive, backward-compatible capability that does not alter v1 invariants.
- **Major:** changed invariant, protocol object semantics, authority semantics, receipt verification rules, or canonical processing identity.

### Lineage rule

The authoritative lineage is:

`Canon -> Constitution -> Protocol/Semantic Contract -> Reference Kernel -> Evidence/CI -> Implementations`

The reference Kernel is the executable embodiment of the Canon, not the sole textual definition of it.

Supporting repositories may implement, integrate, demonstrate, document, test, package, or deploy against the Canon. They may not silently redefine it.

### Independent implementation experiment

The planned Gemini / Google AI Studio experiment is classified as an **independent implementation challenge**.

The experiment must receive the Canon and protocol invariants, not hidden reference source code, and must produce a separately attributable implementation.

The comparison must record:

1. which structures independently converge;
2. which structures diverge;
3. which invariants are preserved;
4. which invariants are violated or omitted;
5. performance and operational differences;
6. semantic differences;
7. whether convergence appears required by the stated invariants or merely chosen by the implementation.

The experiment is evidence for engineering analysis. It is not, by itself, evidence of novelty, non-obviousness, copyright infringement, or legal exclusivity.

### IP evidence boundary

This Canon deliberately separates technical preservation from legal protection.

Potentially relevant rights categories must be evaluated separately:

- copyright for original source code, documentation, diagrams, and other protectable expression;
- trademark for source-identifying names and marks, subject to availability and registration strategy;
- patent protection only for eligible inventions that satisfy applicable requirements;
- trade-secret treatment for qualifying information maintained with reasonable secrecy measures;
- contracts and licenses for controlled use and transfer.

Public disclosure can affect patent strategy and jurisdictional rights. Patent counsel should review filing strategy before additional public disclosure where patent protection is being considered.

### Historical integrity

V1 is frozen by its Git commit, repository history, evidence artifacts, and release metadata.

A future version may supersede v1. It may not retroactively change what v1 meant.

## Canonical statement

> **Cranium Core is the canonical processing and authority architecture. Implementations may vary. The constitutional invariants do not.**

Operationally:

> **Models may propose cognition. Evidence may support or restrict. Policy may constrain. Only the canonical Cranium authority boundary can convert an eligible proposal into committed authority.**

## References

- `docs/CRANIUM_CONSTITUTION_V1.md`
- `docs/CRANIUM_AUTHORITY_PROTOCOL_V1.md`
- `docs/CANONICAL_SEMANTIC_CONTRACT.md`
- `AUTHORITY_ARCHITECTURE.md`
- `GOVERNANCE_BOUNDARY.md`
- `EVIDENCE.md`
- `PROVENANCE.md`
- `TRUTH_AND_CONFORMANCE.md`
- `src/kernel/engine.ts`
- `src/kernel/constitution.ts`
- `src/authority/authorityProxy.ts`
- `src/authority/sqliteAuthorityStore.ts`
- `scripts/conformance-vectors.ts`
- `scripts/atomic-recovery-check.ts`
- `scripts/durable-authority-check.ts`
- `scripts/constitution-check.mjs`
- `scripts/constitution-runtime-check.ts`
