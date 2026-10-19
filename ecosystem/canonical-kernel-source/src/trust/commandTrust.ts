import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from 'node:crypto';

export type TrustStage =
  | 'hardware-root'
  | 'firmware'
  | 'bootloader'
  | 'os-image'
  | 'cranium-kernel'
  | 'runtime';

export interface TrustLink {
  stage: TrustStage;
  artifact: string;
  digest: string;
  signerKeyId: string;
  signature: string;
}

export interface TrustManifest {
  version: 'cranium-trust-v1';
  product: 'cranium-command-os';
  generatedAt: number;
  rootKeyId: string;
  links: TrustLink[];
  manifestDigest: string;
  signature: string;
}

export interface SignedCapability {
  version: 'capability-v2';
  capabilityId: string;
  subjectId: string;
  action: string;
  scope: string;
  riskCeiling: number;
  issuedAt: number;
  expiresAt?: number;
  issuerKeyId: string;
  signature: string;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(canonicalValue));
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalValue(child)]),
    );
  }
  return value;
}

export function digest(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function createSigningRoot() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey,
    publicKey,
    keyId: digest(publicKey.export({ type: 'spki', format: 'der' })),
  };
}

export function signBytes(privateKey: ReturnType<typeof createPrivateKey>, value: string): string {
  return sign(null, Buffer.from(value), privateKey).toString('base64');
}

export function verifyBytes(
  publicKey: ReturnType<typeof createPublicKey>,
  value: string,
  signature: string,
): boolean {
  return verify(null, Buffer.from(value), publicKey, Buffer.from(signature, 'base64'));
}

export function signObject(
  privateKey: ReturnType<typeof createPrivateKey>,
  value: unknown,
): string {
  return signBytes(privateKey, canonicalJson(value));
}

export function verifyObject(
  publicKey: ReturnType<typeof createPublicKey>,
  value: unknown,
  signature: string,
): boolean {
  return verifyBytes(publicKey, canonicalJson(value), signature);
}

export function issueCapability(
  privateKey: ReturnType<typeof createPrivateKey>,
  issuerKeyId: string,
  input: Omit<SignedCapability, 'signature' | 'issuerKeyId' | 'version'>,
): SignedCapability {
  const unsigned = {
    version: 'capability-v2' as const,
    ...input,
    issuerKeyId,
  };
  return { ...unsigned, signature: signObject(privateKey, unsigned) };
}

export function verifyCapability(
  publicKey: ReturnType<typeof createPublicKey>,
  capability: SignedCapability,
  now = Date.now(),
): boolean {
  const { signature, ...unsigned } = capability;
  if (unsigned.version !== 'capability-v2') return false;
  if (!Number.isFinite(unsigned.riskCeiling) || unsigned.riskCeiling < 0 || unsigned.riskCeiling > 1) return false;
  if (now < unsigned.issuedAt) return false;
  if (unsigned.expiresAt !== undefined && now >= unsigned.expiresAt) return false;
  return verifyObject(publicKey, unsigned, signature);
}
