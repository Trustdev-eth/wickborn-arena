import * as THREE from 'three';
import {skinPatchGeometry,armorGeometry} from './anatomy.js';

export function sculptFighters6to11(id,t){
 const {body,kit,joint,mesh,skin,blade,line,plate,membrane,ball,ring,form,skull,muzzle,eyes,ear,fur,tail,claw,quad,pair,arm,mouth,shield,material,legs,arms,wings,tails,secondary,extras}=t;
 let head,jaw,kind='quad',float=0,modelScale=.84;
 if(id===6){
  const green='#69b550',cream='#fff1d5',red='#ea756d';kind='biped';modelScale=.82;
  skin(body,green,[[.21,.06,.07],[.31,.21,.21],[.55,.24,.22],[.78,.22,.20],[.90,.10,.12]]);pair(.27,green,.075,.16,green,false);
  // Flared coat panels follow a waist and split around the leg articulation.
  for(const s of [-1,1])plate(body,cream,[[0,.26],[s*.18,.19],[s*.28,-.20],[s*.13,-.29],[0,-.17]],.05,[0,.55,.18],[0,s*.12,0],'cloth',.025);
  for(const s of [-1,1])line(body,red,[[s*.05,.81,.24],[s*.13,.59,.27],[s*.25,.34,.25]],.024,.018);
  head=joint(body,0,1.00,.045);skull(head,green,.35,.40,.25);muzzle(head,'#f0e6b7',.29,.12,-.10,.18);
  for(const s of [-1,1])form(head,green,[s*.20,.08,.025],[.115,.24,.13]);eyes(head,'#64502b',.20,.145,.207,.092);jaw=mouth(head,'#526741',-.16,.27,.19);
  for(const s of [-1,1]){
   const a=arm(s,cream,.80,.34,.081);form(a.elbow,green,[0,-.24,.035],[.09,.14,.08]);
   for(let n=0;n<3;n++)line(a.elbow,green,[[n*.035-.035,-.15,.10],[n*.035-.035,-.20,.15],[n*.035-.035,-.25,.12]],.018,.009);
   if(s===-1)for(let n=0;n<5;n++){const a=n/5*Math.PI*2;blade(body,red,[[-.27,.82,.15],[-.27+Math.sin(a)*.10,.87+Math.cos(a)*.10,.19],[-.27+Math.sin(a)*.17,.87+Math.cos(a)*.17,.12]],[.025,.074,.001],.035);}
  }
  plate(body,'#d7aa40',[[-.10,-.025],[.10,-.025],[.10,.025],[-.10,.025]],.025,[0,.76,.28]);
  const staff=joint(arms[1].elbow,.11,-.12,.16,'vital-lily-staff');line(staff,'#775232',[[0,-.52,0],[.025,.10,0],[.10,.60,0],[.13,.71,0]],.037,.020);
  for(let n=0;n<5;n++){
   const a=n/5*Math.PI*2,petal=joint(staff,.13,.64,0);petal.rotation.z=a;
   blade(petal,'#ed7c91',[[0,0,0],[.08,.15,-.015],[0,.33,-.03],[-.06,.23,.03]],[.025,.10,.08,.001],.028);
   line(petal,'#f8ce6f',[[0,0,.05],[.04,.11,.06],[.025,.18,.08]],.010,.004);
  }
  blade(staff,'#4d8b3e',[[.04,.35,0],[-.11,.42,.015],[-.16,.53,0]],[.01,.08,.001],.02);extras.push({node:staff,type:'staff',phase:0});
 }
 if(id===7){
  const indigo='#4c52ad',lilac='#b6ade6',cyan='#68d9e8';kind='fly';float=.47;modelScale=.80;
  skin(body,indigo,[[.27,.07,.14,-.09],[.39,.25,.34,-.04],[.66,.29,.37],[.86,.21,.28,.16],[1.13,.16,.16,.25],[1.20,.04,.05,.27]]);quad(.34,indigo,.075,.22,.25,indigo,true);
  for(let n=0;n<5;n++)blade(body,lilac,[[0,.36+n*.10,.28],[0,.40+n*.10,.33],[0,.46+n*.10,.28]],[.06,.18-n*.013,.05],.025);
  head=joint(body,0,1.04,.46);skull(head,indigo,.265,.45,.25);muzzle(head,lilac,.205,.17,-.08,.24);eyes(head,'#3b6c9c',.14,.045,.231,.074,true);jaw=joint(head,0,-.18,.24);skin(jaw,lilac,[[-.05,.02,.02],[0,.17,.12,.045],[.045,.15,.13,.045],[.07,.02,.02,.04]]);
  for(const s of [-1,1]){
   line(head,'#fff1d1',[[s*.14,.17,-.04],[s*.22,.28,-.13],[s*.25,.39,-.25],[s*.15,.48,-.34]],.075,.002);
   for(let n=0;n<3;n++)fur(head,indigo,[s*.18,.12-n*.07,-.02],[s*(.34-n*.025),.20-n*.095,-.15],.085);
   ball(head,'#2b3551',[s*.07,-.04,.385],[.018,.012,.009]);
  }
  const t=tail(indigo,[[0,.58,-.35],[.12,.61,-.64],[.33,.83,-.78],[.38,1.09,-.72],[.23,1.21,-.61],[.09,1.14,-.59]],.12,'portal-tail');
  line(t,lilac,[[.01,.60,-.47],[.12,.68,-.72],[.32,.87,-.84],[.34,1.08,-.75],[.22,1.14,-.62]],.035,.008);
  for(let n=0;n<4;n++)blade(body,lilac,[[0,.88-n*.07,-.22-n*.08],[0,1.05-n*.055,-.25-n*.08],[0,1.12-n*.065,-.29-n*.08]],[.025,.07,.001],.025);
  const portal=joint(body,0,0,0,'portal-wings');
  for(const s of [-1,1]){
   const node=joint(portal,s*.20,.91,-.08),tip=joint(node,.48,.12,-.07);node.scale.x=s;
   membrane(node,cyan,[[0,0],[.18,-.26],[.54,-.72],[.91,-.86],[.88,-.43],[1.03,-.26],[.80,-.08],[.72,.22],[.44,.11],[.22,.30]],.19);
   for(const [x,z]of [[.91,-.86],[1.03,-.26],[.72,.22],[.22,.30]])line(node,indigo,[[0,.025,0],[x*.48,.20,z*.44],[x,.03,z]],.027,.005);
   blade(tip,indigo,[[0,0,0],[.22,.025,-.13],[.40,-.04,-.20]],[.025,.08,.001],.025,'skin',[0,1,0]);wings.push({node,tip,sign:s,style:'bat',restRoll:.49,restPitch:.18});
  }
  const portalRing=joint(body,-.43,.44,.42,'solid-portal-ring');portalRing.rotation.y=-.34;
  mesh(portalRing,new THREE.TorusGeometry(.30,.036,8,40),cyan,'metal');
 }
 if(id===8){
  const blue='#2c4b80',brass='#d6ab59',ivory='#fff1d4';modelScale=.84;
  skin(body,blue,[[.28,.11,.21,-.08],[.42,.34,.43,-.04],[.68,.41,.48],[.93,.33,.38,.11],[1.10,.21,.24,.24],[1.17,.06,.06,.26]]);quad(.41,blue,.12,.29,.28,blue,true);
  const armor=joint(body,0,0,0,'vault-armor');
  for(const s of [-1,1]){
   const a=shield(armor,'vault-pauldrons',brass,'#344454',[s*.35,.83,.25],1,[0,s*.63,-s*.08]);
   const wheel=joint(a,0,0,.17,'vault-wheel');ring(wheel,brass,[0,0,0],[.16,.16,.16]);
   ball(wheel,'#f5d490',[0,0,.012],[.047,.047,.025],'metal');
   for(let n=0;n<3;n++){const r=n/3*Math.PI*2;line(wheel,brass,[[0,0,.01],[Math.cos(r)*.14,Math.sin(r)*.14,.01]],.016,.016,'metal');}
   for(let n=0;n<6;n++){const r=n/6*Math.PI*2;ball(a,'#f2d18c',[Math.cos(r)*.24,Math.sin(r)*.24,.14],[.018,.018,.009],'metal');}
   plate(armor,brass,[[-.12,.18],[.14,.18],[.16,-.17],[-.10,-.14]],.07,[s*.28,.95,-.20],[0,s*1.1,0]);
  }
  head=joint(body,0,.98,.46);skull(head,blue,.31,.51,.29);muzzle(head,ivory,.24,.18,-.10,.28);eyes(head,'#28394a',.17,.045,.24,.075,true);
  for(const s of [-1,1])ear(head,blue,'#263852',s,.23,.09);
  line(head,ivory,[[0,-.04,.43],[0,.11,.49],[0,.28,.46],[0,.45,.36]],.105,.002,'metal');
  line(head,brass,[[-.14,.08,.35],[0,.04,.43],[.14,.08,.35]],.022,.016,'metal');jaw=mouth(head,'#5a5c5a',-.23,.37,.12);tail(blue,[[0,.61,-.44],[.11,.59,-.64],[.13,.42,-.74]],.05,'vault-tail');
 }
 if(id===9){
  const dark='#34323b',red='#de3f47',cream='#fff0d4';kind='fly';float=.66;modelScale=.67;
  skin(body,dark,[[.20,.025,.03,-.04],[.35,.13,.14],[.59,.19,.21],[.84,.15,.18],[.97,.07,.08]]);
  for(const s of [-1,1])for(let n=0;n<4;n++)fur(body,n%2?'#49454f':dark,[s*.09,.74-n*.12,.14],[s*.23,.58-n*.12,.04],.09);
  head=joint(body,0,1.03,.075);skull(head,dark,.245,.43,.22);eyes(head,'#ce3549',.13,.035,.195,.104);jaw=mouth(head,'#e3a19b',-.14,.23,.055);pair(.23,dark,.04,.105,dark,false);
  for(const s of [-1,1])for(const z of [-.11,.14])line(body,dark,[[s*.12,.51,z],[s*.28,.35,z+.04],[s*.24,.15,z+.10]],.026,.008);
  for(const s of [-1,1]){
   line(head,red,[[s*.10,.15,-.025],[s*.17,.40,-.02],[s*.32,.49,.015],[s*.34,.39,.06]],.035,.010);
   for(let n=0;n<3;n++)fur(head,red,[s*(.17+n*.035),.37+n*.025,-.01],[s*(.27+n*.025),.45+n*.015,-.02],.024);
  }
  const patterns=joint(body,0,0,0,'film-ribbon-wings');
  for(const s of [-1,1]){
   const node=joint(patterns,s*.105,.78,-.025),tip=joint(node,.48,.05,-.30);node.scale.x=s;
   // Four separate lobes, a charcoal border, film perforations and reel spots.
   const shapes=[[[0,0],[.19,-.40],[.81,-.95],[1.01,-.88],[.95,-.26],[.70,.05],[.30,.16]],[[0,.05],[.38,.13],[.78,.36],[.66,.82],[.43,.93],[.18,.69]]];
   for(let k=0;k<shapes.length;k++){
    const pts=shapes[k];membrane(node,dark,pts,.11);const inset=pts.map(([x,z])=>[x*.89,z*.89]);const inner=membrane(node,red,inset,.11);inner.position.y=.035;
    const cx=k===0?.65:.43,cz=k===0?-.48:.53;
    ring(node,'#ed7665',[cx,.16,cz],[.15,.15,.15],[Math.PI/2,0,0],'skin');
    for(let n=0;n<4;n++){const a=n/4*Math.PI*2;kit.part(node,'petal',material(dark),[cx+Math.cos(a)*.065,.167,cz+Math.sin(a)*.065],[.030,.012,.030]);}
    for(let n=0;n<6;n++){
     const t=(n+.5)/6,x=k===0?.29+t*.54:.24+t*.28,z=k===0?-.36-t*.48:.66+t*.15;
     plate(node,cream,[[-.021,-.028],[.021,-.028],[.021,.028],[-.021,.028]],.006,[x,.10,z],[-Math.PI/2,0,k===0?-.75:.60],'skin',.004);
    }
   }
   blade(tip,red,[[0,0,0],[.20,.025,-.19],[.36,-.03,-.34]],[.035,.10,.001],.02,'skin',[0,1,0]);wings.push({node,tip,sign:s,style:'moth',restRoll:.48,restPitch:.16});
  }
 }
 if(id===10){
  const gold='#ffc831',red='#df3c3e';kind='slime';modelScale=.86;
  skin(body,gold,[[.04,.18,.20],[.08,.48,.43],[.19,.44,.38],[.40,.38,.33],[.65,.30,.26],[.82,.15,.14],[.86,.025,.025]],[0,0,0],[0,0,0],'gel');
  for(const s of [-1,1])form(body,gold,[s*.38,.035,.12],[.17,.12,.17],'gel');
  head=joint(body,0,.59,.24);blade(head,'#f9dc85',[[0,-.20,.02],[0,-.025,.08],[0,.19,-.025]],[.06,.235,.04],.033,'gel');eyes(head,'#593921',.135,-.01,.132,.077);jaw=joint(head,0,-.12,.18);blade(jaw,'#6c3730',[[-.06,.025,0],[0,-.04,.01],[.07,.03,0]],[.015,.043,.001],.013,'eye');ball(jaw,'#f48471',[.005,-.029,.02],[.035,.017,.009]);
  // Folded paper collar has a wavy upper edge and separate folded corners.
  plate(body,red,[[-.43,.16],[-.16,.11],[0,.05],[.17,.11],[.43,.16],[.38,-.16],[-.38,-.16]],.11,[0,.31,.29],[0,0,0],'skin',.018);
  for(const s of [-1,1])plate(body,red,[[-.11,.15],[.11,.10],[.09,-.16],[-.08,-.16]],.16,[s*.35,.31,.05],[0,s*.9,-s*.06],'skin',.014);
  const crown=joint(body,0,0,0,'fry-crown');
  for(const [x,y,z,a,h]of [[-.23,.87,-.08,.35,.26],[-.11,.97,-.10,.17,.32],[.02,1.01,-.12,-.09,.36],[.15,.95,-.09,-.20,.32],[.25,.86,-.06,-.36,.28]]){
   const fry=joint(crown,x,y-.10,z,'golden-fry');fry.rotation.z=a;
   plate(fry,'#ffda68',[[-.046,0],[.046,0],[.052,h],[-.03,h+.04]],.07,[0,0,0],[0,0,0],'skin',.014);
   line(crown,'#ffdd78',[[x-.022,y-.02,z+.09],[x-.022+Math.sin(-a)*.15,y+.13,z+.09]],.008,.006);
  }
  blade(body,'#ffe4a0',[[-.24,.42,.25],[-.26,.56,.22],[-.19,.68,.18]],[.012,.035,.003],.008,'gel');
 }
 if(id===11){
  const jade='#329b62',light='#a4cd63',cream='#fff0d1',dark='#225b41';kind='fly';float=.59;modelScale=.77;
  const torso=[[.22,.045,.05],[.35,.22,.24],[.61,.29,.30],[.86,.25,.25],[1.01,.12,.13]];skin(body,jade,torso);
  mesh(body,skinPatchGeometry(torso,.10,.86,.87),cream);
  for(const s of [-1,1])for(let n=0;n<3;n++)fur(body,n%2?light:cream,[s*.10,.70-n*.12,.25],[s*.23,.54-n*.12,.18],.07);
  head=joint(body,0,1.05,.13);skull(head,jade,.32,.56,.27);
  const mask=armorGeometry([[-.25,.13],[-.15,.26],[0,.16],[.15,.26],[.25,.13],[.21,-.11],[0,-.25],[-.21,-.11]],.022,.014),mp=mask.attributes.position;
  for(let i=0;i<mp.count;i++){const x=mp.getX(i),y=mp.getY(i);mp.setZ(i,mp.getZ(i)+.29-.12*(x*x/.09+y*y/.16));}mask.computeVertexNormals();mesh(head,mask,cream);
  eyes(head,'#274b3c',.135,.032,.292,.088);blade(head,'#d7a13a',[[0,-.025,.34],[0,-.08,.42],[0,-.16,.37]],[.035,.05,.001],.028,'metal');jaw=mouth(head,'#7d622c',-.15,.365,.035);pair(.26,'#bb9940',.047,.12,'#bb9940',true);
  const hood=joint(head,0,0,0,'archer-hood');
  for(const s of [-1,1]){
   line(hood,dark,[[0,.25,-.03],[s*.24,.23,.09],[s*.31,.0,.17],[s*.22,-.25,.16],[0,-.32,.15]],.058,.026);
   blade(hood,dark,[[s*.21,.12,-.08],[s*.25,.28,-.11],[s*.27,.43,-.19]],[.09,.115,.001],.055);
  }
  blade(hood,'#6f9d47',[[0,.25,.04],[.04,.41,-.01],[-.02,.54,-.14]],[.04,.12,.001],.027);
  plate(body,'#d5ac47',[[0,.07],[-.05,0],[0,-.065],[.05,0]],.02,[0,.85,.31]);
  const quiver=joint(body,.23,.72,-.29,'archer-quiver');quiver.rotation.z=-.35;
  skin(quiver,'#815d34',[[-.24,.06,.06],[-.20,.105,.10],[.24,.10,.10],[.27,.09,.09]],[0,0,0],[0,0,0],'cloth');
  for(const s of [-1,0,1]){line(quiver,'#dfbd75',[[s*.045,.16,0],[s*.045,.48,0]],.010,.010,'metal');blade(quiver,light,[[s*.045,.33,0],[s*.045+.055,.42,0],[s*.045,.50,0]],[.008,.045,.001],.018);}
  for(const s of [-1,1]){
   const node=joint(body,s*.21,.83,-.04),tip=joint(node,.43,.06,-.01);node.scale.x=s;
   membrane(node,dark,[[0,0],[.20,-.15],[.65,-.24],[.94,-.04],[.87,.35],[.40,.42]],.10);
   for(let n=0;n<7;n++){
    const distal=n>=3,parent=distal?tip:node,offset=distal?.43:0,x=.18+n*.10-offset,z=-.12+n*.055,len=.43+(n%3)*.08;
    const feather=blade(parent,n%2?jade:'#52854b',[[x,.06,z],[x+.10,.08,z+len*.46],[x+.17,.015,z+len]],[.025,.105,.001],.032,'skin',[0,1,0]);feather.rotation.x=-.15;
    line(parent,light,[[x,.075,z+.03],[x+.10,.10,z+len*.45],[x+.16,.04,z+len*.86]],.009,.002);
   }
   for(let n=0;n<4;n++)blade(node,light,[[.15+n*.14,.11,-.11],[.24+n*.14,.15,.06],[.32+n*.14,.06,.23]],[.025,.09,.001],.025,'skin',[0,1,0]);
   wings.push({node,tip,sign:s,style:'bird',restRoll:.36,restPitch:.16});
  }
  for(let n=0;n<5;n++)blade(body,n%2?light:jade,[[(n-2)*.06,.43,-.24],[(n-2)*.09,.39,-.45],[(n-2)*.13,.30,-.68]],[.02,.09,.001],.025,'skin',[0,1,0]);
 }


 t.head=head;t.jaw=jaw;t.kind=kind;t.float=float;t.modelScale=modelScale;
}
