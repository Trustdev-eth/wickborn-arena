import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS,TOKENS} from '../public/game/stock-roster.js';
import {CARDS as ENGINE_CARDS} from '../public/game/engine.js';
import {TOKENS as PROTOCOL_TOKENS,stakeRequirement} from '../public/game/tokens.js';
import {matchesStockQuote,stockMarketFrame,stockDeckReady,stockVisualState} from '../public/game/stock-market.js';
const now=1800000000000;
const quote=(symbol,feedId,price=100)=>({symbol,feedId,price,publishTime:now/1000,status:'live'});

test('all twelve displayed fighters reference stock tokens and have distinct identities',()=>{
 assert.deepEqual(TOKENS.map(t=>t.symbol),['AAPLx','TSLAx','MSFTx','GOOGLx','AMZNx','NVDAx','JNJx','METAx','JPMx','NFLXx','MCDx','HOODx']);
 assert.equal(new Set(TOKENS.map(t=>t.name)).size,12);
 assert.ok(TOKENS.every(t=>t.asset==='stock-token'&&t.chain==='solana'&&t.company&&t.productUrl.startsWith('https://assets.backed.fi/products/')));
});
test('stock presentation preserves every contract-facing ID, staking threshold and combat value',()=>{
 for(let id=0;id<12;id++){
  assert.equal(CARDS[id].id,id);assert.equal(TOKENS[id].baseStake,PROTOCOL_TOKENS[id].baseStake);
  for(const key of ['type','cost','hp','dmg','speed','range','rate','splash','stun','slow','air','count','siege','heal','charge','split','airHit'])assert.deepEqual(CARDS[id][key],ENGINE_CARDS[id][key],`${id}: ${key}`);
  assert.equal(stakeRequirement(id,2),TOKENS[id].baseStake);
 }
});
test('crypto-indexed API responses cannot be presented as stock quotes',()=>{
 const frame=stockMarketFrame({source:'Public',prices:PROTOCOL_TOKENS.map(t=>quote(t.symbol,t.symbol==='NVDA'?'yahoo:NVDA':'coingecko:bitcoin'))},now);
 assert.equal(frame.prices[0].price,null);assert.equal(frame.prices[0].status,'not-connected');assert.equal(frame.prices[5].price,100);assert.equal(frame.prices[5].basis,'underlying-stock');
 assert.equal(stockDeckReady(frame,[0,1,2,3,4,5,7,10]),false);
 assert.equal(matchesStockQuote(quote('AAPLx','yahoo:NVDA'),TOKENS[0]),false);
 assert.equal(matchesStockQuote(quote('AAPLx','coingecko:bitcoin'),TOKENS[0]),false);
});
test('matching stock tokens are mapped by symbol rather than response order, with underlying prices distinguished',()=>{
 const frame=stockMarketFrame({prices:TOKENS.map(t=>quote(t.symbol,'coingecko:'+t.productUrl.split('/').pop())).reverse()},now);
 assert.equal(stockDeckReady(frame,[0,1,2,3,4,5,7,10]),true);assert.equal(frame.prices[0].symbol,'AAPLx');assert.equal(frame.prices[0].basis,'stock-token');
 const stock=stockMarketFrame({prices:[quote('NVDA','yahoo:NVDA')]},now);assert.equal(stock.prices[5].basis,'underlying-stock');
});
test('old, future, non-finite and missing stock quotes never enable new token matches',()=>{
 for(const row of [null,quote('AAPLx','apple-xstock',NaN),{...quote('AAPLx','apple-xstock'),publishTime:now/1000-901},{...quote('AAPLx','apple-xstock'),publishTime:now/1000+6}]){
  const frame=stockMarketFrame({prices:row?[row]:[]},now);assert.equal(stockDeckReady(frame,[0]),false);
 }
});
test('stock render filtering leaves authoritative snapshots untouched',()=>{
 const state={market:{multipliers:Array(12).fill(1.15),status:Array(12).fill('live'),sequence:3}},before=structuredClone(state),frame=stockMarketFrame({prices:[quote('NVDA','yahoo:NVDA')]},now),view=stockVisualState(state,frame);
 assert.deepEqual(state,before);assert.equal(view.market.multipliers[0],1);assert.equal(view.market.multipliers[5],1.15);assert.equal(view.market.status[0],'no-baseline');
});
test('Wickborn brand and all card renderers use the new artwork',()=>{
 const client=readFileSync(new URL('../public/game/client.js',import.meta.url),'utf8'),css=readFileSync(new URL('../app/wickborn.css',import.meta.url),'utf8');
 assert.ok(client.includes('WICKBORN'));assert.ok(client.includes('/brand/wickborn-mark.svg'));assert.ok(client.includes('spriteMarkup'));assert.ok(css.includes('background-image:var(--sprite-art,none)'));
 assert.ok(readFileSync(new URL('../public/game/renderer-2d.js',import.meta.url),'utf8').includes('SPRITE_ART.map'));
 assert.ok(readFileSync(new URL('../public/game/stock-creatures.png',import.meta.url)).byteLength>1000);assert.match(readFileSync(new URL('../public/brand/wickborn-mark.svg',import.meta.url),'utf8'),/<svg[^>]*viewBox="0 0 64 64"/);
});
