const $ = s=>document.querySelector(s), form=$('#filters');
const money = cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
let current = null, sequence=0;
function el(tag,text,className) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function bars(target,rows,share=false) {
  const root=$(target);root.replaceChildren();
  if(!rows.length){root.append(el('p','Nenhum dado neste período.','empty'));return;}
  const sum=rows.reduce((n,r)=>n+r.cents,0), max=Math.max(...rows.map(r=>r.cents));
  for(const row of rows){
    const line=el('div',undefined,'bar-row'),top=el('div',undefined,'bar-caption');
    const label=target==='#monthly' ? row.label.split('-').reverse().join('/') : row.label;
    top.append(el('span',label),el('strong',share ? `${(100*row.cents/sum).toFixed(1)}% · ${money(row.cents)}` : money(row.cents)));
    const meter=el('progress');meter.max=share ? sum : max;meter.value=row.cents;meter.setAttribute('aria-label',`${label}: ${money(row.cents)}`);
    line.append(top,meter);root.append(line);
  }
}
async function load(){
  const id=++sequence;
  try{
    const response=await fetch('/api/dashboard?'+new URLSearchParams(new FormData(form))), data=await response.json();
    if(!response.ok)throw new Error(data.error);
    if(id!==sequence)return;
    current=data;$('#message').textContent='';$('#export').disabled=false;
    for(const [name,values] of [['category',data.options.categories],['channel',data.options.channels]]){
      const selected=form.elements[name].value,select=form.elements[name];
      select.replaceChildren(new Option(name==='category'?'Todas':'Todos',''),...values.map(v=>new Option(v,v)));select.value=selected;
    }
    const t=data.totals;$('#stats').replaceChildren();
    for(const [title,value,hint] of [['Faturamento',money(t.revenue_cents),'Receita bruta das vendas'],['Vendas',t.orders,'Registros no período'],['Ticket médio',money(t.average_order_cents),'Faturamento ÷ vendas'],['Unidades vendidas',t.units,'Soma das quantidades']]){
      const card=el('article',undefined,'stat');card.append(el('span',title),el('strong',value),el('small',hint));$('#stats').append(card);
    }
    bars('#monthly',data.monthly);bars('#categories',data.categories,true);
    $('#products').replaceChildren();
    data.topProducts.forEach((p,i)=>{const card=el('article',undefined,'product');card.append(el('span',`0${i+1}`,'rank'),el('strong',p.label),el('span',money(p.cents)),el('small',`${p.units} unidades`));$('#products').append(card);});
    if(!data.topProducts.length)$('#products').append(el('p','Nenhum produto encontrado.','empty'));
    $('#sales').replaceChildren();
    for(const sale of data.recent){const tr=el('tr');[sale.date.split('-').reverse().join('/'),sale.product,sale.channel,sale.quantity,money(sale.total_cents)].forEach((value,i)=>{const td=el('td',value);td.dataset.label=['Data','Produto','Canal','Unidades','Total'][i];tr.append(td);});$('#sales').append(tr);}
    if(!data.recent.length){const tr=el('tr'),td=el('td','Nenhuma venda encontrada.','empty');td.colSpan=5;tr.append(td);$('#sales').append(tr);}
  }catch(e){if(id!==sequence)return;current=null;$('#export').disabled=true;$('#message').textContent=e.message || 'Não foi possível carregar os dados.';}
}
form.onsubmit=e=>{e.preventDefault();load();};
$('#clear').onclick=()=>{form.reset();load();};
$('#export').onclick=()=>{
  if(!current)return;
  // Exporta o resultado já aplicado, incluindo os filtros usados.
  const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');
  a.href=url;a.download='resumo-vendas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#export').disabled=true;load();

