import { Pool } from 'pg';
import { PostgresAuthorityStore } from '../src/authority/postgresAuthorityStore';
import { createInitialKernelState } from '../src/data/initialState';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is required'); process.exit(78); }
const pool = new Pool({ connectionString: url });
const store = new PostgresAuthorityStore(pool, createInitialKernelState());
await store.initialize();
const first = await store.load();
if (first.journalSequence !== 0) throw new Error('EXPECTED_EMPTY_AUTHORITY_JOURNAL');
await store.initialize();
const second = await store.load();
if (second.stateHash !== first.stateHash || second.journalSequence !== first.journalSequence) throw new Error('POSTGRES_INITIALIZATION_NOT_IDEMPOTENT');
await pool.end();
console.log(JSON.stringify({ pass: true, journalSequence: second.journalSequence, stateHash: second.stateHash }));
