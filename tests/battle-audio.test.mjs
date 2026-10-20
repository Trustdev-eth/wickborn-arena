import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createBattleAudio,BATTLE_CUES,cueForEvent} from '../public/game/battle-audio.js';
import {combatTiming} from '../public/game/three/motion.js';

class Param{value=0;setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();pan=new Param();frequency=new Param();connect(){}disconnect(){this.disconnected=true;}start(t){this.startedAt=t;}stop(t){this.stoppedAt=t;}end(){this.onended?.();}}
function fixture({fails=false,enabled=true}={}){
 const nodes=[],doc=new EventTarget();doc.hidden=false;let context,requests=0;
 class Context{
  currentTime=10;state='running';destination={};
  constructor(){context=this;}
  createDynamicsCompressor(){const n=new Node();for(const p of ['threshold','knee','ratio','attack','release'])n[p]=new Param();return n;}
  createGain(){return new Node();}createStereoPanner(){return new Node();}
  createBufferSource(){const n=new Node();nodes.push(n);return n;}createOscillator(){const n=new Node();nodes.push(n);return n;}
  resume(){return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
  decodeAudioData(bytes){return Promise.resolve({kind:new TextDecoder().decode(bytes),duration:1});}
 }
 const fetcher=async url=>{requests++;if(fails)throw new Error('offline');return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(url.split('/').at(-1).replace('.mp3','')).buffer};};
 const audio=createBattleAudio({Context,fetcher,documentRef:doc,enabled});
 return {audio,nodes,doc,get context(){return context;},get requests(){return requests;}};
}
test('audio waits for a gesture, decodes local clips once and closes on disposal',async()=>{
 const f=fixture();assert.equal(f.audio.play('melee'),false);assert.equal(f.requests,0);
 await f.audio.unlock();await f.audio.unlock();assert.equal(f.requests,13);assert.equal(f.audio.play('victory'),true);assert.equal(f.nodes[0].buffer.kind,'victory');
 f.nodes[0].end();assert.equal(f.audio.activeVoices,0);assert.equal(f.nodes[0].disconnected,true);f.audio.dispose();assert.equal(f.context.state,'closed');
 await f.audio.unlock();assert.equal(f.audio.play('select'),false);
});
test('repeated multiplayer snapshots play contacts once without mutating game data',async()=>{
 const f=fixture();await f.audio.unlock();const g={time:0,effects:[],towers:[{id:'t0',x:135,hp:100}]};f.audio.reset(g);
 g.time=.1;g.effects=[{id:1,kind:'hit',card:5,x:200,tx:135,power:170}];const copy=structuredClone(g);
 f.audio.consume(g);f.audio.consume(structuredClone(g));assert.deepEqual(g,copy);assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].buffer.kind,'heavy');
 assert.ok(Math.abs(f.nodes[0].startedAt+.185-(10+combatTiming(g.effects[0]).impact))<1e-9);
 f.context.currentTime+=.3;g.time=.4;g.towers[0].hp=0;f.audio.consume(g);f.audio.consume(g);assert.equal(f.nodes.filter(n=>n.buffer?.kind==='tower').length,1);f.audio.dispose();
});
test('mute, pause, visibility and reconnect jumps discard old events instead of replaying bursts',async()=>{
 const f=fixture();await f.audio.unlock();const g={time:1,effects:[{id:1,kind:'hit'}]};f.audio.reset(g);f.audio.consume(g);assert.equal(f.nodes.length,0);
 f.audio.setEnabled(false);g.effects.push({id:2,kind:'hit'});f.audio.consume(g);assert.equal(f.nodes.length,0);
 f.audio.setEnabled(true);f.audio.consume(g);f.audio.setPaused(true);assert.equal(f.audio.play('magic'),false);f.audio.setPaused(false);f.audio.consume(g);
 f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(f.audio.play('magic'),false);
 f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));g.time=8;g.effects.push({id:3,kind:'ultimate'});f.audio.consume(g);assert.equal(f.nodes.length,0);
 g.time=8.1;g.effects.push({id:4,kind:'hit',card:0});f.audio.consume(g);assert.equal(f.nodes.length,1);f.audio.setEnabled(false);assert.equal(f.audio.activeVoices,0);assert.ok(f.nodes[0].stoppedAt);f.audio.dispose();
});
test('dense combat is bounded and result audio interrupts the mix',async()=>{
 const f=fixture();await f.audio.unlock();for(let n=0;n<30;n++){f.context.currentTime+=.1;f.audio.play('melee');}assert.equal(f.audio.activeVoices,8);
 assert.equal(f.audio.play('victory'),true);assert.equal(f.audio.activeVoices,1);assert.ok(f.nodes.slice(0,8).every(n=>n.stoppedAt));f.audio.dispose();
});
test('failed clip downloads keep gesture feedback available and never reject the match',async()=>{
 const f=fixture({fails:true});await f.audio.unlock();assert.equal(f.audio.play('select'),true);assert.equal(f.nodes[0].buffer,undefined);assert.equal(f.nodes[0].type,'triangle');f.audio.dispose();
});
test('all game archetypes route to delivery clips, including draw and healing',()=>{
 for(let id=0;id<12;id++)for(const kind of ['hit','bolt'])assert.ok(BATTLE_CUES.includes(cueForEvent({card:id,kind})));
 assert.equal(cueForEvent({kind:'heal'}),'heal');assert.equal(cueForEvent({kind:'capture'}),'capture');assert.equal(cueForEvent({kind:'poof'}),null);
 const manifest=JSON.parse(readFileSync(new URL('../public/game/sounds/manifest.json',import.meta.url)));
 let bytes=0;
 for(const kind of BATTLE_CUES){
  const cue=manifest.cues[kind];assert.ok(cue.durationSeconds>0&&cue.durationSeconds<5);bytes+=statSync(new URL('../public'+cue.url,import.meta.url)).size;
  const wav=readFileSync(new URL('../art/audio/'+kind+'.wav',import.meta.url));assert.equal(wav.toString('ascii',0,4),'RIFF');let peak=0,data=null;
  for(let offset=12;offset+8<wav.length;){const length=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){data=wav.subarray(offset+8,offset+8+length);break;}offset+=8+length+(length%2);}
  assert.ok(data);for(let i=0;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));assert.ok(peak>15000&&peak<17000,kind+' keeps master headroom');
 }
 assert.ok(bytes<400000,'The complete delivery bank stays small.');
});
