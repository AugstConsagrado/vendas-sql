import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SalesStore } from './analytics.js';
export function createServer(store) {
  const files = new Map([['/',['index.html','text/html; charset=utf-8']],['/style.css',['style.css','text/css; charset=utf-8']],['/app.js',['app.js','text/javascript; charset=utf-8']]]);
  files.set('/projeto', ['case.html', 'text/html; charset=utf-8']);
  files.set('/case.css', ['case.css', 'text/css; charset=utf-8']);
  files.set('/preview.jpg', ['../docs/preview.jpg', 'image/jpeg']);
  return http.createServer(async(req,res) => {
    const send = (code,body) => {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const host = req.headers.host || '';
      if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return send(403,{error:'Host não permitido.'});
      const url = new URL(req.url,`http://${host}`);
      if(req.method !== 'GET') return send(405,{error:'Este painel permite somente consulta.'});
      if(files.has(url.pathname)) {
        const [name,type] = files.get(url.pathname); const body = await readFile(new URL(`../public/${name}`,import.meta.url));
        res.writeHead(200,{'Content-Type':type}); return res.end(body);
      }
      if(url.pathname === '/api/dashboard') return send(200,store.dashboard(Object.fromEntries(['from','to','category','channel'].map(k=>[k,url.searchParams.get(k)||'']))));
      send(404,{error:'Rota não encontrada.'});
    } catch(e) {
      if(e.code) {console.error(e); return send(500,{error:'Erro interno. Consulte o terminal.'});}
      send(400,{error:e.message});
    }
  });
}
if(process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL('../data/',import.meta.url),{recursive:true});
  const store = new SalesStore(fileURLToPath(new URL('../data/sales.db',import.meta.url)));
  if(!store.count()) store.importCSV(await readFile(new URL('../data/vendas-exemplo.csv',import.meta.url),'utf8'));
  const server = createServer(store), port = Number(process.env.PORT || 3001);
  server.listen(port,'127.0.0.1',()=>console.log(`Vendas SQL: http://127.0.0.1:${port}`));
  const shutdown = () => server.close(()=>{store.close();process.exit(0);});
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
