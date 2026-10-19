# Convertible Cranium substrate — v1 Kernel

> **Cognition may come from anywhere. Authority comes only through Convertible Cranium.**

## Status

**Contract layer committed. First behavioral authority boundary implemented. Not yet a security proof.**

The repository now contains real behavior for:
- canonical request hashing (SHA-256)
- replay inspection (`New`, `Existing`, `ConflictingReuse`)
- boundary validation
- authority rule evaluation
- immutable state reduction for granted transitions
- governed adapter boundary (`GovernedKernelPort`) that cannot bypass the canonical evaluator or reducer
- deterministic transition identity and receipt timestamps derived from the request contract

This is enough to support real compile-time and test-time verification of the first authority-boundary properties.
It is not enough to claim correctness, security completeness, or novelty.

## Verification disclaimer

> A green CI run means only that the committed tests passed under the declared environment. It does not constitute proof of security, correctness, uniqueness, or absence of vulnerabilities.

## Acquisition-readiness evidence

The scoped threat model is documented in [`docs/THREAT_MODEL_V1.md`](./docs/THREAT_MODEL_V1.md), and the buyer-facing evidence map is in [`docs/ACQUISITION_READINESS_BRIEF.md`](./docs/ACQUISITION_READINESS_BRIEF.md). The reproducible checks include adversarial replay and receipt-tamper tests, constitutional runtime assertions, durable restart verification, and canonical conformance vectors. These artifacts state their limitations explicitly; they do not claim an independent security audit or production key-management certification.

## Governing invariant

> No authority increase may be committed unless it results from a unique, non-replayed
> `AuthorityTransitionRequest`; evaluated against the current committed state;
> passing all mandatory boundary checks; producing an explicit `GRANTED` transition;
> satisfying kernel invariants; and receipt-bound within the same atomic commit.

## Current source of truth

Right now, the source of truth is the committed code in this repository.
Any external design notes or frozen-contract documents must match the tree that actually exists on `main`.
If the code and a document disagree, the disagreement itself is a bug that must be fixed explicitly.

The external adoption target is documented in [`docs/CRANIUM_AUTHORITY_PROTOCOL_V1.md`](./docs/CRANIUM_AUTHORITY_PROTOCOL_V1.md).
It defines implementation-neutral objects, invariants, conformance levels, and the minimum integration sequence
for independent adopters without making the client UI or model provider part of the protocol.

## Authority Denial Semantics & Buyer Verification

Cranium's authority boundary is verified behaviorally, not inferred from interface naming. The canonical verification suite covers contradiction isolation, replay resistance, and authority-evidence integrity in addition to the broader Kernel verification suite.

### Reproduce V-006 through V-008

```bash
npm run verify:denial-semantics
```

The suite verifies:

- **V-006: Contradiction isolation** — contradictory cognitive artifacts enter non-authoritative `QUARANTINED` state and cannot advance into authority preparation.
- **V-007: Replay resistance** — an exact replay resolves to the existing authoritative transition; conflicting reuse of an idempotency key is denied with `REPLAY_CONFLICT` and cannot create a second journal commit.
- **V-008: Evidence integrity** — tampered receipt fields fail verification, while durable authority-journal frame tampering fails store integrity validation.

The executable verification is located at `scripts/authority-denial-semantics-check.ts`; the normative verification contract is documented in `docs/AUTHORITY_DENIAL_SEMANTICS_V1.md`.

The implementation was introduced in commit `f2d6ea37813b8fa083fe2ec60ee2a1f8a585176f`.

### Full verification

```bash
npm run verify
```

The full suite remains the primary reproducibility path for technical diligence. The denial-semantics suite is a focused supplement and does not replace the complete verification contract.

### Offline authority boundary

The durable authority path supports a local SQLite-backed store with WAL-backed persistence and journal integrity validation. Cognitive quarantine remains non-authoritative. Authority-bearing transitions are committed through the canonical Kernel path rather than through the cognitive layer.

Offline deployment parameters and exact storage/runtime behavior are documented separately only where they correspond to implemented configuration and verified behavior.

> **Architectural rule:** Models may propose cognition. Only Cranium determines whether cognition acquires authority.

