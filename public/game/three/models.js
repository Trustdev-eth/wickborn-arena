import * as THREE from 'three';
import {legIK,clamp} from './math.js';
import {paintGeometry,solidShape} from './sculpt.js';
import {sculptFighter} from './fighters.js';
import {createSurfaceLibrary} from './surfaces.js';
import {combatPose} from './motion.js';
import {footStep,legOffset,locomotionPose,wingStroke} from './locomotion.js';

export function createKit(){
 const outlineMaterial=new THREE.MeshBasicMaterial({color:'#14212d',side:THREE.BackSide,toneMapped:false});
 const leaf=solidShape([[0,0],[-.28,.28],[-.36,.60],[0,1],[.36,.60],[.28,.28]],.035);leaf.rotateX(Math.PI/2);
 const creatureTemplates=new Map();let surfaces;
 const geometries={petal:paintGeometry(new THREE.SphereGeometry(1,10,6)),gem:paintGeometry(new THREE.OctahedronGeometry(1,0)),ball:paintGeometry(new THREE.SphereGeometry(1,20,14)),box:paintGeometry(new THREE.BoxGeometry(1,1,1)),rock:paintGeometry(new THREE.IcosahedronGeometry(1,1)),cone:paintGeometry(new THREE.ConeGeometry(1,1,6)),cylinder:paintGeometry(new THREE.CylinderGeometry(1,1,1,12)),ring:paintGeometry(new THREE.TorusGeometry(1,.035,5,28)),slash:paintGeometry(new THREE.TorusGeometry(1,.065,5,22,Math.PI*1.15)),leaf};
 function part(parent,type,material,position,scale,rotation=[0,0,0],shadow=true){const m=new THREE.Mesh(geometries[type],material);m.position.set(...position);m.scale.set(...scale);m.rotation.set(...rotation);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 return {geometries,part,outlineMaterial,creatureTemplates,get surfaces(){return surfaces||(surfaces=createSurfaceLibrary());},dispose(){for(const rig of creatureTemplates.values())disposeCreature(rig);creatureTemplates.clear();Object.values(geometries).forEach(g=>g.dispose());surfaces?.dispose();outlineMaterial.dispose();}};
}
export const CHARACTER_LANDMARKS=['orchard-leaf-shield', 'battery-tail', 'cloud-cube-shell', 'lens-monocle', 'parcel-gliders', 'tensor-chip-shoulders', 'vital-lily-staff', 'portal-wings', 'vault-armor', 'film-ribbon-wings', 'fry-crown', 'archer-hood'];
// Reuse baked geometry across fighters; materials and animated joints stay independent.
export function createCreature(id,kit){
 let template=kit.creatureTemplates.get(id);if(!template){template=sculptFighter(id,kit);kit.creatureTemplates.set(id,template);}
 const root=template.root.clone(true),original=[],cloned=[];template.root.traverse(o=>original.push(o));root.traverse(o=>cloned.push(o));const nodes=new Map(original.map((o,i)=>[o,cloned[i]])),materials=template.materials.map(m=>{const copy=m.clone();copy.userData.baseEmissive=m.userData.baseEmissive.clone();copy.userData.baseGlow=m.userData.baseGlow;return copy;}),materialMap=new Map(template.materials.map((m,i)=>[m,materials[i]]));
 for(const o of cloned)if(o.isMesh&&materialMap.has(o.material))o.material=materialMap.get(o.material);
 const node=o=>o?(nodes.get(o)||o.clone()):o,rig={...template,root,body:node(template.body),head:node(template.head),jaw:node(template.jaw),materials,owned:new Set(),eyesRig:template.eyesRig.map(node),legs:template.legs.map(l=>({...l,hip:node(l.hip),knee:node(l.knee),ankle:node(l.ankle)})),arms:template.arms.map(a=>({...a,node:node(a.node),elbow:node(a.elbow)})),wings:template.wings.map(w=>({...w,node:node(w.node),tip:node(w.tip)})),tails:template.tails.map(t=>({...t,node:node(t.node)})),extras:template.extras.map(e=>({...e,node:node(e.node)})),secondary:template.secondary.map(e=>({...e,node:node(e.node)})),inverseBody:new THREE.Matrix4(),footTarget:new THREE.Vector3()};
 // Measure health labels and deployment previews from the actual resting pose.
 animateCreature(rig,{motion:false});return rig;
}
const MOOD_UP=new THREE.Color('#ffc443'),MOOD_DOWN=new THREE.Color('#4a74d6');
// mood: market buff (+1) to nerf (-1). react: market-tick reaction decaying 1→0, signed by direction.
export function animateCreature(rig,options={}){
 const {time=0,distance=0,moving=0,attack=-1,combo=0,hit=0,stun=0,motion=true,dying=0,engaged=false,mood=0,react=0,turn=0}=options;
 const m=motion?1:0,t=time+(rig.phase||0),guard=engaged?m:0,heavy=rig.id===5||rig.id===8;
 const gait=locomotionPose(rig.id,distance,clamp(moving,0,1)*m),weight=gait.weight,p=combatPose(rig.id,attack,combo),wind=p.wind*m,strike=p.strike*m;
 const happy=clamp(mood,0,1),sad=clamp(-mood,0,1),joy=happy*m,gloom=sad*m;
 const cheer=react>0?clamp(1-react,0,1):0,jump=react>0?Math.sin(cheer*Math.PI)*m:0,flinch=react<0?clamp(-react,0,1)*m:0;
 const bank=clamp(turn*.035,-.10,.10)*m,breath=Math.sin(t*2.0+rig.id*.71)*.0035*m;
 rig.body.position.set(p.x*m+gait.roll*.10+Math.sin(t*2.2)*.003*guard,gait.bob+breath+p.y*m-weight*.014-.035*gloom+jump*.26-.022*flinch,p.z*m-hit*.026*m);
 rig.body.rotation.set(p.pitch*m+gait.pitch+.012*guard-.035*joy+.11*gloom+.13*flinch,p.twist*m,gait.roll+p.roll*m-bank+Math.sin(t*23)*hit*.035*m);
 rig.body.scale.set(1,1,1);
 if(rig.kind==='fly'){
  const freq=rig.id===9?13:rig.id===4?15:rig.id===7?8:7;
  rig.body.position.y+=wingStroke(t,freq,.3)*.018*m-.045*gloom;
  rig.body.rotation.x+=weight*.045;rig.body.rotation.z-=bank*.4;
 }
 if(rig.kind==='slime'){
  // Only the gelatinous fighter changes volume distribution; vertebrate bodies
  // express weight with joints, rather than inflating with every punch.
  const squash=Math.cos(gait.cycle)*.08*weight+wind*.18-strike*.13+.04*gloom,sy=1-squash,sxz=1/Math.sqrt(sy);
  rig.body.scale.set(sxz,sy,sxz);rig.body.position.y+=Math.max(0,Math.sin(gait.cycle))*.12*weight;
 }
 if(stun>0)rig.body.rotation.z+=Math.sin(t*12)*.025*m;
 if(dying>0){const fall=dying*dying;rig.body.rotation.z+=fall*1.20*m;rig.body.position.y-=fall*.25;rig.body.rotation.x+=fall*.22*m;}
 if(!motion){rig.body.position.set(0,0,0);rig.body.rotation.set(0,0,0);rig.body.scale.set(1,1,1);}
 if(rig.head)rig.head.rotation.set(p.head*m-gait.pitch*.65-hit*.13*m-.10*joy+.21*gloom-.16*jump+.13*flinch,Math.sin(t*1.1+rig.id)*.015*(1-weight)*m-p.twist*.36*m+clamp(turn*.028,-.08,.08)*m,hit*.035*m-gait.roll*.55);
 if(rig.jaw)rig.jaw.rotation.x=p.jaw*m+hit*.06*m+.045*joy+.16*jump+.10*flinch;
 for(const eye of rig.eyesRig){
  const period=3.7+rig.id*.071,phase=((t+rig.id*.59)%period+period)%period,blink=motion&&phase<.14?Math.sin(phase/.14*Math.PI):0;
  eye.scale.y=(1-.12*happy-.17*sad)*(1-blink*.94);
 }
 // Solve each supporting ankle in the unrotated root frame. Inverting the
 // torso transform counteracts lean and recoil instead of dragging the foot.
 rig.body.updateMatrix();rig.inverseBody.copy(rig.body.matrix).invert();
 for(const leg of rig.legs){
  const step=footStep(distance,legOffset(leg,gait.gait),gait.gait),walking=weight*(1-strike*.68),swipe=leg.front?strike*p.paw:0;
  const airborne=rig.kind==='fly',lift=airborne?.075+rig.body.position.y:step.lift*walking+jump*.26+Math.max(0,p.y-.045)*m;
  const lunge=airborne?0:p.z*m*(leg.front?.70:.28);
  const target=rig.footTarget.set(leg.restX+leg.side*.009*guard,lift,leg.restZ+step.forward*walking+(airborne?-.055:swipe*.035)+lunge).applyMatrix4(rig.inverseBody).sub(leg.hip.position);
  const down=Math.max(.025,-target.y),roll=Math.atan2(target.x,down),pose=legIK(target.z,Math.hypot(down,target.x),leg.upper,leg.lower);
  leg.hip.rotation.set(pose.hip,0,roll,'ZXY');leg.knee.rotation.x=pose.knee;
  leg.ankle.rotation.x=-pose.hip-pose.knee-rig.body.rotation.x+step.roll*walking+(airborne?.18:0);
 }
 for(const arm of rig.arms){
  const active=combo%3===2||arm.sign===(combo%2?1:-1),strength=active?1:.32;
  arm.node.rotation.set(Math.sin(gait.cycle+arm.sign*Math.PI*.5)*.22*weight+p.arm*strength*m-.18*guard*(1-strike)-jump*.95+.10*gloom,arm.sign*p.twist*.35*m,arm.base+arm.sign*p.spread*m-arm.sign*jump*.16);
  arm.elbow.rotation.x=-.12*m+p.elbow*strength*m-.19*guard*(1-strike)-jump*.25;
 }
 for(const wing of rig.wings){
  const freq=wing.style==='bat'?(rig.id===7?8:15):wing.style==='moth'?13:wing.style==='fin'?4.4:7;
  const flap=wingStroke(t,freq)*(.28+weight*.065+.07*joy+.14*jump)*(1-.25*gloom)*m;
  wing.node.rotation.z=wing.sign*(wing.style==='fin'?Math.sin(t*4.4)*.06*m:(wing.restRoll||0)+flap+wind*.16-strike*.25);
  wing.node.rotation.x=(wing.restPitch||0)+wingStroke(t,freq,.7)*.065*m+strike*.09;
  wing.tip.rotation.z=wingStroke(t,freq,.85)*.18*m;wing.tip.rotation.x=-wingStroke(t,freq,1.10)*.065*m;
 }
 for(const tail of rig.tails){
  tail.node.rotation.y=Math.sin(t*2.3-tail.offset*.7+gait.cycle*.38)*(.035+weight*.085)*(1-.5*gloom)*m+Math.sin(t*6.5)*.09*joy+p.tail*m-bank*.6;
  tail.node.rotation.x=Math.sin(t*1.8+.6)*.018*m-wind*.055+strike*.035;
 }
 for(const item of rig.secondary){
  const lag=item.type==='cloth'?Math.sin(gait.cycle-.8)*.10*weight+Math.sin(t*3.1)*.025*m:Math.sin(t*2.6+item.sign)*.012*m;
  item.node.rotation.set(item.baseX+lag+wind*.055,item.baseY+bank*.25,item.baseZ+item.sign*(lag*.35-strike*.025));
 }
 for(const extra of rig.extras)if(extra.type==='staff')extra.node.rotation.x=(Math.sin(t*2.2)*.012+Math.sin(gait.cycle-.7)*.025*weight)*m-strike*.035;
 const glow=clamp(Math.abs(mood)*.6+Math.abs(react)*.5,0,1),tint=(react||mood)>=0?MOOD_UP:MOOD_DOWN;
 for(const material of rig.materials){
  if(hit>0){material.emissive.setRGB(.8,.24,.08);material.emissiveIntensity=hit*.32;}
  else{material.emissive.copy(material.userData.baseEmissive);material.emissiveIntensity=material.userData.baseGlow;
   if(glow>.02){if(material.userData.baseGlow>0)material.emissiveIntensity*=1+.9*happy+.8*Math.max(0,react)-.5*sad;else if(material.vertexColors){material.emissive.copy(tint);material.emissiveIntensity=Math.abs(mood)*.04+Math.abs(react)*.15;}}
  }
 }
}
export function disposeCreature(rig){rig.materials.forEach(m=>m.dispose());rig.owned.forEach(g=>g.dispose());rig.owned.clear();}
