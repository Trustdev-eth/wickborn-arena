import * as THREE from 'three';
import {boardPoint} from './math.js';

// Shared primitive geometry and a bounded object pool keep telegraphs affordable.
export function createTacticalLayer(scene){
 const group=new THREE.Group();group.name='tactical-combat';scene.add(group);
 const geometries={ring:new THREE.RingGeometry(.88,1,48),disc:new THREE.CircleGeometry(1,48),line:new THREE.CylinderGeometry(1,1,1,6),diamond:new THREE.OctahedronGeometry(.23),shield:new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI/2)},pool=new Map();
 const up=new THREE.Vector3(0,1,0),temporary=new THREE.Vector3();let frame=0;
 function object(key,geometry,color,opacity=.75){let e=pool.get(key);if(!e){if(pool.size>=150)return null;const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometries[geometry],material);group.add(mesh);e={mesh,geometry};pool.set(key,e);}e.used=frame;e.mesh.visible=true;e.mesh.material.color.set(color);e.mesh.material.opacity=opacity;return e.mesh;}
 function circle(key,x,y,r,color,side,opacity=.7,filled=false){const m=object(key,filled?'disc':'ring',color,opacity);if(!m)return;m.position.copy(boardPoint(x,y,side,.16));m.rotation.set(-Math.PI/2,0,0);m.scale.setScalar(r/50);return m;}
 function line(key,a,b,color,side,width=.035,opacity=.8,lift=.2){const m=object(key,'line',color,opacity);if(!m)return;const from=boardPoint(a.x,a.y,side,lift),to=boardPoint(b.x,b.y,side,lift),delta=temporary.copy(to).sub(from);m.position.copy(from).addScaledVector(delta,.5);m.quaternion.setFromUnitVectors(up,delta.clone().normalize());m.scale.set(width,Math.max(.001,delta.length()),width);}
 function draw(g,{side=0,pointer=null,aim=null,motion=true}={},time=0){
  frame++;if(g.ruleset!=='wickborn-tactics'){group.visible=false;return;}group.visible=true;
  const r=g.relay,color=r.owner===side?'#78d7ff':r.owner===null?'#efcf84':'#ff737c';circle('relay-outline',r.x,r.y,r.radius,color,side,r.active?.72:.16);circle('relay-center',r.x,r.y,21,color,side,.5);
  const beacon=object('relay-beacon','diamond',color,r.active?1:.35);if(beacon){beacon.position.copy(boardPoint(r.x,r.y,side,r.active?1.15:.3));beacon.scale.set(.8,r.active?1.8:.8,.8);beacon.rotation.set(0,motion?time*.8:0,0);}
  for(const u of g.units){
   if(u.captain){circle('captain-'+u.id,u.x,u.y,30,u.p===side?'#ffe4a0':'#ff7d86',side,.9);if(u.p===side&&u.order){circle('order',u.order.x,u.order.y,13,'#ffe4a0',side,.8);line('order-line',u,u.order,'#ffe4a0',side,.017,.4);}}
   if(u.shield>0){const m=object('shield-'+u.id,'shield','#88d8ff',.16);if(m){m.position.copy(boardPoint(u.x,u.y,side,.15));m.scale.setScalar(u.boss?1.8:.8);}}
   if(u.guardUntil>g.time){const point={x:u.x+u.facingX*40,y:u.y+u.facingY*40},across={x:-u.facingY*47,y:u.facingX*47};line('guard-'+u.id,{x:point.x+across.x,y:point.y+across.y},{x:point.x-across.x,y:point.y-across.y},'#9ae8ff',side,.1,.75,.8);}
   if(u.casting){const c=u.casting,foe=u.p!==side,ink=foe?'#ff5e73':c.ultimate?'#ffe3a1':'#7dd8ff',at={x:c.x,y:c.y},progress=1-c.left/c.total;
    if(c.kind==='beam'||c.kind==='charge'||c.kind==='dash'){line('cast-line-'+u.id,u,at,ink,side,c.kind==='beam'?.23:.1,.25+progress*.35);circle('cast-end-'+u.id,c.x,c.y,c.kind==='beam'?29:43,ink,side,.8);}
    else{const centered=c.kind==='sweep'||c.kind==='heal'||c.kind==='shield',radius=c.kind==='boss'?g.boss?.phase===3?115:88:c.ultimate?110:c.kind==='sweep'?95:c.kind==='heal'?145:75,x=centered?u.x:c.x,y=centered?u.y:c.y;circle('cast-area-'+u.id,x,y,radius,ink,side,.85);circle('cast-fill-'+u.id,x,y,radius*progress,ink,side,.09+progress*.12,true);}
    circle('cast-charge-'+u.id,u.x,u.y,25+progress*13,ink,side,.8);
   }
  }
  for(let i=0;i<g.hazards.length;i++){const h=g.hazards[i];circle('hazard-'+i,h.x,h.y,h.radius,h.p===side?'#81d4e5':'#ff7084',side,.45);circle('hazard-fill-'+i,h.x,h.y,h.radius,h.p===side?'#81d4e5':'#ff7084',side,.08,true);}
  for(const l of g.links){const a=g.units.find(u=>u.id===l.from),b=g.units.find(u=>u.id===l.to);if(a&&b)line('link-'+l.from+'-'+l.to,a,b,'#86edba',side,.035,.85,.8);}
  for(const e of g.effects){const age=g.time-e.at,opacity=Math.max(0,1-age/(e.kind==='ultimate'?1.1:.65));if(e.kind==='beam'||e.kind==='dash')line('effect-'+e.id,{x:e.x,y:e.y},{x:e.tx,y:e.ty},e.color||'#ffe0a0',side,e.kind==='beam'?.15:.08,opacity,.7);if(['ultimate','capture','barrier','skill'].includes(e.kind))circle('effect-ring-'+e.id,e.x,e.y,(e.radius||65)*(.5+age),e.color||'#ffe0a0',side,opacity*.65);}
  if(pointer&&aim){const u=g.units.find(u=>u.id===g.captains[side]);if(u){const vis=p=>side===1?{x:p.x,y:760-p.y}:p;circle('aim',pointer.x,pointer.y,aim==='move'?14:aim==='ultimate'?100:60,'#ffe6a5',0,.85);if(aim!=='move')line('aim-line',vis(u),pointer,'#ffe6a5',0,.025,.6);}}
  for(const [key,e]of pool)if(e.used!==frame){e.mesh.visible=false;if(frame-e.used>180){group.remove(e.mesh);e.mesh.material.dispose();pool.delete(key);}}
 }
 return {draw,get count(){return pool.size;},dispose(){for(const e of pool.values())e.mesh.material.dispose();for(const g of Object.values(geometries))g.dispose();pool.clear();scene.remove(group);}};
}
