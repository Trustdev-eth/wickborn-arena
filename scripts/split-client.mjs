import {readFileSync,writeFileSync} from 'node:fs';

const src=readFileSync(new URL('../public/game/client.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const lines=src.split('\n');
const slice=(a,b)=>lines.slice(a-1,b).join('\n');

const NAMES=new Set([
 'selectedGame','skirmishLoadout','skirmishLaunch','skirmishRoom','skirmishBusy','practiceHistory',
 'pendingCommands','walletAddress','tokenState','capturedLanes','onlineTimer','queueTimer','toastTimer',
 'marketTimer','modalFocus','modalCb','modalCleanup','activeHold','walletChoices','matchAsset','rewardData',
 'hudKey','queueId','matchId','pingMs','predictor','transport','difficulty','playing','paused','online',
 'disposed','account','profile','runtime','pointer','filter','sector','sound','motion','stake','side',
 'page','mode','last','frame','accum','conn','g','render','tactics','audio','selected','marketFrame',
 'progression','root','$',
 'localStore','saveLocal','updateLayout','updateHeader','toast','modal','clearModal','closeModal','call',
 'refresh','onboarding','battleHTML','modeHTML','refreshLobbyOptions','renderPage','loadRuntime','loadMarket',
 'loadTokenState','squadLevels','walletModal','loginWallet','logoutWallet','formatUnits','lockLabel',
 'relativeTime','winRate','stakeRows','stakeCharacter','proofs','saveProofs','verifyProof','reviewTransaction',
 'confirmTransaction','renderTokenProfile','profileHTML','paintLedger','ranksHTML','paintRanks','rewardsHTML',
 'loadRewards','paintRewards','collectionHTML','startTokenBattle','joinTokenRoom','showTokenRoom',
 'startSkirmishQueue','joinSkirmishRoom','showSkirmishRoom','openSkirmishMatch','cancelSkirmishQueue',
 'startPractice','marketPulse','hud','select','place','bindArena','finish','ensureAccount','cancelQueue',
 'startOnline','pause','leave','loop','help','changePage'
]);

function expandKnownShorthand(code){
 return code
  .replace('{online,stake}','{online:online,stake:stake}')
  .replace('new Predictor({side})','new Predictor({side:side})')
  .replace('{call,id,onSnapshot','{call:call,id,onSnapshot')
  .replace('difficulty,date:Date.now()','difficulty:difficulty,date:Date.now()')
  .replace('{motion,winning:win}','{motion:motion,winning:win}')
  .replace('{side,active:playing,selected,pointer,online:online&&!predictor,interpolated:!!visual.interpolated,motion,paused,clock:','{side:side,active:playing,selected:selected,pointer:pointer,online:online&&!predictor,interpolated:!!visual.interpolated,motion:motion,paused:paused,clock:');
}

function canStartRegex(out){
 const t=out.trimEnd();
 if(!t)return true;
 if(/\b(?:return|typeof|throw|case|in|of|new|delete|void|do|else|instanceof)\s*$/.test(t))return true;
 const prev=t[t.length-1];
 if(t.endsWith('++')||t.endsWith('--'))return false;
 return !/[\w)$\]]/.test(prev);
}

