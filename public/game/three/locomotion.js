import {clamp} from './math.js';

const SETTINGS=[
 [.44,.69,.065,'walk'],[.54,.57,.105,'trot'],[.29,.76,.042,'walk'],[.24,.65,.043,'biped'],
 [.34,.63,.055,'fly'],[.43,.72,.060,'biped'],[.31,.66,.065,'biped'],[.43,.64,.070,'fly'],
 [.46,.72,.065,'walk'],[.30,.64,.045,'fly'],[.38,.60,.080,'slime'],[.34,.65,.055,'fly']
];
export const GAITS=SETTINGS.map(([stride,duty,lift,style])=>Object.freeze({stride,duty,lift,style}));
const unit=x=>((x%1)+1)%1;

// During stance, d(forward)/d(distance) is exactly -1. Adding the unit's
// forward translation therefore leaves a supporting foot fixed on the floor.
// Cubic swing trajectories match that velocity at both ends of the step.
export function footStep(distance,offset=0,gait=GAITS[0]){
 const {stride,duty,lift}=gait,t=unit(distance/stride+offset);
 if(t<duty)return {forward:stride*(duty*.5-t),lift:0,stance:true,roll:0,phase:t};
 const s=(t-duty)/(1-duty),a=-stride*duty*.5,b=-a,v=-stride*(1-duty),s2=s*s,s3=s2*s;
 return {forward:(2*s3-3*s2+1)*a+(s3-2*s2+s)*v+(-2*s3+3*s2)*b+(s3-s2)*v,lift:lift*16*s2*(1-s)*(1-s),stance:false,roll:Math.sin(s*Math.PI*2)*.14,phase:t};
}
export function legOffset(leg,gait){
 if(gait.style==='walk')return leg.front?(leg.side<0?0:.5):(leg.side<0?.75:.25);
 return leg.phase/(Math.PI*2);
}
export function locomotionPose(id,distance,moving){
 const gait=GAITS[id],weight=clamp(moving,0,1),cycle=distance/gait.stride*Math.PI*2;
 return {gait,cycle,weight,bob:Math.cos(cycle*2)*([2,3].includes(id)?.006:id===5||id===8?.007:.013)*weight,pitch:Math.sin(cycle*2)*.018*weight,roll:Math.sin(cycle)*(gait.style==='biped'?.035:.018)*weight};
}

// Faster downstroke, longer feathered recovery. Distal joints follow later.
export function wingStroke(time,frequency,lag=0){const t=time*frequency-lag;return Math.sin(t)+.18*Math.sin(t*2+.4);}
