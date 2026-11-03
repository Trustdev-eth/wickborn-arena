import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path=process.argv[2]||resolve(root,'dist/server/wrangler.json');
if(!existsSync(path))throw new Error('Build output missing: '+path);

const config=JSON.parse(readFileSync(path,'utf8'));
config.name='wickborn-arena';
config.workers_dev=false;
config.preview_urls=false;
config.vars={
  ...(config.vars||{}),
  SITE_ORIGIN:'https://play.wickbornarena.xyz',
  SITE_INTERNAL_URL:'http://127.0.0.1:8880',
  REALTIME_URL:'http://127.0.0.1:8881',
  REALTIME_PUBLIC_URL:'https://play.wickbornarena.xyz',
  CONTRACT_ADAPTER_URL:'http://127.0.0.1:8882',
  GAME_PROGRAM_ID:'F9rRZiYeunm6ospKJUyD2kZ6NbBfLJKPxZyPUyDtPW8x',
  GAME_TOKEN_DECIMALS:'9',
  GAME_TOKEN_SYMBOL:'WICKB',
  GAME_TOKEN_CHAIN:'solana:devnet',
  LIVE_TOKEN_ENABLED:'false',
  SKIRMISH_ONLINE:'true',
  STAKE_LOCK_SECONDS:'604800',
};
if(!config.d1_databases?.length){
  config.d1_databases=[{
    binding:'DB',
    database_name:'wickborn',
    database_id:'00000000-0000-4000-8000-000000000000',
  }];
}
writeFileSync(path,JSON.stringify(config,null,2)+'\n');
console.log(JSON.stringify({ok:true,path,name:config.name,d1:config.d1_databases},null,2));
