import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';
import { RedisSessionAuthorityBackend } from '../src/governance/redisSessionAuthorityBackend';
import { AsyncKernelAuthorityProxy } from '../src/authority/authorityProxy';
import { PostgresAuthorityStore } from '../src/authority/postgresAuthorityStore';
import { createInitialKernelState } from '../src/data/initialState';
import { EnterpriseOidcVerifier } from '../src/integration/enterpriseAuthentication';
import { CRANIUM_API_VERSION, CRANIUM_API_ROUTES, type EnterpriseApiError, type EnterpriseApiSuccess, type EnterpriseHealthResponse } from '../src/integration/apiContract';
import { toEnterpriseKernelRequest, type EnterpriseAuthorityRequest, type EnterprisePrincipal } from '../src/integration/enterpriseBoundary';
import { emitAuditEvent } from '../src/integration/auditLog';
import { auditDecision, createRateLimiter, parseTrustedProxyCidrs } from '../src/integration/gatewaySecurity';
import { postgresSslOptions, validateProductionTransport } from '../src/integration/transportSecurity';
import { createRedisRateLimiter } from '../src/integration/redisRateLimiter';

const port = Number(process.env.CRANIUM_ENTERPRISE_PORT ?? 4101);
const databaseUrl = process.env.DATABASE_URL;
const oidcIssuer = process.env.CRANIUM_OIDC_ISSUER;
const oidcAudience = process.env.CRANIUM_OIDC_AUDIENCE;
const oidcJwksUri = process.env.CRANIUM_OIDC_JWKS_URI;
const redisUrl = process.env.REDIS_URL;
const databaseCaFile = process.env.CRANIUM_DB_SSL_CA_FILE;
if (!databaseUrl || !oidcIssuer || !oidcAudience || !oidcJwksUri || !redisUrl) { console.error('Enterprise gateway requires DATABASE_URL, REDIS_URL, CRANIUM_OIDC_ISSUER, CRANIUM_OIDC_AUDIENCE, and CRANIUM_OIDC_JWKS_URI'); process.exit(78); }
try {
  validateProductionTransport({ nodeEnv: process.env.NODE_ENV, databaseUrl, redisUrl, databaseSsl: process.env.CRANIUM_DB_SSL, databaseCaFile });
} catch (error) {
  console.error('ENTERPRISE_GATEWAY_TRANSPORT_CONFIG_INVALID', error);
  process.exit(78);
}
let databaseCa: string | undefined;
try {
  if (databaseCaFile) databaseCa = readFileSync(databaseCaFile, 'utf8');
} catch (error) {
  console.error('ENTERPRISE_GATEWAY_POSTGRES_CA_READ_FAILED', error);
  process.exit(78);
}

