import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pageFromPath,pathForPage} from '../public/game/routes.js';

test('hub pages have shareable paths',()=>{
 assert.equal(pathForPage('battle'),'/');
 assert.equal(pathForPage('cards'),'/fighters');
 assert.equal(pathForPage('forge'),'/upgrades');
 assert.equal(pathForPage('ranks'),'/rankings');
 assert.equal(pathForPage('profile'),'/portfolio');
 assert.equal(pathForPage('tactics'),'/skirmish');
 assert.equal(pageFromPath('/fighters'),'cards');
 assert.equal(pageFromPath('/upgrades/'),'forge');
 assert.equal(pageFromPath('/rankings?tab=you'),'ranks');
 assert.equal(pageFromPath('/portfolio'),'profile');
 assert.equal(pageFromPath('/skirmish'),'tactics');
 assert.equal(pageFromPath('/tactics'),'tactics');
 assert.equal(pageFromPath('/unknown'),null);
});

test('shell navigation uses real page links',()=>{
 const client=readFileSync(new URL('../public/game/client.js',import.meta.url),'utf8');
 const hub=readFileSync(new URL('../public/game/hub-pages.js',import.meta.url),'utf8');
 assert.match(client,/href="\/fighters"/);
 assert.match(client,/href="\/upgrades"/);
 assert.match(client,/href="\/rankings"/);
 assert.match(client,/href="\/portfolio"/);
 assert.match(client,/Portfolio/);
 assert.match(hub,/href="\/fighters"/);
 assert.match(hub,/href="\/upgrades"/);
 assert.match(hub,/href="\/rankings"/);
 assert.match(hub,/YOUR PORTFOLIO|PRACTICE PORTFOLIO/);
});
