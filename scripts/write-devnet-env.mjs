import {randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const adapterDir=resolve(root,'services/contracts/adapter');
const secretsPath=resolve(adapterDir,'.dev-secrets.json');
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

export function loadOrCreateSecrets(){
 if(existsSync(secretsPath))return JSON.parse(readFileSync(secretsPath,'utf8'));
 const secrets={
  CONTRACT_ADAPTER_KEY:randomBytes(32).toString('hex'),
  REALTIME_SHARED_SECRET:randomBytes(32).toString('hex')
 };
 writeFileSync(secretsPath,JSON.stringify(secrets,null,2));
 return secrets;
}

export function writeDevnetEnv({mint,liveToken}={}){
 const secrets=loadOrCreateSecrets();
 const localPath=resolve(root,'.env.local');
 const adapterPath=resolve(adapterDir,'.env');
 const existingLocal=parseEnvFile(localPath);
 const existingAdapter=parseEnvFile(adapterPath);
 const mintValue=mint!==undefined?mint:(existingAdapter.GAME_TOKEN_MINT||existingLocal.GAME_TOKEN_MINT||'');
 const live=liveToken===true||liveToken==='true'?'true':'false';
 const hmac=existingAdapter.CONTRACT_ADAPTER_KEY||existingLocal.CONTRACT_ADAPTER_KEY||secrets.CONTRACT_ADAPTER_KEY;
 const realtime=existingLocal.REALTIME_SHARED_SECRET||secrets.REALTIME_SHARED_SECRET;

 const sites=[
  'SITE_ORIGIN=http://127.0.0.1:5173',
  'GAME_TOKEN_CHAIN=solana:devnet',
  `GAME_TOKEN_MINT=${mintValue}`,
  'GAME_TOKEN_DECIMALS=9',
  'GAME_TOKEN_SYMBOL=WICKB',
  `GAME_PROGRAM_ID=${PROGRAM_ID}`,
  'CONTRACT_ADAPTER_URL=http://127.0.0.1:8788',
  `CONTRACT_ADAPTER_KEY=${hmac}`,
  'REALTIME_URL=http://127.0.0.1:8787',
  `REALTIME_SHARED_SECRET=${realtime}`,
  'STAKE_LOCK_SECONDS=604800',
  `LIVE_TOKEN_ENABLED=${live}`,
  'SKIRMISH_ONLINE=true',
  ''
 ].join('\n');

 const adapter=[
  'SOLANA_RPC_URL=https://api.devnet.solana.com',
  `GAME_PROGRAM_ID=${PROGRAM_ID}`,
  `GAME_TOKEN_MINT=${mintValue}`,
  'GAME_TOKEN_DECIMALS=9',
  'GAME_TOKEN_CHAIN=solana:devnet',
  `CONTRACT_ADAPTER_KEY=${hmac}`,
  'SITE_ORIGIN=http://127.0.0.1:5173',
  'STAKE_LOCK_SECONDS=604800',
  'PORT=8788',
  'COMPUTE_UNIT_PRICE_MICROLAMPORTS=1000',
  'SETTLEMENT_KEYPAIR_PATH=.dev-keypair.json',
  'AUTHORITY_KEYPAIR_PATH=.dev-keypair.json',
  ''
 ].join('\n');

 writeFileSync(localPath,sites);
 writeFileSync(adapterPath,adapter);
 writeFileSync(resolve(root,'services/realtime/.dev.vars'),[
  'SITE_ORIGIN=http://127.0.0.1:5173',
  `REALTIME_SHARED_SECRET=${realtime}`,
  ''
 ].join('\n'));
 return {mint:mintValue,liveToken:live,sites:localPath,adapter:adapterPath,programId:PROGRAM_ID};
}

const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]);
if(isMain){
 const args=process.argv.slice(2);
 const mintIndex=args.indexOf('--mint');
 const liveIndex=args.indexOf('--live-token');
 const result=writeDevnetEnv({
  mint:mintIndex>=0?args[mintIndex+1]:undefined,
  liveToken:liveIndex>=0?args[liveIndex+1]:undefined
 });
 console.log(JSON.stringify({ok:true,...result,LIVE_TOKEN_ENABLED:result.liveToken},null,2));
}
