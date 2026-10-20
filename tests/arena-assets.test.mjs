import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createKit,createCreature,disposeCreature} from '../public/game/three/models.js';
import {buildEnvironment,createTower} from '../public/game/three/environment.js';
import {newGame} from '../public/game/engine.js';

test('the river is exposed and both bridge decks meet the existing walking height',()=>{
 const kit=createKit(),scene=new THREE.Scene(),env=buildEnvironment(scene,kit);scene.updateMatrixWorld(true);
 const at=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,4,z),new THREE.Vector3(0,-1,0)).intersectObject(env.group,true)[0];
 assert.equal(at(0,0).object,env.water,'Land geometry must not cover the river.');
 for(const x of [-3.3,3.3])assert.ok(Math.abs(at(x,0).point.y-.12)<.001,'Bridge meets the unchanged surfaceHeight contract.');
 assert.ok(Math.abs(at(0,3).point.y-.014)<.001);
 env.dispose();kit.dispose();
});
test('scenery remains instanced and releases owned buffers without disposing the shared kit',()=>{
 const kit=createKit(),env=buildEnvironment(new THREE.Scene(),kit);let draws=0,instances=0,sharedDisposed=0,waterDisposed=0;
 env.group.traverse(o=>{if(o.isMesh)draws++;if(o.isInstancedMesh)instances+=o.count;});assert.ok(draws<80,draws+' scenery draws');assert.ok(instances>600);assert.ok(env.stats.batches>20);
 kit.geometries['arena-rounded-stone'].addEventListener('dispose',()=>sharedDisposed++);env.water.geometry.addEventListener('dispose',()=>waterDisposed++);
 env.update(1);env.update(2,false);assert.ok([...env.water.geometry.attributes.position.array].every(Number.isFinite));
 env.dispose();assert.equal(sharedDisposed,0);assert.equal(waterDisposed,1);kit.dispose();assert.equal(sharedDisposed,1);
});
test('editor GLBs retain live model bounds and complete animation channels',async()=>{
 const kit=createKit(),manifest=JSON.parse(readFileSync(new URL('../art/models/manifest.json',import.meta.url)));assert.equal(manifest.files.length,13);
 for(let id=0;id<12;id++){
  const entry=manifest.files[id],bytes=readFileSync(new URL('../art/models/'+entry.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  assert.deepEqual(gltf.animations.map(c=>c.name),['idle','walk','attack']);assert.ok(gltf.animations.every(c=>c.tracks.length>0));
  for(const clip of gltf.animations)for(const track of clip.tracks)assert.ok([...track.values].every(Number.isFinite));
  const rig=createCreature(id,kit),live=new THREE.Box3().setFromObject(rig.root),exported=new THREE.Box3().setFromObject(gltf.scene);
  assert.ok(live.min.distanceTo(exported.min)<.018&&live.max.distanceTo(exported.max)<.018,entry.file+' retains geometry and transforms');
  gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});disposeCreature(rig);
 }
 const bytes=readFileSync(new URL('../art/models/arena.glb',import.meta.url)),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene(),env=buildEnvironment(scene,kit),towers=newGame().towers.map(t=>createTower(t,kit,0));towers.forEach(t=>scene.add(t.root));
 const live=new THREE.Box3().setFromObject(scene),exported=new THREE.Box3().setFromObject(gltf.scene);assert.ok(live.min.distanceTo(exported.min)<.001&&live.max.distanceTo(exported.max)<.001,'Instanced scenery transforms survive the portable export.');
 scene.updateMatrixWorld(true);gltf.scene.updateMatrixWorld(true);
 env.group.traverse(batch=>{if(!batch.isInstancedMesh)return;const portable=gltf.scene.getObjectByName(batch.name);assert.equal(portable?.children.length,batch.count,batch.name+' keeps every instance');
  for(let i=0;i<batch.count;i++){const expected=new THREE.Matrix4();batch.getMatrixAt(i,expected);expected.premultiply(batch.matrixWorld);const actual=portable.children[i].matrixWorld;assert.ok(expected.elements.every((n,j)=>Math.abs(n-actual.elements[j])<1e-5),batch.name+' instance '+i+' retains its full transform');}
 });
 gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});towers.forEach(t=>t.dispose());env.dispose();kit.dispose();
});
