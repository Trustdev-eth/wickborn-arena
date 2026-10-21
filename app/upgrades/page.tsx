import type {Metadata} from 'next';
import Game from '../Game';

export const metadata: Metadata={title:'Upgrades — Wickborn Arena'};

export default function UpgradesPage(){
 return <Game initialPage="forge"/>;
}
