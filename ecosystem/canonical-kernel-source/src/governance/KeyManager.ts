import {
  exportPublicKey,
  generateEd25519KeyPair,
  signPayload,
  TrustedKeyRegistry,
  type SignedPayload,
  type TrustedKey,
  type TrustedSubject,
} from './Signatures';

export type KeyStatus = 'ACTIVE' | 'GRACE' | 'REVOKED';

export interface CustodiedKey extends TrustedKey {
  status: KeyStatus;
  createdAt: string;
  rotatedAt?: string;
}

export interface KeyAuditEvent {
  sequence: number;
  event: 'REGISTER' | 'ROTATE' | 'REVOKE';
  keyId: string;
  subject: TrustedSubject;
  occurredAt: string;
  previousKeyId?: string;
  graceUntil?: string;
  previousHash: string | null;
  eventHash: string;
}

export interface PublicKeyRegistrySnapshot {
  version: 1;
  keys: CustodiedKey[];
  audit: KeyAuditEvent[];
}

export interface KeyCustodyStore {
  load(): Promise<PublicKeyRegistrySnapshot | null>;
  save(snapshot: PublicKeyRegistrySnapshot): Promise<void>;
}

export class MemoryKeyCustodyStore implements KeyCustodyStore {
  private snapshot: PublicKeyRegistrySnapshot | null = null;

