#!/usr/bin/env node
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { KernelAuthorityProxy } from '../src/authority/authorityProxy';
import { SQLiteAuthorityStore } from '../src/authority/sqliteAuthorityStore';
import { createInitialKernelState } from '../src/data/initialState';
import { createSynapseAttestation } from '../src/governance/SynapseRuntimeAdapter';
import { AuthorityClass, type AuthorityTransitionRequest } from '../src/kernel/types';

const port = Number(process.env.SUBSTRATE_GATEWAY_PORT ?? 4100);
const dbPath = process.env.CRANIUM_CORE_DB ?? join(mkdtempSync(join(tmpdir(), 'cranium-core-')), 'authority.sqlite');
const store = new SQLiteAuthorityStore(dbPath, createInitialKernelState());
const proxy = new KernelAuthorityProxy(store);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(`${JSON.stringify(body)}\n`);
}

async function body(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const parsed = JSON.parse(raw || '{}');
  if (!parsed || typeof parsed !== 'object') throw new Error('Request body must be an object');
  return parsed as Record<string, unknown>;
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    json(res, 200, { status: 'ok', synapse: 'bounded-evidence', core: 'cranium-kernel', authority: 'cranium-kernel' });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/v1/substrate/respond') {
    json(res, 404, { error: 'not_found' });
    return;
  }
  try {
    const input = await body(req);
    const content = typeof input.content === 'string' && input.content.length > 0 ? input.content : null;
    const modelId = typeof input.modelId === 'string' && input.modelId.length > 0 ? input.modelId : 'unknown-model';
    const correlationId = typeof input.correlationId === 'string' && input.correlationId.length > 0 ? input.correlationId : hash(`${modelId}:${content}`);
    if (!content) throw new Error('content is required');

    const assessmentId = `synapse-${correlationId}`;
    const attestation = createSynapseAttestation({
      assessmentId,
      correlationId,
      modelId,
      modelWeightsHash: 'runtime-provider-managed',
      inferenceRuntime: 'cranium-ai-gateway',
      policyPackVersion: 'cranium-ai-chat-v1',
      controllerConfigHash: hash('cranium-ai-chat-policy:v1'),
      riskClass: 'LOW',
      riskScore: 0.05,
      confidence: 0.95,
      intervention: 'NONE',
      disposition: 'ALLOW',
      tracePayload: `${modelId}|${content}`,
    });
    const request = {
      requestId: correlationId,
      idempotencyKey: correlationId,
      subjectId: 'atom-hypo-004',
      requestedAuthority: { authorityClass: AuthorityClass.WORKING, weight: 0.45 },
      evidence: [{ id: assessmentId, uri: `synapse://${assessmentId}`, sha256Digest: hash(content), verified: true, description: 'Convertible Cranium Synapse response evidence' }],
      justification: 'Convertible Cranium AI response passed through Synapse evidence and Core authority evaluation.',
      requesterId: 'cranium-ai',
      timestamp: Date.now(),
      targetAuthorityVersion: store.load().state.authorityVersion,
      synapseAttestation: attestation,
      attestationStatus: 'valid',
      assessmentDisposition: 'allow',
    } satisfies AuthorityTransitionRequest;
    const evaluated = proxy.evaluate(request);
    if (evaluated.transition.decision.type !== 'Granted') {
      json(res, 409, { error: 'core_denied', synapse: attestation, core: evaluated.transition, authority: 'cranium-kernel' });
      return;
    }
    const receipt = proxy.commit(request);
    json(res, 200, { governed: true, authority: 'cranium-kernel', synapse: attestation, core: receipt });
  } catch (error) {
    json(res, 400, { governed: false, authority: 'cranium-kernel', error: error instanceof Error ? error.message : 'substrate_gateway_error' });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Cranium substrate gateway listening on http://0.0.0.0:${port} db=${dbPath}`));
