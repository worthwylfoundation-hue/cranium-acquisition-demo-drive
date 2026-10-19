import assert from 'node:assert/strict';
import { DistributedSessionAuthority, type SessionAuthorityBackend, type SessionLeaseRecord } from '../src/governance/distributedSessionAuthority';

class MemoryBackend implements SessionAuthorityBackend {
  private records = new Map<string, SessionLeaseRecord>();
  async read(id:string,t:string){return this.records.get(`${t}:${id}`)??null;}
  async trip(id:string,t:string,reason:string,now:number){const k=`${t}:${id}`, old=this.records.get(k); const r={sessionId:id,tenantId:t,epoch:(old?.epoch??0)+1,state:'TRIPPED_OPEN' as const,updatedAt:now,reason}; this.records.set(k,r); return r;}
  async transition(id:string,t:string,e:number,state:SessionLeaseRecord['state'],now:number){const k=`${t}:${id}`,old=this.records.get(k); if(!old||old.epoch!==e)throw new Error('FENCE_CONFLICT'); const r={...old,state,updatedAt:now}; this.records.set(k,r); return r;}
}
const b=new MemoryBackend(), a=new DistributedSessionAuthority(b); const f=await a.acquire('s1','tenant-a'); assert.equal(f.epoch,0); const tripped=await a.trip('s1','tenant-a','critical',100); assert.equal(tripped.epoch,1); await assert.rejects(()=>a.assertCurrent(f),/CRANIUM_FENCE_REVOKED/); const half=await a.halfOpen('s1','tenant-a',1,200); assert.equal(half.state,'RECOVERING_HALF_OPEN'); console.log(JSON.stringify({pass:true,initialEpoch:f.epoch,trippedEpoch:tripped.epoch,recoveryEpoch:half.epoch,staleFenceRejected:true}));
