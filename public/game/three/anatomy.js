import * as THREE from 'three';
import {paintGeometry} from './sculpt.js';

const catmull=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
function sample(rows,t){
 const f=THREE.MathUtils.clamp(t,0,1)*(rows.length-1),i=Math.min(rows.length-2,Math.floor(f)),u=f-i;
 return rows[i].map((_,k)=>catmull(rows[Math.max(0,i-1)][k],rows[i][k],rows[i+1][k],rows[Math.min(rows.length-1,i+2)][k],u));
}
function geometry(positions,indices,uvs){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
 // Duplicate seam vertices must share normals; otherwise smooth skins show a ridge.
 g.userData.sculpted=true;return paintGeometry(g);
}

// Continuous anatomical sections: [height, half-width, half-depth, forward, sideways].
// The changing section centers create haunches, a tapered waist and a swept neck
// in one closed surface rather than intersecting spheres.
export function organicGeometry(sections,{sides=18,rings=16,lobes=0}={}){
 const rows=sections.map(([y,x,z,cz=0,cx=0])=>[y,x,z,cz,cx]),p=[],uv=[],ix=[];
 for(let i=0;i<=rings;i++){
  const t=i/rings,[y,rx,rz,cz,cx]=sample(rows,t);
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,r=1+lobes*Math.sin(a*3+.4)*Math.sin(t*Math.PI)**2;
   p.push(cx+Math.max(.001,rx)*Math.cos(a)*r,y,cz+Math.max(.001,rz)*Math.sin(a)*r);uv.push(j/sides,t);
   if(i<rings&&j<sides){const b=i*(sides+1)+j,n=b+sides+1;ix.push(b,n,b+1,n,n+1,b+1);}
  }
 }
 for(const [row,flip]of [[0,false],[rings,true]]){
  const center=p.length/3,[y,,,z,x]=sample(rows,row/rings);p.push(x,y,z);uv.push(.5,.5);
  for(let j=0;j<sides;j++){const a=row*(sides+1)+j;ix.push(center,flip?a+1:a,flip?a:a+1);}
 }
 const g=geometry(p,ix,uv),normal=g.attributes.normal;
 for(let i=0;i<=rings;i++){const a=i*(sides+1),b=a+sides,n=new THREE.Vector3().fromBufferAttribute(normal,a).add(new THREE.Vector3().fromBufferAttribute(normal,b)).normalize();normal.setXYZ(a,n.x,n.y,n.z);normal.setXYZ(b,n.x,n.y,n.z);}
 return g;
}

// A flush colored skin region following the same sections as its parent body.
// This prevents floating belly ellipsoids and intersecting white chest patches.
export function skinPatchGeometry(sections,start=.15,end=.88,width=1.05){
 const rows=sections.map(([y,x,z,cz=0,cx=0])=>[y,x,z,cz,cx]),p=[],uv=[],ix=[],rings=16,sides=14;
 for(let i=0;i<=rings;i++){
  const v=i/rings,t=THREE.MathUtils.lerp(start,end,v),[y,rx,rz,cz,cx]=sample(rows,t),span=width*Math.max(.025,Math.sin(Math.PI*v)**.35);
  for(let j=0;j<=sides;j++){
   const a=(j/sides*2-1)*span;p.push(cx+(rx+.013)*Math.sin(a),y,cz+(rz+.013)*Math.cos(a));uv.push(j/sides,v);
   if(i<rings&&j<sides){const b=i*(sides+1)+j,n=b+sides+1;ix.push(b,b+1,n,n,b+1,n+1);}
  }
 }
 return geometry(p,ix,uv);
}

// A sculpted feather, fur lock, leaf, flame or pinna with an elliptical section,
// a real center ridge and tapered root/tip. Paths can bend in all three axes.
export function bladeGeometry(points,widths,depth=.035,segments=13,faceNormal=[0,0,1]){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=curve.computeFrenetFrames(segments,false),p=[],uv=[],ix=[],sides=8;
 for(let i=0;i<=segments;i++){
  const t=i/segments,c=curve.getPoint(t),w=Math.max(.001,sample(widths.map(w=>[w]),t)[0]),thick=Math.max(.001,depth*Math.sin(Math.PI*(.05+.9*t)));
  // Keep the broad face aligned with XY for ears/locks; wing callers rotate it.
  const tangent=curve.getTangent(t).normalize(),across=new THREE.Vector3().crossVectors(new THREE.Vector3(...faceNormal),tangent);
  if(across.lengthSq()<.001)across.copy(frames.normals[i]);across.normalize();const normal=new THREE.Vector3().crossVectors(tangent,across).normalize();
  for(let j=0;j<=sides;j++){
   const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(across,Math.cos(a)*w).addScaledVector(normal,Math.sin(a)*thick);
   p.push(v.x,v.y,v.z);uv.push(j/sides,t);
   if(i<segments&&j<sides){const b=i*(sides+1)+j,n=b+sides+1;ix.push(b,b+1,n,n,b+1,n+1);}
  }
 }
 // Close both ends; no open tubes when viewed from below.
 for(const [row,flip]of [[0,false],[segments,true]]){const center=p.length/3,c=curve.getPoint(row/segments);p.push(c.x,c.y,c.z);uv.push(.5,.5);for(let j=0;j<sides;j++){const a=row*(sides+1)+j;ix.push(center,flip?a:a+1,flip?a+1:a);}}
 return geometry(p,ix,uv);
}

// A rounded, bevelled contour: armor follows designed plates instead of boxes.
export function armorGeometry(points,depth=.07,round=.06){
 const shape=new THREE.Shape(),n=points.length;
 const corners=points.map((p,i)=>{const a=points[(i+n-1)%n],b=points[(i+1)%n],da=Math.hypot(a[0]-p[0],a[1]-p[1]),db=Math.hypot(b[0]-p[0],b[1]-p[1]),r=Math.min(round,da*.24,db*.24);return {p,incoming:[p[0]+(a[0]-p[0])*r/da,p[1]+(a[1]-p[1])*r/da],outgoing:[p[0]+(b[0]-p[0])*r/db,p[1]+(b[1]-p[1])*r/db]};});
 // Round just the corner, retaining long designed edges and pointed silhouettes.
 // Rounding from every edge midpoint would turn armor plates back into discs.
 shape.moveTo(...corners[0].incoming);
 for(const c of corners){shape.lineTo(...c.incoming);shape.quadraticCurveTo(...c.p,...c.outgoing);}shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:round,bevelThickness:round,curveSegments:3});g.userData.sculpted=true;return paintGeometry(g);
}

// Curved solid wing membrane with a raised leading edge and cambered surface.
// Map XY contour to XZ so the broad face is visible from the arena camera.
export function membraneGeometry(points,depth=.025,camber=.14){
 const g=armorGeometry(points,depth,.012),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i),h=p.getZ(i);p.setXYZ(i,x,h+Math.sin(x*Math.PI)*camber+Math.sin(z*3)*.025,z);}
 // Swapping the depth and contour axes reverses handedness. Reverse the face
 // winding as well, so single-sided membranes face outward under WebGL culling.
 const ix=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i);
 for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];
 g.setIndex(ix);p.needsUpdate=true;g.computeVertexNormals();return paintGeometry(g);
}
