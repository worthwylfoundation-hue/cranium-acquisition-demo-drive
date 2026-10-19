# INVESTMENT & TECHNICAL ACQUISITION MEMORANDUM

**FILENAME:** `ACQUISITION_PACKAGE.md`  
**REGISTRY AUTH:** `WH-2022-CLOUD-ACQ`  
**CANONICAL BRANCH:** `main`  
**CANONICAL VERIFIED IMPLEMENTATION TIP:** `52f312dc5b4f080332d47836ef55b6b73d1ef99b`

**MEMO UPDATE BASE:** `52f312dc5b4f080332d47836ef55b6b73d1ef99b` (documentation-only update follows)

**KERNEL FEATURE TIP (gateway #48):** `1704c3e30269a364f696d96bf76b48c87daabee9`

**TARGET INFRASTRUCTURE:** Convertible Cranium Governance Substrate Ecosystem

**MEMO RECONCILE DATE:** 2026-10-15


### Verification lineage (honest)

| Milestone | Ref | What it proves |
|-----------|-----|----------------|
| Phase 1–3 independent clean-clone gate | `c2bd6d38a71f1ae124beec73df68b8af91a23bc0` | `verify:keys`, `verify:keys-bound`, `verify:synapse-controller`, full `verify` on clean clone |
| Local full suite (feat branch, pre-squash) | recorded 2026-09-29 local environment | exit 0 ~67.61s including denial-semantics |
| Canon V1 on default branch | `482b9c54a80f0894e523cb94c77fa85d3f62c264` | Squash of validated canon onto `main` |
| Previous full clean-clone diligence stamp | `e36bdba2fe0a448473f94250920e751c95e1d3e0` (2026-09-30) | Historical evidence only; superseded by the current-tip run below |
| **Current main verification** | **`ce24cd42ff520ba9e6953ccdda3b818dd6d48687` (2026-10-19)** | Clean checkout on Android Termux; Node `v24.18.0`; npm `11.19.1`; `npm ci`, `npm run verify`, and `npm run verify:denial-semantics` all exited 0; npm audit reported 0 vulnerabilities across 71 packages. Main push CI on this exact SHA passed [TypeScript CI](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081188), [Android CI](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081282), [Enterprise Integration Evidence](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081319), and [CodeQL](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081170). |
| Enterprise gateway hardening (#48) | `1704c3e30269a364f696d96bf76b48c87daabee9` | Audit decisions, trusted-proxy rate limits, production compose fail-closed shape |
| KERNEL_PIN / memo restamp update | `ce24cd42ff520ba9e6953ccdda3b818dd6d48687` | Current diligence stamp after full local verification and all four main-branch CI workflows passing |

> **Current verification stamp:** Exact main SHA `ce24cd42ff520ba9e6953ccdda3b818dd6d48687` was checked out cleanly and tested on Android Termux on 2026-10-19 with Node `v24.18.0` and npm `11.19.1`. `npm ci`, `npm run verify`, and `npm run verify:denial-semantics` all exited 0; npm audit reported 0 vulnerabilities across 71 packages. The exact main SHA also passed the [TypeScript CI](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081188), [Android CI](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081282), [Enterprise Integration Evidence](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081319), and [CodeQL](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081170) workflows. This is reproducible project verification, **not an independent security audit or third-party certification**.

> This memorandum is an engineering diligence artifact. Claims are bounded by source inspection and executable verification in the lineage table. Architectural descriptions beyond `cranium-kernel` are system-level mappings unless separately verified.

---

## LAYER 1: EXECUTIVE INVESTMENT THESIS

### Core Architectural Problem

Probabilistic cognitive systems can generate candidate actions, while authoritative software systems require deterministic controls over consequential state transitions. The central architectural question is therefore not how to make cognition deterministic, but how to prevent cognitive generation from becoming authority by implication.

### Architectural Thesis

Convertible Cranium separates cognitive proposal generation from deterministic authority over consequential state transitions. The governing rule is:

> **Models may propose cognition. Only Cranium determines whether cognition acquires authority.**

Within the kernel implementation, authorization is represented by an independently evaluated authority path, durable transition state, replay controls, cryptographic request binding, and integrity-checked receipts and journal frames.

---

## LAYER 2: ARCHITECTURAL SPECIFICATION

### System-Level Components

1. **Convertible Cranium Justice OS:** product surface; **Convertible Cranium Commander AI:** operational interface. **Live commercial boundary:** `convertible-cranium-commander` → `COMMANDER_OS_PACKAGE_BOUNDARY.md`. (`cranium-ultra-platform` is archived historical reference only.)
2. **Convertible Cranium AI:** cognitive intelligence and orchestration container (`cranium-ai`).
3. **Cranium Synapse:** assessment, translation, normalization, and routing boundary.
4. **Cranium Kernel:** canonical authority source and deterministic transition enforcement.
5. **Miracle Memory:** continuity, journal, state, and cognitive quarantine layer.
6. **Session Circuit Breaker:** runtime safety boundary for protected execution and recovery.
7. **Acquisition demo / signed release path:** `cranium-acquisition-demo-drive` @ `03ecae7` (tag-only release workflow; validation cannot access signing key).

For this revision, the `cranium-kernel` implementation is the directly inspected authority boundary.

### Verified / present Kernel artifacts

`KernelAuthorityProxy`, `DefaultAuthorityTransitionEngine`, `SQLiteAuthorityStore`, `PostgresAuthorityStore`, canonical request hashing, durable receipts, replay handling, journal integrity validation, cognitive-subconscious quarantine, KeyManager, ArtifactLifecycle binding, SynapseController, enterprise gateway (OIDC, rate limit, trusted proxy, audit decisions).

---

## LAYER 3: ENFORCEMENT MODEL & FORMAL EXECUTION SEMANTICS

### Authority Flow

- **Proposal:** candidate operation without inherent execution authority.
- **Assessment:** evidence normalized and evaluated against authority requirements.
- **Authorization:** kernel evaluates under deterministic rules.
- **Ratification:** accepted transition receives durable authority evidence.
- **Execution:** only accepted authoritative transitions proceed.
- **Evidence:** receipts bind authority, transaction identity, request identity, journal sequence, state hash, and decision.
- **Failure:** invalid, contradictory, replayed, stale, unavailable, or tampered evidence is denied, quarantined, or fails closed.

### Architectural Invariants

**Invariant I:** Cognitive generation is not an authority transition.  
**Invariant II:** Cognitive proposals do not directly mutate authoritative kernel state.

### Formal Safety Model (specification-level)

`AuthoritySatisfied(operation) = ProposalValid AND CapabilityAuthorized AND IdentityValid AND SessionValid AND PolicySatisfied AND StateConsistent AND NonReplay AND EvidenceValid AND CircuitBreakerPermits`

`AuthoritySatisfied -> AuthorizedExecution -> AuthoritativeStateMutation`  
`NOT AuthoritySatisfied -> NOT AuthorizedExecution -> NOT AuthoritativeStateMutation`

### Behavioral Verification Vectors

| Vector | Condition | Result |
|---|---|---|
| V-001 | Valid authorized transition | Accepted path |
| V-002 | Unauthorized capability | Denied |
| V-003 | Invalid identity | Denied |
| V-004 | Invalid/expired session | Denied |
| V-005 | Policy violation | Denied |
| V-006 | Contradictory cognition | Quarantined; authority blocked |
| V-007 | Replay / conflicting idempotency | Blocked / denied |
| V-008 | Tampered receipt/evidence | Verification denied |
| V-009 | Authority unavailable | Fail-closed |
| V-010 | Circuit-breaker critical | Protected state / rollback |
| V-011 | Recovery checkpoint | Recovery path |
| V-012 | Cognitive direct mutation | No authority path |

---

## LAYER 4: VERIFICATION EVIDENCE

### Full verification (lineage)

Current verification stamp: **`ce24cd42ff520ba9e6953ccdda3b818dd6d48687`** (2026-10-19), clean checkout on Android Termux, Node `v24.18.0`, npm `11.19.1`; all three required commands exited 0. The exact main SHA passed [TypeScript CI](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081188), [Android CI](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081282), [Enterprise Integration Evidence](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081319), and [CodeQL](https://github.com/worthwylfoundation-hue/cranium-kernel/actions/runs/39229081170). This is project-run reproducibility evidence, not an independent security audit.

```bash
npm run verify
npm run verify:denial-semantics
```

Material outputs at that stamp included: Key Manager PASS, Miracle Memory 30/30, Synapse/keys-bound/controller PASS, atomic recovery, durable SQLite WAL, lifecycle, conformance 8/8, constitution/runtime, COMA, circuit breaker, synapse adapter, denial-semantics.

Enterprise pipeline on current tree additionally includes `verify:enterprise-integration`, `verify:distributed-session`, `verify:production-readiness` (structural), `verify:acquisition-stress-suite`.

**Residual verification findings (do not omit in diligence):** the current verification output reports `CONSTITUTION_PASS directives=8 engine_proofs=7` even though the checker inspects eight proof markers; the acquisition stress-suite command prints its 14-case manifest rather than executing all 14 cases. The dependency install reported one high-severity advisory; the separate dependency audit identified `source-map-js` GHSA-68fv-2mgg-jv7q (affected versions `<1.2.2`, fix available). No automatic dependency change was applied as part of this stamp. The repository's zero-alert target is therefore **not met** until the alert is resolved and GitHub Dependabot/CodeQL status is rechecked.

**Current verified implementation tip:** `52f312dc5b4f080332d47836ef55b6b73d1ef99b`. The exact test result does not imply production certification; the following metadata-only commit records the stamp.

### Denial semantics

`AUTHORITY_DENIAL_SEMANTICS_PASS V-006=quarantine V-007=replay-blocked V-008=evidence-tamper-blocked canonical-authority=cranium-kernel`

---

## LAYER 5: DURABLE AUTHORITY BOUNDARY

SQLite path: WAL, `synchronous=FULL`, journal hash chain, BEGIN IMMEDIATE, receipt binding, replay/idempotency, cognitive QUARANTINED. **No SQLite encryption claim.**

Postgres path (enterprise): SERIALIZABLE, idempotency keys, journal integrity, conflict detection — see `postgresAuthorityStore.ts` and production compose requirements.

---

## LAYER 6: ENTERPRISE / PRODUCTION BOUNDARY (post-#48)

| Item | Status |
|------|--------|
| Production compose TLS / rediss / trusted proxy required | Present |
| Local enterprise compose plaintext | Smoke only — not production |
| HSM/KMS | Explicit non-claim |
| Multi-replica distributed rate limit | Explicit non-claim |
| Independent security audit | Explicit non-claim |

---

## APPENDIX A: ARTIFACT MATRIX

| Artifact | Role |
|---|---|
| `src/authority/*` | Authority proxy, stores, subconscious |
| `src/governance/*` | KeyManager, lifecycle, Synapse controller |
| `src/integration/*` | Enterprise gateway security, OIDC, API contract |
| `deploy/compose.production.yml` | Fail-closed production shape |
| `scripts/*-check*` | Executable verification corpus |
| `KERNEL_PIN` | Tip + diligence stamp tracking |

---

## APPENDIX B: REPRODUCTION

```bash
git clone https://github.com/worthwylfoundation-hue/cranium-kernel.git
cd cranium-kernel
git checkout main
git rev-parse HEAD   # current main tip; latest verification stamp is ce24cd42ff520ba9e6953ccdda3b818dd6d48687
npm ci
npm run verify
npm run verify:denial-semantics
```

### Verification Boundary Note

Does not claim encrypted SQLite, air-gapping, multi-repo production status, revenue, users, HSM/KMS custody, or independent audit.
