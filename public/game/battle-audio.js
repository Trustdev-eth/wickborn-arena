import {combatTiming} from './three/motion.js';

export const BATTLE_CUES=Object.freeze(['select','deploy','melee','heavy','projectile','magic','heal','tower','capture','ultimate','victory','defeat','draw']);
const results=new Set(['victory','defeat','draw']);
const aliases={hit:'melee',cast:'magic',dash:'deploy',beam:'magic',interrupt:'melee'};
const cooldown={select:.045,deploy:.10,melee:.065,heavy:.12,projectile:.075,magic:.18,heal:.3,tower:.25,capture:.4,ultimate:.5,victory:1,defeat:1,draw:1};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function cueForEvent(e){
 if(e.kind==='hit')return [5,8].includes(e.card)?'heavy':'melee';
 if(e.kind==='bolt')return [1,6,7,9].includes(e.card)?'magic':'projectile';
 return {spawn:'deploy',heal:'heal',cast:'magic',skill:'magic',dash:'deploy',beam:'magic',capture:'capture',barrier:'capture',ultimate:'ultimate',interrupt:'melee'}[e.kind]||null;
}

// Presentation only: consumes existing events; never writes to game/network state.
export function createBattleAudio({enabled=true,Context=globalThis.AudioContext||globalThis.webkitAudioContext,fetcher=globalThis.fetch,documentRef=globalThis.document}={}){
 let context=null,master=null,compressor=null,loading=null,controller=null,disposed=false,paused=false,skipNext=false,lastClock=null;
 const buffers=new Map(),voices=new Set(),played=new Map(),seen=new Set(),towerHP=new Map();
 const hidden=()=>!!documentRef?.hidden;
 function stop(){
  for(const voice of voices){try{const t=context.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(.0001,t,.004);voice.source.stop(t+.018);}catch{}voices.delete(voice);}
 }
 function preload(){
  if(loading||!context||!fetcher)return loading;
  const active=context;controller=new AbortController();
  loading=Promise.allSettled(BATTLE_CUES.map(async kind=>{
   const response=await fetcher('/game/sounds/'+kind+'.mp3',{signal:controller.signal});if(!response.ok)throw new Error('Audio unavailable');
   const buffer=await active.decodeAudioData(await response.arrayBuffer());if(!disposed&&context===active)buffers.set(kind,buffer);
  }));return loading;
 }
 function unlock(){
  if(disposed||!enabled||hidden())return Promise.resolve();
  try{
   if(!context){
    context=new Context();compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=12;compressor.ratio.value=10;compressor.attack.value=.003;compressor.release.value=.16;
    master=context.createGain();master.gain.value=.62;compressor.connect(master);master.connect(context.destination);
   }
   const resume=context.resume();resume?.catch(()=>{});return preload()||Promise.resolve();
  }catch{return Promise.resolve();}
 }
 function play(kind,weight=1,{pan=0,delay=0}={}){
  kind=aliases[kind]||kind;if(disposed||!enabled||paused||hidden()||context?.state!=='running'||!BATTLE_CUES.includes(kind))return false;
  const now=context.currentTime,when=now+clamp(Number(delay)||0,0,1),previous=played.get(kind);
  if(previous!==undefined&&when-previous<cooldown[kind])return false;
  if(results.has(kind))stop();else if(voices.size>=8)return false;
  played.set(kind,when);
  const buffer=buffers.get(kind),source=buffer?context.createBufferSource():context.createOscillator(),gain=context.createGain(),panner=context.createStereoPanner?.();
  const level=clamp((results.has(kind)?.92:kind==='select'?.34:.58)*clamp(Number(weight)||1,.3,1.4),.08,.95);
  source.connect(gain);if(panner){panner.pan.value=clamp(pan,-.7,.7);gain.connect(panner);panner.connect(compressor);}else gain.connect(compressor);
  let duration=buffer?.duration||.14;
  if(buffer){source.buffer=buffer;gain.gain.value=level;}
  else{
   // Immediate gesture feedback while the tiny local bank loads, or if it fails.
   const pitch={select:640,deploy:180,melee:105,heavy:62,projectile:450,magic:330,heal:740,tower:48,capture:660,ultimate:75,victory:523,defeat:196,draw:392}[kind];
   duration=results.has(kind)?.65:kind==='select'?.07:.18;source.type=results.has(kind)||kind==='heal'?'sine':'triangle';
   source.frequency.setValueAtTime(pitch,when);source.frequency.exponentialRampToValueAtTime(Math.max(30,pitch*(results.has(kind)?1.5:.42)),when+duration);
   gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(level*.22,when+.008);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  }
  const voice={source,gain,panner};voices.add(voice);
  source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();panner?.disconnect();};source.start(when);if(!buffer)source.stop(when+duration+.01);
  return true;
 }
 function mark(events){for(const e of events)if(e.id!==undefined)seen.add(e.id);if(seen.size>1600)for(const id of [...seen].slice(0,800))seen.delete(id);}
 function reset(g){stop();seen.clear();played.clear();towerHP.clear();lastClock=g?.time??null;skipNext=false;mark(g?.recentEvents||g?.effects||[]);for(const t of g?.towers||[])towerHP.set(t.id,t.hp);}
 function consume(g){
  if(!g||disposed)return;const events=g.recentEvents||g.effects||[];
  const jumped=lastClock!==null&&(g.time<lastClock-.5||g.time-lastClock>2);lastClock=g.time;
  const quiet=!enabled||paused||hidden()||skipNext||jumped;skipNext=false;
  for(const e of events){
   if(e.id===undefined||seen.has(e.id))continue;seen.add(e.id);
   if(quiet||(Number.isFinite(e.at)&&g.time-e.at>.7))continue;const kind=cueForEvent(e);if(!kind)continue;
   // Authored transient offsets align the swing with the renderer's contact.
   const delay=e.kind==='hit'?Math.max(0,combatTiming(e).impact-(kind==='heavy'?.185:.108)):e.kind==='bolt'?combatTiming(e).delay:0;
   play(kind,e.power>150?1.12:1,{pan:((e.tx??e.x??300)-300)/500,delay});
  }
  for(const t of g.towers||[]){const before=towerHP.get(t.id);towerHP.set(t.id,t.hp);if(!quiet&&before>0&&t.hp<=0)play('tower',1.1,{pan:(t.x-300)/500});}
  mark([]);
 }
 function visibility(){if(hidden())stop();skipNext=true;}
 documentRef?.addEventListener('visibilitychange',visibility);
 return {unlock,play,consume,reset,stop,
  setEnabled(value){enabled=!!value;if(!enabled)stop();skipNext=true;},
  setPaused(value){if(paused===!!value)return;paused=!!value;if(paused)stop();skipNext=true;},
  get activeVoices(){return voices.size;},
  dispose(){if(disposed)return;disposed=true;stop();controller?.abort();documentRef?.removeEventListener('visibilitychange',visibility);buffers.clear();seen.clear();played.clear();towerHP.clear();master?.disconnect();compressor?.disconnect();context?.close()?.catch(()=>{});context=null;}
 };
}
