import type { ConnectionOptions } from 'node:tls';

export type TransportSecurityConfig = {
  nodeEnv?: string;
  databaseUrl: string;
  redisUrl: string;
  databaseSsl: string | undefined;
  databaseCaFile?: string;
};

export function validateProductionTransport(config: TransportSecurityConfig): void {
  if (config.nodeEnv !== 'production') return;
  if (config.databaseSsl !== 'true') {
    throw new Error('PRODUCTION_POSTGRES_TLS_REQUIRED');
  }
  if (!config.databaseCaFile) {
    throw new Error('PRODUCTION_POSTGRES_CA_REQUIRED');
  }

  const database = new URL(config.databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || database.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('PRODUCTION_POSTGRES_VERIFY_FULL_REQUIRED');
  }
  if (!config.redisUrl.startsWith('rediss://')) {
    throw new Error('PRODUCTION_REDIS_TLS_REQUIRED');
  }
}

export function postgresSslOptions(databaseSsl: string | undefined, ca?: string): ConnectionOptions | undefined {
  if (databaseSsl !== 'true') return undefined;
  return {
    rejectUnauthorized: true,
    ...(ca ? { ca } : {}),
  };
}
