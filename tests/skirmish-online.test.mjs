import test from 'node:test';
import assert from 'node:assert/strict';
import {SkirmishConnection,skirmishAvailability,isSkirmishSnapshot} from '../public/game/tactics/online.js';
import {TacticsAuthority,TACTICS_PROTOCOL} from '../public/game/tactics/protocol.js';
import {newGame} from '../public/game/engine.js';
const authority=()=>new TacticsAuthority({players:['a','b'],initial:{seed:123}});
class Socket{static last=null;readyState=0;sent=[];constructor(){Socket.last=this;}send(data){this.sent.push(JSON.parse(data));}close(){this.readyState=3;}open(){this.readyState=1;this.onopen();}message(packet){this.onmessage({data:JSON.stringify(packet)});}}
test('the unchanged legacy runtime cannot enable Skirmish online accidentally',()=>{for(const runtime of [{},{contracts:{enabled:true},realtime:true},{skirmish:{enabled:true,protocol:'classic',entry:'free'}},{skirmish:{enabled:true,protocol:TACTICS_PROTOCOL,entry:'token'}},{skirmish:{enabled:true,protocol:TACTICS_PROTOCOL,entry:'free',path:'../token'}}])assert.equal(skirmishAvailability(runtime).ready,false);assert.equal(skirmishAvailability({skirmish:{enabled:true,protocol:TACTICS_PROTOCOL,entry:'free'}}).ready,true);});
test('only complete versioned Skirmish snapshots can enter its UI',()=>{const packet=authority().snapshot('a');assert.equal(isSkirmishSnapshot(packet),true);assert.equal(isSkirmishSnapshot({...packet,protocol:'classic'}),false);assert.equal(isSkirmishSnapshot({...packet,state:newGame()}),false);assert.equal(isSkirmishSnapshot({...packet,state:{...packet.state,specs:undefined}}),false);assert.equal(isSkirmishSnapshot({...packet,side:9}),false);});
test('online input carries authenticated-protocol commands without client state or a chosen side',async()=>{const room=authority(),packets=[],c=new SkirmishConnection({call:async()=>{},id:'match-1',onSnapshot:p=>packets.push(p),WebSocketImpl:Socket});c.start({...room.snapshot('a'),connection:{url:'wss://arena.test/match'}});Socket.last.open();try{const result=c.command({type:'deploy',slot:0,x:135,y:520,p:1,side:1,state:{winner:0}}),sent=Socket.last.sent.at(-1);assert.equal(sent.protocol,TACTICS_PROTOCOL);assert.equal(sent.p,undefined);assert.equal(sent.side,undefined);assert.equal(sent.state,undefined);const ack=room.receive('a',sent);Socket.last.message({...room.snapshot('a'),...ack,type:'ack',protocol:TACTICS_PROTOCOL});assert.ok((await result).ok);assert.equal(packets.at(-1).state.units.filter(u=>u.p===0&&!u.captain).length,1);}finally{c.close();}});
test('stale snapshots and wrong-side snapshots cannot move the displayed match backwards',()=>{const room=authority(),c=new SkirmishConnection({call:async()=>{},id:'test',WebSocketImpl:Socket});const a=room.snapshot('a');assert.ok(c.accept(a));room.advance(.1);assert.ok(c.accept(room.snapshot('a')));assert.equal(c.accept(a),false);assert.equal(c.accept(room.snapshot('b')),false);c.close();});
test('disconnects do not simulate a local winner or resolve pending input as accepted',async()=>{const room=authority(),c=new SkirmishConnection({call:async()=>{},id:'test',WebSocketImpl:Socket});c.start({...room.snapshot('a'),connection:{url:'wss://arena.test/match'}});Socket.last.open();const result=c.command({type:'hold'});c.close();await assert.rejects(result,/Connection closed/);assert.equal(room.game.winner,null);assert.equal(c.ready,false);});
test('realtime tickets open the socket path and preserve predicted action IDs',async()=>{
 const calls=[],statuses=[],c=new SkirmishConnection({call:async(path)=>{calls.push(path);return {url:'wss://arena.test/match'};},id:'live-1',onStatus:s=>statuses.push(s),WebSocketImpl:Socket});
 Socket.last=null;c.start({...authority().snapshot('a'),transport:'realtime'});
 for(let i=0;i<12&&!Socket.last;i++)await Promise.resolve();
 assert.ok(Socket.last,'Realtime rooms request a socket ticket.');
 Socket.last.open();
 try{
  assert.ok(calls.some(path=>path.includes('/ticket')));
  assert.ok(statuses.includes('Live connection'));
  const pending=c.command({type:'hold',actionId:'predict-hold-0001'});
  assert.equal(Socket.last.sent.at(-1).actionId,'predict-hold-0001');
  c.close();
  await assert.rejects(pending,/Connection closed/);
 }finally{c.close();}
});
test('HTTP fallback confirms side-1 input independently of reads and keeps the rival hand private',async()=>{
 const room=authority(),sent=[],shown=[];
 const call=async(path,body)=>{sent.push({path,body});if(body){const ack=room.receive('b',body);return {...room.snapshot('b'),...ack,protocol:TACTICS_PROTOCOL};}return room.snapshot('b');};
 const c=new SkirmishConnection({call,id:'room-b',onSnapshot:p=>shown.push(p)});
 c.start(room.snapshot('b'));
 try{const ack=await c.command({type:'move',x:355,y:180});assert.equal(ack.ok,true);assert.equal(c.side,1);assert.ok(sent.some(r=>r.path==='skirmish/match/room-b/command'));assert.deepEqual(room.game.units.find(u=>u.id===room.game.captains[1]).order,{x:355,y:180});assert.equal(room.game.units.find(u=>u.id===room.game.captains[0]).order,null);assert.deepEqual(shown.at(-1).state.hand[0],[]);assert.equal(shown.at(-1).state.hand[1].length,4);}finally{c.close();}
});
