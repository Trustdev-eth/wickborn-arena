import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';

if(existsSync('.env.local')){
  console.log('.env.local already exists; leaving secrets unchanged');
  process.exit(0);
}

const realtime=randomBytes(32).toString('hex');
const adapter=randomBytes(32).toString('hex');
writeFileSync('.env.local',[
  'SITE_ORIGIN=https://wickborn.dillonking130.workers.dev',
  'REALTIME_URL=https://wickborn-realtime.dillonking130.workers.dev',
  'CONTRACT_ADAPTER_URL=https://wickborn-adapter.dillonking130.workers.dev',
  'GAME_PROGRAM_ID=F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x',
  'GAME_TOKEN_DECIMALS=9',
  'GAME_TOKEN_SYMBOL=WICKB',
  'GAME_TOKEN_CHAIN=solana:devnet',
  'LIVE_TOKEN_ENABLED=false',
  'SKIRMISH_ONLINE=true',
  'STAKE_LOCK_SECONDS=604800',
  'SOLANA_RPC_URL=https://api.devnet.solana.com',
  `REALTIME_SHARED_SECRET=${realtime}`,
  `CONTRACT_ADAPTER_KEY=${adapter}`,
].join('\n')+'\n');
mkdirSync('services/contracts/adapter',{recursive:true});
writeFileSync('services/contracts/adapter/.env',[
  'SOLANA_RPC_URL=https://api.devnet.solana.com',
  'GAME_PROGRAM_ID=F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x',
  'GAME_TOKEN_DECIMALS=9',
  'GAME_TOKEN_CHAIN=solana:devnet',
  `CONTRACT_ADAPTER_KEY=${adapter}`,
  'SITE_ORIGIN=https://wickborn.dillonking130.workers.dev',
  'STAKE_LOCK_SECONDS=604800',
].join('\n')+'\n');
console.log('wrote .env.local and adapter .env');
