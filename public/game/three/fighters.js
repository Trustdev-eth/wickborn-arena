import {createSculptContext,finishSculpt} from './fighter-tools.js';
import {sculptFighters0to5} from './fighters-0-5.js';
import {sculptFighters6to11} from './fighters-6-11.js';

// Original sculpted game art. Profiles, silhouettes and accessories follow the
// stock-creatures atlas; engine IDs, reach, collisions and damage stay untouched.
export function sculptFighter(id,kit){
 const t=createSculptContext(id,kit);
 if(id<=5)sculptFighters0to5(id,t);
 else sculptFighters6to11(id,t);
 return finishSculpt(t);
}
