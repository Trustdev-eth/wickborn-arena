import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {api} from '../lib/backend.js';
import {DEFAULT_DECK} from '../public/game/engine.js';
import {TacticsAuthority,TACTICS_PROTOCOL} from '../public/game/tactics/protocol.js';
import {isSkirmishSnapshot} from '../public/game/tactics/online.js';
import {signedHeaders} from '../lib/security.js';
const require=createRequire(import.meta.url),r=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=r('miniflare');
let mf,db;
const specs=Array(12).fill(0);
before(async()=>{mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'skirmish-host'}});db=await mf.getD1Database('DB');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql.trim()).run();});
after(async()=>{await mf?.dispose();});
function env(extra={}){return {DB:db,MARKET_SOURCE:'off',...extra};}
async function req(owner,path,body,extra={}){
 const headers={'oai-authenticated-user-id':owner};
 if(body!==undefined){headers['Content-Type']='application/json';headers.origin='https://game.test';}
 const response=await api(new Request('https://game.test/api/'+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),env(extra));
 return {status:response.status,data:await response.json()};
}
async function player(id){const d=await req(id,'profile',{name:id,deck:DEFAULT_DECK});assert.equal(d.status,200,JSON.stringify(d.data));return d.data;}
function battleBody(id,extra={}){return {protocol:TACTICS_PROTOCOL,actionId:'skirmish-'+id,mode:'ranked',deck:DEFAULT_DECK,captain:0,specs,...extra};}

test('ranked queue pairs the next waiting trainer',async()=>{
 await player('hotel');await player('india');
 const queued=await req('hotel','skirmish/battle',battleBody('hotel-q'));
 assert.equal(queued.data.status,'waiting');
 const joined=await req('india','skirmish/battle',battleBody('india-q'));
 assert.equal(isSkirmishSnapshot(joined.data),true,JSON.stringify(joined.data));
 assert.equal(joined.data.side,1);
});

test('runtime advertises free Skirmish online and can be switched off',async()=>{
 const on=await api(new Request('https://game.test/api/runtime'),env());
 assert.equal(on.status,200);
 const body=await on.json();
 assert.deepEqual(body.skirmish,{enabled:true,protocol:TACTICS_PROTOCOL,entry:'free',path:'skirmish'});
 const off=await api(new Request('https://game.test/api/runtime'),env({SKIRMISH_ONLINE:'false'}));
 assert.equal((await off.json()).skirmish.enabled,false);
});

async function openDuel(a,b,extra={}){
 const queued=await req(a,'skirmish/battle',battleBody(a,{mode:'friendly'}),extra);
 assert.equal(queued.status,200,JSON.stringify(queued.data));
 assert.equal(queued.data.status,'waiting');
 const joined=await req(b,'skirmish/battle',battleBody(b,{mode:'friendly',code:queued.data.code}),extra);
 assert.equal(joined.status,200,JSON.stringify(joined.data));
 assert.equal(isSkirmishSnapshot(joined.data),true,JSON.stringify(joined.data));
 return joined.data;
}
function realtimeEnv(){
 const secret='skirmish-host-realtime-secret-with-entropy';
 return {
  REALTIME_URL:'http://127.0.0.1:8787',
  REALTIME_SHARED_SECRET:secret,
  REALTIME:{
   async fetch(request){
    const url=new URL(request.url);
    if(url.pathname==='/health')return Response.json({ok:true,protocol:1});
    const parts=url.pathname.split('/'),id=parts[2],op=parts[3],data=JSON.parse(await request.text());
    const row=await db.prepare('SELECT * FROM matches WHERE id=?').bind(id).first();
    const auth=TacticsAuthority.restore(JSON.parse(row.state).checkpoint);
    if(op==='command'&&data.action){
     const result=auth.receive(data.player,data.action);
     return Response.json({...auth.snapshot(data.player),...result,id,matchId:id,transport:'realtime'});
    }
    return Response.json({...auth.snapshot(data.player),id,matchId:id,transport:'realtime',ok:true});
   }
  }
 };
}

test('two trainers enter a Skirmish room and keep rival hands private',async()=>{
 await player('alpha');await player('bravo');
 const live=await openDuel('alpha','bravo');
 assert.equal(live.side,1);
 assert.deepEqual(live.state.hand[0],[]);
 assert.equal(live.state.hand[1].length,4);
 const view=await req('alpha','skirmish/match/'+live.id);
 assert.equal(isSkirmishSnapshot(view.data),true,JSON.stringify(view.data));
 assert.equal(view.data.side,0);
 assert.deepEqual(view.data.state.hand[1],[]);
});

test('HTTP commands are idempotent and never attach a token settlement',async()=>{
 await player('charlie');await player('delta');
 const live=await openDuel('charlie','delta');
 const command={protocol:TACTICS_PROTOCOL,actionId:'move-once-0001',type:'move',x:200,y:500};
 const first=await req('charlie','skirmish/match/'+live.id+'/command',command);
 const again=await req('charlie','skirmish/match/'+live.id+'/command',command);
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.ok,true);
 assert.equal(again.data.duplicate,true);
 const settlements=await db.prepare('SELECT count(*) n FROM token_settlements').first();
 assert.equal(settlements.n,0);
});

