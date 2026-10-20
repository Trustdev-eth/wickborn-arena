import {skinPatchGeometry} from './anatomy.js';

export function sculptFighters0to5(id,t){
 const {body,kit,joint,mesh,skin,blade,line,plate,membrane,ball,ring,form,skull,muzzle,eyes,ear,fur,tail,claw,quad,pair,arm,mouth,shield,material,legs,arms,wings,tails,secondary,extras}=t;
 let head,jaw,kind='quad',float=0,modelScale=.84;
 if(id===0){
  const green='#38954c',light='#77bd68',ivory='#fff0ce',navy='#254a3b';modelScale=.85;
  skin(body,green,[[.32,.14,.24,-.10],[.46,.31,.41,-.04],[.70,.39,.45],[.92,.32,.36,.09],[1.09,.21,.23,.20],[1.17,.08,.12,.26]]);
  quad(.47,green,.12,.28,.29,navy,false);
  const armor=joint(body,0,0,0,'orchard-leaf-shield');
  for(const s of [-1,1]){
   plate(armor,ivory,[[-.13,.19],[.02,.30],[.20,.09],[.15,-.19],[-.11,-.10]],.08,[s*.30,.88,.16],[0,s*.68,-s*.22]);
   plate(armor,ivory,[[-.13,.06],[.11,.10],[.16,-.15],[0,-.23],[-.16,-.11]],.055,[s*.125,.74,.39],[0,s*.27,0]);
  }
  const sh=shield(armor,'leaf-emblem-shield','#d6a453','#b47b39',[-.35,.77,.41],1.03,[0,-.60,-.08]);
  blade(sh,'#f6d17f',[[0,-.19,.16],[-.025,.01,.21],[.04,.21,.16]],[.012,.13,.001],.026,'metal');line(sh,'#fff0ba',[[0,-.17,.20],[0,.02,.24],[.04,.18,.20]],.010,.003,'metal');
  head=joint(body,0,1.065,.45);skull(head,light,.29,.53,.27);muzzle(head,'#f2e5bd',.235,.16,-.12,.26);eyes(head,'#25433d',.155,.038,.24,.078);
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
  head=joint(body,0,.94,.46);skull(head,dark,.285,.48,.25);
  // Narrow swept muzzle, cheek ruff and tall hollow ears make a fox silhouette.
  skin(head,cream,[[0,.15,.085],[.08,.18,.095],[.18,.13,.075],[.28,.055,.035],[.30,.015,.015]], [0,-.075,.11],[Math.PI/2,0,0]);
  skin(head,dark,[[-.06,.035,.04,.31],[-.015,.065,.06,.33],[.025,.035,.03,.34]]);
  for(const s of [-1,1]){ear(head,dark,red,s,.49,.125);fur(head,cream,[s*.17,-.04,.18],[s*.34,-.09,.08],.095);fur(head,dark,[s*.20,-.015,.11],[s*.37,.035,.015],.08);fur(head,red,[s*.05,.17,.22],[s*.18,.04,.25],.05);}
  eyes(head,'#be393b',.145,.047,.224,.078,true);jaw=mouth(head,'#403137',-.155,.28,.095);
  const pivot=joint(body,0,.42,-.33,'battery-tail'),t=joint(pivot,0,-.42,.15);
  skin(t,red,[[.40,.04,.05,-.15],[.62,.12,.11,-.36],[.86,.22,.16,-.53],[1.10,.24,.16,-.57],[1.31,.15,.12,-.68],[1.48,.015,.015,-.85]]);
  for(const s of [-1,1]){fur(t,red,[s*.13,.91,-.49],[s*.34,1.08,-.57],.16);fur(t,red,[s*.10,1.18,-.63],[s*.22,1.37,-.68],.11);}
  blade(t,dark,[[0,.43,-.13],[0,.66,-.25],[0,.89,-.37],[0,1.03,-.36]],[.02,.10,.15,.001],.052);tails.push({node:pivot,offset:0});
  for(const s of [-1,1]){
   const coil=joint(body,s*.21,.87,-.01);coil.rotation.x=Math.PI/2;
   skin(coil,'#c7d5da',[[-.24,.075,.075],[-.20,.10,.10],[.20,.10,.10],[.24,.075,.075]], [0,0,0],[0,0,0],'metal');
   for(let n=0;n<3;n++)ring(coil,'#718793',[0,-.16+n*.16,0],[.103,.103,.103],[Math.PI/2,0,0]);
  }
 }
 if(id===2){
  const blue='#2365b8',ivory='#fff1d1';modelScale=.85;
  skin(body,blue,[[.21,.13,.25],[.30,.37,.46],[.49,.40,.49],[.64,.29,.40],[.72,.10,.15]]);quad(.27,blue,.105,.31,.30,blue,true);
  const shell=joint(body,0,.54,-.055,'cloud-cube-shell');
  skin(shell,ivory,[[-.20,.27,.34],[-.12,.46,.52],[.02,.47,.53],[.23,.34,.40],[.31,.10,.13]]);
  skin(shell,'#397bcb',[[-.10,.34,.40],[.02,.44,.49],[.22,.32,.38],[.29,.12,.16]]);
  // Exactly three little cloud fortresses, with chamfered cream parapets.
  for(const [x,y,z,w,h]of [[-.27,.28,.02,.26,.35],[.02,.39,-.20,.30,.52],[.28,.26,.02,.25,.31]]){
   const tower=joint(shell,x,y,z,'cloud-fortress');
   plate(tower,'#579edc',[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]],w,[0,0,0],[0,0,0],'skin',.028);
   plate(tower,ivory,[[-w*.58,-.045],[w*.58,-.045],[w*.58,.045],[-w*.58,.045]],w*1.08,[0,h*.50,-.01],[0,0,0],'skin',.016);
   for(const s of [-1,1])plate(tower,ivory,[[-.035,0],[.035,0],[.035,.09],[-.035,.09]],.085,[s*w*.42,h*.52,w*.84],[0,0,0],'skin',.01);
   plate(tower,'#173d7c',[[-.037,-.065],[.037,-.065],[.037,.065],[-.037,.065]],.016,[0,.01,w+.01],[0,0,0],'skin',.012);
  }
  head=joint(body,0,.63,.50);skull(head,blue,.27,.40,.27);muzzle(head,ivory,.23,.13,-.08,.22);eyes(head,'#273b43',.15,.048,.238,.077);jaw=mouth(head,'#5a5b4e',-.17,.28,.13);
  tail(blue,[[0,.34,-.47],[.035,.31,-.68],[.10,.36,-.81]],.075,'cloud-tail');
  for(let n=0;n<3;n++)plate(body,ivory,[[-.25,.025],[.25,.025],[.20,-.05],[-.20,-.05]],.025,[0,.38-n*.06,.35],[0,0,0],'skin',.012);
 }
 if(id===3){
  const blue='#226cc4',cream='#fff1d0',red='#e04a45';kind='biped';modelScale=.85;
  const torso=[[.20,.07,.08],[.29,.26,.23],[.53,.345,.29],[.83,.29,.25],[1.04,.17,.18],[1.09,.05,.05]];skin(body,blue,torso);
  mesh(body,skinPatchGeometry(torso,.11,.86,1.03),cream);
  head=joint(body,0,1.06,.045);skull(head,blue,.30,.53,.27);muzzle(head,cream,.24,.12,-.08,.17);eyes(head,'#3266a6',.14,.048,.24,.091);
  blade(head,'#e7ac37',[[0,-.01,.29],[0,-.045,.39],[0,-.095,.43]],[.09,.065,.001],.037,'metal');jaw=mouth(head,'#a87429',-.108,.355,.062);pair(.20,'#d7a13b',.085,.16,'#d7a13b',false);
  const lens=joint(head,-.14,.048,.286,'lens-monocle');ring(lens,'#d7a842',[0,0,0],[.134,.15,.10]);ring(lens,'#ffe4a0',[0,0,.015],[.115,.13,.07]);line(head,'#bb8b32',[[-.27,.05,.24],[-.31,.01,.12],[-.29,-.08,.05]],.018,.012,'metal');
  // A shaped scarf collar and two flowing cloth tails, rather than a torus.
  skin(body,red,[[.88,.22,.23,.025],[.925,.29,.29,.025],[.995,.27,.27,.025],[1.025,.20,.20,.025]],[0,0,0],[0,0,0],'cloth');
  const cloth=joint(body,-.20,.96,-.03,'scarf-tails'),clothArt=joint(cloth,.20,-.96,.03);
  blade(clothArt,red,[[-.20,.96,-.03],[-.40,.90,-.13],[-.50,.69,-.30]],[.08,.12,.075],.026,'cloth');blade(clothArt,red,[[-.20,.96,-.10],[-.38,1.0,-.29],[-.56,.93,-.38]],[.06,.105,.07],.023,'cloth');secondary.push({node:cloth,type:'cloth',sign:1,baseX:0,baseY:0,baseZ:0});
  plate(head,'#d9aa3c',[[0,.08],[-.08,0],[0,-.06],[.08,0]],.025,[0,.36,-.01],[0,0,-.3]);
  for(const s of [-1,1]){
   const node=joint(body,s*.27,.80,.01),tip=joint(node,s*.045,-.23,0);node.rotation.z=s*.17;
   blade(node,blue,[[0,.05,0],[s*.10,-.14,.05],[s*.12,-.38,.13]],[.07,.135,.001],.055);line(node,cream,[[s*.07,-.11,.11],[s*.15,-.28,.15],[s*.12,-.37,.13]],.013,.002);wings.push({node,tip,sign:s,style:'fin'});
   if(s===-1){const scope=joint(node,-.11,-.24,.18,'brass-telescope');scope.rotation.x=Math.PI/2;
    skin(scope,'#d8ab52',[[-.24,.075,.075],[-.20,.10,.10],[.16,.085,.085],[.23,.06,.06]], [0,0,0],[0,0,0],'metal');
    for(const y of [-.21,.15])ring(scope,'#ffe3a1',[0,y,0],[.103,.103,.103],[Math.PI/2,0,0]);
    ball(scope,'#214570',[0,-.242,0],[.075,.008,.075]);
   }
  }
 }
 if(id===4){
  const orange='#ed9637',cream='#fff0cc',teal='#289ca7';kind='fly';float=.58;modelScale=.67;
  skin(body,orange,[[.31,.055,.05],[.41,.18,.19],[.64,.24,.22],[.82,.20,.17],[.94,.08,.08]]);blade(body,cream,[[0,.38,.16],[0,.59,.23],[0,.80,.16]],[.05,.17,.08],.03);
  head=joint(body,0,.99,.09);skull(head,orange,.28,.46,.24);muzzle(head,cream,.21,.12,-.10,.18);ear(head,orange,'#c57051',-1,.35,.115);ear(head,orange,'#c57051',1,.35,.115);eyes(head,'#3d3324',.142,.034,.225,.080);ball(head,'#2e2a29',[0,-.065,.325],[.043,.03,.024]);jaw=mouth(head,'#73402d',-.15,.28,.075);
  quad(.29,orange,.050,.17,.14,cream,false);
  const pack=joint(body,0,.48,.32,'parcel-gliders');plate(pack,'#c59a60',[[-.14,-.13],[.14,-.13],[.14,.13],[-.14,.13]],.24,[0,0,0],[0,0,0],'skin',.012);plate(pack,'#efd4a2',[[-.017,-.12],[.017,-.12],[.017,.12],[-.017,.12]],.006,[0,0,.26],[0,0,0],'skin',.003);
  for(const s of [-1,1]){
   const node=joint(body,s*.17,.77,-.08),tip=joint(node,.46,.09,.02);node.scale.x=s;
   membrane(node,teal,[[0,0],[.30,-.34],[.68,-.45],[.93,-.25],[.82,.08],[.51,.32],[.20,.21]],.13);
   for(const [x,z]of [[.68,-.45],[.93,-.25],[.51,.32]])line(node,'#f8be65',[[0,.01,0],[x*.5,.13,z*.48],[x,.025,z]],.023,.004);
   // The distal wing really articulates with its own weighted edge.
   blade(tip,teal,[[0,.0,.02],[.25,.05,.05],[.43,-.03,.12]],[.015,.09,.001],.028,'skin',[0,1,0]);wings.push({node,tip,sign:s,style:'bat',restRoll:.27,restPitch:.12});
  }
  const t=tail(orange,[[0,.45,-.17],[.06,.48,-.53],[.16,.77,-.72],[.13,1.06,-.68],[.01,1.14,-.49]],.16,'courier-tail');
  line(t,cream,[[.15,.78,-.75],[.13,1.03,-.71],[.01,1.12,-.50]],.075,.02);
 }
 if(id===5){
  const green='#8abf38',dark='#1e5745',trim='#c88d42',glow='#a8ffd0';kind='golem';modelScale=.86;
  skin(body,dark,[[.44,.13,.16],[.60,.235,.23],[.80,.31,.27],[1.03,.40,.28],[1.18,.29,.22],[1.26,.12,.13]]);
  plate(body,green,[[-.35,.15],[0,.26],[.35,.15],[.24,-.18],[0,-.32],[-.24,-.18]],.09,[0,.93,.20],[0,0,0],'metal',.04);
  plate(body,'#397b4b',[[-.22,.17],[.22,.17],[.22,-.15],[-.22,-.15]],.045,[0,.93,.31],[0,0,0],'metal',.022);
  plate(body,trim,[[-.105,.105],[.105,.105],[.105,-.105],[-.105,-.105]],.035,[0,.91,.38],[0,0,0],'metal',.012);
  plate(body,dark,[[-.074,.074],[.074,.074],[.074,-.074],[-.074,-.074]],.018,[0,.91,.425],[0,0,0],'metal',.008);
  pair(.48,dark,.135,.22,dark,false);
  for(const l of legs){plate(l.hip,green,[[-.12,.07],[.13,.07],[.15,-.13],[0,-.25],[-.13,-.16]],.06,[0,-.10,.11]);plate(l.knee,green,[[-.10,.04],[.12,.04],[.13,-.15],[-.10,-.18]],.075,[0,-.10,.13]);for(const x of [-.07,.02,.10])claw(l.ankle,x,.035,.22,trim,.07);}
  head=joint(body,0,1.42,.02);skull(head,dark,.24,.44,.21);
  plate(head,green,[[-.22,.17],[.22,.17],[.22,-.17],[-.22,-.17]],.095,[0,0,.15],[0,0,0],'metal',.045);
  plate(head,'#163c32',[[-.19,.053],[.19,.053],[.19,-.053],[-.19,-.053]],.020,[0,.025,.268],[0,0,0],'metal',.014);
  plate(head,glow,[[-.165,.026],[.165,.026],[.165,-.026],[-.165,-.026]],.014,[0,.025,.300],[0,0,0],'glow',.009);
  const chips=joint(body,0,0,0,'tensor-chip-shoulders');
  for(const s of [-1,1]){
   const a=arm(s,dark,1.10,.58,.13);
   plate(chips,green,[[-.25,.21],[.25,.21],[.25,-.21],[-.25,-.21]],.29,[s*.44,1.15,-.13],[0,s*.16,-s*.12],'metal',.048);
   plate(chips,'#417e45',[[-.17,.13],[.17,.13],[.17,-.13],[-.17,-.13]],.035,[s*.44,1.15,.21],[0,s*.15,-s*.12],'metal',.026);
   for(let n=0;n<4;n++)plate(chips,trim,[[-.035,-.024],[.035,-.024],[.035,.024],[-.035,.024]],.025,[s*.65,1.25-n*.09,.19],[0,0,-s*.12],'metal',.006);
   plate(a.elbow,green,[[-.15,.09],[.14,.09],[.18,-.18],[.08,-.30],[-.14,-.26]],.14,[0,-.10,.04],[0,0,0],'metal',.028);
   for(const x of [-.115,.115])line(a.elbow,trim,[[x,-.24,.15],[x*1.35,-.39,.22],[x,-.52,.34],[x*.6,-.48,.40]],.070,.009,'metal');
  }
  jaw=mouth(head,'#152a28',-.17,.25,.09);
 }

 t.head=head;t.jaw=jaw;t.kind=kind;t.float=float;t.modelScale=modelScale;
}
