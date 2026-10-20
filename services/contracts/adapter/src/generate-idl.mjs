import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DISCRIMINATORS,PROGRAM_ID_DEFAULT} from './logic.mjs';

const instructions=Object.entries(DISCRIMINATORS).map(([name,disc])=>({
 name,
 discriminator:[...disc],
 accounts:[],
 args:[]
}));
const idl={
 address:PROGRAM_ID_DEFAULT,
 metadata:{
  name:'clashlings',
  version:'1.0.0',
  spec:'0.1.0',
  description:'Clashlings arena staking and match-escrow program'
 },
 instructions
};
const out=resolve(dirname(fileURLToPath(import.meta.url)),'../idl/clashlings.json');
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify(idl,null,2)+'\n');
console.log(JSON.stringify({ok:true,path:out,instructions:instructions.map(i=>i.name)},null,2));