test('HTTP fallback does not rewrite D1 on every snapshot read',async()=>{
 await player('lima');await player('mike');
 const live=await openDuel('lima','mike');
 assert.equal(live.transport,'http');
 const before=await db.prepare('SELECT version FROM matches WHERE id=?').bind(live.id).first();
 const first=await req('lima','skirmish/match/'+live.id);
 const second=await req('lima','skirmish/match/'+live.id);
 assert.equal(isSkirmishSnapshot(first.data),true);
 assert.equal(isSkirmishSnapshot(second.data),true);
 const after=await db.prepare('SELECT version FROM matches WHERE id=?').bind(live.id).first();
 assert.equal(after.version,before.version);
 const ticket=await req('lima','skirmish/match/'+live.id+'/ticket',{protocol:TACTICS_PROTOCOL});
 assert.equal(ticket.status,503);
});

test('a healthy realtime worker hosts Skirmish and issues connection tickets',async()=>{
 await player('november');await player('oscar');
 const extra=realtimeEnv();
 const live=await openDuel('november','oscar',extra);
 assert.equal(live.transport,'realtime');
 assert.ok(live.connection?.url);
 const before=await db.prepare('SELECT version,transport FROM matches WHERE id=?').bind(live.id).first();
 assert.equal(before.transport,'realtime');
 await req('november','skirmish/match/'+live.id,undefined,extra);
 await req('oscar','skirmish/match/'+live.id,undefined,extra);
 const after=await db.prepare('SELECT version FROM matches WHERE id=?').bind(live.id).first();
 assert.equal(after.version,before.version);
 const ticket=await req('oscar','skirmish/match/'+live.id+'/ticket',{protocol:TACTICS_PROTOCOL},extra);
 assert.equal(ticket.status,200,JSON.stringify(ticket.data));
 assert.match(ticket.data.url,/^ws:\/\/127\.0\.0\.1:8787\/matches\//);
});

test('surrender ends a free Skirmish match without ledger or token rows',async()=>{
 await player('papa');await player('quebec');
 const live=await openDuel('papa','quebec');
 const ended=await req('papa','skirmish/match/'+live.id+'/command',{protocol:TACTICS_PROTOCOL,actionId:'surrender-host-0001',type:'surrender'});
 assert.equal(ended.status,200,JSON.stringify(ended.data));
 assert.equal(ended.data.state.status,'ended');
 assert.equal(ended.data.state.winner,1);
 const row=await db.prepare('SELECT settled,status FROM matches WHERE id=?').bind(live.id).first();
 assert.equal(row.status,'ended');
 assert.equal(row.settled,1);
 assert.equal((await db.prepare('SELECT count(*) n FROM ledger').first()).n,0);
 assert.equal((await db.prepare('SELECT count(*) n FROM token_settlements').first()).n,0);
});

test('internal Skirmish settlement records the free result without paying tokens',async()=>{
 await player('romeo');await player('sierra');
 const extra=realtimeEnv();
 const live=await openDuel('romeo','sierra',extra);
 const row=await db.prepare('SELECT * FROM matches WHERE id=?').bind(live.id).first();
 const game=JSON.parse(row.state).checkpoint.game;
 game.status='ended';game.winner=0;
 const body=JSON.stringify({id:live.id,state:game});
 const response=await api(new Request('https://game.test/api/internal/settle',{method:'POST',headers:{'Content-Type':'application/json',...await signedHeaders(body,extra.REALTIME_SHARED_SECRET)},body}),env(extra));
 assert.equal(response.status,200,await response.clone().text());
 const data=await response.json();
 assert.equal(data.recorded,true);
 assert.equal(data.settled,true);
 const stored=await db.prepare('SELECT settled,status FROM matches WHERE id=?').bind(live.id).first();
 assert.equal(stored.status,'ended');
 assert.equal(stored.settled,1);
 assert.equal((await db.prepare('SELECT count(*) n FROM ledger').first()).n,0);
 assert.equal((await db.prepare('SELECT count(*) n FROM token_settlements').first()).n,0);
});

test('waiting rooms cancel without starting, and live rooms return a snapshot instead',async()=>{
 await player('echo');
 const room=await req('echo','skirmish/battle',battleBody('echo-room',{mode:'friendly'}));
 assert.equal(room.data.status,'waiting');
 const cancelled=await req('echo','skirmish/match/'+room.data.id+'/cancel',{protocol:TACTICS_PROTOCOL});
 assert.equal(cancelled.status,200,JSON.stringify(cancelled.data));
 assert.equal(cancelled.data.status,'cancelled');
 await player('foxtrot');await player('golf');
 const live=await openDuel('foxtrot','golf');
 const stillLive=await req('foxtrot','skirmish/match/'+live.id+'/cancel',{protocol:TACTICS_PROTOCOL});
 assert.equal(isSkirmishSnapshot(stillLive.data),true,JSON.stringify(stillLive.data));
});
