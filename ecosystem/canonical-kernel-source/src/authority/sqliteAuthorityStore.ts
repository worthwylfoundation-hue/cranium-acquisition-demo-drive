import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CanonicalEncoder } from '../kernel/engine';
import { sha256 } from '../kernel/sha256';
import type { AuthorityTransitionRequest, AuthorityTransition, KernelState, ReplayStatus } from '../kernel/types';
import type { CanonicalReceipt, DurableAuthorityStore } from './authorityProxy';

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, ordered(v)]));
  }
  return value;
}
function encode(value: unknown): string { return JSON.stringify(ordered(value)); }
function hash(value: unknown): string { return sha256(encode(value)); }

export class SQLiteAuthorityStore implements DurableAuthorityStore {
  private readonly db: DatabaseSync;

  constructor(private readonly filename: string, initialState: KernelState) {
    const parent = dirname(filename);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS authority_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state_json TEXT NOT NULL,
        state_hash TEXT NOT NULL,
        journal_sequence INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS authority_journal (
        sequence INTEGER PRIMARY KEY,
        transaction_id TEXT NOT NULL UNIQUE,
        request_json TEXT NOT NULL,
        transition_json TEXT NOT NULL,
        state_hash TEXT NOT NULL,
        previous_hash TEXT,
        frame_hash TEXT NOT NULL
      );
    `);
    const current = this.db.prepare('SELECT id FROM authority_state WHERE id = 1').get();
    if (!current) {
      const stateJson = encode(initialState);
      this.db.prepare('INSERT INTO authority_state (id, state_json, state_hash, journal_sequence) VALUES (1, ?, ?, 0)').run(stateJson, hash(initialState));
    }
    this.assertIntegrity();
  }

  load() {
    this.assertIntegrity();
    const row = this.db.prepare('SELECT state_json, state_hash, journal_sequence FROM authority_state WHERE id = 1').get() as { state_json: string; state_hash: string; journal_sequence: number };
    const state = JSON.parse(row.state_json) as KernelState;
    return { state, stateHash: row.state_hash, journalSequence: row.journal_sequence };
  }

  getReplayRecords() {
    const rows = this.db.prepare('SELECT request_json, transition_json FROM authority_journal ORDER BY sequence').all() as Array<{ request_json: string; transition_json: string }>;
    return rows.map(({ request_json, transition_json }) => {
      const request = JSON.parse(request_json) as AuthorityTransitionRequest;
      const transition = JSON.parse(transition_json) as AuthorityTransition;
      return {
        idempotencyKey: request.idempotencyKey,
        canonicalRequestHashHex: CanonicalEncoder.hashRequest(request).hexDigest,
        transitionId: transition.id,
        timestamp: transition.timestamp,
      };
    });
  }

  getReceiptForTransition(transitionId: string): CanonicalReceipt | null {
    const row = this.db.prepare('SELECT sequence, request_json, transition_json, state_hash FROM authority_journal WHERE transaction_id = ?').get(transitionId) as { sequence: number; request_json: string; transition_json: string; state_hash: string } | undefined;
    if (!row) return null;
    const request = JSON.parse(row.request_json) as AuthorityTransitionRequest;
    const transition = JSON.parse(row.transition_json) as AuthorityTransition;
    return { authority: 'cranium-kernel', transactionId: transition.id, requestHash: CanonicalEncoder.hashRequest(request).hexDigest, journalSequence: row.sequence, stateHash: row.state_hash, decision: transition.decision.type };
  }

  verifyReceipt(receipt: CanonicalReceipt): boolean {
    try {
      this.assertIntegrity();
      const row = this.db.prepare(
        'SELECT transaction_id, request_json, transition_json, state_hash FROM authority_journal WHERE sequence = ?',
      ).get(receipt.journalSequence) as { transaction_id: string; request_json: string; transition_json: string; state_hash: string } | undefined;
      if (!row) return false;
      const request = JSON.parse(row.request_json) as AuthorityTransitionRequest;
      const transition = JSON.parse(row.transition_json) as AuthorityTransition;
      const expectedRequestHash = CanonicalEncoder.hashRequest(request).hexDigest;
      const expectedReceiptSignature = sha256(
        `${transition.id}:${expectedRequestHash}:${transition.decision.type}`,
      );
      return row.transaction_id === receipt.transactionId
        && transition.id === receipt.transactionId
        && transition.requestHash.algorithm === 'SHA-256'
        && transition.requestHash.hexDigest === expectedRequestHash
        && transition.requestHash.hexDigest === receipt.requestHash
        && transition.receiptSignature === expectedReceiptSignature
        && transition.decision.type === receipt.decision
        && row.state_hash === receipt.stateHash;
    } catch {
      return false;
    }
  }

  commit(input: { request: AuthorityTransitionRequest; transition: AuthorityTransition; nextState: KernelState; replayStatus: ReplayStatus }): CanonicalReceipt {
    const current = this.load();
    const nextHash = hash(input.nextState);
    const nextSequence = current.journalSequence + 1;
    const previous = this.db.prepare('SELECT frame_hash FROM authority_journal WHERE sequence = ?').get(current.journalSequence) as { frame_hash: string } | undefined;
    const previousHash = previous?.frame_hash ?? null;
    const frame = { sequence: nextSequence, transactionId: input.transition.id, request: input.request, transition: input.transition, stateHash: nextHash, previousHash };
    const frameHash = hash(frame);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO authority_journal (sequence, transaction_id, request_json, transition_json, state_hash, previous_hash, frame_hash) VALUES (?, ?, ?, ?, ?, ?, ?)').run(nextSequence, input.transition.id, encode(input.request), encode(input.transition), nextHash, previousHash, frameHash);
      this.db.prepare('UPDATE authority_state SET state_json = ?, state_hash = ?, journal_sequence = 1 + journal_sequence WHERE id = 1').run(encode(input.nextState), nextHash);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { authority: 'cranium-kernel', transactionId: input.transition.id, requestHash: input.transition.requestHash.hexDigest, journalSequence: nextSequence, stateHash: nextHash, decision: input.transition.decision.type };
  }

  private assertIntegrity(): void {
    const rows = this.db.prepare('SELECT sequence, transaction_id, request_json, transition_json, state_hash, previous_hash, frame_hash FROM authority_journal ORDER BY sequence').all() as Array<{ sequence: number; transaction_id: string; request_json: string; transition_json: string; state_hash: string; previous_hash: string | null; frame_hash: string }>;
    let prior: string | null = null;
    for (const row of rows) {
      if (row.sequence !== rows.indexOf(row) + 1 || row.previous_hash !== prior) throw new Error(`AUTHORITY_JOURNAL_INTEGRITY_FAILURE at sequence ${row.sequence}`);
      const expected = hash({ sequence: row.sequence, transactionId: row.transaction_id, request: JSON.parse(row.request_json), transition: JSON.parse(row.transition_json), stateHash: row.state_hash, previousHash: row.previous_hash });
      if (expected !== row.frame_hash) throw new Error(`AUTHORITY_JOURNAL_HASH_FAILURE at sequence ${row.sequence}`);
      prior = row.frame_hash;
    }
    const state = this.db.prepare('SELECT state_hash, journal_sequence FROM authority_state WHERE id = 1').get() as { state_hash: string; journal_sequence: number };
    if (state.journal_sequence !== rows.length) throw new Error('AUTHORITY_STATE_SEQUENCE_FAILURE');
    if (rows.length && rows.at(-1)?.state_hash !== state.state_hash) throw new Error('AUTHORITY_STATE_HASH_FAILURE');
  }
}
