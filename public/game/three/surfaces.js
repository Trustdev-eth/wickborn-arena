import * as THREE from 'three';

// Small, shared data textures add material grain without image requests or
// per-fighter texture copies. Seeds are stable across clients and reloads.
export function createSurfaceLibrary(){
 const size=128,library={},textures=[];
 const noise=(x,y,seed)=>{let n=Math.imul(x+seed*97,374761393)^Math.imul(y+seed*31,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const texture=(data,repeats)=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.repeat.set(...repeats);t.needsUpdate=true;textures.push(t);return t;};
 for(const [index,name]of ['fur','hide','cloth','metal'].entries()){
  const bump=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const grain=noise(x,y,index+1),u=x/size,v=y/size;
   let relief;
   if(name==='fur')relief=.5+.13*Math.sin((u*48+Math.sin(v*19)*.25)*Math.PI*2)+.11*(grain-.5);
   else if(name==='hide')relief=.5+.13*Math.cos(u*32*Math.PI)*Math.cos(v*28*Math.PI)+.12*(grain-.5);
   else if(name==='cloth')relief=.5+.14*Math.sin(u*64*Math.PI)*Math.sin(v*64*Math.PI)+.06*(grain-.5);
   else relief=.5+.075*Math.sin(v*126*Math.PI)+.10*(grain-.5);
   const i=(y*size+x)*4,b=Math.round(relief*255),r=Math.round(226+grain*24);
   bump.set([b,b,b,255],i);rough.set([r,r,r,255],i);
  }
  library[name]={bumpMap:texture(bump,name==='metal'?[1,1]:[2,2]),roughnessMap:texture(rough,[2,2])};
 }
 return {library,textures,dispose(){for(const t of textures)t.dispose();}};
}

export function surfaceParameters(id,kind,library){
 if(kind==='eye')return {roughness:.22,metalness:0};
 if(kind==='glow')return {roughness:.4,metalness:.12};
 if(kind==='gel')return {roughness:.23,metalness:0};
 const type=kind==='metal'?'metal':kind==='cloth'?'cloth':[0,2,6,7,8].includes(id)?'hide':'fur';
 return {...library[type],roughness:type==='metal'?.37:type==='cloth'?.78:.60,metalness:type==='metal'?.34:0,bumpScale:type==='metal'?.0005:type==='cloth'?.0012:.0013};
}
