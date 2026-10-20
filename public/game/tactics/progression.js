import {CAMPAIGN_TERRITORIES,campaignAvailable} from './config.js';
export const STORAGE_KEY='wickborn-tactics-v1';
export function freshProgress(){return {version:1,banner:'Glassfront Vanguard',completed:[],wins:0,losses:0,matches:0,xp:Array(12).fill(0),titles:[],settled:[],history:[]};}
export function readProgress(storage){try{const raw=JSON.parse(storage.getItem(STORAGE_KEY)||'null');if(raw?.version!==1)return freshProgress();return {...freshProgress(),banner:typeof raw.banner==='string'?raw.banner.slice(0,28):'Glassfront Vanguard',completed:Array.isArray(raw.completed)?raw.completed.filter(id=>CAMPAIGN_TERRITORIES.some(t=>t.id===id)):[],wins:Math.max(0,Number(raw.wins)||0),losses:Math.max(0,Number(raw.losses)||0),matches:Math.max(0,Number(raw.matches)||0),xp:Array.from({length:12},(_,id)=>Math.max(0,Math.min(1000000,Number(raw.xp?.[id])||0))),titles:Array.isArray(raw.titles)?raw.titles.filter(v=>typeof v==='string').slice(-12):[],settled:Array.isArray(raw.settled)?raw.settled.filter(v=>typeof v==='string').slice(-60):[],history:Array.isArray(raw.history)?raw.history.filter(v=>v&&typeof v.id==='string'&&typeof v.result==='string').slice(0,12):[]};}catch{return freshProgress();}}
export function saveProgress(storage,p){try{storage.setItem(STORAGE_KEY,JSON.stringify(p));return true;}catch{return false;}}
export function mastery(xp){const level=Math.min(10,1+Math.floor(Math.sqrt(Math.max(0,xp)/80)));return {level,title:level>=8?'Legend':level>=5?'Veteran':level>=3?'Specialist':'Initiate',next:level>=10?null:level*level*80};}
export function settleTactics(progress,{id,game,side=0,territory=null}){
 if(!id||game.status!=='ended'||progress.settled.includes(id))return false;
 const won=game.winner===side,draw=game.winner===-1;progress.settled.push(id);progress.settled=progress.settled.slice(-60);progress.matches++;if(won)progress.wins++;else if(!draw)progress.losses++;
 const xp=won?120:draw?70:50;for(const card of game.decks[side])progress.xp[card]+=xp*(card===game.captainCards[side]?1.5:1);
 if(won&&territory&&campaignAvailable(progress,territory)&&!progress.completed.includes(territory)){const t=CAMPAIGN_TERRITORIES.find(t=>t.id===territory);progress.completed.push(territory);if(!progress.titles.includes(t.reward))progress.titles.push(t.reward);}
 progress.history.unshift({id,result:draw?'Draw':won?'Victory':'Defeat',mode:territory?'campaign':game.mode,duration:Math.round(game.time),captain:game.captainCards[side],kills:game.kills[side]});progress.history=progress.history.slice(0,12);return true;
}
