import { BlockList, isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';

export type AuditDecision = 'ALLOW' | 'DENY';

export function auditDecision(result: { allowed: boolean }): AuditDecision {
  return result.allowed ? 'ALLOW' : 'DENY';
}

export function parseTrustedProxyCidrs(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeAddress(address: string): string {
  return address.startsWith('::ffff:') ? address.slice('::ffff:'.length) : address;
}

function createTrustedProxyList(cidrs: string[]): BlockList {
  const list = new BlockList();
  for (const cidr of cidrs) {
    const [address, prefix] = cidr.split('/');
    const family = isIP(address);
    if (!family || prefix === undefined || !/^\d+$/.test(prefix)) {
      throw new Error(`INVALID_TRUSTED_PROXY_CIDR: ${cidr}`);
    }
    const width = family === 4 ? 32 : 128;
    const numericPrefix = Number(prefix);
    if (numericPrefix < 0 || numericPrefix > width) {
      throw new Error(`INVALID_TRUSTED_PROXY_CIDR: ${cidr}`);
    }
    list.addSubnet(normalizeAddress(address), numericPrefix, family === 4 ? 'ipv4' : 'ipv6');
  }
  return list;
}

function directPeer(req: IncomingMessage): string {
  return normalizeAddress(req.socket.remoteAddress ?? 'unknown');
}

function effectiveClientAddress(req: IncomingMessage, trustedProxies: BlockList): string {
  const peer = directPeer(req);
  const peerFamily = isIP(peer);
  if (!peerFamily || !trustedProxies.check(peer, peerFamily === 4 ? 'ipv4' : 'ipv6')) return peer;

  const forwarded = req.headers['x-forwarded-for']?.toString().split(',').map((value) => value.trim()) ?? [];
  const firstValid = forwarded.find((value) => isIP(normalizeAddress(value)) !== 0);
  return firstValid ? normalizeAddress(firstValid) : peer;
}

export function createClientAddressResolver(trustedProxyCidrs: string[]): (req: IncomingMessage) => string {
  const trustedProxies = createTrustedProxyList(trustedProxyCidrs);
  return (req) => effectiveClientAddress(req, trustedProxies);
}

export type RateLimiterOptions = {
  windowMs: number;
  limit: number;
  maxEntries: number;
  trustedProxyCidrs: string[];
};

type Counter = { started: number; count: number };

export function createRateLimiter(options: RateLimiterOptions) {
  if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) throw new Error('INVALID_RATE_WINDOW');
  if (!Number.isFinite(options.limit) || options.limit <= 0) throw new Error('INVALID_RATE_LIMIT');
  if (!Number.isFinite(options.maxEntries) || options.maxEntries < 1) throw new Error('INVALID_RATE_MAX_ENTRIES');

  const clientAddress = createClientAddressResolver(options.trustedProxyCidrs);
  const counters = new Map<string, Counter>();

  function sweep(now: number): void {
    for (const [key, counter] of counters) {
      if (now - counter.started >= options.windowMs) counters.delete(key);
    }
  }

  function allow(req: IncomingMessage, now = Date.now()): boolean {
    sweep(now);
    const key = clientAddress(req);
    const current = counters.get(key);
    if (!current) {
      while (counters.size >= options.maxEntries) {
        const oldest = counters.keys().next().value as string | undefined;
        if (oldest === undefined) break;
        counters.delete(oldest);
      }
      counters.set(key, { started: now, count: 1 });
      return true;
    }
    if (current.count >= options.limit) return false;
    current.count += 1;
    return true;
  }

  return { allow, size: () => counters.size };
}
