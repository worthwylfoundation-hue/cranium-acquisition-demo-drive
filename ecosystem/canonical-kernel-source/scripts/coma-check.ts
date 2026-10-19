import assert from 'node:assert/strict';

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { ComaActionFrozenError, ComaController, ComaTransitionError } from '../src/kernel/coma';



const dir = mkdtempSync(join(tmpdir(), 'cranium-coma-'));

const controller = new ComaController(join(dir, 'coma.ndjson'), join(dir, 'coma.snapshot.json'));



try {
  
  assert.equal(controller.getState(), 'NORMAL');
  
  controller.requestContainment('operator-1', 'Integrity anomaly detected');
  
  controller.activate('operator-1');
  
  assert.equal(controller.getState(), 'ACTIVE');
  

  
  assert.throws(() => controller.assertExternalActionAllowed('send connector request'), ComaActionFrozenError);
  
  assert.throws(() => controller.transition('NORMAL', 'operator-1', 'bypass'), ComaTransitionError);
  
  controller.recordEvidence('incident.log', 'captured from local containment buffer');
  
  const snapshot = controller.createSnapshot();
  
  assert.equal(snapshot.state, 'ACTIVE');
  
  assert.ok(snapshot.digest.length === 64);
  

  
  const diagnostics = controller.diagnostics();
  
  assert.equal(diagnostics.externalActionsFrozen, true);
  
  assert.equal(diagnostics.integrity, 'INTACT');
  
  assert.equal(diagnostics.evidenceCount, 1);
  

  
  assert.throws(() => controller.authorizeResume('operator-1', ''), ComaTransitionError);
  
  controller.authorizeResume('approver-1', 'approval-2026-09-16-001');
  
  controller.completeResume('operator-1');
  
  assert.equal(controller.getState(), 'NORMAL');
  
  controller.assertExternalActionAllowed('reversible post-resume action');
  

  
  const restarted = new ComaController(join(dir, 'coma.ndjson'), join(dir, 'coma.snapshot.json'));
  
  assert.equal(restarted.verifyIntegrity(), true);
  
  assert.equal(JSON.parse(readFileSync(join(dir, 'coma.snapshot.json'), 'utf8')).id, snapshot.id);
  
  console.log('Coma conformance checks passed');
  
} finally {
  
  rmSync(dir, { recursive: true, force: true });
  
}































