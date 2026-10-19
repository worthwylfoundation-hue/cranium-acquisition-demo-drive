# Convertible Cranium Acquisition Technical Brief
## Executive technical position
Convertible Cranium provides a governance architecture that separates probabilistic cognitive proposal from deterministic authority over consequential state transitions.
Locked thesis:
**Models may propose cognition. Only Cranium determines whether cognition acquires authority.**

## Verified engineering anchor
Repository: `cranium-kernel`
Commit: `60c663cc313ffdc3c7f160ca68939cd4c169967f`
The repository validation loop passed at this revision. Targeted denial semantics passed for V-006 quarantine, V-007 replay blocking, and V-008 evidence-tamper blocking.

## What is directly inspectable
The Kernel authority store uses SQLite with WAL mode, `synchronous=FULL`, and foreign-key enforcement. Its physical schema contains `authority_state` and `authority_journal`.
The journal persists transaction identity, request data, transition data, resulting state hash, prior-frame linkage, and frame hash.
The store validates sequence continuity, hash linkage, frame hashes, state sequence, and final state hash.
Receipt verification binds transaction identity, request hash, journal sequence, state hash, and decision.

## Behavioral evidence
V-006 isolates contradictory cognitive state.
V-007 blocks conflicting idempotency reuse and avoids a second journal commit for exact replay.
V-008 rejects forged receipt/evidence data and detects direct journal-frame tampering.

## System-level architecture
Synapse, Miracle Memory, Session Circuit Breaker, Convertible Cranium Commander AI, and Convertible Cranium AI form the surrounding architecture. Their responsibilities should be evaluated from their own source revisions during broader diligence rather than inferred solely from the Kernel verification.

## Buyer diligence path
Start with `ACQUISITION_PACKAGE.md`, then reproduce the full suite and targeted denial semantics. Use Appendix C for the physical data-layer map and the commercial inventory for asset decomposition.

## Evidence boundary
This brief intentionally distinguishes verified implementation from logical architecture. It makes no claim of revenue, customers, deployment scale, encrypted SQLite, whole-system air-gapping, or benchmark superiority.
