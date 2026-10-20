import {writeFile} from 'node:fs/promises';
import {UI_PALETTE} from '../public/game/art-direction.js';
const lines=Object.entries(UI_PALETTE).map(([name,value])=>`  --${name}:${value};`);
await writeFile(new URL('../app/palette.css',import.meta.url),'/* Generated from public/game/art-direction.js. */\n:root {\n'+lines.join('\n')+'\n  --gold-grad:var(--gold);\n  --blue-grad:var(--blue);\n  --panel-grad:var(--surface);\n}\n');
console.log('Exported shared UI palette.');
