import {clamp} from './math.js';
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};
export const isCaster=id=>[1,3,6,7,9,11].includes(id);
export function combatTiming(event){return event.kind==='hit'?{delay:.085,impact:.20,life:.43,hold:event.card===5||event.card===8?.080:.055}:{delay:.12,impact:.38,life:.47,hold:.035};}

// Cosmetic timelines keep the existing engine's projectile release and melee
// contact times. Mass shifts precede contact; recovery trails the striking limb.
export function combatPose(id,elapsed,combo=0){
 const p={wind:0,strike:0,settle:0,x:0,y:0,z:0,pitch:0,twist:0,roll:0,head:0,jaw:0,arm:0,elbow:0,spread:0,tail:0,paw:0,phase:'idle'};
 const end=id===5||id===8?.76:.66;if(elapsed<0||elapsed>end)return p;
 const cast=isCaster(id),contact=cast?.15:.20,sign=combo%2?1:-1;
 p.wind=smooth(0,.065,elapsed)*(1-smooth(.065,contact-.012,elapsed));
 p.strike=smooth(contact-.075,contact,elapsed)*(1-smooth(contact+.05,end-.04,elapsed));
 p.settle=smooth(contact,contact+.09,elapsed)*(1-smooth(contact+.10,end,elapsed));
 p.phase=elapsed<.075?'anticipation':elapsed<contact?'strike':elapsed<contact+.06?'contact':'recovery';
 const w=p.wind,s=p.strike,r=p.settle;
 p.z=s*.12-w*.055;p.pitch=-w*.075+s*.085;p.head=-w*.11+s*.08;p.jaw=s*.10;p.paw=.30;
 if(id===0){p.y=-w*.035-s*.018;p.z=s*.23-w*.07;p.pitch=-w*.08+s*.15;p.head=w*.14+s*.17;p.twist=sign*(s*.10-w*.045);p.x=sign*s*.025;p.paw=.32;p.tail=-sign*s*.12;}
 if(id===1){const flight=Math.sin(clamp((elapsed-.075)/.34,0,1)*Math.PI);p.y=-w*.045+flight*.10;p.z=s*.28-w*.085;p.pitch=-w*.11+s*.13-r*.035;p.twist=sign*(s*(combo%3===2?.35:.14)-w*.08);p.x=sign*s*.045;p.tail=-sign*s*.30;p.paw=.90;p.jaw=s*.20;p.head=-w*.14+s*.12;}
 if(id===2){p.y=-w*.012-s*.012;p.z=s*.13-w*.035;p.pitch=-w*.045+s*.08;p.head=-w*.08+s*.24;p.twist=sign*s*(combo%3===2?.20:.035);p.paw=.14;}
 if(id===3||id===6||id===9){p.z=-s*.035-w*.025;p.pitch=-s*.07+r*.025;p.head=-w*.08+s*.06;p.twist=sign*(w*.14-s*.12);p.arm=w*.24-s*.87;p.elbow=-w*.65-s*.15;p.spread=w*.17+s*.10;p.y=-w*.015+s*.016;p.jaw=s*.09;}
 if(id===4){p.y=w*.045-s*.14;p.z=s*.28-w*.07;p.pitch=-w*.11+s*.29;p.head=-w*.08+s*.12;p.jaw=s*.24;p.roll=sign*s*.09;}
 if(id===5){p.y=-w*.035-s*.065+r*.02;p.z=s*.19-w*.055;p.pitch=-w*.14+s*.19;p.arm=combo%3===2?-w*2.25-s*.62:w*.50-s*1.24;p.elbow=-w*1.0-s*.12;p.spread=w*.16+s*.13;p.twist=combo%3===2?0:sign*(s*.21-w*.14);p.x=sign*s*.035;p.head=-w*.06+s*.10;p.paw=.08;}
 if(id===7){p.y=w*.035-s*.025;p.z=-s*.065;p.pitch=-w*.09+s*.10;p.head=-w*.17+s*.17;p.jaw=w*.10+s*.53;p.tail=-sign*s*.24;p.spread=s*.10;}
 if(id===8){p.y=-w*.03-s*.035;p.z=s*.32-w*.09;p.pitch=-w*.06+s*.13;p.head=w*.25+s*.14;p.twist=sign*(s*.17-w*.075);p.x=sign*s*.022;p.paw=.30;p.tail=-sign*s*.10;}
 if(id===10){p.y=s*.14-w*.04;p.z=s*.26-w*.075;p.pitch=s*.16-w*.11;p.twist=sign*s*.10;p.jaw=s*.23;}
 if(id===11){p.y=w*.08-s*.13;p.z=s*.24-w*.06;p.pitch=-w*.16+s*.24;p.head=-w*.10+s*.12;p.jaw=s*.19;p.roll=sign*s*.09;p.paw=.55;}
 return p;
}
