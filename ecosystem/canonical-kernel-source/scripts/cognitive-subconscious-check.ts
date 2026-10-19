import { CognitiveSubconsciousController } from '../src/authority/cognitiveSubconscious';
import type { AuthorityProxy, CanonicalReceipt } from '../src/authority/authorityProxy';
import type { AuthorityTransitionRequest } from '../src/kernel/types';

let commits = 0;
const fakeProxy: AuthorityProxy = {
  authority: 'cranium-kernel',
  evaluate() { throw new Error('NOT_USED'); },
  commit(request: AuthorityTransitionRequest): CanonicalReceipt {
    commits++;
    if (request.namespace !== 'authority-plane-v1') throw new Error('WRONG_BOUNDARY');
    return { authority: 'cranium-kernel', transactionId: `tx-${commits}`, requestHash: 'a'.repeat(64), journalSequence: commits, stateHash: 'b'.repeat(64), decision: 'Granted' };
  },
  verifyReceipt() { return true; },
};

const c = new CognitiveSubconsciousController({ maxRuntimeMs: 1000, maxToolCalls: 2, maxNetworkCalls: 1, maxMemoryBytes: 1024 });
const artifact = c.observe({ cognitionId: 'c1', subjectId: 's1', kind: 'CANDIDATE_ACTION', content: 'candidate', provenance: [{ source: 'test', observedAt: Date.now() }] });
if (artifact.state !== 'OBSERVING') throw new Error('OBSERVE_FAILED');
try { c.advance('c1', 'READY_FOR_AUTHORITY', { runtimeMs: 1001, toolCalls: 0, networkCalls: 0, memoryBytes: 0 }); throw new Error('BUDGET_BYPASS'); } catch (e) { if (!(e instanceof Error) || e.message !== 'COGNITIVE_BUDGET_RUNTIME_EXCEEDED') throw e; }
c.advance('c1', 'CHALLENGING', { runtimeMs: 10, toolCalls: 1, networkCalls: 0, memoryBytes: 100 });
c.advance('c1', 'READY_FOR_AUTHORITY', { runtimeMs: 20, toolCalls: 1, networkCalls: 0, memoryBytes: 100 });
const prepared = c.prepareAuthorization({ cognitionId: 'c1', action: 'WRITE', resource: 'repo/test', requestedCapability: 'repo.write', nonce: 'n1', evidenceIds: ['e1'] });
if (commits !== 0) throw new Error('SELF_AUTHORIZED');
const snapshot = c.snapshot();
const restored = new CognitiveSubconsciousController(snapshot.budget);
restored.restore(snapshot);
if (restored.get('c1')?.contentHash !== artifact.contentHash) throw new Error('RECOVERY_FAILED');
const receipt = restored.authorize(prepared, fakeProxy, 1);
if (commits !== 1 || receipt.authority !== 'cranium-kernel') throw new Error('CANONICAL_AUTHORIZATION_FAILED');
console.log('COGNITIVE_SUBCONSCIOUS_RUNTIME_SUMMARY: PASS bounded-cognition recovery integrity canonical-authority-boundary');
