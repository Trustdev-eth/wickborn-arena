import type {Metadata} from 'next';
import Game from '../Game';

export const metadata: Metadata={title:'Rankings — Wickborn Arena'};

export default function RankingsPage(){
 return <Game initialPage="ranks"/>;
}
