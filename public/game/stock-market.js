import {TOKENS} from './stock-roster.js';
import {quoteConnected,quoteHasPrice,quoteMaxAgeMs} from './tokens.js';

// Only display a quote against the stock it actually identifies. The deployed
// backend can migrate independently; crypto-indexed responses must not be relabeled.
export function matchesStockQuote(quote,token){
 if(!quote||!token||!Number.isFinite(quote.price)||quote.price<=0||!Number.isFinite(quote.publishTime))return false;
 const symbol=String(quote.symbol||'').toUpperCase(),xstock=token.symbol.toUpperCase(),underlying=token.underlying;
 if(symbol!==xstock&&symbol!==underlying)return false;
 const id=String(quote.feedId||'');
 if(id.startsWith('yahoo:'))return symbol===underlying&&id==='yahoo:'+underlying;
 if(id.startsWith('coingecko:'))return symbol===xstock&&id==='coingecko:'+token.productUrl.split('/').pop();
 if(id.startsWith('Equity.'))return id==='Equity.US.'+underlying+'/USD';
 return symbol===xstock&&id.length>0;
}
export function stockMarketFrame(frame,now=Date.now()){
 const maxAge=quoteMaxAgeMs('Public','equity');
 const prices=TOKENS.map(token=>{
  const quote=frame?.prices?.find(p=>matchesStockQuote(p,token));
  if(!quoteHasPrice(quote))return {symbol:token.symbol,price:null,publishTime:null,feedId:null,status:'not-connected'};
  const basis=String(quote.symbol).toUpperCase()===token.underlying?'underlying-stock':'stock-token';
  if(quote.publishTime*1000>now+5000||now-quote.publishTime*1000>maxAge)return {...quote,symbol:token.symbol,basis,status:'closed-or-stale'};
  return {...quote,symbol:token.symbol,basis,status:quoteConnected(quote)?'live':quote.status};
 });
 return {...frame,source:frame?.source||'Stock feed',status:prices.some(p=>p.status==='live')?'live':prices.some(quoteHasPrice)?'closed':'not-connected',prices};
}
export const stockDeckReady=(frame,deck)=>deck.every(id=>frame?.prices?.[id]?.status==='live');

export function stockVisualState(state,frame){
 if(!state?.market)return state;
 const market=state.market;
 return {...state,market:{...market,multipliers:TOKENS.map((_,id)=>frame?.prices?.[id]?.status==='live'?market.multipliers?.[id]??1:1),status:TOKENS.map((_,id)=>{const price=frame?.prices?.[id];if(price?.status==='live')return market.status?.[id]||'no-baseline';if(quoteHasPrice(price))return market.status?.[id]==='live'?'live':'closed-or-stale';return 'no-baseline';})}};
}
