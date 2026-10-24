import * as THREE from 'three';
import {clamp} from './math.js';

const SLOT_GAP=6,SLOT_CACHE=new Map();
function slotOffsets(w,h,gap=SLOT_GAP){
 const key=w+','+h+','+gap;if(SLOT_CACHE.has(key))return SLOT_CACHE.get(key);
 const gx=w+gap,gy=h+gap,out=[[0,0]];
 for(let ring=1;ring<=4;ring++){
  for(let x=-ring;x<=ring;x++)out.push([x*gx,-ring*gy],[x*gx,ring*gy]);
  for(let y=1-ring;y<=ring-1;y++)out.push([-ring*gx,y*gy],[ring*gx,y*gy]);
 }
 SLOT_CACHE.set(key,out);return out;
}
function overlapArea(a,b,pad=2){
 const w=Math.max(0,Math.min(a.left+a.width+pad,b.left+b.width+pad)-Math.max(a.left-pad,b.left-pad));
 const h=Math.max(0,Math.min(a.top+a.height+pad,b.top+b.height+pad)-Math.max(a.top-pad,b.top-pad));
 return w*h;
}
// item.slot is the previous choice; keeping it unless it overlaps stops labels hopping every frame.
export function placeHealthLabels(items,width,height){
 const placed=[],result=[];
 for(const item of [...items].sort((a,b)=>b.priority-a.priority)){
  const slots=slotOffsets(item.width,item.height);
  let best=null;
  for(let slot=0;slot<slots.length;slot++){
   const [dx,dy]=slots[slot],left=clamp(item.x-item.width/2+dx,4,Math.max(4,width-item.width-4)),top=clamp(item.y-item.height+dy,35,Math.max(35,height-item.height-4));
   const overlap=placed.reduce((sum,p)=>sum+overlapArea({left,top,width:item.width,height:item.height},p),0);
   const score=overlap*1000+Math.abs(dx)+Math.abs(dy)*.9+(item.slot!==undefined&&slot!==item.slot?40:0);
   if(!best||score<best.score)best={...item,left,top,score,slot};
  }
  placed.push(best);result.push(best);
 }
 return result;
}
export function createHealthHUD(canvas){
 const layer=document.createElement('div'),bars=new Set();layer.className='arena-health-layer';layer.setAttribute('aria-hidden','true');canvas.insertAdjacentElement('afterend',layer);
  function create({friendly,tower=false,captain=false,name='',level=1}){
  const element=document.createElement('div'),title=document.createElement('span'),track=document.createElement('span'),fill=document.createElement('i'),amount=document.createElement('b'),stem=document.createElement('span');
  element.className=`health-label ${friendly?'is-own':'is-rival'}${tower?' is-tower':''}${captain?' is-captain':''}`;title.className='health-name';title.textContent=tower||captain?name:`${name} · ${level}`;track.className='health-track';stem.className='health-stem';track.append(fill,amount);element.append(stem,title,track);layer.append(element);
  const bar={position:new THREE.Vector3(),visible:true,hp:0,maxHp:1,width:76,height:26,element,set(hp,maxHp){if(this.hp===hp&&this.maxHp===maxHp)return;this.hp=hp;this.maxHp=maxHp;const ratio=hp/Math.max(1,maxHp);fill.style.width=`${clamp(ratio,0,1)*100}%`;amount.textContent=String(Math.max(0,Math.ceil(hp)));element.classList.toggle('is-low',ratio<.3);},setMarket(mult,status){if(tower)return;const percent=Math.round((mult-1)*100),text=`${name} · ${percent>0?'▲+':percent<0?'▼':''}${percent}%`;if(title.textContent!==text){const shifted=this.percent!==undefined&&this.percent!==percent;this.percent=percent;title.textContent=text;if(shifted){element.classList.remove('market-pop');void element.offsetWidth;element.classList.add('market-pop');}}const market=status==='live'?(percent>0?'up':percent<0?'down':'flat'):'neutral';if(element.dataset.market!==market)element.dataset.market=market;},dispose(){element.remove();bars.delete(this);}};
  bars.add(bar);return bar;
 }
 const projected=new THREE.Vector3();let lastUpdate=null;
 function update(camera,width,height){
  const now=performance.now()/1000,ease=lastUpdate===null?1:1-Math.exp(-Math.min(.1,now-lastUpdate)*16),items=[];lastUpdate=now;
  for(const bar of bars){const p=projected.copy(bar.position).project(camera),visible=bar.visible&&p.z>-1&&p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1;if(bar.element.hidden===visible)bar.element.hidden=!visible;if(!visible)bar.offset=null;else items.push({bar,slot:bar.slot,x:(p.x+1)*width/2,y:(1-p.y)*height/2,width:bar.width,height:bar.height,priority:(bar.element.classList.contains('is-tower')?2:0)+(1-bar.hp/bar.maxHp)});}
  for(const item of placeHealthLabels(items,width,height)){
   // The anchor follows the creature exactly; only the slot offset eases, so a slot change glides instead of jumping.
   const {bar,x,y}=item,goalX=item.left-x,goalY=item.top-y,changed=bar.slot!==item.slot,k=changed?Math.min(1,ease*4):ease;bar.slot=item.slot;bar.offset??={x:goalX,y:goalY};bar.offset.x+=(goalX-bar.offset.x)*k;bar.offset.y+=(goalY-bar.offset.y)*k;
   const left=x+bar.offset.x,top=y+bar.offset.y,transform=`translate(${Math.round(left)}px,${Math.round(top)}px)`;if(bar.transform!==transform){bar.transform=transform;bar.element.style.transform=transform;}
   const dx=x-(left+bar.width/2),dy=y-(top+bar.height),length=Math.hypot(dx,dy),stem=bar.element.firstElementChild,short=length<4;if(stem.hidden!==short)stem.hidden=short;if(!short){stem.style.height=`${Math.round(length)}px`;stem.style.transform=`rotate(${(-Math.atan2(dx,dy)).toFixed(3)}rad)`;}
  }
 }
 return {create,update,dispose(){bars.clear();layer.remove();}};
}
