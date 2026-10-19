# Cranium Authority Denial Semantics v1

**Status:** Verification contract
**Canonical authority:** `cranium-kernel`
**Vectors:** V-006 through V-008

This document records the behavioral semantics used to verify the authority boundary. It describes implemented behavior and intentionally avoids presenting hypothetical interfaces as deployed code.

## V-006: Contradiction Isolation / Quarantine

A contradictory cognitive artifact is non-authoritative. The implemented `CognitiveSubconsciousController` can move the artifact into `QUARANTINED` state and retains contradiction references. A quarantined artifact is terminal for the cognitive controller and cannot advance to `READY_FOR_AUTHORITY` or produce an authorization request.

The tested invariant is:

```text
ContradictionDetected
    => QUARANTINED
    => not READY_FOR_AUTHORITY
    => no AuthorityRequestV1 preparation
    => no authoritative mutation
```

This vector establishes the isolation boundary. It does not claim that quarantine itself is a Kernel authorization decision.

## V-007: Replay Resistance

The canonical authority path binds an idempotency key to the canonical request hash. An exact replay resolves to the previously committed transition and receipt rather than creating a second authoritative transition. Reuse of the same idempotency key with a different canonical request hash produces `ConflictingReuse`, adds `REPLAY_CONFLICT` to the boundary assessment, and results in a denied transition.

The tested invariant is:

```text
ExactReplay
    => Existing
    => same transition / receipt
    => no second journal commit

ConflictingReuse
    => REPLAY_CONFLICT
    => Denied
    => no second authoritative state transition
```

## V-008: Evidence / Receipt Integrity

The canonical receipt is tied to the durable authority journal and state evidence. Verification rejects mutations to the authority identifier, transaction identifier, request hash, state hash, or journal sequence. Direct journal frame-hash tampering causes durable-store initialization to fail with `AUTHORITY_JOURNAL_HASH_FAILURE`.

The tested invariant is:

```text
EvidenceValid = false
    => receipt verification fails
    => authoritative evidence cannot be accepted as valid
```

## Executable Verification

Run:

```bash
npm run verify:denial-semantics
```

The verification implementation is `scripts/authority-denial-semantics-check.ts`.

## Architectural Boundary

These vectors support the canonical Cranium rule:

> Models may propose cognition. Only Cranium determines whether cognition acquires authority.

They do not establish that every possible deployment is secure, nor do they substitute for deployment-specific security review. They establish the tested behavior of the implemented authority boundary.

## Offline Durable Boundary

The canonical durable authority path uses a local SQLite-backed authority store. The store validates its persisted authority journal during initialization and supports WAL-backed persistence. Quarantine remains outside the authoritative transition path: a quarantined cognitive artifact cannot be promoted by the cognitive controller into an authority-ready state.

For diligence, the repository's executable verification should be treated as the source of truth for the currently implemented offline behavior. Environment parameters should only be documented as deployment guarantees when they are backed by code, configuration, or tests in the repository.
