const el = id => document.getElementById(id);
const pct = x => (100*x).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const nome = id => id.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
function taxa(rows){return rows.reduce((n,r)=>n+r.top10,0)/rows.length}
function tabela(id, headers, rows){
  el(id).innerHTML='<thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>';
}
function explorar(){
  const periodo=[[2010,2025],[2010,2013],[2014,2021],[2022,2025]][+el('periodo').value];
  const rows=dados.filter(r=>r.ano>=periodo[0]&&r.ano<=periodo[1]);
  el('grid').innerHTML=Array.from({length:24},(_,i)=>{
    const group=rows.filter(r=>r.grid===i+1), p=taxa(group);
    return '<div class="col" title="'+(group.length?pct(p):'Sem dados')+' · '+group.length+' largadas">'+(group.length?Math.round(100*p)+'%':'—')+'<div class="bar" style="height:'+(group.length?130*p:0)+'px"></div>'+(i+1)+'</div>';
  }).join('');
  const ranges=[[8,9],[10,11],[12,13]];
  tabela('heat',['Circuito','8–9','10–11','12–13'],[...new Set(rows.map(r=>r.circuito))].sort().map(c=>[nome(c),...ranges.map(([a,b])=>{
    const g=rows.filter(r=>r.circuito===c&&r.grid>=a&&r.grid<=b),p=taxa(g);
    return g.length?'<span style="display:block;background:rgba(149,220,90,'+(p*.5)+')">'+pct(p)+'<br><small style="letter-spacing:0">'+g.filter(r=>r.top10).length+'/'+g.length+'</small></span>':'—';
  })]));
  const [a,b]=el('faixa').value.split('–').map(Number);
  el('forma').innerHTML=[false,true].map(high=>{
    const g=rows.filter(r=>r.grid>=a&&r.grid<=b&&r.formaEquipe!==null&&(r.formaEquipe>=.5)===high),n=g.length,p=taxa(g);
    if(!n)return '<p>Sem observações neste recorte.</p>';
    const z=1.96, den=1+z*z/n,center=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
    return '<p>'+ (high?'Histórico ≥ 50%':'Histórico &lt; 50%')+' · <b>'+pct(p)+'</b> ('+g.filter(r=>r.top10).length+'/'+n+')</p><div class="track" title="'+pct(center-half)+' a '+pct(center+half)+'"><i class="interval" style="left:'+100*(center-half)+'%;width:'+200*half+'%"></i><i class="dot" style="left:'+100*p+'%"></i></div>';
  }).join('');
}
const teste=dados.filter(r=>r.base!==null);
function avaliar(rows,key){
  let tn=0,fp=0,fn=0,tp=0;
  for(const r of rows){if(r[key]>=.5){if(r.top10)tp++;else fp++}else if(r.top10)fn++;else tn++}
  const neg=rows.filter(r=>!r.top10),pos=rows.filter(r=>r.top10);
  const auc=pos.reduce((s,p)=>s+neg.reduce((v,n)=>v+(p[key]>n[key]?1:p[key]===n[key]?.5:0),0),0)/(pos.length*neg.length);
  return {values:[(tn+tp)/rows.length,tp/(tp+fp),tp/(tp+fn),2*tp/(2*tp+fp+fn),auc],matrix:[[tn,fp],[fn,tp]]};
}
function avaliarPeriodo(){
  const rows=teste.filter(r=>!+el('ano').value||r.ano===+el('ano').value);
  const base=avaliar(rows,'base'),hist=avaliar(rows,'historico');
  const barra=(v,cor)=>'<span>'+pct(v)+'</span><div style="height:5px;background:'+cor+';width:'+100*v+'%"></div>';
  tabela('metrics',['Métrica','Grid','Grid + histórico'],['Acurácia','Precisão','Recall','F1','AUC-ROC'].map((m,i)=>[m,barra(base.values[i],'#87bbdb'),barra(hist.values[i],'#d4ff59')]));
  const matrix=(el('modelo').value==='base'?base:hist).matrix;
  tabela('matrix',['Resultado real','Previsto fora','Previsto top 10'],[['Fora',...matrix[0]],['Top 10',...matrix[1]]]);
}
function corrida(revelado=false){
  const rows=teste.filter(r=>r.ano+'-'+r.etapa===el('gp').value);
  tabela('race',['Grid','Piloto','Prob. top 10',...(revelado?['Chegada']:[])],rows.map(r=>[r.grid,nome(r.piloto),pct(r.historico),...(revelado?[r.chegada]:[])]));
  el('revelar').textContent=revelado?'Ocultar resultado':'Revelar resultado';
  el('revelar').onclick=()=>corrida(!revelado);
}
for(const r of teste){const id=r.ano+'-'+r.etapa;if(!el('gp').options.namedItem(id)){const op=new Option(r.ano+' · '+nome(r.gp),id);op.id=id;el('gp').add(op)}}
el('periodo').onchange=el('faixa').onchange=explorar;
el('ano').onchange=el('modelo').onchange=avaliarPeriodo;
el('gp').onchange=()=>corrida();
explorar();avaliarPeriodo();corrida();
