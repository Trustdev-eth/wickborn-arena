import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {boardPoint} from './math.js';

// The artwork is a guide for actual geometry, never a plane over the battlefield.
// Static stones, leaves, roof tiles and pavers share instanced draw calls.
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const geometry=(kit,key,make)=>kit.geometries[key]??=(make());
function batchScenery(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),sets=new Map();
 root.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh||mesh.userData.dynamic||Array.isArray(mesh.material))return;
  const key=[mesh.geometry.uuid,mesh.material.uuid,mesh.castShadow,mesh.receiveShadow].join('/');
  if(!sets.has(key))sets.set(key,[]);sets.get(key).push(mesh);
 });
 let batches=0;
 for(const meshes of sets.values()){
  if(meshes.length<2)continue;const first=meshes[0],batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
  batch.name='scenery-batch-'+batches++;batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
  meshes.forEach((mesh,i)=>{batch.setMatrixAt(i,inverse.clone().multiply(mesh.matrixWorld));mesh.removeFromParent();});
  batch.computeBoundingBox();batch.computeBoundingSphere();root.add(batch);
 }
 return batches;
}
function helpers(kit,materials){
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.76,...extra});materials.push(m);return m;};
 const rounded=geometry(kit,'arena-rounded-stone',()=>new RoundedBoxGeometry(1,1,1,2,.11));
 const cylinder=geometry(kit,'arena-cylinder',()=>new THREE.CylinderGeometry(1,1,1,24));
 const crown=geometry(kit,'arena-canopy',()=>new THREE.IcosahedronGeometry(1,2));
 const pine=geometry(kit,'arena-pine',()=>new THREE.ConeGeometry(1,1,16));
 const p=(parent,g,m,pos,size,rot=[0,0,0],shadow=true)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(...pos);mesh.scale.set(...size);mesh.rotation.set(...rot);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 return {mat,p,box:(parent,m,pos,size,rot,shadow)=>p(parent,rounded,m,pos,size,rot,shadow),cylinder,crown,pine};
}
const disposeInstances=root=>root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});

