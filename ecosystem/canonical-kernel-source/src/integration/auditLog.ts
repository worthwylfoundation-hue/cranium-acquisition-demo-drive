import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type CraniumAuditEvent = {
  event: string;
  timestamp: string;
  correlationId: string;
  tenantId?: string;
  principalId?: string;
  sessionId?: string;
  action?: string;
  tool?: string;
  decision?: 'ALLOW' | 'DENY' | 'ERROR';
  receiptId?: string;
  sessionEpoch?: number;
  outcome?: string;
  evidenceDigest?: string;
};

const sink = process.env.CRANIUM_AUDIT_FILE ?? './runtime/audit/cranium-audit.ndjson';

export async function emitAuditEvent(event: CraniumAuditEvent): Promise<void> {
  await mkdir(dirname(sink), { recursive: true });
  await appendFile(sink, JSON.stringify(event) + '\n', 'utf8');
}
