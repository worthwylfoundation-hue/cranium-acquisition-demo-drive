/**
 * Production key custody for Convertible Cranium.
 *
 * Builds on TrustedKeyRegistry (verify path) with operational lifecycle:
 * register → rotate → revoke, durable public-key registry, and audit log.
 *
 * Private keys are never written to the registry file. Callers hold
 * CryptoKey material in process memory (or an external HSM/KMS in production).
 * This module manages public identity, validity windows, and revocation.
 *
 * Non-claims: not an HSM, not hardware-backed custody, not a full PKI.
 * It is the Kernel-local operational control plane for Ed25519 role keys.
 */

import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  TrustedKeyRegistry,
  type TrustedKey,
  type TrustedSubject,
  type SignedPayload,
  type VerifyResult,
  generateEd25519KeyPair,
  exportPublicKey,
  signPayload,
} from '../governance/Signatures';

export type KeyStatus = 'ACTIVE' | 'GRACE' | 'REVOKED' | 'EXPIRED';

export interface ManagedKeyRecord extends TrustedKey {
  status: KeyStatus;
  rotatedFrom?: string;
  rotatedTo?: string;
  createdAt: string;
  lastRotatedAt?: string;
}

export interface KeyAuditEntry {
  id: string;
  at: string;
  action: 'REGISTER' | 'ROTATE' | 'REVOKE' | 'LOAD';
  keyId: string;
  subject: TrustedSubject;
  detail: string;
  previousHash: string | null;
  hash: string;
}

export interface KeyManagerSnapshot {
  version: 'cranium-keymanager-v1';
  updatedAt: string;
  keys: ManagedKeyRecord[];
  audit: KeyAuditEntry[];
}

export interface IssuedKeyMaterial {
  record: ManagedKeyRecord;
  /** In-process private key — never persisted by KeyManager */
  privateKey: CryptoKey;
  publicKey: CryptoKey;
}

export interface RotateResult {
  previous: ManagedKeyRecord;
  next: IssuedKeyMaterial;
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function nowIso(): string {
  return new Date().toISOString();
}

function assertSubject(subject: string): asserts subject is TrustedSubject {
  const allowed: TrustedSubject[] = ['CORE', 'SYNAPSE_RUNTIME', 'GATEWAY', 'HUMAN_APPROVER'];
  if (!allowed.includes(subject as TrustedSubject)) {
    throw new Error(`INVALID_TRUSTED_SUBJECT: ${subject}`);
  }
}

export class KeyManager {
  private readonly registry = new TrustedKeyRegistry();
  private records = new Map<string, ManagedKeyRecord>();
  private activeBySubject = new Map<TrustedSubject, string>();
  private audit: KeyAuditEntry[] = [];
  /** In-process private keys only — never written to disk by this class */
  private readonly privateKeys = new Map<string, CryptoKey>();

  constructor(private readonly storePath: string) {
    if (existsSync(storePath)) {
      this.load();
    }
  }

