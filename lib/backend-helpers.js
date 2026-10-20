const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const name=n=>String(n||'Trainer').replace(/[<>\x00-\x1f]/g,'').trim().slice(0,16)||'Trainer';
const stakes=[25,50,100],TOKEN_WAIT_MS=600000,TOKEN_FUND_MS=240000;
const openRankedToken="asset='token' AND mode='ranked' AND stake=? AND p0<>? AND p1 IS NULL AND status IN ('waiting','funding') AND (expires_at>? OR EXISTS(SELECT 1 FROM holds h WHERE h.match_id=matches.id))";
const readPlayer=(db,id)=>db.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
const publicPlayer=p=>({name:p.name,deck:JSON.parse(p.deck),levels:JSON.parse(p.levels),balance:p.balance,wins:p.wins,losses:p.losses,trophies:p.trophies,tokenEarned:p.token_earned||0});
const holdFor=(db,id)=>db.prepare('SELECT m.* FROM holds h JOIN matches m ON m.id=h.match_id WHERE h.player_id=?').bind(id).first();
async function cancel(db,row,now){
 if(row.asset==='token'||row.asset==='skirmish'){
  await db.batch([db.prepare("UPDATE matches SET status='cancelled',settled=1 WHERE id=? AND status IN ('waiting','funding')").bind(row.id),db.prepare("DELETE FROM holds WHERE match_id=? AND EXISTS(SELECT 1 FROM matches WHERE id=? AND status='cancelled')").bind(row.id,row.id)]);return;
 }
 await db.batch([
 db.prepare("UPDATE players SET balance=balance+?,revision=revision+1 WHERE id=? AND EXISTS (SELECT 1 FROM matches WHERE id=? AND status='waiting' AND settled=0)").bind(row.stake,row.p0,row.id),
 db.prepare("INSERT INTO ledger (id,player_id,delta,kind,match_id,created_at) SELECT ?,p0,stake,'refund',id,? FROM matches WHERE id=? AND status='waiting' AND settled=0").bind('refund:'+row.id,now,row.id),
 db.prepare("DELETE FROM holds WHERE match_id=? AND EXISTS (SELECT 1 FROM matches WHERE id=? AND status='waiting')").bind(row.id,row.id),
 db.prepare("UPDATE matches SET status='cancelled',settled=1 WHERE id=? AND status='waiting'").bind(row.id)
]);}

export {json,fail,name,stakes,TOKEN_WAIT_MS,TOKEN_FUND_MS,openRankedToken,readPlayer,publicPlayer,holdFor,cancel};
