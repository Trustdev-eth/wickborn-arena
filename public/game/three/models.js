import * as THREE from 'three';
import {legIK,clamp} from './math.js';
import {paintGeometry,solidShape} from './sculpt.js';
import {sculptFighter} from './fighters.js';
import {combatPose} from './motion.js';

export function createKit(){
 const outlineMaterial=new THREE.MeshBasicMaterial({color:'#14212d',side:THREE.BackSide,toneMapped:false});
 const leaf=solidShape([[0,0],[-.28,.28],[-.36,.60],[0,1],[.36,.60],[.28,.28]],.035);leaf.rotateX(Math.PI/2);
 const creatureTemplates=new Map();
 const geometries={petal:paintGeometry(new THREE.SphereGeometry(1,10,6)),gem:paintGeometry(new THREE.OctahedronGeometry(1,0)),ball:paintGeometry(new THREE.SphereGeometry(1,20,14)),box:paintGeometry(new THREE.BoxGeometry(1,1,1)),rock:paintGeometry(new THREE.IcosahedronGeometry(1,1)),cone:paintGeometry(new THREE.ConeGeometry(1,1,6)),cylinder:paintGeometry(new THREE.CylinderGeometry(1,1,1,12)),ring:paintGeometry(new THREE.TorusGeometry(1,.035,5,28)),slash:paintGeometry(new THREE.TorusGeometry(1,.065,5,22,Math.PI*1.15)),leaf};
 function part(parent,type,material,position,scale,rotation=[0,0,0],shadow=true){const m=new THREE.Mesh(geometries[type],material);m.position.set(...position);m.scale.set(...scale);m.rotation.set(...rotation);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 return {geometries,part,outlineMaterial,creatureTemplates,dispose(){for(const rig of creatureTemplates.values())disposeCreature(rig);creatureTemplates.clear();Object.values(geometries).forEach(g=>g.dispose());outlineMaterial.dispose();}};
}
export const CHARACTER_LANDMARKS=['orchard-leaf-shield', 'battery-tail', 'cloud-cube-shell', 'lens-monocle', 'parcel-gliders', 'tensor-chip-shoulders', 'vital-lily-staff', 'portal-wings', 'vault-armor', 'film-ribbon-wings', 'fry-crown', 'archer-hood'];
// Reuse baked geometry across fighters; materials and animated joints stay independent.
export function createCreature(id,kit){
 let template=kit.creatureTemplates.get(id);if(!template){template=sculptFighter(id,kit);kit.creatureTemplates.set(id,template);}
 const root=template.root.clone(true),original=[],cloned=[];template.root.traverse(o=>original.push(o));root.traverse(o=>cloned.push(o));const nodes=new Map(original.map((o,i)=>[o,cloned[i]])),materials=template.materials.map(m=>{const copy=m.clone();copy.userData.baseEmissive=m.userData.baseEmissive.clone();copy.userData.baseGlow=m.userData.baseGlow;return copy;}),materialMap=new Map(template.materials.map((m,i)=>[m,materials[i]]));
 for(const o of cloned)if(o.isMesh&&materialMap.has(o.material))o.material=materialMap.get(o.material);
 const node=o=>o?(nodes.get(o)||o.clone()):o,rig={...template,root,body:node(template.body),head:node(template.head),jaw:node(template.jaw),materials,owned:new Set(),eyesRig:template.eyesRig.map(node),legs:template.legs.map(l=>({...l,hip:node(l.hip),knee:node(l.knee)})),arms:template.arms.map(a=>({...a,node:node(a.node),elbow:node(a.elbow)})),wings:template.wings.map(w=>({...w,node:node(w.node),tip:node(w.tip)})),tails:template.tails.map(t=>({...t,node:node(t.node)})),extras:template.extras.map(e=>({...e,node:node(e.node)}))};
 // Measure health labels and deployment previews from the actual resting pose.
 animateCreature(rig,{motion:false});return rig;
}
const MOOD_UP=new THREE.Color('#ffc443'),MOOD_DOWN=new THREE.Color('#4a74d6');
// mood: market buff (+1) to nerf (-1). react: market-tick reaction decaying 1→0, signed by direction.
export function animateCreature(rig,options={}){
 const {time=0,distance=0,moving=0,attack=-1,combo=0,hit=0,stun=0,motion=true,dying=0,engaged=false,mood=0,react=0}=options,m=motion?1:0,t=time+(rig.phase||0),guard=engaged?m:0,heavy=rig.id===5||rig.id===8,phase=distance*(heavy?6.6:10.5),weight=clamp(moving,0,1)*m,p=combatPose(rig.id,attack,combo),wind=p.wind*m,strike=p.strike*m,settle=p.settle*m;
 const happy=clamp(mood,0,1),sad=clamp(-mood,0,1),joy=happy*m,gloom=sad*m,idle=1-weight*.6,cheer=react>0?clamp(1-react,0,1):0,jump=react>0?Math.sin(cheer*Math.PI)*m:0,spin=react>0?cheer*cheer*(3-2*cheer)*Math.PI*2*m:0,shudder=react<0?clamp(-react,0,1)*m:0;
 const bob=Math.max(0,Math.sin(phase*2))*(heavy?.055:.085)*weight;
 rig.body.position.set(p.x*m+Math.sin(t*2.3)*.014*guard+Math.sin(t*41)*.03*shudder+Math.sin(t*29)*.008*gloom*gloom,bob+Math.sin(t*2.4+rig.id)*.012*m+p.y*m+Math.abs(Math.sin(t*5.2))*.045*joy*idle-.05*gloom+jump*.34-.05*shudder,p.z*m);
 rig.body.rotation.set(p.pitch*m+.025*guard-.07*joy+.14*gloom-jump*.10+shudder*.16,p.twist*m+spin,Math.sin(phase)*(heavy?.055:.035)*weight+p.roll*m+Math.sin(t*43)*hit*.11*m+Math.sin(t*3.1)*.05*joy*idle);
 rig.body.scale.set((1+wind*.025-strike*.02)*(1+.03*joy-.02*gloom-.09*shudder),(1-wind*.06+strike*.025)*(1+.05*joy-.06*gloom+.10*jump-.12*shudder),(1+strike*.04)*(1+.03*joy-.02*gloom-.09*shudder));
 if(rig.head)rig.head.rotation.set(p.head*m-hit*.22*m-.17*joy+.30*gloom-.32*jump+.24*shudder,Math.sin(t*1.4+rig.id)*.035*(1-weight)*m+p.twist*-.3*m,hit*.07*m+Math.sin(t*4.2)*.11*joy*idle);
 if(rig.jaw)rig.jaw.rotation.x=p.jaw*m+hit*.14*m+.10*joy+.42*jump+.24*shudder;
 for(const eye of rig.eyesRig){const blink=motion&&Math.sin(t*.83+rig.id*3)> .996;eye.scale.y=blink?.18:1-.32*happy-.40*sad;}
 for(const leg of rig.legs){const q=phase+leg.phase,lift=Math.max(0,Math.sin(q))*(heavy?.11:.17)*weight+(leg.front?strike*p.paw*.15:0),forward=Math.cos(q)*(heavy?.18:.22)*weight+(leg.front?strike*p.paw*.18:0),pose=legIK(forward,leg.upper+leg.lower-.02+rig.body.position.y-lift,leg.upper,leg.lower);leg.hip.rotation.x=pose.hip+(leg.front?-wind*.24:wind*.08);leg.knee.rotation.x=pose.knee;leg.hip.rotation.z=leg.side*.045*guard;}
 for(const arm of rig.arms){const active=combo%3===2||arm.sign===(combo%2?1:-1),strength=active?1:.46;arm.node.rotation.set(Math.sin(phase+arm.sign)*.35*weight+p.arm*strength*m-.22*guard*(1-strike)-2.1*jump-Math.max(0,Math.sin(t*6+arm.sign))*.28*joy*idle+.18*gloom,arm.sign*p.twist*.45*m,arm.base+arm.sign*p.spread*m);arm.elbow.rotation.x=p.elbow*strength*m-.16*guard*(1-strike)-.5*jump;}
 for(const wing of rig.wings){const freq=wing.style==='bat'?18:wing.style==='moth'?11:wing.style==='fin'?5:8,flap=Math.sin(t*freq)*(.52+weight*.12+.22*joy+.40*jump)*(1-.45*gloom)*m;wing.node.rotation.z=wing.sign*(wing.style==='fin'?Math.sin(t*5)*.12*m:(wing.restRoll||0)+flap+wind*.30-strike*.43);wing.node.rotation.x=(wing.restPitch||0)+Math.sin(t*freq-.4)*.09*m+strike*.13;wing.tip.rotation.z=Math.sin(t*freq-.7)*.24*m;}
 for(const tail of rig.tails){tail.node.rotation.y=Math.sin(t*3.3-tail.offset*.7+phase*.25)*(.11+weight*.12)*(1-.7*gloom)*m+Math.sin(t*9-tail.offset)*.24*joy+p.tail*m;tail.node.rotation.x=Math.sin(t*2.6)*.035*m+wind*.06;}
 if(rig.kind==='fly'){rig.body.position.y+=Math.sin(t*4+rig.id)*.07*m+(rig.swim?Math.sin(t*3.8)*.06*m:0)-.08*gloom;rig.body.rotation.z+=Math.sin(t*2.2)*.035*m;if(rig.swim)rig.body.rotation.x+=Math.sin(t*3)*.055*m;}
 if(rig.kind==='slime'){const squash=Math.cos(phase)*weight;rig.body.scale.set(1+squash*.17+wind*.20+.10*gloom,1-squash*.22-wind*.29+strike*.34-.16*gloom+.08*joy,1+squash*.10+strike*.25+.10*gloom);rig.body.position.y+=Math.max(0,Math.sin(phase))*.28*weight;}
 if(stun>0)rig.body.rotation.z+=Math.sin(t*24)*.06*m;
 const glow=clamp(Math.abs(mood)*.6+Math.abs(react)*.5,0,1),tint=(react||mood)>=0?MOOD_UP:MOOD_DOWN;
 for(const material of rig.materials){if(hit>0){material.emissive.setRGB(.8,.24,.08);material.emissiveIntensity=hit*.55;}else{material.emissive.copy(material.userData.baseEmissive);material.emissiveIntensity=material.userData.baseGlow;if(glow>.02){if(material.userData.baseGlow>0)material.emissiveIntensity*=1+.9*happy+.8*Math.max(0,react)-.5*sad;else if(material.vertexColors){material.emissive.copy(tint);material.emissiveIntensity=Math.abs(mood)*.055+Math.abs(react)*.22;}}}}
 if(dying>0){rig.body.rotation.z+=dying*1.5*m;rig.body.position.y-=dying*.34;rig.body.rotation.x+=dying*.30*m;}
 if(!motion){rig.body.position.set(0,0,0);rig.body.rotation.set(0,0,0);rig.body.scale.set(1,1,1);}
}
export function disposeCreature(rig){rig.materials.forEach(m=>m.dispose());rig.owned.forEach(g=>g.dispose());rig.owned.clear();}
