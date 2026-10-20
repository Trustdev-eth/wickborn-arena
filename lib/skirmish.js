import {validDeck} from '../public/game/engine.js';
import {TacticsAuthority,TACTICS_PROTOCOL} from '../public/game/tactics/protocol.js';
import {getMarket} from './market.js';
import {realtimeHealthy,realtimeTicket,roomRequest} from './realtime-bridge.js';

const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const WAIT_MS=600000,PLAY_MS=300000,MAX_CATCH_UP=8,PERSIST_MS=1000;
const openRanked="asset='skirmish' AND mode='ranked' AND p0<>? AND p1 IS NULL AND status='waiting' AND expires_at>?";
const holdFor=(db,id)=>db.prepare('SELECT m.* FROM holds h JOIN matches m ON m.id=h.match_id WHERE h.player_id=?').bind(id).first();

export function skirmishRuntime(env={}){
 return {enabled:env.SKIRMISH_ONLINE!=='false',protocol:TACTICS_PROTOCOL,entry:'free',path:'skirmish'};
}

export async function skirmishRoute(request,env,path,body,player,identity,now){
 if(env.SKIRMISH_ONLINE==='false')fail(503,'Skirmish online is temporarily unavailable.');
 const db=env.DB,owner=player.id,origin=new URL(request.url).origin;
 if(path[1]==='battle'&&request.method==='POST')return await battle(db,env,owner,player,body,now,origin);
 if(path[1]==='match'&&path[2]){
  if(!/^[\w-]{1,100}$/.test(path[2]))fail(404,'Skirmish battle not found.');
  const row=await db.prepare('SELECT * FROM matches WHERE id=? AND asset=? AND (p0=? OR p1=?)').bind(path[2],'skirmish',owner,owner).first();
  if(!row)fail(404,'Skirmish battle not found.');
  if(!path[3]&&request.method==='GET')return await readMatch(db,env,row,owner,now,origin);
  if(path[3]==='cancel'&&request.method==='POST')return await cancelMatch(db,row,owner,now);
  if(path[3]==='ticket'&&request.method==='POST'){
   if(row.transport!=='realtime'||row.status!=='playing')fail(503,'Skirmish sockets are not available. HTTP polling is active.');
   return json(await realtimeTicket(row,owner,origin,env,now));
  }
  if(path[3]==='command'&&request.method==='POST')return await commandMatch(db,env,row,owner,body,now,origin);
 }
 fail(404,'Skirmish route not found.');
}

function assertLoadout(body){
 if(body.protocol!==TACTICS_PROTOCOL)fail(400,'Incompatible Skirmish protocol.');
 if(!validDeck(body.deck))fail(400,'Choose eight different fighters.');
 if(!Number.isInteger(body.captain)||!body.deck.includes(body.captain))fail(400,'Choose a captain from your squad.');
 if(!Array.isArray(body.specs)||body.specs.length!==12||body.specs.some(v=>v!==0&&v!==1))fail(400,'Choose a valid specialization.');
 if(typeof body.actionId!=='string'||!/^[\w-]{8,80}$/.test(body.actionId))fail(400,'Battle request ID required.');
 return {deck:[...body.deck],captain:body.captain,specs:[...body.specs]};
}

function waitingEnvelope(row){
 return {protocol:TACTICS_PROTOCOL,id:row.id,matchId:row.id,status:row.status,code:row.code||undefined};
}

function parseState(row){
 try{return JSON.parse(row.state||'{}');}catch{return {};}
}

function withMeta(packet,row,result=null){
 return {...packet,...(result||{}),protocol:TACTICS_PROTOCOL,id:row.id,matchId:row.id,transport:row.transport||'http'};
}

async function attachRoom(row,owner,command,env,origin,now){
 const data=await roomRequest(row,owner,command,env);
 try{data.connection=await realtimeTicket(row,owner,origin,env,now);}catch{}
 return {...data,id:row.id,matchId:row.id,transport:'realtime'};
}

