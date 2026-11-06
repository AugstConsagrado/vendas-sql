import { DatabaseSync } from 'node:sqlite';

export function parseCSV(text) {
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i=0; i<text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i+1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (c !== ',') { if (row.some(v=>v !== '')) rows.push(row); row = []; if(c==='\r' && text[i+1]==='\n') i++; }
    } else if (c === '"') {
      if (cell || closed) throw new Error('Aspas inválidas no CSV.'); quoted = true;
    } else {
      if (closed) throw new Error('Caractere após fechamento de aspas.'); cell += c;
    }
  }
  if (quoted) throw new Error('Aspas não fechadas no CSV.');
  if (cell || row.length || closed) { row.push(cell); rows.push(row); }
  return rows;
}
const fields = ['date','product','category','channel','quantity','unit_price_cents'];
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export function validateRows(text) {
  const [header,...rows] = parseCSV(text);
  if (!header || header.join(',') !== fields.join(',')) throw new Error(`Cabeçalho esperado: ${fields.join(',')}`);
  if (!rows.length || rows.length > 100000) throw new Error('Use de 1 a 100.000 registros.');
  return rows.map((row, index) => {
    const error = message => { throw new Error(`Registro ${index+2}: ${message}`); };
    if(row.length !== fields.length) error('quantidade de colunas inválida.');
    const [date,product,category,channel,q,p] = row.map(v=>v.trim());
    if(!validDate(date)) error('data inválida; use AAAA-MM-DD.');
    if([product,category,channel].some(v=>!v || v.length>100)) error('textos devem ter de 1 a 100 caracteres.');
    if(!/^\d+$/.test(q) || !/^\d+$/.test(p)) error('quantidade e preço devem ser inteiros positivos.');
    const quantity = Number(q), price = Number(p);
    if(quantity < 1 || quantity > 1000 || price < 1 || price > 1000000) error('quantidade deve estar entre 1 e 1000 e preço entre 1 e 1000000 centavos.');
    return {date,product,category,channel,quantity,unit_price_cents:price};
  });
}
export class SalesStore {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY, date TEXT NOT NULL, product TEXT NOT NULL,
      category TEXT NOT NULL, channel TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity>0), unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents>0));
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);`);
  }
  count() { return this.db.prepare('SELECT COUNT(*) AS n FROM sales').get().n; }
  importCSV(text, replace = false) {
    const rows = validateRows(text); // Valida tudo antes de alterar o banco.
    if(this.count() && !replace) throw new Error('Já existem dados. Use --replace para substituir a base.');
    this.db.exec('BEGIN');
    try {
      if(replace) this.db.exec('DELETE FROM sales');
      const insert = this.db.prepare('INSERT INTO sales (date,product,category,channel,quantity,unit_price_cents) VALUES (?,?,?,?,?,?)');
      for(const r of rows) insert.run(...fields.map(k=>r[k]));
      this.db.exec('COMMIT'); return rows.length;
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
  dashboard(filters = {}) {
    const {from='',to='',category='',channel=''} = filters;
    if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from>to)) throw new Error('Período inválido.');
    if(category.length>100 || channel.length>100) throw new Error('Filtro muito longo.');
    const where = `WHERE (?='' OR date>=?) AND (?='' OR date<=?) AND (?='' OR category=?) AND (?='' OR channel=?)`;
    const args = [from,from,to,to,category,category,channel,channel];
    const rows = sql => this.db.prepare(sql).all(...args);
    const totals = this.db.prepare(`SELECT COUNT(*) AS orders, COALESCE(SUM(quantity),0) AS units,
      COALESCE(SUM(quantity*unit_price_cents),0) AS revenue_cents FROM sales ${where}`).get(...args);
    return {
      totals:{...totals,average_order_cents:totals.orders ? Math.round(totals.revenue_cents/totals.orders) : 0},
      monthly:rows(`SELECT substr(date,1,7) AS label,SUM(quantity*unit_price_cents) AS cents FROM sales ${where} GROUP BY label ORDER BY label`),
      categories:rows(`SELECT category AS label,SUM(quantity*unit_price_cents) AS cents FROM sales ${where} GROUP BY category ORDER BY cents DESC,label`),
      topProducts:rows(`SELECT product AS label,SUM(quantity) AS units,SUM(quantity*unit_price_cents) AS cents FROM sales ${where} GROUP BY product ORDER BY cents DESC,product LIMIT 5`),
      recent:rows(`SELECT *,(quantity*unit_price_cents) AS total_cents FROM sales ${where} ORDER BY date DESC,id DESC LIMIT 12`),
      options:{categories:this.db.prepare('SELECT DISTINCT category FROM sales ORDER BY category').all().map(r=>r.category),channels:this.db.prepare('SELECT DISTINCT channel FROM sales ORDER BY channel').all().map(r=>r.channel)},
      filters
    };
  }
  close() { this.db.close(); }
}
