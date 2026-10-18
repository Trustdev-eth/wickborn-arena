import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GAITS,footStep,legOffset} from '../public/game/three/locomotion.js';
import {combatPose,combatTiming} from '../public/game/three/motion.js';
import {eyeSurfaceGeometry} from '../public/game/three/anatomy.js';
import {createKit,createCreature,animateCreature,disposeCreature} from '../public/game/three/models.js';

test('supporting feet cancel forward travel and swing paths join with continuous velocity',()=>{
 for(const gait of GAITS){
  const a=gait.stride*.1,b=gait.stride*.2;
  assert.ok(Math.abs(a+footStep(a,0,gait).forward-b-footStep(b,0,gait).forward)<1e-10);
  for(const at of [gait.stride*gait.duty,gait.stride]){
   const eps=1e-6,l=footStep(at-eps,0,gait),r=footStep(at+eps,0,gait),p=footStep(at-2*eps,0,gait),n=footStep(at+2*eps,0,gait);
   assert.ok(Math.abs(l.forward-r.forward)<eps*3);assert.ok(Math.abs((l.forward-p.forward)/eps-(n.forward-r.forward)/eps)<.001);
   assert.ok(l.lift<1e-8&&r.lift<1e-8);
  }
 }
});
test('actual ankle joints remain on their support targets through torso sway and breathing',()=>{
 const kit=createKit(),point=new THREE.Vector3();
 for(const id of [0,1,2,3,5,6,8]){
  const rig=createCreature(id,kit),gait=GAITS[id];
  for(let n=0;n<40;n++){
   const distance=n/40*gait.stride;animateCreature(rig,{time:distance*2,distance,moving:1});rig.root.updateMatrixWorld(true);
   for(const leg of rig.legs){const step=footStep(distance,legOffset(leg,gait),gait);if(!step.stance)continue;
    leg.ankle.getWorldPosition(point).divideScalar(rig.modelScale);assert.ok(Math.abs(point.y)<.003,`Fighter ${id} supporting ankle left the ground.`);assert.ok(Math.abs(point.z-leg.restZ-step.forward)<.003);
   }
  }
  disposeCreature(rig);
 }
 kit.dispose();
});
test('solid fighters use articulated reactions instead of inflating or spinning around',()=>{
 const kit=createKit();
 for(let id=0;id<12;id++)if(id!==10){
  const rig=createCreature(id,kit);
  for(const options of [{time:.2,attack:.2,moving:1,distance:.3},{time:1,mood:1,react:.5},{time:2,mood:-1,react:-.8}]){
   animateCreature(rig,options);assert.deepEqual(rig.body.scale.toArray(),[1,1,1]);assert.ok(Math.abs(rig.body.rotation.y)<.5);
  }
  disposeCreature(rig);
 }
 const slime=createCreature(10,kit);animateCreature(slime,{time:.07,attack:.07});assert.ok(Math.abs(slime.body.scale.x*slime.body.scale.y*slime.body.scale.z-1)<1e-10);disposeCreature(slime);kit.dispose();
});
test('inset eyes expose a shallow outward-facing surface',()=>{
 const g=eyeSurfaceGeometry(.08,.06,.006);g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());assert.ok(size.z<size.x*.05);assert.ok([...g.attributes.normal.array].every(Number.isFinite));
 const normal=g.attributes.normal;for(let i=0;i<normal.count;i++)assert.ok(normal.getZ(i)>.5);g.dispose();
});
test('surface maps are shared across fighters and released with the kit',()=>{
 const kit=createKit(),a=createCreature(1,kit),b=createCreature(1,kit),surface=a.materials.find(m=>m.bumpMap),other=b.materials.find(m=>m.bumpMap);assert.equal(surface.bumpMap,other.bumpMap);assert.equal(surface.roughnessMap,other.roughnessMap);assert.notEqual(surface,other);
 let disposed=0;surface.bumpMap.addEventListener('dispose',()=>disposed++);disposeCreature(a);disposeCreature(b);assert.equal(disposed,0);kit.dispose();assert.equal(disposed,1);
});
test('heavy recovery preserves the existing shared impact times',()=>{
 assert.deepEqual(combatTiming({kind:'hit',card:5}),{delay:.085,impact:.20,life:.43,hold:.080});assert.equal(combatTiming({kind:'bolt'}).impact,.38);
 assert.ok(combatPose(5,.20).strike>.99);assert.ok(combatPose(7,.15).strike>.99);assert.ok(combatPose(5,.70).settle>0);assert.equal(combatPose(1,.70).phase,'idle');
});
test('secondary motion resets deterministically and each clone has independent joints',()=>{
 const kit=createKit(),a=createCreature(3,kit),b=createCreature(3,kit);assert.notEqual(a.secondary[0].node,b.secondary[0].node);
 animateCreature(a,{time:.2,attack:.2,turn:2,moving:1,distance:.6});animateCreature(a,{time:2,attack:-1});animateCreature(b,{time:2,attack:-1});a.root.updateMatrixWorld(true);b.root.updateMatrixWorld(true);
 const first=[],second=[];a.root.traverse(o=>first.push([...o.matrixWorld.elements]));b.root.traverse(o=>second.push([...o.matrixWorld.elements]));assert.deepEqual(first,second);
 disposeCreature(a);disposeCreature(b);kit.dispose();
});
