// Editor handoff assets. The game keeps using its shared procedural rigs.
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createKit,createCreature,animateCreature,disposeCreature} from '../public/game/three/models.js';
import {GAITS} from '../public/game/three/locomotion.js';
import {buildEnvironment,createTower} from '../public/game/three/environment.js';
import {newGame} from '../public/game/engine.js';
import {CARDS} from '../public/game/stock-roster.js';

// The exporter uses FileReader for Blob conversion; no canvas/DOM is required
// because shader data maps are omitted from these portable editor materials.
globalThis.FileReader??=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
 readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.();}).catch(error=>this.onerror?.(error));}
};
const folder=new URL('../art/models/',import.meta.url);await mkdir(folder,{recursive:true});const kit=createKit(),manifest={format:'glTF 2.0 binary',materials:'Base colors and vertex shading; runtime grain maps and silhouette pass omitted.',files:[]};
function sample(rig,name,duration,pose){
 const nodes=[];rig.root.traverse(o=>{if(!o.userData.outline)nodes.push(o);});
 const samples=nodes.map(()=>({position:[],quaternion:[],scale:[]})),times=[];
 for(let frame=0;frame<=Math.round(duration*20);frame++){
  const t=frame/20;times.push(t);animateCreature(rig,pose(t));nodes.forEach((node,i)=>{for(const key of ['position','quaternion','scale'])node[key].toArray(samples[i][key],samples[i][key].length);});
 }
 const tracks=[];nodes.forEach((node,i)=>{for(const [key,width,Track]of [['position',3,THREE.VectorKeyframeTrack],['quaternion',4,THREE.QuaternionKeyframeTrack],['scale',3,THREE.VectorKeyframeTrack]]){
  const values=samples[i][key];if(values.some((v,n)=>Math.abs(v-values[n%width])>1e-5))tracks.push(new Track(node.uuid+'.'+key,times,values));
 }});animateCreature(rig,{motion:false});return new THREE.AnimationClip(name,duration,tracks);
}
async function save(root,file,animations=[]){
 const replacements=new Map(),outlines=[];
 root.traverse(o=>{
  if(!o.isMesh)return;if(o.userData.outline){o.visible=false;outlines.push(o);return;}
  const original=o.material;if(!replacements.has(original))replacements.set(original,new THREE.MeshStandardMaterial({name:original.name,color:original.color,roughness:original.roughness??.8,metalness:original.metalness??0,vertexColors:original.vertexColors,emissive:original.emissive||0,emissiveIntensity:original.emissiveIntensity||0,side:original.side,transparent:original.transparent,opacity:original.opacity}));o.material=replacements.get(original);
 });
 // Bake instancing into ordinary mesh nodes for editor compatibility. Geometry
 // stays shared inside the GLB instead of duplicating every tree/stone buffer.
 const instances=[];root.traverse(o=>{if(o.isInstancedMesh)instances.push(o);});for(const original of instances){const group=new THREE.Group();group.name=original.name;original.matrix.decompose(group.position,group.quaternion,group.scale);for(let i=0;i<original.count;i++){const mesh=new THREE.Mesh(original.geometry,original.material);original.getMatrixAt(i,mesh.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);group.add(mesh);}original.parent.add(group);original.removeFromParent();}
 root.updateMatrixWorld(true);const buffer=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true,animations,trs:true,onlyVisible:true}));await writeFile(new URL(file,folder),buffer);
 const length=buffer.readUInt32LE(12),json=JSON.parse(buffer.toString('utf8',20,20+length));manifest.files.push({file,bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex'),meshes:json.meshes?.length||0,animations:json.animations?.map(a=>a.name)||[]});
 root.traverse(o=>{if(o.isMesh)for(const [original,replacement]of replacements)if(o.material===replacement)o.material=original;});replacements.forEach(m=>m.dispose());outlines.forEach(o=>o.visible=true);
}
for(let id=0;id<12;id++){
 const rig=createCreature(id,kit),animations=[sample(rig,'idle',2,t=>({time:t})),sample(rig,'walk',1,t=>({time:t,distance:t*GAITS[id].stride,moving:1})),sample(rig,'attack',.85,t=>({time:t,attack:t,engaged:true}))];
 await save(rig.root,CARDS[id].symbol.toLowerCase()+'.glb',animations);disposeCreature(rig);
}
const scene=new THREE.Scene(),environment=buildEnvironment(scene,kit),towers=newGame().towers.map(t=>createTower(t,kit,0));towers.forEach(t=>scene.add(t.root));await save(scene,'arena.glb');towers.forEach(t=>t.dispose());environment.dispose();kit.dispose();
await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');console.log('Exported twelve animated fighter GLBs and the arena editor scene.');
