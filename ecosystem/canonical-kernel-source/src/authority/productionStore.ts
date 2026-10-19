import type { Pool } from 'pg';
import type { KernelState } from '../kernel/types';
import { PostgresAuthorityStore } from './postgresAuthorityStore';

export function createPostgresAuthorityStore(pool: Pool, initialState: KernelState): PostgresAuthorityStore {
  return new PostgresAuthorityStore(pool, initialState);
}
