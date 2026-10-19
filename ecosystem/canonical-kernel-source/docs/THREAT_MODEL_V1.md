# Cranium Kernel Threat Model v1

**Status:** Implemented boundary model; independent security audit not yet completed.
**Authority source:** `cranium-kernel`
**Constitution:** `CRANIUM_CONSTITUTION_V1.md`, version `1.0.0`

> **Cognition may come from anywhere. Authority comes only through Cranium.**

## Security objective

The Kernel must prevent an untrusted cognitive source, adapter, user interface, transport, cache, or local process from independently creating durable canonical authority. Authority becomes durable only after the Kernel evaluates a request against the constitutional boundary, reduces the transition, commits canonical state, and binds a receipt to the resulting journal position and state hash.

## Trust boundaries

| Boundary | Trusted responsibility | Required failure behavior |
|---|---|---|
| Cognitive provider to adapter | Produce proposals or evidence | Treat output as non-authoritative input |
| Adapter to Kernel proxy | Submit a typed transition request | Reject malformed, stale, unavailable, or conflicting evidence |
| Kernel evaluator to reducer | Evaluate and reduce a boundary-passing transition | Do not reduce denied or constitutionally invalid transitions |
| Reducer to durable store | Commit state and journal atomically | Roll back on write failure |
| Durable store to receipt verifier | Reconstruct and verify canonical bindings | Reject forged, stale, tampered, or mismatched receipts |

## Threats and controls

| Threat | Control | Evidence |
|---|---|---|
| Provider claims authority directly | `CANONICAL_AUTHORITY` is fixed to `cranium-kernel`; supporting adapters are bounded | Semantic contract and proxy implementation |
| Exact replay creates a second effect | Replay guard returns the existing transition | Conformance and adversarial checks |
| Conflicting idempotency reuse is accepted | Conflicting request hashes produce a denied transition | Adversarial check |
| Receipt fields are forged | Receipt verification recomputes request hash, signature, transaction, decision, and state hash | Durable and adversarial checks |
| Journal frame is tampered | Hash chain integrity is checked before load or verification | Durable and adversarial checks |
| Evidence is stale or unavailable | Boundary validator fails closed | Conformance vectors |
| Canonical state is lost on restart | SQLite WAL store reloads state and verifies the receipt | Durable check and conformance vectors |
| Constitutional state is altered | Runtime constitution assertion rejects altered or duplicated principles | Runtime constitution check |
| Documentation overstates evidence | Evidence labels, limitations, and manifest are required in the diligence package | Constitution and manifest |

## Out of scope for this version

This document does not claim production key custody, key rotation, key revocation, remote trusted-key distribution, a third-party security audit, a formally verified implementation, or deployment hardening for every hosting environment. Those are explicit follow-up diligence items rather than implied capabilities.

## Verification commands

```bash
npm ci
npm run verify:constitution
npm run verify:constitution-runtime
npm run verify:conformance
npm run verify:durable
npm run verify:boundary
npm run evidence:manifest
```
