# Security Scope — Current Cranium Enterprise Boundary

**System under review:** Convertible Cranium authority and governance substrate, including the Kernel authority boundary, Synapse admission/assessment boundary, durable authority store, distributed session authority, session circuit breaker, and enterprise integration surface.

## Security objectives

Preserve the integrity of authority decisions, execution admission, provenance, durable state, receipts, and session ownership. Unauthorized, malformed, stale, replayed, or integrity-violating transitions should fail closed at the applicable boundary.

## In-scope components

- Canonical authority request and command-law enforcement.
- Synapse assessment and receipt binding.
- Capability and identity authority checks.
- PostgreSQL durable authority state and journal integrity.
- Transactional state-concurrency protection and idempotency.
- Redis distributed session authority and fencing epochs.
- Session circuit breaker, cancellation, checkpoint verification, and rollback.
- OIDC/JWT enterprise authentication and tenant/scope enforcement.
- Enterprise API/gateway security boundary.

## Out of scope

- Customer-specific cloud architecture and network perimeter.
- Production key custody, HSM selection, and key rotation operations.
- Managed database/Redis service configuration.
- Disaster-recovery objectives and multi-region architecture.
- Legal ownership, licensing, regulatory certification, SOC 2, ISO 27001, or other third-party attestations.
- Model quality or general AI safety outside the explicit governance boundaries implemented here.

## Evidence standard

Current claims must be reproducible from source, tests, and the exact commit under review. Historical benchmark reports and frozen campaign artifacts are not part of the current evidence baseline.
