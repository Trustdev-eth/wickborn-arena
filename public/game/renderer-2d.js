import {W,H,deploymentZones,canDeployAt} from './engine.js';
import {CARDS} from './stock-roster.js';
import {MotionTracker} from './smooth.js';
import {SPRITE_ART,fitSprite} from './sprite-art.js';
import {ARENA_PALETTE as palette} from './art-direction.js';
export function renderer(canvas){
 const ctx=canvas.getContext('2d'),images=SPRITE_ART.map(src=>{const image=new Image();image.src=src;return image;});let side=0,selected=-1,pointer=null,lastDraw=null;const tracker=new MotionTracker();canvas.width=W;canvas.height=H;
 const bg=document.createElement('canvas');bg.width=W;bg.height=H;const b=bg.getContext('2d');
 const poly=(c,pts,fill,stroke='#283e40',lw=2)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
 const rr=(c,x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}};
 function tree(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#294b442c';c.beginPath();c.ellipse(4,18,24,10,0,0,7);c.fill();rr(c,-4,-6,10,27,2,palette.trunk);for(const [a,z,r]of [[-13,-16,19],[13,-17,21],[0,-36,23]]){c.fillStyle=z<-20?palette.leaves[1]:palette.leaves[0];c.strokeStyle=palette.edge;c.lineWidth=2;c.beginPath();c.arc(a,z,r,0,7);c.fill();c.stroke();}c.fillStyle=palette.leaves[2];c.beginPath();c.arc(-7,-43,11,0,7);c.fill();c.restore();}
 function background(){
  b.fillStyle=palette.grass;b.fillRect(0,0,W,H);for(let y=0;y<H;y+=38)for(let x=0;x<W;x+=38){b.fillStyle=(x/38+y/38)%2?palette.grass:palette.patch;b.fillRect(x,y,38,38);}
  rr(b,35,29,530,702,48,palette.grass,palette.edge);rr(b,54,44,492,672,34,palette.grass);
  b.fillStyle=palette.path;for(const x of [135,465]){b.fillRect(x-35,180,70,420);for(let y=186;y<590;y+=25){b.fillStyle=y%50?palette.path:palette.path;rr(b,x-24,y,48,19,3,b.fillStyle);}}
  b.fillStyle=palette.water;b.beginPath();b.moveTo(0,346);b.bezierCurveTo(170,326,450,366,600,342);b.lineTo(600,404);b.bezierCurveTo(390,418,150,381,0,416);b.closePath();b.fill();
  b.strokeStyle=palette.waterGlow;b.lineWidth=3;b.beginPath();b.moveTo(0,347);b.bezierCurveTo(170,327,450,367,600,343);b.moveTo(0,416);b.bezierCurveTo(150,381,390,418,600,404);b.stroke();
  b.strokeStyle='#a4dfd44d';for(let i=0;i<26;i++){const x=(i*89)%W,y=360+(i%4)*9;b.beginPath();b.moveTo(x,y);b.lineTo(x+22,y+1);b.stroke();}
  for(const x of [135,465]){rr(b,x-38,333,76,95,5,palette.wood,palette.edge);for(let y=340;y<420;y+=11){rr(b,x-32,y,64,8,2,palette.rail,palette.wood);}rr(b,x-43,326,8,107,3,palette.rail,palette.edge);rr(b,x+35,326,8,107,3,palette.rail,palette.edge);}
  for(const [x,y,s]of [[26,94,.8],[25,205,.75],[568,118,.95],[579,244,.6],[22,548,.8],[571,600,.85],[25,688,.65],[575,707,.55]])tree(b,x,y,s);
  for(let i=0;i<43;i++){const x=i%2?42:550,y=45+((i*77)%660);b.fillStyle=i%3===0?palette.blossom:palette.leaves[1];b.beginPath();b.arc(x+(i%5)*2,y,i%3===0?2:3,0,7);b.fill();}
  b.strokeStyle=palette.edge;b.lineWidth=3;b.strokeRect(1.5,1.5,W-3,H-3);
 }
 background();
 function tower(t,y){
  const x=t.x,own=t.p===side,c=own?palette.friendly:palette.enemy,dark=own?palette.friendly:palette.enemy,scale=t.king?1.13:1;
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='#20352b20';ctx.beginPath();ctx.ellipse(6,12,46,17,0,0,7);ctx.fill();
  if(t.hp<=0){poly(ctx,[[-24,10],[-16,-5],[-5,0],[3,-12],[26,6],[30,15]],'#9a9f86','#7b856e');ctx.restore();return;}
  poly(ctx,[[-31,-42],[26,-42],[37,-28],[37,10],[26,21],[-31,9]],'#e5d7ac');poly(ctx,[[26,-42],[37,-28],[37,10],[26,21]],'#c4b692');rr(ctx,-31,-43,57,54,3,'#efe4bf','#4b6057');
  ctx.strokeStyle='#cbbf97';ctx.lineWidth=1;for(let z=-27;z<6;z+=13){ctx.beginPath();ctx.moveTo(-29,z);ctx.lineTo(24,z);ctx.stroke();}rr(ctx,-9,-16,18,27,8,'#4a665e');rr(ctx,-7,-14,14,23,5,'#314949');
  poly(ctx,[[-40,-41],[0,-68],[39,-41],[26,-32],[-30,-32]],c);poly(ctx,[[0,-68],[39,-41],[26,-32],[0,-48]],dark);
  for(const a of [-25,-8,9,26])rr(ctx,a-6,-47,11,12,1,c,'#49675a');
  ctx.strokeStyle='#526757';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-65);ctx.lineTo(0,-96);ctx.stroke();poly(ctx,[[1,-96],[26,-87],[1,-78]],c,'#49675a');
  if(t.king){ctx.fillStyle='#f4c957';ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.fillText('♛',0,-45);}
  rr(ctx,-33,27,66,8,4,'#344c40');rr(ctx,-31,29,62*Math.max(0,t.hp/t.maxHp),4,2,own?'#4c9be0':'#e1857a');ctx.fillStyle='#30473a';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillText(Math.max(0,Math.ceil(t.hp)),0,48);ctx.restore();
 }
 function sprite(id,x,y,size,flip=false){
  const image=images[id];if(!image?.complete||!image.naturalWidth){ctx.fillStyle=CARDS[id].color;ctx.beginPath();ctx.arc(x,y-12,size*.3,0,7);ctx.fill();return;}
  const fit=fitSprite(image.naturalWidth,image.naturalHeight,size);ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(image,-fit.width/2,-size*.84,fit.width,fit.height);ctx.restore();
 }
 function tacticalOverlay(g,vy,options){
  if(g.ruleset!=='wickborn-tactics')return;
  const circle=(x,y,r,color,fill=false)=>{ctx.beginPath();ctx.arc(x,vy(y),r,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();if(fill){ctx.globalAlpha=.12;ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;}};
  const line=(a,b,color,width=3)=>{ctx.beginPath();ctx.moveTo(a.x,vy(a.y));ctx.lineTo(b.x,vy(b.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
  const r=g.relay;circle(r.x,r.y,r.radius,r.active?'#c49b35':'#688779');ctx.fillStyle='#263528';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(r.active?'RELAY ACTIVE':'RELAY',r.x,vy(r.y)+4);
  for(const h of g.hazards)circle(h.x,h.y,h.radius,h.p===side?'#327fc2':'#d44d65',true);
  for(const u of g.units){
   if(u.captain)circle(u.x,u.y,25,u.p===side?'#fff1a0':'#e7526e');
   if(u.shield>0)circle(u.x,u.y,31,'#52b8ff');
   if(u.guardUntil>g.time){const at={x:u.x+u.facingX*35,y:u.y+u.facingY*35};line({x:at.x-u.facingY*45,y:at.y+u.facingX*45},{x:at.x+u.facingY*45,y:at.y-u.facingX*45},'#51b8ff',7);}
   if(u.casting){const c=u.casting,ink=u.p===side?'#237fe2':'#d21c49';if(['beam','dash','charge'].includes(c.kind))line(u,{x:c.x,y:c.y},ink,c.kind==='beam'?17:8);else circle(c.x,c.y,c.kind==='boss'?100:c.ultimate?110:75,ink,true);}
  }
  for(const l of g.links){const a=g.units.find(u=>u.id===l.from),b=g.units.find(u=>u.id===l.to);if(a&&b)line(a,b,'#2c9a66',4);}
  if(options.pointer&&options.aim)circle(options.pointer.x,side===1?H-options.pointer.y:options.pointer.y,options.aim==='move'?13:60,'#6a4f0c');
 }
 function draw(g,options={}){
  side=options.side||0;selected=options.selected??-1;pointer=options.pointer;const vy=y=>side===1?H-y:y;ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0);
  if(options.active&&selected>=0){ctx.fillStyle='#59a3df17';for(const z of deploymentZones(g,side))ctx.fillRect(z.x,side===1?H-z.y-z.h:z.y,z.w,z.h);ctx.setLineDash([8,8]);ctx.strokeStyle='#3e91c877';ctx.lineWidth=2;for(const z of deploymentZones(g,side))ctx.strokeRect(z.x,side===1?H-z.y-z.h:z.y,z.w,z.h);ctx.setLineDash([]);}
  if(g){
   tacticalOverlay(g,vy,options);
   [...g.towers].sort((a,b)=>vy(a.y)-vy(b.y)).forEach(t=>tower(t,vy(t.y)));
   const now=performance.now()/1000,dt=lastDraw===null?0:Math.min(.06,Math.max(0,now-lastDraw));lastDraw=now;tracker.update(g.units,g.time,MotionTracker.renderTime(g,options.clock),options.paused?0:dt);
   g.units.map(u=>{const t=tracker.get(u.id);return {...u,x:t.x,y:t.y};}).sort((a,b)=>vy(a.y)-vy(b.y)).forEach(u=>{const y=vy(u.y),c=CARDS[u.card],mult=g.market?.status?.[u.card]==='live'?g.market.multipliers[u.card]??1:1,mood=Math.max(-1,Math.min(1,(mult-1)/.15)),pct=Math.round((mult-1)*100),still=options.motion===false,air=c.air?13+(still?0:Math.sin(performance.now()/190+u.id)*4):0,bob=still?0:mood>0?-Math.abs(Math.sin(performance.now()/160+u.id))*(2+5*mood):Math.sin(performance.now()/110+u.id)*2*(1+mood*.6),slump=mood<0?-mood*4:0;ctx.fillStyle='#29473532';ctx.beginPath();ctx.ellipse(u.x,y+5,u.baby?10:18,6,0,0,7);ctx.fill();if(Math.abs(mood)>.05){ctx.strokeStyle=mood>0?'#ffd34f':'#7c8cff';ctx.globalAlpha=.3+.5*Math.abs(mood);ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(u.x,y+5,u.baby?13:22,8,0,0,7);ctx.stroke();ctx.globalAlpha=1;}sprite(u.card,u.x,y-air+bob+slump,u.baby?34:57,u.p===side);rr(ctx,u.x-17,y-air-46,34,5,2,'#354c48');rr(ctx,u.x-16,y-air-45,32*Math.max(0,u.hp/u.maxHp),3,1,u.p===side?'#5fa7eb':'#e68c80');if(pct){ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#102030';const label=(pct>0?'▲+':'▼')+pct+'%';ctx.strokeText(label,u.x,y-air-50);ctx.fillStyle=pct>0?'#ffe27a':'#a9bcff';ctx.fillText(label,u.x,y-air-50);}if(u.slow>0||u.stun>0){ctx.strokeStyle=u.stun>0?'#fddc6d':'#b8eff4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(u.x,y-air-16,25,0,7);ctx.stroke();}});
   for(const e of g.effects){ctx.save();ctx.globalAlpha=Math.min(1,e.ttl*3);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;ctx.lineWidth=e.kind==='bolt'?3:4;const y=vy(e.y);if(e.kind==='bolt'){ctx.beginPath();ctx.moveTo(e.x,y-12);ctx.lineTo(e.tx,vy(e.ty)-12);ctx.stroke();ctx.beginPath();ctx.arc(e.tx,vy(e.ty)-12,4,0,7);ctx.fill();}else if(e.kind==='heal'){ctx.font='bold 22px Arial';ctx.fillText('+',e.x-6,y-30);}else{ctx.beginPath();ctx.arc(e.x,y-10,12+(1-e.ttl)*22,0,7);ctx.stroke();}ctx.restore();}
  }
  if(options.active&&selected>=0&&pointer&&canDeployAt(g,side,pointer.x,side===1?H-pointer.y:pointer.y)){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(pointer.x,pointer.y,25,12,0,0,7);ctx.stroke();if(g){ctx.globalAlpha=.65;sprite(g.hand[side][selected],pointer.x,pointer.y,64);ctx.globalAlpha=1;}}
 }
 return {draw,sprite,images};
}