## Architecture boundary

The repository has one authority issuer: `DefaultAuthorityTransitionEngine`, committed through
`KernelStateReducer`. `GovernedKernelPort` is an integration substrate, not a second kernel. It
accepts proposal context, delegates evaluation to the canonical engine, and refuses to commit a
failed boundary assessment. See [`GOVERNANCE_BOUNDARY.md`](./GOVERNANCE_BOUNDARY.md).

## Package structure

```
src/
├── kernel/       authority types, canonical encoder, boundary validator,
│                 transition engine, replay guard, reducer, and stress suite
├── governance/   GovernedKernelPort integration boundary; delegates to kernel only
├── components/   review and verification UI surfaces
└── data/         explicitly labeled receipt and benchmark artifacts
```

## System architecture

Convertible Cranium is a governed intelligence substrate composed of two independent but integrated
layers:

1. **Convertible Cranium Synapse** is the inference-native contract and evidence bridge for compatible AI
   runtimes. It carries policy-relevant model-state evidence, bounded intervention,
   abstention, and escalation signals into governed requests.
2. **Convertible Cranium Core** is the independent authority and state-governance kernel. It alone
   determines whether an output may acquire authority, mutate governed state, invoke a tool,
   or cause an external side effect.

Synapse may reduce the available action envelope or request escalation. It may never
grant, expand, or independently execute authority. **Synapse carries cognition. Core governs
action.**

`governance/SynapseRuntimeAdapter.ts` implements the first Synapse-to-Core vertical slice. A
Synapse attestation records model provenance, policy version, controller configuration, bounded
intervention, risk disposition, and a deterministic trace commitment. For protected actions,
the adapter fails closed when the attestation is missing, mismatched, or explicitly blocked.

The attestation is included in the canonical request hash, so changing inference evidence
changes the request identity. The adapter can admit valid evidence into `GovernedKernelPort`,
but it cannot grant authority or bypass the canonical evaluator and reducer. `npm run
verify:synapse` checks valid admission, hash binding, policy mismatch rejection, and fail-safe
blocking. `SynapseCoreTransaction.ts` additionally implements the Core-issued envelope →
Synapse attestation → Core authorization → chained receipt path, including expiry, request,
envelope, authority-version, tool-scope, and replay checks. This is an integration contract
and deterministic harness, not evidence that a production transformer-level inference
controller has already been implemented. The same transaction gate exposes a controlled
action execution boundary that requires a granted receipt, exact action hash, in-scope tool,
fresh receipt, intact receipt-chain membership, and single-use consumption.

The current implementation is **deterministically and cryptographically integrity-bound** by
canonical SHA-256 hashes and receipt chaining. It also includes an Ed25519 signing and
trusted-key verification path with role separation for Core, Synapse runtime, Gateway, and
human approver identities. Production key custody, rotation, revocation operations, and
durable trusted-key distribution remain future hardening work. See
[`docs/SYNAPSE_CORE_EVIDENCE.md`](./docs/SYNAPSE_CORE_EVIDENCE.md).

## Reproduce the current build

```bash
npm ci
npm run lint
npm run build
npm run verify:synapse
```

These commands verify TypeScript compilation and the production UI bundle. They do not claim
external security certification, independent reproduction, or production authority service
readiness.

## Immediate priorities

1. Keep CI boring and real: clean checkout, declared JDK, declared Gradle, real tests, real build.
2. Preserve every discovered failure as a permanent regression.
3. Expand adversarial coverage one attack at a time:
   - stale state
   - protected-lane escalation
   - identity substitution
   - evidence manipulation
   - replay ordering
   - compound attacks

## Verification Integrity Rule

Security-relevant verification mechanisms SHALL NOT be replaced by mocks, fakes,
or predetermined verdicts in v1 security tests.

Deterministic fixtures MAY control inputs and environmental dependencies.
They SHALL NOT bypass or simulate the verification mechanism under test.

## Contract change rule

The only valid reasons to change the contract surface:
- A validator or test failure proving the contract is wrong
- A code-document mismatch
- A formal version increment + Architecture Decision Record
- An explicit diligence or compliance requirement

Implementation convenience is not on that list.
