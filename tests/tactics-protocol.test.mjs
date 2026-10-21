import test from 'node:test';
import assert from 'node:assert/strict';
import {TacticsAuthority,TACTICS_PROTOCOL} from '../public/game/tactics/protocol.js';
const setup=()=>new TacticsAuthority({players:['alice','bob'],initial:{seed:12},now:()=>1000});
const packet=(id,extra={})=>({protocol:TACTICS_PROTOCOL,actionId:id,type:'deploy',slot:0,x:135,y:520,...extra});
test('authority rejects spectators, legacy commands and client-selected sides',()=>{const a=setup();assert.equal(a.receive('eve',packet('command-0001')).ok,false);assert.equal(a.receive('alice',{...packet('command-0002'),protocol:'arena/1'}).ok,false);const r=a.receive('bob',packet('command-0003',{p:0,side:0}));assert.equal(r.ok,false);assert.equal(a.game.units.length,2);assert.deepEqual(a.game.elixir,[5,5]);});
test('accepted and rejected tactical commands are idempotent',()=>{const a=setup(),first=packet('command-0010');assert.ok(a.receive('alice',first).ok);const hp=structuredClone(a.game.units),energy=a.game.elixir[0];assert.equal(a.receive('alice',first).duplicate,true);assert.deepEqual(a.game.units,hp);assert.equal(a.game.elixir[0],energy);const bad=packet('command-0011',{type:'ultimate'});assert.equal(a.receive('alice',bad).ok,false);a.game.energy[0]=100;assert.equal(a.receive('alice',bad).ok,false);assert.equal(a.game.energy[0],100);});
test('snapshots contain only the viewer’s hand, deck and queue',()=>{const a=setup();a.receive('bob',packet('movement-0001',{type:'move',x:400,y:250}));const p=a.snapshot('alice');assert.equal(p.side,0);assert.equal(p.protocol,TACTICS_PROTOCOL);assert.ok(p.state.hand[0].length);assert.deepEqual(p.state.hand[1],[]);assert.deepEqual(p.state.decks[1],[]);assert.deepEqual(p.state.queue[1],[]);assert.equal(p.state.seed,undefined);assert.equal(p.state.commands,undefined);assert.equal(p.state.recentEvents,undefined);assert.deepEqual(p.state.units.find(u=>u.p===1&&u.captain).order,{x:400,y:250});assert.throws(()=>a.snapshot('eve'));p.state.units[0].hp=0;assert.ok(a.game.units[0].hp>0);});
test('server command rate is bounded and does not evict accepted receipts',()=>{const a=setup();for(let i=0;i<30;i++)assert.ok(a.receive('alice',packet('holding-'+i,{type:'hold'})).ok);assert.equal(a.receive('alice',packet('holding-31',{type:'hold'})).ok,false);assert.equal(a.receive('alice',packet('holding-0',{type:'hold'})).duplicate,true);});
test('authority advances a deterministic fixed clock and ignores browser state injection',()=>{const a=setup();a.receive('alice',packet('movement-0002',{type:'move',x:200,y:500,state:{winner:0},market:{multipliers:[999]}}));assert.equal(a.advance(.1),2);assert.equal(a.game.time,.1);assert.equal(a.game.winner,null);assert.ok(a.game.market.multipliers.every(v=>v===1));assert.throws(()=>a.advance(100));assert.throws(()=>new TacticsAuthority({players:['alice','alice']}));assert.throws(()=>new TacticsAuthority({players:['alice','bob'],initial:{mode:'hunt'}}));});
test('a stored checkpoint restores the same private snapshot',()=>{
 const a=setup();a.receive('alice',packet('restore-0001',{type:'move',x:210,y:510}));
 const restored=TacticsAuthority.restore(JSON.parse(JSON.stringify(a.checkpoint())),()=>1000);
 const snap=restored.snapshot('bob');
 assert.equal(snap.side,1);
 assert.deepEqual(snap.state.units.find(u=>u.p===0&&u.captain).order,{x:210,y:510});
 assert.deepEqual(snap.state.hand[0],[]);
 assert.equal(restored.sequence,a.sequence);
});