async function battle(db,env,owner,player,body,now,origin){
 const loadout=assertLoadout(body);
 const own=await holdFor(db,owner);
 if(own){
  if(own.asset!=='skirmish')fail(409,'Finish or cancel your current battle first.');
  if(own.status==='playing'||own.status==='ended')return json(await playPacket(db,env,own,owner,now,null,origin));
  if(own.status==='waiting')return json(waitingEnvelope(own));
  fail(409,'Finish or cancel your current battle first.');
 }
 const hold=crypto.randomUUID(),freshId=crypto.randomUUID();
 let row;
 if(body.code){
  const code=String(body.code).trim().toUpperCase();
  row=await db.prepare("SELECT * FROM matches WHERE code=? AND asset='skirmish' AND status='waiting' AND p1 IS NULL AND expires_at>?").bind(code,now).first();
  if(!row)fail(404,'Skirmish room not found.');
  if(row.p0===owner)fail(400,'Another trainer needs to join.');
  const claimed=await db.batch([
   db.prepare('INSERT INTO holds (id,player_id,match_id,stake) VALUES (?,?,?,0)').bind(hold,owner,row.id),
   db.prepare("UPDATE matches SET p1=?,expires_at=? WHERE id=? AND p1 IS NULL AND status='waiting'").bind(owner,now+WAIT_MS,row.id)
  ]);
  if(!claimed[1].meta.changes)fail(409,'Another trainer joined first.');
  row={...row,p1:owner};
 }else if(body.mode==='friendly'){
  const code=crypto.randomUUID().slice(0,6).toUpperCase();
  const state={protocol:TACTICS_PROTOCOL,loadouts:{[owner]:loadout}};
  await db.batch([
   db.prepare('INSERT INTO holds (id,player_id,match_id,stake) VALUES (?,?,?,0)').bind(hold,owner,freshId),
   db.prepare("INSERT INTO matches (id,code,p0,status,state,version,last_tick,created_at,expires_at,mode,stake,asset,transport) VALUES (?,?,?,'waiting',?,0,?,?,?,'friendly',0,'skirmish','http')").bind(freshId,code,owner,JSON.stringify(state),now,now,now+WAIT_MS)
  ]);
  row=await db.prepare('SELECT * FROM matches WHERE id=?').bind(freshId).first();
 }else{
  const code=crypto.randomUUID().slice(0,6).toUpperCase();
  const state={protocol:TACTICS_PROTOCOL,loadouts:{[owner]:loadout}};
  await db.batch([
   db.prepare('INSERT INTO holds (id,player_id,match_id,stake) VALUES (?,?,?,0)').bind(hold,owner,freshId),
   db.prepare(`INSERT INTO matches (id,code,p0,status,state,version,last_tick,created_at,expires_at,mode,stake,asset,transport) SELECT ?,?,?,'waiting',?,0,?,?,?,'ranked',0,'skirmish','http' WHERE NOT EXISTS(SELECT 1 FROM matches WHERE ${openRanked})`).bind(freshId,code,owner,JSON.stringify(state),now,now,now+WAIT_MS,owner,now),
   db.prepare(`UPDATE matches SET p1=?,expires_at=? WHERE id=(SELECT id FROM (SELECT id FROM matches WHERE ${openRanked} ORDER BY created_at,id LIMIT 1))`).bind(owner,now+WAIT_MS,owner,now),
   db.prepare("UPDATE holds SET match_id=(SELECT id FROM matches WHERE asset='skirmish' AND status='waiting' AND (p0=? OR p1=?) ORDER BY created_at DESC,id DESC LIMIT 1) WHERE id=?").bind(owner,owner,hold)
  ]);
  row=await holdFor(db,owner);
 }
 if(!row)fail(409,'The Skirmish queue could not be opened.');
 const state=parseState(row);
 state.protocol=TACTICS_PROTOCOL;
 state.loadouts={...(state.loadouts||{}),[owner]:loadout};
 await db.prepare('UPDATE matches SET state=? WHERE id=?').bind(JSON.stringify(state),row.id).run();
 if(row.p0&&row.p1){
  const live=await startDuel(db,env,{...row,state:JSON.stringify(state)},now);
  return json(await playPacket(db,env,live,owner,now,null,origin));
 }
 return json(waitingEnvelope({...row,state:JSON.stringify(state)}));
}

