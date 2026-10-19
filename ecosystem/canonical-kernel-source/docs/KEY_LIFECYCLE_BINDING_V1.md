# Key Lifecycle Binding v1 (Phase 2)

## Rule

Custody without artifact binding is theater. Phase 2 binds keys into the governed path:

1. **Synapse attestations** — signed by `SYNAPSE_RUNTIME` over `attestationHash`
2. **Core receipts** — signed by `CORE` over `receiptHash` when a Core signer is injected
3. **Execute** — when configured, refuses receipts without a valid CORE signature

## Injection

```ts
const gate = new CraniumCoreTransactionGate(registry, {
  coreSigner: { sign: (subject, payload) => keyManager.sign(subject, payload) },
  requireCoreSignatureOnExecute: true,
});
```

Or raw keys via `rawKeyAsSigner` / `sealSynapseAttestation` in `ArtifactLifecycle.ts`.

## Verification

```bash
npm run verify:keys-bound
```

## Non-claims

- Does not implement HSM/KMS
- Private keys remain process-memory (or external injector)
- Legacy gates without `coreSigner` remain compatible and do not require CORE signatures on execute
