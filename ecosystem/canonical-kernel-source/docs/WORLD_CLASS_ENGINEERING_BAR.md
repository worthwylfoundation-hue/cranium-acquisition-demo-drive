# Cranium World-Class Engineering Bar

## Purpose

This document defines the standard Cranium must meet before describing itself as world-class governance infrastructure. It is an engineering bar, not a marketing claim. Every capability must be backed by executable verification, operational evidence, and an explicit limitation statement.

> **Cognition may come from anywhere. Authority comes only through Cranium.**

## Non-negotiable invariants

| Invariant | Required property | Current evidence | World-class gap |
|---|---|---|---|
| Singular authority | Only Core can grant authority, mutate canonical state, and issue receipts | Kernel proxy, reducer, constitutional checks | Production deployment and independent review |
| Bounded cognition | Providers and Synapse emit evidence or proposals, never permission | Synapse contract and adapters | More provider adversarial testing |
| Fail closed | Missing, malformed, stale, conflicting, or unavailable evidence cannot silently become authority | Conformance vectors and boundary checks | Fault injection across distributed deployments |
| Durable truth | A granted transition and its receipt survive restart and crash recovery | SQLite journal and atomic recovery checks | Durable action-consumption state and multi-node semantics |
| No replay | Exact replay is idempotent; conflicting reuse is denied | Replay guard, conformance vectors, adversarial checks | Distributed race and partition testing |
| Evidence binding | Request, action, policy, identity, authority version, attestation, and receipt remain cryptographically linked | SHA-256 and Ed25519 test paths | Production key custody, rotation, and revocation |
| Exact execution | A tool executes only the exact action authorized by a fresh, in-scope receipt, once | `CraniumCoreTransactionGate` prototype | Durable reserve/execute/commit protocol |
| Governed memory | Memory records consent, provenance, tier, retention, promotion, quarantine, review, and deletion state | Miracle Memory integration check and integrity model | Durable multi-tenant retention, revocation, deletion proof, and Core-bound promotion |
| Human sovereignty | Consequential actions support explicit approval and stop conditions | Constitutional contract and escalation path | Productized approval workflow and audit exports |
| Honest disclosure | Claims identify revision, command, result, and limitation | Evidence records and manifests | Independent reproduction and public scorecard |

## Maturity gates

### Gate 1 — Executable contract

The contract is represented in types, validators, reducers, tests, conformance vectors, and release gates. No feature may bypass the canonical authority path for convenience.

### Gate 2 — Adversarial correctness

Every security-relevant invariant has a negative test. Tests include mutation, replay, race, stale-state, identity-substitution, malformed-input, partial-write, restart, and dependency-failure cases.

### Gate 3 — Durable operation

Authority, receipts, replay reservations, consumed-action state, key metadata, and audit records use transactional durable storage. Crash recovery is tested at every commit boundary. Multi-instance behavior is defined rather than assumed.

### Gate 4 — Cryptographic operations

Production identity has authenticated key custody, role separation, rotation, revocation, trusted distribution, clock policy, algorithm agility, and incident response. Test keys are never presented as production identity.

### Gate 5 — Independent challenge

An external reviewer can reproduce the checks from a clean checkout, attack the system within a published scope, inspect known limitations, and report failures without relying on the author’s interpretation.

### Gate 6 — Demonstrated value

At least one real workflow shows that Cranium prevents an unauthorized or unsafe action while preserving useful cognition and producing a durable, inspectable decision record.

## Current claim boundary

Cranium currently meets much of Gate 1 and meaningful portions of Gate 2. It has not yet met Gates 3–6 in full. In particular, the controlled action gateway documents an in-memory prototype store; production action execution must replace it with durable transactional reservation and recovery before the system claims production-grade governed execution.

## Engineering doctrine

Cranium should be memorable because it is difficult to fool, easy to inspect, honest about uncertainty, and useful under pressure. New features must strengthen the authority boundary, evidence model, recovery behavior, or operator experience. Features that only increase surface area without increasing governed capability are not progress.

## Immediate sequence

1. Replace in-memory action receipt consumption with a durable transactional store.
2. Promote Miracle Memory to a first-class governed service with consent, retention, deletion, and tenant isolation guarantees.
3. Add signed, rotated, revocable production identity and trusted-key distribution.
4. Add property-based and fault-injection tests around every commit boundary.
5. Expose memory intake, proposal, attestation, decision, approval, receipt, execution, and verification as one operator workflow.
6. Publish a reproducible security scorecard and invite independent attack.
