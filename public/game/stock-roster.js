// Presentation-only roster. Numeric IDs, gameplay and staking amounts stay owned
// by the existing engine/contracts. Do not import this module into server code.
import {CARDS as ENGINE_CARDS} from './engine.js';
import {TOKENS as PROTOCOL_TOKENS} from './tokens.js';
const entries=[
 ['AAPLx','AAPL','Apple','Technology','Orchardhorn','#47b847','apple-xstock','A green bull with pearl armor, silver horns and a copper leaf shield.','Sweeps nearby enemies with a powerful shoulder strike.'],
 ['TSLAx','TSLA','Tesla','Mobility','Voltrunner','#e64639','tesla-xstock','A charcoal fox with a scarlet lightning tail and silver battery coils.','Electric bolts briefly stun enemies on the ground or in the air.'],
 ['MSFTx','MSFT','Microsoft','Technology','Cloudback','#3078d6','microsoft-xstock','An ivory-and-navy tortoise carrying a fortress of pale-blue cloud cubes.','Its cloud armor absorbs damage while the squad advances.'],
 ['GOOGLx','GOOGL','Alphabet','Technology','Lensfin','#2865dd','alphabet-xstock','A blue penguin scout with a brass lens, red scarf and compass crest.','Lens-guided projectiles slow enemies and defend the lane.'],
 ['AMZNx','AMZN','Amazon','Commerce','Parcelpack','#ee9b24','amazon-xstock','Three orange courier gliders with teal wings and cardboard parcels.','Three fast airborne couriers overwhelm isolated enemies.'],
 ['NVDAx','NVDA','NVIDIA','Technology','Tensorforge','#79bd24','nvidia-xstock','An emerald chip golem with broad processor shoulders, copper claws and a mint visor.','Ignores creatures and drives its heavy compute fists into towers.'],
 ['JNJx','JNJ','Johnson & Johnson','Healthcare','Vitalbloom','#e66c78','johnson-johnson-xstock','A mint frog healer in an ivory coat, carrying a coral lily staff.','Restores nearby allies while firing petal bolts at enemies.'],
 ['METAx','META','Meta','Technology','Portalwyrm','#6951ca','meta-xstock','An indigo dragon with lilac scales, cyan portal rings and translucent blue wings.','Airborne portal blasts splash across tightly packed defenders.'],
 ['JPMx','JPM','JPMorgan Chase','Finance','Vaultguard','#bf9236','jpmorgan-chase-xstock','A navy rhinoceros in brass vault armor with a single ivory nose horn.','Charges the front line; its first strike deals double damage.'],
 ['NFLXx','NFLX','Netflix','Entertainment','Reelmoth','#d73849','netflix-xstock','A charcoal moth with crimson film-ribbon wings and reel-shaped markings.','Supports the squad with healing light and swift ranged attacks.'],
 ['MCDx','MCD',"McDonald's",'Commerce','Frydrop','#f0bb2f','mcdonalds-xstock','A golden slime with a red paper wrap and a crown of chunky golden fries.','Splits into two smaller Frydrops when defeated.'],
 ['HOODx','HOOD','Robinhood','Finance','Hoodwing','#269e69','robinhood-xstock','A jade owl with a cream face, dark-green hood and layered feather wings.','A swift aerial hunter that strikes ground and flying enemies.']
];
export const TOKENS=entries.map(([symbol,underlying,company,sector,name,color,slug,identity,ability],id)=>Object.freeze({id,symbol,underlying,company,sector,name,color,identity,ability,asset:'stock-token',chain:'solana',issuer:'Backed Assets',productUrl:'https://assets.backed.fi/products/'+slug,baseStake:PROTOCOL_TOKENS[id].baseStake}));
export const CARDS=ENGINE_CARDS.map((c,id)=>Object.freeze({...c,...TOKENS[id],desc:TOKENS[id].identity+' '+TOKENS[id].ability}));
export const STOCK_SECTORS=['All','Technology','Mobility','Commerce','Healthcare','Finance','Entertainment'];
