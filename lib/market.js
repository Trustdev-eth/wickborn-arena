import {TOKENS,quoteMaxAgeMs} from '../public/game/tokens.js';
const memory=new Map(),flights=new Map();
const YAHOO_QUOTE='https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_CHART='https://query1.finance.yahoo.com/v8/finance/chart/';
const publicHeaders={'Accept':'application/json','User-Agent':'WickbornArena/0.1'};
const yahooTimeout=()=>({headers:publicHeaders,signal:AbortSignal.timeout(10000)});
async function readMarketCache(db,key){
 if(!db)return null;
 try{return await db.prepare('SELECT * FROM market_cache WHERE cache_key=?').bind(key).first();}catch{return null;}
}
async function writeMarketCache(db,sql,binds){
 if(!db)return;
 try{const q=db.prepare(sql);return binds?await q.bind(...binds).run():await q.run();}catch{return null;}
}
const freshFrame=(frame,now)=>({...frame,prices:frame.prices.map((p,i)=>{
 if(p.status!=='live'||!Number.isFinite(p.publishTime))return p;
 const max=quoteMaxAgeMs(frame.source,TOKENS[i]?.asset);
 return now-p.publishTime*1000>max||p.publishTime*1000>now+5000?{...p,status:TOKENS[i]?.asset==='equity'?'closed-or-stale':'stale'}:p;
})});
const neutral=(reason,now,source='Public')=>({source,status:reason,asOf:now,prices:TOKENS.map(t=>({symbol:t.symbol,status:reason,price:null,publishTime:null,feedId:null}))});
export function parsePrice(row,expected,now=Date.now(),maxAge=45){
 const p=row?.price,id=String(row?.id||'').replace(/^0x/,'').toLowerCase();if(!p||id!==expected||!/^\d{1,30}$/.test(String(p.price))||!/^\d{1,30}$/.test(String(p.conf))||!Number.isInteger(p.expo)||p.expo< -18||p.expo>12)return null;
 const price=Number(p.price)*10**p.expo,confidence=Number(p.conf)*10**p.expo,publishTime=p.publish_time;
 if(!Number.isFinite(price)||price<=0||!Number.isFinite(confidence)||confidence<0||confidence/price>.02||!Number.isInteger(publishTime)||publishTime*1000>now+5000||now-publishTime*1000>maxAge*1000)return null;
 return {price,confidence,publishTime,feedId:id,status:'live'};
}
export function parsePublicQuote(price,publishTime,now=Date.now(),maxAgeMs=180000){
 const ts=Math.trunc(Number(publishTime));
 if(!Number.isFinite(price)||price<=0||!Number.isFinite(ts)||ts<=0)return null;
 if(ts*1000>now+5000||now-ts*1000>maxAgeMs)return null;
 return {price,publishTime:ts,status:'live'};
}
export async function getMarket(env,now=Date.now(),fetcher=fetch){
 if(env.MARKET_SOURCE==='off')return neutral('unconfigured',now);
 if(env.PYTH_API_KEY)return getPythMarket(env,now,fetcher);
 return getPublicMarket(env,now,fetcher);
}
async function getPythMarket(env,now,fetcher){
 const db=env.DB,key=env.PYTH_ENDPOINT||'https://pyth.dourolabs.app/hermes',cached=memory.get(key);if(cached&&now-cached.asOf<10000)return freshFrame(cached,now);
 if(flights.has(key))return flights.get(key);
 const work=(async()=>{
  const row=await db.prepare("SELECT * FROM market_cache WHERE cache_key='roster'").first();
  if(row&&now-row.updated_at<10000){const result=JSON.parse(row.payload);memory.set(key,result);return freshFrame(result,now);}
  await db.prepare("INSERT OR IGNORE INTO market_cache (cache_key,payload,updated_at,lease_until,feeds) VALUES ('roster','{}',0,0,'{}')").run();
  const lease=await db.prepare("UPDATE market_cache SET lease_until=? WHERE cache_key='roster' AND lease_until<?").bind(now+12000,now).run();
  if(!lease.meta.changes)return row?.payload&&row.payload!=='{}'?freshFrame(JSON.parse(row.payload),now):neutral('unavailable',now,'Pyth');
  try{
   const origin=new URL(key);if(origin.protocol!=='https:')throw new Error('HTTPS Pyth endpoint required');
   let feeds={...Object.fromEntries(TOKENS.filter(t=>t.feedId).map(t=>[t.feed,t.feedId])),...JSON.parse(row?.feeds||'{}')};
   if(env.PYTH_FEED_IDS){const overrides=JSON.parse(env.PYTH_FEED_IDS);for(const t of TOKENS){const id=overrides[t.symbol];if(id&&/^(0x)?[a-fA-F0-9]{64}$/.test(id))feeds[t.feed]=id.replace(/^0x/,'').toLowerCase();}}
   const headers={Authorization:'Bearer '+env.PYTH_API_KEY};
   if(TOKENS.some(t=>!feeds[t.feed])){
    const r=await fetcher(key+'/v2/price_feeds',{headers,signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error('Pyth catalog unavailable');const catalog=await r.json();
    if(!Array.isArray(catalog))throw new Error('Invalid Pyth catalog');for(const t of TOKENS){const matches=catalog.filter(f=>f.attributes?.symbol===t.feed&&/^(0x)?[a-fA-F0-9]{64}$/.test(f.id));if(matches.length===1)feeds[t.feed]=matches[0].id.replace(/^0x/,'').toLowerCase();}
   }
   const query=new URLSearchParams({parsed:'true'});for(const t of TOKENS)if(feeds[t.feed])query.append('ids[]',feeds[t.feed]);
   const r=await fetcher(key+'/v2/updates/price/latest?'+query,{headers,signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error('Pyth feed unavailable');const body=await r.json();if(!Array.isArray(body.parsed))throw new Error('Invalid Pyth prices');
   const prior=row?.payload&&row.payload!=='{}'?JSON.parse(row.payload):null;
   const prices=TOKENS.map((t,i)=>{const id=feeds[t.feed],raw=body.parsed.find(p=>String(p.id).replace(/^0x/,'').toLowerCase()===id),parsed=id?parsePrice(raw,id,now):null;
    if(!parsed||parsed.publishTime<(prior?.prices?.[i]?.publishTime||0))return {symbol:t.symbol,feedId:t.feed,price:null,publishTime:null,status:t.asset==='equity'?'closed-or-stale':id?'stale':'unsupported'};
    return {symbol:t.symbol,...parsed,feedId:t.feed};});
   const result={source:'Pyth',status:prices.some(p=>p.status==='live')?'live':'unavailable',asOf:now,prices};
   await db.prepare("UPDATE market_cache SET payload=?,updated_at=?,lease_until=0,feeds=? WHERE cache_key='roster'").bind(JSON.stringify(result),now,JSON.stringify(feeds)).run();memory.set(key,result);return result;
  }catch{await db.prepare("UPDATE market_cache SET lease_until=? WHERE cache_key='roster'").bind(now+10000).run();console.warn('Market refresh unavailable');return neutral('unavailable',now,'Pyth');}
 })();flights.set(key,work);try{return await work;}finally{flights.delete(key);}
}
async function getPublicMarket(env,now,fetcher){
 const db=env.DB,key='public-roster',cached=memory.get(key);if(cached&&now-cached.asOf<10000)return freshFrame(cached,now);
 if(flights.has(key))return flights.get(key);
 const work=(async()=>{
  const row=await readMarketCache(db,'public-roster');
  if(row&&now-row.updated_at<10000){const result=JSON.parse(row.payload);memory.set(key,result);return freshFrame(result,now);}
  if(db){
   await writeMarketCache(db,"INSERT OR IGNORE INTO market_cache (cache_key,payload,updated_at,lease_until,feeds) VALUES ('public-roster','{}',0,0,'{}')");
   const lease=await writeMarketCache(db,"UPDATE market_cache SET lease_until=? WHERE cache_key='public-roster' AND lease_until<?",[now+12000,now]);
   if(lease&&!lease.meta?.changes)return row?.payload&&row.payload!=='{}'?freshFrame(JSON.parse(row.payload),now):neutral('unavailable',now);
  }
  try{
   const prices=await fetchYahooQuotes(fetcher,now);
   if(!prices.some(p=>Number.isFinite(p.price)))throw new Error('Public stock feed unavailable');
   const result={source:'Public',status:prices.some(p=>p.status==='live')?'live':'closed',asOf:now,prices};
   await writeMarketCache(db,"UPDATE market_cache SET payload=?,updated_at=?,lease_until=0,feeds='{}' WHERE cache_key='public-roster'",[JSON.stringify(result),now]);
   memory.set(key,result);return result;
  }catch{await writeMarketCache(db,"UPDATE market_cache SET lease_until=? WHERE cache_key='public-roster'",[now+10000]);console.warn('Market refresh unavailable');return row?.payload&&row.payload!=='{}'?freshFrame(JSON.parse(row.payload),now):neutral('unavailable',now);}
 })();flights.set(key,work);try{return await work;}finally{flights.delete(key);}
}
function equityPrints(row){
 return [
  [row?.regularMarketPrice,row?.regularMarketTime],
  [row?.preMarketPrice,row?.preMarketTime],
  [row?.postMarketPrice,row?.postMarketTime]
 ];
}
function pickEquityPrint(row,now){
 const maxAge=quoteMaxAgeMs('Public','equity');
 let best=null;
 for(const [price,time] of equityPrints(row)){
  const parsed=parsePublicQuote(Number(price),Number(time),now,maxAge);
  if(parsed&&(!best||parsed.publishTime>best.publishTime))best=parsed;
 }
 return best;
}
function lastEquityPrint(row,now){
 const live=pickEquityPrint(row,now);if(live)return live;
 let best=null;
 for(const [price,time] of equityPrints(row)){
  const value=Number(price),ts=Math.trunc(Number(time));
  if(!Number.isFinite(value)||value<=0||!Number.isFinite(ts)||ts<=0||ts*1000>now+5000)continue;
  if(!best||ts>best.publishTime)best={price:value,publishTime:ts,status:'closed-or-stale'};
 }
 return best;
}
async function fetchYahooCharts(fetcher,symbols){
 if(!symbols.length)return [];
 return Promise.all(symbols.map(symbol=>fetcher(YAHOO_CHART+encodeURIComponent(symbol)+'?interval=1m&range=5d',yahooTimeout()).catch(()=>null)));
}
async function fetchYahooQuotes(fetcher,now){
 const symbols=TOKENS.map(t=>t.underlying);
 const batch=await fetcher(YAHOO_QUOTE+'?symbols='+encodeURIComponent(symbols.join(',')),yahooTimeout()).catch(()=>null);
 const bySymbol=new Map();
 if(batch?.ok){
  const rows=(await batch.json())?.quoteResponse?.result;
  if(Array.isArray(rows))for(const row of rows)if(row?.symbol)bySymbol.set(String(row.symbol).toUpperCase(),row);
 }
 const missing=symbols.filter(symbol=>!lastEquityPrint(bySymbol.get(symbol),now));
 if(missing.length){
  const charts=await fetchYahooCharts(fetcher,missing);
  for(let i=0;i<missing.length;i++){
   if(!charts[i]?.ok)continue;
   try{
    const meta=(await charts[i].json())?.chart?.result?.[0]?.meta;
    if(meta)bySymbol.set(missing[i],{
     symbol:missing[i],regularMarketPrice:meta.regularMarketPrice,regularMarketTime:meta.regularMarketTime,
     preMarketPrice:meta.preMarketPrice,preMarketTime:meta.preMarketTime,postMarketPrice:meta.postMarketPrice,postMarketTime:meta.postMarketTime
    });
   }catch{/* one missing print is closed-or-stale */}
  }
 }
 return TOKENS.map(t=>{
  const parsed=lastEquityPrint(bySymbol.get(t.underlying),now);
  if(!parsed)return {symbol:t.underlying,feedId:'yahoo:'+t.underlying,price:null,publishTime:null,status:'closed-or-stale'};
  return {symbol:t.underlying,feedId:'yahoo:'+t.underlying,...parsed};
 });
}
