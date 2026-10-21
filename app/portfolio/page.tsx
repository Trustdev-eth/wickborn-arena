import type {Metadata} from 'next';
import Game from '../Game';

export const metadata: Metadata={title:'Portfolio — Wickborn Arena'};

export default function PortfolioPage(){
 return <Game initialPage="profile"/>;
}