export function buildEnvironment(scene,kit){
 const materials=[],owned=[],group=new THREE.Group();group.name='3d-arena-environment';scene.add(group);
 const {mat,p,box,cylinder,crown,pine}=helpers(kit,materials);
 const rock=[mat('#9daea6'),mat('#b2bdb1'),mat('#c7cbb7'),mat('#859c97')],grass=mat('#ffffff',{vertexColors:true}),edge=mat('#3f884c');
 const paving=[mat('#f1dfb3'),mat('#e4cf9f'),mat('#d8cba8')],wood=mat('#a3692b'),timber=mat('#e9b75d'),darkWood=mat('#775029');
 const leaves=['#25854b','#49a94d','#82bd48'].map(c=>mat(c)),trunk=mat('#93683b');
 box(group,rock[0],[0,-.94,0],[12.75,1.10,15.94]);
 for(const sign of [-1,1])box(group,edge,[0,-.20,sign*4.19],[12.57,.40,6.97]);
 // Broken limestone layers make the island read as a little landscape, not a slab.
 for(let n=0;n<112;n++){
  const side=n%4,k=n>>2,u=k/27,along=(u-.5)*(side<2?12.4:15.5),j=noise(n+1);
  const pos=side<2?[along,-.35-j*.79,(side?1:-1)*(7.78+noise(n+5)*.18)]:[(side===2?-1:1)*(6.19+noise(n+5)*.18),-.35-j*.79,along];
  if(side>=2&&Math.abs(along)<.85)continue;
  pos[1]=-.60-j*.37;
  p(group,kit.geometries.rock,rock[n%4],pos,side<2?[.51+noise(n+7)*.14,.39+j*.15,.35+j*.14]:[.35+j*.14,.39+j*.15,.54+noise(n+7)*.18],[noise(n)*.12,noise(n+2)*.3,noise(n+4)*.12]);
 }
 for(const sign of [-1,1]){
  const turf=new THREE.PlaneGeometry(12.22,6.94,36,24);turf.rotateX(-Math.PI/2);owned.push(turf);
  const colors=[],base=new THREE.Color('#62b85a');
  for(let i=0;i<turf.attributes.position.count;i++){
   const x=turf.attributes.position.getX(i),z=turf.attributes.position.getZ(i)+sign*4.18;
   const light=.89+Math.sin(x*.8+z*.5)*.065+noise(i)*.055;
   colors.push(base.r*light,base.g*light,base.b*light);
  }
  turf.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const lawn=p(group,turf,grass,[0,.014,sign*4.18],[1,1,1],[0,0,0],false);lawn.name=sign<0?'far-meadow':'near-meadow';
 }
 // Small bent blades, one instanced draw call, away from the playable lanes.
 const tuft=new THREE.BufferGeometry();tuft.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.01,.10,0,.025,0,0,0,0,-.03,0,.07,.01,0,0,.035],3));tuft.computeVertexNormals();owned.push(tuft);
 const tufts=new THREE.InstancedMesh(tuft,mat('#3e984c',{side:THREE.DoubleSide}),340);tufts.name='instanced-grass-patches';let count=0;const transform=new THREE.Object3D();
 for(let n=0;n<340;n++){const x=(noise(n*3)-.5)*11.6,z=(noise(n*3+1)-.5)*14.8;if(Math.abs(z)<.9||Math.abs(Math.abs(x)-3.3)<.57)continue;transform.position.set(x,.02,z);transform.rotation.y=noise(n*3+2)*6.28;transform.scale.setScalar(.6+noise(n)*.8);transform.updateMatrix();tufts.setMatrixAt(count++,transform.matrix);}tufts.count=count;tufts.receiveShadow=true;group.add(tufts);
 for(const sign of [-1,1])for(let n=0;n<28;n++){
  const x=-6.18+n*.458;if(Math.abs(Math.abs(x)-3.3)<.81)continue;
  box(group,paving[n%3],[x,-.022,sign*.79],[.47,.18,.27],[0,noise(n)*.08,0]);
  if(n%3===0)box(group,rock[2],[x,-.25,sign*.70],[.47,.32,.19],[0,0,0]);
 }
 for(const x of [-3.3,3.3]){
  for(let n=0;n<26;n++){const z=-6.6+n*.52;if(Math.abs(z)<.95)continue;for(const s of [-1,1])box(group,paving[(n+(s+1)/2)%3],[x+s*.21,.042,z],[.39,.075,.46],[0,(noise(n)-.5)*.04,0]);}
  const bridge=new THREE.Group();bridge.name=x<0?'bridge-left':'bridge-right';bridge.position.x=x;group.add(bridge);
  for(const s of [-1,1])box(bridge,darkWood,[s*.52,-.045,0],[.13,.15,1.86]);
  for(let n=0;n<11;n++)box(bridge,n%3?timber:wood,[0,.075,-.85+n*.17],[1.44,.09,.145]);
  for(const s of [-1,1]){
   for(const z of [-.88,0,.88]){box(bridge,wood,[s*.79,.27,z],[.115,.64,.115]);p(bridge,cylinder,timber,[s*.79,.62,z],[.10,.075,.10]);}
   box(bridge,timber,[s*.79,.51,0],[.095,.09,1.95]);box(bridge,wood,[s*.79,.27,0],[.065,.075,1.90]);
  }
 }
 const waterGeo=new THREE.PlaneGeometry(12.55,1.42,48,8);waterGeo.rotateX(-Math.PI/2);owned.push(waterGeo);
 const waterMaterial=mat('#239fd1',{roughness:.21,metalness:.19,emissive:'#1468a2',emissiveIntensity:.12});
 const water=p(group,waterGeo,waterMaterial,[0,-.105,0],[1,1,1],[0,0,0],false);water.name='flowing-river';water.userData.dynamic=true;
 for(const sign of [-1,1])box(group,waterMaterial,[sign*6.27,-.32,0],[.04,.44,1.40],[0,0,0],false);
 const waterBase=new Float32Array(waterGeo.attributes.position.array),ripples=[],foam=mat('#a5ebf7',{roughness:.35});
 for(let n=0;n<22;n++){const mesh=box(group,foam,[-6+n*.57,-.07,(noise(n+10)-.5)*1.1],[.11+noise(n)*.24,.012,.018],[0,0,0],false);mesh.userData.dynamic=true;ripples.push({mesh,x:mesh.position.x,phase:n});}
 // Clumped broadleaf trees and layered pines echo the approved arena illustration.
 for(let n=0;n<26;n++){
  const sign=n%2?1:-1,x=sign*(5.76+noise(n)*.16),z=-7.14+(n>>1)*1.19;if(Math.abs(z)<1.07)continue;
  const tree=new THREE.Group();tree.name='border-tree-'+n;tree.position.set(x,0,z);group.add(tree);const h=.80+noise(n+1)*.50;
  p(tree,cylinder,trunk,[0,h*.36,0],[.065,h*.76,.065]);
  if(n%3===0){for(let j=0;j<3;j++)p(tree,pine,leaves[j%3],[0,h*.63+j*.24,0],[.36-j*.07,.65-j*.11,.36-j*.07]);}
  else for(let j=0;j<4;j++)p(tree,crown,leaves[(n+j)%3],[Math.sin(j*2.4)*.18,h*.84+(j===3?.25:0),Math.cos(j*2.4)*.16],[.32,h*.32,.31],[0,j,0]);
 }
 const flower=[mat('#ffe375'),mat('#ee795c'),mat('#eee8c7')];
 for(let n=0;n<50;n++){const x=(n%2?1:-1)*(4.86+noise(n)*.6),z=(noise(n+22)-.5)*14.4;if(Math.abs(z)<1)continue;p(group,crown,flower[n%3],[x,.085,z],[.045,.065,.045],[0,0,0],false);}
 for(let n=0;n<18;n++){const x=(n%2?1:-1)*5.41,z=(noise(n+18)-.5)*14.3;if(Math.abs(z)<1)continue;box(group,rock[n%4],[x,.09,z],[.22,.18+noise(n)*.15,.23],[0,n*.6,0]);}
 // Real distant terrain supplies color around the island as the camera rotates.
 box(group,mat('#66b9c9',{roughness:.42}),[0,-2.7,0],[155,.1,155],[0,0,0],false);
 const terrain=new THREE.PlaneGeometry(150,150,46,46);terrain.rotateX(-Math.PI/2);owned.push(terrain);
 for(let i=0;i<terrain.attributes.position.count;i++){
  const x=terrain.attributes.position.getX(i),z=terrain.attributes.position.getZ(i),d=Math.hypot(x,z);
  terrain.attributes.position.setY(i,-3.7+Math.max(0,Math.min(1,(d-15)/11))*(3.1+Math.sin(x*.13)*1.35+Math.cos(z*.17)*1.2));
 }
 terrain.computeVertexNormals();p(group,terrain,mat('#73a975'),[0,0,0],[1,1,1],[0,0,0],false).name='distant-hills';
 const cloud=mat('#f8f6e7',{roughness:1});
 for(const [x,y,z]of [[-19,9,-27],[23,11,-31],[-31,8,16],[28,10,10]])for(let n=0;n<5;n++)p(group,kit.geometries.ball,cloud,[x+(n-2)*1.15,y+Math.sin(n)*.42,z],[1.5,1.02,1.13],[0,0,0],false);
 const batches=batchScenery(group);
 return {group,water,stats:{batches},update(time,motion=true){
  const attr=waterGeo.attributes.position;for(let i=0;i<attr.count;i++){const x=waterBase[i*3],z=waterBase[i*3+2];attr.setY(i,motion?Math.sin(x*2.5+time*1.8)*.016+Math.sin(z*8-time*2)*.008:0);}attr.needsUpdate=true;
  for(const d of ripples){d.mesh.position.x=motion?((d.x+time*.11+6.3)%12.6+12.6)%12.6-6.3:d.x;d.mesh.scale.x=.11+(motion?Math.sin(time+d.phase)*.035:.015);}
 },dispose(){disposeInstances(group);materials.forEach(m=>m.dispose());owned.forEach(g=>g.dispose());group.removeFromParent();}};
}