  async load(): Promise<PublicKeyRegistrySnapshot | null> {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  async save(snapshot: PublicKeyRegistrySnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  let out = '';
  for (const byte of new Uint8Array(hash)) out += byte.toString(16).padStart(2, '0');
  return `sha256:${out}`;
}

export interface RegisterKeyInput {
  keyId: string;
  subject: TrustedSubject;
  validFrom: string;
}

export interface RotateKeyInput {
  previousKeyId: string;
  newKeyId: string;
  rotatedAt: string;
  graceUntil: string;
}

export class KeyManager {
  private readonly keys = new Map<string, CustodiedKey>();
  private readonly privateKeys = new Map<string, CryptoKey>();
  private readonly audit: KeyAuditEvent[] = [];
  private initialized = false;

  constructor(
    private readonly registry: TrustedKeyRegistry = new TrustedKeyRegistry(),
    private readonly store: KeyCustodyStore = new MemoryKeyCustodyStore(),
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const snapshot = await this.store.load();
    if (snapshot) {
      if (snapshot.version !== 1) throw new Error('UNSUPPORTED_KEY_REGISTRY_VERSION');
      this.assertAuditChain(snapshot.audit);
      this.keys.clear();
      this.audit.splice(0, this.audit.length);
      for (const key of snapshot.keys) {
        this.keys.set(key.keyId, key);
        this.registry.register(key);
      }
      this.audit.push(...snapshot.audit);
    }
    this.initialized = true;
  }

  async register(input: RegisterKeyInput): Promise<CustodiedKey> {
    this.requireInitialized();
    this.validateId(input.keyId);
    if (this.keys.has(input.keyId)) throw new Error('KEY_ALREADY_REGISTERED');
    const pair = await generateEd25519KeyPair();
    const publicKey = await exportPublicKey(pair.publicKey);
    const key: CustodiedKey = {
      keyId: input.keyId,
      subject: input.subject,
      publicKey,
      validFrom: input.validFrom,
      status: 'ACTIVE',
      createdAt: input.validFrom,
    };
    this.keys.set(key.keyId, key);
    this.privateKeys.set(key.keyId, pair.privateKey);
    this.registry.register(key);
    await this.appendAudit({ event: 'REGISTER', keyId: key.keyId, subject: key.subject, occurredAt: input.validFrom });
    return structuredClone(key);
  }

  async rotate(input: RotateKeyInput): Promise<CustodiedKey> {
    this.requireInitialized();
    const previous = this.requireKey(input.previousKeyId);
    if (previous.status !== 'ACTIVE') throw new Error('PREVIOUS_KEY_NOT_ACTIVE');
    if (input.graceUntil <= input.rotatedAt) throw new Error('INVALID_GRACE_WINDOW');
    if (this.keys.has(input.newKeyId)) throw new Error('KEY_ALREADY_REGISTERED');
    previous.status = 'GRACE';
    previous.validUntil = input.graceUntil;
    previous.rotatedAt = input.rotatedAt;
    this.registry.register(previous);
    const pair = await generateEd25519KeyPair();
    const key: CustodiedKey = {
      keyId: input.newKeyId,
      subject: previous.subject,
      publicKey: await exportPublicKey(pair.publicKey),
      validFrom: input.rotatedAt,
      status: 'ACTIVE',
      createdAt: input.rotatedAt,
    };
    this.keys.set(key.keyId, key);
    this.privateKeys.set(key.keyId, pair.privateKey);
    this.registry.register(key);
    await this.appendAudit({ event: 'ROTATE', keyId: key.keyId, subject: key.subject, occurredAt: input.rotatedAt, previousKeyId: previous.keyId, graceUntil: input.graceUntil });
    return structuredClone(key);
  }

  async revoke(keyId: string, revokedAt: string): Promise<void> {
    this.requireInitialized();
    const key = this.requireKey(keyId);
    if (key.status === 'REVOKED') throw new Error('KEY_ALREADY_REVOKED');
    key.status = 'REVOKED';
    key.revokedAt = revokedAt;
    key.validUntil = revokedAt;
    this.privateKeys.delete(keyId);
    this.registry.register(key);
    await this.appendAudit({ event: 'REVOKE', keyId, subject: key.subject, occurredAt: revokedAt });
  }

  async sign(keyId: string, payload: string, now: string): Promise<SignedPayload> {
    this.requireInitialized();
    const key = this.requireKey(keyId);
    if (key.status !== 'ACTIVE') throw new Error(`KEY_NOT_SIGNING_ACTIVE:${key.status}`);
    if (key.validFrom > now || (key.validUntil && key.validUntil <= now)) throw new Error('KEY_OUTSIDE_SIGNING_WINDOW');
    if (key.revokedAt) throw new Error('KEY_REVOKED');
    const privateKey = this.privateKeys.get(keyId);
    if (!privateKey) throw new Error('PRIVATE_KEY_NOT_IN_CUSTODY');
    return signPayload(payload, keyId, key.subject, privateKey);
  }

  async verify(signed: SignedPayload, now: string) {
    this.requireInitialized();
    return this.registry.verify(signed, now);
  }

  get(keyId: string): CustodiedKey | undefined {
    const key = this.keys.get(keyId);
    return key ? structuredClone(key) : undefined;
  }

  snapshot(): PublicKeyRegistrySnapshot {
    return { version: 1, keys: [...this.keys.values()].map((key) => structuredClone(key)), audit: this.audit.map((event) => structuredClone(event)) };
  }

  private async appendAudit(input: Omit<KeyAuditEvent, 'sequence' | 'previousHash' | 'eventHash'>): Promise<void> {
    const previousHash = this.audit.at(-1)?.eventHash ?? null;
    const sequence = this.audit.length + 1;
    const unsigned = { sequence, ...input, previousHash };
    const eventHash = await digest(canonical(unsigned));
    this.audit.push({ ...unsigned, eventHash });
    await this.store.save(this.snapshot());
  }

  private assertAuditChain(audit: KeyAuditEvent[]): void {
    let previous: string | null = null;
    for (let i = 0; i < audit.length; i += 1) {
      const event = audit[i];
      if (event.sequence !== i + 1 || event.previousHash !== previous) throw new Error('KEY_AUDIT_CHAIN_INVALID');
      previous = event.eventHash;
    }
  }

  private requireInitialized(): void {
    if (!this.initialized) throw new Error('KEY_MANAGER_NOT_INITIALIZED');
  }

  private requireKey(keyId: string): CustodiedKey {
    const key = this.keys.get(keyId);
    if (!key) throw new Error('UNKNOWN_KEY_ID');
    return key;
  }

  private validateId(keyId: string): void {
    if (!/^[A-Za-z0-9._:-]{1,128}$/.test(keyId)) throw new Error('INVALID_KEY_ID');
  }
}
