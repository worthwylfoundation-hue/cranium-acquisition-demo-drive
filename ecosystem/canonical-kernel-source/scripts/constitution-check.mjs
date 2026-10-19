#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const constitution = path.join(root, 'docs', 'CRANIUM_CONSTITUTION_V1.md');
const engine = path.join(root, 'src', 'kernel', 'engine.ts');
const authorityProxy = path.join(root, 'src', 'authority', 'authorityProxy.ts');
const sqliteStore = path.join(root, 'src', 'authority', 'sqliteAuthorityStore.ts');
const contract = path.join(root, 'docs', 'CANONICAL_SEMANTIC_CONTRACT.md');
const failures = [];
const read = (file) => fs.readFileSync(file, 'utf8');

if (!fs.existsSync(constitution)) failures.push('missing docs/CRANIUM_CONSTITUTION_V1.md');
if (!fs.existsSync(engine)) failures.push('missing canonical authority engine');
if (!fs.existsSync(authorityProxy)) failures.push('missing canonical authority proxy');
if (!fs.existsSync(sqliteStore)) failures.push('missing durable authority store');
if (!fs.existsSync(contract)) failures.push('missing canonical semantic contract');

let engineProofCount = 0;
let directiveCount = 0;

if (!failures.length) {
  const constitutionText = read(constitution);
  const engineText = read(engine);
  const proxyText = read(authorityProxy);
  const storeText = read(sqliteStore);
  const contractText = read(contract);
  const requiredDirectives = [
    'Authority is singular',
    'Cognition is not permission',
    'Fail closed',
    'Durable truth outranks transient state',
    'No replayed authority',
    'Evidence remains bound',
    'Canon over convenience',
    'Human intent and identity are sovereign constraints',
  ];
  for (const directive of requiredDirectives) {
    if (!constitutionText.includes(`### Prime Directive`) || !constitutionText.includes(directive)) {
      failures.push(`missing constitutional directive: ${directive}`);
    } else {
      directiveCount += 1;
    }
  }

  const requiredEngineProofs = [
    ['canonical request hashing', 'CanonicalEncoder.hashRequest'],
    ['replay inspection', 'replayGuard.check'],
    ['boundary validation', 'this.boundaryValidator.validate'],
    ['failed-boundary denial', "type: 'Denied'"],
    ['deterministic transition identity', 'request.timestamp'],
    ['receipt integrity binding', 'receiptSignature'],
    ['durable reducer boundary', 'KernelStateReducer'],
    ['constitutional transition assertion', 'assertConstitutionalTransition'],
  ];
  for (const [label, marker] of requiredEngineProofs) {
    if (!engineText.includes(marker)) {
      failures.push(`engine proof missing: ${label} (${marker})`);
    } else {
      engineProofCount += 1;
    }
  }

  for (const [label, marker] of [
    ['proxy delegates receipt verification', 'return this.store.verifyReceipt(receipt)'],
    ['journal receipt transaction binding', 'row.transaction_id === receipt.transactionId'],
    ['journal receipt request binding', 'transition.requestHash.hexDigest === receipt.requestHash'],
    ['journal receipt decision binding', 'transition.decision.type === receipt.decision'],
    ['receipt recomputes canonical request hash', 'CanonicalEncoder.hashRequest(request).hexDigest'],
    ['receipt recomputes integrity signature', 'expectedReceiptSignature'],
  ]) {
    const source = label.startsWith('proxy') ? proxyText : storeText;
    if (!source.includes(marker)) failures.push(`receipt proof missing: ${label} (${marker})`);
  }

  if (!contractText.includes('sole authority evaluator')) failures.push('canonical contract does not identify the sole authority evaluator');
  if (!contractText.includes('fail closed')) failures.push('canonical contract does not state fail-closed behavior');
}

console.log(`CONSTITUTION_ROOT ${root}`);
if (failures.length) {
  console.error(`CONSTITUTION_FAIL ${failures.length} finding(s)`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`CONSTITUTION_PASS directives=${directiveCount} engine_proofs=${engineProofCount} contract_alignment=pass`);
