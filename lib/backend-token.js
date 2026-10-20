import {newGame} from '../public/game/engine.js';
import {getMarket} from './market.js';
import {marketBaseline} from '../public/game/tokens.js';
import {contractConfig,tokenOracleRequired,tokenLevels,prepareIntent,verifyIntent,adapter,toUnits,syncStakes} from './contracts.js';
import {roomRequest,realtimeHealthy} from './realtime-bridge.js';
import {sha256} from './security.js';
import {json,fail,stakes,TOKEN_WAIT_MS,TOKEN_FUND_MS,openRankedToken,readPlayer,holdFor,cancel} from './backend-helpers.js';

export async function tokenRoute(request,env,path,body,p,identity,now,origin){
 const db=env.DB,owner=p.id,cfg=contractConfig(env);
 if(path[1]==='status'){
  if(cfg.configured){try{await syncStakes(db,env,owner,now);}catch{/* trainer still shows last verified D1 positions if the adapter is unreachable */}}
  const pending=(await db.prepare("SELECT m.id,m.stake,m.stake_units,m.status FROM matches m WHERE m.asset='token' AND m.status='cancelled' AND (m.p0=? OR m.p1=?) AND EXISTS(SELECT 1 FROM token_intents t WHERE t.match_id=m.id AND t.player_id=? AND t.kind='escrow' AND t.status='confirmed') AND NOT EXISTS(SELECT 1 FROM token_intents r WHERE r.match_id=m.id AND r.player_id=? AND r.kind='refund' AND r.status='confirmed') LIMIT 10").bind(owner,owner,owner,owner).all()).results;
  const settlements=(await db.prepare("SELECT m.id,m.stake,s.status,s.receipt FROM matches m JOIN token_settlements s ON s.match_id=m.id WHERE m.asset='token' AND (m.p0=? OR m.p1=?) ORDER BY s.updated_at DESC LIMIT 10").bind(owner,owner).all()).results.map(r=>({id:r.id,stake:r.stake,status:r.status,signature:r.receipt?JSON.parse(r.receipt).signature:null}));
  const withdrawable=(await db.prepare("SELECT id,card,amount_units AS amountUnits,lock_until AS lockUntil FROM token_positions WHERE player_id=? AND status='active' AND lock_until<=? LIMIT 30").bind(owner,now).all()).results;return json({config:cfg,wallet:identity?.wallet||null,...await tokenLevels(db,owner,now),refunds:pending,withdrawable,settlements});
 }
 if(request.method!=='POST')fail(404,'Token route not found.');
 if(!identity?.wallet)fail(401,'Sign in with your Solana wallet first.');
 if(path[1]==='stake'&&path[2]==='prepare'){
  if(await holdFor(db,owner))fail(409,'Finish or cancel your battle before staking.');
  return json(await prepareIntent(db,env,owner,identity.wallet,{...body,kind:'stake'},now));
 }
 if(path[1]==='unstake'&&path[2]==='prepare'){
  if(typeof body.positionId!=='string'||body.positionId.length>80)fail(400,'Staking position ID required.');
  if(await holdFor(db,owner))fail(409,'Finish your battle before withdrawing stake.');
  const position=await db.prepare("SELECT * FROM token_positions WHERE id=? AND player_id=? AND wallet=? AND status='active' AND lock_until<=?").bind(body.positionId,owner,identity.wallet,now).first();if(!position)fail(409,'This staking position is still locked or belongs to another wallet.');
  return json(await prepareIntent(db,env,owner,identity.wallet,{kind:'unstake',actionId:body.actionId,amountUnits:position.amount_units,card:position.card,positionRef:position.position},now));
 }
 if(path[1]==='refund'&&path[2]==='prepare'){
  if(typeof body.matchId!=='string'||body.matchId.length>64)fail(400,'Match ID required.');
  const row=await db.prepare("SELECT * FROM matches WHERE id=? AND asset='token' AND status='cancelled' AND (p0=? OR p1=?)").bind(body.matchId,owner,owner).first();if(!row)fail(404,'Refundable battle not found.');
  const original=await db.prepare("SELECT * FROM token_intents WHERE match_id=? AND player_id=? AND kind='escrow' AND status='confirmed'").bind(row.id,owner).first();if(!original)fail(409,'No finalized escrow was found.');if(original.wallet!==identity.wallet)fail(409,'Reconnect the wallet that funded this escrow.');if(await db.prepare("SELECT id FROM token_intents WHERE match_id=? AND player_id=? AND kind='refund' AND status='confirmed'").bind(row.id,owner).first())fail(409,'This escrow was already refunded.');
  return json(await prepareIntent(db,env,owner,identity.wallet,{kind:'refund',actionId:body.actionId,matchId:row.id,amountUnits:original.amount_units,positionRef:JSON.parse(original.receipt).position,side:row.p0===owner?0:1},now));
 }
 if(path[1]==='intent'&&path[2]&&path[3]==='confirm'){
  const verified=await verifyIntent(db,env,owner,path[2],body.signature,now);
  if(verified.pending)return json({pending:true,intentId:path[2]},202);
  const funding=verified.row.kind==='escrow'?await fundTokenMatch(db,env,verified.row,now):{};
  return json({confirmed:true,...funding,kind:verified.row.kind,matchId:verified.row.match_id,...await tokenLevels(db,owner,now)});
 }
 if(path[1]==='battle'){
  if(typeof body.actionId!=='string'||!/^[a-zA-Z0-9-]{8,64}$/.test(body.actionId))fail(400,'Battle request ID required.');
  if(!cfg.enabled)fail(503,'Token battles open after the escrow, oracle, and live match service are connected.');
  if(!await realtimeHealthy(env))fail(503,'The live token arena is reconnecting. No entry was reserved.');
  const own=await holdFor(db,owner);if(own){const previous=await db.prepare("SELECT * FROM token_intents WHERE id=? AND player_id=? AND match_id=? AND kind='escrow'").bind(await sha256(owner+':token:'+body.actionId),owner,own.id).first();if(previous?.status==='prepared'&&previous.expires_at>now&&['waiting','funding'].includes(own.status))return json({...JSON.parse(previous.receipt),matchId:own.id,code:own.code,side:previous.side,stake:own.stake});if(own.asset==='token'&&own.status==='playing')return json({match:own.id});fail(409,'Finish or cancel your current battle first.');}
  if(!stakes.includes(body.stake))fail(400,'Choose a 25, 50, or 100 token entry.');
  const market=await getMarket(env,now),deck=JSON.parse(p.deck);if(tokenOracleRequired(env)&&deck.some(i=>market.prices[i]?.status!=='live'))fail(503,'One or more character price feeds are unavailable. Try again shortly.');
  const freshId=crypto.randomUUID(),hold=crypto.randomUUID(),units=toUnits(body.stake,cfg.decimals);let row;
  if(body.code){
   row=await db.prepare("SELECT * FROM matches WHERE code=? AND asset='token' AND status IN ('waiting','funding') AND p1 IS NULL AND (expires_at>? OR EXISTS(SELECT 1 FROM holds h WHERE h.match_id=matches.id))").bind(String(body.code).trim().toUpperCase(),now).first();if(!row)fail(404,'Token room not found.');if(row.p0===owner)fail(400,'Another trainer needs to join.');if(body.stake!==row.stake)fail(409,'Confirm the same entry amount as your rival.');
   const claimed=await db.batch([db.prepare("INSERT INTO holds (id,player_id,match_id,stake) SELECT ?,?,?,0 FROM matches WHERE id=? AND status IN ('waiting','funding') AND p1 IS NULL").bind(hold,owner,row.id,row.id),db.prepare("UPDATE matches SET p1=?,status='funding',expires_at=? WHERE id=? AND p1 IS NULL AND status IN ('waiting','funding') AND EXISTS(SELECT 1 FROM holds WHERE id=?)").bind(owner,now+TOKEN_FUND_MS,row.id,hold)]);if(!claimed[1].meta.changes)fail(409,'Another trainer joined first.');row={...row,p1:owner};
  }else if(body.mode==='friendly'){
   const code=crypto.randomUUID().slice(0,6).toUpperCase();await db.batch([db.prepare('INSERT INTO holds (id,player_id,match_id,stake) VALUES (?,?,?,0)').bind(hold,owner,freshId),db.prepare("INSERT INTO matches (id,code,p0,status,state,version,last_tick,created_at,expires_at,mode,stake,asset,stake_units,transport) VALUES (?,?,?,'funding','{}',0,?,?,?,'friendly',?,'token',?,'realtime')").bind(freshId,code,owner,now,now,now+TOKEN_FUND_MS,body.stake,units)]);row=await db.prepare('SELECT * FROM matches WHERE id=?').bind(freshId).first();
  }else{
   const code=crypto.randomUUID().slice(0,6).toUpperCase();
   await db.batch([
    db.prepare('INSERT INTO holds (id,player_id,match_id,stake) VALUES (?,?,?,0)').bind(hold,owner,freshId),
    db.prepare(`INSERT INTO matches (id,code,p0,status,state,version,last_tick,created_at,expires_at,mode,stake,asset,stake_units,transport) SELECT ?,?,?,'funding','{}',0,?,?,?,'ranked',?,'token',?,'realtime' WHERE NOT EXISTS(SELECT 1 FROM matches WHERE ${openRankedToken})`).bind(freshId,code,owner,now,now,now+TOKEN_FUND_MS,body.stake,units,body.stake,owner,now),
    db.prepare(`UPDATE matches SET p1=?,status='funding',expires_at=? WHERE id=(SELECT id FROM (SELECT id FROM matches WHERE ${openRankedToken} ORDER BY created_at,id LIMIT 1))`).bind(owner,now+TOKEN_FUND_MS,body.stake,owner,now),
    db.prepare("UPDATE holds SET match_id=(SELECT id FROM matches WHERE asset='token' AND status IN ('waiting','funding') AND (p0=? OR p1=?) ORDER BY created_at DESC,id DESC LIMIT 1) WHERE id=?").bind(owner,owner,hold)
   ]);row=await holdFor(db,owner);
  }
  const id=row.id,side=row.p0===owner?0:1,amountUnits=row.stake_units,code=row.code;
  try{const proposal=await prepareIntent(db,env,owner,identity.wallet,{kind:'escrow',actionId:body.actionId,amountUnits,matchId:id,side},now);return json({...proposal,matchId:id,code,side,stake:body.stake});}
  catch(e){const match=await db.prepare('SELECT * FROM matches WHERE id=?').bind(id).first();await cancel(db,match,now);throw e;}
 }
 fail(404,'Token route not found.');
}
export async function fundTokenMatch(db,env,intent,now){
 const row=await db.prepare('SELECT * FROM matches WHERE id=?').bind(intent.match_id).first();if(!row)fail(404,'Token battle not found.');
 if(row.status==='cancelled'||row.expires_at<now){await cancel(db,row,now);return {cancelled:true,refundAvailable:true};}
 if(row.status==='playing'||row.status==='ended')return;
 const escrows=(await db.prepare("SELECT * FROM token_intents WHERE match_id=? AND kind='escrow' AND status='confirmed'").bind(row.id).all()).results;
 const funded=side=>escrows.some(e=>e.side===side&&e.player_id===(side===0?row.p0:row.p1));
 if(!funded(0)||!funded(1)){if(funded(0)&&!row.p1)await db.prepare("UPDATE matches SET status='waiting',expires_at=? WHERE id=? AND status='funding' AND p1 IS NULL").bind(now+TOKEN_WAIT_MS,row.id).run();return;}
 await Promise.all([syncStakes(db,env,row.p0,now),syncStakes(db,env,row.p1,now)]);
 const players=await Promise.all([readPlayer(db,row.p0),readPlayer(db,row.p1)]),levels=await Promise.all(players.map(p=>tokenLevels(db,p.id,now))),frame=await getMarket(env,now);
 if(tokenOracleRequired(env)&&players.some(p=>JSON.parse(p.deck).some(i=>frame.prices[i]?.status!=='live'))){await cancel(db,row,now);return {cancelled:true,refundAvailable:true};}
 const g=newGame({names:players.map(p=>p.name),decks:players.map(p=>JSON.parse(p.deck)),levels:levels.map(l=>l.levels),seed:now>>>0});g.market=marketBaseline(frame,now);
 const started=await db.prepare("UPDATE matches SET status='playing',state=?,last_tick=?,expires_at=?,version=version+1 WHERE id=? AND status IN ('funding','waiting')").bind(JSON.stringify(g),now,now+210000,row.id).run();if(started.meta.changes){const live=await db.prepare('SELECT * FROM matches WHERE id=?').bind(row.id).first();await roomRequest(live,row.p0,null,env);}
}
export async function settleToken(db,row,g,now,env){
 if(row.settled)return;
 await db.prepare("INSERT OR IGNORE INTO token_settlements (match_id,status,updated_at) VALUES (?,'pending',?)").bind(row.id,now).run();
 try{
  const escrow=(await db.prepare("SELECT wallet,side,receipt FROM token_intents WHERE match_id=? AND kind='escrow' AND status='confirmed' ORDER BY side").bind(row.id).all()).results;if(escrow.length!==2)fail(409,'Both escrows are required for settlement.');
  const receipt=await adapter(env,'settle',{settlementId:'match:'+row.id,matchId:row.id,winner:g.winner,amountUnits:row.stake_units,participants:escrow.map(e=>({wallet:e.wallet,side:Number(e.side),position:JSON.parse(e.receipt).position}))}),cfg=contractConfig(env);
  const payoutsOk=Array.isArray(receipt.payouts)&&receipt.payouts.length===2&&escrow.every(e=>receipt.payouts.filter(p=>p.wallet===e.wallet&&p.amountUnits===(BigInt(row.stake_units)*(g.winner===-1?1n:g.winner===Number(e.side)?2n:0n)).toString()).length===1);
  if(!payoutsOk||receipt.decimals!==cfg.decimals||receipt.finalized!==true||receipt.success!==true||receipt.matchId!==row.id||receipt.winner!==g.winner||receipt.mint!==cfg.mint||receipt.programId!==cfg.programId||receipt.amountUnits!==row.stake_units||typeof receipt.signature!=='string'){
   await db.prepare("UPDATE token_settlements SET status='submitted',receipt=?,updated_at=? WHERE match_id=?").bind(JSON.stringify(receipt),now,row.id).run();return;
  }
  const statements=[db.prepare("UPDATE token_settlements SET status='finalized',receipt=?,updated_at=? WHERE match_id=?").bind(JSON.stringify(receipt),now,row.id)];
  for(let side=0;side<2;side++){
   const earned=g.winner===side?row.stake:0,id=side===0?row.p0:row.p1;
   if(earned)statements.push(db.prepare("INSERT INTO ledger (id,player_id,delta,kind,match_id,created_at) SELECT ?,?,?, 'token_win',?,? FROM matches WHERE id=? AND settled=0 AND status='ended'").bind('token_win:'+row.id+':'+side,id,earned,row.id,now,row.id));
   statements.push(db.prepare("UPDATE players SET wins=wins+?,losses=losses+?,token_earned=token_earned+?,revision=revision+1 WHERE id=? AND EXISTS(SELECT 1 FROM matches WHERE id=? AND settled=0 AND status='ended')").bind(g.winner===side?1:0,g.winner!==side&&g.winner!==-1?1:0,earned,id,row.id));
  }
  statements.push(db.prepare('DELETE FROM holds WHERE match_id=?').bind(row.id),db.prepare("UPDATE matches SET settled=1 WHERE id=? AND status='ended'").bind(row.id));await db.batch(statements);
 }catch(e){console.warn('Token settlement pending');await db.prepare("UPDATE token_settlements SET status='failed',updated_at=? WHERE match_id=? AND status<>'finalized'").bind(now,row.id).run();}
}
