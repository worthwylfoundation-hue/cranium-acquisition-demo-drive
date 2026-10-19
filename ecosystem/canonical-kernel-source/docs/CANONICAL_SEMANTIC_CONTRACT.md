# Canonical Semantic Contract

**Authority:** [`cranium-kernel`](https://github.com/worthwyl2022-cloud/cranium-kernel) only. **Version:** `1.0.0`.

This contract is the ecosystem source of truth for authority semantics. The machine-readable form is [`CANONICAL_SEMANTIC_CONTRACT.json`](./CANONICAL_SEMANTIC_CONTRACT.json). Supporting repositories may consume, validate, display, or document this contract; they must not fork its meaning or implement a competing authority boundary.

## Authority boundary

`cranium-kernel` is the sole authority evaluator, reducer, replay guard, canonical-state persistence boundary, journal writer, and canonical receipt issuer. External callers use `KernelAuthorityProxy`; they do not provide state or reducers. A canonical receipt must identify `cranium-kernel`, a transaction ID, journal sequence, and state hash, and must verify against the durable Kernel store.

## Evidence boundary

Synapse produces bounded attestation evidence. It does not grant authority, mutate canonical state, authorize tools, issue canonical receipts, or replace the Kernel evaluator. Supporting UIs, demos, workbenches, fixtures, local reducers, browser state, and model outputs are non-canonical.

## Transition semantics

An `AuthorityTransitionRequest` is canonically hashed with the Kernel encoder and SHA-256. Exact idempotent replay returns the committed transition; conflicting reuse is rejected. Only a boundary-passing evaluation may be reduced and durably committed. Stale, malformed, tampered, unverifiable, ambiguous, or non-durable operations fail closed.

## Evidence language

Use the labels precisely: **implemented and verified**, **implemented, not yet verified in CI**, **designed, not implemented**, **fixture**, **test-only**, and **placeholder**. A placeholder may not appear in authority-bearing data. Static reports, generated strings, random digests, screenshots, and UI labels are not execution proof.

## Conformance

The reference integration and verification corpus are maintained in [`scripts/synapse-integration-check.ts`](../scripts/synapse-integration-check.ts) and the Kernel verification commands. Platform adapters may differ in storage and UI, but authority semantics, request meaning, canonical hashing, replay behavior, receipt bindings, and fail-closed outcomes may not drift.