export function createTower(t,kit,side){
 const root=new THREE.Group(),body=new THREE.Group(),materials=[],flags=[];root.add(body);
 const {mat,p,box,cylinder}=helpers(kit,materials),cream=mat('#f1e4bf'),stone=mat('#c6c4ad'),dark=mat('#36546b'),roof=mat(t.p===side?'#246bd0':'#e4614b',{roughness:.52}),roofEdge=mat(t.p===side?'#184ca5':'#bc4739'),gold=mat('#e6b953',{roughness:.36,metalness:.26});
 const lathe=(key,rows,m)=>p(body,geometry(kit,key,()=>new THREE.LatheGeometry(rows.map(([r,y])=>new THREE.Vector2(r,y)),28)),m,[0,0,0],[1,1,1]);
 lathe('tower-foot',[[0,0],[.59,0],[.67,.07],[.67,.18],[.60,.25],[0,.25]],stone);
 lathe('tower-wall',[[0,.15],[.54,.15],[.54,1.16],[.60,1.20],[.60,1.31],[0,1.31]],cream);
 for(let n=0;n<3;n++)p(body,cylinder,stone,[0,.39+n*.27,0],[.545,.022,.545]);
 for(let n=0;n<8;n++){const a=n/8*Math.PI*2;box(body,cream,[Math.cos(a)*.57,1.32,Math.sin(a)*.57],[.19,.23,.17],[0,-a,0]);}
 lathe('tower-tiered-roof',[[0,1.20],[.65,1.20],[.65,1.27],[.47,1.43],[.53,1.43],[.53,1.48],[.33,1.65],[.38,1.65],[.38,1.70],[.02,1.99],[0,2.0]],roof);
 for(const [r,y]of [[.65,1.25],[.53,1.46],[.38,1.68]])p(body,cylinder,roofEdge,[0,y,0],[r,.028,r]);
 const archGeo=geometry(kit,'tower-arched-entry',()=>{
  const shape=new THREE.Shape();shape.moveTo(-.16,0);shape.lineTo(.16,0);shape.lineTo(.16,.31);shape.absarc(0,.31,.16,0,Math.PI,false);shape.lineTo(-.16,0);return new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false,curveSegments:10});
 });
 p(body,archGeo,dark,[0,.19,.542],[1,1,1]);
 for(const s of [-1,1])box(body,stone,[s*.197,.34,.555],[.065,.34,.075]);
 for(let n=0;n<7;n++){const a=n/6*Math.PI;box(body,stone,[Math.cos(a)*.195,.50+Math.sin(a)*.195,.558],[.085,.075,.08],[0,0,a-Math.PI/2]);}
 p(body,cylinder,gold,[0,2.0,0],[.047,.09,.047]);p(body,cylinder,dark,[0,2.20,0],[.013,.43,.013]);
 const flag=box(body,roof,[.18,2.30,0],[.35,.20,.024]);flag.userData.dynamic=true;flags.push(flag);
 const bannerGeo=geometry(kit,'tower-banner',()=>{const s=new THREE.Shape();s.moveTo(-.14,.18);s.lineTo(.14,.18);s.lineTo(.14,-.13);s.lineTo(0,-.22);s.lineTo(-.14,-.13);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:.018,bevelEnabled:false});});
 p(body,bannerGeo,roof,[0,1.02,.607],[1,1,1]);box(body,gold,[0,1.05,.639],[.024,.16,.017]);box(body,gold,[0,1.09,.644],[.11,.025,.017]);
 if(t.king){root.scale.setScalar(1.12);p(body,cylinder,gold,[0,1.94,0],[.15,.10,.15]);}
 batchScenery(body);root.position.copy(boardPoint(t.x,t.y,side));root.name='tower-'+t.id;
 return {root,body,flags,materials,hp:t.hp,hit:0,deadAt:null,dispose(){disposeInstances(body);materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
