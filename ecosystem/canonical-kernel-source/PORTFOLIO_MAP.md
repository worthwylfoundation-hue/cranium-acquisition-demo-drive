# Cranium Portfolio Map

## Authority decision

`cranium-kernel` is the **sole canonical semantic and authority source** for the entire Cranium substrate ecosystem. It owns transition evaluation, authority-state mutation, replay protection, evidence checks, constitutional rules, durable journaling, canonical receipts, and the contract version published in [`docs/CANONICAL_SEMANTIC_CONTRACT.json`](./docs/CANONICAL_SEMANTIC_CONTRACT.json).

No other repository may define a competing authority boundary, canonical state store, canonical receipt format, or divergent semantic contract.

## Ecosystem roles

| Repository | Role | Authority status |
|---|---|---|
| `cranium-kernel` | Canonical evaluator, reducer, replay guard, journal, durable store, receipt issuer | Sole authority |
| `cranium-synapse` | Bounded attestation and evidence adapter | Never grants authority |
| `synapse-contracts` | Historical/documentation contract surface | No runtime authority |
| `Cranium-Ultra` | Integrated operator and verification surface | Supporting only |
| `Cranium-Core-OS-with-Metacognitive-tracker-` | Operator, creative OS, metacognitive demo | Supporting only |
| `Substrate-Workbench-Diligence-Proof-` | Diligence and evidence review workbench | Evidence surface only |
| `portfolio-showcase` | Acquisition-facing portfolio documentation | Presentation only |
| `Cranium-Core-`, `Cranium-Core-hardened-final-`, `Cranium-Substrate-`, `CognitiveCore-` | Application, substrate, and historical Core lineages | Supporting or historical |
| `Substrate-only` | Simulator/research surface | Non-canonical |
| `WorthWyl-Forge`, `WorthWyl-game-changer` | Public UI, media, and application surfaces | Non-canonical |
| `acquisition-grade-template`, `content-hub`, `multi-ai-integration` | Documentation, content, and workflow surfaces | Non-canonical |
| `cranium-relics` | Historical archive | No authority |

## Boundary guidance

All authority-changing behavior must cross the Kernel’s validated transition boundary. Upstream applications, Synapse analysis, workbenches, content, and portfolio surfaces may propose, display, or describe changes, but they must not directly mutate canonical authority state, bypass replay checks, substitute unverified evidence, or present fixtures as execution proof.

## Acquisition evidence rule

Every acquisition-facing claim must identify its source repository, commit or version, exact verification command, actual result, evidence label, and residual limitation. A fixture, test-only value, static report, screenshot, generated digest, or unavailable local adapter is not a canonical result.
