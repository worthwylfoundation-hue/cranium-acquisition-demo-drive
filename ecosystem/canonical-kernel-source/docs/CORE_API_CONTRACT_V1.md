# Convertible Cranium Core API Contract v1

**Status:** versioned implementation contract. **Version:** `1.0.0`. **Canonical repository:** `worthwyl2022-cloud/cranium-kernel`.

## Authority boundary

`KernelAuthorityProxy` is the only supported external write boundary. Callers submit an `AuthorityTransitionRequest`; Core loads canonical state, evaluates the request, reduces the transition, and commits it through a `DurableAuthorityStore`. Callers cannot supply a replacement state or reducer.

## Stable exports

The package entry point is `src/index.ts`. It exports the authority proxy and durable store, governance integration contracts, kernel request/transition types, canonical hashing, the reducer, replay guard, and initial-state factory. UI components and internal data fixtures are not public API.

## Durable lifecycle

A compliant durable store MUST provide atomic journal/state commit, a monotonically increasing journal sequence, hash-linked journal frames, state-hash continuity, receipt verification, and restart-safe replay binding. Reusing an idempotency key with the same canonical request MUST return the original transition and receipt; reusing it with a different request MUST be denied.

## Compatibility rule

Changes to exported names, request/transition fields, receipt fields, boundary violation codes, or persistence invariants require a new contract version and updated conformance vectors. The lifecycle matrix is a required CI gate.

## Current limitation

The SQLite implementation is a local durable reference store, not a distributed consensus or production key-management service. Operational backup, replication, key custody, rotation, revocation, and multi-writer deployment remain outside this v1 contract.
