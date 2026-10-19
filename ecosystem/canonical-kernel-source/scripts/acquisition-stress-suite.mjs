import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const tsx = './node_modules/tsx/dist/cli.mjs';
const cases = [
  { id: 'ASS-01', name: 'Authority Boundary Stress Test', command: ['node', tsx, 'scripts/authority-boundary-adversarial-check.ts'] },
  { id: 'ASS-02', name: 'Replay Attack Simulation', command: ['node', tsx, 'scripts/authority-denial-semantics-check.ts'] },
  { id: 'ASS-03', name: 'Cognitive Drift Pressure Test', command: ['node', tsx, 'scripts/constitution-runtime-check.ts'] },
  { id: 'ASS-04', name: 'Subconscious Noise Flood', command: ['node', tsx, 'scripts/cognitive-subconscious-check.ts'] },
  { id: 'ASS-05', name: 'Semantic Governance Adversarial Test', command: ['node', tsx, 'scripts/constitution-check.mjs'] },
  { id: 'ASS-06', name: 'Attestation Ring Integrity Test', command: ['node', tsx, 'scripts/synapse-integration-check.ts'] },
  { id: 'ASS-07', name: 'Hardened Core Load Test', command: ['node', tsx, 'scripts/authority-boundary-adversarial-check.ts'] },
  { id: 'ASS-08', name: 'Substrate Reproduction Stress Test', command: ['node', tsx, 'scripts/conformance-vectors.ts'] },
  { id: 'ASS-09', name: 'Governance Boundary Saturation Test', command: ['node', tsx, 'scripts/command-law-check.ts'] },
  { id: 'ASS-10', name: 'Semantic Drift Containment Test', command: ['node', tsx, 'scripts/constitution-runtime-check.ts'] },
  { id: 'ASS-11', name: 'Subconscious-to-Surface Isolation Test', command: ['node', tsx, 'scripts/cognitive-subconscious-check.ts'] },
  { id: 'ASS-12', name: 'Provenance Chain Saturation Test', command: ['node', tsx, 'scripts/miracle-memory-check.ts'] },
  { id: 'ASS-13', name: 'Operator OS Stability Test', command: ['node', tsx, 'scripts/command-execution-gate-check.ts'] },
  { id: 'ASS-14', name: 'Runtime Orchestration Boundary Test', command: ['node', tsx, 'scripts/distributed-session-authority-check.ts'] },
];

const results = cases.map((entry) => {
  if (!entry.command) {
    return { id: entry.id, name: entry.name, status: 'NOT_EXECUTED', exitCode: null, reason: entry.reason };
  }
  const started = Date.now();
  const run = spawnSync(entry.command[0], entry.command.slice(1), { encoding: 'utf8' });
  return {
    id: entry.id,
    name: entry.name,
    status: run.status === 0 ? 'PASSED' : 'FAILED',
    exitCode: run.status,
    durationMs: Date.now() - started,
    command: entry.command.join(' '),
    stderrTail: (run.stderr || '').slice(-400),
  };
});

const executed = results.filter((r) => r.status === 'PASSED' || r.status === 'FAILED');
const passed = results.filter((r) => r.status === 'PASSED').length;
const failed = results.filter((r) => r.status === 'FAILED').length;
const notExecuted = results.filter((r) => r.status === 'NOT_EXECUTED').length;
const summary = {
  suite: 'Convertible Cranium Acquisition Stress Suite',
  version: '1.1',
  pass: failed === 0 && notExecuted === 0,
  passed,
  failed,
  notExecuted,
  results,
  note: 'Exit 0 only if every case executed and passed. A catalog digest is not a result.',
};
summary.suiteDigest = createHash('sha256').update(JSON.stringify(results.map(({ id, status, exitCode }) => ({ id, status, exitCode })))).digest('hex');
console.log(JSON.stringify(summary, null, 2));
if (!summary.pass) process.exit(2);
