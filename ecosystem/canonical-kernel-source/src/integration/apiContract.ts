import type { EnterpriseAuthorityRequest } from './enterpriseBoundary';

export const CRANIUM_API_VERSION = 'v1' as const;
export const CRANIUM_API_ROUTES = Object.freeze({
  authorityRequest: '/v1/authority/requests',
  authorityValidate: '/v1/authority/validate',
  authorityExecute: '/v1/authority/execute',
  sessionState: '/v1/sessions/:sessionId/state',
  receipts: '/v1/receipts/:receiptId',
  health: '/healthz',
  readiness: '/readyz',
});
export interface EnterpriseApiRequest { body: EnterpriseAuthorityRequest; authorization: string; }
export interface EnterpriseApiError { error: string; code: string; correlationId?: string; }

export interface EnterpriseApiSuccess<T> { ok: true; correlationId: string; data: T; }
export interface EnterpriseHealthResponse { status: 'ok' | 'ready'; protocolVersion: typeof CRANIUM_API_VERSION; authority: 'cranium-kernel'; }
