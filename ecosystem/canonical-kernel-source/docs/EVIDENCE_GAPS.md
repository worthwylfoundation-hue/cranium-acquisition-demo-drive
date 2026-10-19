# Evidence gaps and non-claims

**Updated:** 2026-10-18
**Verified implementation stamp:** `2d0c6928ed5efb75a22a602f43516d22e9fbf610`

A plan is not evidence. Green CI is not a security certification. The current stamp passed a fresh clean-clone `npm ci --legacy-peer-deps`, `npm run verify`, and `npm run verify:denial-semantics`; the acquisition stress suite executed all 14 cases with zero failures. Hosted CodeQL, Android, TypeScript, and enterprise-integration checks passed on the PR #55 code before its squash merge.

## Closed or improved

| Area | Evidence |
|---|---|
| Denied receipt cannot execute | PR #55 merged as `2d0c692`; execution-gate and denial-semantics checks pass |
| Full verification | Exact clean-clone stamp in `KERNEL_PIN`; full `npm run verify` exit 0 |
| Dependency alignment | React and React DOM both `19.3.1`; PR #56 and combined PR #58 merged |
| Acquisition stress suite | 14 cases executed, 14 passed, zero failed, zero skipped |
| Transport security and distributed rate limiting | Local verification checks pass; production configuration still required |
| Production-readiness static checks | 33 checks pass; two local-Compose TLS warnings remain explicitly documented |

## Still open

| Area | Status / required evidence |
|---|---|
| Private repository branch protection | **Not enforced.** GitHub's branch-protection API returns HTTP 403 and says GitHub Pro is required for private repositories. CI runs on PRs, but required-check enforcement is not guaranteed under the current plan. |
| Downstream source pins | Refresh Commander, Commercial Boot Drive, and Acquisition Demo Drive after this verified stamp; verify each bundled snapshot against its recorded source commit. |
| PostgreSQL and Redis live-service deployment | Environment-gated. Production must use verified PostgreSQL TLS and Redis TLS (`rediss://`) or equivalent private-network encryption. Local Compose intentionally remains a development profile. |
| HSM/KMS key custody | **UNVERIFIED**; external managed custody and operational evidence required |
| Backup / restore and disaster recovery | **UNVERIFIED**; live restore and failover drills required |
| Multi-node fencing and concurrency | **UNVERIFIED** in a real multi-node deployment |
| Independent security audit | **NOT PERFORMED** |
| Verified boot / measured root filesystem | **UNVERIFIED** |
| UI-language and presentation cannot escalate authority | Requires a dedicated adversarial UI-to-Kernel test suite |
| Architectural Listener | Not implemented in the Kernel tree |
| Customers, revenue, and traction | No evidence supplied; do not infer or claim them |

## Buyer-facing boundary

The Kernel demonstrates a tested reference authority boundary. This evidence does **not** establish independent security certification, production deployment readiness for every environment, HSM/KMS deployment, verified boot, customer adoption, revenue, or commercial valuation.

See `docs/ACQUISITION_BINDER_INDEX.md`, `docs/THREAT_MODEL_V1.md`, and `KERNEL_PIN` for the evidence map and exact revision.