  private persist(): void {
    const dir = dirname(this.storePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const snapshot: KeyManagerSnapshot = {
      version: 'cranium-keymanager-v1',
      updatedAt: nowIso(),
      keys: [...this.records.values()].sort((a, b) => a.keyId.localeCompare(b.keyId)),
      audit: this.audit,
    };
    writeFileSync(this.storePath, JSON.stringify(snapshot, null, 2));
  }

  private load(): void {
    const raw = JSON.parse(readFileSync(this.storePath, 'utf8')) as KeyManagerSnapshot;
    if (raw.version !== 'cranium-keymanager-v1') {
      throw new Error(`UNSUPPORTED_KEYMANAGER_VERSION: ${raw.version}`);
    }
    this.records.clear();
    this.activeBySubject.clear();
    this.audit = raw.audit ?? [];
    for (const key of raw.keys) {
      this.records.set(key.keyId, key);
      this.registry.register(key);
      if (key.status === 'ACTIVE') {
        this.activeBySubject.set(key.subject, key.keyId);
      }
    }
    this.appendAudit('LOAD', 'system', 'CORE', `Loaded ${raw.keys.length} keys from durable registry`);
  }

  private appendAudit(
    action: KeyAuditEntry['action'],
    keyId: string,
    subject: TrustedSubject,
    detail: string
  ): void {
    const previousHash = this.audit.at(-1)?.hash ?? null;
    const base = {
      id: randomUUID(),
      at: nowIso(),
      action,
      keyId,
      subject,
      detail,
      previousHash,
    };
    const hash = sha256Hex(JSON.stringify({ ...base, hash: undefined }));
    this.audit.push({ ...base, hash });
  }

  private refreshStatus(record: ManagedKeyRecord, now: string): ManagedKeyRecord {
    if (record.revokedAt && record.revokedAt <= now) {
      return { ...record, status: 'REVOKED' };
    }
    if (record.validUntil && record.validUntil <= now) {
      return { ...record, status: 'EXPIRED' };
    }
    if (record.rotatedTo && record.status === 'ACTIVE') {
      // Should not happen; rotated keys are marked GRACE
      return { ...record, status: 'GRACE' };
    }
    return record;
  }

  listKeys(now = nowIso()): ManagedKeyRecord[] {
    return [...this.records.values()]
      .map((r) => this.refreshStatus(r, now))
      .sort((a, b) => a.keyId.localeCompare(b.keyId));
  }

  getActive(subject: TrustedSubject, now = nowIso()): ManagedKeyRecord | null {
    assertSubject(subject);
    const keyId = this.activeBySubject.get(subject);
    if (!keyId) return null;
    const record = this.records.get(keyId);
    if (!record) return null;
    const refreshed = this.refreshStatus(record, now);
    if (refreshed.status !== 'ACTIVE') return null;
    return refreshed;
  }

  getRecord(keyId: string, now = nowIso()): ManagedKeyRecord | null {
    const record = this.records.get(keyId);
    if (!record) return null;
    return this.refreshStatus(record, now);
  }

  /**
   * Register a brand-new active key for a subject.
   * Fails if an ACTIVE key already exists for that subject (use rotate instead).
   */
  async register(
    subject: TrustedSubject,
    options?: { keyId?: string; validFrom?: string; validUntil?: string }
  ): Promise<IssuedKeyMaterial> {
    assertSubject(subject);
    const existingActive = this.getActive(subject);
    if (existingActive) {
      throw new Error(`ACTIVE_KEY_EXISTS: ${subject} already has active key ${existingActive.keyId}; use rotate()`);
    }

    const pair = await generateEd25519KeyPair();
    const publicKeyB64 = await exportPublicKey(pair.publicKey);
    const keyId = options?.keyId ?? `${subject.toLowerCase()}-${randomUUID().slice(0, 8)}`;
    const validFrom = options?.validFrom ?? nowIso();

    const record: ManagedKeyRecord = {
      keyId,
      subject,
      publicKey: publicKeyB64,
      validFrom,
      validUntil: options?.validUntil,
      status: 'ACTIVE',
      createdAt: nowIso(),
    };

    this.records.set(keyId, record);
    this.registry.register(record);
    this.activeBySubject.set(subject, keyId);
    this.privateKeys.set(keyId, pair.privateKey);
    this.appendAudit('REGISTER', keyId, subject, `Registered new active ${subject} key`);
    this.persist();

    return { record, privateKey: pair.privateKey, publicKey: pair.publicKey };
  }

  /**
   * Rotate the active key for a subject.
   * Previous key enters GRACE until graceUntil (default: now + graceMs).
   * New key becomes ACTIVE immediately.
   */
  async rotate(
    subject: TrustedSubject,
    options?: { graceMs?: number; newKeyId?: string }
  ): Promise<RotateResult> {
    assertSubject(subject);
    const previous = this.getActive(subject);
    if (!previous) {
      throw new Error(`NO_ACTIVE_KEY: ${subject}; use register() first`);
    }

    const graceMs = options?.graceMs ?? 24 * 60 * 60 * 1000;
    const graceUntil = new Date(Date.now() + graceMs).toISOString();
    const rotatedAt = nowIso();

    const pair = await generateEd25519KeyPair();
    const publicKeyB64 = await exportPublicKey(pair.publicKey);
    const newKeyId = options?.newKeyId ?? `${subject.toLowerCase()}-${randomUUID().slice(0, 8)}`;

    const nextRecord: ManagedKeyRecord = {
      keyId: newKeyId,
      subject,
      publicKey: publicKeyB64,
      validFrom: rotatedAt,
      status: 'ACTIVE',
      createdAt: rotatedAt,
      rotatedFrom: previous.keyId,
    };

    const previousUpdated: ManagedKeyRecord = {
      ...previous,
      status: 'GRACE',
      validUntil: graceUntil,
      rotatedTo: newKeyId,
      lastRotatedAt: rotatedAt,
    };

    this.records.set(previous.keyId, previousUpdated);
    this.registry.register(previousUpdated);
    this.records.set(newKeyId, nextRecord);
    this.registry.register(nextRecord);
    this.activeBySubject.set(subject, newKeyId);
    this.privateKeys.set(newKeyId, pair.privateKey);
    this.appendAudit(
      'ROTATE',
      newKeyId,
      subject,
      `Rotated ${previous.keyId} -> ${newKeyId}; previous grace until ${graceUntil}`
    );
    this.persist();

    return {
      previous: previousUpdated,
      next: { record: nextRecord, privateKey: pair.privateKey, publicKey: pair.publicKey },
    };
  }

  /**
   * Revoke a key immediately. Fail-closed: verify() rejects revoked keys.
   */
  revoke(keyId: string, reason: string): ManagedKeyRecord {
    const record = this.records.get(keyId);
    if (!record) throw new Error(`UNKNOWN_KEY_ID: ${keyId}`);
    if (record.revokedAt) return record;

    const revokedAt = nowIso();
    const updated: ManagedKeyRecord = {
      ...record,
      status: 'REVOKED',
      revokedAt,
    };
    this.records.set(keyId, updated);
    this.registry.register(updated);

    if (this.activeBySubject.get(record.subject) === keyId) {
      this.activeBySubject.delete(record.subject);
    }
    this.privateKeys.delete(keyId);
    this.appendAudit('REVOKE', keyId, record.subject, reason || 'Revoked');
    this.persist();
    return updated;
  }

  async sign(
    subject: TrustedSubject,
    payload: string,
    keyId?: string
  ): Promise<SignedPayload> {
    const record = keyId ? this.getRecord(keyId) : this.getActive(subject);
    if (!record) throw new Error(`NO_SIGNING_KEY: ${subject}`);
    if (record.status === 'REVOKED' || record.status === 'EXPIRED') {
      throw new Error(`KEY_NOT_SIGNABLE: ${record.keyId} status=${record.status}`);
    }
    const privateKey = this.privateKeys.get(record.keyId);
    if (!privateKey) {
      throw new Error(
        `PRIVATE_KEY_NOT_IN_PROCESS: ${record.keyId}. Re-register/rotate in this process or inject key material.`
      );
    }
    return signPayload(payload, record.keyId, subject, privateKey);
  }

  async verify(signed: SignedPayload, now = nowIso()): Promise<VerifyResult> {
    return this.registry.verify(signed, now);
  }

  /** Expose registry for callers that only need verify */
  getRegistry(): TrustedKeyRegistry {
    return this.registry;
  }

  getAuditLog(): readonly KeyAuditEntry[] {
    return this.audit;
  }

  verifyAuditChain(): boolean {
    let previous: string | null = null;
    for (const entry of this.audit) {
      if (entry.previousHash !== previous) return false;
      const expected = sha256Hex(
        JSON.stringify({
          id: entry.id,
          at: entry.at,
          action: entry.action,
          keyId: entry.keyId,
          subject: entry.subject,
          detail: entry.detail,
          previousHash: entry.previousHash,
          hash: undefined,
        })
      );
      if (entry.hash !== expected) return false;
      previous = entry.hash;
    }
    return true;
  }
}
