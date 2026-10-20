// Export the checked-in vector drawings. No image-generation service is used.
// pnpm installs sharp transitively through the existing Wrangler dependency.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const current=JSON.parse(await readFile(join(root,'public/game/characters/manifest.json'),'utf8'));
if(current.some(p=>p.sourceType&&p.sourceType!=='vector')&&!process.argv.includes('--legacy-vector'))throw Error('The active roster uses raster card-art masters. Run scripts/export-illustrated-art.mjs. Add --legacy-vector only to deliberately restore the older vector art.');
let sharp;
try{({default:sharp}=await import('sharp'));}catch{
 const packages=await readdir(join(root,'node_modules/.pnpm'));
 const installed=packages.find(name=>name.startsWith('sharp@'));
 if(!installed)throw Error('The artwork exporter needs sharp. Install the project dependencies with pnpm first.');
 const directory=resolve(root,'node_modules/.pnpm',installed,'node_modules/sharp');
 const pkg=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));
 ({default:sharp}=await import(join(directory,pkg.main)));
}
const roster=[['aaplx','Orchardhorn','AAPLx'],['tslax','Voltrunner','TSLAx'],['msftx','Cloudback','MSFTx'],['googlx','Lensfin','GOOGLx'],['amznx','Parcelpack','AMZNx'],['nvdax','Tensorforge','NVDAx'],['jnjx','Vitalbloom','JNJx'],['metax','Portalwyrm','METAx'],['jpmx','Vaultguard','JPMx'],['nflxx','Reelmoth','NFLXx'],['mcdx','Frydrop','MCDx'],['hoodx','Hoodwing','HOODx']];
const manifest=[],sheet=[],preview=[];
for(let id=0;id<roster.length;id++){
 const [slug,name,symbol]=roster[id],source=await readFile(join(root,'public/game/characters/vector',slug+'.svg'));
 const png=await sharp(source).resize(512,512).ensureAlpha().png().toBuffer();
 const {data}=await sharp(png).raw().toBuffer({resolveWithObject:true});
 let left=512,top=512,right=0,bottom=0,pixels=0;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(y*512+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);pixels++;}
 if(left<40||top<40||right>=472||bottom>=472||pixels<20000)throw Error(slug+' violates the complete-silhouette/padding budget.');
 await writeFile(join(root,'public/game/characters',slug+'.png'),png);
 manifest.push({id,file:'/game/characters/'+slug+'.png',vector:'/game/characters/vector/'+slug+'.svg',width:512,height:512,sourceBounds:{left,top,width:right-left+1,height:bottom-top+1},sourceSilhouettePixels:pixels,paddingMinimum:40});
 sheet.push({input:png,left:id%4*512,top:Math.floor(id/4)*512});
 const cell=await sharp(png).resize(256,256).toBuffer();preview.push({input:cell,left:id%4*280+12,top:Math.floor(id/4)*310+77});
 const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="280" height="45"><text x="140" y="15" font-family="sans-serif" font-size="11" font-weight="bold" fill="#be4d29" text-anchor="middle">${symbol}</text><text x="140" y="37" font-family="sans-serif" font-size="18" font-weight="bold" fill="#172026" text-anchor="middle">${name}</text></svg>`);
 preview.push({input:label,left:id%4*280,top:Math.floor(id/4)*310+315});
}
await sharp({create:{width:2048,height:1536,channels:4,background:'#00000000'}}).composite(sheet).png().toFile(join(root,'public/game/stock-creatures.png'));
await writeFile(join(root,'public/game/characters/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const title=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="65"><path d="M24 59H1096" stroke="#172026" stroke-width="2"/><text x="25" y="33" font-family="sans-serif" font-size="24" font-weight="bold" fill="#172026">WICKBORN / FIGHTER ART</text><text x="1095" y="32" text-anchor="end" font-family="sans-serif" font-size="12" fill="#785e45">INK + FLAT COLOR · 12 ORIGINAL VECTOR DRAWINGS</text></svg>');
await sharp({create:{width:1120,height:1010,channels:4,background:'#efe3c6'}}).composite([{input:title,left:0,top:0},...preview]).png().toFile(join(root,'docs/arcade-art-preview.png'));
const landscapes=[];
for(const [i,mode] of ['classic','skirmish'].entries())landscapes.push({input:await sharp(join(root,'public/game/backgrounds',mode+'-crossing.svg')).resize(600,450).png().toBuffer(),left:i*600,top:0});
await sharp({create:{width:1200,height:450,channels:4,background:'#151b22'}}).composite(landscapes).png().toFile(join(root,'docs/arcade-background-preview.png'));
console.log('Exported 12 padded fighter portraits, their contact sheet and art/background previews.');
