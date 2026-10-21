import {SnapshotBuffer} from '../snapshots.js';
import {TACTICS_PROTOCOL} from './protocol.js';

export function skirmishAvailability(runtime){
 const cfg=runtime?.skirmish;
 if(cfg?.enabled!==true||cfg.protocol!==TACTICS_PROTOCOL)return {ready:false,path:'skirmish',reason:'Skirmish online is coming soon. Practice is ready now.'};
 const path=cfg.path||'skirmish';
 // This frontend only enters an explicitly advertised, authenticated free queue.
 // Paid Classic entry/receipt handling is never reused for another ruleset.
 if(!/^[a-z][a-z0-9/-]{0,60}$/.test(path)||path.includes('..')||cfg.entry!=='free')return {ready:false,path:'skirmish',reason:'Skirmish online is temporarily unavailable. Practice is ready.'};
 return {ready:true,path,reason:'Live 1v1 · free entry'};
}
export function isSkirmishSnapshot(packet){
 const s=packet?.state;
 const pair=(value,valid=Number.isFinite)=>Array.isArray(value)&&value.length===2&&value.every(valid);
 const card=id=>Number.isInteger(id)&&id>=0&&id<12;
 const cards=(value,count)=>Array.isArray(value)&&value.length===count&&value.every(card);
 return packet?.protocol===TACTICS_PROTOCOL&&(packet.side===0||packet.side===1)
  &&Number.isSafeInteger(packet.sequence)&&packet.sequence>=0
  &&s?.ruleset==='wickborn-tactics'&&s.mode==='duel'&&Number.isFinite(s.time)
  &&['playing','ended'].includes(s.status)&&(s.winner===null||[-1,0,1].includes(s.winner))
  &&pair(s.names,n=>typeof n==='string')&&pair(s.score)
  &&Array.isArray(s.units)&&s.units.length<=100&&s.units.every(u=>u&&Number.isFinite(u.id)&&(u.p===0||u.p===1)&&Number.isFinite(u.x)&&Number.isFinite(u.y)&&Number.isFinite(u.hp)&&Number.isFinite(u.maxHp)&&card(u.card))
  &&Array.isArray(s.towers)&&s.towers.length===6&&s.towers.every(t=>t&&(t.p===0||t.p===1)&&Number.isFinite(t.x)&&Number.isFinite(t.y)&&Number.isFinite(t.hp)&&Number.isFinite(t.maxHp))
  &&pair(s.hand,v=>Array.isArray(v))&&cards(s.hand[packet.side],4)
  &&pair(s.decks,v=>Array.isArray(v))&&cards(s.decks[packet.side],8)
  &&pair(s.queue,v=>Array.isArray(v))&&cards(s.queue[packet.side],4)
  &&pair(s.captainCards,card)&&pair(s.captains,v=>v===null||Number.isFinite(v))
  &&pair(s.elixir)&&pair(s.skillCd)&&pair(s.energy)&&pair(s.respawn)&&pair(s.ultCd)&&pair(s.barriers)
  &&s.relay&&pair(s.relay.progress)&&pair(s.relay.captures)&&Number.isFinite(s.relay.nextAt)
  &&pair(s.specs,v=>Array.isArray(v)&&v.length===12&&v.every(n=>n===0||n===1))
  &&pair(s.levels,v=>Array.isArray(v)&&v.length===12&&v.every(Number.isFinite))
  &&Array.isArray(s.effects)&&Array.isArray(s.hazards)&&Array.isArray(s.links)
  &&s.market&&Array.isArray(s.market.multipliers)&&s.market.multipliers.length===12
  &&Number.isFinite(s.round);
}
export class SkirmishConnection{
 constructor({call,id,path='skirmish',onSnapshot=()=>{},onStatus=()=>{},onRtt=()=>{},WebSocketImpl=globalThis.WebSocket}){Object.assign(this,{call,id,path,onSnapshot,onStatus,onRtt,WebSocketImpl});this.buffer=new SnapshotBuffer({delay:120,maxExtrapolate:100});this.pending=new Map();this.closed=false;this.ready=false;this.realtime=false;this.socket=null;this.retryTimer=null;this.pollTimer=null;this.pingTimer=null;this.generation=0;this.side=null;}
 accept(packet){if(this.closed||!isSkirmishSnapshot(packet)||this.side!==null&&packet.side!==this.side)return false;if(!this.buffer.push(packet))return false;this.side=packet.side;this.ready=true;this.onSnapshot(packet);return true;}
 start(initial){
  this.realtime=initial.transport==='realtime'||!!initial.connection?.url;
  this.buffer.delay=this.realtime?40:90;this.buffer.maxExtrapolate=this.realtime?160:180;
  if(!this.accept(initial))throw new Error('The server did not provide a Skirmish match.');
  this.onStatus(this.realtime?'Live connection':'HTTP connection');
  if(this.realtime)this.connect(initial.connection);else this.poll();
 }
 sample(now){return this.buffer.sample(now);}
 async poll(){if(this.closed)return;try{const start=performance.now(),packet=await this.call(`${this.path}/match/${this.id}`);if(!isSkirmishSnapshot(packet))throw Error();this.onRtt(performance.now()-start);this.accept(packet);this.onStatus('HTTP connection');}catch{this.ready=false;this.onStatus('Reconnecting…');}finally{if(!this.closed)this.pollTimer=setTimeout(()=>this.poll(),120);}}
 async connect(connection){
  if(this.closed)return;const generation=++this.generation;this.ready=false;this.onStatus('Connecting…');
  try{connection??=await this.call(`${this.path}/match/${this.id}/ticket`,{protocol:TACTICS_PROTOCOL});if(this.closed||generation!==this.generation)return;const url=new URL(connection.url,globalThis.location?.href||'https://localhost');if(url.protocol!=='wss:'&&!(url.protocol==='ws:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error();const ws=this.socket=new this.WebSocketImpl(url.href);
   const reconnect=()=>{if(this.closed||generation!==this.generation)return;this.generation++;this.ready=false;clearInterval(this.pingTimer);this.onStatus('Reconnecting…');this.retryTimer=setTimeout(()=>this.connect(),1000);};
   ws.onopen=()=>{if(this.closed||generation!==this.generation){ws.close();return;}this.ready=true;this.onStatus('Live connection');this.pingTimer=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({protocol:TACTICS_PROTOCOL,type:'ping',at:performance.now()}));},2000);};
   ws.onmessage=e=>{if(this.closed||generation!==this.generation)return;let p;try{p=JSON.parse(e.data);}catch{return;}if(p.type==='pong'&&Number.isFinite(p.at)){this.onRtt(Math.max(0,performance.now()-p.at));return;}if(p.protocol!==TACTICS_PROTOCOL)return;if(p.state)this.accept(p);if(p.actionId&&this.pending.has(p.actionId)){const pending=this.pending.get(p.actionId);clearTimeout(pending.timer);this.pending.delete(p.actionId);p.ok===false||p.error?pending.reject(new Error(p.error||'Command rejected.')):pending.resolve(p);}};
   ws.onclose=reconnect;ws.onerror=()=>{try{ws.close();}catch{}reconnect();};
  }catch{if(!this.closed){this.onStatus('Reconnecting…');this.retryTimer=setTimeout(()=>this.connect(),1500);}}
 }
 command(c){
  if(this.closed||!this.ready)return Promise.reject(new Error('Reconnecting. Your battle will resume here.'));
  if(this.pending.size>=12)return Promise.reject(new Error('Waiting for your previous commands.'));
  const command={protocol:TACTICS_PROTOCOL,actionId:typeof c.actionId==='string'&&/^[\w-]{8,80}$/.test(c.actionId)?c.actionId:crypto.randomUUID(),...Object.fromEntries(['type','slot','x','y'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]))};
  if(!this.socket)return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(command.actionId);reject(new Error('Command confirmation delayed.'));},9000);this.pending.set(command.actionId,{resolve,reject,timer});this.call(`${this.path}/match/${this.id}/command`,command).then(p=>{if(!this.pending.has(command.actionId))return;clearTimeout(timer);this.pending.delete(command.actionId);if(p.protocol!==TACTICS_PROTOCOL)throw new Error('Incompatible command response.');if(p.state)this.accept(p);if(p.ok===false||p.error)throw new Error(p.error||'Command rejected.');resolve(p);}).catch(error=>{clearTimeout(timer);this.pending.delete(command.actionId);reject(error);});});
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(command.actionId);reject(new Error('Command confirmation delayed.'));},5000);this.pending.set(command.actionId,{resolve,reject,timer});try{this.socket.send(JSON.stringify(command));}catch{clearTimeout(timer);this.pending.delete(command.actionId);reject(new Error('Connection interrupted.'));}});
 }
 close(){this.closed=true;this.ready=false;this.generation++;clearTimeout(this.retryTimer);clearTimeout(this.pollTimer);clearInterval(this.pingTimer);try{this.socket?.close();}catch{}for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Connection closed.'));}this.pending.clear();}
}
