'use client';
import {useEffect} from 'react';
import {mount} from '../public/game/client.js';

export type GamePage='battle'|'tactics'|'cards'|'forge'|'ranks'|'profile'|'rewards';

export default function Game({initialPage='battle'}:{initialPage?:GamePage}){
  useEffect(()=>{
    const dispose=mount(document.getElementById('game-root'),{initialPage});
    return typeof dispose==='function'?dispose:undefined;
  },[initialPage]);
  return (
    <div id="game-root">
      <div className="loading-game">
        <div className="loading-brand">
          <img className="loading-logo" src="/brand/wickborn-mark.svg?v=3" alt="" width="260" height="260"/>
          <strong>WICKBORN</strong>
        </div>
        <p>Loading game…</p>
      </div>
    </div>
  );
}
