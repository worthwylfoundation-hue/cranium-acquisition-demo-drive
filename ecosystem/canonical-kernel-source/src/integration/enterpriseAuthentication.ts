import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { EnterprisePrincipal } from './enterpriseBoundary';

export interface EnterpriseOidcConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
  scopeClaim?: string;
}

export interface EnterpriseClaims extends JWTPayload {
  sub: string;
  scope?: string;
  scopes?: string[];
  tenant_id?: string;
  tenantId?: string;
}

export class EnterpriseOidcVerifier {
  private readonly jwks;
  constructor(private readonly config: EnterpriseOidcConfig) {
    this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
  }

  async verifyBearer(token: string): Promise<EnterprisePrincipal> {
    const { payload } = await jwtVerify<EnterpriseClaims>(token, this.jwks, { issuer: this.config.issuer, audience: this.config.audience });
    if (!payload.sub) throw new Error('ENTERPRISE_IDENTITY_SUBJECT_REQUIRED');
    const tenantId = payload.tenant_id ?? payload.tenantId;
    if (!tenantId) throw new Error('ENTERPRISE_TENANT_CLAIM_REQUIRED');
    const rawScopes = payload.scopes ?? payload.scope?.split(/\s+/).filter(Boolean) ?? [];
    if (!rawScopes.includes('cranium:authority:request')) throw new Error('ENTERPRISE_SCOPE_REQUIRED: cranium:authority:request');
    return { tenantId, principalId: payload.sub, issuer: this.config.issuer, authMethod: 'OIDC', scopes: rawScopes };
  }
}
