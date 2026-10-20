import {readdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dir=resolve(root,'.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file=readdirSync(dir).find(name=>name.endsWith('.sqlite')&&name!=='metadata.sqlite');
if(!file)throw new Error('Local D1 sqlite not found.');
const db=new DatabaseSync(resolve(dir,file));
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1").all().map(r=>r.name);
console.log(JSON.stringify({db:file,tables},null,2));
if(tables.includes('market_cache')&&tables.includes('matches')){
 console.log(JSON.stringify({ok:true,migrated:false}));
 process.exit(0);
}
const drizzle=resolve(root,'drizzle');
for(const name of readdirSync(drizzle).filter(n=>n.endsWith('.sql')).sort()){
 const sql=readFileSync(resolve(drizzle,name),'utf8');
 for(const statement of sql.split('--> statement-breakpoint')){
  const clean=statement.replace(/^\s*--.*$/gm,'').trim();
  if(!clean)continue;
  try{db.exec(clean);}catch(error){
   if(!/already exists|duplicate column/i.test(error.message))throw error;
  }
 }
}
const after=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1").all().map(r=>r.name);
console.log(JSON.stringify({ok:true,migrated:true,tables:after},null,2));
