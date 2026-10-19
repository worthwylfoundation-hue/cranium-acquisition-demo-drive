# Attorney diligence snapshot — 2026-10-15

**Purpose:** One-page honest state for counsel. Not a security certification. Not a valuation.
**Updated:** after Kernel PR #50 merge (`c397c63`).

## Product separation (commercial)

| Package | What it is | Authority? |
|---------|------------|------------|
| **Convertible Cranium Justice OS / Commander AI** | Product and operator/UI surface (`convertible-cranium-commander`) | **No** — propose/display only |
| **Cranium Kernel** | Sole canonical authority (`cranium-kernel`) | **Yes** — grant/deny, journal, receipt |

**Normative rule:** Cognition may come from anywhere. Authority comes only through Cranium Kernel.

OS-only discussions should use the live package boundary on Commander, not archived Ultra.

## Kernel tip honesty

| Field | Value |
|-------|--------|
| Repo | https://github.com/worthwyl2022-cloud/cranium-kernel |
| Branch | `main` |
| See | `KERNEL_PIN` on `main` for exact tip SHA |
| Transport merge | PR #50 → `c397c63` (CI: typescript, android, CodeQL, live-services success) |
| Last **independent full** clean-clone verify stamp | `e36bdba` (2026-09-30) |
| Current tip re-stamped? | **No** — re-run `npm ci && npm run verify && npm run verify:denial-semantics` before calling current tip verified |

## What is implemented on Kernel (high level)

- Canonical request hashing, replay/idempotency, durable authority journal paths
- Key lifecycle APIs, Synapse evidence admission (non-granting), denial-semantics checks
- Enterprise gateway: OIDC, trusted-proxy rate limiting
- **On main after #50:** production fail-closed TLS (`sslmode=verify-full` + CA), `rediss://` required, distributed Redis rate limiter in production
- HSM/KMS still external non-claim

## Explicit non-claims

- Not an independent security audit or certification
- Not HSM/KMS production custody
- Not verified boot / rootfs integrity proof
- Not multi-region HA proof
- Not “current main fully verified” without a fresh clean-clone stamp
- Licensing the Justice OS surface alone does not automatically transfer Kernel IP

## Open engineering items (do not hide)

| Item | Status |
|------|--------|
| PR #50 encrypted transport | **Merged** `c397c63` |
| Full verify re-stamp on post-#50 tip | Pending founder clean-clone |
| PR #41 evidence manifest | Stale — close / reopen from fresh branch |
| PR #36 production-boundary scope | Conflicted — close; Kernel-scope fix already on main |
| Acquisition PR #18 Metabolic Memory | Merge conflict; large |
| AI PR #27 release receipts as PROPOSED | Merge conflict; intent correct |
| Local uncommitted worktrees | Do not discard blindly |

## Suggested counsel questions

1. Entity / LLC reinstatement vs individual ownership of GitHub IP  
2. Written assignment of Kernel + Commander into the right entity  
3. Schedule A (OS only) vs Schedule B (Kernel retained) language  
4. What may be shared pre-money (this snapshot + boundary docs only is safest)

## Contact / author

Sole engineering author narrative: Wyl Mathes · GitHub `worthwyl2022-cloud` / related public binder `worthwylmedia-lang`.
