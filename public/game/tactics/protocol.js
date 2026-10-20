import {createTactics,applyTacticsCommand,stepTactics,updateTacticsMarket} from './engine.js';
import {TACTICS_STEP,TACTICS_VERSION} from './config.js';

export const TACTICS_PROTOCOL='wickborn-tactics/1';
const commands=new Set(['deploy','move','hold','skill','ultimate','barrier','surrender']);

// A server-side integration boundary, not a browser authority or token settler.
// The existing backend can host one instance per match after authenticating both
// identities. Never create an online match from a state supplied by a browser.
export class TacticsAuthority{
 constructor({players,initial,now=()=>Date.now()}){
  if(!Array.isArray(players)||players.length!==2||players.some(p=>typeof p!=='string'||!p)||players[0]===players[1])throw new Error('Two authenticated player identities are required.');
  if(initial?.mode==='hunt')throw new Error('This adapter supports two-sided tactical duels.');
  this.players=[...players];this.game=createTactics({...initial,mode:'duel'});this.now=now;this.sequence=0;this.receipts=[new Map(),new Map()];this.rates=[{at:now(),count:0},{at:now(),count:0}];this.accumulator=0;this.frame=initial?.marketFrame||null;
 }
 static restore({players,game,sequence=0,accumulator=0,receipts=[[],[]],frame=null},now=()=>Date.now()){
  if(!Array.isArray(players)||players.length!==2||!game)throw new Error('A stored Skirmish authority is required.');
  const host=Object.create(TacticsAuthority.prototype);
  host.players=[...players];host.game=game;host.now=now;host.sequence=sequence;host.accumulator=accumulator;
  host.receipts=[new Map(receipts[0]||[]),new Map(receipts[1]||[])];host.rates=[{at:now(),count:0},{at:now(),count:0}];host.frame=frame||null;
  return host;
 }
 checkpoint(){
  return {players:[...this.players],game:this.game,sequence:this.sequence,accumulator:this.accumulator,receipts:this.receipts.map(m=>[...m.entries()]),frame:this.frame};
 }
 receive(authenticatedPlayer,packet){
  const side=this.players.indexOf(authenticatedPlayer);if(side<0)return {ok:false,error:'Player is not a participant.'};
  if(!packet||typeof packet!=='object'||packet.protocol!==TACTICS_PROTOCOL||!commands.has(packet.type)||typeof packet.actionId!=='string'||!/^[\w-]{8,80}$/.test(packet.actionId))return {ok:false,error:'Invalid tactical command envelope.'};
  const cache=this.receipts[side],saved=cache.get(packet.actionId);if(saved)return {...saved,duplicate:true,sequence:this.sequence};
  if(cache.size>=4096)return {ok:false,error:'Command allowance exhausted.'};
  const rate=this.rates[side],now=this.now();if(now-rate.at>=1000){rate.at=now;rate.count=0;}if(rate.count>=30)return {ok:false,error:'Command rate exceeded.'};rate.count++;
  const c=Object.fromEntries(['type','slot','x','y'].filter(k=>packet[k]!==undefined).map(k=>[k,packet[k]]));
  const result={...applyTacticsCommand(this.game,side,c),actionId:packet.actionId,sequence:++this.sequence};cache.set(packet.actionId,result);return result;
 }
 setMarket(frame){this.frame=frame;}
 advance(seconds){
  if(!Number.isFinite(seconds)||seconds<0||seconds>1)throw new Error('Advance at most one second at a time.');
  this.accumulator+=seconds;let steps=0;while(this.accumulator+1e-9>=TACTICS_STEP&&this.game.status==='playing'){updateTacticsMarket(this.game,this.frame);stepTactics(this.game);this.accumulator-=TACTICS_STEP;this.sequence++;steps++;}return steps;
 }
 snapshot(authenticatedPlayer){
  const side=this.players.indexOf(authenticatedPlayer);if(side<0)throw new Error('Player is not a participant.');
  const {seed,commands,decks,hand,queue,market,recentEvents,...publicState}=this.game;
  const state={...structuredClone(publicState),decks:decks.map((d,p)=>p===side?[...d]:[]),hand:hand.map((d,p)=>p===side?[...d]:[]),queue:queue.map((d,p)=>p===side?[...d]:[]),market:structuredClone(market)};
  for(const u of state.units)if(u.p!==side)u.order=null;
  return {protocol:TACTICS_PROTOCOL,version:TACTICS_VERSION,side,sequence:this.sequence,state,acks:[...this.receipts[side].keys()].slice(-32)};
 }
}
