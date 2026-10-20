import {validDeck,DEFAULT_DECK} from '../public/game/engine.js';
import {sessionIdentity,walletAuth} from './wallet-auth.js';
import {getMarket} from './market.js';
import {rewardStatus} from './rewards.js';
import {contractConfig,verifyIntent} from './contracts.js';
import {realtimeReady} from './realtime-bridge.js';
import {verifyService} from './security.js';
import {skirmishRuntime,skirmishRoute} from './skirmish.js';
import {json,fail,name,readPlayer,publicPlayer,holdFor,cancel} from './backend-helpers.js';
import {tick,handleMatch} from './backend-match.js';
import {tokenRoute,fundTokenMatch} from './backend-token.js';
import {internal} from './backend-internal.js';

export async function api(request,env){
 try{
  const db=env.DB;if(!db)return json({error:'Online play is unavailable. You can still practice.'},503);
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').split('/'),now=Date.now();
  if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)fail(403,'Use this site to make changes.');
  if(request.method==='POST'&&!(request.headers.get('content-type')||'').includes('application/json'))fail(415,'Send JSON.');
  let body={},raw='';if(request.method==='POST'){const text=raw=await request.text();if(text.length>(path[0]==='internal'?256000:8192))fail(413,'Request is too large.');try{body=JSON.parse(text);}catch{fail(400,'Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Send a JSON object.');}
  if(path[0]==='contract-receipt'){if(request.method!=='POST'||!await verifyService(request,raw,env.CONTRACT_ADAPTER_KEY,now))fail(401,'Contract service authentication required.');const intent=await db.prepare('SELECT player_id FROM token_intents WHERE id=?').bind(body.intentId).first();if(!intent)fail(404,'Transaction request not found.');const result=await verifyIntent(db,env,intent.player_id,body.intentId,body.signature,now);if(result.pending)return json({pending:true},202);const funding=result.row.kind==='escrow'?await fundTokenMatch(db,env,result.row,now):{};return json({confirmed:true,...funding});}
  if(path[0]==='internal')return await internal(request,env,path[1],body,raw,now);
  if(path[0]==='runtime')return json({walletConnectProjectId:env.WALLETCONNECT_PROJECT_ID||null,contracts:contractConfig(env),realtime:realtimeReady(env),marketConfigured:env.MARKET_SOURCE!=='off',skirmish:skirmishRuntime(env)});
  if(path[0]==='market'){const market=await getMarket(env,now);return new Response(JSON.stringify(market),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=5'}});}
  if(path[0]==='auth'&&path[1]==='wallet')return await walletAuth(request,env,path[2],body,now);
  const identity=await sessionIdentity(request,db,now),owner=identity?.owner||request.headers.get('oai-authenticated-user-id');if(!owner)fail(401,'Connect and sign in with a Solana wallet to create your trainer account.');
  if(identity&&request.method==='POST'&&request.headers.get('origin')!==url.origin)fail(403,'Use this site to make changes.');
  // Combat traffic bypasses unrelated profile/hold reads.
  if(path[0]==='match'&&path[1])return await handleMatch(db,request,env,path,body,owner,now,url.origin);
  const held=await holdFor(db,owner);if(held&&held.expires_at<now){if((held.asset==='token'||held.asset==='skirmish')&&held.status==='waiting'){/* joinable rooms stay until cancel */}else if(held.asset==='skirmish'&&held.status==='playing'){/* HTTP Skirmish advances on its own routes */}else if(held.status==='waiting'||held.status==='funding')await cancel(db,held,now);else if(held.status==='playing')await tick(db,held.id,owner,now,null,env,held);}
  if(path[0]==='profile'&&request.method==='POST'){
   const deck=body.deck??DEFAULT_DECK;if(!validDeck(deck))fail(400,'Choose eight different creatures.');
   const old=await readPlayer(db,owner);if(old&&await holdFor(db,owner)&&old.deck!==JSON.stringify(deck))fail(409,'Finish or cancel your battle before changing your deck.');
   await db.prepare('INSERT INTO players (id,name,deck,levels,created_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,deck=excluded.deck').bind(owner,name(body.name),JSON.stringify(deck),JSON.stringify(Array(12).fill(1)),now).run();
   return json(publicPlayer(await readPlayer(db,owner)));
  }
  const p=await readPlayer(db,owner);if(!p)fail(409,'Create your trainer profile first.');
  if(path[0]==='profile'){const hold=await holdFor(db,owner);return json({...publicPlayer(p),wallet:identity?.wallet||null,activeMatch:hold?{id:hold.id,status:hold.status,mode:hold.mode,code:hold.code,stake:hold.stake,asset:hold.asset}:null});}
  if(path[0]==='rewards'){
   if(request.method!=='GET')fail(410,'Daily credit rewards are retired. Win WICKB by staking it in token battles.');
   return json(await rewardStatus(db,owner));
  }
  if(path[0]==='token')return await tokenRoute(request,env,path,body,p,identity,now,url.origin);
  if(path[0]==='ledger')return json({entries:(await db.prepare('SELECT delta,kind,created_at FROM ledger WHERE player_id=? ORDER BY created_at DESC,rowid DESC LIMIT 40').bind(owner).all()).results});
  if(path[0]==='ranks')return json({players:(await db.prepare('SELECT name,wins,losses,token_earned AS tokenEarned FROM players ORDER BY token_earned DESC,wins DESC,name ASC LIMIT 30').all()).results,currency:env.GAME_TOKEN_SYMBOL||'WICKB'});
  if(path[0]==='queue'||path[0]==='rooms'||path[0]==='upgrade')fail(410,'Credit battles and credit upgrades are retired. Stake WICKB in the token arena.');
  if(path[0]==='skirmish')return await skirmishRoute(request,env,path,body,p,identity,now);
  return json({error:'Route not found.'},404);
 }catch(e){if(e.status)return json({error:e.message},e.status);if(/Insufficient credits|NOT NULL constraint failed: ledger.id/.test(e.message))return json({error:'Not enough credits.'},400);if(/UNIQUE constraint/.test(e.message))return json({error:'That action was already processed, or you have an active battle. Refresh your account.'},409);console.error('Game API error',e.message);return json({error:'Online service error. Try again shortly.'},500);}
}
