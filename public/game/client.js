import {DEFAULT_DECK,newGame,stats,validDeck} from './engine.js';
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
import {currentWallet} from './wallet.js';
import {icon,esc,sprite,card} from './ui-icons.js';
import {createHubPages} from './hub-pages.js';
import {createTokenUi} from './token-ui.js';
import {createClassicSession} from './classic-session.js';
import {createSkirmishLobby} from './skirmish-lobby.js';

export function mount(root,{initialPage='battle'}={}){
 if(!root)return;
 let stored={};try{stored=JSON.parse(localStorage.getItem('clashlings-practice')||'{}');}catch{}
 let profile={name:stored.name||'Trainer',deck:validDeck(stored.deck)?stored.deck:[...DEFAULT_DECK],levels:Array(12).fill(1),balance:0,wins:0,losses:0,trophies:0,tokenEarned:0},account=false,page='battle',mode='practice',stake=50,difficulty='normal',sound=stored.sound!==false,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches,practiceHistory=stored.history||[],g=newGame(),side=0,selected=-1,playing=false,paused=false,online=false,matchId=null,queueId=null,onlineTimer=null,queueTimer=null,frame=0,disposed=false,accum=0,last=performance.now(),hudKey='',pointer=null,modalFocus=null,modalCb=null,modalCleanup=null,onlineBusy=false,conn='Ready',filter='all',sector='All',toastTimer=null,activeHold=null;
 const audio=createBattleAudio({enabled:sound});
 let transport=null,predictor=null,pingMs=null,runtime={contracts:{configured:false,enabled:false,symbol:'WICKB',decimals:9,lockSeconds:604800}},tokenState={levels:Array(12).fill(1),locked:Array(12).fill('0'),positions:[],refunds:[]},walletAddress=null,marketFrame=null,marketTimer=null,progression='staking',rewardData=null,pendingCommands=[],matchAsset='token',capturedLanes=new Set();
 let selectedGame=initialPage==='tactics'?'skirmish':'classic',skirmishLaunch=null,skirmishRoom=null,skirmishBusy=false;
 const localStore=()=>{try{return localStorage;}catch{return null;}};
 let skirmishLoadout=readSkirmishLoadout(localStore(),profile.deck);
 const saveLocal=()=>{try{localStorage.setItem('clashlings-practice',JSON.stringify({name:profile.name,deck:profile.deck,sound,history:practiceHistory}));}catch{}};
 root.innerHTML=`<div class="app-shell"><header class="topbar"><button class="brand" data-page="battle" aria-label="Wickborn play"><span class="brand-mark"><img src="/brand/wickborn-mark.svg?v=3" alt="" width="46" height="46"></span><span><b>WICKBORN</b></span></button><nav class="desktop-nav" aria-label="Main navigation"><button data-page="battle" class="active">Play</button><button data-page="cards">Fighters</button><button data-page="forge">Upgrades</button><button data-page="ranks">Rankings</button></nav><div class="top-actions"><button class="help-link" data-action="help">${icon('help')}<span>How to play</span></button><button class="balance-chip" data-page="profile" hidden>${icon('coin')}<span><b id="credit-top">0</b><small>WICKB earned</small></span></button><button class="wallet-connect" data-action="connect-wallet"><i></i><span id="wallet-label">Connect wallet</span></button><button class="trainer-chip" data-page="profile" hidden aria-label="Your trainer">${sprite(1)}<span id="trainer-top">Trainer</span></button><button class="icon-button" id="sound-btn" aria-label="Toggle sound">${icon('sound')}</button></div></header><div class="page-heading"><div class="page-heading-title"><span class="page-icon" id="page-icon">${icon('swords')}</span><h1 id="page-title">Play</h1><span class="page-context" id="page-context"></span></div><div class="page-meta" id="page-meta"></div></div><main id="main-content"></main><nav class="mobile-nav" aria-label="Main navigation"><button data-page="battle">${icon('swords')}Play</button><button data-page="cards">${icon('cards')}Fighters</button><button data-page="forge">${icon('forge')}Upgrades</button><button data-page="ranks">${icon('rank')}Rankings</button><button data-page="profile">${icon('user')}Trainer</button></nav><footer class="site-footer"><span>Wickborn Arena · Classic & Skirmish</span><button data-action="help">How to play ↗</button></footer></div><div id="toast" role="status" aria-live="polite"></div><div id="modal-root"></div>`;
 const $=s=>root.querySelector(s);
 function updateLayout(){const shell=$('.app-shell'),layout=battleLayout(window.innerWidth,window.innerHeight,playing);shell.dataset.dock=layout.dock;shell.dataset.sidebar=String(layout.sidebar);shell.dataset.immersive=String(layout.immersive);}
 window.addEventListener('resize',updateLayout);
 function toast(msg){if(disposed)return;$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}

 function updateHeader(){if(disposed)return;$('#credit-top').textContent=(profile.tokenEarned||0).toLocaleString();$('#trainer-top').textContent=profile.name;$('.balance-chip').hidden=!account;$('.trainer-chip').hidden=!account;$('#sound-btn').classList.toggle('muted',!sound);$('#sound-btn').setAttribute('aria-pressed',String(sound));$('#sound-btn').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('#wallet-label').textContent=walletAddress?walletAddress.slice(0,4)+'…'+walletAddress.slice(-4):'Connect wallet';$('.wallet-connect').classList.toggle('connected',!!walletAddress);for(const b of root.querySelectorAll('[data-action="battle-sound"]')){b.textContent=sound?'Sound on':'Sound off';b.setAttribute('aria-pressed',String(sound));}}
 function modal(html,onReady,options={}){if(disposed)return;const previous=$('#modal-root .modal')?modalFocus:document.activeElement;clearModal();modalFocus=previous;$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${options.className||''}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"><button class="modal-close icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>${html}</section></div>`;$('.app-shell').inert=true;document.body.classList.add('modal-open');const title=$('#modal-root h2');if(title)title.id='modal-title';modalCb=onReady;const cleanup=onReady?.();if(typeof cleanup==='function')modalCleanup=cleanup;const target=$('#modal-root input, #modal-root button:not(.modal-close), #modal-root a')||$('#modal-root .modal');target?.focus({preventScroll:true});}
 function clearModal(restoreFocus=false){modalCleanup?.();modalCleanup=null;$('#modal-root').innerHTML='';modalCb=null;$('.app-shell').inert=false;document.body.classList.remove('modal-open');if(restoreFocus)(modalFocus?.isConnected?modalFocus:$('.brand'))?.focus({preventScroll:true});}
 function closeModal(){if(skirmishRoom){cancelSkirmishQueue();return;}if(queueId){cancelQueue();return;}clearModal(true);}
 async function call(path,body){const response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(9000)});let data;try{data=await response.json();}catch{throw new Error('Connection interrupted. Try again.');}if(!response.ok)throw Object.assign(new Error(data.error||'Try again shortly.'),{status:response.status});return data;}
 async function refresh(){if(!account)return;const data=await call('profile');if(disposed)return;profile=data;walletAddress=data.wallet||walletAddress;activeHold=data.activeMatch;updateHeader();return data;}
 function onboarding(needsSignIn=false){modal(`<div class="modal-art">${sprite(0)}</div><span class="eyebrow">PLAYER ACCOUNT</span><h2>${needsSignIn?'Connect your wallet':'Choose a player name'}</h2><p>${needsSignIn?'Connect a Solana wallet to enter online battles and save your trainer. Practice is free and needs no wallet.':'Your wallet is connected. Choose the name your rivals will see.'}</p>${needsSignIn?'<button class="button primary wide" data-action="connect-wallet">Connect wallet →</button>':'<form id="trainer-form"><label for="name-input">Trainer name</label><input id="name-input" maxlength="16" value="'+esc(profile.name==='Trainer'?'':profile.name)+'" placeholder="Your battle name" required autocomplete="nickname"><button class="button primary wide" type="submit">Create trainer →</button></form>'}<button class="text-button wide" data-action="close-modal">Back to play</button>`,()=>{const form=$('#trainer-form');form?.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{profile=await call('profile',{name:$('#name-input').value,deck:profile.deck});account=true;saveLocal();clearModal();renderPage();toast('Player account created.');}catch(error){toast(error.message);}finally{button.disabled=false;}});});}
 let render=null,tactics=null;
 function battleHTML(){return playing?classicBattleHTML({online,sound}):playLobbyHTML({game:selectedGame,online:mode==='token',deck:selectedGame==='classic'?profile.deck:skirmishLoadout.deck,captain:skirmishLoadout.captain,setup:modeHTML()});}
 function modeHTML(){return modeSetupHTML({game:selectedGame,online:mode==='token',difficulty,stake,classicReady:!!runtime.contracts.enabled&&stockDeckReady(marketFrame,profile.deck),wallet:!!walletAddress,skirmishReady:skirmishAvailability(runtime).ready});}
 function refreshLobbyOptions(){if(!disposed&&page==='battle'&&!playing&&$('#mode-content'))$('#mode-content').innerHTML=modeHTML();}
 function renderPage(){if(disposed)return;if(page==='tactics'&&tactics?.playing){updateHeader();return;}tactics?.dispose?.();tactics=null;render?.dispose?.();render=null;const main=$('#main-content');updateLayout();$('.app-shell').dataset.page=page;$('.app-shell').classList.toggle('battle-screen',page==='battle'&&playing);$('.app-shell').dataset.playing=String(playing);document.body.classList.toggle('in-battle',page==='battle'&&playing);updateHeader();root.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page||(page==='tactics'&&b.dataset.page==='battle')));$('#page-title').textContent=({tactics:'Customize Skirmish',battle:playing?'Classic':'Play',cards:'Fighters',forge:'Upgrades',ranks:'Rankings',profile:'Trainer',rewards:'Rewards'})[page];const pageIcon={tactics:'crown',battle:'swords',cards:'cards',forge:'forge',ranks:'rank',profile:'user',rewards:'coin'}[page];$('#page-icon').innerHTML=icon(pageIcon);$('#page-context').textContent=({tactics:'Choose a captain and squad',battle:playing?'Verdant Crossing':'',cards:'Build your squad',forge:'Staking levels',ranks:'The Wickborn Arena League',profile:'WICKB, staking, history',rewards:'Earn WICKB in battle'})[page];$('#page-meta').innerHTML=page==='tactics'?'FREE TACTICAL MODE':page==='battle'?`<span class="arena-status" id="arena-status"><i></i>${playing?(online?'TOKEN BATTLE':'PRACTICE'):'READY TO PLAY'}</span>`:page==='cards'?icon('cards')+'12 / 12 unlocked':page==='forge'?icon('forge')+'Token staking':page==='ranks'?icon('coin')+(account?(profile.tokenEarned||0)+' WICKB earned':'Token rankings'):page==='profile'?icon('coin')+(profile.tokenEarned||0)+' WICKB earned':icon('coin')+'Fight earnings';main.scrollTop=0;
  if(page==='tactics'){const launch=skirmishLaunch;skirmishLaunch=null;main.innerHTML='<div id="tactics-host"></div>';tactics=mountTactics($('#tactics-host'),{name:profile.name,initialDeck:profile.deck,getMarket:()=>marketFrame,sound,battleAudio:audio,difficulty,onlineReady:skirmishAvailability(runtime).ready,autoStart:launch?.kind==='practice',initialOnline:launch?.packet||null,onlineId:launch?.id||null,onlinePath:launch?.path||'skirmish',call,onExit(){skirmishLoadout=readSkirmishLoadout(localStore(),profile.deck);page='battle';renderPage();},onOnline(){selectedGame='skirmish';mode='token';page='battle';renderPage();startSkirmishQueue();},onLoadoutChange(value){if(validDeck(value.deck))skirmishLoadout=value;},onSoundChange(value){sound=value;audio.setEnabled(sound);saveLocal();updateHeader();},onActivity(active){document.body.classList.toggle('in-tactics',active);}});}
  else if(page==='rewards'){main.innerHTML=rewardsHTML();loadRewards();}
  else if(page==='battle'){main.innerHTML=battleHTML();if(playing){render=renderer($('#arena'));bindArena();hudKey='';hud();$('#arena-overlay').hidden=true;$('#pause-btn').hidden=online;$('#surrender-btn').hidden=false;$('#lane-controls').hidden=false;render.draw(g,{side,active:true,selected});}}
  else if(page==='cards'||page==='forge'){main.innerHTML=collectionHTML();}
  else if(page==='profile'){main.innerHTML=profileHTML();renderTokenProfile();if(account)call('ledger').then(d=>{if(page!=='profile'||disposed)return;paintLedger(d.entries||[]);}).catch(e=>{if($('#credit-history'))$('#credit-history').textContent=e.message;});}
  else if(page==='ranks'){main.innerHTML=ranksHTML();if(account)call('ranks').then(d=>{if(page!=='ranks'||disposed)return;paintRanks(d.players||[]);}).catch(e=>{if($('#rank-list'))$('#rank-list').textContent=e.message;});}
 }
 function details(id){const c=CARDS[id],lv=page==='forge'?(tokenState.levels[id]||1):squadLevels()[id],s=stats(id,lv);modal(`<div class="detail-art" style="--card-color:${c.color}">${sprite(id)}<span class="cost">${c.cost}</span></div><span class="eyebrow">${c.symbol} STOCK TOKEN · ${c.role.toUpperCase()}</span><h2>${c.name}<span class="level-pill">LV. ${lv}</span></h2><p>${c.desc}</p><a class="stock-reference-link" href="${TOKENS[id].productUrl}" target="_blank" rel="noopener noreferrer">${esc(TOKENS[id].company)} · ${TOKENS[id].symbol} reference ↗</a><p class="market-detail">Price moves can boost or weaken damage by up to 15%. ${TOKENS[id].company} · ${TOKENS[id].symbol} · Solana stock reference.</p><div class="creature-stats"><span>Health<b>${s.hp}</b></span><span>Damage<b>${s.dmg}</b></span><span>Speed<b>${c.speed}</b></span><span>Attack<b>${c.air?'Air & ground':c.airHit?'Air & ground':'Ground'}</b></span></div>${profile.deck.includes(id)?'<span class="in-deck">'+icon('check')+'In your battle deck</span>':`<button class="button secondary wide" data-add-card="${id}">Add to battle deck ${icon('plus')}</button>`}<button class="button primary wide" data-upgrade="${id}">View staking levels</button><small class="fineprint">${lv<5?'Next level: '+stats(id,lv+1).hp+' health · '+stats(id,lv+1).dmg+' damage.':'Maximum staking level.'}</small>`);}
 function replacement(slot,newId){modal(`<span class="eyebrow">BUILD YOUR BATTLE DECK</span><h2>${newId===undefined?'Choose a replacement.':'Choose a slot to replace.'}</h2><div class="replace-grid">${(newId===undefined?CARDS.filter(c=>!profile.deck.includes(c.id)):profile.deck.map(id=>CARDS[id])).map((c,i)=>card(c,squadLevels('practice')[c.id],'mini',newId===undefined?`data-replace-slot="${slot}" data-replace-id="${c.id}"`:`data-replace-slot="${i}" data-replace-id="${newId}"`)).join('')}</div>`);}
 async function saveDeck(next){if(playing||queueId){toast('Finish your battle first.');return;}try{if(account)profile=await call('profile',{name:profile.name,deck:next});else profile.deck=next;saveLocal();clearModal();renderPage();toast('Squad saved.');}catch(e){toast(e.message);}}
 async function upgrade(id){stakeCharacter(id);}
 let walletChoices=[];
 async function loadRuntime(){try{runtime=await call('runtime');await loadMarket();if(page==='battle'&&!playing&&$('#mode-content'))$('#mode-content').innerHTML=modeHTML();}catch{}}
 async function loadMarket(){try{marketFrame=stockMarketFrame(await call('market'));}catch{marketFrame=stockMarketFrame(null);}const table=$('.market-table');if(table)table.innerHTML=stockMarketRows();}
 async function loadTokenState(){if(!account)return;try{tokenState=await call('token/status');walletAddress=tokenState.wallet||walletAddress;updateHeader();if(page==='forge')renderPage();if(page==='profile')renderTokenProfile();if(page==='battle'&&!playing)refreshLobbyOptions();}catch{}}
 function squadLevels(){return tokenState.levels||Array(12).fill(1);}
 function paintMiniDeck(){const el=$('.mini-deck');if(!el)return;el.innerHTML=profile.deck.map(id=>card(CARDS[id],squadLevels()[id],'mini',`data-card="${id}"`)).join('');}
 function tokenModeHTML(){return modeHTML();}
 function stockMarketRows(){const market=stockVisualState(g,marketFrame)?.market;return TOKENS.map((t,i)=>{const price=marketFrame?.prices?.[i],quoted=Number.isFinite(price?.price)&&price.price>0,mult=playing?(market?.multipliers?.[i]??1):1,status=playing?market?.status?.[i]:price?.status,percent=Number(((mult-1)*100).toFixed(2)),stamp=quoted?new Date(price.publishTime*1000).toLocaleTimeString():'',basis=price?.basis==='underlying-stock'?'Underlying stock':'Stock token',note=price?.status==='not-connected'?'Matching stock quote needed':status==='live'?basis+' · '+stamp:quoted&&(status==='closed-or-stale'||status==='stale')?basis+' · last print · '+stamp:status==='no-baseline'?'No match baseline · neutral':'Stale / unavailable · neutral';return `<div><b>${t.symbol}<small>${esc(t.company)}</small></b><span>${quoted?'$'+price.price.toLocaleString(undefined,{maximumSignificantDigits:6}):'Feed not connected'}<small>${note}</small></span><strong class="${percent>0?'positive':percent<0?'negative':''}">${percent>0?'+':''}${percent}%</strong></div>`;}).join('');}
 function marketModal(){modal(`<span class="eyebrow">STOCK PRICES</span><h2>Stock prices and damage</h2><p>Rising reference prices can boost a fighter’s damage. Falling prices can weaken it. Changes are capped at ±15%, and missing or stale prices stay neutral.</p><div class="market-table">${stockMarketRows()}</div><small class="fineprint">Stock tokens and underlying shares are identified separately. Missing or stale stock quotes are neutral. Free practice is available while the stock feeds connect. Character art is original and does not imply sponsorship.</small>`);}
 function help(){const resume=playing&&!online&&!paused;if(resume)pause();modal((playing&&online?'<p class="live-match-note">Your online battle continues while this guide is open.</p>':'')+quickGuideHTML(playing?'classic':selectedGame),()=>()=>{if(resume&&playing&&!online&&paused)pause();});}

 const ctx={};
 Object.defineProperty(ctx,"profile",{enumerable:true,configurable:true,get:()=>profile,set:v=>{profile=v;}});
 Object.defineProperty(ctx,"account",{enumerable:true,configurable:true,get:()=>account,set:v=>{account=v;}});
 Object.defineProperty(ctx,"page",{enumerable:true,configurable:true,get:()=>page,set:v=>{page=v;}});
 Object.defineProperty(ctx,"mode",{enumerable:true,configurable:true,get:()=>mode,set:v=>{mode=v;}});
 Object.defineProperty(ctx,"stake",{enumerable:true,configurable:true,get:()=>stake,set:v=>{stake=v;}});
 Object.defineProperty(ctx,"difficulty",{enumerable:true,configurable:true,get:()=>difficulty,set:v=>{difficulty=v;}});
 Object.defineProperty(ctx,"sound",{enumerable:true,configurable:true,get:()=>sound,set:v=>{sound=v;}});
 Object.defineProperty(ctx,"motion",{enumerable:true,configurable:true,get:()=>motion,set:v=>{motion=v;}});
 Object.defineProperty(ctx,"practiceHistory",{enumerable:true,configurable:true,get:()=>practiceHistory,set:v=>{practiceHistory=v;}});
 Object.defineProperty(ctx,"g",{enumerable:true,configurable:true,get:()=>g,set:v=>{g=v;}});
 Object.defineProperty(ctx,"side",{enumerable:true,configurable:true,get:()=>side,set:v=>{side=v;}});
 Object.defineProperty(ctx,"selected",{enumerable:true,configurable:true,get:()=>selected,set:v=>{selected=v;}});
 Object.defineProperty(ctx,"playing",{enumerable:true,configurable:true,get:()=>playing,set:v=>{playing=v;}});
 Object.defineProperty(ctx,"paused",{enumerable:true,configurable:true,get:()=>paused,set:v=>{paused=v;}});
 Object.defineProperty(ctx,"online",{enumerable:true,configurable:true,get:()=>online,set:v=>{online=v;}});
 Object.defineProperty(ctx,"matchId",{enumerable:true,configurable:true,get:()=>matchId,set:v=>{matchId=v;}});
 Object.defineProperty(ctx,"queueId",{enumerable:true,configurable:true,get:()=>queueId,set:v=>{queueId=v;}});
 Object.defineProperty(ctx,"onlineTimer",{enumerable:true,configurable:true,get:()=>onlineTimer,set:v=>{onlineTimer=v;}});
 Object.defineProperty(ctx,"queueTimer",{enumerable:true,configurable:true,get:()=>queueTimer,set:v=>{queueTimer=v;}});
 Object.defineProperty(ctx,"frame",{enumerable:true,configurable:true,get:()=>frame,set:v=>{frame=v;}});
 Object.defineProperty(ctx,"disposed",{enumerable:true,configurable:true,get:()=>disposed,set:v=>{disposed=v;}});
 Object.defineProperty(ctx,"accum",{enumerable:true,configurable:true,get:()=>accum,set:v=>{accum=v;}});
 Object.defineProperty(ctx,"last",{enumerable:true,configurable:true,get:()=>last,set:v=>{last=v;}});
 Object.defineProperty(ctx,"hudKey",{enumerable:true,configurable:true,get:()=>hudKey,set:v=>{hudKey=v;}});
 Object.defineProperty(ctx,"pointer",{enumerable:true,configurable:true,get:()=>pointer,set:v=>{pointer=v;}});
 Object.defineProperty(ctx,"modalFocus",{enumerable:true,configurable:true,get:()=>modalFocus,set:v=>{modalFocus=v;}});
 Object.defineProperty(ctx,"modalCb",{enumerable:true,configurable:true,get:()=>modalCb,set:v=>{modalCb=v;}});
 Object.defineProperty(ctx,"modalCleanup",{enumerable:true,configurable:true,get:()=>modalCleanup,set:v=>{modalCleanup=v;}});
 Object.defineProperty(ctx,"onlineBusy",{enumerable:true,configurable:true,get:()=>onlineBusy,set:v=>{onlineBusy=v;}});
 Object.defineProperty(ctx,"conn",{enumerable:true,configurable:true,get:()=>conn,set:v=>{conn=v;}});
 Object.defineProperty(ctx,"filter",{enumerable:true,configurable:true,get:()=>filter,set:v=>{filter=v;}});
 Object.defineProperty(ctx,"sector",{enumerable:true,configurable:true,get:()=>sector,set:v=>{sector=v;}});
 Object.defineProperty(ctx,"toastTimer",{enumerable:true,configurable:true,get:()=>toastTimer,set:v=>{toastTimer=v;}});
 Object.defineProperty(ctx,"activeHold",{enumerable:true,configurable:true,get:()=>activeHold,set:v=>{activeHold=v;}});
 Object.defineProperty(ctx,"transport",{enumerable:true,configurable:true,get:()=>transport,set:v=>{transport=v;}});
 Object.defineProperty(ctx,"predictor",{enumerable:true,configurable:true,get:()=>predictor,set:v=>{predictor=v;}});
 Object.defineProperty(ctx,"pingMs",{enumerable:true,configurable:true,get:()=>pingMs,set:v=>{pingMs=v;}});
 Object.defineProperty(ctx,"runtime",{enumerable:true,configurable:true,get:()=>runtime,set:v=>{runtime=v;}});
 Object.defineProperty(ctx,"tokenState",{enumerable:true,configurable:true,get:()=>tokenState,set:v=>{tokenState=v;}});
 Object.defineProperty(ctx,"walletAddress",{enumerable:true,configurable:true,get:()=>walletAddress,set:v=>{walletAddress=v;}});
 Object.defineProperty(ctx,"marketFrame",{enumerable:true,configurable:true,get:()=>marketFrame,set:v=>{marketFrame=v;}});
 Object.defineProperty(ctx,"marketTimer",{enumerable:true,configurable:true,get:()=>marketTimer,set:v=>{marketTimer=v;}});
 Object.defineProperty(ctx,"progression",{enumerable:true,configurable:true,get:()=>progression,set:v=>{progression=v;}});
 Object.defineProperty(ctx,"rewardData",{enumerable:true,configurable:true,get:()=>rewardData,set:v=>{rewardData=v;}});
 Object.defineProperty(ctx,"pendingCommands",{enumerable:true,configurable:true,get:()=>pendingCommands,set:v=>{pendingCommands=v;}});
 Object.defineProperty(ctx,"matchAsset",{enumerable:true,configurable:true,get:()=>matchAsset,set:v=>{matchAsset=v;}});
 Object.defineProperty(ctx,"capturedLanes",{enumerable:true,configurable:true,get:()=>capturedLanes,set:v=>{capturedLanes=v;}});
 Object.defineProperty(ctx,"selectedGame",{enumerable:true,configurable:true,get:()=>selectedGame,set:v=>{selectedGame=v;}});
 Object.defineProperty(ctx,"skirmishLaunch",{enumerable:true,configurable:true,get:()=>skirmishLaunch,set:v=>{skirmishLaunch=v;}});
 Object.defineProperty(ctx,"skirmishRoom",{enumerable:true,configurable:true,get:()=>skirmishRoom,set:v=>{skirmishRoom=v;}});
 Object.defineProperty(ctx,"skirmishBusy",{enumerable:true,configurable:true,get:()=>skirmishBusy,set:v=>{skirmishBusy=v;}});
 Object.defineProperty(ctx,"skirmishLoadout",{enumerable:true,configurable:true,get:()=>skirmishLoadout,set:v=>{skirmishLoadout=v;}});
 Object.defineProperty(ctx,"render",{enumerable:true,configurable:true,get:()=>render,set:v=>{render=v;}});
 Object.defineProperty(ctx,"tactics",{enumerable:true,configurable:true,get:()=>tactics,set:v=>{tactics=v;}});
 Object.defineProperty(ctx,"walletChoices",{enumerable:true,configurable:true,get:()=>walletChoices,set:v=>{walletChoices=v;}});
 Object.defineProperty(ctx,"audio",{enumerable:true,configurable:true,get:()=>audio});
 Object.defineProperty(ctx,"root",{enumerable:true,configurable:true,get:()=>root,set:v=>{root=v;}});
 ctx.$=$;
 ctx.localStore=localStore;
 ctx.saveLocal=saveLocal;
 ctx.updateLayout=updateLayout;
 ctx.updateHeader=updateHeader;
 ctx.toast=toast;
 ctx.modal=modal;
 ctx.clearModal=clearModal;
 ctx.closeModal=closeModal;
 ctx.call=call;
 ctx.refresh=refresh;
 ctx.onboarding=onboarding;
 ctx.battleHTML=battleHTML;
 ctx.modeHTML=modeHTML;
 ctx.refreshLobbyOptions=refreshLobbyOptions;
 ctx.renderPage=renderPage;
 ctx.details=details;
 ctx.replacement=replacement;
 ctx.saveDeck=saveDeck;
 ctx.upgrade=upgrade;
 ctx.loadRuntime=loadRuntime;
 ctx.loadMarket=loadMarket;
 ctx.loadTokenState=loadTokenState;
 ctx.squadLevels=squadLevels;
 ctx.paintMiniDeck=paintMiniDeck;
 ctx.tokenModeHTML=tokenModeHTML;
 ctx.stockMarketRows=stockMarketRows;
 ctx.marketModal=marketModal;
 ctx.help=help;
 ctx.changePage=changePage;
 createHubPages(ctx);createTokenUi(ctx);createClassicSession(ctx);createSkirmishLobby(ctx);
 const collectionHTML=(...a)=>ctx.collectionHTML(...a);
 const profileHTML=(...a)=>ctx.profileHTML(...a);
 const paintLedger=(...a)=>ctx.paintLedger(...a);
 const ranksHTML=(...a)=>ctx.ranksHTML(...a);
 const paintRanks=(...a)=>ctx.paintRanks(...a);
 const rewardsHTML=(...a)=>ctx.rewardsHTML(...a);
 const loadRewards=(...a)=>ctx.loadRewards(...a);
 const paintRewards=(...a)=>ctx.paintRewards(...a);
 const walletModal=(...a)=>ctx.walletModal(...a);
 const loginWallet=(...a)=>ctx.loginWallet(...a);
 const logoutWallet=(...a)=>ctx.logoutWallet(...a);
 const stakeCharacter=(...a)=>ctx.stakeCharacter(...a);
 const reviewTransaction=(...a)=>ctx.reviewTransaction(...a);
 const confirmTransaction=(...a)=>ctx.confirmTransaction(...a);
 const renderTokenProfile=(...a)=>ctx.renderTokenProfile(...a);
 const startTokenBattle=(...a)=>ctx.startTokenBattle(...a);
 const joinTokenRoom=(...a)=>ctx.joinTokenRoom(...a);
 const showTokenRoom=(...a)=>ctx.showTokenRoom(...a);
 const startSkirmishQueue=(...a)=>ctx.startSkirmishQueue(...a);
 const joinSkirmishRoom=(...a)=>ctx.joinSkirmishRoom(...a);
 const showSkirmishRoom=(...a)=>ctx.showSkirmishRoom(...a);
 const openSkirmishMatch=(...a)=>ctx.openSkirmishMatch(...a);
 const cancelSkirmishQueue=(...a)=>ctx.cancelSkirmishQueue(...a);
 const startPractice=(...a)=>ctx.startPractice(...a);
 const hud=(...a)=>ctx.hud(...a);
 const select=(...a)=>ctx.select(...a);
 const place=(...a)=>ctx.place(...a);
 const bindArena=(...a)=>ctx.bindArena(...a);
 const finish=(...a)=>ctx.finish(...a);
 const ensureAccount=(...a)=>ctx.ensureAccount(...a);
 const cancelQueue=(...a)=>ctx.cancelQueue(...a);
 const startOnline=(...a)=>ctx.startOnline(...a);
 const pause=(...a)=>ctx.pause(...a);
 const leave=(...a)=>ctx.leave(...a);
 const loop=(...a)=>ctx.loop(...a);

 function changePage(p){if(tactics?.playing){toast('Use Leave in the battle menu to return to Play.');return;}if(playing){toast('Finish or leave the battle before switching pages.');return;}if(queueId||skirmishRoom||skirmishBusy){toast('Finish or cancel matchmaking first.');return;}clearModal();page=p;renderPage();if(p==='forge'||p==='profile'||p==='battle'||p==='cards')loadTokenState();$('#main-content').scrollTo({top:0,behavior:motion?'smooth':'auto'});}
 const click=async e=>{const b=e.target.closest('button, a');if(!b||!root.contains(b)||b.disabled)return;audio.unlock();if(b.dataset.game){if(skirmishBusy)return;selectedGame=b.dataset.game;skirmishLoadout=readSkirmishLoadout(localStore(),profile.deck);renderPage();$('[data-game="'+selectedGame+'"]')?.focus({preventScroll:true});return;}if(b.dataset.playType){if(skirmishBusy)return;mode=b.dataset.playType==='online'?'token':'practice';renderPage();$('[data-play-type="'+(mode==='token'?'online':'practice')+'"]')?.focus({preventScroll:true});return;}if(b.dataset.unstake){if(currentWallet()!==walletAddress){walletModal();return;}try{const proposal=await call('token/unstake/prepare',{positionId:b.dataset.unstake,actionId:crypto.randomUUID()});reviewTransaction(proposal,async()=>{await loadTokenState();clearModal();renderPage();toast('Unlocked stake withdrawn.');});}catch(e){toast(e.message);}return;}if(b.dataset.refund){if(currentWallet()!==walletAddress){walletModal();return;}try{const proposal=await call('token/refund/prepare',{matchId:b.dataset.refund,actionId:crypto.randomUUID()});reviewTransaction(proposal,async()=>{await loadTokenState();clearModal();renderPage();toast('Refund finalized.');});}catch(e){toast(e.message);}return;}if(b.dataset.proof){confirmTransaction(b.dataset.proof);return;}if(b.dataset.walletIndex!==undefined){loginWallet(+b.dataset.walletIndex);return;}if(b.dataset.camera){render?.setCamera?.(b.dataset.camera);return;}if(b.dataset.page){changePage(b.dataset.page);return;}if(b.dataset.mode){if(playing){toast('Finish this battle first.');return;}mode=b.dataset.mode;$('#mode-content').innerHTML=modeHTML();root.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));paintMiniDeck();return;}if(b.dataset.stake){stake=+b.dataset.stake;$('#mode-content').innerHTML=modeHTML();return;}if(b.dataset.difficulty){difficulty=b.dataset.difficulty;$('#mode-content').innerHTML=modeHTML();return;}if(b.dataset.sector){sector=b.dataset.sector;renderPage();return;}if(b.dataset.filter){filter=b.dataset.filter;renderPage();return;}if(b.dataset.card!==undefined){details(+b.dataset.card);return;}if(b.dataset.upgrade!==undefined){upgrade(+b.dataset.upgrade);return;}if(b.dataset.deckSlot!==undefined){replacement(+b.dataset.deckSlot);return;}if(b.dataset.addCard!==undefined){replacement(null,+b.dataset.addCard);return;}if(b.dataset.replaceId!==undefined){const next=[...profile.deck];next[+b.dataset.replaceSlot]=+b.dataset.replaceId;saveDeck(next);return;}if(b.dataset.slot!==undefined){if(e.detail===0)select(+b.dataset.slot);return;}if(b.id==='sound-btn'||b.dataset.action==='battle-sound'){sound=!sound;audio.setEnabled(sound);tactics?.setSound(sound);saveLocal();updateHeader();if(sound){audio.unlock();audio.play('select');}return;}switch(b.dataset.action){case'skirmish-practice':selectedGame='skirmish';page='tactics';skirmishLaunch={kind:'practice'};clearModal();renderPage();break;case'skirmish-customize':selectedGame='skirmish';changePage('tactics');break;case'skirmish-online':startSkirmishQueue();break;case'skirmish-create':startSkirmishQueue('',true);break;case'skirmish-join':joinSkirmishRoom();break;case'skirmish-cancel':cancelSkirmishQueue();break;case'connect-wallet':walletModal();break;case'wallet-relay':loginWallet('relay');break;case'wallet-disconnect':logoutWallet();break;case'market':marketModal();break;case'token-ranked':startTokenBattle();break;case'token-create':startTokenBattle('',true);break;case'token-join':joinTokenRoom();break;case'help':if(page==='tactics'&&tactics?.playing)tactics.openHelp();else help();break;case'close-modal':closeModal();break;case'practice-guest':clearModal();startPractice();break;case'practice':startPractice();break;case'account':onboarding();break;case'cancel-queue':cancelQueue();break;case'pause':pause();break;case'surrender':leave();break;case'left-lane':place(135,520);break;case'right-lane':place(465,520);break;case'reset-deck':saveDeck([...DEFAULT_DECK]);break;case'edit-name':modal(`<h2>Change player name</h2><form id="rename-form"><label for="rename-input">Trainer name</label><input id="rename-input" maxlength="16" value="${esc(profile.name)}" required><button class="button primary wide">Save name</button></form>`,()=>$('#rename-form').addEventListener('submit',async ev=>{ev.preventDefault();const n=$('#rename-input').value.trim().slice(0,16);if(!n)return;try{if(account)profile=await call('profile',{name:n,deck:profile.deck});else profile.name=n;saveLocal();clearModal();renderPage();}catch(er){toast(er.message);}}));break;}};
 root.addEventListener('click',click);
 const keys=e=>{const m=$('#modal-root .modal');if(m){if(e.key==='Escape'){e.preventDefault();closeModal();}if(e.key==='Tab'){const all=[...m.querySelectorAll('button:not(:disabled),input,a')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}}return;}if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(page!=='battle')return;audio.unlock();if(['1','2','3','4'].includes(e.key)){e.preventDefault();select(+e.key-1);}if(e.key==='ArrowLeft'){e.preventDefault();place(135,520);}if(e.key==='ArrowRight'){e.preventDefault();place(465,520);}if(e.key.toLowerCase()==='p')pause();};document.addEventListener('keydown',keys);
 const visibility=()=>{last=performance.now();if(document.hidden&&playing&&!online&&!paused)pause();};document.addEventListener('visibilitychange',visibility);
 renderPage();frame=requestAnimationFrame(loop);loadRuntime();marketTimer=setInterval(loadMarket,10000);
 (async()=>{try{const d=await call('profile');if(disposed)return;profile=d;account=true;walletAddress=d.wallet||null;activeHold=d.activeMatch;loadTokenState();renderPage();if(d.activeMatch){const m=d.activeMatch;if(m.status==='playing'||m.status==='ended')startOnline(m.id);else if(m.asset==='token'){queueId=m.id;showTokenRoom(m);}}else{const room=new URLSearchParams(location.search).get('room');if(room){mode='token';startTokenBattle(room.trim().toUpperCase(),true);}}}catch(e){if(disposed)return;if(playing||page==='tactics')return;refreshLobbyOptions();}})();
 return ()=>{disposed=true;skirmishRoom=null;tactics?.dispose?.();document.body.classList.remove('in-tactics');transport?.close();clearInterval(marketTimer);clearModal();window.removeEventListener('resize',updateLayout);document.body.classList.remove('in-battle');render?.dispose?.();render=null;cancelAnimationFrame(frame);clearInterval(onlineTimer);clearInterval(queueTimer);clearTimeout(toastTimer);root.removeEventListener('click',click);document.removeEventListener('keydown',keys);document.removeEventListener('visibilitychange',visibility);audio.dispose();};
}
