#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const workspace = path.resolve(process.env.ECOSYSTEM_ROOT ?? path.join(process.cwd(), '..'));
const expected = [
  { name: 'cranium-kernel', kind: 'node', workflow: '.github/workflows/ci-typescript.yml' },
  { name: 'Cranium-Core-', kind: 'android', workflow: '.github/workflows/android-ci.yml' },
  { name: 'cranium-hardened-core', kind: 'node', workflow: '.github/workflows/ci.yml' },
  { name: 'cranium-diligence-workbench', kind: 'node', workflow: '.github/workflows/ci.yml' },
  { name: 'cranium-operator-os', kind: 'node', workflow: '.github/workflows/ci.yml' },
  { name: 'cranium-provider-integrations', kind: 'node', workflow: '.github/workflows/ci.yml' },
  { name: 'worthwyl-forge', kind: 'node', workflow: '.github/workflows/ci.yml' },
  { name: 'worthwyl-game-changer', kind: 'node', workflow: '.github/workflows/quality-gate.yml' },
  { name: 'cranium-acquisition-template', kind: 'node', workflow: '.github/workflows/ci.yml' },
];

const failures = [];
const statuses = [];
for (const repo of expected) {
  const root = path.join(workspace, repo.name);
  const exists = fs.existsSync(root);
  const workflow = path.join(root, repo.workflow);
  const hasWorkflow = fs.existsSync(workflow);
  const hasManifest = repo.kind === 'node'
    ? fs.existsSync(path.join(root, 'package.json'))
    : fs.existsSync(path.join(root, 'settings.gradle.kts'));
  const status = !exists ? 'NOT_PRESENT' : !hasWorkflow || !hasManifest ? 'FAIL' : 'READY_FOR_CI';
  statuses.push({ repo: repo.name, kind: repo.kind, status });
  if (status === 'FAIL') failures.push(`${repo.name}: missing ${!hasWorkflow ? repo.workflow : repo.kind === 'node' ? 'package.json' : 'settings.gradle.kts'}`);
}

const iosEvidence = fs.existsSync(path.join(workspace, 'ios')) ||
  fs.existsSync(path.join(workspace, 'Cranium-Core-', 'ios')) ||
  fs.existsSync(path.join(workspace, 'cranium-kernel', 'ios'));
console.log(`ECOSYSTEM_ROOT ${workspace}`);
for (const row of statuses) console.log(`${row.status}\t${row.kind}\t${row.repo}`);
console.log(`IOS_STATUS\t${iosEvidence ? 'TARGET_PRESENT' : 'NOT_ESTABLISHED'}`);
if (failures.length) {
  console.error(`RELEASE_MATRIX_FAIL ${failures.length} issue(s)`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`RELEASE_MATRIX_PASS repositories=${statuses.length} ios=${iosEvidence ? 'present' : 'not-established'}`);
