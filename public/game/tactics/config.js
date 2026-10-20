import {CARDS} from '../stock-roster.js';

export const TACTICS_VERSION=1;
export const TACTICS_STEP=.05;
export const TACTICS_ROUND=240;
export const MARKET_PULSE=20;
export const STARTER_SQUAD=[0,1,2,3,5,6,8,11];
// All numbers belong to this optional ruleset. The token arena stays unchanged.
const identities=[
 ['Shoulder sweep','Crown of thorns','sweep',.35,9,135,105,'Sweep nearby enemies and push them back.','Briar guard','Trade 15% attack damage for 20% health.','Stampede','Trade 12% health for 15% speed.','Flank the sweep; punish its recovery.'],
 ['Circuit dash','Thunder circuit','dash',.2,9,185,118,'Dash to your aim point and electrify enemies along the path.','Disruptor','Longer stun; 18% less attack damage.','Predator','20% more damage to isolated enemies; 12% less health.','Bait the dash, then attack while it recharges.'],
 ['Cloud bulwark','Citadel protocol','shield',.3,12,180,0,'Face your aim point and shield allies behind your frontal arc.','Bastion','Stronger shields; 15% slower movement.','Vanguard','20% more speed; a smaller protective arc.','Move behind the shield or interrupt its channel.'],
 ['Prismatic lens','Whiteout','frost',.45,10,220,100,'Mark a slowing blast at your aim point.','Surveyor','Larger slowing field; 15% less damage.','Sharpshooter','20% more attack range; 12% less health.','Leave the marked circle before the lens fires.'],
 ['Express flight','Priority airlift','decoy',.25,12,160,65,'Reposition and release two temporary courier decoys.','Fleet','Faster couriers; 15% less health.','Escort','20% more health; 12% less attack damage.','Use area attacks against the decoys.'],
 ['Siege beam','Overclock annihilation','beam',1.25,13,300,310,'Charge a narrow beam. Movement or a stun cancels the charge.','Overclock','25% more beam damage; a longer charge.','Bulwark','20% more health; 15% less beam damage.','Interrupt the visible charge or step out of the beam.'],
 ['Lifeline','Second spring','heal',.25,12,145,0,'Channel healing links for four seconds. Move or interrupt to break them.','Restorer','25% stronger healing; 20% less damage.','Field medic','Faster movement; shorter healing reach.','Separate the healer from allies or interrupt the channel.'],
 ['Portal collapse','Event horizon','portal',.75,12,245,175,'Collapse a marked portal and pull enemies toward its center.','Singularity','Wider portal; 18% less attack damage.','Skyfire','20% more burst damage; 15% less health.','Spread out and escape the portal warning.'],
 ['Vault charge','Unbreakable advance','charge',.6,11,200,175,'Rush through a straight line, knocking enemies aside.','Sentinel','20% more health; 15% less damage.','Breacher','25% stronger charge; 15% less health.','Sidestep the charge and attack its exposed recovery.'],
 ['Ribbon snare','Final curtain','snare',.55,11,210,90,'Place a ribbon field that slows and damages enemies.','Director','Longer snare; 15% less damage.','Spotlight','20% stronger attacks; 15% less healing.','Leave the ribbon field and pressure the fragile caster.'],
 ['Golden geyser','Supersize','geyser',.5,10,170,100,'Erupt beneath enemies and release two short-lived Frydrops.','Sticky','Stronger slow; 15% less attack damage.','Hearty','25% more health; 15% slower movement.','Spread out and clear the small Frydrops.'],
 ['Feather fan','Midnight hunt','fan',.35,9,230,125,'Fire a broad feather volley; wounded targets take extra damage.','Tracker','Longer range; 12% less damage.','Executioner','More damage against wounded enemies; 15% less health.','Use a healthy front line to protect wounded allies.']
];
export const TACTICAL_FIGHTERS=identities.map((r,id)=>Object.freeze({...CARDS[id],skill:r[0],ultimate:r[1],kind:r[2],windup:r[3],cooldown:r[4],reach:r[5],power:r[6],skillDescription:r[7],specs:[{name:r[8],description:r[9]},{name:r[10],description:r[11]}],counter:r[12]}));
export const SECTORS={Technology:'Circuit',Mobility:'Momentum',Commerce:'Supply',Healthcare:'Renewal',Finance:'Fortitude',Entertainment:'Resonance'};
export const CAMPAIGN_TERRITORIES=[
 {id:'crossing',name:'Verdant Crossing',requires:[],captain:1,description:'Break the raiders at the river crossing.',reward:'Crossing scout'},
 {id:'foundry',name:'Copper Foundry',requires:['crossing'],captain:5,description:'Interrupt the foundry siege engines.',reward:'Copper standard'},
 {id:'gardens',name:'Lifeline Gardens',requires:['crossing'],captain:6,description:'Separate the wardens from their healers.',reward:'Garden sentinel'},
 {id:'vault',name:'Midnight Vault',requires:['foundry'],captain:8,description:'Outmaneuver the armored vault guard.',reward:'Vault breaker'},
 {id:'observatory',name:'Prism Observatory',requires:['gardens'],captain:3,description:'Cross the watchers’ slowing fields.',reward:'Prism navigator'},
 {id:'citadel',name:'The Glass Citadel',requires:['vault','observatory'],captain:2,boss:true,description:'Defeat the Citadel Colossus and finish the chapter.',reward:'Glassfront champion'}
];
export function fighterStats(id,spec=0,captain=false){
 const base=TACTICAL_FIGHTERS[id];if(!base)throw new Error('Unknown fighter.');
 const c={...base,hp:base.hp*(captain?1.6:1),dmg:base.dmg,speed:base.speed,heal:base.heal||0};
 const health=n=>c.hp*=n,damage=n=>c.dmg*=n,speed=n=>c.speed*=n;
 if(id===0){if(spec===0){health(1.2);damage(.85);}else{health(.88);speed(1.15);}}
 if(id===1){if(spec===0)damage(.82);else health(.88);}
 if(id===2){if(spec===0)speed(.85);else speed(1.2);}
 if(id===3){if(spec===0)damage(.85);else{c.range*=1.2;health(.88);}}
 if(id===4){if(spec===0){speed(1.2);health(.85);}else{health(1.2);damage(.88);}}
 if(id===5&&spec===1)health(1.2);
 if(id===6){if(spec===0){c.heal*=1.25;damage(.8);}else speed(1.2);}
 if(id===7){if(spec===0)damage(.82);else{damage(1.2);health(.85);}}
 if(id===8){if(spec===0){health(1.2);damage(.85);}else health(.85);}
 if(id===9){if(spec===0)damage(.85);else{damage(1.2);c.heal*=.85;}}
 if(id===10){if(spec===0)damage(.85);else{health(1.25);speed(.85);}}
 if(id===11){if(spec===0){c.range*=1.2;damage(.88);}else health(.85);}
 return c;
}
export function campaignAvailable(progress,id){const t=CAMPAIGN_TERRITORIES.find(t=>t.id===id);return !!t&&t.requires.every(id=>progress.completed.includes(id));}
