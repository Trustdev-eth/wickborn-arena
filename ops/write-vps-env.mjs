import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const adapterDir=resolve(root,'services/contracts/adapter');
const PROGRAM_ID='F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x';

function parseEnvFile(path){
 const out={};
 if(!existsSync(path))return out;
 for(const line of readFileSync(path,'utf8').split(/\r?\n/)){
  const text=line.trim();if(!text||text.startsWith('#'))continue;
  const i=text.indexOf('=');if(i<1)continue;
  let value=text.slice(i+1).trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  out[text.slice(0,i).trim()]=value;
 }
 return out;
}

function writeEnv(path,lines){
 mkdirSync(dirname(path),{recursive:true});
 writeFileSync(path,lines.filter(Boolean).join('\n')+'\n',{mode:0o600});
}

const existing={
 ...parseEnvFile(resolve(root,'.env.local')),
 ...parseEnvFile(resolve(adapterDir,'.env')),
 ...parseEnvFile(resolve(root,'services/realtime/.dev.vars')),
};
const realtime=existing.REALTIME_SHARED_SECRET||randomBytes(32).toString('hex');
const adapter=existing.CONTRACT_ADAPTER_KEY||randomBytes(32).toString('hex');
const mint=existing.GAME_TOKEN_MINT||'';

const sites=[
 'SITE_ORIGIN=https://play.wickbornarena.xyz',
 'SITE_INTERNAL_URL=http://127.0.0.1:8880',
 'REALTIME_URL=http://127.0.0.1:8881',
 'REALTIME_PUBLIC_URL=https://play.wickbornarena.xyz',
 'CONTRACT_ADAPTER_URL=http://127.0.0.1:8882',
 `GAME_PROGRAM_ID=${PROGRAM_ID}`,
 `GAME_TOKEN_MINT=${mint}`,
 'GAME_TOKEN_DECIMALS=9',
 'GAME_TOKEN_SYMBOL=WICKB',
 'GAME_TOKEN_CHAIN=solana:devnet',
 'LIVE_TOKEN_ENABLED=false',
 'SKIRMISH_ONLINE=true',
 'STAKE_LOCK_SECONDS=604800',
 'SOLANA_RPC_URL=https://api.devnet.solana.com',
 `REALTIME_SHARED_SECRET=${realtime}`,
 `CONTRACT_ADAPTER_KEY=${adapter}`,
];
writeEnv(resolve(root,'.env.local'),sites);
writeEnv(resolve(root,'services/realtime/.dev.vars'),[
 'SITE_ORIGIN=https://play.wickbornarena.xyz',
 'SITE_INTERNAL_URL=http://127.0.0.1:8880',
 `REALTIME_SHARED_SECRET=${realtime}`,
]);
writeEnv(resolve(adapterDir,'.env'),[
 'SOLANA_RPC_URL=https://api.devnet.solana.com',
 `GAME_PROGRAM_ID=${PROGRAM_ID}`,
 `GAME_TOKEN_MINT=${mint}`,
 'GAME_TOKEN_DECIMALS=9',
 'GAME_TOKEN_CHAIN=solana:devnet',
 `CONTRACT_ADAPTER_KEY=${adapter}`,
 'SITE_ORIGIN=https://play.wickbornarena.xyz',
 'SITE_INTERNAL_URL=http://127.0.0.1:8880',
 'STAKE_LOCK_SECONDS=604800',
 'PORT=8882',
 'COMPUTE_UNIT_PRICE_MICROLAMPORTS=1000',
]);
const distVars=resolve(root,'dist/server/.dev.vars');
if(existsSync(resolve(root,'dist/server')))writeEnv(distVars,sites);
console.log(JSON.stringify({ok:true,sites:resolve(root,'.env.local'),adapter:resolve(adapterDir,'.env')},null,2));
