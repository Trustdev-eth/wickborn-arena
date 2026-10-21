import {unpackPacket} from '../public/game/wire.js';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {newGame} from '../public/game/engine.js';
import {signToken,signedHeaders,verifyService} from '../lib/security.js';
import {TacticsAuthority,TACTICS_PROTOCOL} from '../public/game/tactics/protocol.js';
import {TacticsPredictor} from '../public/game/tactics/predict.js';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wr('miniflare'),{build}=wr('esbuild');
const origin='https://arena.test',secret='local-test-only-secret-with-sufficient-entropy';let mf,script;const sockets=[],settlements=[];
const sitesBinding=async request=>{const body=await request.text();assert.ok(await verifyService(request,body,secret));const data=JSON.parse(body),path=new URL(request.url).pathname.split('/').at(-1);if(path==='bootstrap'){if(String(data.id).startsWith('skirmish-')){const players=[data.id+':0',data.id+':1'],auth=new TacticsAuthority({players,initial:{seed:1,names:['Host','Joiner']}});return Response.json({row:{id:data.id,stake:0,asset:'skirmish',transport:'realtime',state:JSON.stringify({protocol:TACTICS_PROTOCOL,checkpoint:auth.checkpoint()}),last_tick:Date.now(),version:1},participants:players});}return Response.json({row:{id:data.id,stake:50,asset:'credits',transport:'realtime',state:JSON.stringify(newGame()),last_tick:Date.now(),version:1},participants:[data.id+':0',data.id+':1']});}if(path==='settle'){settlements.push(data);return Response.json({recorded:true,settled:true});}return Response.json({prices:[]});};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(predicate,ms=5000){const end=Date.now()+ms;while(Date.now()<end){const x=predicate();if(x)return x;await sleep(10);}throw new Error('Timed out waiting for realtime frame');}
async function ticket(id,side,extra={}){return signToken({aud:'arena-room',match:id,player:id+':'+side,side,origin,exp:Date.now()+60000,jti:crypto.randomUUID(),...extra},secret);}
async function connect(id,side,extra={}){const t=await ticket(id,side,extra),r=await mf.dispatchFetch('https://realtime.test/matches/'+id+'/socket?ticket='+t,{headers:{Upgrade:'websocket',Origin:origin}});assert.equal(r.status,101);const ws=r.webSocket;ws.frames=[];ws.addEventListener('message',e=>ws.frames.push(unpackPacket(JSON.parse(e.data))));ws.accept();sockets.push(ws);await waitFor(()=>ws.frames.find(f=>f.state));return ws;}
before(async()=>{const bundle=await build({entryPoints:['services/realtime/worker.js'],bundle:true,format:'esm',platform:'neutral',target:'es2022',write:false});script=bundle.outputFiles[0].text;mf=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',durableObjects:{MATCHES:{className:'MatchRoom',useSQLite:true}},bindings:{SITE_ORIGIN:origin,REALTIME_SHARED_SECRET:secret},serviceBindings:{SITES:sitesBinding}});});
after(async()=>{for(const ws of sockets)try{ws.close();}catch{}await mf?.dispose();});
test('realtime gateway refuses unsigned, expired and wrong-origin connections',async()=>{let r=await mf.dispatchFetch('https://realtime.test/matches/auth/socket',{headers:{Upgrade:'websocket',Origin:origin}});assert.equal(r.status,403);const t=await ticket('auth',0,{exp:Date.now()-1000});r=await mf.dispatchFetch('https://realtime.test/matches/auth/socket?ticket='+t,{headers:{Upgrade:'websocket',Origin:origin}});assert.equal(r.status,403);r=await mf.dispatchFetch('https://realtime.test/matches/auth/snapshot',{method:'POST',body:'{}'});assert.equal(r.status,401);});
test('local loopback aliases are accepted on the socket and foreign origins are not',async()=>{
 const local=new Miniflare({modules:true,script,compatibilityDate:'2026-05-15',durableObjects:{MATCHES:{className:'MatchRoom',useSQLite:true}},bindings:{SITE_ORIGIN:'http://127.0.0.1:5173',REALTIME_SHARED_SECRET:secret},serviceBindings:{SITES:sitesBinding}});
 try{
  const id='loopback-test',t=await signToken({aud:'arena-room',match:id,player:id+':0',side:0,origin:'http://localhost:5173',exp:Date.now()+60000,jti:crypto.randomUUID()},secret);
  let r=await local.dispatchFetch('https://realtime.test/matches/'+id+'/socket?ticket='+t,{headers:{Upgrade:'websocket',Origin:'http://localhost:5173'}});
  assert.equal(r.status,101);r.webSocket.accept();sockets.push(r.webSocket);
  const evil=await signToken({aud:'arena-room',match:id,player:id+':1',side:1,origin:'https://evil.test',exp:Date.now()+60000,jti:crypto.randomUUID()},secret);
  r=await local.dispatchFetch('https://realtime.test/matches/'+id+'/socket?ticket='+evil,{headers:{Upgrade:'websocket',Origin:'https://evil.test'}});assert.equal(r.status,403);
 }finally{await local.dispose();}
});
test('real Durable Object sockets acknowledge commands exactly once and hide the rival hand',async()=>{const a=await connect('command-test',0),b=await connect('command-test',1),action={type:'deploy',slot:0,card:0,x:135,y:520,actionId:'realtime-deploy-001'};assert.deepEqual(a.frames[0].state.hand[1],[]);assert.deepEqual(b.frames[0].state.queue[0],[]);a.send(JSON.stringify(action));const first=await waitFor(()=>a.frames.find(f=>f.type==='ack'&&f.actionId===action.actionId));assert.equal(first.state.units.filter(u=>u.p===0).length,1);a.send(JSON.stringify(action));await waitFor(()=>a.frames.filter(f=>f.type==='ack'&&f.actionId===action.actionId).length===2);assert.equal(a.frames.filter(f=>f.type==='ack').at(-1).state.units.filter(u=>u.p===0).length,1);await waitFor(()=>b.frames.some(f=>f.state?.units.some(u=>u.p===0)));});
test('reconnect restores the same authoritative room and tickets cannot be replayed',async()=>{const id='reconnect-test',token=await ticket(id,0),url='https://realtime.test/matches/'+id+'/socket?ticket='+token,r=await mf.dispatchFetch(url,{headers:{Upgrade:'websocket',Origin:origin}});assert.equal(r.status,101);r.webSocket.accept();sockets.push(r.webSocket);const replay=await mf.dispatchFetch(url,{headers:{Upgrade:'websocket',Origin:origin}});assert.equal(replay.status,409);const next=await connect(id,0);assert.equal(next.frames[0].id,id);});
test('terminal outcomes are sent through the durable settlement outbox',async()=>{const a=await connect('settle-test',0);a.send(JSON.stringify({type:'surrender',actionId:'realtime-surrender-001'}));await waitFor(()=>a.frames.some(f=>f.state?.status==='ended'));await waitFor(()=>settlements.some(x=>x.id==='settle-test'),6000);const final=settlements.find(x=>x.id==='settle-test');assert.equal(final.state.winner,1);});
test('non-object WebSocket payloads are rejected without stopping the other player',async()=>{const a=await connect('malformed-test',0),b=await connect('malformed-test',1),initial=b.frames.length;a.send('null');await waitFor(()=>b.frames.length>initial);assert.ok(b.frames.at(-1).state.time>0);});
test('classic rooms keep simulation close to wall-clock time',async()=>{
 const a=await connect('pace-classic',0);
 const first=a.frames[0].state.time,start=Date.now();
 await sleep(700);
 const latest=a.frames.filter(f=>f.state).at(-1).state.time,elapsed=(Date.now()-start)/1000;
 assert.ok(latest-first>elapsed*.7,`sim advanced ${((latest-first)*1000)|0}ms in ${elapsed*1000|0}ms`);
 assert.ok(latest-first<elapsed+.25);
});
test('skirmish rooms acknowledge move commands and hide the rival hand from side 1',async()=>{
 const a=await connect('skirmish-command',0),b=await connect('skirmish-command',1);
 assert.equal(a.frames[0].protocol,TACTICS_PROTOCOL);
 assert.deepEqual(a.frames[0].state.hand[1],[]);
 assert.deepEqual(b.frames[0].state.hand[0],[]);
 const action={protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'skirmish-move-0001'},before=b.frames.length;
 a.send(JSON.stringify(action));
 const ack=await waitFor(()=>a.frames.find(f=>f.type==='ack'&&f.actionId===action.actionId));
 assert.equal(ack.ok,true);
 assert.deepEqual(ack.state.units.find(u=>u.captain&&u.p===0).order,{x:200,y:500});
 await waitFor(()=>b.frames.length>before);
 const latest=b.frames.filter(f=>f.state).at(-1);
 assert.deepEqual(latest.state.hand[0],[]);
 assert.deepEqual(latest.state.units.find(u=>u.captain&&u.p===0).order,{x:200,y:500});
});
test('the other player sees deployed fighters walk instead of teleports',async()=>{
 const a=await connect('skirmish-squad',0),b=await connect('skirmish-squad',1);
 const p=new TacticsPredictor({side:1});
 p.receive(b.frames.find(f=>f.state),0);
 a.send(JSON.stringify({protocol:TACTICS_PROTOCOL,type:'deploy',slot:0,x:135,y:520,actionId:'skirmish-squad-0001'}));
 await waitFor(()=>a.frames.find(f=>f.type==='ack'&&f.actionId==='skirmish-squad-0001'));
 await waitFor(()=>b.frames.some(f=>f.state?.units.some(u=>!u.captain&&u.p===0)));
 let last=null,maxJump=0,moved=0;const start=Date.now();
 while(Date.now()-start<800){
  await sleep(16);
  const wall=Date.now()-start,latest=b.frames.filter(f=>f.state).at(-1);
  p.receive(latest,wall);p.frame(wall);
  const u=p.state.units.find(u=>!u.captain&&u.p===0);
  if(u&&last){const jump=Math.hypot(u.x-last.x,u.y-last.y);maxJump=Math.max(maxJump,jump);moved+=jump;}
  if(u)last={x:u.x,y:u.y};
 }
 assert.ok(moved>8,`deployed fighter only travelled ${moved.toFixed(1)}px`);
 assert.ok(maxJump<16,`deployed fighter jumped ${maxJump.toFixed(1)}px between frames`);
});
test('the other player sees a walking captain instead of teleports',async()=>{
 const a=await connect('skirmish-walk',0),b=await connect('skirmish-walk',1);
 const p=new TacticsPredictor({side:1});
 p.receive(b.frames.find(f=>f.state),0);
 a.send(JSON.stringify({protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'skirmish-walk-0001'}));
 await waitFor(()=>a.frames.find(f=>f.type==='ack'&&f.actionId==='skirmish-walk-0001'));
 let last=null,maxJump=0,moved=0;const start=Date.now();
 while(Date.now()-start<800){
  await sleep(16);
  const wall=Date.now()-start,latest=b.frames.filter(f=>f.state).at(-1);
  p.receive(latest,wall);p.frame(wall);
  const u=p.state.units.find(u=>u.captain&&u.p===0);
  if(u&&last){const jump=Math.hypot(u.x-last.x,u.y-last.y);maxJump=Math.max(maxJump,jump);moved+=jump;}
  if(u)last={x:u.x,y:u.y};
 }
 assert.ok(moved>12,`rival captain only travelled ${moved.toFixed(1)}px`);
 assert.ok(maxJump<16,`rival captain jumped ${maxJump.toFixed(1)}px between frames`);
});
test('skirmish rooms ack a burst of moves without waiting on storage',async()=>{
 const a=await connect('skirmish-burst',0);
 const sent=Array.from({length:8},(_,i)=>({protocol:TACTICS_PROTOCOL,type:'move',x:180+i*8,y:500,actionId:'skirmish-burst-'+String(i).padStart(4,'0')}));
 const start=Date.now();
 for(const action of sent)a.send(JSON.stringify(action));
 for(const action of sent)await waitFor(()=>a.frames.find(f=>f.type==='ack'&&f.actionId===action.actionId));
 assert.ok(Date.now()-start<1500,'Move acks stay on the memory path.');
});

test('skirmish surrender settles a free match without a token payout',async()=>{
 const a=await connect('skirmish-settle',0);
 a.send(JSON.stringify({protocol:TACTICS_PROTOCOL,type:'surrender',actionId:'skirmish-surrender-001'}));
 await waitFor(()=>a.frames.some(f=>f.state?.status==='ended'));
 await waitFor(()=>settlements.some(x=>x.id==='skirmish-settle'),6000);
 const final=settlements.find(x=>x.id==='skirmish-settle');
 assert.equal(final.state.winner,1);
 assert.equal(final.state.ruleset,'wickborn-tactics');
 assert.equal(final.state.round,240);
 assert.equal(final.state.mode,'duel');
});
