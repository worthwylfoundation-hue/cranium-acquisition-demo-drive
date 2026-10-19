/**
 * verify:keys-bound — Phase 2 lifecycle binding
 *
 * Proves KeyManager (or raw signers) bind into real Core receipts and
 * Synapse attestations: grant path, CORE signature on execute, revoke fail-closed.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  generateEd25519KeyPair,
  exportPublicKey,
  TrustedKeyRegistry,
  signPayload,
} from '../src/governance/Signatures';
import {
  CraniumCoreTransactionGate,
  hashTransactionValue,
} from '../src/governance/SynapseCoreTransaction';
import {
  rawKeyAsSigner,
  sealSynapseAttestation,
  verifyCoreReceiptSignature,
} from '../src/governance/ArtifactLifecycle';

async function tryLoadKeyManager(): Promise<typeof import('../src/governance/KeyManager') | null> {
  try {
    return await import('../src/governance/KeyManager');
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log('Phase 2 keys-bound checks\n');

  const now = '2026-09-28T20:00:00.000Z';
  const requestPayload = { userId: 'user-42', task: 'read customer report' };
  const authority = {
    principalId: 'agent-01',
    authorityVersion: 1,
    allowedTools: ['read_customer_record'] as const,
    maximumRiskTier: 'LOW' as const,
    requiresHumanApproval: [] as const,
  };
  const action = {
    actionId: 'action-bound-1',
    tool: 'read_customer_record' as const,
    args: { customerId: 'c-1' },
    requestedAt: now,
  };

  // --- Path A: raw CryptoKey signers (always available) ---
  const synapsePair = await generateEd25519KeyPair();
  const corePair = await generateEd25519KeyPair();
  const synapsePub = await exportPublicKey(synapsePair.publicKey);
  const corePub = await exportPublicKey(corePair.publicKey);

  const registry = new TrustedKeyRegistry();
  registry.register({
    keyId: 'synapse-bound-1',
    subject: 'SYNAPSE_RUNTIME',
    publicKey: synapsePub,
    validFrom: '2026-01-01T00:00:00.000Z',
  });
  registry.register({
    keyId: 'core-bound-1',
    subject: 'CORE',
    publicKey: corePub,
    validFrom: '2026-01-01T00:00:00.000Z',
  });

  const coreSigner = rawKeyAsSigner({
    keyId: 'core-bound-1',
    subject: 'CORE',
    privateKey: corePair.privateKey,
  });
  const synapseSigner = rawKeyAsSigner({
    keyId: 'synapse-bound-1',
    subject: 'SYNAPSE_RUNTIME',
    privateKey: synapsePair.privateKey,
  });

  const gate = new CraniumCoreTransactionGate(registry, {
    coreSigner,
    requireCoreSignatureOnExecute: true,
  });

  const envelope = gate.issueSynapseEnvelope(requestPayload, authority, {
    policyVersion: 'policy-v1',
    modelIdentityHash: 'model-h',
    observationProfileHash: 'profile-h',
    riskTier: 'LOW',
    monitoredLayers: [8],
    activeRiskAxes: ['tool-poisoning'],
    interventionBudget: { maxNormDelta: 0.1, maxInterventions: 1, allowedLayers: [8] },
    issuedAt: '2026-09-28T19:00:00.000Z',
    expiresAt: '2026-09-28T21:00:00.000Z',
    nonce: 'n-bound-1',
  });

  const requestHash = hashTransactionValue(requestPayload);
  const attestation = await sealSynapseAttestation(
    {
      schemaVersion: '1.0',
      attestationId: 'att-bound-1',
      envelopeId: envelope.envelopeId,
      coreEnvelopeHash: envelope.coreEnvelopeHash,
      requestHash,
      policyVersion: 'policy-v1',
      authorityVersion: 1,
      modelIdentityHash: 'model-h',
      observationProfileHash: 'profile-h',
      monitoredLayers: [8],
      activeRiskAxes: ['tool-poisoning'],
      maxRiskScore: 0.02,
      disposition: 'CONTINUE',
      interventionApplied: false,
      interventionCount: 0,
      traceCommitment: 'trace-h',
      generatedAt: now,
      expiresAt: '2026-09-28T21:00:00.000Z',
    },
    synapseSigner
  );

  const receipt = await gate.authorize(
    requestPayload,
    action,
    authority,
    envelope,
    attestation,
    now,
    'receipt-bound-1'
  );
  assert.equal(receipt.decision, 'GRANTED', 'bound path should grant');
  assert.ok(receipt.coreSignature, 'receipt must carry CORE signature');
  assert.equal(receipt.coreSignature?.subject, 'CORE');

  const coreOk = await verifyCoreReceiptSignature(receipt, registry, now);
  assert.equal(coreOk.valid, true, 'CORE receipt signature must verify');

  let executed = 0;
  const exec = await gate.execute(receipt, action, authority, now, () => {
    executed += 1;
  });
  assert.equal(exec.executed, true, 'signed receipt must execute');
  assert.equal(executed, 1);

  // Tamper core signature payload binding
  const tamperedReceipt = {
    ...receipt,
    coreSignature: {
      ...receipt.coreSignature!,
      payload: 'not-the-receipt-hash',
    },
  };
  // Inject into chain by authorizing a second action then testing isolated verify
  const tamperVerify = await verifyCoreReceiptSignature(tamperedReceipt, registry, now);
  assert.equal(tamperVerify.valid, false, 'tampered CORE payload must fail');

  // Missing CORE signature denied on execute when required
  const unsignedGate = new CraniumCoreTransactionGate(registry, {
    requireCoreSignatureOnExecute: true,
  });
  // Build a grant without signer by using a parallel gate without coreSigner for setup —
  // then force execute with require flag via a signed-registry gate checking missing sig.
  const noSigReceipt = { ...receipt, coreSignature: undefined };
  const missing = await gate.execute(noSigReceipt as typeof receipt, action, authority, now, () => {
    executed += 1;
  });
  assert.equal(missing.executed, false, 'missing CORE signature must not execute');
  assert.match(missing.reason, /CORE_SIGNATURE|SIGNATURE/);

  console.log('  PASS  raw signer: grant + CORE seal + execute + tamper + missing sig');

  // --- Path B: KeyManager if present on this checkout ---
  const kmMod = await tryLoadKeyManager();
  if (kmMod) {
    const dir = mkdtempSync(join(tmpdir(), 'cranium-keys-bound-'));
    try {
      const kmRegistry = new TrustedKeyRegistry();
      const km = new kmMod.KeyManager(kmRegistry, new kmMod.MemoryKeyCustodyStore());
      await km.initialize();
      const coreKey = await km.register({ keyId: 'core-km-1', subject: 'CORE', validFrom: '2026-01-01T00:00:00.000Z' });
      const synapseKey = await km.register({ keyId: 'synapse-km-1', subject: 'SYNAPSE_RUNTIME', validFrom: '2026-01-01T00:00:00.000Z' });
      const kmGate = new CraniumCoreTransactionGate(kmRegistry, {
        coreSigner: {
          sign: (_subject, payload) => km.sign(coreKey.keyId, payload, now),
        },
        requireCoreSignatureOnExecute: true,
      });
      const kmEnvelope = kmGate.issueSynapseEnvelope(requestPayload, authority, {
        policyVersion: 'policy-v1',
        modelIdentityHash: 'model-h',
        observationProfileHash: 'profile-h',
        riskTier: 'LOW',
        monitoredLayers: [8],
        activeRiskAxes: ['tool-poisoning'],
        interventionBudget: { maxNormDelta: 0.1, maxInterventions: 1, allowedLayers: [8] },
        issuedAt: '2026-09-28T19:00:00.000Z',
        expiresAt: '2026-09-28T21:00:00.000Z',
        nonce: 'n-km-1',
      });
      const kmAttestation = await sealSynapseAttestation(
        {
          schemaVersion: '1.0',
          attestationId: 'att-km-1',
          envelopeId: kmEnvelope.envelopeId,
          coreEnvelopeHash: kmEnvelope.coreEnvelopeHash,
          requestHash: hashTransactionValue(requestPayload),
          policyVersion: 'policy-v1',
          authorityVersion: 1,
          modelIdentityHash: 'model-h',
          observationProfileHash: 'profile-h',
          monitoredLayers: [8],
          activeRiskAxes: ['tool-poisoning'],
          maxRiskScore: 0.01,
          disposition: 'CONTINUE',
          interventionApplied: false,
          interventionCount: 0,
          traceCommitment: 'trace-km',
          generatedAt: now,
          expiresAt: '2026-09-28T21:00:00.000Z',
        },
        { sign: (_subject, payload) => km.sign(synapseKey.keyId, payload, now) }
      );
      const kmAction = { ...action, actionId: 'action-km-1' };
      const kmReceipt = await kmGate.authorize(
        requestPayload,
        kmAction,
        authority,
        kmEnvelope,
        kmAttestation,
        now,
        'receipt-km-1'
      );
      assert.equal(kmReceipt.decision, 'GRANTED');
      assert.ok(kmReceipt.coreSignature);

      const kmExec = await kmGate.execute(kmReceipt, kmAction, authority, now, () => {});
      assert.equal(kmExec.executed, true, 'KeyManager-sealed receipt must execute');

      // Revoke CORE active key — new signatures fail; old receipt still verifies if key still in registry as grace/active public
      const activeCore = kmReceipt.coreSignature!.keyId;
      await km.revoke(activeCore, now);
      let signBlocked = false;
      try {
        await km.sign(coreKey.keyId, 'post-revoke', now);
      } catch {
        signBlocked = true;
      }
      assert.equal(signBlocked, true, 'revoked CORE cannot sign');

      console.log('  PASS  KeyManager path: seal + execute + revoke blocks new CORE signs');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    console.log('  SKIP  KeyManager not on this checkout (raw path still proven)');
  }

  // Backward compat: gate without coreSigner still grants; execute does not require CORE sig
  const legacyRegistry = new TrustedKeyRegistry();
  legacyRegistry.register({
    keyId: 'synapse-bound-1',
    subject: 'SYNAPSE_RUNTIME',
    publicKey: synapsePub,
    validFrom: '2026-01-01T00:00:00.000Z',
  });
  const legacyGate = new CraniumCoreTransactionGate(legacyRegistry);
  const legacyEnvelope = legacyGate.issueSynapseEnvelope(requestPayload, authority, {
    policyVersion: 'policy-v1',
    modelIdentityHash: 'model-h',
    observationProfileHash: 'profile-h',
    riskTier: 'LOW',
    monitoredLayers: [8],
    activeRiskAxes: ['tool-poisoning'],
    interventionBudget: { maxNormDelta: 0.1, maxInterventions: 1, allowedLayers: [8] },
    issuedAt: '2026-09-28T19:00:00.000Z',
    expiresAt: '2026-09-28T21:00:00.000Z',
    nonce: 'n-legacy',
  });
  const legacyAtt = await sealSynapseAttestation(
    {
      schemaVersion: '1.0',
      attestationId: 'att-legacy',
      envelopeId: legacyEnvelope.envelopeId,
      coreEnvelopeHash: legacyEnvelope.coreEnvelopeHash,
      requestHash: hashTransactionValue(requestPayload),
      policyVersion: 'policy-v1',
      authorityVersion: 1,
      modelIdentityHash: 'model-h',
      observationProfileHash: 'profile-h',
      monitoredLayers: [8],
      activeRiskAxes: ['tool-poisoning'],
      maxRiskScore: 0.01,
      disposition: 'CONTINUE',
      interventionApplied: false,
      interventionCount: 0,
      traceCommitment: 'trace-legacy',
      generatedAt: now,
      expiresAt: '2026-09-28T21:00:00.000Z',
    },
    synapseSigner
  );
  const legacyAction = { ...action, actionId: 'action-legacy' };
  const legacyReceipt = await legacyGate.authorize(
    requestPayload,
    legacyAction,
    authority,
    legacyEnvelope,
    legacyAtt,
    now,
    'receipt-legacy'
  );
  assert.equal(legacyReceipt.decision, 'GRANTED');
  assert.equal(legacyReceipt.coreSignature, undefined);
  const legacyExec = await legacyGate.execute(legacyReceipt, legacyAction, authority, now, () => {});
  assert.equal(legacyExec.executed, true, 'legacy path without CORE seal still works');
  console.log('  PASS  legacy gate without coreSigner remains compatible');

  console.log('\nPhase 2 keys-bound checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
