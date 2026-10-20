import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Connection,Keypair,LAMPORTS_PER_SOL} from '@solana/web3.js';
import {loadAdapterEnv} from './env.mjs';

loadAdapterEnv();
const path=process.env.AUTHORITY_KEYPAIR_PATH||process.env.SETTLEMENT_KEYPAIR_PATH||resolve(dirname(fileURLToPath(import.meta.url)),'../.dev-keypair.json');
const payer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path,'utf8'))));
const url=process.env.SOLANA_RPC_URL||'https://api.devnet.solana.com';
const conn=new Connection(url,{commitment:'confirmed'});
const before=await conn.getBalance(payer.publicKey);
console.log(JSON.stringify({wallet:payer.publicKey.toBase58(),beforeSol:before/LAMPORTS_PER_SOL}));
if(before>=80_000_000){
 console.log(JSON.stringify({ok:true,funded:true,sol:before/LAMPORTS_PER_SOL}));
 process.exit(0);
}
try{
 const sig=await conn.requestAirdrop(payer.publicKey,2*LAMPORTS_PER_SOL);
 const confirmation=await conn.confirmTransaction(sig,'confirmed');
 const after=await conn.getBalance(payer.publicKey);
 console.log(JSON.stringify({ok:!confirmation.value.err,signature:sig,sol:after/LAMPORTS_PER_SOL}));
}catch(error){
 const after=await conn.getBalance(payer.publicKey);
 console.log(JSON.stringify({ok:after>=50_000_000,error:error.message,sol:after/LAMPORTS_PER_SOL,faucet:'https://faucet.solana.com',wallet:payer.publicKey.toBase58()}));
 if(after<50_000_000)process.exit(1);
}
