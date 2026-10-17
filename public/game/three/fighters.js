import * as THREE from 'three';
import {taperedCurve,batchJointSurfaces} from './sculpt.js';
import {organicGeometry,skinPatchGeometry,bladeGeometry,armorGeometry,membraneGeometry} from './anatomy.js';

// Original sculpted game art. Profiles, silhouettes and accessories follow the
// stock-creatures atlas; engine IDs, reach, collisions and damage stay untouched.
export function sculptFighter(id,kit){
 const root=new THREE.Group(),body=new THREE.Group(),materials=[],cache=new Map(),owned=new Set();
 const legs=[],arms=[],wings=[],tails=[],extras=[],eyesRig=[];
 root.name='creature-'+id;body.name='sculpted-body';root.add(body);
 const joint=(parent,x=0,y=0,z=0,name='')=>{const g=new THREE.Group();g.position.set(x,y,z);g.name=name;parent.add(g);return g;};
 function material(color,kind='skin'){
  const key=color+kind;if(cache.has(key))return cache.get(key);
  const metal=kind==='metal',glow=kind==='glow',eye=kind==='eye',gel=kind==='gel';
  const m=new THREE.MeshStandardMaterial({color,vertexColors:!eye,roughness:metal?.34:eye?.18:gel?.24:.64,metalness:metal?.55:0,emissive:glow?color:'#000000',emissiveIntensity:glow?.32:0,side:THREE.FrontSide});
  m.userData.baseGlow=m.emissiveIntensity;m.userData.baseEmissive=m.emissive.clone();materials.push(m);cache.set(key,m);return m;
 }
 function mesh(parent,g,color,kind='skin',pos=[0,0,0],rot=[0,0,0],name=''){
  owned.add(g);g.userData.owned=true;const m=new THREE.Mesh(g,material(color,kind));m.position.set(...pos);m.rotation.set(...rot);m.name=name;m.castShadow=kind!=='glow';m.receiveShadow=true;parent.add(m);return m;
 }
 const skin=(p,c,profile,pos=[0,0,0],rot=[0,0,0],kind='skin',name='')=>mesh(p,organicGeometry(profile),c,kind,pos,rot,name);
 const blade=(p,c,points,widths,depth=.035,kind='skin',normal=[0,0,1])=>mesh(p,bladeGeometry(points,widths,depth,13,normal),c,kind);
 const line=(p,c,points,r=.025,tip=.005,kind='skin')=>mesh(p,taperedCurve(points,r,tip,14,8),c,kind);
 const plate=(p,c,points,depth=.05,pos=[0,0,0],rot=[0,0,0],kind='metal',round=.025)=>mesh(p,armorGeometry(points,depth,round),c,kind,pos,rot);
 const membrane=(p,c,points,camber=.10,kind='skin')=>mesh(p,membraneGeometry(points,.025,camber),c,kind);
 const ball=(p,c,pos,size,kind='eye')=>kit.part(p,'ball',material(c,kind),pos,size);
 const ring=(p,c,pos,size,rot=[0,0,0],kind='metal')=>kit.part(p,'ring',material(c,kind),pos,size,rot);
 function form(p,c,pos,size,kind='skin',tilt=0){
  const [x,y,z]=size;
  return skin(p,c,[[0,x*.08,z*.10],[y*.15,x*.72,z*.68,-z*.06],[y*.40,x,z],[y*.70,x*.90,z*.92,z*.03],[y*.92,x*.54,z*.57],[y,x*.03,z*.04]],pos,[0,0,tilt],kind);
 }
 function skull(p,c,width=.30,height=.53,depth=.26){
  return skin(p,c,[[-height*.48,.03,.035,depth*.14],[-height*.34,width*.67,depth*.69,depth*.11],[-height*.10,width,depth*.98],[height*.18,width*.95,depth],[height*.40,width*.66,depth*.65,-depth*.04],[height*.51,.025,.02,-depth*.05]]);
 }
 function muzzle(p,c,width=.23,depth=.20,y=-.10,z=.20){
  return skin(p,c,[[-.12,.035,.035],[-.085,width*.78,depth*.70,depth*.14],[-.015,width,depth],[.075,width*.89,depth*.79],[.115,width*.48,depth*.40]], [0,y,z]);
 }
 function eyes(head,iris='#263b40',spacing=.15,y=.04,z=.25,size=.079,angry=false){
  for(const s of [-1,1]){
   const eye=joint(head,s*spacing,y,z,'expressive-eye');eye.rotation.y=s*.27;eye.rotation.z=s*(angry?-.16:-.05);
   ball(eye,'#fff1d1',[0,0,0],[size*1.06,size*1.30,size*.43]);
   ball(eye,iris,[s*-.012,-.004,size*.34],[size*.69,size*1.02,size*.23]);
   ball(eye,'#15252b',[s*-.014,-.009,size*.52],[size*.35,size*.75,size*.12]);
   ball(eye,'#ffffff',[-size*.24,size*.40,size*.63],[size*.22,size*.24,size*.08]);
   // Almond eyelids sit on the skull; they hide the round sphere edge.
   line(head,'#24313c',[[s*(spacing-size*.86),y+size*.57,z+.014],[s*spacing,y+size*1.16,z+.034],[s*(spacing+size*.85),y+size*.43,z-.01]],.018,.010);
   eyesRig.push(eye);
  }
 }
 function ear(head,c,inside,s,height=.46,width=.14){
  const p=joint(head,s*.205,.15,-.04);p.rotation.z=-s*.18;
  blade(p,c,[[0,-.02,0],[s*.025,height*.40,-.025],[s*.06,height*.78,-.03],[s*.08,height,0]],[.06,width,width*.66,.002],.065);
  blade(p,inside,[[0,.05,.056],[s*.024,height*.43,.048],[s*.065,height*.86,.024]],[.025,width*.60,.001],.018);
 }
 function fur(p,c,origin,tip,width=.10){
  const mid=origin.map((v,i)=>(v+tip[i])*.5);mid[2]+=.025;
  return blade(p,c,[origin,mid,tip],[width*.65,width,.001],.035);
 }
 function tail(c,points,r=.10,name='tail'){
  const node=joint(body,0,0,0,name);line(node,c,points,r,.009);tails.push({node,offset:0});return node;
 }
 function claw(p,x,y,z,color='#f2dfb8',size=.04){line(p,color,[[x,y,z],[x,y+.025,z+size*.8],[x,y-.012,z+size*1.8]],size*.55,.002,'metal');}
 function leg(x,z,height,c,width=.10,phase=0,foot=c,claws=true){
  const hip=joint(body,x,height,z,'hip'),upper=height*.54,lower=height*.55,knee=joint(hip,0,-upper,0,'knee');
  skin(hip,c,[[-upper-.035,width*.60,width*.64,.015],[-upper*.66,width*.81,width*.85,.005],[-upper*.27,width*1.17,width*1.10,-.025],[.035,width*.89,width*.85,-.01],[.075,.02,.02]], [0,0,0]);
  skin(knee,c,[[-lower+.015,width*.77,width*.87,.055],[-lower*.64,width*.73,width*.82,.01],[-lower*.25,width*.87,width*.95,-.01],[.045,width*.70,width*.80],[.075,.02,.02]]);
  skin(knee,foot,[[-lower-.045,.02,.03,.09],[-lower-.025,width*1.13,width*1.38,.095],[-lower+.025,width*1.28,width*1.65,.105],[-lower+.09,width*.87,width*1.07,.07],[-lower+.13,.025,.025,.01]]);
  if(claws)for(const n of [-1,0,1])claw(knee,n*width*.68,-lower+.01,width*1.58+.065,'#e9d9ad',width*.38);
  legs.push({hip,knee,upper,lower,height,phase,front:z>=0,side:Math.sign(x)});
 }
 function quad(h,c,w=.10,spread=.23,length=.27,foot=c,claws=true){for(const s of [-1,1])for(const front of [-1,1])leg(s*spread,front*length,h,c,w,s===front?0:Math.PI,foot,claws);}
 function pair(h,c,w=.08,spread=.15,foot=c,claws=true){leg(-spread,0,h,c,w,0,foot,claws);leg(spread,0,h,c,w,Math.PI,foot,claws);}
 function arm(s,c,y=.84,length=.40,width=.085){
  const node=joint(body,s*.29,y,.02,'shoulder'),elbow=joint(node,0,-length*.5,0,'elbow');
  skin(node,c,[[-length*.57,.025,.025],[-length*.45,width*.78,width*.81],[-length*.19,width*1.12,width],[.04,width*.72,width*.75],[.065,.02,.02]]);
  skin(elbow,c,[[-length*.62,.025,.025,.04],[-length*.49,width*.85,width*.90,.04],[-length*.24,width,width*.87,.015],[.035,width*.72,width*.72]]);
  const rig={node,elbow,sign:s,base:s*-.12};arms.push(rig);return rig;
 }
 function mouth(head,c,y=-.19,z=.30,width=.10){
  const j=joint(head,0,y,z,'jaw');line(j,c,[[-width,.015,0],[0,-.018,.013],[width,.015,0]],.014,.008);return j;
 }
 function shield(p,name,c,inner,pos,size=1,rot=[0,0,0]){
  const g=joint(p,...pos,name);g.rotation.set(...rot);g.scale.setScalar(size);
  const shape=[[-.20,.24],[0,.32],[.20,.24],[.18,-.09],[0,-.29],[-.18,-.09]];
  plate(g,c,shape,.06);plate(g,inner,shape.map(([x,y])=>[x*.77,y*.77]),.03,[0,0,.085]);return g;
 }

 let head,jaw,kind='quad',float=0,modelScale=.84;
 if(id===0){
  const green='#83ba87',light='#a4d6a2',ivory='#efe8cf',navy='#26394b';modelScale=.85;
  skin(body,green,[[.32,.14,.24,-.10],[.46,.31,.41,-.04],[.70,.39,.45],[.92,.32,.36,.09],[1.09,.21,.23,.20],[1.17,.08,.12,.26]]);
  quad(.47,green,.12,.28,.29,navy,false);
  const armor=joint(body,0,0,0,'orchard-leaf-shield');
  for(const s of [-1,1]){
   plate(armor,ivory,[[-.13,.19],[.02,.30],[.20,.09],[.15,-.19],[-.11,-.10]],.08,[s*.30,.88,.16],[0,s*.68,-s*.22]);
   plate(armor,ivory,[[-.13,.06],[.11,.10],[.16,-.15],[0,-.23],[-.16,-.11]],.055,[s*.125,.74,.39],[0,s*.27,0]);
   for(let n=0;n<3;n++)plate(armor,ivory,[[-.13,0],[.08,.06],[.12,-.14],[-.08,-.10]],.04,[s*.25,.89-n*.04,-.10-n*.17],[-.15,s*1.0,0]);
  }
  const sh=shield(armor,'leaf-emblem-shield','#c98d42','#a96c31',[-.35,.81,.37],.87,[0,-.65,-.08]);
  blade(sh,'#e6b75d',[[0,-.15,.15],[-.025,.02,.18],[.04,.20,.15]],[.012,.075,.001],.015,'metal');line(sh,'#ffe3a1',[[0,-.15,.18],[0,.02,.20],[.04,.17,.18]],.008,.003,'metal');
  head=joint(body,0,1.15,.37);skull(head,light,.29,.53,.27);muzzle(head,'#f2e5bd',.235,.16,-.12,.26);eyes(head,'#25433d',.155,.038,.24,.078);
  for(const s of [-1,1]){
   line(head,ivory,[[s*.20,.17,-.04],[s*.34,.23,-.065],[s*.39,.42,-.10],[s*.31,.57,-.015]],.095,.003,'metal');
   blade(head,green,[[s*.23,.06,-.03],[s*.35,.12,-.08],[s*.39,.20,-.09]],[.025,.09,.001],.04);
   ball(head,'#243943',[s*.092,-.105,.405],[.027,.020,.012]);
  }
  for(const [x,h]of [[-.09,.47],[.015,.55],[.11,.43]])blade(head,'#4f933b',[[x,.20,.10],[x-.04,.36,.10],[x-.10,h,.05]],[.045,.105,.002],.028);
  jaw=mouth(head,'#705642',-.22,.32,.105);const t=tail(green,[[0,.66,-.40],[.10,.75,-.66],[.13,.99,-.76]],.045,'orchard-tail');blade(t,'#468d3c',[[.13,.94,-.76],[.15,1.10,-.76],[.11,1.25,-.72]],[.025,.10,.001],.028);
 }
 if(id===1){
  const dark='#303340',red='#d83e41',cream='#f5e8d2';modelScale=.83;
  const torso=[[.29,.095,.20,-.11],[.42,.22,.36,-.06],[.63,.265,.42],[.82,.22,.30,.17],[1.03,.16,.18,.28],[1.10,.05,.06,.30]];skin(body,dark,torso);
  quad(.37,dark,.070,.20,.27,cream,false);
  mesh(body,skinPatchGeometry(torso,.40,.92,.88),cream);
  for(const s of [-1,1]){fur(body,red,[s*.10,.84,.25],[s*.26,.62,.37],.11);fur(body,red,[s*.12,.72,-.20],[s*.25,.55,-.29],.085);}
  head=joint(body,0,1.05,.33);skull(head,dark,.285,.48,.25);
  // Narrow swept muzzle, cheek ruff and tall hollow ears make a fox silhouette.
  skin(head,cream,[[0,.15,.085],[.08,.18,.095],[.18,.13,.075],[.28,.055,.035],[.30,.015,.015]], [0,-.075,.11],[Math.PI/2,0,0]);
  skin(head,dark,[[-.06,.035,.04,.31],[-.015,.065,.06,.33],[.025,.035,.03,.34]]);
  for(const s of [-1,1]){ear(head,dark,red,s,.49,.125);fur(head,cream,[s*.17,-.04,.18],[s*.34,-.09,.08],.095);fur(head,dark,[s*.20,-.015,.11],[s*.37,.035,.015],.08);fur(head,red,[s*.05,.17,.22],[s*.18,.04,.25],.05);}
  eyes(head,'#be393b',.145,.047,.224,.078,true);jaw=mouth(head,'#403137',-.155,.28,.095);
  const t=joint(body,0,0,-.18,'battery-tail');
  skin(t,red,[[.40,.04,.05,-.15],[.62,.12,.11,-.36],[.86,.22,.16,-.53],[1.10,.24,.16,-.57],[1.31,.15,.12,-.68],[1.48,.015,.015,-.85]]);
  for(const s of [-1,1]){fur(t,red,[s*.13,.91,-.49],[s*.34,1.08,-.57],.16);fur(t,red,[s*.10,1.18,-.63],[s*.22,1.37,-.68],.11);}
  blade(t,dark,[[0,.43,-.13],[0,.66,-.25],[0,.89,-.37],[0,1.03,-.36]],[.02,.10,.15,.001],.052);tails.push({node:t,offset:0});
  for(const s of [-1,1]){
   const coil=joint(body,s*.22,.78,.24);coil.rotation.z=-s*.33;
   skin(coil,'#8f9ca6',[[-.16,.04,.04],[-.13,.065,.065],[.13,.065,.065],[.16,.04,.04]], [0,0,0],[0,0,0],'metal');
   for(let n=0;n<4;n++)ring(coil,'#d6dcd7',[0,-.105+n*.07,0],[.067,.067,.067],[Math.PI/2,0,0]);
  }
 }
 if(id===2){
  const blue='#294571',ivory='#e8dfc3';modelScale=.85;
  skin(body,blue,[[.21,.13,.25],[.30,.37,.46],[.49,.40,.49],[.64,.29,.40],[.72,.10,.15]]);quad(.27,blue,.105,.31,.30,blue,true);
  const shell=joint(body,0,.54,-.055,'cloud-cube-shell');
  skin(shell,ivory,[[-.20,.27,.34],[-.12,.46,.52],[.02,.47,.53],[.23,.34,.40],[.31,.10,.13]]);
  // The reference intentionally has cloud cubes; their chamfered ledges sit on
  // a continuous tortoise carapace instead of replacing its anatomy.
  for(const [x,y,z,w,h]of [[-.27,.30,.16,.25,.23],[.03,.38,.17,.26,.24],[.29,.28,.12,.23,.24],[-.23,.52,-.16,.26,.27],[.07,.66,-.18,.29,.27],[.29,.48,-.19,.22,.24],[-.22,.25,-.43,.24,.22],[.08,.35,-.43,.26,.25]]){
   plate(shell,'#a1d5ed',[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],w,[x,y,z],[0,0,0],'skin',.018);
  }
  for(const [x,y,z]of [[-.30,.42,.37],[.14,.83,.06],[.33,.51,-.25]])plate(shell,'#3fc2e0',[[-.06,-.065],[.06,-.065],[.06,.065],[-.06,.065]],.10,[x,y,z],[0,0,0],'glow',.008);
  head=joint(body,0,.63,.50);skull(head,blue,.27,.40,.27);muzzle(head,ivory,.23,.13,-.08,.22);eyes(head,'#273b43',.15,.048,.238,.077);jaw=mouth(head,'#5a5b4e',-.17,.28,.13);
  tail(blue,[[0,.34,-.47],[.035,.31,-.68],[.10,.36,-.81]],.075,'cloud-tail');
  for(let n=0;n<3;n++)plate(body,ivory,[[-.25,.025],[.25,.025],[.20,-.05],[-.20,-.05]],.025,[0,.38-n*.06,.35],[0,0,0],'skin',.012);
 }
 if(id===3){
  const blue='#2557a7',cream='#f2e6c5',red='#bf3842';kind='biped';modelScale=.85;
  const torso=[[.20,.07,.08],[.29,.26,.23],[.53,.345,.29],[.83,.29,.25],[1.04,.17,.18],[1.09,.05,.05]];skin(body,blue,torso);
  mesh(body,skinPatchGeometry(torso,.11,.86,1.03),cream);
  head=joint(body,0,1.06,.045);skull(head,blue,.30,.53,.27);muzzle(head,cream,.24,.12,-.08,.17);eyes(head,'#3266a6',.14,.048,.24,.091);
  blade(head,'#e7ac37',[[0,-.01,.29],[0,-.045,.39],[0,-.095,.43]],[.09,.065,.001],.037,'metal');jaw=mouth(head,'#a87429',-.108,.355,.062);pair(.20,'#d7a13b',.085,.16,'#d7a13b',false);
  const lens=joint(head,-.14,.048,.286,'lens-monocle');ring(lens,'#d7a842',[0,0,0],[.134,.15,.10]);ring(lens,'#ffe4a0',[0,0,.015],[.115,.13,.07]);line(head,'#bb8b32',[[-.27,.05,.24],[-.31,.01,.12],[-.29,-.08,.05]],.018,.012,'metal');
  // A shaped scarf collar and two flowing cloth tails, rather than a torus.
  skin(body,red,[[.88,.22,.23,.025],[.925,.29,.29,.025],[.995,.27,.27,.025],[1.025,.20,.20,.025]]);
  blade(body,red,[[-.20,.96,-.03],[-.40,.90,-.13],[-.50,.69,-.30]],[.08,.12,.075],.026);blade(body,red,[[-.20,.96,-.10],[-.38,1.0,-.29],[-.56,.93,-.38]],[.06,.105,.07],.023);
  plate(head,'#d9aa3c',[[0,.08],[-.08,0],[0,-.06],[.08,0]],.025,[0,.36,-.01],[0,0,-.3]);
  for(const s of [-1,1]){
   const node=joint(body,s*.27,.80,.01),tip=joint(node,s*.045,-.23,0);node.rotation.z=s*.17;
   blade(node,blue,[[0,.05,0],[s*.10,-.14,.05],[s*.12,-.38,.13]],[.07,.135,.001],.055);line(node,cream,[[s*.07,-.11,.11],[s*.15,-.28,.15],[s*.12,-.37,.13]],.013,.002);wings.push({node,tip,sign:s,style:'fin'});
  }
 }
 if(id===4){
  const orange='#df9950',cream='#ffedc9',teal='#2699b0';kind='fly';float=.58;modelScale=.67;
  skin(body,orange,[[.31,.055,.05],[.41,.18,.19],[.64,.24,.22],[.82,.20,.17],[.94,.08,.08]]);blade(body,cream,[[0,.38,.16],[0,.59,.23],[0,.80,.16]],[.05,.17,.08],.03);
  head=joint(body,0,.99,.09);skull(head,orange,.28,.46,.24);muzzle(head,cream,.21,.12,-.10,.18);ear(head,orange,'#c57051',-1,.35,.115);ear(head,orange,'#c57051',1,.35,.115);eyes(head,'#3d3324',.142,.034,.225,.080);ball(head,'#2e2a29',[0,-.065,.325],[.043,.03,.024]);jaw=mouth(head,'#73402d',-.15,.28,.075);
  quad(.29,orange,.050,.17,.14,cream,false);
  const pack=joint(body,0,.48,.32,'parcel-gliders');plate(pack,'#c59a60',[[-.14,-.13],[.14,-.13],[.14,.13],[-.14,.13]],.24,[0,0,0],[0,0,0],'skin',.012);plate(pack,'#efd4a2',[[-.017,-.12],[.017,-.12],[.017,.12],[-.017,.12]],.006,[0,0,.26],[0,0,0],'skin',.003);
  for(const s of [-1,1]){
   const node=joint(body,s*.17,.77,-.08),tip=joint(node,.46,.09,.02);node.scale.x=s;
   membrane(node,teal,[[0,0],[.18,-.25],[.64,-.53],[.99,-.42],[.83,-.10],[.78,.17],[.56,.06],[.43,.29],[.25,.14]],.13);
   for(const [x,z]of [[.64,-.53],[.99,-.42],[.78,.17],[.43,.29]])line(node,'#e2ad59',[[0,.01,0],[x*.5,.13,z*.48],[x,.025,z]],.023,.004);
   // The distal wing really articulates with its own weighted edge.
   blade(tip,teal,[[0,.0,.02],[.25,.05,.05],[.43,-.03,.12]],[.015,.09,.001],.028,'skin',[0,1,0]);wings.push({node,tip,sign:s,style:'bat',restRoll:.27,restPitch:.12});
  }
 }
 if(id===5){
  const green='#3e674b',dark='#243c36',trim='#b78940',glow='#61f7aa';kind='golem';modelScale=.86;
  skin(body,dark,[[.44,.13,.16],[.60,.235,.23],[.80,.31,.27],[1.03,.40,.28],[1.18,.29,.22],[1.26,.12,.13]]);
  plate(body,green,[[-.35,.15],[0,.26],[.35,.15],[.24,-.18],[0,-.32],[-.24,-.18]],.09,[0,.93,.20],[0,0,0],'metal',.04);
  plate(body,'#70934d',[[-.22,.17],[0,.07],[.22,.17],[.16,-.07],[0,-.15],[-.16,-.07]],.025,[0,.93,.31],[0,0,0],'metal',.014);
  plate(body,glow,[[0,.17],[-.11,0],[0,-.14],[.11,0]],.045,[0,.83,.37],[0,0,0],'glow',.006);
  pair(.48,dark,.135,.22,dark,false);
  for(const l of legs){plate(l.hip,green,[[-.12,.07],[.13,.07],[.15,-.13],[0,-.25],[-.13,-.16]],.06,[0,-.10,.11]);plate(l.knee,green,[[-.10,.04],[.12,.04],[.13,-.15],[-.10,-.18]],.075,[0,-.10,.13]);for(const x of [-.07,.02,.10])claw(l.knee,x,-l.lower+.035,.22,trim,.07);}
  head=joint(body,0,1.42,.02);skull(head,dark,.24,.44,.21);
  plate(head,'#426851',[[-.20,.12],[0,.23],[.20,.12],[.17,-.14],[0,-.23],[-.17,-.14]],.07,[0,0,.15],[0,0,0],'metal',.025);
  plate(head,'#172c2b',[[-.19,.045],[0,-.025],[.19,.045],[.15,-.052],[0,-.10],[-.15,-.052]],.012,[0,.035,.243],[0,0,0],'metal',.006);
  plate(head,glow,[[-.17,.035],[0,-.03],[.17,.035],[.14,-.018],[0,-.067],[-.14,-.018]],.014,[0,.035,.264],[0,0,0],'glow',.003);
  const chips=joint(body,0,0,0,'tensor-chip-shoulders');
  for(const s of [-1,1]){
   const a=arm(s,dark,1.10,.58,.13);
   plate(chips,dark,[[-.23,.16],[.12,.21],[.25,.06],[.20,-.22],[-.16,-.25],[-.25,-.06]],.29,[s*.43,1.12,-.13],[0,s*.16,-s*.15],'metal',.045);
   plate(chips,green,[[-.16,.11],[.11,.15],[.17,.01],[.12,-.16],[-.13,-.17]],.03,[s*.43,1.12,.21],[0,s*.15,-s*.15],'metal',.022);
   for(let n=0;n<4;n++)plate(chips,trim,[[-.035,-.024],[.035,-.024],[.035,.024],[-.035,.024]],.025,[s*.65,1.25-n*.09,.19],[0,0,-s*.12],'metal',.006);
   plate(a.elbow,green,[[-.15,.09],[.14,.09],[.18,-.18],[.08,-.30],[-.14,-.26]],.14,[0,-.10,.04],[0,0,0],'metal',.028);
   for(const x of [-.10,0,.10])line(a.elbow,trim,[[x,-.28,.15],[x,-.43,.21],[x,-.47,.31]],.052,.007,'metal');
  }
  jaw=mouth(head,'#152a28',-.17,.25,.09);
 }
 if(id===6){
  const green='#8ebd76',cream='#eee8cd',red='#c8484b';kind='biped';modelScale=.82;
  skin(body,green,[[.21,.06,.07],[.31,.21,.21],[.55,.24,.22],[.78,.22,.20],[.90,.10,.12]]);pair(.27,green,.075,.16,green,false);
  // Flared coat panels follow a waist and split around the leg articulation.
  for(const s of [-1,1])plate(body,cream,[[0,.26],[s*.18,.19],[s*.28,-.20],[s*.13,-.29],[0,-.17]],.05,[0,.55,.18],[0,s*.12,0],'skin',.025);
  for(const s of [-1,1])line(body,red,[[s*.05,.81,.24],[s*.13,.59,.27],[s*.25,.34,.25]],.024,.018);
  head=joint(body,0,1.00,.045);skull(head,green,.35,.40,.25);muzzle(head,'#f0e6b7',.29,.12,-.10,.18);
  for(const s of [-1,1])form(head,green,[s*.20,.08,.025],[.115,.24,.13]);eyes(head,'#64502b',.20,.145,.207,.092);jaw=mouth(head,'#526741',-.16,.27,.19);
  for(const s of [-1,1]){
   const a=arm(s,cream,.80,.34,.081);form(a.elbow,green,[0,-.24,.035],[.09,.14,.08]);
   for(let n=0;n<3;n++)line(a.elbow,green,[[n*.035-.035,-.15,.10],[n*.035-.035,-.20,.15],[n*.035-.035,-.25,.12]],.018,.009);
   for(let n=0;n<4;n++)blade(body,red,[[s*.22,.80,.12],[s*(.21+.055*Math.cos(n*1.6)),.91+.04*Math.sin(n*1.6),.13],[s*.20,.95,.13]],[.035,.073,.001],.035);
  }
  plate(body,'#d7aa40',[[-.10,-.025],[.10,-.025],[.10,.025],[-.10,.025]],.025,[0,.76,.28]);
  const staff=joint(arms[1].elbow,.11,-.12,.16,'vital-lily-staff');line(staff,'#775232',[[0,-.52,0],[.025,.10,0],[.10,.60,0],[.13,.71,0]],.037,.020);
  for(let n=0;n<6;n++){
   const a=n/6*Math.PI*2,petal=joint(staff,.13,.64,0);petal.rotation.z=a;
   blade(petal,'#df6258',[[0,0,0],[.08,.15,-.015],[0,.33,-.03],[-.06,.23,.03]],[.025,.10,.08,.001],.028);
   line(petal,'#f8ce6f',[[0,0,.05],[.04,.11,.06],[.025,.18,.08]],.010,.004);
  }
  blade(staff,'#4d8b3e',[[.04,.35,0],[-.11,.42,.015],[-.16,.53,0]],[.01,.08,.001],.02);extras.push({node:staff,type:'staff',phase:0});
 }
 if(id===7){
  const indigo='#474889',lilac='#9999d0',cyan='#4cc8e6';kind='fly';float=.47;modelScale=.80;
  skin(body,indigo,[[.27,.07,.14,-.09],[.39,.25,.34,-.04],[.66,.29,.37],[.86,.21,.28,.16],[1.13,.16,.16,.25],[1.20,.04,.05,.27]]);quad(.34,indigo,.075,.22,.25,indigo,true);
  for(let n=0;n<5;n++)blade(body,lilac,[[0,.36+n*.10,.28],[0,.40+n*.10,.33],[0,.46+n*.10,.28]],[.06,.18-n*.013,.05],.025);
  head=joint(body,0,1.14,.33);skull(head,indigo,.265,.45,.25);muzzle(head,lilac,.205,.17,-.08,.24);eyes(head,'#3b6c9c',.14,.045,.231,.074,true);jaw=joint(head,0,-.18,.24);skin(jaw,lilac,[[-.05,.02,.02],[0,.17,.12,.045],[.045,.15,.13,.045],[.07,.02,.02,.04]]);
  for(const s of [-1,1]){
   line(head,lilac,[[s*.14,.17,-.04],[s*.22,.28,-.13],[s*.25,.39,-.25],[s*.15,.48,-.34]],.075,.002);
   for(let n=0;n<3;n++)fur(head,indigo,[s*.18,.12-n*.07,-.02],[s*(.34-n*.025),.20-n*.095,-.15],.085);
   ball(head,'#2b3551',[s*.07,-.04,.385],[.018,.012,.009]);
  }
  const t=tail(indigo,[[0,.58,-.35],[.12,.61,-.64],[.33,.83,-.78],[.38,1.09,-.72],[.23,1.21,-.61],[.09,1.14,-.59]],.12,'portal-tail');
  line(t,lilac,[[.01,.60,-.47],[.12,.68,-.72],[.32,.87,-.84],[.34,1.08,-.75],[.22,1.14,-.62]],.035,.008);
  for(let n=0;n<4;n++)blade(body,lilac,[[0,.88-n*.07,-.22-n*.08],[0,1.05-n*.055,-.25-n*.08],[0,1.12-n*.065,-.29-n*.08]],[.025,.07,.001],.025);
  const portal=joint(body,0,0,0,'portal-wings');
  for(const s of [-1,1]){
   const node=joint(portal,s*.20,.91,-.08),tip=joint(node,.48,.12,-.07);node.scale.x=s;
   membrane(node,'#319abd',[[0,0],[.18,-.26],[.54,-.72],[.91,-.86],[.88,-.43],[1.03,-.26],[.80,-.08],[.72,.22],[.44,.11],[.22,.30]],.19);
   for(const [x,z]of [[.91,-.86],[1.03,-.26],[.72,.22],[.22,.30]])line(node,cyan,[[0,.025,0],[x*.48,.20,z*.44],[x,.03,z]],.022,.005,'glow');
   for(let n=0;n<3;n++)line(node,'#70dbef',[[.23+n*.16,.13,-.04],[.34+n*.15,.16,-.24],[.36+n*.16,.12,-.46-n*.08]],.008,.003,'glow');
   ring(node,'#42cfe9',[.60,.17,-.34],[.14,.14,.14],[Math.PI/2,0,0],'glow');ring(node,'#b1f5ff',[.60,.18,-.34],[.108,.108,.108],[Math.PI/2,0,0],'glow');
   blade(tip,indigo,[[0,0,0],[.22,.025,-.13],[.40,-.04,-.20]],[.025,.08,.001],.025,'skin',[0,1,0]);wings.push({node,tip,sign:s,style:'bat',restRoll:.49,restPitch:.18});
  }
 }
 if(id===8){
  const blue='#354b75',brass='#bc9145',ivory='#eaddbd';modelScale=.84;
  skin(body,blue,[[.28,.11,.21,-.08],[.42,.34,.43,-.04],[.68,.41,.48],[.93,.33,.38,.11],[1.10,.21,.24,.24],[1.17,.06,.06,.26]]);quad(.41,blue,.12,.29,.28,blue,true);
  const armor=joint(body,0,0,0,'vault-armor');
  for(const s of [-1,1]){
   const a=shield(armor,'vault-pauldrons',brass,'#344454',[s*.35,.83,.25],1,[0,s*.63,-s*.08]);
   plate(a,brass,[[-.095,.17],[.10,.17],[.13,-.10],[-.10,-.10]],.018,[0,0,.13],[0,0,0],'metal',.01);
   plate(a,'#26394b',[[-.065,.13],[.068,.13],[.08,-.07],[-.07,-.07]],.018,[0,0,.155],[0,0,0],'metal',.008);
   ring(a,brass,[0,.075,.188],[.032,.032,.032]);plate(a,brass,[[-.015,-.01],[.015,-.01],[.015,.03],[-.015,.03]],.012,[0,-.03,.19]);
   for(const [x,y]of [[-.13,.16],[.13,.16],[-.11,-.08],[.11,-.08]])ball(a,'#e2bc72',[x,y,.14],[.018,.018,.009],'metal');
   plate(armor,brass,[[-.12,.18],[.14,.18],[.16,-.17],[-.10,-.14]],.07,[s*.28,.95,-.20],[0,s*1.1,0]);
  }
  head=joint(body,0,1.10,.37);skull(head,blue,.31,.51,.29);muzzle(head,ivory,.24,.18,-.10,.28);eyes(head,'#28394a',.17,.045,.24,.075,true);
  for(const s of [-1,1])ear(head,blue,'#263852',s,.23,.09);
  line(head,ivory,[[0,-.04,.43],[0,.11,.49],[0,.28,.46],[0,.45,.36]],.105,.002,'metal');
  line(head,brass,[[-.14,.08,.35],[0,.04,.43],[.14,.08,.35]],.022,.016,'metal');jaw=mouth(head,'#5a5c5a',-.23,.37,.12);tail(blue,[[0,.61,-.44],[.11,.59,-.64],[.13,.42,-.74]],.05,'vault-tail');
 }
 if(id===9){
  const dark='#373541',red='#c63c4c',cream='#efdfc3';kind='fly';float=.66;modelScale=.67;
  skin(body,dark,[[.20,.025,.03,-.04],[.35,.13,.14],[.59,.19,.21],[.84,.15,.18],[.97,.07,.08]]);
  for(const s of [-1,1])for(let n=0;n<4;n++)fur(body,n%2?'#49454f':dark,[s*.09,.74-n*.12,.14],[s*.23,.58-n*.12,.04],.09);
  head=joint(body,0,1.03,.075);skull(head,cream,.245,.43,.22);eyes(head,'#803841',.13,.035,.195,.079);jaw=mouth(head,'#634143',-.14,.23,.055);pair(.23,dark,.04,.105,dark,false);
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
     plate(node,'#ee7168',[[-.021,-.028],[.021,-.028],[.021,.028],[-.021,.028]],.006,[x,.10,z],[-Math.PI/2,0,k===0?-.75:.60],'skin',.004);
    }
   }
   blade(tip,red,[[0,0,0],[.20,.025,-.19],[.36,-.03,-.34]],[.035,.10,.001],.02,'skin',[0,1,0]);wings.push({node,tip,sign:s,style:'moth',restRoll:.48,restPitch:.16});
  }
 }
 if(id===10){
  const gold='#e8b632',red='#ce3b41';kind='slime';modelScale=.86;
  skin(body,gold,[[.04,.18,.20],[.08,.48,.43],[.19,.44,.38],[.40,.38,.33],[.65,.30,.26],[.82,.15,.14],[.86,.025,.025]],[0,0,0],[0,0,0],'gel');
  for(const s of [-1,1])form(body,gold,[s*.38,.035,.12],[.17,.12,.17],'gel');
  head=joint(body,0,.59,.24);blade(head,'#f9dc85',[[0,-.20,.02],[0,-.025,.08],[0,.19,-.025]],[.06,.235,.04],.033,'gel');eyes(head,'#593921',.135,-.01,.132,.077);jaw=joint(head,0,-.12,.18);blade(jaw,'#6c3730',[[-.06,.025,0],[0,-.04,.01],[.07,.03,0]],[.015,.043,.001],.013,'eye');ball(jaw,'#f48471',[.005,-.029,.02],[.035,.017,.009]);
  // Folded paper collar has a wavy upper edge and separate folded corners.
  plate(body,red,[[-.43,.16],[-.16,.11],[0,.05],[.17,.11],[.43,.16],[.38,-.16],[-.38,-.16]],.11,[0,.31,.29],[0,0,0],'skin',.018);
  for(const s of [-1,1])plate(body,red,[[-.11,.15],[.11,.10],[.09,-.16],[-.08,-.16]],.16,[s*.35,.31,.05],[0,s*.9,-s*.06],'skin',.014);
  const crown=joint(body,0,0,0,'fry-crown');
  for(const [x,y,z,a,h]of [[-.22,.89,-.08,.35,.26],[0,1.02,-.08,-.09,.36],[.20,.94,-.10,-.28,.29],[-.10,1.09,-.14,.20,.34]]){
   plate(crown,'#eec353',[[-.046,0],[.046,0],[.052,h],[-.03,h+.04]],.07,[x,y-.10,z],[0,0,a],'skin',.014);
   line(crown,'#ffdd78',[[x-.022,y-.02,z+.09],[x-.022+Math.sin(-a)*.15,y+.13,z+.09]],.008,.006);
  }
  blade(body,'#ffe4a0',[[-.24,.42,.25],[-.26,.56,.22],[-.19,.68,.18]],[.012,.035,.003],.008,'gel');
 }
 if(id===11){
  const jade='#3f754b',light='#c8db9b',cream='#eee4c4',dark='#28553a';kind='fly';float=.59;modelScale=.77;
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

 // Each material is baked per animated joint, never across a knee/wing hinge.
 // Instances share these templates; only their poses and reaction materials vary.
 for(const w of wings){w.node.rotation.z=w.sign*(w.restRoll||0);w.node.rotation.x=w.restPitch||0;}
 batchJointSurfaces(root,owned);
 root.traverse(o=>{
  if(!o.isMesh||o.userData.outline||o.material.userData.baseGlow||o.material.roughness<.3)return;
  o.geometry.computeBoundingBox();const v=o.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(o.scale);
  if(v.x*v.y*v.z>.065){const outline=new THREE.Mesh(o.geometry,kit.outlineMaterial);outline.name='silhouette';outline.userData.outline=true;outline.scale.setScalar(1.018);o.add(outline);}
 });
 root.scale.setScalar(modelScale);
 return {id,root,body,head,jaw,eyesRig,legs,wings,tails,arms,extras,materials,owned,kind,float,modelScale,swim:false,phase:0};
}
