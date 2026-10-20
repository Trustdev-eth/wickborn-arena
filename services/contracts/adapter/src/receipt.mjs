import {PublicKey} from '@solana/web3.js';
import {signedHeaders} from '../../../../lib/security.js';
import {accountInfo} from './rpc.mjs';

const pending=new Map();
const notified=new Set();
let timer=null;

export function rememberPrepared(intent,position){
 if(!intent?.id||!position)return;
 pending.set(intent.id,{
  intentId:intent.id,
  kind:intent.kind,
  wallet:intent.wallet,
  position:typeof position==='string'?position:position.toBase58(),
  amountUnits:intent.amountUnits,
  expiresAt:Number(intent.expiresAt)||Date.now()+55000
 });
}

export function forgetPrepared(intentId){
 pending.delete(intentId);
}

export function preparedCount(){
 return pending.size;
}

export function resetReceiptState(){
 pending.clear();
 notified.clear();
}

export function siteOrigin(env=process.env){
 const origin=env.SITE_ORIGIN;
 if(!origin)return null;
 try{
  const url=new URL(origin);
  if(url.protocol==='https:')return url.origin;
  if(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))return url.origin;
 }catch{/* invalid */}
 return null;
}

export async function notifySiteReceipt(env,intentId,signature,fetcher){
 const origin=siteOrigin(env);
 if(!origin||!intentId||!signature||!env.CONTRACT_ADAPTER_KEY)return {skipped:true};
 const key=intentId+':'+signature;
 if(notified.has(key))return {duplicate:true};
 const body=JSON.stringify({intentId,signature});
 const headers=await signedHeaders(body,env.CONTRACT_ADAPTER_KEY);
 const send=fetcher||env.SITE_FETCH||fetch;
 try{
  const response=await send(new URL('/api/contract-receipt',origin),{method:'POST',headers,body,signal:AbortSignal.timeout(8000)});
  if(response.ok||response.status===202||response.status===409){
   notified.add(key);
   pending.delete(intentId);
   console.log('contract-receipt',response.status);
   return {ok:true,status:response.status};
  }
  console.warn('contract-receipt failed',response.status);
  return {ok:false,status:response.status};
 }catch(error){
  console.warn('contract-receipt unavailable',error.message);
  return {ok:false,error:error.message};
 }
}

export async function pollPrepared(conn,env,fetcher){
 const now=Date.now();
 for(const [id,item] of pending){
  if(item.expiresAt<now-120000){pending.delete(id);continue;}
  try{
   const info=await accountInfo(conn,item.position);
   if(!info)continue;
   const sigs=await conn.getSignaturesForAddress(new PublicKey(item.position),{limit:8});
   const signature=sigs.find(s=>s.err==null)?.signature;
   if(!signature)continue;
   await notifySiteReceipt(env,item.intentId,signature,fetcher);
  }catch(error){
   console.warn('receipt watch failed',item.intentId,error.message);
  }
 }
}

export function startReceiptWatcher(env,connFactory,intervalMs=4000){
 if(timer||!siteOrigin(env))return stopReceiptWatcher;
 timer=setInterval(()=>{
  try{
   const conn=connFactory();
   pollPrepared(conn,env).catch(error=>console.warn('receipt poll',error.message));
  }catch(error){
   console.warn('receipt watcher',error.message);
  }
 },intervalMs);
 timer.unref?.();
 return stopReceiptWatcher;
}

export function stopReceiptWatcher(){
 if(timer)clearInterval(timer);
 timer=null;
}
