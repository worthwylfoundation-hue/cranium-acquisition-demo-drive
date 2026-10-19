import assert from 'node:assert/strict';
import { postgresSslOptions, validateProductionTransport } from '../src/integration/transportSecurity';

const production = {
  nodeEnv: 'production',
  databaseUrl: 'postgresql://gateway:secret@db.example.com:5432/cranium?sslmode=verify-full',
  redisUrl: 'rediss://cache.example.com:6380',
  databaseSsl: 'true',
  databaseCaFile: '/run/secrets/postgres_ca',
};

validateProductionTransport(production);
assert.deepEqual(postgresSslOptions('true'), { rejectUnauthorized: true });
assert.deepEqual(postgresSslOptions('true', 'CA CERT'), { rejectUnauthorized: true, ca: 'CA CERT' });
assert.equal(postgresSslOptions(undefined), undefined);

assert.throws(() => validateProductionTransport({ ...production, databaseSsl: 'false' }), /PRODUCTION_POSTGRES_TLS_REQUIRED/);
assert.throws(() => validateProductionTransport({ ...production, databaseCaFile: undefined }), /PRODUCTION_POSTGRES_CA_REQUIRED/);
assert.throws(() => validateProductionTransport({ ...production, databaseUrl: production.databaseUrl.replace('verify-full', 'require') }), /PRODUCTION_POSTGRES_VERIFY_FULL_REQUIRED/);
assert.throws(() => validateProductionTransport({ ...production, redisUrl: 'redis://cache.example.com:6379' }), /PRODUCTION_REDIS_TLS_REQUIRED/);
validateProductionTransport({ ...production, nodeEnv: 'test', databaseSsl: undefined, redisUrl: 'redis://localhost:6379' });

console.log('TRANSPORT_SECURITY_SUMMARY: PASS postgres-verify-full redis-tls ca-options fail-closed');
