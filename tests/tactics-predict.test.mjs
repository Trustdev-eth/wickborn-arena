import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TacticsAuthority,TACTICS_PROTOCOL} from '../public/game/tactics/protocol.js';
import {TacticsPredictor} from '../public/game/tactics/predict.js';
import {TACTICS_STEP} from '../public/game/tactics/config.js';

const room=()=>new TacticsAuthority({players:['a','b'],initial:{seed:3}});
const captain=(state,side)=>state.units.find(u=>u.id===state.captains[side]);

test('own captain moves appear before the server acknowledges them',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const cmd={protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'predict-move-0001'};
 assert.equal(captain(p.state,0).order,null);
 assert.equal(p.predict(cmd).ok,true);
 assert.deepEqual(captain(p.state,0).order,{x:200,y:500});
 assert.equal(captain(server.game,0).order,null);
});

test('authoritative snapshots rebase prediction and drop acknowledged commands',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const cmd={protocol:TACTICS_PROTOCOL,type:'move',x:210,y:510,actionId:'predict-keep-0001'};
 assert.equal(p.predict(cmd).ok,true);
 server.advance(.1);
 p.receive(server.snapshot('a'),100);
 assert.deepEqual(captain(p.state,0).order,{x:210,y:510},'In-flight input stays visible until the server acks it.');
 server.receive('a',cmd);
 p.receive(server.snapshot('a'),200);
 assert.equal(p.pending.length,0);
 assert.deepEqual(captain(p.state,0).order,{x:210,y:510});
});

test('rebasing an in-flight move does not snap the captain',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const cmd={protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'predict-smooth-0001'};
 assert.equal(p.predict(cmd).ok,true);
 p.frame(16);
 const before=captain(p.state,0);
 server.advance(TACTICS_STEP);
 p.receive(server.snapshot('a'),50);
 const after=captain(p.state,0);
 assert.equal(after.id,before.id);
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<20,`captain jumped ${Math.hypot(after.x-before.x,after.y-before.y).toFixed(1)}px`);
});

test('sparse snapshots still let the captain run at wall-clock speed',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const cmd={protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'predict-pace-0001'};
 assert.equal(p.predict(cmd).ok,true);
 let wall=0,synced=0;
 for(;wall<=1000;wall+=16){
  while(synced+200<=wall){synced+=200;server.advance(.2);p.receive(server.snapshot('a'),synced);}
  p.frame(wall);
 }
 assert.ok(p.state.time>0.85,`predicted time was ${p.state.time.toFixed(2)}s after 1s`);
 assert.ok(p.state.time<=1+TACTICS_STEP*2);
 const u=captain(p.state,0);
 assert.ok(Math.hypot(u.x-200,u.y-500)<90,'captain keeps walking toward the order at full speed');
});
test('acknowledged moves do not snap the captain backwards',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const cmd={protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'predict-ack-0001'};
 assert.equal(p.predict(cmd).ok,true);
 for(let wall=16;wall<=400;wall+=16)p.frame(wall);
 const before=captain(p.state,0);
 server.receive('a',cmd);
 server.advance(.2);
 p.receive(server.snapshot('a'),400);
 const after=captain(p.state,0);
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<12,`captain jumped ${Math.hypot(after.x-before.x,after.y-before.y).toFixed(1)}px on ack`);
});

test('the rival captain keeps walking toward a live order between snapshots',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const spawn=captain(p.state,1),dest={x:280,y:240};
 server.receive('b',{protocol:TACTICS_PROTOCOL,type:'move',...dest,actionId:'rival-walk-0001'});
 let wall=0,synced=0,last=spawn,maxJump=0,moved=0;
 for(;wall<=1200;wall+=16){
  while(synced+150<=wall){synced+=150;server.advance(.15);p.receive(server.snapshot('a'),synced);}
  p.frame(wall);
  const u=captain(p.state,1);
  if(u&&last){const jump=Math.hypot(u.x-last.x,u.y-last.y);maxJump=Math.max(maxJump,jump);moved+=jump;last={x:u.x,y:u.y};}
 }
 const u=captain(p.state,1),before=Math.hypot(spawn.x-dest.x,spawn.y-dest.y),after=Math.hypot(u.x-dest.x,u.y-dest.y);
 assert.ok(moved>20,`rival captain only travelled ${moved.toFixed(1)}px`);
 assert.ok(maxJump<18,`rival captain jumped ${maxJump.toFixed(1)}px between frames`);
 assert.ok(after<before-15,`rival captain did not close on the order (${after.toFixed(1)}px left from ${before.toFixed(1)}px)`);
});

test('deployed fighters keep walking between sparse snapshots',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const own={protocol:TACTICS_PROTOCOL,type:'deploy',slot:0,x:135,y:520,actionId:'own-squad-0001'};
 const foe={protocol:TACTICS_PROTOCOL,type:'deploy',slot:0,x:465,y:240,actionId:'foe-squad-0001'};
 assert.equal(p.predict(own).ok,true);
 server.receive('a',own);server.receive('b',foe);
 let wall=0,synced=0,maxJump=0,moved=0,last=new Map();
 for(;wall<=1500;wall+=16){
  while(synced+150<=wall){synced+=150;server.advance(.15);p.receive(server.snapshot('a'),synced);}
  p.frame(wall);
  for(const u of p.state.units.filter(u=>!u.captain)){
   const prev=last.get(u.id);
   if(prev){const jump=Math.hypot(u.x-prev.x,u.y-prev.y);maxJump=Math.max(maxJump,jump);moved+=jump;}
   last.set(u.id,{x:u.x,y:u.y});
  }
 }
 assert.ok(p.state.units.some(u=>!u.captain&&u.p===0),'own fighter exists');
 assert.ok(p.state.units.some(u=>!u.captain&&u.p===1),'rival fighter exists');
 assert.ok(moved>20,`fighters only travelled ${moved.toFixed(1)}px`);
 assert.ok(maxJump<18,`fighter jumped ${maxJump.toFixed(1)}px between frames`);
});

test('own squad does not snap when a captain move is acknowledged',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const deploy={protocol:TACTICS_PROTOCOL,type:'deploy',slot:0,x:135,y:520,actionId:'squad-ack-0001'};
 const move={protocol:TACTICS_PROTOCOL,type:'move',x:200,y:500,actionId:'squad-ack-0002'};
 assert.equal(p.predict(deploy).ok,true);
 server.receive('a',deploy);
 for(let wall=16;wall<=400;wall+=16)p.frame(wall);
 p.predict(move);
 const fighter=()=>p.state.units.find(u=>!u.captain&&u.p===0),before=fighter();
 server.receive('a',move);server.advance(.2);
 p.receive(server.snapshot('a'),400);
 const after=fighter();
 assert.ok(before&&after);
 assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<14,`fighter jumped ${Math.hypot(after.x-before.x,after.y-before.y).toFixed(1)}px on captain ack`);
});

test('a rejected prediction is removed once its action id is acknowledged',()=>{
 const server=room(),p=new TacticsPredictor({side:0});
 p.receive(server.snapshot('a'),0);
 const cmd={protocol:TACTICS_PROTOCOL,type:'move',x:180,y:500,actionId:'predict-ghost-0001'};
 assert.equal(p.predict(cmd).ok,true);
 assert.deepEqual(captain(p.state,0).order,{x:180,y:500});
 const snap=server.snapshot('a');
 snap.acks=[cmd.actionId];
 p.receive(snap,50);
 assert.equal(p.pending.length,0);
 assert.equal(captain(p.state,0).order,null);
});
