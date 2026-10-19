import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { createClientAddressResolver } from './gatewaySecurity';

export type RedisEvalClient = {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
};

export type RedisRateLimiterOptions = {
  redis: RedisEvalClient;
  windowMs: number;
  limit: number;
  trustedProxyCidrs: string[];
  keyPrefix?: string;
};

const fixedWindowScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
if count <= tonumber(ARGV[2]) then return 1 else return 0 end
`;

export function createRedisRateLimiter(options: RedisRateLimiterOptions) {
  if (!Number.isFinite(options.windowMs) || options.windowMs <= 0) throw new Error('INVALID_RATE_WINDOW');
  if (!Number.isFinite(options.limit) || options.limit <= 0) throw new Error('INVALID_RATE_LIMIT');
  const prefix = options.keyPrefix ?? 'cranium:rate';
  if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(prefix)) throw new Error('INVALID_RATE_KEY_PREFIX');
  const clientAddress = createClientAddressResolver(options.trustedProxyCidrs);

  async function allow(req: IncomingMessage): Promise<boolean> {
    const address = clientAddress(req);
    const digest = createHash('sha256').update(address).digest('hex');
    const key = `${prefix}:${digest}`;
    try {
      const result = await options.redis.eval(fixedWindowScript, {
        keys: [key],
        arguments: [String(Math.ceil(options.windowMs)), String(Math.floor(options.limit))],
      });
      return Number(result) === 1;
    } catch {
      // A distributed limiter must fail closed; otherwise Redis failure becomes an abuse-control bypass.
      return false;
    }
  }

  return { allow };
}
