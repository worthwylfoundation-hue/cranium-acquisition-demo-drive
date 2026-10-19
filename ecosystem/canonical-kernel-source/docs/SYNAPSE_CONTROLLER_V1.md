# Synapse Controller v1 (Phase 3)

## Boundary

> Cognition and intervention *selection* may come from Synapse.
> Authority comes only through Convertible Cranium Core.

`SynapseController` is a **bounded observation / intervention control loop**. It scores risk axes, selects a mode within an issued budget, and emits attestation inputs. It does **not** grant authority, commit receipts, or execute external actions.

## Modes

| Mode | Attestation intervention | Typical disposition |
|------|--------------------------|---------------------|
| OBSERVE | NONE | ALLOW |
| SOFT_STEER | STEER | ALLOW / RESTRICT |
| CONSTRAIN | RESTRICT | RESTRICT |
| ABSTAIN | ABSTAIN | BLOCK |
| ESCALATE | ESCALATE | ESCALATE |

## Fail-closed behaviors

- Intervention budget exhausted → ABSTAIN (or ESCALATE if ABSTAIN not allowed)
- Observation layer outside budget → ABSTAIN
- Empty budget → construction error

## Verification

```bash
npm run verify:synapse-controller
```

## Non-claims

- **Not** a full transformer-level activation / representation-steering runtime
- **Not** weight mutation or hidden-state patching
- **Not** Core authorization
- Production deployment still requires model-native hooks (if desired) *behind* this policy loop, plus HSM/KMS for signing keys
