import { createClient } from 'redis';
import { DistributedSessionAuthority } from '../src/governance/distributedSessionAuthority';
import { RedisSessionAuthorityBackend } from '../src/governance/redisSessionAuthorityBackend';

const url = process.env.REDIS_URL;
if (!url) { console.error('REDIS_URL is required'); process.exit(78); }
const client = createClient({ url });
await client.connect();
const backend = new RedisSessionAuthorityBackend(client);
const authority = new DistributedSessionAuthority(backend);
const tenant = `verify-${Date.now()}`;
const session = 'redis-fence';
const initial = await authority.acquire(session, tenant);
const tripped = await authority.trip(session, tenant, 'verification', Date.now());
let staleRejected = false;
try { await authority.assertCurrent(initial); } catch { staleRejected = true; }
const recovered = await authority.halfOpen(session, tenant, tripped.epoch, Date.now());
if (initial.epoch !== 0 || tripped.epoch !== 1 || !staleRejected || recovered.state !== 'RECOVERING_HALF_OPEN') throw new Error('REDIS_SESSION_AUTHORITY_CHECK_FAILED');
await client.del(`cranium:session:${tenant}:${session}`);
await client.quit();
console.log(JSON.stringify({ pass: true, initialEpoch: initial.epoch, trippedEpoch: tripped.epoch, recoveredEpoch: recovered.epoch, staleFenceRejected: staleRejected }));
