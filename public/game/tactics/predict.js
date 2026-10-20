import {applyTacticsCommand,stepTactics} from './engine.js';
import {TACTICS_STEP} from './config.js';
import {adoptKinematics} from '../smooth.js';

// Local captain input is applied immediately, then rebased onto authoritative
// snapshots so Skirmish online feels like practice without awarding a disconnect win.
export class TacticsPredictor {
 constructor({side=0,maxAhead=.5,maxLead=.25,pendingLife=5}={}){this.side=side;this.maxAhead=maxAhead;this.maxLead=maxLead;this.pendingLife=pendingLife;this.auth=null;this.state=null;this.pending=[];this.samples=[];this.offset=null;this.target=null;this.rtt=.08;this.lastFrame=null;this.time=0;this.lastSequence=-1;}
 setRtt(seconds){if(Number.isFinite(seconds)&&seconds>0)this.rtt=this.rtt*.75+Math.min(1,seconds)*.25;}
 receive(packet,now=performance.now()){
  const s=packet?.state;if(!s||!Number.isFinite(s.time))return false;if(this.auth&&s.time+1e-9<this.auth.time)return false;
  const sequence=packet.sequence??packet.version??Math.round(s.time*1000),processed=new Set(packet.acks||[]);
  const pending=this.pending.filter(c=>!processed.has(c.actionId)&&(this.state?.time??0)-c.at<this.pendingLife);
  if(this.lastSequence>=0&&sequence<this.lastSequence)return false;
  if(this.lastSequence>=0&&sequence===this.lastSequence){if(pending.length===this.pending.length)return false;this.pending=pending;this.rebuild();return true;}
  this.pending=pending;this.lastSequence=sequence;this.auth=structuredClone(s);this.samples.push(s.time-now/1000);this.samples=this.samples.slice(-24);
  this.target=Math.max(...this.samples)+Math.min(this.maxLead,this.rtt);if(this.offset===null||Math.abs(this.target-this.offset)>.75)this.offset=this.target;
  this.rebuild();return true;
 }
 prepare(sim){sim.seed??=1;sim.commands??=[];sim.recentEvents??=[];return sim;}
 rebuild(){
  if(!this.auth)return;const prev=this.state,sim=this.prepare(structuredClone(this.auth)),goal=Math.min(Math.max(prev?.time??sim.time,sim.time),sim.time+this.maxAhead),queue=[...this.pending].sort((a,b)=>a.at-b.at);
  const replay=()=>{while(queue.length&&queue[0].at<=sim.time+1e-6)this.apply(sim,queue.shift());};
  replay();for(let n=0;sim.status==='playing'&&sim.time+TACTICS_STEP<=goal+1e-6&&n<80;n++){stepTactics(sim);replay();}while(queue.length)this.apply(sim,queue.shift());
  if(this.pending.length&&sim.status==='playing')adoptKinematics(prev,sim);
  this.state=sim;
 }
 frame(now=performance.now()){
  if(!this.state)return null;
  if(this.lastFrame!==null&&this.target!==null){const slew=Math.max(0,(now-this.lastFrame)/1000)*.1;this.offset+=Math.max(-slew,Math.min(slew,this.target-this.offset));}this.lastFrame=now;
  const goal=this.time=Math.min(now/1000+this.offset,this.auth.time+this.maxAhead);
  for(let n=0;this.state.status==='playing'&&this.state.time+TACTICS_STEP<=goal+1e-6&&n<8;n++)stepTactics(this.state);
  return this.state;
 }
 predict(command){
  if(!this.state||this.state.status!=='playing')return {ok:false,error:'The battle has ended.'};
  const item={...command,at:this.state.time},result=this.apply(this.state,item);if(result.ok)this.pending.push(item);return {...result,at:item.at};
 }
 settle(actionId){const before=this.pending.length;this.pending=this.pending.filter(c=>c.actionId!==actionId);if(this.pending.length!==before)this.rebuild();}
 apply(sim,c){return applyTacticsCommand(this.prepare(sim),this.side,c,{record:false});}
 get lead(){return this.state&&this.auth?this.state.time-this.auth.time:0;}
}
