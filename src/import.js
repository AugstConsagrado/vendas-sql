import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SalesStore } from './analytics.js';
const args = process.argv.slice(2), replace = args.includes('--replace');
const file = args.find(arg=>arg !== '--replace');
if(!file || args.filter(arg=>arg !== '--replace').length !== 1) {
  console.error('Uso: npm run import -- caminho.csv [--replace]');process.exitCode=1;
} else {
  mkdirSync(new URL('../data/',import.meta.url),{recursive:true});
  const store = new SalesStore(fileURLToPath(new URL('../data/sales.db',import.meta.url)));
  try {console.log(`${store.importCSV(await readFile(file,'utf8'),replace)} registros importados.`);}
  catch(e) {console.error(e.message);process.exitCode=1;}
  finally {store.close();}
}
