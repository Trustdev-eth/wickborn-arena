import type {Metadata} from 'next';
import Game from '../Game';

export const metadata: Metadata={title:'Fighters — Wickborn Arena'};

export default function FightersPage(){
 return <Game initialPage="cards"/>;
}
