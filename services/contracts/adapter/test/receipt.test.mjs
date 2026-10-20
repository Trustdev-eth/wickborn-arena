import test from 'node:test';
import assert from 'node:assert/strict';
import {Keypair} from '@solana/web3.js';
import {signedHeaders,verifyService} from '../../../../lib/security.js';
import {handleAdapterRequest} from '../src/server.mjs';
import {
 forgetPrepared,notifySiteReceipt,pollPrepared,preparedCount,rememberPrepared,resetReceiptState,siteOrigin
} from '../src/receipt.mjs';

test('SITE_ORIGIN accepts local http and public https only',()=>{
 assert.equal(siteOrigin({SITE_ORIGIN:'http://127.0.0.1:5173'}),'http://127.0.0.1:5173');
 assert.equal(siteOrigin({SITE_ORIGIN:'https://arena.example'}),'https://arena.example');
 assert.equal(siteOrigin({SITE_ORIGIN:'http://evil.test'}),null);
 assert.equal(siteOrigin({}),null);
});

test('a successful verify posts an HMAC contract-receipt and does not repeat the same signature',async()=>{
 resetReceiptState();
 const calls=[];
 const env={
  SITE_ORIGIN:'http://127.0.0.1:5173',
  CONTRACT_ADAPTER_KEY:'adapter-hmac-secret',
  SITE_FETCH:async(url,init)=>{
   calls.push({url:String(url),headers:init.headers,body:init.body});
   assert.equal(await verifyService(new Request(url,{method:'POST',headers:init.headers,body:init.body}),init.body,env.CONTRACT_ADAPTER_KEY),true);
   return Response.json({confirmed:true});
  }
 };
 const first=await notifySiteReceipt(env,'intent-one','5'.repeat(64));
 const again=await notifySiteReceipt(env,'intent-one','5'.repeat(64));
 assert.equal(first.ok,true);
 assert.equal(again.duplicate,true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'http://127.0.0.1:5173/api/contract-receipt');
 assert.deepEqual(JSON.parse(calls[0].body),{intentId:'intent-one',signature:'5'.repeat(64)});
});

test('prepared-position watch posts a receipt when the PDA appears on-chain',async()=>{
 resetReceiptState();
 const position=Keypair.generate().publicKey.toBase58();
 rememberPrepared({id:'watched-intent',kind:'stake',wallet:'W',amountUnits:'1',expiresAt:Date.now()+60000},position);
 assert.equal(preparedCount(),1);
 const calls=[];
 const env={
  SITE_ORIGIN:'http://127.0.0.1:5173',
  CONTRACT_ADAPTER_KEY:'adapter-hmac-secret',
  SITE_FETCH:async(url,init)=>{
   calls.push(JSON.parse(init.body));
   return Response.json({confirmed:true});
  }
 };
 const conn={
  async getAccountInfo(){return {data:Buffer.alloc(8)};},
  async getSignaturesForAddress(){return [{signature:'Sig11111111111111111111111111111111111111111',err:null}];}
 };
 await pollPrepared(conn,env,env.SITE_FETCH);
 assert.equal(preparedCount(),0);
 assert.deepEqual(calls[0],{intentId:'watched-intent',signature:'Sig11111111111111111111111111111111111111111'});
 forgetPrepared('watched-intent');
});

test('/v1/verify posts HMAC /api/contract-receipt after a successful verify',async()=>{
 resetReceiptState();
 const calls=[];
 const env={
  GAME_PROGRAM_ID:'F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x',
  GAME_TOKEN_MINT:Keypair.generate().publicKey.toBase58(),
  CONTRACT_ADAPTER_KEY:'adapter-hmac-secret',
  SITE_ORIGIN:'http://127.0.0.1:5173',
  SITE_FETCH:async(url,init)=>{
   calls.push({url:String(url),body:JSON.parse(init.body)});
   assert.equal(await verifyService(new Request(url,{method:'POST',headers:init.headers,body:init.body}),init.body,env.CONTRACT_ADAPTER_KEY),true);
   return Response.json({confirmed:true});
  },
  verifyIntent:async body=>({finalized:true,success:true,intentId:body.intentId,signature:body.signature})
 };
 const body=JSON.stringify({intentId:'verify-intent',kind:'stake',wallet:'W',signature:'SigVerify111111111111111111111111111111111',amountUnits:'1'});
 const headers=await signedHeaders(body,env.CONTRACT_ADAPTER_KEY);
 const response=await handleAdapterRequest(new Request('http://adapter.local/v1/verify',{method:'POST',headers,body}),env);
 assert.equal(response.status,200);
 assert.equal((await response.json()).finalized,true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'http://127.0.0.1:5173/api/contract-receipt');
 assert.deepEqual(calls[0].body,{intentId:'verify-intent',signature:'SigVerify111111111111111111111111111111111'});
});
