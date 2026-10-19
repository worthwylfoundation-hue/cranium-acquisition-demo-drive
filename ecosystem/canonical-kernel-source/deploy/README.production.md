# Enterprise production deployment

`compose.enterprise.yml` is a local integration fixture. It intentionally runs PostgreSQL and Redis as local plaintext services so the repository's smoke tests can run without managed infrastructure. It is **not** a production deployment profile.

Use `compose.production.yml` only with managed services and externally supplied credentials. Before starting it, provide:

- `DATABASE_URL` using PostgreSQL `sslmode=verify-full` and `CRANIUM_DB_SSL_CA_FILE` pointing to the managed CA bundle mounted as the `postgres_ca` secret.
- `REDIS_URL` using `rediss://`. Plain `redis://` is rejected when `NODE_ENV=production`.
- `CRANIUM_TRUSTED_PROXY_CIDRS` containing only the ingress proxy networks that are authorized to set `X-Forwarded-For`.
- OIDC issuer, audience, and JWKS URI values for the production identity provider.
- Bounded rate-limit values appropriate for the gateway capacity.

The gateway rejects missing required values. In production, `CRANIUM_DB_SSL=true`, `sslmode=verify-full`, and a readable CA secret are mandatory. The PostgreSQL client sets `rejectUnauthorized=true` and uses the mounted CA bundle. Redis TLS configuration must be supplied by the `rediss://` URL and managed service policy; plaintext Redis is fail-closed.

Production sign-off still requires controls outside this compose file: HSM/KMS or approved key custody, signing-key rotation and revocation, backup/restore drills, monitoring and alerting, log retention, incident response, rollback, multi-replica distributed rate limiting, and independent security review.
