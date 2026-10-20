// Offline geometry review, not a browser screenshot or a WebGL/PBR capture.
// Requires Python + Pillow only to encode and label the rendered pixel buffers.
import * as THREE from 'three';
import {writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createKit,createCreature,disposeCreature} from '../public/game/three/models.js';
import {buildEnvironment,createTower} from '../public/game/three/environment.js';
import {newGame} from '../public/game/engine.js';
import {CARDS} from '../public/game/stock-roster.js';
import {fitCamera} from '../public/game/three/math.js';

const dir=resolve(process.argv[2]||'docs');mkdirSync(dir,{recursive:true});
const temporary=mkdtempSync(join(tmpdir(),'wickborn-review-'));
const key=new THREE.Vector3(-.6,1,1).normalize(),fill=new THREE.Vector3(1,.5,-.8).normalize();
const srgb=v=>Math.round(Math.min(1,v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055)*255);
function render(root,camera,width,height,sky=false){
 const pixels=new Uint8Array(width*height*3),depth=new Float64Array(width*height).fill(Infinity);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixels.set(sky?[114+y/height*62,187+y/height*27,219-y/height*20]:[18,45,66],(y*width+x)*3);
 root.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const view=camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse);
 const planes=[v=>v.w+v.x,v=>v.w-v.x,v=>v.w+v.y,v=>v.w-v.y,v=>v.w+v.z,v=>v.w-v.z];
 function clip(poly){
  for(const plane of planes){const out=[];for(let n=0;n<poly.length;n++){
   const a=poly[n],b=poly[(n+1)%poly.length],da=plane(a),db=plane(b);if(da>=0)out.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db),v={};for(const k of ['x','y','z','w'])v[k]=a[k]+(b[k]-a[k])*t;v.c=a.c.map((c,k)=>c+(b.c[k]-c)*t);out.push(v);}
  }poly=out;if(!poly.length)break;}return poly;
 }
 function triangle(a,b,c){
  [a,b,c]=[a,b,c].map(v=>({x:(v.x/v.w+1)*width/2,y:(1-v.y/v.w)*height/2,z:v.z/v.w,w:1/v.w,c:v.c}));
  const minx=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxx=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x))),miny=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxy=Math.min(height-1,Math.ceil(Math.max(a.y,b.y,c.y))),d=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(d)<1e-10)return;
  for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
   const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/d,v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/d,t=1-u-v;if(u<0||v<0||t<0)continue;
   const z=u*a.z+v*b.z+t*c.z,index=y*width+x;if(z>=depth[index])continue;depth[index]=z;
   const divisor=u*a.w+v*b.w+t*c.w;for(let k=0;k<3;k++)pixels[index*3+k]=srgb(Math.max(0,(u*a.c[k]*a.w+v*b.c[k]*b.w+t*c.c[k]*c.w)/divisor));
  }
 }
 function draw(mesh,matrix,instanceColor){
  const g=mesh.geometry,pa=g.attributes.position,na=g.attributes.normal,ca=g.attributes.color,nm=new THREE.Matrix3().getNormalMatrix(matrix),vertices=[],material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material,outline=!!mesh.userData.outline;
  for(let n=0;n<pa.count;n++){
   const world=new THREE.Vector3().fromBufferAttribute(pa,n).applyMatrix4(matrix),normal=new THREE.Vector3().fromBufferAttribute(na,n).applyMatrix3(nm).normalize(),toward=camera.position.clone().sub(world).normalize(),half=key.clone().add(toward).normalize();
   const light=.35+.76*Math.max(0,normal.dot(key))+.18*Math.max(0,normal.dot(fill)),rough=material.roughness??1,shine=Math.pow(Math.max(0,normal.dot(half)),rough<.4?36:18)*(rough<.4?.24:.055),base=material.color.clone();if(instanceColor)base.multiply(instanceColor);
   const rgb=[base.r,base.g,base.b],tint=material.vertexColors&&ca?[ca.getX(n),ca.getY(n),ca.getZ(n)]:[1,1,1],em=material.emissiveIntensity||0,emit=material.emissive||new THREE.Color(0);
   const color=rgb.map((v,k)=>outline?[.012,.018,.025][k]:Math.min(1,v*tint[k]*light+shine+[emit.r,emit.g,emit.b][k]*em));
   const pos=new THREE.Vector4(world.x,world.y,world.z,1).applyMatrix4(view);vertices.push({world,x:pos.x,y:pos.y,z:pos.z,w:pos.w,c:color});
  }
  for(let i=0,count=g.index?.count??pa.count;i<count;i+=3){
   const [a,b,c]=[0,1,2].map(n=>vertices[g.index?g.index.getX(i+n):i+n]),face=b.world.clone().sub(a.world).cross(c.world.clone().sub(a.world)),front=face.dot(camera.position.clone().sub(a.world))*(matrix.determinant()<0?-1:1)>0;
   if(material.side!==THREE.DoubleSide&&front===(material.side===THREE.BackSide))continue;
   const poly=clip([a,b,c]);for(let n=1;n+1<poly.length;n++)triangle(poly[0],poly[n],poly[n+1]);
  }
 }
 root.traverseVisible(mesh=>{if(!mesh.isMesh)return;if(mesh.isInstancedMesh){const m=new THREE.Matrix4(),color=new THREE.Color();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);if(mesh.instanceColor)mesh.getColorAt(i,color);draw(mesh,mesh.matrixWorld.clone().multiply(m),mesh.instanceColor?color:null);}}else draw(mesh,mesh.matrixWorld);});
 return pixels;
}
function ppm(file,pixels,w,h){writeFileSync(file,Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`),pixels]));}

try{
 const kit=createKit(),tile=360,rows=3,height=384,atlas=new Uint8Array(tile*4*height*rows*3);const width=tile*4;
 for(let id=0;id<12;id++){
  const rig=createCreature(id,kit),bounds=new THREE.Box3().setFromObject(rig.root),center=bounds.getCenter(new THREE.Vector3()),s=bounds.getSize(new THREE.Vector3()),extent=Math.max(s.x,s.y,s.z)*.70;
  const camera=new THREE.OrthographicCamera(-extent,extent,extent*height/tile,-extent*height/tile,.1,30);camera.position.copy(center).add(new THREE.Vector3(2.4,1.2,4));camera.lookAt(center);
  const pixels=render(rig.root,camera,tile,height);for(let y=0;y<height;y++)atlas.set(pixels.subarray(y*tile*3,(y+1)*tile*3),((Math.floor(id/4)*height+y)*width+(id%4)*tile)*3);disposeCreature(rig);
 }
 const fightersFile=join(temporary,'fighters.ppm');ppm(fightersFile,atlas,width,height*rows);
 const scene=new THREE.Scene(),environment=buildEnvironment(scene,kit),towers=newGame().towers.map(t=>createTower(t,kit,0));for(const t of towers)scene.add(t.root);
 const units=[];for(const [id,x,z,heading]of [[0,-3.3,2.5,0],[5,3.3,2.8,0],[1,-3.3,-2.5,Math.PI],[8,3.3,-3,Math.PI]]){const rig=createCreature(id,kit);rig.root.scale.setScalar(rig.modelScale*1.28);rig.root.position.set(x,rig.float,z);rig.root.rotation.y=heading;scene.add(rig.root);units.push(rig);}
 const camera=new THREE.PerspectiveCamera();fitCamera(camera,1.25,-.16,true);const arenaFile=join(temporary,'arena.ppm');ppm(arenaFile,render(scene,camera,1400,1120,true),1400,1120);
 const metadata=join(temporary,'labels.json');writeFileSync(metadata,JSON.stringify(CARDS.map(c=>({name:c.name,symbol:c.symbol}))));
 execFileSync('python',['-c',String.raw`
from PIL import Image,ImageDraw,ImageFont
import json,sys
from pathlib import Path
source,arena,labels,out=sys.argv[1:]
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(n): return ImageFont.truetype(font,n)
cards=Image.open(source).convert('RGB'); sheet=Image.new('RGB',(1440,1272),'#122d42');sheet.paste(cards,(0,100));d=ImageDraw.Draw(sheet)
d.text((28,20),'WICKBORN / LIVE FIGHTER GEOMETRY',font=f(25),fill='#fff1ce')
d.text((28,58),'Offline geometry review · approximate lighting · approved portraits remain unchanged',font=f(15),fill='#bbd3dc')
for i,item in enumerate(json.loads(Path(labels).read_text())):
 x=(i%4)*360+22;y=100+(i//4)*384+337
 d.rounded_rectangle((x-5,y-3,x+315,y+38),radius=7,fill='#183e58')
 d.text((x+6,y+4),item['symbol']+' / '+item['name'],font=f(15),fill='#ffe09b')
sheet.save(Path(out)/'live-fighters-review.png')
im=Image.open(arena).convert('RGB');canvas=Image.new('RGB',(1400,1224),'#122d42');canvas.paste(im,(0,104));d=ImageDraw.Draw(canvas)
d.text((28,19),'WICKBORN / SCULPTED ARENA',font=f(25),fill='#fff1ce')
d.text((28,57),'Actual scene geometry · cinematic camera · offline lighting, not a browser screenshot',font=f(15),fill='#bbd3dc')
canvas.save(Path(out)/'live-arena-review.png')
`,fightersFile,arenaFile,metadata,dir]);
 units.forEach(disposeCreature);towers.forEach(t=>t.dispose());environment.dispose();kit.dispose();
 console.log('Wrote live-fighters-review.png and live-arena-review.png. Offline geometry review only.');
}finally{rmSync(temporary,{recursive:true,force:true});}
