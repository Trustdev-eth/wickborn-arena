import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>{
  const i=line.indexOf('=');
  return [line.slice(0,i),line.slice(i+1)];
}));
const wrangler=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
const puts=[
  ['services/realtime/wrangler.jsonc','REALTIME_SHARED_SECRET'],
  ['dist/server/wrangler.json','REALTIME_SHARED_SECRET'],
  ['dist/server/wrangler.json','CONTRACT_ADAPTER_KEY'],
  ['services/contracts/adapter/wrangler.jsonc','CONTRACT_ADAPTER_KEY'],
];
for(const [config,name] of puts){
  const value=env[name];
  if(!value)throw new Error('Missing '+name);
  const result=spawnSync(process.execPath,[wrangler,'secret','put',name,'--config',config],{
    input:value,
    stdio:['pipe','inherit','inherit'],
    windowsHide:true,
  });
  if(result.status)process.exit(result.status??1);
}
console.log('secrets uploaded');
