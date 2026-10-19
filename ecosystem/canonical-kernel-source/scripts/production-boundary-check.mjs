#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Kernel-only by default. Optional ECOSYSTEM_ROOT remains for explicit multi-repo audits.
const root = path.resolve(process.env.ECOSYSTEM_ROOT ?? process.cwd());
const excluded = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'docs', 'tests', 'test', 'fixtures', 'examples', 'demo', 'demos', '__tests__']);
const excludedRoots = new Set([
  'cranium-substrate-simulator',
  'worthwyl-forge',
  'cranium-cognitive-core',
  'cranium-archive',
  'cognitive-substrate-governance-ecosystem',
  'scripts',
  'tools',
]);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.kt', '.java', '.go', '.rs', '.json', '.yaml', '.yml']);
const patterns = [
  /\bMock\w*/,
  /\bFake\w*/,
  /\bStub\w*/,
  /UNSIGNED_LOCAL_RECEIPT/,
  /CRYPTOGRAPHICALLY_VERIFIED/,
  /VERIFIED_FORMAL_GATE/,
  /fixture:unverified/i,
  /\b(?:simulate|simulated|simulation)\s*(?:as|=|->)\s*execution\b/i,
  /\b(?:dummy|sample data)\b/i,
];
const findings = [];

function isHarnessScript(name) {
  return (
    name.endsWith('-check.ts') ||
    name.endsWith('-check.mjs') ||
    name.endsWith('-check.js') ||
    name.endsWith('-matrix.ts') ||
    name.endsWith('-vectors.ts') ||
    name === 'production-boundary-check.mjs'
  );
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name) || (dir === root && excludedRoots.has(entry.name))) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (isHarnessScript(entry.name) || entry.name.startsWith('clean-') || entry.name.startsWith('null-')) continue;
    else if (extensions.has(path.extname(entry.name))) {
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        if (patterns.some((pattern) => pattern.test(line))) findings.push(`${path.relative(root, full)}:${index + 1}:${line.trim()}`);
      });
    }
  }
}

walk(root);
if (findings.length) {
  console.error(`PRODUCTION_BOUNDARY_FAIL ${findings.length} finding(s)`);
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log(`PRODUCTION_BOUNDARY_PASS root=${root}`);
