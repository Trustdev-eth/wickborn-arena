'use client';
import {useEffect} from 'react';
import {mount} from '../public/game/client.js';
export default function Game({initialPage='battle'}:{initialPage?:'battle'|'tactics'}){
  useEffect(()=>mount(document.getElementById('game-root'),{initialPage}),[initialPage]);
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