const pool = new Pool({ connectionString: databaseUrl, max: Number(process.env.CRANIUM_DB_POOL_MAX ?? 20), ssl: postgresSslOptions(process.env.CRANIUM_DB_SSL, databaseCa) });
const store = new PostgresAuthorityStore(pool, createInitialKernelState());
const proxy = new AsyncKernelAuthorityProxy(store);
const oidc = new EnterpriseOidcVerifier({ issuer: oidcIssuer, audience: oidcAudience, jwksUri: oidcJwksUri });
const redis: RedisClientType = createClient({ url: redisUrl });
const sessions = new RedisSessionAuthorityBackend(redis);
let ready = false;
let stopping = false;
const rateWindowMs = Number(process.env.CRANIUM_RATE_WINDOW_MS ?? 60_000);
const rateLimit = Number(process.env.CRANIUM_RATE_LIMIT ?? 120);
const localRateLimiter = createRateLimiter({
  windowMs: rateWindowMs,
  limit: rateLimit,
  maxEntries: Number(process.env.CRANIUM_RATE_MAX_ENTRIES ?? 10_000),
  trustedProxyCidrs: parseTrustedProxyCidrs(process.env.CRANIUM_TRUSTED_PROXY_CIDRS),
});
const distributedRateLimiter = createRedisRateLimiter({
  redis,
  windowMs: rateWindowMs,
  limit: rateLimit,
  trustedProxyCidrs: parseTrustedProxyCidrs(process.env.CRANIUM_TRUSTED_PROXY_CIDRS),
});
function securityHeaders(res: ServerResponse) { res.setHeader('x-content-type-options','nosniff'); res.setHeader('x-frame-options','DENY'); res.setHeader('referrer-policy','no-referrer'); res.setHeader('content-security-policy',"default-src 'none'"); }
function sessionIdFromPath(path:string):string|null { const m=path.match(/^\/v1\/sessions\/([^/]+)\/state$/); return m?decodeURIComponent(m[1]):null; }
function writeJson(res:ServerResponse,status:number,body:unknown,correlationId?:string){securityHeaders(res);if(correlationId)res.setHeader('x-correlation-id',correlationId);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body));}
function error(res:ServerResponse,status:number,code:string,message:string,correlationId?:string){const body:EnterpriseApiError={error:message,code,...(correlationId?{correlationId}:{})};writeJson(res,status,body,correlationId);}
async function readJson(req:IncomingMessage):Promise<unknown>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1_000_000)throw new Error('REQUEST_BODY_TOO_LARGE');}try{return JSON.parse(raw||'{}');}catch{throw new Error('INVALID_JSON');}}
function pathOf(req:IncomingMessage):string{return new URL(req.url??'/', 'http://localhost').pathname;}
function bearer(req:IncomingMessage):string{const value=req.headers.authorization;if(!value?.startsWith('Bearer '))throw new Error('BEARER_TOKEN_REQUIRED');const token=value.slice(7).trim();if(!token)throw new Error('BEARER_TOKEN_REQUIRED');return token;}

async function executeEnterpriseRequest(req: EnterpriseAuthorityRequest, path: string) {
  const kernelRequest = toEnterpriseKernelRequest(req, (await store.load()).state.authorityVersion);
  if (path === CRANIUM_API_ROUTES.authorityValidate) return { kind:'evaluation' as const, data: await proxy.evaluate(kernelRequest) };
  if (path === CRANIUM_API_ROUTES.authorityRequest) return { kind:'receipt' as const, data: await proxy.commit(kernelRequest) };
  if (path === CRANIUM_API_ROUTES.authorityExecute) {
    const evaluation = await proxy.evaluate(kernelRequest);
    if (!evaluation.allowed) throw new Error('AUTHORITY_EXECUTION_DENIED');
    const receipt = await proxy.commit(kernelRequest);
    return { kind:'receipt' as const, data: receipt };
  }
  throw new Error('NOT_FOUND');
}

