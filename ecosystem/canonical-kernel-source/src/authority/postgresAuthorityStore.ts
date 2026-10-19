import type { Pool, PoolClient } from 'pg';
import { CanonicalEncoder } from '../kernel/engine';
import { sha256 } from '../kernel/sha256';
import type { AuthorityTransitionRequest, AuthorityTransition, KernelState, ReplayStatus } from '../kernel/types';
import type { CanonicalReceipt, AsyncDurableAuthorityStore } from './authorityProxy';

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => [k, ordered(v)]));
  return value;
}
function encode(value: unknown): string { return JSON.stringify(ordered(value)); }
function hash(value: unknown): string { return sha256(encode(value)); }

/** Production durable store. PostgreSQL is persistence, never the authority issuer. */
export class PostgresAuthorityStore implements AsyncDurableAuthorityStore {
  constructor(private readonly pool: Pool, private readonly initialState: KernelState) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS cranium_authority_state (id SMALLINT PRIMARY KEY CHECK (id=1), state_json JSONB NOT NULL, state_hash TEXT NOT NULL, journal_sequence BIGINT NOT NULL); CREATE TABLE IF NOT EXISTS cranium_authority_journal (sequence BIGINT PRIMARY KEY, transaction_id TEXT NOT NULL UNIQUE, idempotency_key TEXT, request_json JSONB NOT NULL, transition_json JSONB NOT NULL, state_hash TEXT NOT NULL, previous_hash TEXT, frame_hash TEXT NOT NULL); ALTER TABLE cranium_authority_journal ADD COLUMN IF NOT EXISTS idempotency_key TEXT; UPDATE cranium_authority_journal SET idempotency_key = request_json->>'idempotencyKey' WHERE idempotency_key IS NULL; ALTER TABLE cranium_authority_journal ALTER COLUMN idempotency_key SET NOT NULL; CREATE UNIQUE INDEX IF NOT EXISTS cranium_authority_journal_idempotency_key_uq ON cranium_authority_journal (idempotency_key);`);
    const result = await this.pool.query('SELECT id FROM cranium_authority_state WHERE id=1');
    if (result.rowCount === 0) await this.pool.query('INSERT INTO cranium_authority_state (id,state_json,state_hash,journal_sequence) VALUES (1,$1::jsonb,$2,0)', [encode(this.initialState), hash(this.initialState)]);
    await this.assertIntegrity();
  }

  async load() {
    await this.initializeIfNeeded();
    const row = (await this.pool.query('SELECT state_json,state_hash,journal_sequence FROM cranium_authority_state WHERE id=1')).rows[0] as {state_json: KernelState; state_hash:string; journal_sequence:string};
    return { state: row.state_json, stateHash: row.state_hash, journalSequence: Number(row.journal_sequence) };
  }

  async getReplayRecords() {
    const rows = (await this.pool.query('SELECT request_json,transition_json FROM cranium_authority_journal ORDER BY sequence')).rows as Array<{request_json: AuthorityTransitionRequest; transition_json: AuthorityTransition}>;
    return rows.map(({request_json,transition_json}) => ({idempotencyKey: request_json.idempotencyKey, canonicalRequestHashHex: CanonicalEncoder.hashRequest(request_json).hexDigest, transitionId: transition_json.id, timestamp: transition_json.timestamp}));
  }

  async getReceiptForTransition(transitionId: string): Promise<CanonicalReceipt | null> {
    const row = (await this.pool.query('SELECT sequence,request_json,transition_json,state_hash FROM cranium_authority_journal WHERE transaction_id=$1',[transitionId])).rows[0] as {sequence:string;request_json:AuthorityTransitionRequest;transition_json:AuthorityTransition;state_hash:string}|undefined;
    if (!row) return null;
    return {authority:'cranium-kernel',transactionId:row.transition_json.id,requestHash:CanonicalEncoder.hashRequest(row.request_json).hexDigest,journalSequence:Number(row.sequence),stateHash:row.state_hash,decision:row.transition_json.decision.type};
  }

  async verifyReceipt(receipt: CanonicalReceipt): Promise<boolean> {
    try { await this.assertIntegrity(); const row=(await this.pool.query('SELECT transaction_id,request_json,transition_json,state_hash FROM cranium_authority_journal WHERE sequence=$1',[receipt.journalSequence])).rows[0] as {transaction_id:string;request_json:AuthorityTransitionRequest;transition_json:AuthorityTransition;state_hash:string}|undefined; if(!row)return false; const rh=CanonicalEncoder.hashRequest(row.request_json).hexDigest; const sig=sha256(`${row.transition_json.id}:${rh}:${row.transition_json.decision.type}`); return row.transaction_id===receipt.transactionId&&row.transition_json.id===receipt.transactionId&&row.transition_json.requestHash.algorithm==='SHA-256'&&row.transition_json.requestHash.hexDigest===rh&&row.transition_json.receiptSignature===sig&&rh===receipt.requestHash&&row.state_hash===receipt.stateHash&&row.transition_json.decision.type===receipt.decision; } catch { return false; }
  }

  async commit(input:{expectedStateHash:string;request:AuthorityTransitionRequest;transition:AuthorityTransition;nextState:KernelState;replayStatus:ReplayStatus}):Promise<CanonicalReceipt>{
    const client=await this.pool.connect();
    try { await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE'); const current=(await client.query('SELECT state_hash,journal_sequence FROM cranium_authority_state WHERE id=1 FOR UPDATE')).rows[0] as {state_hash:string;journal_sequence:string}; if(current.state_hash!==input.expectedStateHash) throw new Error('AUTHORITY_STATE_CONFLICT'); const existing=(await client.query('SELECT sequence,request_json,transition_json,state_hash FROM cranium_authority_journal WHERE idempotency_key=$1',[input.request.idempotencyKey])).rows[0] as {sequence:string;request_json:AuthorityTransitionRequest;transition_json:AuthorityTransition;state_hash:string}|undefined; if(existing){ const attempted=CanonicalEncoder.hashRequest(input.request).hexDigest; const prior=CanonicalEncoder.hashRequest(existing.request_json).hexDigest; if(prior!==attempted) throw new Error('IDEMPOTENCY_KEY_REUSE_CONFLICT'); return {authority:'cranium-kernel',transactionId:existing.transition_json.id,requestHash:prior,journalSequence:Number(existing.sequence),stateHash:existing.state_hash,decision:existing.transition_json.decision.type}; } const nextSequence=Number(current.journal_sequence)+1; const previous=(await client.query('SELECT frame_hash FROM cranium_authority_journal WHERE sequence=$1',[nextSequence-1])).rows[0] as {frame_hash:string}|undefined; const nextHash=hash(input.nextState); const previousHash=previous?.frame_hash??null; const frameHash=hash({sequence:nextSequence,transactionId:input.transition.id,request:input.request,transition:input.transition,stateHash:nextHash,previousHash}); await client.query('INSERT INTO cranium_authority_journal (sequence,transaction_id,idempotency_key,request_json,transition_json,state_hash,previous_hash,frame_hash) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)',[nextSequence,input.transition.id,input.request.idempotencyKey,encode(input.request),encode(input.transition),nextHash,previousHash,frameHash]); await client.query('UPDATE cranium_authority_state SET state_json=$1::jsonb,state_hash=$2,journal_sequence=$3 WHERE id=1',[encode(input.nextState),nextHash,nextSequence]); await client.query('COMMIT'); return {authority:'cranium-kernel',transactionId:input.transition.id,requestHash:input.transition.requestHash.hexDigest,journalSequence:nextSequence,stateHash:nextHash,decision:input.transition.decision.type}; } catch(error){ await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  private async initializeIfNeeded(): Promise<void> { const r=await this.pool.query('SELECT id FROM cranium_authority_state WHERE id=1'); if(r.rowCount===0) await this.initialize(); }
  private async assertIntegrity(): Promise<void> { const rows=(await this.pool.query('SELECT sequence,transaction_id,idempotency_key,request_json,transition_json,state_hash,previous_hash,frame_hash FROM cranium_authority_journal ORDER BY sequence')).rows as Array<{sequence:string;transaction_id:string;request_json:AuthorityTransitionRequest;transition_json:AuthorityTransition;state_hash:string;previous_hash:string|null;frame_hash:string}>; let prior:string|null=null; for(let i=0;i<rows.length;i++){const r=rows[i]; if(Number(r.sequence)!==i+1||r.previous_hash!==prior)throw new Error(`AUTHORITY_JOURNAL_INTEGRITY_FAILURE at sequence ${r.sequence}`); const expected=hash({sequence:Number(r.sequence),transactionId:r.transaction_id,request:r.request_json,transition:r.transition_json,stateHash:r.state_hash,previousHash:r.previous_hash}); if(expected!==r.frame_hash)throw new Error(`AUTHORITY_JOURNAL_HASH_FAILURE at sequence ${r.sequence}`); prior=r.frame_hash;} const s=(await this.pool.query('SELECT state_hash,journal_sequence FROM cranium_authority_state WHERE id=1')).rows[0] as {state_hash:string;journal_sequence:string}; if(Number(s.journal_sequence)!==rows.length)throw new Error('AUTHORITY_STATE_SEQUENCE_FAILURE'); if(rows.length&&rows.at(-1)!.state_hash!==s.state_hash)throw new Error('AUTHORITY_STATE_HASH_FAILURE'); }
}