async function startDuel(db,env,row,now){
 const state=parseState(row);
 const [p0,p1]=await Promise.all([
  db.prepare('SELECT name FROM players WHERE id=?').bind(row.p0).first(),
  db.prepare('SELECT name FROM players WHERE id=?').bind(row.p1).first()
 ]);
 const load0=state.loadouts[row.p0],load1=state.loadouts[row.p1];
 if(!load0||!load1)fail(409,'Both Skirmish loadouts are required.');
 const frame=await getMarket(env,now);
 const authority=new TacticsAuthority({
  players:[row.p0,row.p1],
  initial:{seed:(now>>>0)||1,names:[p0.name,p1.name],decks:[load0.deck,load1.deck],captains:[load0.captain,load1.captain],specs:[load0.specs,load1.specs],marketFrame:frame}
 });
 state.checkpoint=authority.checkpoint();
 const transport=await realtimeHealthy(env)?'realtime':'http';
 const started=await db.prepare("UPDATE matches SET status='playing',state=?,last_tick=?,expires_at=?,version=version+1,transport=? WHERE id=? AND status='waiting' AND p1 IS NOT NULL").bind(JSON.stringify(state),now,now+PLAY_MS,transport,row.id).run();
 if(!started.meta.changes)fail(409,'This Skirmish room has already started.');
 const live=await db.prepare('SELECT * FROM matches WHERE id=?').bind(row.id).first();
 if(live.transport==='realtime'){try{await roomRequest(live,live.p0,null,env);}catch(error){console.warn('Skirmish room warm failed',error.message);}}
 return live;
}

async function readMatch(db,env,row,owner,now,origin){
 if(row.status==='cancelled')return json({protocol:TACTICS_PROTOCOL,id:row.id,matchId:row.id,status:'cancelled'});
 if(row.status==='waiting')return json(waitingEnvelope(row));
 return json(await playPacket(db,env,row,owner,now,null,origin));
}

async function cancelMatch(db,row,owner,now){
 if(row.status==='playing'||row.status==='ended'){
  const state=parseState(row);
  if(!state.checkpoint)fail(409,'This battle has started.');
  const authority=TacticsAuthority.restore(state.checkpoint,()=>now);
  return json(withMeta(authority.snapshot(owner),row));
 }
 if(row.status!=='waiting')fail(409,'This battle has started.');
 await db.batch([
  db.prepare("UPDATE matches SET status='cancelled',settled=1 WHERE id=? AND status='waiting'").bind(row.id),
  db.prepare('DELETE FROM holds WHERE match_id=?').bind(row.id)
 ]);
 return json({protocol:TACTICS_PROTOCOL,id:row.id,matchId:row.id,status:'cancelled'});
}

async function commandMatch(db,env,row,owner,body,now,origin){
 if(row.status!=='playing'&&row.status!=='ended')fail(409,'This Skirmish battle has not started.');
 return json(await playPacket(db,env,row,owner,now,body,origin));
}

async function playPacket(db,env,row,owner,now,command,origin){
 if(row.transport==='realtime'&&row.status!=='ended')return await attachRoom(row,owner,command,env,origin,now);
 return await livePacket(db,env,row,owner,now,command);
}

async function livePacket(db,env,row,owner,now,command=null){
 for(let attempt=0;attempt<5;attempt++){
  const live=attempt===0?row:await db.prepare('SELECT * FROM matches WHERE id=?').bind(row.id).first();
  if(!live)fail(404,'Skirmish battle not found.');
  const state=parseState(live);
  if(!state.checkpoint)fail(409,'This Skirmish battle has not started.');
  const authority=TacticsAuthority.restore(state.checkpoint,()=>now);
  authority.setMarket(await getMarket(env,now));
  let remaining=Math.max(0,Math.min(MAX_CATCH_UP,(now-live.last_tick)/1000));
  while(remaining>1e-9&&authority.game.status==='playing'){
   const step=Math.min(1,remaining);
   authority.advance(step);
   remaining-=step;
  }
  let result=null;
  if(command){
   if(command.protocol!==TACTICS_PROTOCOL)fail(400,'Incompatible Skirmish protocol.');
   result=authority.receive(owner,command);
  }
  const ended=authority.game.status==='ended';
  const persist=!!command||ended||(now-live.last_tick>=PERSIST_MS);
  const snapshot=withMeta(authority.snapshot(owner),live,result);
  if(!persist)return snapshot;
  state.checkpoint=authority.checkpoint();
  const saved=await db.prepare("UPDATE matches SET state=?,last_tick=?,status=?,expires_at=?,version=version+1,settled=? WHERE id=? AND version=?").bind(
   JSON.stringify(state),now,ended?'ended':live.status==='ended'?'ended':'playing',now+PLAY_MS,ended?1:live.settled,live.id,live.version
  ).run();
  if(!saved.meta.changes)continue;
  if(ended)await db.prepare('DELETE FROM holds WHERE match_id=?').bind(live.id).run();
  return snapshot;
 }
 fail(409,'Battle is busy. Your command can be retried with the same ID.');
}
