#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const tracked = [
  'docs/CANONICAL_SEMANTIC_CONTRACT.json',
  'docs/CRANIUM_AUTHORITY_PROTOCOL_V1.md',
  'docs/CRANIUM_CONSTITUTION_V1.md',
  'docs/RELEASE_MATRIX.md',
  'src/kernel/constitution.ts',
  'src/authority/authorityProxy.ts',
  'src/authority/sqliteAuthorityStore.ts',
  'scripts/authority-boundary-adversarial-check.ts',
  'scripts/constitution-runtime-check.ts',
  'scripts/conformance-vectors.ts',
];
const hashFile = (relative) => createHash('sha256').update(readFileSync(path.join(root, relative))).digest('hex');
const files = tracked.filter((relative) => existsSync(path.join(root, relative))).map((relative) => ({ path: relative, sha256: hashFile(relative) }));
const manifest = {
  schema: 'cranium-evidence-manifest-v1',
  authority: 'cranium-kernel',
  statement: 'Cognition may come from anywhere. Authority comes only through Cranium.',
  constitutionVersion: '1.0.0',
  protocol: 'cranium-authority-protocol',
  files,
  limitations: [
    'A manifest proves the listed bytes and does not constitute an independent security audit.',
    'CI execution proves the declared checks ran under their declared environment; it does not prove absence of vulnerabilities.',
    'Production key custody, rotation, revocation, and external deployment controls remain separate diligence items.',
  ],
};
const output = process.env.EVIDENCE_MANIFEST_OUTPUT ?? 'evidence-manifest.json';
writeFileSync(path.join(root, output), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`EVIDENCE_MANIFEST_PASS files=${files.length} output=${output}`);