function isObjectBrace(out){
 const t=out.replace(/\s+$/,'');
 if(/=>$/.test(t))return false;
 if(/[=(:,[]$/.test(t))return true;
 if(/\?$/.test(t)||/&&$/.test(t)||/\|\|$/.test(t))return true;
 if(/\b(?:return|throw)$/.test(t))return true;
 return false;
}

function prefixCode(code, skip=new Set()){
 let i=0,out='';
 const len=code.length,stack=[];
 const peek=(n=0)=>code[i+n];
 const isStart=c=>c!==undefined&&/[A-Za-z_$]/.test(c);
 const isPart=c=>c!==undefined&&/[\w$]/.test(c);
 const inObject=()=>stack.length&&stack[stack.length-1]==='{obj';
 function copyString(q){
  out+=q;i++;
  while(i<len){const c=code[i++];out+=c;if(c==='\\'){if(i<len)out+=code[i++];}else if(c===q)break;}
 }
 function skipString(q){
  i++;
  while(i<len){const c=code[i++];if(c==='\\')i++;else if(c===q)break;}
 }
 function sliceBalanced(){
  let depth=1,start=i;
  while(i<len&&depth>0){
   const c=code[i];
   if(c==="'"||c==='"'){skipString(c);continue;}
   if(c==='`'){skipTemplate();continue;}
   if(c==='/'&&peek(1)==='/'){while(i<len&&code[i]!=='\n')i++;continue;}
   if(c==='/'&&peek(1)==='*'){i+=2;while(i<len&&!(code[i]==='*'&&peek(1)==='/'))i++;i+=2;continue;}
   if(c==='{')depth++;
   else if(c==='}'){depth--;if(depth===0){const inner=code.slice(start,i);i++;return inner;}}
   i++;
  }
  return code.slice(start,i);
 }
 function skipTemplate(){
  i++;
  while(i<len){
   const c=code[i];
   if(c==='\\'){i+=2;continue;}
   if(c==='`'){i++;return;}
   if(c==='$'&&peek(1)==='{'){i+=2;sliceBalanced();continue;}
   i++;
  }
 }
 function copyTemplate(){
  out+='`';i++;
  while(i<len){
   const c=code[i];
   if(c==='\\'){out+=code[i++];if(i<len)out+=code[i++];continue;}
   if(c==='`'){out+=code[i++];return;}
   if(c==='$'&&peek(1)==='{'){out+='${';i+=2;out+=prefixCode(sliceBalanced(),skip)+'}';continue;}
   out+=code[i++];
  }
 }
 while(i<len){
  const c=peek();
  if(c==="'"||c==='"'){copyString(c);continue;}
  if(c==='`'){copyTemplate();continue;}
  if(c==='/'&&peek(1)==='/'){while(i<len&&peek()!=='\n')out+=code[i++];continue;}
  if(c==='/'&&peek(1)==='*'){out+=code[i++]+code[i++];while(i<len&&!(peek()==='*'&&peek(1)==='/'))out+=code[i++];out+=code[i++]+code[i++];continue;}
  if(c==='/'&&canStartRegex(out)){
   out+=code[i++];
   while(i<len){
    const ch=code[i];
    if(ch==='\\'){out+=code[i++];if(i<len)out+=code[i++];continue;}
    if(ch==='['){out+=code[i++];while(i<len&&code[i]!==']'){if(code[i]==='\\'){out+=code[i++];if(i<len)out+=code[i++];}else out+=code[i++];}if(i<len)out+=code[i++];continue;}
    if(ch==='/'){out+=code[i++];break;}
    if(ch==='\n')break;
    out+=code[i++];
   }
   while(/[gimsuy]/.test(peek()))out+=code[i++];
   continue;
  }
  if(isStart(c)){
   const start=i;i++;while(isPart(peek()))i++;
   const id=code.slice(start,i);
   const dotted=/\.\s*$/.test(out);
   const decl=/\b(?:function|async|const|let|var|class)\s*$/.test(out);
   let k=i;while(k<len&&/\s/.test(code[k]))k++;
   const isKey=code[k]===':';
   const next=code[k];
   const prevChar=out.trimEnd().slice(-1);
   const hit=!dotted&&!decl&&!isKey&&NAMES.has(id)&&!skip.has(id);
   if(hit&&inObject()&&(next===','||next==='}')&&(prevChar==='{'||prevChar===','))out+=id+':ctx.'+id;
   else out+=(hit?'ctx.':'')+id;
   continue;
  }
  if(c==='{'){stack.push(isObjectBrace(out)?'{obj':'{block');out+=code[i++];continue;}
  if(c==='}'){if(stack.length)stack.pop();out+=code[i++];continue;}
  if(c==='('){stack.push('(');out+=code[i++];continue;}
  if(c===')'){if(stack.length)stack.pop();out+=code[i++];continue;}
  if(c==='['){stack.push('[');out+=code[i++];continue;}
  if(c===']'){if(stack.length)stack.pop();out+=code[i++];continue;}
  out+=code[i++];
 }
 return out;
}

function extractCollection(){
 const line=lines[53];
 const start=line.indexOf('main.innerHTML=`');
 const from=start+'main.innerHTML=`'.length;
 const end=line.lastIndexOf('`;');
 return line.slice(from,end);
}

function writeFactory(path,exportName,imports,body,assigns,skip){
 const prefixed=prefixCode(body,skip);
 writeFileSync(path,`${imports}

export function ${exportName}(ctx){
${prefixed}
${assigns}
 return ctx;
}
`);
}

writeFileSync(new URL('../public/game/ui-icons.js',import.meta.url),`import {CARDS} from './stock-roster.js';
import {spriteMarkup} from './sprite-art.js';
${slice(18,22)}
export {paths,icon,esc,sprite,card};
`);

writeFactory(new URL('../public/game/hub-pages.js',import.meta.url),'createHubPages',
`import {icon,esc,sprite,card} from './ui-icons.js';
import {CARDS,STOCK_SECTORS} from './stock-roster.js';
import {stats} from './engine.js';
import {stakeRequirement} from './tokens.js';`,
`${slice(87,90)}
 function collectionHTML(){
  const displayLevels=page==='forge'?tokenState.levels:squadLevels('practice');
  return \`${extractCollection()}\`;
 }
${slice(117,133)}`,
` ctx.relativeTime=relativeTime;ctx.winRate=winRate;ctx.LEDGER_COPY=LEDGER_COPY;ctx.LEDGER_ICON=LEDGER_ICON;ctx.collectionHTML=collectionHTML;ctx.profileHTML=profileHTML;ctx.paintLedger=paintLedger;ctx.ranksHTML=ranksHTML;ctx.paintRanks=paintRanks;ctx.rewardsHTML=rewardsHTML;ctx.loadRewards=loadRewards;ctx.paintRewards=paintRewards;`,
 new Set(['place']));

writeFactory(new URL('../public/game/token-ui.js',import.meta.url),'createTokenUi',
`import {CARDS,TOKENS} from './stock-roster.js';
import {stakeRequirement} from './tokens.js';
import {stockDeckReady} from './stock-market.js';
import {availableWallets,connectStandard,connectRelay,signLogin,sendTransaction,disconnectWallet,currentWallet} from './wallet.js';
import {icon,esc,sprite} from './ui-icons.js';`,
`${slice(69,82)}
${slice(85,86)}
${slice(91,116)}
${slice(134,136)}`,
` ctx.formatUnits=formatUnits;ctx.lockLabel=lockLabel;ctx.stakeRows=stakeRows;ctx.stakeCharacter=stakeCharacter;ctx.proofs=proofs;ctx.saveProofs=saveProofs;ctx.verifyProof=verifyProof;ctx.reviewTransaction=reviewTransaction;ctx.confirmTransaction=confirmTransaction;ctx.renderTokenProfile=renderTokenProfile;ctx.walletModal=walletModal;ctx.loginWallet=loginWallet;ctx.logoutWallet=logoutWallet;ctx.startTokenBattle=startTokenBattle;ctx.joinTokenRoom=joinTokenRoom;ctx.showTokenRoom=showTokenRoom;`,
 new Set());

writeFactory(new URL('../public/game/classic-session.js',import.meta.url),'createClassicSession',
`import {BOT_DECK,W,H,STEP,ROUND,newGame,step,bot,deploy} from './engine.js';
import {marketBaseline,updateMarket} from './tokens.js';
import {CARDS,TOKENS} from './stock-roster.js';
import {stockVisualState} from './stock-market.js';
import {ArenaConnection} from './network.js';
import {Predictor} from './predict.js';
import {resultSummary,animateResult} from './results.js';
import {skirmishAvailability} from './tactics/online.js';
import {icon,esc,sprite,card} from './ui-icons.js';`,
`${slice(149,178)}
${slice(183,183)}`,
` ctx.startPractice=startPractice;ctx.marketPulse=marketPulse;ctx.hud=hud;ctx.select=select;ctx.place=place;ctx.bindArena=bindArena;ctx.finish=finish;ctx.ensureAccount=ensureAccount;ctx.cancelQueue=cancelQueue;ctx.startOnline=startOnline;ctx.pause=pause;ctx.leave=leave;ctx.loop=loop;`,
 new Set());

writeFactory(new URL('../public/game/skirmish-lobby.js',import.meta.url),'createSkirmishLobby',
`import {readSkirmishLoadout} from './tactics/loadout.js';
import {skirmishAvailability,isSkirmishSnapshot} from './tactics/online.js';
import {TACTICS_PROTOCOL} from './tactics/protocol.js';
import {esc} from './ui-icons.js';`,
`${slice(138,147)}`,
` ctx.startSkirmishQueue=startSkirmishQueue;ctx.joinSkirmishRoom=joinSkirmishRoom;ctx.showSkirmishRoom=showSkirmishRoom;ctx.openSkirmishMatch=openSkirmishMatch;ctx.cancelSkirmishQueue=cancelSkirmishQueue;`,
 new Set());

const sample=prefixCode(`function relativeTime(ts){const t=typeof ts==='number'?ts:Date.parse(ts);return '';}
resultSummary(g,side,{online,stake});
new Predictor({side});
call('profile');
$('#x');
page==='forge';
`);

const lets=['profile','account','page','mode','stake','difficulty','sound','motion','practiceHistory','g','side','selected','playing','paused','online','matchId','queueId','onlineTimer','queueTimer','frame','disposed','accum','last','hudKey','pointer','modalFocus','modalCb','modalCleanup','onlineBusy','conn','filter','sector','toastTimer','activeHold','transport','predictor','pingMs','runtime','tokenState','walletAddress','marketFrame','marketTimer','progression','rewardData','pendingCommands','matchAsset','capturedLanes','selectedGame','skirmishLaunch','skirmishRoom','skirmishBusy','skirmishLoadout','render','tactics','walletChoices','audio','root'];
const methods=['$','localStore','saveLocal','updateLayout','updateHeader','toast','modal','clearModal','closeModal','call','refresh','onboarding','battleHTML','modeHTML','refreshLobbyOptions','renderPage','details','replacement','saveDeck','upgrade','loadRuntime','loadMarket','loadTokenState','squadLevels','paintMiniDeck','tokenModeHTML','stockMarketRows','marketModal','help','changePage'];
const aliases=['collectionHTML','profileHTML','paintLedger','ranksHTML','paintRanks','rewardsHTML','loadRewards','paintRewards','walletModal','loginWallet','logoutWallet','stakeCharacter','reviewTransaction','confirmTransaction','renderTokenProfile','startTokenBattle','joinTokenRoom','showTokenRoom','startSkirmishQueue','joinSkirmishRoom','showSkirmishRoom','openSkirmishMatch','cancelSkirmishQueue','startPractice','hud','select','place','bindArena','finish','ensureAccount','cancelQueue','startOnline','pause','leave','loop'];

const consts=new Set(['audio']);
const wiring=`
 const ctx={};
 ${lets.map(n=>consts.has(n)
  ?`Object.defineProperty(ctx,${JSON.stringify(n)},{enumerable:true,configurable:true,get:()=>${n}});`
  :`Object.defineProperty(ctx,${JSON.stringify(n)},{enumerable:true,configurable:true,get:()=>${n},set:v=>{${n}=v;}});`).join('\n ')}
 ${methods.map(n=>`ctx.${n}=${n};`).join('\n ')}
 createHubPages(ctx);createTokenUi(ctx);createClassicSession(ctx);createSkirmishLobby(ctx);
 ${aliases.map(n=>`const ${n}=(...a)=>ctx.${n}(...a);`).join('\n ')}
`;

function keep(ranges){
 const out=[];
 for(const [a,b] of ranges)out.push(...lines.slice(a-1,b));
 return out;
}

const header=`import {DEFAULT_DECK,newGame,stats,validDeck} from './engine.js';
import {CARDS,TOKENS} from './stock-roster.js';
import {stockMarketFrame,stockDeckReady,stockVisualState} from './stock-market.js';
import {spriteMarkup} from './sprite-art.js';
import {renderer} from './renderer.js';
import {battleLayout} from './layout.js';
import {mountTactics} from './tactics/client.js';
import {playLobbyHTML,modeSetupHTML,classicBattleHTML,quickGuideHTML} from './play-ui.js';
import {readSkirmishLoadout} from './tactics/loadout.js';
import {skirmishAvailability,isSkirmishSnapshot} from './tactics/online.js';
import {TACTICS_PROTOCOL} from './tactics/protocol.js';
import {createBattleAudio} from './battle-audio.js';
import {icon,esc,sprite,card} from './ui-icons.js';
import {createHubPages} from './hub-pages.js';
import {createTokenUi} from './token-ui.js';
import {createClassicSession} from './classic-session.js';
import {createSkirmishLobby} from './skirmish-lobby.js';`;

const bodyLines=keep([[23,68],[83,84],[148,148]]);
const after=keep([[179,182],[184,189]]);
const renderIdx=bodyLines.findIndex(l=>l.includes("else if(page==='cards'||page==='forge')"));
if(renderIdx<0)throw new Error('collection branch missing');
bodyLines[renderIdx]=bodyLines[renderIdx].replace(/const displayLevels=page==='forge'\?tokenState\.levels:squadLevels\('practice'\);main\.innerHTML=`[\s\S]*`;/,'main.innerHTML=collectionHTML();');

writeFileSync(new URL('../public/game/client.js',import.meta.url),[header,'', ...bodyLines, wiring, ...after].join('\n'));
console.log(sample);
console.log(JSON.stringify({ok:true,clientLines:readFileSync(new URL('../public/game/client.js',import.meta.url),'utf8').split('\n').length}));

