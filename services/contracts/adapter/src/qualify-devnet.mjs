import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Connection,Keypair,LAMPORTS_PER_SOL,PublicKey} from '@solana/web3.js';
import {loadAdapterEnv} from './env.mjs';
import {writeDevnetEnv} from '../../../../scripts/write-devnet-env.mjs';

loadAdapterEnv();
const adapter=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const root=resolve(adapter,'../../..');
const payer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolve(adapter,'.dev-keypair.json'),'utf8'))));
const programId=new PublicKey(process.env.GAME_PROGRAM_ID||'F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x');
const conn=new Connection(process.env.SOLANA_RPC_URL||'https://api.devnet.solana.com','confirmed');
const NEED=programExists=>programExists?0.2:2.6;

function run(cmd,args,cwd=adapter){
 const result=spawnSync(cmd,args,{cwd,stdio:'inherit'});
 if(result.status)throw new Error(cmd+' failed');
}

function runWsl(script){
 const win=resolve(root,'services/contracts/scripts',script);
 writeFileSync(win,readFileSync(win,'utf8').replace(/\r\n/g,'\n'));
 const linux='/mnt/d/work/meme/wickborn-arena/services/contracts/scripts/'+script;
 run('wsl',['bash',linux],root);
}

const sol=(await conn.getBalance(payer.publicKey))/LAMPORTS_PER_SOL;
const program=await conn.getAccountInfo(programId);
console.log(JSON.stringify({wallet:payer.publicKey.toBase58(),sol,programExists:!!program,faucet:'https://faucet.solana.com'},null,2));
if(sol<NEED(!!program)){
 console.error('Need ~'+NEED(!!program)+' SOL on the payer to '+(program?'mint WICKB, initialize, and smoke.':'deploy, mint WICKB, initialize, and smoke.'));
 process.exit(2);
}
if(!program) runWsl('wsl-deploy.sh');
run(process.execPath,['src/create-mint.mjs']);
run(process.execPath,['src/initialize.mjs']);
run(process.execPath,['src/smoke-devnet.mjs']);
const env=writeDevnetEnv({liveToken:true});
console.log(JSON.stringify({ok:true,LIVE_TOKEN_ENABLED:env.liveToken,mint:env.mint},null,2));
