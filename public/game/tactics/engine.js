import {newGame,canDeployAt,deploymentZones,validDeck} from '../engine.js';
import {TOKENS} from '../stock-roster.js';
import {matchesStockQuote} from '../stock-market.js';
import {quoteConnected,quoteMaxAgeMs} from '../tokens.js';
import {TACTICS_VERSION,TACTICS_STEP,TACTICS_ROUND,MARKET_PULSE,STARTER_SQUAD,TACTICAL_FIGHTERS,fighterStats} from './config.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const validPoint=c=>Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=24&&c.x<=576&&c.y>=45&&c.y<=715;
const fail=error=>({ok:false,error});
export {canDeployAt,deploymentZones};
export function tacticsRandom(g){let x=g.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;g.seed=x>>>0;return g.seed/4294967296;}
export function createTactics({seed=918273,names=['Commander','Sage Captain'],decks=[STARTER_SQUAD,STARTER_SQUAD],captains=[1,5],specs=[Array(12).fill(0),Array(12).fill(0)],mode='duel',difficulty='normal',startedAt=0,marketFrame=null}={}){
 if(!['duel','hunt'].includes(mode)||!decks.every(validDeck)||captains.length!==2||captains.some((id,p)=>!decks[p].includes(id)))throw new Error('Choose a valid squad and a captain from that squad.');
 if(specs.length!==2||specs.some(s=>!Array.isArray(s)||s.length!==12||s.some(v=>v!==0&&v!==1)))throw new Error('Choose a valid specialization.');
 const g=newGame({seed,names,decks:decks.map(d=>[...d]),levels:[Array(12).fill(1),Array(12).fill(1)]});
 Object.assign(g,{ruleset:'wickborn-tactics',version:TACTICS_VERSION,simulationStep:TACTICS_STEP,round:TACTICS_ROUND,mode,difficulty,startedAt,specs:specs.map(s=>[...s]),captainCards:[...captains],captains:[null,null],respawn:[0,0],energy:[25,25],skillCd:[0,0],ultCd:[0,0],barriers:[0,0],relay:{x:300,y:380,radius:76,active:false,owner:null,progress:[0,0],nextAt:35,expiresAt:0,captures:[0,0]},hazards:[],links:[],kills:[0,0],damage:[0,0],healing:[0,0],commands:[],log:[],recentEvents:[],botClocks:[1,1.6],aiThink:[.3,.6],phase:1,companionClock:8,market:{startedAt,baseline:Array(12).fill(null),multipliers:Array(12).fill(1),status:Array(12).fill('no-baseline'),current:Array(12).fill(null),nextUpdate:MARKET_PULSE,sequence:0},boss:null});
 snapshotBaseline(g,marketFrame);
 for(let p=0;p<2;p++)spawnCaptain(g,p);
 if(mode==='hunt'){
  g.units=g.units.filter(u=>u.p===0);g.captains[1]=null;
  g.towers=g.towers.filter(t=>t.p===0);g.names[1]='Citadel Colossus';
  const boss=spawn(g,5,1,300,215,{boss:true,hp:13500});g.boss={id:boss.id,phase:1,cd:5,cast:null,brokenFor:0};
 }
 return g;
}
function emit(g,event){g.fxSeq++;const e={id:g.fxSeq,at:g.time,ttl:.75,...event};g.effects.push(e);g.recentEvents.push(e);g.recentEvents=g.recentEvents.slice(-80);return e;}
function announce(g,text,p=null){g.log.push({id:g.fxSeq+1,at:g.time,text,p});g.log=g.log.slice(-10);}
function spawn(g,card,p,x,y,extra={}){
 const c=fighterStats(card,g.specs[p][card],!!extra.captain),hp=extra.hp||c.hp;
 const u={id:g.nextId++,card,p,x:clamp(x,24,576),y:clamp(y,45,715),hp,maxHp:hp,cd:.4,slow:0,stun:0,age:0,healCd:1,shield:0,shieldUntil:0,guardUntil:0,action:'idle',facingX:0,facingY:p===0?-1:1,casting:null,recovery:0,order:null,invulnerable:0,...extra};
 g.units.push(u);emit(g,{kind:'spawn',x:u.x,y:u.y,p,color:c.color});return u;
}
function spawnCaptain(g,p){const u=spawn(g,g.captainCards[p],p,p===0?255:345,p===0?552:208,{captain:true});g.captains[p]=u.id;g.respawn[p]=0;announce(g,`${p===0?'Your':'Rival'} captain entered the arena.`,p);return u;}
export const captainOf=(g,p)=>g.units.find(u=>u.id===g.captains[p]&&u.hp>0)||null;
const statsOf=(g,u)=>fighterStats(u.card,g.specs[u.p][u.card],!!u.captain);
const opponents=(g,p)=>g.units.filter(u=>u.p!==p&&u.hp>0);
function targetAt(g,id){return g.units.find(u=>u.id===id&&u.hp>0)||g.towers.find(t=>t.id===id&&t.hp>0);}
function aimFrom(u,x,y,reach){const d=Math.hypot(x-u.x,y-u.y),m=d>reach?reach/d:1;return {x:clamp(u.x+(x-u.x)*m,24,576),y:clamp(u.y+(y-u.y)*m,45,715)};}
function face(u,target){const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy)||1;u.facingX=dx/d;u.facingY=dy/d;}
export function applyTacticsCommand(g,p,c,{record=true}={}){
 if(g.status!=='playing')return fail('The battle has ended.');
 if(p!==0&&p!==1)return fail('Invalid side.');
 if(!c||typeof c!=='object')return fail('Invalid command.');
 const u=captainOf(g,p);
 if(c.type==='deploy'){
  if(!Number.isInteger(c.slot)||c.slot<0||c.slot>3||!validPoint(c))return fail('Choose a card and a valid deployment point.');
  if(!canDeployAt(g,p,c.x,c.y))return fail('Deploy inside your blue territory.');
  const id=g.hand[p][c.slot],s=fighterStats(id,g.specs[p][id]);
  if(g.elixir[p]+1e-8<s.cost)return fail('More elixir is needed.');
  if(g.units.length+(s.count||1)>72)return fail('The arena is full.');
  g.elixir[p]-=s.cost;
  for(let k=0;k<(s.count||1);k++)spawn(g,id,p,c.x+(k-((s.count||1)-1)/2)*18,c.y+k*4);
  g.hand[p][c.slot]=g.queue[p].shift();g.queue[p].push(id);
 }else if(c.type==='move'){
  if(!u)return fail('Your captain is recovering.');if(!validPoint(c))return fail('Choose a point inside the arena.');
  if(u.casting){u.casting=null;u.recovery=.35;emit(g,{kind:'interrupt',x:u.x,y:u.y,p,text:'CANCELLED'});}
  u.order={x:c.x,y:c.y};u.channel=null;
 }else if(c.type==='hold'){
  if(!u)return fail('Your captain is recovering.');u.order=null;u.channel=null;u.casting=null;
 }else if(c.type==='skill'||c.type==='ultimate'){
  if(!u)return fail('Your captain is recovering.');if(!validPoint(c))return fail('Aim inside the arena.');
  if(u.stun>0||u.casting||u.dash||u.recovery>0)return fail('Wait for your captain to recover.');
  const ultimate=c.type==='ultimate',f=TACTICAL_FIGHTERS[u.card];
  if(ultimate?(g.energy[p]<100||g.ultCd[p]>0):g.skillCd[p]>0)return fail(ultimate?'The ultimate needs 100 resolve.':'Your skill is recharging.');
  const aim=aimFrom(u,c.x,c.y,ultimate?330:f.reach),windup=ultimate?.85:f.windup*(u.card===5&&g.specs[p][5]===0?1.2:1);
  if(ultimate){g.energy[p]=0;g.ultCd[p]=22;}else g.skillCd[p]=f.cooldown;
  u.order=null;u.channel=null;face(u,aim);u.casting={kind:ultimate?'ultimate':f.kind,x:aim.x,y:aim.y,left:windup,total:windup,ultimate};u.action='cast';
  emit(g,{kind:'cast',attacker:u.id,card:u.card,p,x:u.x,y:u.y,tx:aim.x,ty:aim.y,castKind:f.kind,ultimate,ttl:windup,color:f.color});
 }else if(c.type==='barrier'){
  if(g.barriers[p]<=0)return fail('Capture the relay to earn a barrier.');
  g.barriers[p]--;for(const a of g.units)if(a.p===p&&a.hp>0){a.shield=Math.min(a.maxHp*.6,a.shield+220);a.shieldUntil=g.time+7;}
  emit(g,{kind:'barrier',p,x:300,y:p===0?520:240,color:'#7acbff'});announce(g,'Relay barrier activated.',p);
 }else if(c.type==='surrender'){g.status='ended';g.winner=1-p;}
 else return fail('Unknown command.');
 if(record)g.commands.push({tick:Math.round(g.time/TACTICS_STEP),p,...Object.fromEntries(['type','slot','x','y'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]))});
 return {ok:true};
}
function lineDistance(v,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((v.x-a.x)*dx+(v.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(v.x-a.x-dx*t,v.y-a.y-dy*t);}
function knockback(u,from,amount){const d=distance(u,from)||1;u.x=clamp(u.x+(u.x-from.x)/d*amount,24,576);u.y=clamp(u.y+(u.y-from.y)/d*amount,45,715);}
function hit(g,source,target,amount,{stun=0,slow=0,knock=0,skill=false,pierce=false,ability=null}={}){
 if(!target||target.hp<=0||target.invulnerable>0)return 0;
 let power=amount*(g.market.multipliers[source.card]||1);
 if('card'in target){
  for(const guard of g.units){if(guard.p!==target.p||guard.hp<=0||guard.guardUntil<=g.time||distance(guard,target)>105)continue;const d=distance(guard,source)||1,dot=((source.x-guard.x)*guard.facingX+(source.y-guard.y)*guard.facingY)/d;if(dot>(g.specs[guard.p][2]===1?.35:0))power*=g.specs[guard.p][2]===0?.32:.5;}
  if(target.boss&&g.boss.brokenFor>0)power*=1.35;
  if(!pierce&&target.shield>0){const absorbed=Math.min(target.shield,power);target.shield-=absorbed;power-=absorbed;}
  if(stun>0&&target.casting){target.casting=null;target.recovery=.7;emit(g,{kind:'interrupt',victim:target.id,x:target.x,y:target.y,p:source.p,text:'INTERRUPTED'});if(target.boss){g.boss.brokenFor=3;announce(g,'Colossus staggered. Armor exposed!',source.p);}}
  target.stun=Math.max(target.stun,stun*(target.boss?.45:1));target.slow=Math.max(target.slow,slow);
  if(knock&&!target.boss)knockback(target,source,knock);
 }
 const dealt=Math.min(Math.max(0,target.hp),power);target.hp-=power;g.damage[source.p]+=dealt;g.energy[source.p]=Math.min(100,g.energy[source.p]+dealt*.012);
 if(skill)emit(g,{kind:'hit',ability,attacker:source.id,victim:target.id,card:source.card,p:source.p,x:source.x,y:source.y,tx:target.x,ty:target.y,power:dealt,color:TACTICAL_FIGHTERS[source.card].color,type:TACTICAL_FIGHTERS[source.card].type,ttl:.7});
 return dealt;
}
function heal(g,u,a,amount){const delta=Math.min(amount,a.maxHp-a.hp);if(delta<=0)return;a.hp+=delta;g.healing[u.p]+=delta;g.energy[u.p]=Math.min(100,g.energy[u.p]+delta*.008);emit(g,{kind:'heal',x:a.x,y:a.y,p:u.p,color:'#91f1bf'});}
function radiusHit(g,u,at,radius,power,options={}){for(const v of [...opponents(g,u.p),...g.towers.filter(t=>t.p!==u.p&&t.hp>0)])if(distance(v,at)<=radius)hit(g,u,v,power,{...options,skill:true});}
function resolveSkill(g,u,cast){
 const f=TACTICAL_FIGHTERS[u.card],s=statsOf(g,u),spec=g.specs[u.p][u.card],at={x:cast.x,y:cast.y};u.recovery=cast.ultimate?.6:.35;
 if(cast.ultimate){
  const allies=g.units.filter(a=>a.p===u.p&&a.hp>0&&distance(a,u)<250);
  if(u.card===2){for(const a of allies){a.shield=Math.min(a.maxHp*.7,a.shield+450);a.shieldUntil=g.time+9;}u.guardUntil=g.time+8;}
  else if(u.card===6||u.card===9){for(const a of allies){heal(g,u,a,a.maxHp*.45);a.stun=0;a.slow=0;a.shield=Math.max(a.shield,100);a.shieldUntil=g.time+5;}}
  else if(u.card===10){heal(g,u,u,u.maxHp*.4);u.shield=400;u.shieldUntil=g.time+8;radiusHit(g,u,at,120,320,{slow:3});}
  else{radiusHit(g,u,at,u.card===5?125:105,(f.power||100)*1.85,{stun:u.card===1?1.2:.4,slow:2});if(u.card===7)g.hazards.push({p:u.p,card:u.card,source:u.id,...at,radius:110,remaining:4,tick:0,damage:35,slow:1});}
  emit(g,{kind:'ultimate',attacker:u.id,card:u.card,p:u.p,x:at.x,y:at.y,radius:120,color:f.color,ttl:1.1});announce(g,f.ultimate+'!',u.p);return;
 }
 if(f.kind==='dash'||f.kind==='charge'){
  const from={x:u.x,y:u.y};u.dash={from,to:at,left:f.kind==='charge'?.35:.25,total:f.kind==='charge'?.35:.25,hitIds:[],power:f.power*(u.card===8&&spec===1?1.25:1),kind:f.kind};
  if(f.kind==='dash')g.hazards.push({p:u.p,card:u.card,source:u.id,x:(from.x+at.x)/2,y:(from.y+at.y)/2,radius:42,remaining:2.5,tick:0,damage:22,slow:0});
  emit(g,{kind:'dash',attacker:u.id,card:u.card,p:u.p,x:from.x,y:from.y,tx:at.x,ty:at.y,color:f.color,ttl:.55});u.recovery=0;
 }else if(f.kind==='beam'){
  const endpoint=aimFrom(u,at.x,at.y,f.reach),power=f.power*(spec===0?1.25:.85);
  for(const v of [...opponents(g,u.p),...g.towers.filter(t=>t.p!==u.p&&t.hp>0)])if(lineDistance(v,u,endpoint)<30)hit(g,u,v,power,{skill:true});
  emit(g,{kind:'beam',attacker:u.id,card:u.card,p:u.p,x:u.x,y:u.y,tx:endpoint.x,ty:endpoint.y,color:f.color,ttl:.65});u.recovery=1;
 }else if(f.kind==='shield'){u.guardUntil=g.time+6;u.shield=Math.max(u.shield,s.hp*.22);u.shieldUntil=g.time+6;emit(g,{kind:'barrier',x:u.x,y:u.y,p:u.p,color:f.color});}
 else if(f.kind==='heal'){u.channel={remaining:4,tick:0};}
 else if(f.kind==='sweep')radiusHit(g,u,u,95,f.power,{knock:40,stun:.3});
 else if(f.kind==='frost'){radiusHit(g,u,at,spec===0?85:65,f.power,{slow:spec===0?3.5:2.5});g.hazards.push({p:u.p,card:u.card,source:u.id,...at,radius:spec===0?85:65,remaining:3,tick:0,damage:8,slow:1});}
 else if(f.kind==='portal'){for(const v of opponents(g,u.p))if(distance(v,at)<(spec===0?105:80)){hit(g,u,v,f.power*(spec===1?1.2:1),{skill:true,slow:1});if(!v.boss){v.x+=(at.x-v.x)*.35;v.y+=(at.y-v.y)*.35;}}}
 else if(f.kind==='snare')g.hazards.push({p:u.p,card:u.card,source:u.id,...at,radius:75,remaining:spec===0?5:3.5,tick:0,damage:30,slow:1.3});
 else if(f.kind==='fan'){for(const v of opponents(g,u.p)){const d=distance(u,v),dot=((v.x-u.x)*u.facingX+(v.y-u.y)*u.facingY)/(d||1);if(d<f.reach&&dot>.65)hit(g,u,v,f.power*(v.hp/v.maxHp<.4?(spec===1?1.75:1.4):1),{skill:true});}}
 else if(f.kind==='decoy'||f.kind==='geyser'){
  if(f.kind==='decoy'){u.x=at.x;u.y=at.y;}else radiusHit(g,u,at,75,f.power,{slow:spec===0?3:1.5});
  for(const dx of [-18,18])if(g.units.length<72)spawn(g,u.card,u.p,at.x+dx,at.y,{baby:true,hp:s.hp*.25,expiresAt:g.time+9});
 }
 emit(g,{kind:'skill',attacker:u.id,card:u.card,p:u.p,x:at.x,y:at.y,color:f.color,ttl:.6});
}
function moveUnit(u,x,y,amount,air=false,dt=TACTICS_STEP){
 // Ground units use the bridges, including manually directed captains.
 if(!air&&((u.y>403&&y<358)||(u.y<357&&y>402)||(u.y>=357&&u.y<=403))){const bridge=u.x<300?135:465;x=bridge;y=y<u.y?340:420;}
 const d=Math.hypot(x-u.x,y-u.y);if(d<1){u.vx=0;u.vy=0;return true;}
 const acceleration=1-Math.exp(-dt*([2,5,8].includes(u.card)?6:14)),speed=amount/dt;
 u.vx=(u.vx||0)+((x-u.x)/d*speed-(u.vx||0))*acceleration;u.vy=(u.vy||0)+((y-u.y)/d*speed-(u.vy||0))*acceleration;
 let dx=u.vx*dt,dy=u.vy*dt;if(Math.hypot(dx,dy)>d){dx=x-u.x;dy=y-u.y;}
 face(u,{x,y});u.x=clamp(u.x+dx,24,576);u.y=clamp(u.y+dy,45,715);u.action='move';return Math.hypot(x-u.x,y-u.y)<1;
}
function chooseTarget(g,u,s){
 let best=null,range=Infinity;
 if(!s.siege||u.captain||u.boss)for(const v of opponents(g,u.p)){if(!s.airHit&&TACTICAL_FIGHTERS[v.card].air)continue;const d=distance(u,v);if(d<190&&d<range){best=v;range=d;}}
 if(!best)for(const t of g.towers){if(t.p!==u.p&&t.hp>0&&distance(u,t)<range){best=t;range=distance(u,t);}}
 return best;
}
function updateUnit(g,u,dt){
 if(u.hp<=0)return;const s=statsOf(g,u);u.age+=dt;u.action='idle';u.cd=Math.max(0,u.cd-dt);u.healCd-=dt;u.recovery=Math.max(0,u.recovery-dt);u.stun=Math.max(0,u.stun-dt);u.slow=Math.max(0,u.slow-dt);u.invulnerable=Math.max(0,u.invulnerable-dt);if(u.shieldUntil<g.time)u.shield=0;
 if(u.expiresAt&&u.expiresAt<=g.time){u.hp=0;return;}
 if(u.stun>0){u.channel=null;if(u.dash){u.dash=null;u.recovery=.7;emit(g,{kind:'interrupt',victim:u.id,p:1-u.p,x:u.x,y:u.y,text:'INTERRUPTED'});}return;}
 if(u.dash){const dash=u.dash,from={x:u.x,y:u.y};dash.left-=dt;const progress=clamp(1-dash.left/dash.total,0,1);u.x=dash.from.x+(dash.to.x-dash.from.x)*progress;u.y=dash.from.y+(dash.to.y-dash.from.y)*progress;face(u,dash.to);u.action='dash';
  for(const v of opponents(g,u.p))if(!dash.hitIds.includes(v.id)&&lineDistance(v,from,u)<(dash.kind==='charge'?42:33)){dash.hitIds.push(v.id);hit(g,u,v,dash.power,{stun:u.card===1&&g.specs[u.p][1]===0?1.15:.45,knock:u.card===8?38:0,skill:true,ability:dash.kind});}
  if(dash.left<=0){u.dash=null;u.recovery=.7;}return;
 }
 if(u.casting){u.action='cast';u.casting.left-=dt;if(u.casting.left<=0){const cast=u.casting;u.casting=null;resolveSkill(g,u,cast);}return;}
 if(u.recovery>0){u.action='recover';return;}
 if(u.channel){u.channel.remaining-=dt;u.channel.tick-=dt;u.action='channel';if(u.channel.tick<=0){const reach=u.card===6&&g.specs[u.p][6]===1?105:145;g.links=g.links.filter(l=>l.from!==u.id);for(const a of g.units)if(a.p===u.p&&a.hp>0&&distance(a,u)<reach){heal(g,u,a,Math.max(25,s.heal)*1.3);if(a!==u)g.links.push({from:u.id,to:a.id,until:g.time+.55});}u.channel.tick=.5;}if(u.channel.remaining<=0)u.channel=null;return;}
 if(u.order){
  const intendedTarget=[...opponents(g,u.p),...g.towers.filter(t=>t.p!==u.p&&t.hp>0)].find(v=>distance(v,u.order)<38&&distance(v,u)<=s.range+('king'in v?26:12));
  if(intendedTarget){u.order=null;u.vx=0;u.vy=0;}
  else{const done=moveUnit(u,u.order.x,u.order.y,s.speed*1.45*dt*(u.slow>0?.55:1),s.air,dt);if(done)u.order=null;return;}
 }
 if(s.heal&&u.healCd<=0){for(const a of g.units)if(a.p===u.p&&a.hp>0&&distance(a,u)<100)heal(g,u,a,s.heal);u.healCd=1.4;}
 const target=chooseTarget(g,u,s);if(!target)return;const range=distance(u,target),reach=s.range+('king'in target?25:12);
 if(range<=reach){face(u,target);u.action='attack';if(u.cd<=0){
  if(!u.pending){u.pending={target:target.id,left:u.card===5?.45:.2};emit(g,{kind:'windup',attacker:u.id,card:u.card,x:u.x,y:u.y,tx:target.x,ty:target.y,p:u.p,ttl:u.pending.left,color:s.color});}
 }}else if(!u.captain){moveUnit(u,target.x,target.y,s.speed*dt*(u.slow>0?.55:1),s.air,dt);}else{u.vx=0;u.vy=0;}
}
function resolveAttack(g,u,dt){
 if(!u.pending)return;if(u.stun>0||u.casting||u.order||u.recovery>0){u.pending=null;return;}
 u.pending.left-=dt;if(u.pending.left>0)return;const v=targetAt(g,u.pending.target),s=statsOf(g,u);u.pending=null;u.cd=s.rate;
 if(!v||distance(u,v)>s.range+45)return;
 let power=s.dmg*(u.baby?.5:1)*(u.boss?1.4:1);
 if(u.card===1&&g.specs[u.p][1]===1&&!g.units.some(a=>a.p===v.p&&a.id!==v.id&&a.hp>0&&distance(a,v)<80))power*=1.2;
 if(u.card===11&&g.specs[u.p][11]===1&&v.hp/v.maxHp<.4)power*=1.3;
 const dealt=hit(g,u,v,power,{stun:s.stun||0,slow:s.slow||0});if(s.splash)for(const a of opponents(g,u.p))if(a.id!==v.id&&distance(a,v)<s.splash)hit(g,u,a,power*.7);
 emit(g,{kind:s.range>80?'bolt':'hit',attacker:u.id,victim:v.id,card:u.card,p:u.p,power:dealt,x:u.x,y:u.y,tx:v.x,ty:v.y,type:s.type,color:s.color,splash:s.splash||0,attackerAir:!!s.air,targetAir:'card'in v&&!!TACTICAL_FIGHTERS[v.card].air});
}
function updateRelay(g,dt){
 const r=g.relay;if(!r.active&&g.time>=r.nextAt){r.active=true;r.owner=null;r.progress=[0,0];r.expiresAt=g.time+32;announce(g,'The relay is active. Contest the river!');emit(g,{kind:'relay',x:r.x,y:r.y,color:'#f1cf7b'});}
 if(!r.active)return;
 const presence=[0,0];for(const u of g.units)if(u.hp>0&&!u.baby&&distance(u,r)<r.radius)presence[u.p]+=u.captain?2:1;
 if(presence[0]>0&&presence[1]===0)r.progress[0]=Math.min(1,r.progress[0]+dt/5);
 else if(presence[1]>0&&presence[0]===0)r.progress[1]=Math.min(1,r.progress[1]+dt/5);
 for(let p=0;p<2;p++)if(presence[p]===0)r.progress[p]=Math.max(0,r.progress[p]-dt/10);
 const owner=r.progress.findIndex(v=>v>=1);
 if(owner>=0){r.owner=owner;r.captures[owner]++;g.barriers[owner]=Math.min(2,g.barriers[owner]+1);r.active=false;r.nextAt=g.time+42;announce(g,`${owner===0?'Your squad':'The rival'} captured a relay barrier.`,owner);emit(g,{kind:'capture',p:owner,x:r.x,y:r.y,color:owner===0?'#7acbff':'#ff737c'});}
 else if(g.time>=r.expiresAt){r.active=false;r.nextAt=g.time+35;announce(g,'The contested relay went dormant.');}
}
function updateBoss(g,dt){
 const b=g.boss;if(!b)return;const u=g.units.find(u=>u.id===b.id);if(!u||u.hp<=0)return;
 b.brokenFor=Math.max(0,b.brokenFor-dt);const phase=u.hp/u.maxHp<.33?3:u.hp/u.maxHp<.66?2:1;
 if(phase>b.phase){b.phase=phase;g.phase=phase;announce(g,`Colossus phase ${phase}: ${phase===2?'Armor fracture':'Last stand'}!`);emit(g,{kind:'ultimate',p:1,x:u.x,y:u.y,radius:140,color:'#ff7974'});}
 b.cd-=dt;if(b.cd>0||u.casting||u.stun>0)return;
 const target=opponents(g,1).sort((a,b)=>Number(!!b.captain)-Number(!!a.captain)||distance(a,u)-distance(b,u))[0];if(!target)return;
 b.cd=phase===3?5:7;u.casting={kind:'boss',x:target.x,y:target.y,left:1.6,total:1.6};
 emit(g,{kind:'cast',attacker:u.id,card:5,p:1,x:u.x,y:u.y,tx:target.x,ty:target.y,castKind:'boss',ttl:1.6,color:'#ff646d'});
}
function updateTowers(g,dt){for(const t of g.towers){if(t.hp<=0)continue;t.cd-=dt;if(t.cd>0)continue;const v=opponents(g,t.p).filter(u=>distance(t,u)<t.range).sort((a,b)=>distance(t,a)-distance(t,b))[0];if(!v)continue;const power=t.king?65:48;hit(g,{id:t.id,p:t.p,card:3,x:t.x,y:t.y},v,power);t.cd=.9;emit(g,{kind:'bolt',attacker:t.id,victim:v.id,power,type:'Electric',x:t.x,y:t.y,tx:v.x,ty:v.y,color:t.p===0?'#7acbff':'#ff737c'});}}
function separateUnits(g,dt){
 const cells=new Map(),radius=u=>u.boss?32:u.baby?9:u.captain?18:14;
 for(const u of g.units){if(u.hp<=0)continue;const key=Math.floor(u.x/64)+','+Math.floor(u.y/64);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(u);}
 for(const u of g.units){if(u.hp<=0)continue;const cx=Math.floor(u.x/64),cy=Math.floor(u.y/64),air=!!TACTICAL_FIGHTERS[u.card].air;
  for(let x=cx-1;x<=cx+1;x++)for(let y=cy-1;y<=cy+1;y++)for(const v of cells.get(x+','+y)||[]){if(v.id<=u.id||air!==!!TACTICAL_FIGHTERS[v.card].air)continue;const dx=v.x-u.x,dy=v.y-u.y,d=Math.hypot(dx,dy),minimum=radius(u)+radius(v);if(d>=minimum)continue;const push=Math.min(2.5,(minimum-d)*dt*3),nx=d>.001?dx/d:u.id%2?1:-1,ny=d>.001?dy/d:0,a=!u.casting&&!u.channel&&!u.boss,b=!v.casting&&!v.channel&&!v.boss;if(a){u.x=clamp(u.x-nx*push,24,576);u.y=clamp(u.y-ny*push,45,715);}if(b){v.x=clamp(v.x+nx*push,24,576);v.y=clamp(v.y+ny*push,45,715);}}
 }
}
function cleanup(g){
 const dead=g.units.filter(u=>u.hp<=0);for(const u of dead){emit(g,{kind:'poof',victim:u.id,x:u.x,y:u.y,p:u.p,color:TACTICAL_FIGHTERS[u.card].color});if(u.captain){g.respawn[u.p]=14;g.captains[u.p]=null;g.energy[u.p]=Math.max(0,g.energy[u.p]-15);announce(g,`${u.p===0?'Your':'Rival'} captain is recovering.`,u.p);}if(!u.expiresAt)g.kills[1-u.p]++;if(u.card===10&&!u.baby&&!u.captain&&!u.boss)for(const dx of [-13,13])if(g.units.length<72)spawn(g,10,u.p,u.x+dx,u.y,{baby:true,hp:u.maxHp*.3});}
 g.units=g.units.filter(u=>u.hp>0);g.links=g.links.filter(l=>l.until>g.time&&g.units.some(u=>u.id===l.from)&&g.units.some(u=>u.id===l.to));
}
function finishIfNeeded(g){
 for(let p=0;p<2;p++)g.score[p]=g.towers.filter(t=>t.p!==p&&t.hp<=0).length;
 if(g.mode==='hunt'){const boss=g.units.find(u=>u.id===g.boss.id);if(!boss||boss.hp<=0){g.status='ended';g.winner=0;}else if(g.towers.some(t=>t.king&&t.hp<=0)||g.time>=g.round){g.status='ended';g.winner=1;}return;}
 const kings=g.towers.filter(t=>t.king&&t.hp<=0);if(kings.length){g.status='ended';g.winner=kings.length===2?-1:1-kings[0].p;return;}
 if(g.time+1e-8>=g.round){const health=[0,0];for(const t of g.towers)health[t.p]+=Math.max(0,t.hp);g.status='ended';g.winner=g.score[0]!==g.score[1]?(g.score[0]>g.score[1]?0:1):Math.abs(health[0]-health[1])<.001?-1:health[0]>health[1]?0:1;}
}
export function stepTactics(g,dt=TACTICS_STEP){
 if(g.status!=='playing')return;
 if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new Error('Advance with a fixed step of at most 100ms.');
 g.time+=dt;g.effects=g.effects.filter(e=>(e.ttl-=dt)>0).slice(-160);
 for(let p=0;p<2;p++){g.elixir[p]=Math.min(10,g.elixir[p]+dt*(g.time>=g.round-60?.92:.58));g.energy[p]=Math.min(100,g.energy[p]+dt*.38);g.skillCd[p]=Math.max(0,g.skillCd[p]-dt);g.ultCd[p]=Math.max(0,g.ultCd[p]-dt);if(g.captains[p]===null&&!(g.mode==='hunt'&&p===1)){g.respawn[p]-=dt;if(g.respawn[p]<=0)spawnCaptain(g,p);}}
 for(const u of g.units){
  if(u.boss&&u.casting?.kind==='boss'&&u.casting.left<=dt&&u.stun<=dt){const at={x:u.casting.x,y:u.casting.y};u.casting=null;radiusHit(g,u,at,g.boss.phase===3?115:88,220+g.boss.phase*45,{stun:.6});emit(g,{kind:'ultimate',p:1,x:at.x,y:at.y,radius:100,color:'#ff646d'});u.recovery=1;}
  updateUnit(g,u,dt);resolveAttack(g,u,dt);
 }
 for(const h of g.hazards){h.remaining-=dt;h.tick-=dt;if(h.tick<=0){const u=g.units.find(u=>u.id===h.source);if(u)radiusHit(g,u,h,h.radius,h.damage,{slow:h.slow});h.tick=.5;}}
 g.hazards=g.hazards.filter(h=>h.remaining>0).slice(-24);separateUnits(g,dt);updateTowers(g,dt);updateRelay(g,dt);updateBoss(g,dt);cleanup(g);finishIfNeeded(g);
}
export function tacticsBot(g,p=1,dt=TACTICS_STEP){
 if(g.status!=='playing'||g.mode==='hunt'&&p===1)return;
 g.aiThink[p]-=dt;g.botClocks[p]-=dt;const u=captainOf(g,p),easy=g.difficulty==='easy';
 if(g.aiThink[p]<=0&&u){
  g.aiThink[p]=easy?1.8:.65;const enemy=opponents(g,p).sort((a,b)=>distance(a,u)-distance(b,u))[0],r=g.relay;
  // Read telegraphs and move out, then contest the relay or escort the front line.
  const danger=g.units.find(v=>v.p!==p&&v.casting&&Math.hypot(v.casting.x-u.x,v.casting.y-u.y)<100);
  if(danger&&!easy)applyTacticsCommand(g,p,{type:'move',x:clamp(u.x+(u.x<300?-125:125),35,565),y:clamp(u.y+(p===0?60:-60),65,695)});
  else if(!u.casting&&!u.channel){
   const target=enemy||g.towers.find(t=>t.p!==p&&t.king),spacing=clamp(TACTICAL_FIGHTERS[u.card].range*.75,35,100),goal=r.active?{x:300,y:p===0?407:353}:target?{x:target.x,y:clamp(target.y+(p===0?spacing:-spacing),70,690)}:{x:300,y:380};
   if(enemy&&distance(enemy,u)<TACTICAL_FIGHTERS[u.card].reach&&g.skillCd[p]<=0)applyTacticsCommand(g,p,{type:'skill',x:enemy.x,y:enemy.y});
   else if(!u.order&&distance(u,goal)>35)applyTacticsCommand(g,p,{type:'move',...goal});
   if(enemy&&g.energy[p]>=100)applyTacticsCommand(g,p,{type:'ultimate',x:enemy.x,y:enemy.y});
  }
  if(g.barriers[p]&&g.units.filter(a=>a.p===p&&a.hp>0&&a.hp/a.maxHp<.65).length>=2)applyTacticsCommand(g,p,{type:'barrier'});
 }
 if(g.botClocks[p]>0)return;g.botClocks[p]=easy?2.8:1.5;
 const choices=g.hand[p].map((id,slot)=>({id,slot})).filter(c=>TACTICAL_FIGHTERS[c.id].cost<=g.elixir[p]);if(!choices.length)return;
 const pick=choices[Math.floor(tacticsRandom(g)*choices.length)],lane=tacticsRandom(g)<.5?135:465;
 applyTacticsCommand(g,p,{type:'deploy',slot:pick.slot,x:lane+(tacticsRandom(g)-.5)*35,y:p===0?520:240});
}
export function companionBot(g,dt=TACTICS_STEP){
 if(g.mode!=='hunt'||g.status!=='playing')return;g.companionClock-=dt;if(g.companionClock>0)return;g.companionClock=8;
 // The offline hunt explicitly uses an AI companion, never an invented human.
 if(g.units.length<68){spawn(g,2,0,135,500,{companion:true});spawn(g,6,0,165,545,{companion:true});announce(g,'Sage’s support squad has arrived.',0);}
}
function quoteFor(frame,id){return frame?.prices?.find(q=>matchesStockQuote(q,TOKENS[id])&&quoteConnected(q))||null;}
function snapshotBaseline(g,frame){const maxAge=quoteMaxAgeMs('Public','equity');for(let id=0;id<12;id++){const q=quoteFor(frame,id);if(q&&q.publishTime*1000<=g.startedAt+5000&&g.startedAt-q.publishTime*1000<=maxAge){g.market.baseline[id]={price:q.price,feedId:q.feedId,publishTime:q.publishTime};g.market.current[id]={...q};g.market.status[id]='live';}}}
export function updateTacticsMarket(g,frame,wallTime=g.startedAt+g.time*1000){
 const m=g.market,maxAge=quoteMaxAgeMs('Public','equity');if(g.time+1e-8<m.nextUpdate)return false;
 for(let id=0;id<12;id++){const q=quoteFor(frame,id),base=m.baseline[id],prev=m.current[id];
  if(!base){m.status[id]='no-baseline';m.multipliers[id]=1;continue;}
  if(!q||q.feedId!==base.feedId||q.publishTime<(prev?.publishTime||base.publishTime)||q.publishTime*1000>wallTime+5000||wallTime-q.publishTime*1000>maxAge){m.status[id]='stale';m.multipliers[id]=1;continue;}
  m.current[id]={...q};m.status[id]='live';m.multipliers[id]=clamp(1+(q.price-base.price)/base.price*6,.85,1.15);
 }
 m.sequence++;m.nextUpdate=(Math.floor(g.time/MARKET_PULSE)+1)*MARKET_PULSE;return true;
}
export function stepReplay(g,recording,cursor){
 while(cursor.command<recording.commands.length&&recording.commands[cursor.command].tick===cursor.tick){const {p,...c}=recording.commands[cursor.command++];applyTacticsCommand(g,p,c);}
 const pulse=recording.pulses?.find(p=>p.tick===cursor.tick);if(pulse)g.market=structuredClone(pulse.market);
 companionBot(g);stepTactics(g);cursor.tick++;
}
export function replayTactics(initial,commands,ticks,pulses=[]){const g=createTactics(initial),recording={commands:[...commands].sort((a,b)=>a.tick-b.tick),pulses},cursor={command:0,tick:0};for(let tick=0;tick<ticks&&g.status==='playing';tick++)stepReplay(g,recording,cursor);return g;}
