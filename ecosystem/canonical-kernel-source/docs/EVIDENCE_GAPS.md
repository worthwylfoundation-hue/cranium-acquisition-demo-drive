# Evidence gaps — not claims

Updated 2026-10-17.

These items are unverified or only partially verified. A plan is not evidence. Green CI is not a security certification.

## Closed or improved

| Area | Update |
|------|--------|
| Production TLS / `rediss://` fail-closed | PR #50 on main |
| Full verify stamp | `KERNEL_PIN` `VERIFIED_DILIGENCE_STAMP=0f125fc` (2026-10-17 Actions #248, exit 0) |
| Evidence manifest reproducibility | #41 merged |
| Production-boundary harness false positives | Kernel-scoped scan |
| Constitution `engine_proofs` log count | Fixed to report actual marker count (8) |
| Acquisition stress suite ASS-01..14 | All cases have bound commands; suite fails if any fail or not executed |
| Open PR noise on core stack | Cleared (2026-10-17 audit) |
| Justice OS / Liberty Kernel naming | Docs + pin product fields |

## Still open (honest non-claims / env-gated)

| Area | Prerequisite | Status |
|------|--------------|--------|
| Redis session backend | `REDIS_URL` | Env-gated |
| Postgres durable store live | `DATABASE_URL` | Env-gated |
| HSM/KMS custody | external store | **UNVERIFIED** non-claim |
| Backup/restore drill | live DB | **UNVERIFIED** |
| Multi-node fencing | two nodes | **UNVERIFIED** |
| Disaster recovery | failover drill | **UNVERIFIED** |
| Independent security audit | third party | **UNVERIFIED** |
| Verified boot / rootfs | measured boot | **UNVERIFIED** |
| UI-language cannot escalate | adversarial UI suite | **UNVERIFIED** |
| Architectural Listener | implementation | **Not in Kernel tree** |
| Dependency advisory residual | audit / upgrade | Check `npm audit` on tip |
| GitHub slug renames | Settings UI | Manual — see naming map |
| Commander pin on protected main | PR + checks | Protected branch |
| Customers / revenue | accounting | **Do not infer** |

Binder: `docs/ACQUISITION_BINDER_INDEX.md`  
Naming: `docs/REPOSITORY_NAMING_MAP_V1.md`
