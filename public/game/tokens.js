// Stable card IDs preserve existing decks; price references are not asset custody.
export const TOKENS = [
 {symbol:'AAPLx',underlying:'AAPL',name:'Orchardhorn',feed:'Equity.US.AAPL/USD',asset:'equity',color:'#47b847',baseStake:300,identity:'A green bull with pearl armor, silver horns and a copper leaf shield.'},
 {symbol:'TSLAx',underlying:'TSLA',name:'Voltrunner',feed:'Equity.US.TSLA/USD',asset:'equity',color:'#e64639',baseStake:220,identity:'A charcoal fox with a scarlet lightning tail and silver battery coils.'},
 {symbol:'MSFTx',underlying:'MSFT',name:'Cloudback',feed:'Equity.US.MSFT/USD',asset:'equity',color:'#3078d6',baseStake:320,identity:'An ivory-and-navy tortoise carrying a fortress of pale-blue cloud cubes.'},
 {symbol:'GOOGLx',underlying:'GOOGL',name:'Lensfin',feed:'Equity.US.GOOGL/USD',asset:'equity',color:'#2865dd',baseStake:180,identity:'A blue penguin scout with a brass lens, red scarf and compass crest.'},
 {symbol:'AMZNx',underlying:'AMZN',name:'Parcelpack',feed:'Equity.US.AMZN/USD',asset:'equity',color:'#ee9b24',baseStake:100,identity:'Three orange courier gliders with teal wings and cardboard parcels.'},
 {symbol:'NVDAx',underlying:'NVDA',name:'Tensorforge',feed:'Equity.US.NVDA/USD',asset:'equity',color:'#79bd24',baseStake:500,identity:'An emerald chip golem with luminous circuits. Heavy tower-breaking compute.'},
 {symbol:'JNJx',underlying:'JNJ',name:'Vitalbloom',feed:'Equity.US.JNJ/USD',asset:'equity',color:'#e66c78',baseStake:180,identity:'A mint frog healer in an ivory coat, carrying a coral lily staff.'},
 {symbol:'METAx',underlying:'META',name:'Portalwyrm',feed:'Equity.US.META/USD',asset:'equity',color:'#6951ca',baseStake:420,identity:'An indigo dragon with lilac scales, cyan portal rings and translucent blue wings.'},
 {symbol:'JPMx',underlying:'JPM',name:'Vaultguard',feed:'Equity.US.JPM/USD',asset:'equity',color:'#bf9236',baseStake:280,identity:'A navy rhinoceros in brass vault armor with a single ivory nose horn.'},
 {symbol:'NFLXx',underlying:'NFLX',name:'Reelmoth',feed:'Equity.US.NFLX/USD',asset:'equity',color:'#d73849',baseStake:140,identity:'A charcoal moth with crimson film-ribbon wings and reel-shaped markings.'},
 {symbol:'MCDx',underlying:'MCD',name:'Frydrop',feed:'Equity.US.MCD/USD',asset:'equity',color:'#f0bb2f',baseStake:120,identity:'A golden slime with a red paper wrap and a crown of chunky golden fries.'},
 {symbol:'HOODx',underlying:'HOOD',name:'Hoodwing',feed:'Equity.US.HOOD/USD',asset:'equity',color:'#269e69',baseStake:360,identity:'A jade owl with a cream face, dark-green hood and layered feather wings.'}
];
export const MARKET_INTERVAL=5, MARKET_SENSITIVITY=200, MIN_DAMAGE_MULT=.85, MAX_DAMAGE_MULT=1.15;
// Yahoo last prints freeze at the regular close and can be delayed ~15m. Keep the
// last session price usable overnight and across weekends so the roster stays connected.
export const EQUITY_QUOTE_MAX_MS=345600000;
export const quoteMaxAgeMs=(source,asset)=>asset==='equity'?EQUITY_QUOTE_MAX_MS:source==='Pyth'?45000:180000;
export const quoteHasPrice=p=>!!p&&Number.isFinite(p.price)&&p.price>0&&Number.isFinite(p.publishTime);
export const quoteConnected=p=>quoteHasPrice(p)&&(p.status==='live'||p.status==='closed-or-stale');
export const LEVEL_STAKE_FACTORS=[0,0,1,3,7,15];
export const stakeRequirement=(card,level)=>TOKENS[card]&&Number.isInteger(level)&&level>=1&&level<=5?TOKENS[card].baseStake*LEVEL_STAKE_FACTORS[level]:null;
export function damageMultiplier(start,current){if(!Number.isFinite(start)||start<=0||!Number.isFinite(current)||current<=0)return 1;return Math.max(MIN_DAMAGE_MULT,Math.min(MAX_DAMAGE_MULT,1+((current-start)/start)*MARKET_SENSITIVITY));}
export function marketBaseline(frame,now=Date.now()){
 const rows=TOKENS.map((_,id)=>quoteConnected(frame?.prices?.[id])?frame.prices[id]:null);
 return {startedAt:now,baseline:rows.map(p=>p?{price:p.price,publishTime:p.publishTime,feedId:p.feedId}:null),multipliers:TOKENS.map(()=>1),status:rows.map(p=>p?'live':'no-baseline'),current:rows,sequence:0,nextUpdate:MARKET_INTERVAL,history:[],source:frame?.source||'Public'};
}
export function updateMarket(g,frame,at=g.time){
 if(!g.market)return false;const m=g.market;if(at+1e-6<m.nextUpdate)return false;
 const boundary=m.nextUpdate,wall=m.startedAt+boundary*1000;
 m.multipliers=TOKENS.map((_,i)=>{const p=frame?.prices?.[i],base=m.baseline[i],previous=m.current?.[i];if(!base){m.status[i]='no-baseline';return 1;}if(!quoteConnected(p)||p.publishTime*1000>wall+5000||wall-p.publishTime*1000>quoteMaxAgeMs(m.source,TOKENS[i].asset)||p.publishTime<(previous?.publishTime||base.publishTime)){m.status[i]='stale';return 1;}m.status[i]='live';return damageMultiplier(base.price,p.price);});
 m.current=TOKENS.map((_,i)=>m.status[i]==='live'?frame.prices[i]:m.current?.[i]||null);m.sequence++;m.history.push({at:boundary,multipliers:[...m.multipliers],status:[...m.status],prices:m.current.map(p=>p?{price:p.price,publishTime:p.publishTime,feedId:p.feedId}:null)});m.history=m.history.slice(-8);m.nextUpdate+=MARKET_INTERVAL;return true;
}
