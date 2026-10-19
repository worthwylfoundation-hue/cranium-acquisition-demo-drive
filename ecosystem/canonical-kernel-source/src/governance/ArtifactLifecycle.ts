/**
 * Phase 2 — lifecycle-bound artifacts.
 *
 * Synapse attestations are signed by SYNAPSE_RUNTIME.
 * Core receipts are signed by CORE over receiptHash.
 *
 * Accepts either:
 * - KeyManager-like sign(subject, payload) (production custody path)
 * - Raw CryptoKey + keyId (tests / bootstrap)
 *
 * Private keys are never persisted by this module.
 */

import {
  signPayload,
  type SignedPayload,
  type TrustedSubject,
  type TrustedKeyRegistry,
  type VerifyResult,
} from './Signatures';
import type { SynapseTransactionAttestation, GovernanceReceipt, TransactionJson } from './SynapseCoreTransaction';
import { hashTransactionValue } from './SynapseCoreTransaction';

export interface SubjectSigner {
  sign(subject: TrustedSubject, payload: string): Promise<SignedPayload>;
}

export interface RawKeySigner {
  keyId: string;
  subject: TrustedSubject;
  privateKey: CryptoKey;
}

/** Adapt a raw CryptoKey into SubjectSigner for a single role. */
export function rawKeyAsSigner(raw: RawKeySigner): SubjectSigner {
  return {
    async sign(subject: TrustedSubject, payload: string): Promise<SignedPayload> {
      if (subject !== raw.subject) {
        throw new Error(`SIGNER_SUBJECT_MISMATCH: expected ${raw.subject}, got ${subject}`);
      }
      return signPayload(payload, raw.keyId, subject, raw.privateKey);
    },
  };
}

/**
 * Build a complete SynapseTransactionAttestation: hash body, sign hash as SYNAPSE_RUNTIME.
 */
export async function sealSynapseAttestation(
  body: Omit<SynapseTransactionAttestation, 'attestationHash' | 'signature'>,
  synapseSigner: SubjectSigner
): Promise<SynapseTransactionAttestation> {
  const attestationHash = hashTransactionValue(body as unknown as TransactionJson);
  const signature = await synapseSigner.sign('SYNAPSE_RUNTIME', attestationHash);
  return { ...body, attestationHash, signature };
}

/**
 * Sign a Core receipt over its receiptHash with CORE subject.
 */
export async function sealCoreReceipt(
  unsigned: Omit<GovernanceReceipt, 'coreSignature'>,
  coreSigner: SubjectSigner
): Promise<GovernanceReceipt> {
  const signature = await coreSigner.sign('CORE', unsigned.receiptHash);
  return { ...unsigned, coreSignature: signature };
}

/**
 * Verify a sealed Core receipt signature against a TrustedKeyRegistry.
 */
export async function verifyCoreReceiptSignature(
  receipt: GovernanceReceipt,
  registry: TrustedKeyRegistry,
  now: string
): Promise<VerifyResult> {
  if (!receipt.coreSignature) {
    return { valid: false, reason: 'CORE_SIGNATURE_MISSING', subject: null, payload: null };
  }
  const result = await registry.verify(receipt.coreSignature, now);
  if (!result.valid) return result;
  if (result.subject !== 'CORE') {
    return { valid: false, reason: 'CORE_SIGNATURE_WRONG_SIGNER', subject: null, payload: null };
  }
  if (result.payload !== receipt.receiptHash) {
    return { valid: false, reason: 'CORE_SIGNATURE_PAYLOAD_MISMATCH', subject: null, payload: null };
  }
  return result;
}

/**
 * Verify Synapse attestation signature (hash + role + payload binding).
 */
export async function verifySynapseAttestationSignature(
  attestation: SynapseTransactionAttestation,
  registry: TrustedKeyRegistry,
  now: string
): Promise<VerifyResult> {
  const result = await registry.verify(attestation.signature, now);
  if (!result.valid) return result;
  if (result.subject !== 'SYNAPSE_RUNTIME') {
    return { valid: false, reason: 'ATTESTATION_WRONG_SIGNER', subject: null, payload: null };
  }
  if (result.payload !== attestation.attestationHash) {
    return { valid: false, reason: 'ATTESTATION_SIGNATURE_PAYLOAD_MISMATCH', subject: null, payload: null };
  }
  return result;
}
