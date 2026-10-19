# Canonical Kernel: revision and access reconciliation

**Report date:** 2026-10-18
**Canonical repository:** `worthwylfoundation-hue/cranium-kernel` (private)
**Canonical URL:** https://github.com/worthwylfoundation-hue/cranium-kernel

## Verified implementation revision

| Evidence | Result |
|---|---|
| Verified implementation SHA | `2d0c6928ed5efb75a22a602f43516d22e9fbf610` |
| PR | [#55: reject denied execution receipts and bind receipt context](https://github.com/worthwylfoundation-hue/cranium-kernel/pull/55), merged |
| Hosted checks on PR #55 head | CodeQL, Android, TypeScript, and Enterprise Integration Evidence all passed |
| Clean-clone reproduction | `npm ci --legacy-peer-deps`; `npm run verify`; `npm run verify:denial-semantics`; exit 0 at exact SHA |
| Package audit | 0 vulnerabilities reported across 71 audited packages |
| Production-readiness static checks | 33 passed, zero failures, two documented local-Compose TLS warnings |
| Acquisition stress suite | 14 passed, zero failed, zero not-executed |
| Final worktree | Clean |

The pin metadata in this documentation-only update is stamped to the verified implementation SHA above. A documentation-only commit may follow it; do not mistake a later documentation tip for a newly verified implementation revision.

## Dependency PR resolution

- PR #56 merged: React `19.3.1`.
- PR #57 closed as superseded because it conflicted with #56's lockfile changes.
- PR #58 merged with React and React DOM aligned at `19.3.1`; CodeQL, Android, TypeScript, and enterprise-integration checks passed.

## Outstanding release gates

1. Refresh the Commander and both boot-drive Kernel pins and verify their embedded snapshots against the recorded source commit.
2. Enforce private-repository branch protection. The current GitHub plan returns HTTP 403 for branch-protection APIs and requires GitHub Pro for private repositories. Until this is resolved, successful PR checks are evidence of execution, not proof that GitHub enforced them as merge requirements.
3. Complete production TLS configuration and live PostgreSQL/Redis, backup/restore, multi-node, disaster-recovery, HSM/KMS, and independent security-audit evidence.

## Non-claims

The verified stamp is not an independent security audit, formal verification, production certification, verified-boot proof, HSM/KMS deployment, or evidence of customers, revenue, or commercial traction.
