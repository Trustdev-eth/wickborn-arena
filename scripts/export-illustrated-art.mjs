// Format and frame the selected generated masters; never invent or crop artwork.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {UI_PALETTE} from '../public/game/art-direction.js';
import {TOKENS,CARDS} from '../public/game/stock-roster.js';
const root=fileURLToPath(new URL('../',import.meta.url));
let sharp;try{({default:sharp}=await import('sharp'));}catch{const dirs=await readdir(join(root,'node_modules/.pnpm')),entry=dirs.find(n=>n.startsWith('sharp@'));if(!entry)throw Error('Install project dependencies with pnpm first.');const dir=resolve(root,'node_modules/.pnpm',entry,'node_modules/sharp'),pkg=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));({default:sharp}=await import(join(dir,pkg.main)));}
const roster=[['aaplx','Orchardhorn','AAPLx'],['tslax','Voltrunner','TSLAx'],['msftx','Cloudback','MSFTx'],['googlx','Lensfin','GOOGLx'],['amznx','Parcelpack','AMZNx'],['nvdax','Tensorforge','NVDAx'],['jnjx','Vitalbloom','JNJx'],['metax','Portalwyrm','METAx'],['jpmx','Vaultguard','JPMx'],['nflxx','Reelmoth','NFLXx'],['mcdx','Frydrop','MCDx'],['hoodx','Hoodwing','HOODx']];
const manifest=[],sheet=[],review=[];await mkdir(join(root,'art/portraits'),{recursive:true});
const tint=hex=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*.12+255*.88).toString(16).padStart(2,'0')).join('');
for(const [id,[slug,name,symbol]] of roster.entries()){
 const source=join(root,'art/portraits',slug+'.png'),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1,pixels=0,clear=0,opaqueEdgePixels=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const alpha=data[(y*info.width+x)*4+3];if(alpha){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);pixels++;if(alpha>=128&&(x<2||y<2||x>=info.width-2||y>=info.height-2))opaqueEdgePixels++;}else clear++;}
 if(pixels<20000||!clear)throw Error(slug+': missing transparent complete artwork.');
 if(opaqueEdgePixels)throw Error(slug+': opaque artwork touches the source edge; review or regenerate the complete silhouette.');
 const trimmed=await sharp(source).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(432,432,{fit:'inside'}).ensureAlpha().png().toBuffer();
 const size=await sharp(trimmed).metadata(),png=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:trimmed,left:40+Math.floor((432-size.width)/2),top:40+Math.floor((432-size.height)/2)}]).png({compressionLevel:9}).toBuffer();
 await writeFile(join(root,'public/game/characters',slug+'.png'),png);
 await sharp(png).webp({quality:91,alphaQuality:100,effort:5}).toFile(join(root,'public/game/characters',slug+'.webp'));
 manifest.push({id,file:'/game/characters/'+slug+'.png',optimized:'/game/characters/'+slug+'.webp',source:'art/portraits/'+slug+'.png',sourceType:'stylized-3d',width:512,height:512,sourceBounds:{left,top,width:right-left+1,height:bottom-top+1},sourceSilhouettePixels:pixels,sourceOpaqueEdgePixels:opaqueEdgePixels,paddingMinimum:40});
 sheet.push({input:png,left:id%4*512,top:Math.floor(id/4)*512});
 const color=TOKENS[id].color,company=TOKENS[id].company.replace(/&/g,'&amp;');
 const frame=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="332"><rect x="12" y="2" width="276" height="324" rx="12" fill="${UI_PALETTE.surface}" stroke="${UI_PALETTE.line}"/><path d="M25 2H275Q288 2 288 15V270H12V15Q12 2 25 2Z" fill="${tint(color)}"/><path d="M25 3H275" stroke="${color}" stroke-width="4"/><text x="27" y="30" font-family="sans-serif" font-weight="bold" font-size="11" fill="${UI_PALETTE.ink}">${symbol}</text><rect x="244" y="14" width="28" height="29" rx="6" fill="${UI_PALETTE.sun}"/><text x="258" y="35" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="${UI_PALETTE.ink}">${CARDS[id].cost}</text><text x="26" y="294" font-family="sans-serif" font-weight="bold" font-size="18" fill="${UI_PALETTE.ink}">${name}</text><text x="26" y="314" font-family="sans-serif" font-size="11" fill="${UI_PALETTE.muted}">${company}</text></svg>`);
 review.push({input:frame,left:id%4*300,top:Math.floor(id/4)*350+82});
 review.push({input:await sharp(png).resize(230,230).toBuffer(),left:id%4*300+35,top:Math.floor(id/4)*350+125});
}
await sharp({create:{width:2048,height:1536,channels:4,background:'#00000000'}}).composite(sheet).png().toFile(join(root,'public/game/stock-creatures.png'));
await writeFile(join(root,'public/game/characters/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const swatches=[UI_PALETTE.accent,UI_PALETTE.coral,UI_PALETTE.sun,UI_PALETTE.leaf].map((color,i)=>`<rect x="${1026+i*36}" y="17" width="25" height="25" rx="5" fill="${color}"/>`).join('');
const title=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="64"><text x="26" y="34" font-family="sans-serif" font-weight="bold" font-size="22" fill="${UI_PALETTE.ink}">WICKBORN ARENA / CARD ART</text><path d="M26 59H1174" stroke="${UI_PALETTE.line}"/>${swatches}</svg>`);
await sharp({create:{width:1200,height:1140,channels:4,background:UI_PALETTE.paper}}).composite([{input:title,left:0,top:0},...review]).png().toFile(join(root,'docs/console-fighters-preview.png'));
await sharp(join(root,'art/arena-crossing.png')).resize({width:1600,withoutEnlargement:true}).webp({quality:91,effort:5}).toFile(join(root,'public/game/backgrounds/arena-crossing.webp'));
await sharp(join(root,'art/arena-crossing.png')).resize({width:1200,withoutEnlargement:true}).png().toFile(join(root,'docs/console-arena-preview.png'));
console.log('Exported 12 transparent 3D-style PNG/WebP portraits, shared arena background and card-art review.');
