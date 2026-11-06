import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SalesStore, parseCSV, validDate } from '../src/analytics.js';
import { createServer } from '../src/server.js';
const header='date,product,category,channel,quantity,unit_price_cents\n';
const csv=header+'2026-01-01,Mouse,Periféricos,Online,2,1000\n2026-01-15,Teclado,Periféricos,Loja,1,5000\n2026-02-03,Monitor,Telas,Online,1,30000\n';
test('indicadores usam centavos exatos e média por venda',()=>{
  const s=new SalesStore();try{s.importCSV(csv);const d=s.dashboard();assert.deepEqual({...d.totals},{orders:3,units:4,revenue_cents:37000,average_order_cents:12333});assert.equal(d.monthly[0].cents,7000);assert.equal(d.topProducts[0].label,'Monitor');}finally{s.close();}
});
test('filtros combinam período, categoria e canal e retornam zeros sem registros',()=>{
  const s=new SalesStore();try{s.importCSV(csv);assert.equal(s.dashboard({from:'2026-01-01',to:'2026-01-31',channel:'Online'}).totals.revenue_cents,2000);
    assert.equal(s.dashboard({category:'Telas'}).totals.orders,1);assert.equal(s.dashboard({category:"' OR 1=1 --"}).totals.orders,0);
    assert.deepEqual({...s.dashboard({from:'2027-01-01'}).totals},{orders:0,units:0,revenue_cents:0,average_order_cents:0});
    assert.throws(()=>s.dashboard({from:'2026-02-30'}));assert.throws(()=>s.dashboard({from:'2026-02-01',to:'2026-01-01'}));
  }finally{s.close();}
});
test('CSV suporta BOM, CRLF, aspas escapadas, vírgula e quebra de linha em célula',()=>{
  assert.deepEqual(parseCSV('\uFEFFa,b\r\n"Olá, mundo","A ""B""\nC"\r\n'),[['a','b'],['Olá, mundo','A "B"\nC']]);
  assert.throws(()=>parseCSV('"não fechou'));assert.throws(()=>parseCSV('"ok"erro'));
  assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2024-02-29'),true);
});
test('importação inválida preserva base anterior e substituição é explícita',()=>{
  const s=new SalesStore();try{s.importCSV(csv);assert.throws(()=>s.importCSV(csv));assert.throws(()=>s.importCSV(header+'2026-02-30,Item,Cat,Loja,1,100',true));
    assert.throws(()=>s.importCSV(header+'2026-01-01,Item,Cat,Loja,-1,100',true));assert.throws(()=>s.importCSV(header+'2026-01-01,Item,Cat,Loja,1,10.5',true));
    assert.equal(s.count(),3);s.importCSV(header+'2026-03-01,Item,Cat,Loja,1,100',true);assert.equal(s.count(),1);
  }finally{s.close();}
});
test('API entrega dados filtrados e rejeita período inválido e escrita',async()=>{
  const s=new SalesStore();s.importCSV(csv);const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  try{let r=await fetch(url+'/api/dashboard?channel=Online');assert.equal(r.status,200);assert.equal((await r.json()).totals.orders,2);
    r=await fetch(url+'/api/dashboard?from=ontem');assert.equal(r.status,400);r=await fetch(url+'/api/dashboard',{method:'POST'});assert.equal(r.status,405);
    r=await fetch(url+'/');assert.equal(r.status,200);
  }finally{await new Promise(r=>server.close(r));s.close();}
});
