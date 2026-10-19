import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
export type ComaState = 'NORMAL' | 'CONTAINMENT_PENDING' | 'ACTIVE' | 'RESUMING';
export type ComaEventType = 'COMA_REQUESTED' | 'COMA_ACTIVATED' | 'EXTERNAL_ACTION_DENIED' | 'EVIDENCE_RECORDED' | 'SNAPSHOT_CREATED' | 'DIAGNOSTICS_READ' | 'RESUME_AUTHORIZED' | 'COMA_RESUMED' | 'TRANSITION_REJECTED';
export interface ComaEvent { sequence:number; id:string; type:ComaEventType; timestamp:number; actorId:string; stateBefore:ComaState; stateAfter:ComaState; detail:string; evidenceDigest?:string; previousHash:string|null; hash:string; }
export interface ComaSnapshot { id:string; createdAt:number; state:ComaState; eventSequence:number; evidence:Record<string,string>; ledgerHead:string|null; digest:string; }
export interface ComaDiagnostics { state:ComaState; externalActionsFrozen:boolean; ledgerEntries:number; ledgerHead:string|null; evidenceCount:number; latestSnapshotId:string|null; integrity:'INTACT'|'BROKEN'; }
const TRANSITIONS: Record<ComaState, Partial<Record<ComaState,true>>> = { NORMAL:{CONTAINMENT_PENDING:true}, CONTAINMENT_PENDING:{ACTIVE:true}, ACTIVE:{RESUMING:true}, RESUMING:{NORMAL:true} };
export class ComaTransitionError extends Error { constructor(message:string){super(message); this.name='ComaTransitionError';} }
export class ComaActionFrozenError extends Error { constructor(action:string){super(`External action denied while Coma is ${action}`); this.name='ComaActionFrozenError';} }
function digest(value:unknown):string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function parseLedger(path:string):ComaEvent[] { if(!existsSync(path)) return []; const lines=readFileSync(path,'utf8').split('\n').filter(Boolean); return lines.map((line: string,index: number)=>{ const event=JSON.parse(line) as ComaEvent; if(event.sequence!==index+1) throw new ComaTransitionError(`Coma ledger sequence mismatch at ${index+1}`); const expected=digest({...event,hash:undefined}); if(event.hash!==expected) throw new ComaTransitionError(`Coma ledger hash mismatch at ${index+1}`); const previous=index?JSON.parse(lines[index-1]) as ComaEvent:null; if(event.previousHash!==(previous?.hash??null)) throw new ComaTransitionError(`Coma ledger chain mismatch at ${index+1}`); return event; }); }
export class ComaController {
  private events:ComaEvent[]; private state:ComaState='NORMAL'; private evidence:Record<string,string>={}; private latestSnapshot:ComaSnapshot|null=null;
  constructor(private readonly ledgerPath:string, private readonly snapshotPath:string){ this.events=parseLedger(ledgerPath); const last=this.events.at(-1); if(last)this.state=last.stateAfter; if(existsSync(snapshotPath))this.latestSnapshot=JSON.parse(readFileSync(snapshotPath,'utf8')) as ComaSnapshot; }
  getState():ComaState{return this.state;}
  private append(type:ComaEventType,actorId:string,detail:string,next:ComaState=this.state,evidenceDigest?:string):ComaEvent { const base={sequence:this.events.length+1,id:randomUUID(),type,timestamp:Date.now(),actorId,stateBefore:this.state,stateAfter:next,detail,evidenceDigest,previousHash:this.events.at(-1)?.hash??null}; const event={...base,hash:digest({...base,hash:undefined})} as ComaEvent; appendFileSync(this.ledgerPath,`${JSON.stringify(event)}\n`); this.events.push(event); this.state=next; return event; }
  transition(next:ComaState,actorId:string,detail:string):void { if(!TRANSITIONS[this.state][next])throw new ComaTransitionError(`Invalid Coma transition ${this.state} -> ${next}: ${detail}`); this.append('TRANSITION_REJECTED',actorId,detail,next); }
  requestContainment(actorId:string,detail:string):void{this.transition('CONTAINMENT_PENDING',actorId,detail);}
  activate(actorId:string):void{this.transition('ACTIVE',actorId,'Containment activated');}
  recordEvidence(key:string,value:string):void{this.evidence[key]=value;this.append('EVIDENCE_RECORDED','system',key,this.state,digest(value));}
  createSnapshot():ComaSnapshot{const base={id:randomUUID(),createdAt:Date.now(),state:this.state,eventSequence:this.events.length,evidence:{...this.evidence},ledgerHead:this.events.at(-1)?.hash??null};const snapshot={...base,digest:digest(base)};writeFileSync(this.snapshotPath,JSON.stringify(snapshot,null,2));this.latestSnapshot=snapshot;this.append('SNAPSHOT_CREATED','system',snapshot.id,this.state,snapshot.digest);return snapshot;}
  diagnostics():ComaDiagnostics{return{state:this.state,externalActionsFrozen:this.state!=='NORMAL',ledgerEntries:this.events.length,ledgerHead:this.events.at(-1)?.hash??null,evidenceCount:Object.keys(this.evidence).length,latestSnapshotId:this.latestSnapshot?.id??null,integrity:this.verifyIntegrity()?'INTACT':'BROKEN'};}
  assertExternalActionAllowed(action:string):void{if(this.state!=='NORMAL')throw new ComaActionFrozenError(action);}
  authorizeResume(actorId:string,approval:string):void{if(!approval.trim())throw new ComaTransitionError('Resume approval is required');this.transition('RESUMING',actorId,approval);}
  completeResume(actorId:string):void{this.transition('NORMAL',actorId,'Resume completed');}
  verifyIntegrity():boolean{try{parseLedger(this.ledgerPath);return true;}catch{return false;}}
}
