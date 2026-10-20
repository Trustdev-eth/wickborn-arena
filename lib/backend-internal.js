import {getMarket} from './market.js';
import {verifyService} from './security.js';
import {json,fail} from './backend-helpers.js';
import {settle} from './backend-match.js';

export async function internal(request,env,route,body,raw,now){
 if(request.method!=='POST'||!await verifyService(request,raw,env.REALTIME_SHARED_SECRET,now))fail(401,'Service authentication required.');
 if(route==='market')return json(await getMarket(env,now));
 if(typeof body.id!=='string'||body.id.length>64)fail(400,'Match ID required.');
 const db=env.DB,row=await db.prepare('SELECT * FROM matches WHERE id=?').bind(body.id).first();if(!row||row.transport!=='realtime')fail(404,'Realtime battle not found.');
 if(route==='bootstrap')return json({row,participants:[row.p0,row.p1]});
 if(route==='settle'){
  if(row.asset==='skirmish')return json(await settleSkirmish(db,row,body.state,now));
  const g=body.state;if(!g||g.status!=='ended'||![-1,0,1].includes(g.winner)||!Number.isFinite(g.time)||g.time<0||g.time>151||!Array.isArray(g.towers)||g.towers.length!==6||!Array.isArray(g.units)||g.units.length>120)fail(400,'Invalid authoritative result.');
  if(row.status==='ended'&&JSON.parse(row.state).winner!==g.winner)fail(409,'A different result is already recorded.');
  if(row.status==='playing')await db.prepare("UPDATE matches SET state=?,status='ended',version=version+1 WHERE id=? AND status='playing' AND transport='realtime'").bind(JSON.stringify(g),row.id).run();
  else if(row.status!=='ended')fail(409,'This match cannot be settled.');
  const canonical=await db.prepare('SELECT * FROM matches WHERE id=?').bind(row.id).first(),state=JSON.parse(canonical.state);if(state.winner!==g.winner)fail(409,'A different result is already recorded.');await settle(db,canonical,state,now,env);const final=await db.prepare('SELECT settled FROM matches WHERE id=?').bind(row.id).first();return json({recorded:true,settled:!!final.settled});
 }
 fail(404,'Service route not found.');
}

function skirmishWinner(state){
 try{const parsed=typeof state==='string'?JSON.parse(state):state;return parsed?.checkpoint?.game?.winner??parsed?.winner;}catch{return undefined;}
}

async function settleSkirmish(db,row,g,now){
 if(!g||g.status!=='ended'||g.ruleset!=='wickborn-tactics'||g.round!==240||g.mode!=='duel'||![-1,0,1].includes(g.winner)||!Number.isFinite(g.time)||g.time<0||g.time>241||!Array.isArray(g.towers)||g.towers.length!==6||!Array.isArray(g.units)||g.units.length>120)fail(400,'Invalid authoritative result.');
 const recorded=skirmishWinner(row.state);
 if(row.status==='ended'&&recorded!==g.winner)fail(409,'A different result is already recorded.');
 if(row.status==='playing'){
  let state={};try{state=JSON.parse(row.state||'{}');}catch{state={};}
  state.checkpoint={players:state.checkpoint?.players||[row.p0,row.p1],game:g,sequence:state.checkpoint?.sequence||0,accumulator:state.checkpoint?.accumulator||0,receipts:state.checkpoint?.receipts||[[],[]],frame:state.checkpoint?.frame||null};
  await db.prepare("UPDATE matches SET state=?,status='ended',version=version+1,settled=1,last_tick=? WHERE id=? AND status='playing' AND transport='realtime'").bind(JSON.stringify(state),now,row.id).run();
  await db.prepare('DELETE FROM holds WHERE match_id=?').bind(row.id).run();
 }else if(row.status!=='ended')fail(409,'This match cannot be settled.');
 const canonical=await db.prepare('SELECT * FROM matches WHERE id=?').bind(row.id).first();
 if(skirmishWinner(canonical.state)!==g.winner)fail(409,'A different result is already recorded.');
 if(!canonical.settled)await db.prepare("UPDATE matches SET settled=1 WHERE id=? AND status='ended'").bind(row.id).run();
 const final=await db.prepare('SELECT settled FROM matches WHERE id=?').bind(row.id).first();
 return {recorded:true,settled:!!final.settled};
}
