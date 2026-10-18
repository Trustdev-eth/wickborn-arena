import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {SPRITE_ART,spriteMarkup,fitSprite} from '../public/game/sprite-art.js';
import {renderer} from '../public/game/renderer-2d.js';

// Decode the actual checked-in RGBA pixels so a future art update cannot
// silently reintroduce clipping despite a correct filename or manifest.
function png(path){
 const b=readFileSync(path),parts=[];let width,height;
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 for(let offset=8;offset<b.length;){const len=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8),data=b.subarray(offset+8,offset+8+len);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],6);}if(type==='IDAT')parts.push(data);offset+=len+12;}
 const raw=inflateSync(Buffer.concat(parts)),stride=width*4,pixels=Buffer.alloc(stride*height);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?pixels[i-4]:0,up=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0,byte=raw[y*(stride+1)+1+x];pixels[i]=(byte+(filter===0?0:filter===1?a:filter===2?up:filter===3?Math.floor((a+up)/2):paeth(a,up,c)))&255;}}
 return {width,height,pixels};
}
const root=new URL('../public/',import.meta.url),asset=url=>new URL(url.slice(1),root);
test('all twelve fighters have separate transparent assets with safe padding',()=>{
 assert.equal(SPRITE_ART.length,12);assert.equal(new Set(SPRITE_ART).size,12);
 for(const src of SPRITE_ART){const {width,height,pixels}=png(asset(src));assert.equal(width,512);assert.equal(height,512);let count=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){count++;assert.ok(x>=40&&x<472&&y>=40&&y<472,src+' must keep every visible part inside its padded frame.');}
  assert.ok(count>20000,src+' needs a complete nonempty silhouette.');
 }
});
test('cards use one whole image with contain sizing rather than atlas offsets',()=>{
 for(let id=0;id<12;id++){const html=spriteMarkup(id,'Fighter '+id,'modal-art');assert.ok(html.includes(SPRITE_ART[id]));assert.ok(!html.includes('background-position'));assert.ok(html.includes('role="img"'));}
 assert.ok(spriteMarkup(0,'Bull "&"').includes('Bull &quot;&amp;&quot;'));
 const css=readFileSync(new URL('../app/wickborn.css',import.meta.url),'utf8');assert.match(css,/#game-root \.sprite\{[^}]*background-size:contain;[^}]*background-position:center/);
 assert.deepEqual(fitSprite(512,256,100),{width:100,height:50});assert.deepEqual(fitSprite(256,512,100),{width:50,height:100});
});
test('2D battle sprites draw the complete matching image without a source crop',()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document,calls=[];
 const context=new Proxy({drawImage(...args){calls.push(args);}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 globalThis.Image=class{complete=true;naturalWidth=512;naturalHeight=512;};globalThis.document={createElement:()=>({getContext:()=>context})};
 try{const view=renderer({getContext:()=>context});for(let id=0;id<12;id++){view.sprite(id,20,80,57,true);const args=calls.at(-1);assert.equal(args.length,5);assert.equal(args[0].src,SPRITE_ART[id]);assert.equal(args[3],57);assert.equal(args[4],57);}}
 finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
test('exported contact sheet has clear gutters around every equal grid cell',()=>{
 const {width,height,pixels}=png(asset('/game/stock-creatures.png'));assert.equal(width,2048);assert.equal(height,1536);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x%512<40||x%512>=472||y%512<40||y%512>=472)assert.equal(pixels[(y*width+x)*4+3],0,'An exported sheet gutter contains neighboring artwork.');
});
