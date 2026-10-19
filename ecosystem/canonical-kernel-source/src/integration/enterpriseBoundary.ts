import type { AuthorityRequestV1 } from '../authority/authorityRequestV1';
import { toKernelAuthorityRequest } from '../authority/authorityRequestV1';
import type { AuthorityTransitionRequest } from '../kernel/types';
import { assertCommandLawRequest } from '../kernel/commandLaw';

export const ENTERPRISE_PROTOCOL_VERSION = 'enterprise-integration-v1' as const;
export const ENTERPRISE_NAMESPACE_PREFIX = 'enterprise:';

export interface EnterprisePrincipal {
  tenantId: string;
  principalId: string;
  issuer: string;
  authMethod: 'OIDC' | 'OAUTH2' | 'MTLS' | 'API_KEY' | 'SERVICE_IDENTITY';
  scopes: readonly string[];
}

export interface EnterpriseRequestContext {
  principal: EnterprisePrincipal;
  correlationId: string;
}

export interface EnterpriseAuthorityRequest {
  protocol: typeof ENTERPRISE_PROTOCOL_VERSION;
  context: EnterpriseRequestContext;
  request: AuthorityRequestV1;
}

function assertToken(value: string, label: string): void {
  if (!value || value.length > 256 || /[\r\n]/.test(value)) throw new Error(`INVALID_ENTERPRISE_${label}`);
}

export function enterpriseNamespace(tenantId: string): string {
  assertToken(tenantId, 'TENANT_ID');
  return `${ENTERPRISE_NAMESPACE_PREFIX}${tenantId}`;
}

export function assertEnterpriseContext(context: EnterpriseRequestContext): void {
  assertToken(context.principal.tenantId, 'TENANT_ID');
  assertToken(context.principal.principalId, 'PRINCIPAL_ID');
  assertToken(context.principal.issuer, 'ISSUER');
  assertToken(context.correlationId, 'CORRELATION_ID');
  if (!context.principal.scopes.includes('cranium:authority:request')) {
    throw new Error('ENTERPRISE_SCOPE_REQUIRED: cranium:authority:request');
  }
}

/**
 * Integration-plane adapter. Enterprise identity authenticates the caller;
 * Cranium remains the canonical authority issuer. Tenant scope is carried
 * into the kernel namespace and checked again at the canonical command-law
 * boundary.
 */
export function toEnterpriseKernelRequest(
  input: EnterpriseAuthorityRequest,
  targetAuthorityVersion: number,
  now = Date.now(),
): AuthorityTransitionRequest {
  if (input.protocol !== ENTERPRISE_PROTOCOL_VERSION) throw new Error('INVALID_ENTERPRISE_PROTOCOL_VERSION');
  assertEnterpriseContext(input.context);

  const namespace = enterpriseNamespace(input.context.principal.tenantId);
  const request = toKernelAuthorityRequest(input.request, targetAuthorityVersion, now);
  const subjectId = `${input.context.principal.tenantId}:${input.request.subject.subject_id}`;

  const enterpriseRequest: AuthorityTransitionRequest = {
    ...request,
    requestId: input.context.correlationId,
    idempotencyKey: `${input.context.principal.tenantId}:${request.idempotencyKey}`,
    subjectId,
    requesterId: input.context.principal.principalId,
    namespace,
    attestationNamespace: namespace,
  };

  assertCommandLawRequest(enterpriseRequest, {
    namespace,
    subjectId,
    issuer: 'cranium-kernel',
  });

  return enterpriseRequest;
}
