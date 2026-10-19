import assert from 'node:assert/strict';
import {
  KeyManager,
  MemoryKeyCustodyStore,
  TrustedKeyRegistry,
  type PublicKeyRegistrySnapshot,
} from '../src/governance/index';

const NOW = '2026-09-28T20:00:00.000Z';
const GRACE = '2026-09-28T20:30:00.000Z';

async function expectReject(action: Promise<unknown>, message: string): Promise<void> {
  await assert.rejects(action, new RegExp(message));
}

const store = new MemoryKeyCustodyStore();
const registry = new TrustedKeyRegistry();
const manager = new KeyManager(registry, store);
await manager.initialize();

const core = await manager.register({ keyId: 'core-001', subject: 'CORE', validFrom: NOW });
assert.equal(core.status, 'ACTIVE');
assert.equal(manager.snapshot().keys.length, 1);
assert.equal(manager.snapshot().audit.length, 1);
await expectReject(
  manager.register({ keyId: 'core-001', subject: 'CORE', validFrom: NOW }),
  'KEY_ALREADY_REGISTERED'
);

const signed = await manager.sign('core-001', 'receipt-hash-001', NOW);
assert.equal((await manager.verify(signed, NOW)).valid, true);
await expectReject(manager.sign('core-001', 'x', '2026-09-28T19:59:59.000Z'), 'KEY_OUTSIDE_SIGNING_WINDOW');

const rotated = await manager.rotate({
  previousKeyId: 'core-001',
  newKeyId: 'core-002',
  rotatedAt: NOW,
  graceUntil: GRACE,
});
assert.equal(rotated.status, 'ACTIVE');
assert.equal(manager.get('core-001')?.status, 'GRACE');
assert.equal(manager.get('core-001')?.validUntil, GRACE);
await expectReject(manager.sign('core-001', 'old-signature', NOW), 'KEY_NOT_SIGNING_ACTIVE');
const oldVerification = await manager.verify(signed, '2026-09-28T20:15:00.000Z');
assert.equal(oldVerification.valid, true);
const expiredGrace = await manager.verify(signed, '2026-09-28T20:30:00.000Z');
assert.equal(expiredGrace.valid, false);
assert.equal(expiredGrace.reason, 'KEY_OUTSIDE_VALIDITY_WINDOW');

await expectReject(
  manager.rotate({
    previousKeyId: 'core-001',
    newKeyId: 'core-003',
    rotatedAt: NOW,
    graceUntil: '2026-09-28T20:00:00.000Z',
  }),
  'PREVIOUS_KEY_NOT_ACTIVE'
);

await expectReject(
  manager.register({ keyId: 'bad id', subject: 'GATEWAY', validFrom: NOW }),
  'INVALID_KEY_ID'
);

await manager.revoke('core-002', '2026-09-28T20:10:00.000Z');
assert.equal(manager.get('core-002')?.status, 'REVOKED');
await expectReject(manager.sign('core-002', 'revoked', NOW), 'KEY_NOT_SIGNING_ACTIVE');
const revokedVerification = await manager.verify(
  { ...signed, keyId: 'core-002' },
  '2026-09-28T20:10:01.000Z'
);
assert.equal(revokedVerification.valid, false);
const roleMismatch = await manager.verify(
  { ...signed, keyId: 'core-002', subject: 'GATEWAY' },
  '2026-09-28T20:10:01.000Z'
);
assert.equal(roleMismatch.valid, false);
assert.equal(roleMismatch.reason, 'KEY_ROLE_MISMATCH');

const isolatedStore = new MemoryKeyCustodyStore();
const isolatedManager = new KeyManager(new TrustedKeyRegistry(), isolatedStore);
await isolatedManager.initialize();
await isolatedManager.register({ keyId: 'isolated-001', subject: 'CORE', validFrom: NOW });
const publicOnly = isolatedManager.snapshot();
const freshManager = new KeyManager(new TrustedKeyRegistry(), isolatedStore);
await freshManager.initialize();
await expectReject(freshManager.sign('isolated-001', 'no-private-key', NOW), 'PRIVATE_KEY_NOT_IN_CUSTODY');
assert.equal(publicOnly.keys.some((key) => 'privateKey' in key), false);

const snapshot = manager.snapshot();
assert.equal(snapshot.version, 1);
assert.equal(snapshot.audit.length, 3);
for (let i = 1; i < snapshot.audit.length; i += 1) {
  assert.equal(snapshot.audit[i].previousHash, snapshot.audit[i - 1].eventHash);
}
const reloaded = new KeyManager(new TrustedKeyRegistry(), store);
await reloaded.initialize();
assert.deepEqual(reloaded.snapshot(), snapshot);

const privateKeyIsolation = await expectReject(
  reloaded.sign('core-001', 'cross-process', NOW),
  'KEY_NOT_SIGNING_ACTIVE'
);
void privateKeyIsolation;

const activeReloaded = await reloaded.sign('core-002', 'should-fail', NOW).catch((error: Error) => error);
assert.match(String(activeReloaded), /KEY_NOT_SIGNING_ACTIVE/);

const tampered: PublicKeyRegistrySnapshot = structuredClone(snapshot);
tampered.audit[1].previousHash = 'sha256:tampered';
const tamperedStore = new MemoryKeyCustodyStore();
await tamperedStore.save(tampered);
await expectReject(
  new KeyManager(new TrustedKeyRegistry(), tamperedStore).initialize(),
  'KEY_AUDIT_CHAIN_INVALID'
);

console.log('✅ double-register blocked');
console.log('✅ rotation creates ACTIVE key and GRACE predecessor');
console.log('✅ GRACE keys verify only inside grace and cannot sign');
console.log('✅ revoked keys fail closed');
console.log('✅ role/key-id validation enforced');
console.log('✅ audit chain linkage verified and tamper rejected');
console.log('✅ public registry reloads without private-key material');
console.log('KEY MANAGER VERIFICATION: PASS');
