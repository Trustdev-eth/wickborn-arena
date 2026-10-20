import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAdapterEnv} from '../services/contracts/adapter/src/env.mjs';
import {DEFAULT_DECK} from '../public/game/engine.js';
import {TOKENS} from '../public/game/tokens.js';
import {base64url,signedHeaders} from '../lib/security.js';

loadAdapterEnv();
const require=createRequire(new URL('../services/contracts/adapter/package.json',import.meta.url));
const {Connection,Keypair,Transaction}=require('@solana/web3.js');
const web3Require=createRequire(require.resolve('@solana/web3.js/package.json'));
const {ed25519}=web3Require('@noble/curves/ed25519');
const env=process.env;
const site=env.SITE_ORIGIN||'http://127.0.0.1:5173';
const adapter=env.CONTRACT_ADAPTER_URL||'http://127.0.0.1:8788';
const origin=site;
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const result={site,adapter,ok:false,checks:[]};

function note(name,data){
 result.checks.push({name,...data});
 console.log(JSON.stringify({name,...data}));
}

function loadPayer(){
 const path=resolve(root,'services/contracts/adapter/.dev-keypair.json');
 return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path,'utf8'))));
}

function signMessage(secretKey,message){
 return ed25519.sign(new TextEncoder().encode(message),secretKey.subarray(0,32));
}

function sessionCookie(response){
 const raw=(response.headers.getSetCookie?.()||[]).join(',')||response.headers.get('set-cookie')||'';
 const match=raw.match(/__Host-arena-session=([^;]+)/);
 return match?'__Host-arena-session='+match[1]:null;
}

async function siteJson(path,init={}){
 const headers=new Headers(init.headers||{});
 if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 if(init.method==='POST')headers.set('origin',origin);
 const response=await fetch(new URL(path,site),{...init,headers,signal:AbortSignal.timeout(init.timeout||20000)});
 let data=null;
 try{data=await response.json();}catch{/* non-json */}
 return {ok:response.ok,status:response.status,data,cookie:sessionCookie(response),headers:response.headers};
}

async function getJson(url,init){
 const response=await fetch(url,{...init,signal:AbortSignal.timeout(20000)});
 let data=null;
 try{data=await response.json();}catch{/* non-json */}
 return {ok:response.ok,status:response.status,data};
}

