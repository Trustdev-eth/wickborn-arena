import {STEP} from './engine.js';

const MAX_SPEED=110,SETTLE=14,HISTORY=6;
export const SNAP=140;

export function pendingKey(pending){
 return (pending||[]).map(c=>c.actionId).join(',');
}

// Ignore x/y/time so walking snapshots do not force a full resim. Combat, orders,
// spawns and elixir still change the key and rebase.
export function worldKey(s){
 if(!s)return '';
 let k=(s.status||'')+'|'+(s.winner??'')+'|'+(s.units?.length||0);
 for(const u of s.units||[]){
  const o=u.order;
  k+='|'+u.id+':'+(u.card??'')+':'+(u.p??'')+':'+(u.hp|0)+':'+(u.captain?1:0)+':'+(o?((o.x|0)+','+(o.y|0)):'');
 }
 for(const t of s.towers||[])k+='#'+(t.id??'')+':'+(t.hp|0);
 return k;
}
export function followClock(samples,now,rtt,maxLead){
 const fresh=samples.filter(s=>now-s.at<=400),list=fresh.length?fresh:samples.slice(-1);
 return Math.max(...list.map(s=>s.offset))+Math.min(maxLead,rtt);
}

// Keep predicted x/y across a snapshot rebase when the jump is prediction lead or
// resim noise, not a teleport. Rival captains keep the rebuilt path so they can walk.
export function adoptKinematics(prev,next,side,{onlyCaptains=false,squads=false}={}){
 if(!prev?.units?.length||!next?.units?.length)return;
 const byId=new Map(prev.units.map(u=>[u.id,u]));
 for(const u of next.units){
  const own=side===undefined||u.p===side;
  if(u.captain){if(!own)continue;}
  else if(onlyCaptains)continue;
  else if(!own&&!squads)continue;
  const old=byId.get(u.id);if(!old||old.card!==u.card||old.p!==u.p)continue;
  if(u.dash||old.dash)continue;
  const jump=Math.hypot(u.x-old.x,u.y-old.y);if(jump<=0||jump>=SNAP)continue;
  u.x=old.x;u.y=old.y;if(Number.isFinite(old.facingX))u.facingX=old.facingX;if(Number.isFinite(old.facingY))u.facingY=old.facingY;
  if(Number.isFinite(old.vx))u.vx=old.vx;if(Number.isFinite(old.vy))u.vy=old.vy;
 }
}

// Auto units lose vx/vy on some frames. Seed the last predicted velocity onto the
// authoritative pose before catch-up so they do not restart from a standstill.
export function seedVelocity(prev,next){
 if(!prev?.units?.length||!next?.units?.length)return;
 const byId=new Map(prev.units.map(u=>[u.id,u]));
 for(const u of next.units){
  const old=byId.get(u.id);if(!old||old.card!==u.card||old.p!==u.p)continue;
  if(u.dash||old.dash)continue;
  if(Math.hypot(u.vx||0,u.vy||0)>4)continue;
  if(Number.isFinite(old.vx))u.vx=old.vx;if(Number.isFinite(old.vy))u.vy=old.vy;
 }
}

// Units are drawn one simulation step behind the newest state and interpolated between recorded steps, so
// motion stays even when 60 Hz frames and 10 Hz steps don't line up. Sudden corrections (server rebases,
// re-keyed predictions) are eased out over a few frames instead of snapping.
export class MotionTracker {
 constructor(){this.tracks=new Map();}
 static renderTime(g,clock){const step=Number.isFinite(g.simulationStep)&&g.simulationStep>0&&g.simulationStep<=.1?g.simulationStep:STEP;return Number.isFinite(clock)?Math.min(clock,g.time+step)-step:g.time;}
 update(units,time,renderTime,dt){
  const live=new Set();
  for(const u of units){
   live.add(u.id);let t=this.tracks.get(u.id);
   if(!t){t={samples:[],x:u.x,y:u.y,rawX:null,rawY:null,errX:0,errY:0,rt:renderTime};this.tracks.set(u.id,t);}
   const s=t.samples;while(s.length&&s[s.length-1].t>time+1e-6)s.pop();
   const speed=u.action==='dash'?900:Math.max(MAX_SPEED,Math.hypot(u.vx||0,u.vy||0),u.captain?130:0);
   const last=s[s.length-1],allowed=speed*Math.max(dt,Math.abs(renderTime-t.rt),.05)+2;
   // Same-tick rebases are corrections, not a new sample. Keep the recorded path and ease toward the new point.
   if(last&&Math.abs(last.t-time)<1e-6){
    const jump=Math.hypot(u.x-last.x,u.y-last.y);
    if(jump>SNAP){last.x=u.x;last.y=u.y;}
    else if(jump<=allowed){last.x=u.x;last.y=u.y;}
    else{last.x+=(u.x-last.x)*.2;last.y+=(u.y-last.y)*.2;}
   }
   else s.push({t:time,x:u.x,y:u.y});if(s.length>HISTORY)s.shift();
   const [x,y]=sampleAt(s,renderTime);
   if(t.rawX!==null){const jump=Math.hypot(x-t.rawX,y-t.rawY);if(jump>SNAP){t.errX=0;t.errY=0;}else if(jump>allowed){t.errX=t.rawX-x;t.errY=t.rawY-y;}}
   const k=Math.exp(-dt*SETTLE);t.errX*=k;t.errY*=k;if(Math.abs(t.errX)+Math.abs(t.errY)<.05){t.errX=0;t.errY=0;}
   t.rawX=x;t.rawY=y;t.rt=renderTime;t.x=x+t.errX;t.y=y+t.errY;
  }
  for(const id of this.tracks.keys())if(!live.has(id))this.tracks.delete(id);
 }
 get(id){return this.tracks.get(id);}
 rename(from,to){const t=this.tracks.get(from);if(!t)return;this.tracks.delete(from);this.tracks.set(to,t);}
 clear(){this.tracks.clear();}
}

function sampleAt(s,time){
 if(time<=s[0].t)return [s[0].x,s[0].y];
 for(let i=1;i<s.length;i++){const a=s[i-1],b=s[i];if(time<=b.t){const f=(time-a.t)/Math.max(1e-6,b.t-a.t);return [a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f];}}
 const end=s[s.length-1];return [end.x,end.y];
}
