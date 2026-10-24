import {TACTICAL_FIGHTERS} from './config.js';

export function paintHUD(s){
 const {g,stage,$,side,captain,specs,connection,connectionStatus,rtt,replay,aim,selected,host,reduced,portrait}=s;
 if(!g||stage==='loadout'||!$('[data-t-clock]'))return;const p=side,u=s.captainOf(g,p),f=TACTICAL_FIGHTERS[captain],r=g.relay;
 $('[data-t-clock]').textContent=s.timeLabel(Math.ceil(g.round-g.time));$('[data-t-score]').textContent=`${g.score[p]} : ${g.score[1-p]}`;
 const conn=$('[data-t-connection]');if(conn)conn.textContent=connection?connectionStatus+(rtt!==null?' · '+Math.round(rtt)+' ms':''):replay?'Replay':'Free practice';
 $('[data-t-hp]').style.width=(u?100*u.hp/u.maxHp:0)+'%';
 $('[data-t-health]').textContent=u?`${Math.ceil(u.hp)} / ${u.maxHp} HP${u.shield>0?' · +'+Math.ceil(u.shield)+' shield':''}`:`Recovering · ${Math.ceil(g.respawn[p])}s`;
 const captainState=$('[data-t-captain-state]');
 if(captainState)captainState.textContent=u?.casting?'Charging':u?.channel?'Healing':u?.stun>0?'Stunned':u?.recovery>0?'Recovering':u?.order?'Moving':'Fighting';
 const relayHint=$('[data-t-relay-hint]'),relayLabel=$('[data-t-relay]');
 const relayLine=r.active?(r.progress[p]>0?'Capturing relay · '+Math.round(r.progress[p]*100)+'%':r.progress[1-p]>0?'Rival capturing the relay':'Relay open — hold it'):r.owner===p?'Barrier ready':r.owner===1-p?'Rival holds the relay':`Relay opens in ${Math.max(0,Math.ceil(r.nextAt-g.time))}s`;
 if(relayHint)relayHint.textContent=relayLine;
 if(relayLabel&&relayLabel!==relayHint)relayLabel.textContent=r.active?(r.progress[p]>0?'CAPTURING':r.progress[1-p]>0?'CONTESTED':'OPEN'):r.owner===p?'SECURED':r.owner===1-p?'LOST':'DORMANT';
 const relayFill=$('[data-t-relay-progress]');
 if(relayFill){relayFill.style.width=(Math.max(...r.progress)*100)+'%';relayFill.style.background=r.progress[1-p]>r.progress[p]?'var(--rival)':'var(--ally)';}
 const skillReady=g.skillCd[p]<=.05,ultReady=g.energy[p]>=100&&g.ultCd[p]<=0,barrierReady=g.barriers[p]>0;
 $('[data-t-skill-state]').textContent=skillReady?(aim==='skill'?'Tap to cast':'Ready'):Math.ceil(g.skillCd[p])+'s cooldown';
 $('[data-t-ult-state]').textContent=ultReady?(aim==='ultimate'?'Tap to cast':'Ready'):Math.floor(g.energy[p])+' / 100 resolve';
 $('[data-t-ult-fill]').style.width=g.energy[p]+'%';
 $('[data-t-barriers]').textContent=barrierReady?`${g.barriers[p]} ready`:'Capture relay first';
 const moveState=$('[data-t-move-state]');if(moveState)moveState.textContent=aim==='move'&&selected<0?'Tap the arena':'Select to move';
 for(const b of host.querySelectorAll('[data-t-command]')){
  const cmd=b.dataset.tCommand,locked=!!replay||!u||!!connection&&!connection.ready||(cmd==='skill'&&!skillReady)||(cmd==='ultimate'&&!ultReady);
  b.classList.toggle('is-active',selected<0&&cmd===aim);
  b.classList.toggle('is-ready',!locked&&(cmd==='skill'&&skillReady||cmd==='ultimate'&&ultReady||cmd==='move'&&aim==='move'&&selected<0));
  b.disabled=locked;
 }
 const barrierBtn=$('[data-t-action="barrier"]');
 if(barrierBtn){barrierBtn.disabled=!!replay||!barrierReady||!!connection&&!connection.ready;barrierBtn.classList.toggle('is-ready',barrierReady&&!replay);}
 const aimHint=$('[data-t-aim]');
 if(aimHint){
  const aiming=selected>=0||aim==='skill'||aim==='ultimate';
  aimHint.hidden=!aiming;
  aimHint.textContent=replay?'Replay · recorded battle':selected>=0?'Tap blue ground to deploy '+TACTICAL_FIGHTERS[g.hand[p][selected]].name:aim==='skill'?`Tap to cast ${f.skill}`:aim==='ultimate'?`Tap to cast ${f.ultimate}`:'';
 }
 const marketBtn=$('[data-t-market]');
 if(marketBtn){const live=g.market?.status?.some(st=>st==='live')||s.getMarket?.()?.prices?.some(p=>p.status==='live');marketBtn.textContent='STOCKS · '+(live?'LIVE':'NEUTRAL');}
 const key=g.hand[p].join(',')+'/'+Math.floor(g.elixir[p])+'/'+selected+'/'+!!replay;if(key!==s.handKey){s.handKey=key;$('[data-t-hand]').innerHTML=g.hand[p].map((id,slot)=>{const c=TACTICAL_FIGHTERS[id],ready=g.elixir[p]>=c.cost;return `<button data-t-slot="${slot}" class="t-hand-card ${selected===slot?'is-selected':''} ${ready?'is-ready':'not-ready'}" style="--fighter:${c.color}" ${replay?'disabled':''} aria-pressed="${selected===slot}" aria-label="${c.name}, ${c.cost} elixir, ${ready?'ready to play':'need more elixir'}"><kbd>${slot+1}</kbd><span class="t-card-cost">${c.cost}</span>${portrait(id)}<span><b>${c.name}</b><small>${c.symbol} · ${ready?'PLAY':'WAIT'}</small></span></button>`;}).join('');}$('[data-t-elixir]').textContent=g.elixir[p].toFixed(1);$('[data-t-elixir-fill]').style.width=g.elixir[p]*10+'%';$('[data-t-rate]').textContent=g.time>=180?'FINAL PUSH · FASTER ELIXIR':'REFILLS OVER TIME';
}
