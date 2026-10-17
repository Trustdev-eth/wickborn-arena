import {TOKENS} from './stock-roster.js';

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
 const prices=TOKENS.map(token=>{
  const quote=frame?.prices?.find(p=>matchesStockQuote(p,token));
  if(!quote)return {symbol:token.symbol,price:null,publishTime:null,feedId:null,status:'not-connected'};
  const stale=quote.publishTime*1000>now+5000||now-quote.publishTime*1000>900000;
  return {...quote,symbol:token.symbol,basis:String(quote.symbol).toUpperCase()===token.underlying?'underlying-stock':'stock-token',status:stale?'stale':quote.status};
 });
 return {...frame,source:frame?.source||'Stock feed',status:prices.some(p=>p.status==='live')?'live':'not-connected',prices};
}
export const stockDeckReady=(frame,deck)=>deck.every(id=>frame?.prices?.[id]?.status==='live');

export function stockVisualState(state,frame){
 if(!state?.market)return state;
 const market=state.market;
 return {...state,market:{...market,multipliers:TOKENS.map((_,id)=>frame?.prices?.[id]?.status==='live'?market.multipliers?.[id]??1:1),status:TOKENS.map((_,id)=>frame?.prices?.[id]?.status==='live'?market.status?.[id]||'no-baseline':'no-baseline')}};
}
