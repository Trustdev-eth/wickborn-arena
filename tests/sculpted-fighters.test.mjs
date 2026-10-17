import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {organicGeometry,skinPatchGeometry,bladeGeometry,membraneGeometry} from '../public/game/three/anatomy.js';
import {taperedCurve} from '../public/game/three/sculpt.js';
import {createKit,createCreature,animateCreature,disposeCreature} from '../public/game/three/models.js';

function signedVolume(g){
 const p=g.attributes.position;let volume=0;
 for(let i=0;i<(g.index?.count??p.count);i+=3){const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,g.index?g.index.getX(i+j):i+j));volume+=a.dot(b.cross(c))/6;}
 return volume;
}
test('closed sculpted skins, blades and wing membranes have outward-facing winding',()=>{
 const shapes=[organicGeometry([[0,.01,.01],[.4,.3,.24],[1,.01,.01]]),bladeGeometry([[0,0,0],[0,.5,.1],[.1,1,0]],[.01,.2,.001]),membraneGeometry([[0,0],[1,0],[1,1],[0,1]]),taperedCurve([[0,0,0],[0,.5,0],[.1,1,0]],.10,.01)];
 for(const g of shapes){assert.ok(signedVolume(g)>.001,'FrontSide materials must show the outside of a solid.');for(const key of ['position','normal','color'])assert.ok([...g.attributes[key].array].every(Number.isFinite));g.dispose();}
});
test('color regions follow their anatomical surface without intersecting the chest',()=>{
 const sections=[[0,.1,.1],[.5,.3,.25],[1,.1,.1]],g=skinPatchGeometry(sections,.5,.6,.8),p=g.attributes.position;
 // The first row is at the section center: z must lie beyond the torso front.
 assert.ok(p.getZ(7)>.25);assert.ok([...p.array].every(Number.isFinite));g.dispose();
});
test('feathers can follow the broad wing plane rather than standing edge-on',()=>{
 const g=bladeGeometry([[0,0,0],[.2,0,.4],[.3,0,.8]],[.01,.15,.001],.02,13,[0,1,0]);g.computeBoundingBox();const b=g.boundingBox.getSize(new THREE.Vector3());assert.ok(b.y<.05);assert.ok(b.x>.25&&b.z>.75);g.dispose();
});
test('flying fighters articulate their distal geometry and retain their sculpted rest silhouette',()=>{
 const kit=createKit();
 for(const id of [4,7,9,11]){
  const rig=createCreature(id,kit);rig.root.updateMatrixWorld(true);const rest=new THREE.Box3().setFromObject(rig.root);
  for(const wing of rig.wings){let meshes=0;wing.tip.traverse(o=>{if(o.isMesh&&!o.userData.outline)meshes++;});assert.ok(meshes>0,`Fighter ${id} needs a real animated wingtip.`);}
  animateCreature(rig,{motion:false});rig.root.updateMatrixWorld(true);const still=new THREE.Box3().setFromObject(rig.root);assert.ok(rest.min.distanceTo(still.min)<1e-6&&rest.max.distanceTo(still.max)<1e-6,'HUD measurements use the same rest pose as the reduced-motion model.');
  const tip=rig.wings[0].tip;animateCreature(rig,{time:.1});const a=tip.rotation.z;animateCreature(rig,{time:.3});assert.notEqual(a,tip.rotation.z);disposeCreature(rig);
 }
 kit.dispose();
});
test('new sculpted surfaces remain finite through full combat, market reactions and death poses',()=>{
 const kit=createKit();
 for(let id=0;id<12;id++){
  const rig=createCreature(id,kit);for(const m of rig.materials)assert.equal(m.side,THREE.FrontSide);
  for(const options of [{time:.2,attack:.2,combo:2,moving:1,distance:.4},{time:.6,react:.5,mood:1},{time:1,react:-.8,mood:-1},{time:1,dying:1}]){
   animateCreature(rig,options);rig.root.updateMatrixWorld(true);rig.root.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)assert.ok([...o.geometry.attributes.normal.array].every(Number.isFinite));});
  }
  disposeCreature(rig);
 }
 kit.dispose();
});
