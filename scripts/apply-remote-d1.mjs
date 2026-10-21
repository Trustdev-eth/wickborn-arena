import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const drizzle=resolve('drizzle');
const statements=[];
for(const name of readdirSync(drizzle).filter(n=>n.endsWith('.sql')).sort()){
  const sql=readFileSync(resolve(drizzle,name),'utf8');
  for(const statement of sql.split('--> statement-breakpoint')){
    const clean=statement.replace(/^\s*--.*$/gm,'').trim();
    if(clean)statements.push(clean.endsWith(';')?clean:clean+';');
  }
}
const out=resolve('.wrangler/wickborn-d1.sql');
writeFileSync(out,statements.join('\n\n')+'\n');
console.log(JSON.stringify({ok:true,file:out,statements:statements.length},null,2));
