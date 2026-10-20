import {getMarket} from './market.js';
import {advanceMatch,runCommand,envelope} from './match-engine.js';
import {realtimeTicket,roomRequest} from './realtime-bridge.js';
import {json,fail,TOKEN_WAIT_MS,readPlayer,publicPlayer,cancel} from './backend-helpers.js';
import {settleToken} from './backend-token.js';

export async function tick(db,id,owner,now,action=null,env={},initialRow=null){
 for(let i=0;i<5;i++){
  const row=i===0&&initialRow?initialRow:await db.prepare('SELECT * FROM matches WHERE id=?').bind(id).first();if(!row)fail(404,'Battle not found.');const side=row.p0===owner?0:1;
  if(row.transport==='realtime'&&row.status!=='ended')return roomRequest(row,owner,action,env);
  const g=JSON.parse(row.state),needsMarket=g.market&&g.time+(now-row.last_tick)/1000>=g.market.nextUpdate,frame=needsMarket?await getMarket(env,now):null,ran=advanceMatch(g,Math.max(0,(now-row.last_tick)/1000),frame);
  if(action?.type==='surrender'&&!action.actionId)action={...action,actionId:'surrender-'+side};
  const result=action?runCommand(g,side,action):{ok:true};
  const ended=g.status==='ended',persist=!!action||(ended&&row.status!=='ended')||(ran>0&&now-row.last_tick>=1000);
  if(!persist){if(ended&&!row.settled)await settle(db,row,g,now,env);return envelope(row,g,side,result,now);}
  if(!ran&&!action&&row.status===g.status){if(ended&&!row.settled)await settle(db,row,g,now,env);return envelope(row,g,side,result,now);}
  const r=await db.prepare('UPDATE matches SET state=?,last_tick=?,version=version+1,status=? WHERE id=? AND version=?').bind(JSON.stringify(g),row.last_tick+ran*1000,g.status,id,row.version).run();
  if(r.meta.changes){if(ended)await settle(db,row,g,now,env);return envelope({...row,version:row.version+1},g,side,result,now);}
 }fail(409,'Battle is busy. Your command can be retried with the same ID.');
}
export async function settle(db,row,g,now,env={}){
 if(row.asset==='token')return settleToken(db,row,g,now,env);
 const statements=[];for(let p=0;p<2;p++){
  const id=p===0?row.p0:row.p1;if(g.winner===p||g.winner===-1)statements.push(db.prepare("INSERT INTO ledger (id,player_id,delta,kind,match_id,created_at) SELECT ?,?,stake*?, ?,id,? FROM matches WHERE id=? AND status='ended' AND settled=0").bind('payout:'+row.id+':'+p,id,g.winner===-1?1:2,g.winner===-1?'draw_refund':'win',now,row.id));
  statements.push(db.prepare("UPDATE players SET balance=balance+?,revision=revision+1,wins=wins+?,losses=losses+?,trophies=MAX(0,trophies+?) WHERE id=? AND EXISTS(SELECT 1 FROM matches WHERE id=? AND status='ended' AND settled=0)").bind(g.winner===p?row.stake*2:g.winner===-1?row.stake:0,g.winner===p?1:0,g.winner!==p&&g.winner!==-1?1:0,g.winner===-1?0:g.winner===p?30:-15,id,row.id));
 }
 statements.push(db.prepare("DELETE FROM holds WHERE match_id=? AND EXISTS (SELECT 1 FROM matches WHERE id=? AND status='ended')").bind(row.id,row.id),db.prepare("UPDATE matches SET settled=1 WHERE id=? AND status='ended' AND settled=0").bind(row.id));await db.batch(statements);
}
export async function handleMatch(db,request,env,path,body,owner,now,origin){
 const row=await db.prepare('SELECT * FROM matches WHERE id=? AND (p0=? OR p1=?)').bind(path[1],owner,owner).first();if(!row)fail(404,'Battle not found.');
 if(path[2]==='ticket'&&request.method==='POST'){if(row.transport!=='realtime'||row.status!=='playing')fail(409,'This battle is not on the realtime service.');return json(await realtimeTicket(row,owner,origin,env,now));}
 if(path[2]==='cancel'&&request.method==='POST'){
  if(!['waiting','funding'].includes(row.status)||(row.p0!==owner&&!(row.asset==='token'&&row.status==='funding')))fail(409,'This battle has started or only its host can cancel.');
  await cancel(db,row,now);return json({cancelled:true,asset:row.asset,refundPending:row.asset==='token',profile:publicPlayer(await readPlayer(db,owner))});
 }
 if(['waiting','funding','cancelled'].includes(row.status)){
  if(row.asset==='token'&&['waiting','funding'].includes(row.status)&&!row.p1)await db.prepare("UPDATE matches SET expires_at=? WHERE id=? AND status IN ('waiting','funding') AND p1 IS NULL").bind(now+TOKEN_WAIT_MS,row.id).run();
  return json({id:row.id,code:row.code,status:row.status,stake:row.stake,asset:row.asset});
 }
 if(request.method==='POST'&&!['deploy','surrender'].includes(path[2]))fail(404,'Action not found.');
 const action=request.method==='POST'?{...body,type:path[2]}:null,data=await tick(db,row.id,owner,now,action,env,row);
 if(row.transport==='realtime'&&data.state?.status==='playing')data.connection=await realtimeTicket(row,owner,origin,env,now);
 return json(data);
}
