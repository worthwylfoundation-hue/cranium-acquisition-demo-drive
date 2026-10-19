# Independent Reproduction Guide

## Objective

This package lets a buyer or independent reviewer reproduce the current Cranium authority, governance, and enterprise-integration evidence from a clean checkout.

## Core verification

From `cranium-kernel`:

```bash
npm ci
npm run verify
```

## Enterprise verification

Enterprise persistence and distributed-session checks require PostgreSQL and Redis services:

```bash
npm run verify:enterprise-integration
npm run verify:distributed-session
npm run verify:session-circuit-breaker
npm run verify:redis-session
npm run verify:production-readiness
```

For an integration environment, `deploy/compose.enterprise.yml` supplies PostgreSQL and Redis. Production deployments require environment-specific TLS, identity-provider configuration, secret management, managed-service controls, backup/recovery, observability, and operational ownership.

## Acceptance standard

The current baseline should report zero failures for the applicable verification command. Record the exact commit SHA, runtime versions, dependency lockfile state, environment configuration, and complete terminal output for independent review.

## Scope

The repository evidence covers the implemented authority and governance boundaries, enterprise authentication and tenant scoping, durable state integrity, concurrency/idempotency controls, distributed session fencing, and runtime containment.

It is an engineering reproduction package, not a third-party security certification. Production deployment and formal certifications remain deployment- and auditor-specific.
