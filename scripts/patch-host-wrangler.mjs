import {readFileSync,writeFileSync} from 'node:fs';

const path=process.argv[2]||'dist/server/wrangler.json';
const databaseId=process.env.WICKBORN_D1_ID;
if(!databaseId)throw new Error('WICKBORN_D1_ID is required.');

const config=JSON.parse(readFileSync(path,'utf8'));
config.name='wickborn';
config.workers_dev=true;
config.d1_databases=[{
  binding:'DB',
  database_name:'wickborn',
  database_id:databaseId,
}];
config.vars={
  ...(config.vars||{}),
  SITE_ORIGIN:'https://wickborn.dillonking130.workers.dev',
  REALTIME_URL:'https://wickborn-realtime.dillonking130.workers.dev',
  CONTRACT_ADAPTER_URL:'https://wickborn-adapter.dillonking130.workers.dev',
  GAME_PROGRAM_ID:'F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x',
  GAME_TOKEN_DECIMALS:'9',
  GAME_TOKEN_SYMBOL:'WICKB',
  GAME_TOKEN_CHAIN:'solana:devnet',
  LIVE_TOKEN_ENABLED:'false',
  SKIRMISH_ONLINE:'true',
  STAKE_LOCK_SECONDS:'604800',
};
writeFileSync(path,JSON.stringify(config,null,2)+'\n');
console.log(JSON.stringify({ok:true,path,name:config.name,databaseId},null,2));
