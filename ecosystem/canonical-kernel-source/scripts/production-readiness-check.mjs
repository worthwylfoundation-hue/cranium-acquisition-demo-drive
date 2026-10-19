import { readFile } from 'node:fs/promises';

const failures = [];
const warnings = [];
const must = (ok, message) => { if (!ok) failures.push(message); };
const text = async (path) => readFile(path, 'utf8');

const pkg = JSON.parse(await text('package.json'));
must(pkg.engines?.node === '>=24.0.0 <25.0.0', 'Node runtime must be pinned to the supported 24.x major range');
must(Boolean(pkg.scripts?.lint && pkg.scripts?.build && pkg.scripts?.verify), 'canonical validation scripts are required');

const workflow = await text('.github/workflows/enterprise-integration.yml');
must(workflow.includes('actions/checkout@v7'), 'enterprise CI must use current checkout action');
must(workflow.includes('actions/setup-node@v7'), 'enterprise CI must use current setup-node action');
must(workflow.includes('postgres:18'), 'enterprise CI must exercise PostgreSQL 18');
must(workflow.includes('redis:8'), 'enterprise CI must exercise Redis 8');

const docker = await text('deploy/Dockerfile.enterprise');
must(docker.includes('USER cranium'), 'enterprise image must run as non-root');
must(docker.includes('NODE_ENV=production'), 'enterprise image must set production mode');

const compose = await text('deploy/compose.enterprise.yml');
must(compose.includes('POSTGRES_PASSWORD:?set POSTGRES_PASSWORD'), 'database password must be supplied externally');
must(compose.includes('condition: service_healthy'), 'gateway must wait for healthy persistence services');
if (compose.includes('CRANIUM_DB_SSL: "false"')) warnings.push('local compose disables PostgreSQL TLS; production deployments must set CRANIUM_DB_SSL=true with managed/private TLS');
if (compose.includes('redis:6379')) warnings.push('local compose Redis endpoint is plaintext; production deployments must use rediss:// or private-network encryption');

const productionCompose = await text('deploy/compose.production.yml');
must(productionCompose.includes('CRANIUM_DB_SSL: "true"'), 'production compose must require PostgreSQL TLS verification');
must(productionCompose.includes('CRANIUM_DB_SSL_CA_FILE: /run/secrets/postgres_ca'), 'production compose must mount a managed PostgreSQL CA bundle');
must(productionCompose.includes('file: ${CRANIUM_DB_SSL_CA_FILE:?set CRANIUM_DB_SSL_CA_FILE'), 'production compose must require an external PostgreSQL CA bundle');
must(productionCompose.includes('REDIS_URL: ${REDIS_URL:?set REDIS_URL as rediss://}'), 'production compose must require an externally supplied encrypted Redis URL');
must(productionCompose.includes('CRANIUM_TRUSTED_PROXY_CIDRS: ${CRANIUM_TRUSTED_PROXY_CIDRS:?set CRANIUM_TRUSTED_PROXY_CIDRS}'), 'production compose must require an explicit trusted-proxy boundary');

const gateway = await text('scripts/enterprise-gateway.ts');
const auth = await text('src/integration/enterpriseAuthentication.ts');
must(auth.includes('cranium:authority:request'), 'OIDC scope enforcement must remain enabled');
must(gateway.includes('securityHeaders'), 'gateway security headers must be enforced');
must(gateway.includes('RATE_LIMIT'), 'gateway rate limiting must be enforced');
must(gateway.includes('await redis.ping()'), 'gateway readiness must verify Redis connectivity');
must(gateway.includes('await pool.query(\'SELECT 1\')'), 'gateway readiness must verify PostgreSQL connectivity');
must(gateway.includes('validateProductionTransport'), 'gateway must fail closed on insecure production transport configuration');
must(gateway.includes('CRANIUM_DB_SSL_CA_FILE'), 'gateway must load the managed PostgreSQL CA bundle');
must(gateway.includes('createRedisRateLimiter'), 'gateway must use the distributed Redis limiter implementation');
must(gateway.includes("process.env.NODE_ENV === 'production'"), 'production gateway must select the distributed limiter');

const redisLimiter = await text('src/integration/redisRateLimiter.ts');
must(redisLimiter.includes("redis.call('INCR'"), 'distributed limiter must use an atomic Redis increment');
must(redisLimiter.includes("redis.call('PEXPIRE'"), 'distributed limiter must expire Redis buckets');
must(redisLimiter.includes('return false'), 'distributed limiter must fail closed on Redis errors');

const store = await text('src/authority/postgresAuthorityStore.ts');
must(store.includes('AUTHORITY_STATE_CONFLICT'), 'durable commits must reject stale state writers');
must(store.includes('idempotency_key'), 'durable commits must enforce database-level idempotency');
must(store.includes('SERIALIZABLE'), 'durable commits must use serializable transactions');
must(store.includes('AUTHORITY_JOURNAL_HASH_FAILURE'), 'journal hash-chain integrity must be verified');

console.log(JSON.stringify({ pass: failures.length === 0, failures, warnings, checks: 33 }, null, 2));
if (failures.length) process.exit(1);
