import type {Metadata} from 'next';
import Game from '../Game';

export const metadata: Metadata={title:'Rewards — Wickborn Arena'};

export default function RewardsPage(){
 return <Game initialPage="rewards"/>;
}
