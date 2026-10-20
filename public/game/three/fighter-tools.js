import * as THREE from 'three';
import {taperedCurve,batchJointSurfaces} from './sculpt.js';
import {organicGeometry,eyeSurfaceGeometry,bladeGeometry,armorGeometry,membraneGeometry} from './anatomy.js';
import {surfaceParameters} from './surfaces.js';

export function createSculptContext(id,kit){
 const root=new THREE.Group(),body=new THREE.Group(),materials=[],cache=new Map(),owned=new Set();
 const legs=[],arms=[],wings=[],tails=[],extras=[],eyesRig=[],secondary=[];
 root.name='creature-'+id;body.name='sculpted-body';root.add(body);
 const joint=(parent,x=0,y=0,z=0,name='')=>{const g=new THREE.Group();g.position.set(x,y,z);g.name=name;parent.add(g);return g;};
 function material(color,kind='skin'){
  const key=color+kind;if(cache.has(key))return cache.get(key);
  const glow=kind==='glow',eye=kind==='eye';
  const m=new THREE.MeshStandardMaterial({color,vertexColors:!eye,...surfaceParameters(id,kind,kit.surfaces.library),emissive:glow?color:'#000000',emissiveIntensity:glow?.32:0,side:THREE.FrontSide});m.name=kind;
  m.userData.baseGlow=m.emissiveIntensity;m.userData.baseEmissive=m.emissive.clone();materials.push(m);cache.set(key,m);return m;
 }
 function mesh(parent,g,color,kind='skin',pos=[0,0,0],rot=[0,0,0],name=''){
  owned.add(g);g.userData.owned=true;const m=new THREE.Mesh(g,material(color,kind));m.position.set(...pos);m.rotation.set(...rot);m.name=name;m.castShadow=kind!=='glow';m.receiveShadow=true;parent.add(m);return m;
 }
 const skin=(p,c,profile,pos=[0,0,0],rot=[0,0,0],kind='skin',name='')=>mesh(p,organicGeometry(profile),c,kind,pos,rot,name);
 const blade=(p,c,points,widths,depth=.035,kind='skin',normal=[0,0,1])=>mesh(p,bladeGeometry(points,widths,depth,13,normal),c,kind);
 const line=(p,c,points,r=.025,tip=.005,kind='skin')=>mesh(p,taperedCurve(points,r,tip,14,8),c,kind);
 const plate=(p,c,points,depth=.05,pos=[0,0,0],rot=[0,0,0],kind='metal',round=.025)=>mesh(p,armorGeometry(points,depth,round),c,kind,pos,rot);
 const membrane=(p,c,points,camber=.10,kind='skin')=>mesh(p,membraneGeometry(points,.025,camber),c,kind);
 const ball=(p,c,pos,size,kind='eye')=>kit.part(p,'ball',material(c,kind),pos,size);
 const ring=(p,c,pos,size,rot=[0,0,0],kind='metal')=>kit.part(p,'ring',material(c,kind),pos,size,rot);
 function form(p,c,pos,size,kind='skin',tilt=0){
  const [x,y,z]=size;
  return skin(p,c,[[0,x*.08,z*.10],[y*.15,x*.72,z*.68,-z*.06],[y*.40,x,z],[y*.70,x*.90,z*.92,z*.03],[y*.92,x*.54,z*.57],[y,x*.03,z*.04]],pos,[0,0,tilt],kind);
 }
 function skull(p,c,width=.30,height=.53,depth=.26){
  p.userData.skinColor=c;
  return skin(p,c,[[-height*.48,.04,.045,depth*.17],[-height*.31,width*.78,depth*.72,depth*.12],[-height*.05,width,depth*.97],[height*.20,width*.89,depth*.96,-depth*.025],[height*.41,width*.62,depth*.62,-depth*.06],[height*.50,.025,.025,-depth*.07]]);
 }
 function muzzle(p,c,width=.23,depth=.20,y=-.10,z=.20){
  return skin(p,c,[[-.12,.035,.035],[-.085,width*.78,depth*.70,depth*.14],[-.015,width,depth],[.075,width*.89,depth*.79],[.115,width*.48,depth*.40]], [0,y,z]);
 }
 function eyes(head,iris='#263b40',spacing=.15,y=.04,z=.25,size=.079,angry=false){
  size*=id===5?1:1.15;
  for(const s of [-1,1]){
   const eye=joint(head,s*spacing,y,z+.002,'expressive-eye');eye.rotation.y=s*.32;eye.rotation.z=s*(angry?-.15:-.04);
   const w=size*.92,h=size*(id===6?.88:id===11?.96:.71);
   mesh(eye,eyeSurfaceGeometry(w,h,.013),'#fff7e3','eye');
   ball(eye,iris,[-s*size*.045,0,.017],[size*(id===11?.76:.62),size*(id===11?.86:.72),.009]);
   ball(eye,'#14252b',[-s*size*.045,-.001,.025],[size*.30,size*.52,.004]);
   ball(eye,'#ffffff',[-size*.19,size*.24,.031],[size*.16,size*.18,.003]);
   const lid=head.userData.skinColor||'#38464b';
   line(eye,lid,[[-w,-.002,-.003],[0,h+.003,-.003],[w,-.002,-.003]],.012,.007);
   line(eye,lid,[[-w,-.002,-.003],[0,-h,-.003],[w,-.002,-.003]],.009,.005);
   eyesRig.push(eye);
  }
 }
 function ear(head,c,inside,s,height=.46,width=.14){
  const p=joint(head,s*.205,.15,-.04);p.rotation.z=-s*.18;
  blade(p,c,[[0,-.02,0],[s*.025,height*.40,-.025],[s*.06,height*.78,-.03],[s*.08,height,0]],[.06,width,width*.66,.002],.065);
  blade(p,inside,[[0,.05,.056],[s*.024,height*.43,.048],[s*.065,height*.86,.024]],[.025,width*.60,.001],.018);
  secondary.push({node:p,type:'ear',sign:s,baseX:0,baseY:0,baseZ:-s*.18});
 }
 function fur(p,c,origin,tip,width=.10){
  const mid=origin.map((v,i)=>(v+tip[i])*.5);mid[2]+=.025;
  return blade(p,c,[origin,mid,tip],[width*.65,width,.001],.035);
 }
 function tail(c,points,r=.10,name='tail'){
  const node=joint(body,...points[0],name),art=joint(node,...points[0].map(v=>-v));line(art,c,points,r,.009);tails.push({node,offset:0});return art;
 }
 function claw(p,x,y,z,color='#f2dfb8',size=.04){line(p,color,[[x,y,z],[x,y+.025,z+size*.8],[x,y-.012,z+size*1.8]],size*.55,.002,'metal');}
 function leg(x,z,height,c,width=.10,phase=0,foot=c,claws=true){
  const hip=joint(body,x,height,z,'hip'),upper=height*.54,lower=height*.55,knee=joint(hip,0,-upper,0,'knee'),ankle=joint(knee,0,-lower,0,'ankle');hip.rotation.order='ZXY';
  skin(hip,c,[[-upper-.025,width*.69,width*.73,.015],[-upper*.64,width*.87,width*.96,.005],[-upper*.22,width*1.20,width*1.25,-.022],[.035,width*1.22,width*1.18,-.01],[.10,width*.55,width*.60]]);
  skin(knee,c,[[-lower+.015,width*.69,width*.78,.04],[-lower*.65,width*.72,width*.83,.015],[-lower*.24,width*.85,width*.93,-.018],[.035,width*.72,width*.78],[.07,width*.30,width*.30]]);
  skin(ankle,foot,[[-.045,.02,.03,.09],[-.025,width*1.13,width*1.38,.095],[.025,width*1.28,width*1.65,.105],[.09,width*.87,width*1.07,.07],[.13,.025,.025,.01]]);
  if(claws)for(const n of [-1,0,1])claw(ankle,n*width*.68,.01,width*1.58+.065,'#e9d9ad',width*.38);
  legs.push({hip,knee,ankle,upper,lower,height,phase,front:z>=0,side:Math.sign(x),restX:x,restZ:z});
 }
 function quad(h,c,w=.10,spread=.23,length=.27,foot=c,claws=true){for(const s of [-1,1])for(const front of [-1,1])leg(s*spread,front*length,h,c,w,s===front?0:Math.PI,foot,claws);}
 function pair(h,c,w=.08,spread=.15,foot=c,claws=true){leg(-spread,0,h,c,w,0,foot,claws);leg(spread,0,h,c,w,Math.PI,foot,claws);}
 function arm(s,c,y=.84,length=.40,width=.085){
  const node=joint(body,s*.29,y,.02,'shoulder'),elbow=joint(node,0,-length*.5,0,'elbow');
  skin(node,c,[[-length*.56,width*.45,width*.45],[-length*.41,width*.78,width*.88],[-length*.16,width*1.15,width*1.13],[.04,width*1.05,width],[.075,width*.44,width*.48]]);
  skin(elbow,c,[[-length*.62,width*.39,width*.41,.04],[-length*.47,width*.66,width*.74,.04],[-length*.22,width*.95,width*.94,.015],[.035,width*.72,width*.72]]);
  const rig={node,elbow,sign:s,base:s*-.12};arms.push(rig);return rig;
 }
 function mouth(head,c,y=-.19,z=.30,width=.10){
  const j=joint(head,0,y,z,'jaw');line(j,c,[[-width,.015,0],[0,-.018,.013],[width,.015,0]],.014,.008);return j;
 }
 function shield(p,name,c,inner,pos,size=1,rot=[0,0,0]){
  const g=joint(p,...pos,name);g.rotation.set(...rot);g.scale.setScalar(size);
  const shape=Array.from({length:24},(_,n)=>{const a=n/24*Math.PI*2;return [Math.cos(a)*.30,Math.sin(a)*.30];});
  plate(g,c,shape,.06,[0,0,0],[0,0,0],'metal',.018);plate(g,inner,shape.map(([x,y])=>[x*.82,y*.82]),.055,[0,0,.075],[0,0,0],'metal',.014);return g;
 }
 return {
  id,kit,root,body,materials,owned,legs,arms,wings,tails,extras,eyesRig,secondary,
  joint,material,mesh,skin,blade,line,plate,membrane,ball,ring,form,skull,muzzle,eyes,ear,fur,tail,claw,leg,quad,pair,arm,mouth,shield,
  head:undefined,jaw:undefined,kind:'quad',float:0,modelScale:.84
 };
}

export function finishSculpt(t){
 const {id,kit,root,owned,wings}=t;
 if(t.head&&id!==10){const s=id===6?1.05:id===5?1:1.04;t.head.scale.set(s,s*.98,s);}
 for(const w of wings){w.node.rotation.z=w.sign*(w.restRoll||0);w.node.rotation.x=w.restPitch||0;}
 batchJointSurfaces(root,owned);
 root.traverse(o=>{
  if(!o.isMesh||o.userData.outline||o.material.userData.baseGlow||o.material.roughness<.3)return;
  o.geometry.computeBoundingBox();const v=o.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(o.scale);
  if(v.x*v.y*v.z>.065){const outline=new THREE.Mesh(o.geometry,kit.outlineMaterial);outline.name='silhouette';outline.userData.outline=true;outline.scale.setScalar(1.008);o.add(outline);}
 });
 root.scale.setScalar(t.modelScale);
 return {id,root,body:t.body,head:t.head,jaw:t.jaw,eyesRig:t.eyesRig,legs:t.legs,wings:t.wings,tails:t.tails,arms:t.arms,extras:t.extras,secondary:t.secondary,materials:t.materials,owned,kind:t.kind,float:t.float,modelScale:t.modelScale,swim:false,phase:0};
}
