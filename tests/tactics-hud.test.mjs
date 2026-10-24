import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {battleHTML} from '../public/game/tactics/ui-html.js';
import {paintHUD} from '../public/game/tactics/hud.js';
import {createTactics,captainOf} from '../public/game/tactics/engine.js';

const portrait=()=>'<span class="sprite t-chip-art"></span>';
const liveHTML=()=>battleHTML({replay:false,connection:null,captain:5,specs:Array(12).fill(0),g:null,side:0,esc:v=>String(v??''),portrait,icon:()=>''});

function node(extra={}){
 const flags=new Set();
 return {textContent:'',innerHTML:'',hidden:false,disabled:false,style:{},dataset:{},classList:{toggle(name,on){if(on)flags.add(name);else flags.delete(name);},contains:name=>flags.has(name),flags},...extra};
}

function harness(){
 const nodes=new Map();
 const $=sel=>{if(!nodes.has(sel))nodes.set(sel,node());return nodes.get(sel);};
 const commands=['move','skill','ultimate'].map(cmd=>{
  const b=node({dataset:{tCommand:cmd}});
  nodes.set(`[data-t-command="${cmd}"]`,b);
  return b;
 });
 nodes.set('[data-t-action="barrier"]',node());
 nodes.set('[data-t-market]',node({textContent:'STOCKS · NEUTRAL'}));
 nodes.set('[data-t-aim]',node({hidden:true}));
 nodes.set('[data-t-hand]',node());
 const host={querySelectorAll:sel=>sel==='[data-t-command]'?commands:[]};
 return {$,host,nodes,commands};
}

test('the live Skirmish HUD names the captain, the win condition, and tap-to-move without a keyboard lesson',()=>{
 const html=liveHTML();
 assert.match(html,/YOUR CAPTAIN/);
 assert.match(html,/Destroy the rival king/);
 assert.match(html,/Tap the arena/);
 assert.match(html,/Capture relay first/);
 assert.match(html,/data-t-action="help"/);
 assert.match(html,/data-t-action="market"/);
 assert.match(html,/STOCKS · NEUTRAL/);
 assert.match(html,/t-play-grid-fight/);
 assert.doesNotMatch(html,/YOUR NEXT MOVE|WASD|<kbd>M<\/kbd>|Tap a destination|Protect your captain/);
});

test('paintHUD spells out Ready, resolve, cooldown, and Capture relay first',()=>{
 const g=createTactics(),h=harness();
 g.energy[0]=47;g.skillCd[0]=0;g.barriers[0]=0;
 paintHUD({g,stage:'battle',$:h.$,side:0,captain:g.captainCards[0],specs:g.specs[0],connection:null,connectionStatus:'',rtt:null,replay:null,aim:'move',selected:-1,host:h.host,handKey:'',portrait,captainOf,timeLabel:t=>`${t}`});
 assert.equal(h.$('[data-t-skill-state]').textContent,'Ready');
 assert.equal(h.$('[data-t-ult-state]').textContent,'47 / 100 resolve');
 assert.equal(h.$('[data-t-barriers]').textContent,'Capture relay first');
 assert.equal(h.$('[data-t-move-state]').textContent,'Tap the arena');
 assert.equal(h.$('[data-t-aim]').hidden,true);
 assert.equal(h.commands.find(b=>b.dataset.tCommand==='skill').disabled,false);
 assert.equal(h.commands.find(b=>b.dataset.tCommand==='ultimate').disabled,true);
 assert.equal(h.$('[data-t-action="barrier"]').disabled,true);
 assert.ok(h.commands.find(b=>b.dataset.tCommand==='skill').classList.contains('is-ready'));
 assert.ok(h.commands.find(b=>b.dataset.tCommand==='move').classList.contains('is-ready'));
 assert.equal(h.$('[data-t-market]').textContent,'STOCKS · NEUTRAL');
 g.market.status[1]='live';
 paintHUD({g,stage:'battle',$:h.$,side:0,captain:g.captainCards[0],specs:g.specs[0],connection:null,connectionStatus:'',rtt:null,replay:null,aim:'move',selected:-1,host:h.host,handKey:'',portrait,captainOf,timeLabel:t=>`${t}`});
 assert.equal(h.$('[data-t-market]').textContent,'STOCKS · LIVE');
 g.energy[0]=100;g.barriers[0]=1;
 paintHUD({g,stage:'battle',$:h.$,side:0,captain:g.captainCards[0],specs:g.specs[0],connection:null,connectionStatus:'',rtt:null,replay:null,aim:'skill',selected:-1,host:h.host,handKey:'x',portrait,captainOf,timeLabel:t=>`${t}`});
 assert.equal(h.$('[data-t-skill-state]').textContent,'Tap to cast');
 assert.equal(h.$('[data-t-ult-state]').textContent,'Ready');
 assert.equal(h.$('[data-t-barriers]').textContent,'1 ready');
 assert.equal(h.$('[data-t-aim]').hidden,false);
 assert.match(h.$('[data-t-aim]').textContent,/Tap to cast/);
 g.skillCd[0]=3.2;
 paintHUD({g,stage:'battle',$:h.$,side:0,captain:g.captainCards[0],specs:g.specs[0],connection:null,connectionStatus:'',rtt:null,replay:null,aim:'move',selected:-1,host:h.host,handKey:'x',portrait,captainOf,timeLabel:t=>`${t}`});
 assert.equal(h.$('[data-t-skill-state]').textContent,'4s cooldown');
});

test('the Skirmish client keeps WASD in help and zooms the combat camera',()=>{
 const source=readFileSync(new URL('../public/game/tactics/client.js',import.meta.url),'utf8');
 assert.match(source,/Tap the arena to move your captain/);
 assert.match(source,/On a keyboard, WASD also works/);
 assert.match(source,/combat:true,zoom:1\}/);
 assert.match(source,/stockVisualState/);
 assert.match(source,/case'market'/);
});
