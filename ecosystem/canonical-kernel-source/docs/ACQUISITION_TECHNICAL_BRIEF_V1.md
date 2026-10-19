# Convertible Cranium: acquisition technical brief

## Executive technical position

Convertible Cranium separates cognitive proposal from authority over consequential state transitions. Model output, tool intent, assessments, and user-interface state are not authority. The Cranium Kernel is the sole canonical grant/deny boundary and records accepted or denied transitions with verifiable receipts.

**Cognition may come from anywhere. Authority comes only through Cranium.**

## Verified engineering anchor

- Canonical repository: `https://github.com/worthwylfoundation-hue/cranium-kernel`
- Verified implementation stamp: `2d0c6928ed5efb75a22a602f43516d22e9fbf610`
- Clean-clone commands: `npm ci --legacy-peer-deps`, `npm run verify`, `npm run verify:denial-semantics`
- Result: exit 0 at the exact stamp; package audit reported zero vulnerabilities across 71 audited packages.
- Hosted PR #55 checks: CodeQL, Android, TypeScript, and Enterprise Integration Evidence all passed before the fix was squash-merged.
- Acquisition stress suite: all 14 cases executed and passed.

The full verifier reports 33 production-readiness static checks passing. It also reports two explicit local-Compose warnings: PostgreSQL TLS is disabled in the development profile, and local Redis is plaintext. Production must enable PostgreSQL TLS and use Redis TLS (`rediss://`) or equivalent private-network encryption.

## What is directly inspectable

The Kernel reference implementation includes canonical request hashing, namespace and boundary validation, replay handling, durable SQLite WAL state, journal hash-chain integrity, receipt verification, restart recovery, fail-closed evidence handling, and adversarial rejection of forged or denied receipts.

The conformance and stress suites test accepted and denied transitions, replay rejection, tampering, recovery, trust-chain behavior, and the boundary between cognitive proposals and authority. These are reproducible engineering checks, not a substitute for an independent security audit or production deployment testing.

## Enterprise integration path

Provider and model integrations can submit proposals and evidence through the supporting ingress layer. The Kernel remains the only authority issuer. The implementation includes enterprise-integration contract checks, tenant/subject boundary validation, transport-security checks, distributed-session fencing, and a shared Redis rate-limiter check. Production readiness still requires environment-specific identity, network, key-custody, database, Redis, observability, backup, restore, and incident-response validation.

## Buyer diligence sequence

1. Reproduce the clean-clone verification at the exact stamp in `KERNEL_PIN`.
2. Inspect `scripts/command-execution-gate-check.ts`, `scripts/authority-denial-semantics-check.ts`, and `scripts/conformance-vectors.ts`.
3. Review `docs/THREAT_MODEL_V1.md`, `docs/EVIDENCE_GAPS.md`, and `docs/KERNEL_REVISION_RECONCILIATION_2026-10-18.md`.
4. Confirm the source commit and provenance of the Commander and both boot-drive snapshots before relying on a bundled demonstration.

## Evidence boundary and non-claims

This brief does not claim independent security auditing, formal verification, HSM/KMS deployment, verified boot, encrypted SQLite, universal deployment readiness, customer adoption, revenue, commercial traction, or valuation. Live PostgreSQL/Redis, backup/restore, multi-node fencing, disaster recovery, external key custody, and a third-party security audit remain outstanding evidence gates.
