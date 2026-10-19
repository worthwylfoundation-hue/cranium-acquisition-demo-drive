# Key Custody V1
## Purpose
Cranium key custody establishes lifecycle control for signing identities used by the governance substrate.
The custody layer manages identity state. It does not grant authority; Cranium Kernel remains the authority boundary.

## Managed roles
- CORE
- SYNAPSE_RUNTIME
- GATEWAY
- HUMAN_APPROVER

## Lifecycle
A key is ACTIVE when it may sign and verify within its validity window.
A rotated predecessor becomes GRACE. GRACE keys may verify during the configured grace window but cannot sign.
A REVOKED key is fail-closed for both signing and verification.

## Register
register() generates an Ed25519 key pair, publishes only the public key to the trusted registry, and retains the private CryptoKey in process memory.
Duplicate key IDs are rejected.

## Rotate
rotate() creates a new key for the predecessor's role, makes the new key ACTIVE, and moves the predecessor to GRACE with an explicit expiration.
The rotation event is recorded in the audit chain.

## Revoke
revoke() marks the key REVOKED, removes its private key from process memory, and updates the public trust registry.
Subsequent signing attempts fail closed.

## Verification
verify() delegates signature verification to the existing TrustedKeyRegistry, preserving role, validity-window, revocation, and Ed25519 checks.
## Public registry and audit durability
The KeyManager persists a PublicKeyRegistrySnapshot through the injected KeyCustodyStore.
The snapshot contains public key metadata and the hash-chained audit log only.
No private-key material is part of the persisted schema.

MemoryKeyCustodyStore exists for deterministic tests. A production deployment must supply a durable implementation backed by its approved storage boundary.
The private-key custody boundary remains deployment-specific, such as an HSM/KMS or another approved secret-management system.

## Audit chain
Each lifecycle event contains:
- monotonically increasing sequence
- event type
- key identity and role
- timestamp
- previous event hash
- event hash

Initialization rejects broken sequence or linkage. This provides tamper evidence for the lifecycle log, not an independent external timestamp or immutable ledger.

## Security boundaries
KeyManager is not an HSM.
It does not claim hardware-backed private-key protection.
It does not serialize or recover private keys.
A process restart therefore loses in-memory private keys unless the deployment supplies an external signing/custody adapter.
## Required production integration
Before acquisition-grade deployment:
1. Wire Core receipt signing through KeyManager.
2. Wire Synapse attestation signing through KeyManager.
3. Provide the deployment-approved durable public registry store.
4. Provide HSM/KMS-backed signing where hardware or managed secret custody is required.
5. Add integration tests proving revoked and rotated identities cannot produce newly accepted governed artifacts.

## Verification command
Run:

    npm run verify:keys

The command covers duplicate registration, rotation/grace semantics, fail-closed revocation, validation, audit-chain tamper detection, public registry reload, and the absence of private-key recovery across a new KeyManager instance.

## Non-claims
Passing these tests does not prove HSM/KMS configuration, operating-system memory isolation, production secret-management policy, key backup policy, or external durability.
Those controls belong to the deployment boundary and must be evidenced independently.