const server=createServer(async(req,res)=>{
  const correlationId=typeof req.headers['x-correlation-id']==='string'&&req.headers['x-correlation-id'].length<=256?req.headers['x-correlation-id']:randomUUID();
  let auditContext: { principal: EnterprisePrincipal; kernelRequest: ReturnType<typeof toEnterpriseKernelRequest> } | undefined;
  try{
    const allowed = process.env.NODE_ENV === 'production'
      ? await distributedRateLimiter.allow(req)
      : localRateLimiter.allow(req);
    if(!allowed){error(res,429,'RATE_LIMITED','request rate limit exceeded',correlationId);return;}
    const path=pathOf(req);
    if(req.method==='GET'&&path===CRANIUM_API_ROUTES.health){const payload:EnterpriseHealthResponse={status:'ok',protocolVersion:CRANIUM_API_VERSION,authority:'cranium-kernel'};writeJson(res,200,payload,correlationId);return;}
    if(req.method==='GET'&&path===CRANIUM_API_ROUTES.readiness){const payload:EnterpriseHealthResponse={status:ready?'ready':'ok',protocolVersion:CRANIUM_API_VERSION,authority:'cranium-kernel'};writeJson(res,ready?200:503,payload,correlationId);return;}
    if(req.method==='GET'&&sessionIdFromPath(path)){const principal=await oidc.verifyBearer(bearer(req));const sessionId=sessionIdFromPath(path)!;const lease=await sessions.read(sessionId,principal.tenantId);if(!lease){error(res,404,'SESSION_NOT_FOUND','session not found',correlationId);return;}writeJson(res,200,{ok:true,correlationId,data:lease},correlationId);return;}
    const receiptMatch=req.method==='GET'?path.match(/^\/v1\/receipts\/([^/]+)$/):null;
    if(receiptMatch){await oidc.verifyBearer(bearer(req));const receipt=await store.getReceiptForTransition?.(decodeURIComponent(receiptMatch[1]));if(!receipt){error(res,404,'RECEIPT_NOT_FOUND','receipt not found',correlationId);return;}const valid=await proxy.verifyReceipt(receipt);writeJson(res,200,{ok:true,correlationId,data:{receipt,valid}},correlationId);return;}
    if(req.method!=='POST'||![CRANIUM_API_ROUTES.authorityRequest,CRANIUM_API_ROUTES.authorityValidate,CRANIUM_API_ROUTES.authorityExecute].includes(path as never)){error(res,404,'NOT_FOUND','route not found',correlationId);return;}
    if(!ready){error(res,503,'NOT_READY','enterprise authority service is not ready',correlationId);return;}
    const principal=await oidc.verifyBearer(bearer(req));
    const raw=await readJson(req);if(!raw||typeof raw!=='object')throw new Error('INVALID_REQUEST_BODY');
    const input={...(raw as Record<string,unknown>),context:{principal,correlationId},protocol:'enterprise-integration-v1'} as EnterpriseAuthorityRequest;
    const kernelRequest = toEnterpriseKernelRequest(input, (await store.load()).state.authorityVersion);
    auditContext = { principal, kernelRequest };
    const result=await executeEnterpriseRequest(input,path);
    const decision = result.kind === 'evaluation' ? auditDecision(result.data) : 'ALLOW';
    await emitAuditEvent({ event: path, timestamp: new Date().toISOString(), correlationId, tenantId: principal.tenantId, principalId: principal.principalId, action: kernelRequest.action, tool: kernelRequest.tool, decision, receiptId: result.kind === 'receipt' ? result.data.id : undefined, outcome: result.kind });
    const response:EnterpriseApiSuccess<typeof result.data>={ok:true,correlationId,data:result.data};
    writeJson(res,200,response,correlationId);
  }catch(e){const message=e instanceof Error?e.message:'enterprise_gateway_error';if(auditContext){await emitAuditEvent({ event: pathOf(req), timestamp: new Date().toISOString(), correlationId, tenantId: auditContext.principal.tenantId, principalId: auditContext.principal.principalId, action: auditContext.kernelRequest.action, tool: auditContext.kernelRequest.tool, decision: message==='AUTHORITY_EXECUTION_DENIED'?'DENY':'ERROR', outcome: 'rejected' });}const status=message.startsWith('BEARER_')||message.startsWith('ENTERPRISE_')?401:message==='NOT_FOUND'?404:400;error(res,status,'CRANIUM_REQUEST_REJECTED',message,correlationId);}
});

async function start(){await store.initialize();await pool.query('SELECT 1');await redis.connect();await redis.ping();ready=true;server.listen(port,'0.0.0.0',()=>console.log(`Cranium enterprise gateway listening on 0.0.0.0:${port}`));}
start().catch(e=>{console.error('ENTERPRISE_GATEWAY_START_FAILED',e);process.exit(1);});
async function shutdown(){if(stopping)return;stopping=true;ready=false;server.close();if(redis.isOpen)await redis.quit();await pool.end();}
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
