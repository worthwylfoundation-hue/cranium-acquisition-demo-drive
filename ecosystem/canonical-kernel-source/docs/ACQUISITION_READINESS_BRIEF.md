# Cranium Acquisition Readiness Brief

## Executive position

Cranium is a governed authority substrate for systems whose cognition may be supplied by any model, provider, human, or deterministic process. The Kernel is the sole canonical authority issuer. Supporting surfaces provide bounded evidence, requests, or user experiences; they do not independently grant authority or commit canonical state.

> **Cognition may come from anywhere. Authority comes only through Cranium.**

This distinction is the product thesis and the constitutional boundary. It is enforced by the Kernel evaluator, reducer, durable authority store, receipt verifier, replay controls, constitutional assertions, conformance vectors, and repository-local adoption gates.

## What is demonstrated

The current Kernel demonstrates canonical request hashing, replay inspection, boundary validation, constitutional runtime checks, durable SQLite WAL state, journal hash-chain integrity, receipt verification, restart recovery, fail-closed evidence handling, and adversarial rejection of forged receipts and conflicting request reuse.

The ecosystem now has a common adoption contract and a local CI audit across 20 non-Kernel repositories. Each supporting repository identifies `cranium-kernel` as the sole authority source and runs the adoption audit in GitHub Actions.

## What is not claimed

The current evidence does not constitute an independent security audit, formal verification, production key-management certification, universal deployment readiness, or proof of commercial traction. Production key custody, rotation, revocation, trusted-key distribution, and external operational controls remain explicit diligence items.

## Buyer-relevant wedge

The immediate platform opportunity is governed AI action orchestration: multiple cognitive sources can propose, explain, or assess an action, while the Kernel alone decides whether the action may become durable, authoritative, replay-safe, and auditable. This can support enterprise approval workflows, regulated content operations, agentic tool execution, and other domains where model output must not silently become permission.

## Diligence entry points

| Question | Evidence |
|---|---|
| What is authoritative? | `src/authority/authorityProxy.ts`, canonical semantic contract |
| What prevents replay? | `scripts/conformance-vectors.ts`, `scripts/authority-boundary-adversarial-check.ts` |
| What prevents receipt forgery? | `src/authority/sqliteAuthorityStore.ts`, durable and adversarial checks |
| What protects the constitutional boundary? | `src/kernel/constitution.ts`, runtime constitution check |
| What is the threat model? | [`THREAT_MODEL_V1.md`](./THREAT_MODEL_V1.md) |
| What is reproducibly verified? | `npm run verify`, `npm run verify:boundary`, `npm run evidence:manifest` |
| What remains open? | The limitations sections in this brief and the threat model |

## Recommended diligence sequence

A reviewer should begin with the five-minute verification sequence, inspect the threat model, run the adversarial boundary check, review the evidence manifest, and then evaluate the 20 supporting repositories through their adoption pull requests. The sequence intentionally makes limitations visible before making acquisition claims.
