# Convertible Cranium: acquisition binder index

**Product umbrella:** Convertible Cranium
**Authority component:** Cranium Kernel
**Primary repository:** https://github.com/worthwylfoundation-hue/cranium-kernel
**Verified implementation stamp:** `2d0c6928ed5efb75a22a602f43516d22e9fbf610`

> **Cognition may come from anywhere. Authority comes only through Cranium.**

## 1. Buyer orientation

Convertible Cranium separates cognitive proposals from authority over consequential state changes. Models, tools, provider integrations, user interfaces, and supporting services may propose or supply evidence. The Cranium Kernel is the sole canonical authority boundary. Supporting surfaces do not independently grant authority or commit canonical state.

The principal components are:

- **Cranium Kernel:** canonical grant/deny decision, durable transition, replay controls, and verifiable receipt.
- **Synapse:** cognitive/provider ingress and evidence proposals, without independent authority.
- **Convertible Cranium Guardian Substrate:** Constitutional Integrity.
- **Convertible Cranium Imperial Substrate:** Evidence Integrity.
- **Convertible Cranium Commander OS:** user-facing operating environment and integration surface.
- **WorthWyl AI / Cranium AI:** cognitive and model-integration components, subordinate to the Kernel authority boundary.
- **Commercial Boot Drive / Acquisition Demo Drive:** packaging and demonstration surfaces, not separate authority issuers.

## 2. Architecture and evidence map

| Diligence question | Evidence entry point |
|---|---|
| What is authoritative? | `src/authority/authorityProxy.ts`, canonical semantic contract, `KERNEL_PIN` |
| What blocks denied execution? | `scripts/command-execution-gate-check.ts`, `scripts/authority-denial-semantics-check.ts` |
| What blocks replay and conflicting reuse? | `scripts/conformance-vectors.ts`, `scripts/authority-boundary-adversarial-check.ts` |
| How is state made durable? | `src/authority/sqliteAuthorityStore.ts`, durable/recovery checks |
| What protects the constitutional boundary? | `src/kernel/constitution.ts`, `scripts/constitution-runtime-check.ts` |
| What demonstrates enterprise integration? | `scripts/enterprise-integration-check.ts`, transport-security and Redis rate-limiter checks |
| What is the authority protocol? | `docs/CRANIUM_AUTHORITY_PROTOCOL_V1.md` |
| What is the constitution? | `docs/CRANIUM_CONSTITUTION_V1.md` |
| What is the threat model? | `docs/THREAT_MODEL_V1.md` |
| What is the key-custody plan? | `docs/KEY_CUSTODY_V1.md` (plan, not proof of HSM/KMS deployment) |
| What is Synapse's role? | `docs/SYNAPSE_CONTROLLER_V1.md`, `docs/SYNAPSE_CORE_EVIDENCE.md` |
| What is the IP outline? | `docs/IP_CHAIN_OF_TITLE_V1.md` (requires legal diligence; not a title opinion) |
| What is the denial demo? | `docs/DEMONSTRATION_AUTHORITY_RECEIPT_V1.md` and `npm run verify:denial-semantics` |
| What is reproducibly verified? | `KERNEL_PIN`, `npm ci --legacy-peer-deps`, `npm run verify`, `npm run verify:denial-semantics` |
| What remains open? | `docs/EVIDENCE_GAPS.md` and `docs/KERNEL_REVISION_RECONCILIATION_2026-10-18.md` |

Historical files with `Justice OS` or `Liberty Kernel` in their filenames are retained as repository history/reference documents; current product naming is defined by this index and `KERNEL_PIN`.

## 3. Asset inventory

| Schedule | Asset | Treatment for diligence |
|---|---|---|
| A | Convertible Cranium Commander OS | Product/UI surface; does not issue authority |
| B | Cranium Kernel | Canonical authority component; transfer or retention terms require a separate commercial decision |
| C | Commercial Boot Drive and Acquisition Demo Drive | Packaging/demo assets; bundled Kernel pins must match recorded source provenance |
| D | Cranium AI and Synapse | Cognitive/provider components; subordinate to the Kernel authority boundary |
| E | Archive and legacy payloads | Historical/reference assets; do not represent as current without provenance and validation |

## 4. Verification and limits

The exact verified implementation SHA is `2d0c6928ed5efb75a22a602f43516d22e9fbf610`. A fresh clean clone passed `npm ci --legacy-peer-deps`, the full `npm run verify` suite, and `npm run verify:denial-semantics`. All 14 acquisition stress cases executed and passed. React and React DOM are aligned at `19.3.1`.

The production-readiness checker passes 33 static checks but retains explicit warnings for local-Compose PostgreSQL TLS and plaintext Redis. Private-repository branch protection is not enforced under the current GitHub plan.

**Not claimed:** independent security audit, formal verification, HSM/KMS deployment, verified boot, universal production readiness, customer adoption, revenue, or valuation.

## 5. Recommended buyer sequence

1. Read `docs/ACQUISITION_READINESS_BRIEF.md` and `docs/THREAT_MODEL_V1.md`.
2. Reproduce verification at the exact stamp in `KERNEL_PIN`.
3. Inspect denied-execution, replay, receipt-binding, durable-state, and recovery tests.
4. Verify downstream source pins and each boot-drive snapshot before relying on a bundled demonstration.
5. Review every remaining gap in `docs/EVIDENCE_GAPS.md` before making security, deployment, or commercial claims.

## 6. Transfer checklist for counsel and diligence

- [ ] Confirm chain of title, contributor rights, and any prior assignments with qualified counsel.
- [ ] Review OSS licenses, dependency inventory/SBOM, and third-party notices.
- [ ] Confirm no secrets or private credentials are present in transferred trees.
- [ ] Have the buyer reproduce the exact pinned verification.
- [ ] Preserve all non-claims and unresolved security/deployment gates in any LOI or diligence schedule.
- [ ] Agree separately on Kernel transfer/retention and the scope of any license.