async function sitesReceiptRoundTrip(){
 if(!env.CONTRACT_ADAPTER_KEY||!env.GAME_TOKEN_MINT){
  note('sites-receipt',{skipped:true,hint:'GAME_TOKEN_MINT and CONTRACT_ADAPTER_KEY required'});
  return;
 }
 const payer=loadPayer();
 const wallet=payer.publicKey.toBase58();
 const challenge=await siteJson('/api/auth/wallet/challenge',{method:'POST',body:JSON.stringify({address:wallet})});
 if(!challenge.ok)throw new Error('Wallet challenge failed: '+(challenge.data?.error||challenge.status));
 const signature=base64url(signMessage(payer.secretKey,challenge.data.message));
 const login=await siteJson('/api/auth/wallet/verify',{method:'POST',body:JSON.stringify({id:challenge.data.id,signature})});
 if(!login.ok||!login.cookie)throw new Error('Wallet verify failed: '+(login.data?.error||login.status));
 const cookie=login.cookie;
 const profile=await siteJson('/api/profile',{method:'POST',headers:{cookie},body:JSON.stringify({name:'Devnet',deck:DEFAULT_DECK})});
 if(!profile.ok)throw new Error('Profile failed: '+(profile.data?.error||profile.status));
 const actionId='sites-receipt-'+Date.now();
 const prepared=await siteJson('/api/token/stake/prepare',{method:'POST',headers:{cookie},body:JSON.stringify({card:1,actionId}),timeout:25000});
 if(!prepared.ok)throw new Error('Sites stake prepare failed: '+(prepared.data?.error||prepared.status));
 const conn=new Connection(env.SOLANA_RPC_URL||'https://api.devnet.solana.com','confirmed');
 const tx=Transaction.from(Buffer.from(prepared.data.transaction,'base64'));
 tx.partialSign(payer);
 const sent=await conn.sendRawTransaction(tx.serialize(),{skipPreflight:false,preflightCommitment:'confirmed'});
 const confirmation=await conn.confirmTransaction(sent,'finalized');
 if(confirmation.value.err)throw new Error('Stake transaction failed: '+JSON.stringify(confirmation.value.err));
 const verifyBody=JSON.stringify({
  intentId:prepared.data.intentId,kind:'stake',wallet,signature:sent,
  amountUnits:prepared.data.amountUnits,card:prepared.data.card,targetLevel:prepared.data.targetLevel,
  createdAt:Date.now()-5000,expiresAt:prepared.data.expiresAt,
  programId:env.GAME_PROGRAM_ID,mint:env.GAME_TOKEN_MINT,decimals:9,chain:'solana:devnet'
 });
 const headers=await signedHeaders(verifyBody,env.CONTRACT_ADAPTER_KEY);
 const verified=await getJson(new URL('/v1/verify',adapter),{method:'POST',headers,body:verifyBody});
 if(!verified.ok||verified.data?.finalized!==true)throw new Error('Adapter verify failed: '+(verified.data?.error||verified.status));
 await new Promise(r=>setTimeout(r,1500));
 const receiptBody=JSON.stringify({intentId:prepared.data.intentId,signature:sent});
 const receiptHeaders=await signedHeaders(receiptBody,env.CONTRACT_ADAPTER_KEY);
 const receipt=await siteJson('/api/contract-receipt',{method:'POST',headers:receiptHeaders,body:receiptBody});
 if(!(receipt.ok||receipt.status===202||receipt.status===409)||receipt.data?.confirmed!==true&&receipt.status!==202){
  throw new Error('Sites contract-receipt failed: '+(receipt.data?.error||receipt.status));
 }
 const status=await siteJson('/api/token/status',{headers:{cookie}});
 const levels=status.data?.levels||[];
 note('sites-receipt',{
  ok:true,
  intentId:prepared.data.intentId,
  signature:sent,
  receiptStatus:receipt.status,
  confirmed:receipt.data?.confirmed===true||receipt.status===202,
  levelCard1:levels[1],
  explorer:'https://explorer.solana.com/tx/'+sent+'?cluster=devnet'
 });
}

try{
 const runtime=await siteJson('/api/runtime');
 if(!runtime.ok){
  note('runtime',{skipped:true,status:runtime.status,hint:'Start Sites with npm run dev'});
 }else{
  note('runtime',{ok:true,skirmish:runtime.data?.skirmish,contracts:runtime.data?.contracts,realtime:runtime.data?.realtime});
  if(runtime.data?.skirmish?.enabled!==true)throw new Error('runtime.skirmish.enabled is not true');
 }

 const market=await siteJson('/api/market');
 if(!market.ok){
  note('market',{skipped:true,status:market.status});
 }else{
  const prices=market.data?.prices||[];
  const identifiable=prices.filter(p=>{
   const token=TOKENS.find(t=>t.underlying===p.symbol||t.symbol===p.symbol);
   if(!token)return false;
   return p.feedId==='yahoo:'+token.underlying||p.feedId===token.feed||(typeof p.feedId==='string'&&p.feedId.startsWith('yahoo:'));
  });
  note('market',{ok:identifiable.length===12,count:identifiable.length,source:market.data?.source,status:market.data?.status,symbols:prices.map(p=>p.symbol)});
  if(identifiable.length!==12)throw new Error('Market did not return 12 identifiable stock rows.');
 }

 const health=await getJson(new URL('/health',adapter));
 if(!health.ok){
  note('adapter-health',{skipped:true,status:health.status,hint:'Start the adapter with npm run adapter:dev'});
 }else{
  note('adapter-health',{ok:true,programId:health.data?.programId});
 }

 if(runtime.ok&&health.ok&&env.GAME_TOKEN_MINT)await sitesReceiptRoundTrip();

 result.ok=true;
 console.log(JSON.stringify(result,null,2));
}catch(error){
 result.error=error.message||String(error);
 console.error(JSON.stringify(result,null,2));
 process.exit(1);
}
