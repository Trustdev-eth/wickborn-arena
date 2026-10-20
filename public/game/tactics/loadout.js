import {validDeck} from '../engine.js';
import {STARTER_SQUAD} from './config.js';
export function readSkirmishLoadout(storage,initialDeck=STARTER_SQUAD){
 let saved;try{saved=JSON.parse(storage?.getItem('wickborn-loadout-v1')||'null');}catch{}
 const deck=validDeck(saved?.deck)?[...saved.deck]:validDeck(initialDeck)?[...initialDeck]:[...STARTER_SQUAD];
 const specs=Array.isArray(saved?.specs)&&saved.specs.length===12&&saved.specs.every(s=>s===0||s===1)?[...saved.specs]:Array(12).fill(0);
 return {deck,captain:deck.includes(saved?.captain)?saved.captain:deck.includes(1)?1:deck[0],specs};
}
export function saveSkirmishLoadout(storage,value){try{if(!validDeck(value.deck)||!value.deck.includes(value.captain))return false;storage?.setItem('wickborn-loadout-v1',JSON.stringify(value));return true;}catch{return false;}}
