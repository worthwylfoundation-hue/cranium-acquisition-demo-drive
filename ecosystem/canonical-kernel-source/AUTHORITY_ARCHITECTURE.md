# Cranium Authority Architecture

**Status:** Canonical design decision  
**Effective source:** `cranium-kernel`  
**Scope:** Core, Synapse, Kernel, Ultra, OS, Forge, substrate, lineage, and diligence repositories.

## Canonical authority boundary

`cranium-kernel` is the sole canonical authority evaluator, reducer, replay guard, receipt issuer, and journal writer. A transition is canonical only when accepted and committed through the Kernel authority proxy.

`cranium-synapse` is the canonical attestation contract. It supplies bounded attestation data and does not grant authority by itself.

Canonical state is represented by the Kernel authority store. Browser state, demo state, localStorage, simulator objects, UI actions, and model outputs are never canonical state.

## Repository roles

| Repository | Role | May issue canonical authority? | May mutate canonical state? |
|---|---|---:|---:|
| `cranium-kernel` | Canonical authority, reducer, receipt, journal, and persistence boundary | Yes | Yes, through the proxy/store |
| `cranium-synapse` | Canonical attestation contract | No | No |
| `Cranium-Ultra` | Integrated demonstration and verification surface | No | No |
| `Cranium-Core-hardened-final-` | Historical/supporting Core lineage | No | No |
| `Cranium-Core-` | Cognitive/application supporting layer | No | No |
| `Cranium-Core-OS-with-Metacognitive-tracker-` | OS/operator and metacognitive demonstration layer | No | No |
| `Cranium-Substrate-` | Historical/supporting substrate lineage | No | No |
| `CognitiveCore-` | Supporting cognitive layer lineage | No | No |
| `WorthWyl-Forge` | Public UI and demonstration surface | No | No |
| `Substrate-only` | Simulator/research surface | No | No |
| `Substrate-Workbench-Diligence-Proof-` | Diligence and verification workbench | No | No |
| `acquisition-grade-template` | Documentation/template surface | No | No |
| `WorthWyl-game-changer` | Historical/application surface | No | No |
| `cranium-relics` | Historical archive | No | No |

## Boundary rules

1. Supporting surfaces may request evaluation, display state, and submit evidence; they may not create canonical receipts.
2. A receipt is canonical only if its transaction ID and journal sequence are present in the Kernel authority store.
3. Non-Kernel receipts must be labeled simulation or demonstration and must fail canonical verification.
4. Canonical state is never read from browser storage or model output.
5. The authority proxy is the only supported write interface for external callers.
6. Journal records are append-only and verified by predecessor hash and state hash.
7. A failed or ambiguous durable commit fails closed; it does not update the in-memory caller state.

## Explicit limitation

This repository now includes a durable SQLite-backed reference store and boundary contract. A production deployment still requires operational review of database permissions, backups, key custody, migration discipline, and multi-node topology.


## Current authority model (2026-10-06 audit correction)

The current Convertible Cranium authority model is:

Listener → Synapse proposal/context derivation → independent Constitutional Authority substrate + independent Evidence Grounding substrate → Cranium Kernel convergence authority.

The Kernel remains the sole canonical authority boundary.

This file previously described the system as a dual-engine substrate and listed historical repository names. Those names are lineage, not the current authority path. “Dual-engine” is obsolete terminology and is not the current architecture.

Listener status in this repository: not implemented. The only `listener` identifiers in `cranium-kernel` at the audited tree are event callbacks in `src/governance/sessionCircuitBreaker.ts`. They are not the architectural Listener. No Listener component was found in `cranium-synapse` by code search on 2026-10-06. Until an implementation exists, Listener is an architectural concept, not a verified component.
