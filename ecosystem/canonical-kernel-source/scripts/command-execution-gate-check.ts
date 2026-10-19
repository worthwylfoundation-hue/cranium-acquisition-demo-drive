import assert from 'node:assert/strict';
import { unlinkSync, existsSync } from 'node:fs';
import { createInitialKernelState } from '../src/data/initialState';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import {
  CommandExecutionGate,
  verifyExecutionReceipt,
} from '../src/authority/commandExecutionGate';
import type { CapabilityGrant } from '../src/authority/capabilityAuthority';
import { AuthorityClass } from '../src/kernel/types';

const db = `${process.env.HOME}/.cache/cranium-command-gate-check.sqlite`;
for (const suffix of ['', '-wal', '-shm']) {
  const path = db + suffix;
  if (existsSync(path)) unlinkSync(path);
}

const state = createInitialKernelState();
const store = new SQLiteAuthorityStore(db, state);
const kernel = new KernelAuthorityProxy(store);
const capability: CapabilityGrant = {
  version: 'capability-v1',
  capabilityId: 'cap-command-gate-check',
  subjectId: 'atom-dir-001',
  action: 'EXECUTE',
  scope: 'cranium://command/*',
  riskCeiling: 0.5,
  grantor: 'cranium-kernel',
  issuedAt: 0,
  expiresAt: 1000,
};
const gate = new CommandExecutionGate({ kernel, capabilities: [capability] });

const request = {
  requestId: 'command-gate-check',
  idempotencyKey: 'command-gate-check',
  subjectId: 'atom-dir-001',
  requestedAuthority: state.atomsById['atom-dir-001'].authority,
  evidence: [{ id: 'command-gate-evidence', uri: 'test://command-gate/evidence', sha256Digest: 'a'.repeat(64), verified: true, description: 'verified command-gate regression evidence' }],
  justification: 'command execution gate verification',
  requesterId: 'atom-dir-001',
  timestamp: 100,
  targetAuthorityVersion: state.authorityVersion,
  namespace: 'cranium-command',
};

const command = {
  commandId: 'cmd-check-001',
  subject: {
    namespace: 'cranium-command',
    subjectId: 'atom-dir-001',
    issuer: 'cranium-kernel',
  },
  action: 'EXECUTE' as const,
  resource: 'cranium://command/check',
  risk: 0.2,
  now: 100,
  request,
};

let executed = false;
const success = gate.execute(command, () => {
  executed = true;
  return { status: 'executed', value: 7 };
});
assert.equal(executed, true);
const expectedBinding = {
  commandId: command.commandId,
  capabilityId: capability.capabilityId,
  resource: command.resource,
  action: command.action,
  executedAt: command.now,
};
assert.equal(verifyExecutionReceipt(success.receipt, success.result, kernel, expectedBinding), true);
assert.equal(verifyExecutionReceipt(success.receipt, { status: 'tampered', value: 7 }, kernel, expectedBinding), false);
assert.equal(verifyExecutionReceipt({ ...success.receipt, resource: 'cranium://secrets/delete' }, success.result, kernel, expectedBinding), false,
  'execution receipt metadata must match independently supplied expected command context');

let expiredBlocked = false;
try {
  gate.execute({ ...command, commandId: 'cmd-expired', now: 1000, request: { ...command.request, requestId: 'command-expired', idempotencyKey: 'command-expired' } }, () => 'should-not-run');
} catch (error) {
  expiredBlocked = String(error).includes('CAPABILITY_EXPIRED');
}
assert.equal(expiredBlocked, true);

let scopeBlocked = false;
try {
  gate.execute({ ...command, commandId: 'cmd-scope', resource: 'cranium://other/check' }, () => 'should-not-run');
} catch (error) {
  scopeBlocked = String(error).includes('CAPABILITY_NOT_FOUND');
}
assert.equal(scopeBlocked, true);

let foreignIssuerBlocked = false;
try {
  gate.execute({
    ...command,
    commandId: 'cmd-foreign',
    subject: { ...command.subject, issuer: 'foreign-component' },
  }, () => 'should-not-run');
} catch (error) {
  foreignIssuerBlocked = String(error).includes('canonical authority issuer');
}
assert.equal(foreignIssuerBlocked, true);

let deniedHandlerRan = false;
let deniedAuthorityBlocked = false;
const deniedRequest = {
  ...command.request,
  requestId: 'command-denied-authority',
  idempotencyKey: 'command-denied-authority',
  requestedAuthority: { authorityClass: AuthorityClass.SYSTEM, weight: 1 },
};
try {
  gate.execute({ ...command, commandId: 'cmd-denied-authority', request: deniedRequest }, () => {
    deniedHandlerRan = true;
    return { status: 'must-not-run' };
  });
} catch (error) {
  deniedAuthorityBlocked = String(error).includes('canonical authority receipt denied execution');
}
assert.equal(deniedAuthorityBlocked, true, 'a valid but denied authority receipt must block execution');
assert.equal(deniedHandlerRan, false, 'handler must not run when Kernel decision is Denied');

const deniedReceipt = kernel.commit({
  ...deniedRequest,
  requestId: 'command-denied-receipt-verification',
  idempotencyKey: 'command-denied-receipt-verification',
});
assert.equal(deniedReceipt.decision, 'Denied');
assert.equal(kernel.verifyReceipt(deniedReceipt), true, 'denial receipt itself is valid evidence');
assert.equal(verifyExecutionReceipt({ ...success.receipt, authorityReceipt: deniedReceipt }, success.result, kernel, expectedBinding), false,
  'denied authority receipt must never validate as successful execution');

console.log('COMMAND_EXECUTION_GATE_SUMMARY: PASS law=required capability=required canonical-receipt=verified result-binding=verified replay-safe=verified expired=blocked scope=blocked foreign-issuer=blocked denied-authority=blocked');
store.load();
for (const suffix of ['', '-wal', '-shm']) {
  const path = db + suffix;
  if (existsSync(path)) unlinkSync(path);
}
