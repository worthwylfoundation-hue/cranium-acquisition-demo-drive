# Convertible Cranium Portfolio Lineage

**Status:** Canonical engineering map. Updated 2026-09-24.

## Canonical architecture

Convertible Cranium is organized around three externally meaningful boundaries:

1. **Cognition**: models, agents, memory, research, reasoning, proposals, evidence preparation.
2. **Authority**: canonical policy evaluation, capability/delegation checks, protected state transitions, authorization, receipts, verification and remediation.
3. **Execution**: adapters and real-world effects. Consequential effects require a valid canonical authorization result.

Legacy internal names for decision, proofing, subconscious, time-machine, and similar concepts are implementation responsibilities, not independent authority planes. They do not create additional sources of authority.

**Canonical authority source: `cranium-kernel`.** No other repository may independently grant, revoke, or mutate canonical authority.

## Repository disposition

| Repository | Disposition | Primary role | Authority status |
|---|---|---|---|
| `cranium-kernel` | Canonical | Authority kernel and protected state | Sole canonical authority |
| `cognitive-substrate-governance-ecosystem` | Active contract/governance | Authority contracts and operator governance | No authority |
| `cranium-acquisition-template` | Template | Governance/CI acquisition template | No authority |
| `cranium-provider-integrations` | Adapter | Provider/model integrations | No authority |
| `cranium-ai` | Product | Cognitive/UI/runtime surface | No authority |
| `cranium-acquisition-demo-drive` | Product snapshot | Buyer-facing offline demonstration appliance | Delegates protected decisions to canonical authority |
| `cranium-content-hub` | Documentation | Technical/product presentation | No authority |
| `cranium-portfolio` | Portfolio | Evidence/index surface | No authority |
| `worthwyl2022-cloud` | Account/infrastructure | Account-level portfolio/infrastructure material | No authority |
| `cranium-ultra-platform` | Product/prototype | Extended platform surface | No authority |
| `cranium-substrate-simulator` | Test/research | Simulation and analysis | No authority; simulations are not production evidence |
| `cranium-substrate-reference` | Reference | Architecture/reference implementation | No authority |
| `cranium-operator-os` | Product | Operator/user experience | No authority |
| `cranium-diligence-workbench` | Diligence | Evidence and review tooling | No authority |
| `cranium-cognitive-core` | Research/prototype | Cognitive components | No authority |
| `cranium-canonlane-contracts` | Contract/reference | Canonical contract artifacts | No authority |
| `cranium-boot-drive` | Product snapshot | Commercial/offline appliance | Delegates protected decisions to canonical authority |
| `cranium-archive` | Historical | Preserved lineage and provenance | Inactive |
| `Cranium-Core-` | Historical | Earlier Core implementation | Superseded |
| `Convertible-Cranium-ai-v-2.0` | Historical/product | Earlier product generation | No authority |
| `cranium-synapse` | Contract/adapter | Bounded evidence/provenance transport | No authority |
| `worthwyl-game-changer` | Creative product | Product/demo surface | No authority |
| `cranium-hardened-core` | Predecessor/prototype | Earlier hardened Core surface | Superseded |
| `worthwyl-forge` | Product | Media/build surface | No authority |

## Lineage rules

- Historical copies are preserved for provenance and are not silently treated as current implementations.
- Appliance copies are release snapshots. They must identify the canonical authority revision they contain or depend upon.
- A repository becomes canonical only through a dated decision that names its revision, interfaces, compatibility evidence, security review and rollback path.
- A repository is not authoritative because its name contains Core, Authority, Governance, Judge, or similar terminology.
- Documentation, demos and marketing material may describe architecture, but executable enforcement determines capability.
- Synthetic fixtures are permitted only when explicitly identified as test fixtures. They are never operational evidence.
- Claims of production use, customers, compliance, performance, security certification or deployment must have directly traceable evidence or be labeled as hypothetical, historical, experimental or unverified.

## Appliance lineage

`cranium-boot-drive` and `cranium-acquisition-demo-drive` are intentionally distributable snapshots of the ecosystem. They may contain bundled components for offline operation, but bundled copies do not become competing authority sources. Their release metadata must record the canonical Kernel revision and component revisions used to construct the appliance.

## Historical name lineage

Earlier names and implementations remain in `cranium-archive` for provenance. The current engineering identity is **Convertible Cranium**, with `cranium-kernel` as the canonical authority implementation.

## Evidence boundary

This map does not claim universal AI safety, arbitrary external exactly-once execution, legal ownership, production customer deployment, security certification, or capabilities not demonstrated by executable tests. Those claims require separate evidence.
