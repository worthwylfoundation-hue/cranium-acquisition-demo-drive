import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  canonicalJson,
  createSigningRoot,
  digest,
  issueCapability,
  signObject,
  verifyCapability,
  verifyObject,
} from '../src/trust/commandTrust';

const root = createSigningRoot();
const artifact = {
  stage: 'cranium-kernel',
  artifact: 'cranium-kernel',
  digest: digest({ commit: '25d4da3445a073042ff570d0b056cfbeab9970f1' }),
  signerKeyId: root.keyId,
};
const link = {
  ...artifact,
  signature: signObject(root.privateKey, artifact),
};
assert.equal(verifyObject(root.publicKey, artifact, link.signature), true);
assert.equal(
  verifyObject(root.publicKey, { ...artifact, digest: 'tampered' }, link.signature),
  false,
);

const capability = issueCapability(root.privateKey, root.keyId, {
  capabilityId: 'cap.command.write',
  subjectId: 'operator',
  action: 'WRITE',
  scope: 'cranium://command/workspace/*',
  riskCeiling: 0.5,
  issuedAt: Date.now() - 1000,
  expiresAt: Date.now() + 60_000,
});
assert.equal(verifyCapability(root.publicKey, capability), true);
assert.equal(
  verifyCapability(root.publicKey, { ...capability, scope: 'cranium://command/*' }),
  false,
);

const second = generateKeyPairSync('ed25519');
assert.equal(
  verifyCapability(second.publicKey, capability),
  false,
);

const manifest = {
  version: 'cranium-trust-v1',
  product: 'cranium-command-os',
  generatedAt: Date.now(),
  rootKeyId: root.keyId,
  links: [link],
};
const manifestSignature = signObject(root.privateKey, manifest);
assert.equal(verifyObject(root.publicKey, manifest, manifestSignature), true);
assert.equal(typeof canonicalJson(manifest), 'string');

console.log('PASS software trust root');
console.log('PASS signed boot-chain link verification primitive');
console.log('PASS signed capability issuance and verification');
console.log('PASS capability tamper rejection');
console.log('PASS foreign-key rejection');
console.log('PASS signed manifest verification');
