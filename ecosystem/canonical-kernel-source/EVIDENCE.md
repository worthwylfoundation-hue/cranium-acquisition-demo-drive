# Evidence — current engineering verification

These commands and their source paths define the current evidence surface. Historical campaign artifacts are intentionally excluded from the current product baseline.

## Core verification

```bash
npm ci
npm run lint
npm run build
npm run verify
```

## Enterprise verification

```bash
npm run verify:enterprise-integration
npm run verify:distributed-session
npm run verify:session-circuit-breaker
npm run verify:redis-session
npm run verify:production-readiness
```

The enterprise checks exercise authentication and tenant boundaries, durable authority, idempotency and state-concurrency controls, distributed session fencing, runtime circuit breaking, and deployment-readiness controls.

## Current evidence surfaces

- Canonical authority transition and command-law enforcement.
- Synapse assessment and receipt-boundary enforcement.
- Miracle Memory identity, contradiction, quarantine, recovery, and continuity.
- Post-decision proofing and remediation.
- Session circuit breaker with revocable execution lease and verified checkpoints.
- Distributed session authority with monotonically increasing fencing epochs.
- PostgreSQL durable authority state and hash-chained journal.
- Redis session authority backend.
- OIDC/JWT enterprise authentication boundary.
- Versioned enterprise API contract and gateway.
- Non-root production container and health/readiness surface.

## Evidence discipline

A test result proves the behavior exercised by that test under its stated environment. It does not establish third-party certification, universal security, or production suitability for an arbitrary deployment.

Performance figures are benchmarks with environment-dependent results and are shown only when their test conditions are documented.

If a claim is not reproducible from the current source and verification commands, it is not presented as current evidence.


## Evidence-maintenance gate (2026-10-06)

A check is one of: passed, failed, blocked, or unverified. Existence of a script or workflow is not execution. Exit 0 on a catalog printer is not a pass. Local `npm run verify` does not offset a failed GitHub Actions step. Deployment, certification, customers, revenue, HSM/KMS, production TLS, backup/restore, multi-node behavior, and disaster recovery require their own artifacts. See `docs/EVIDENCE_GAPS.md`.
