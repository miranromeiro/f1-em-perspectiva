const el = id => document.getElementById(id);
const pct = x => (100*x).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%';
const nome = id => id.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
function taxa(rows){return rows.reduce((n,r)=>n+r.top10,0)/rows.length}
function tabela(id, headers, rows){
  el(id).innerHTML='<thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody>';
}
function desenharSerie(rows,periodo){
  const svg=['<svg class="trace" viewBox="0 0 780 200" aria-label="Taxa de top 10 por temporada" role="group">'];
  const x=ano=>48+690*(ano-periodo[0])/(periodo[1]-periodo[0]);
  const y=valor=>158-134*valor;
  for(const nivel of [0,.25,.5,.75,1]){
    svg.push('<line x1="48" x2="738" y1="'+y(nivel)+'" y2="'+y(nivel)+'"/><text x="4" y="'+(y(nivel)+4)+'">'+pct(nivel)+'</text>');
  }
  const pontos=[];
  let caminho='',continuo=false;
  for(let ano=periodo[0];ano<=periodo[1];ano++){
    svg.push('<text x="'+x(ano)+'" y="184" text-anchor="middle">'+ano+'</text>');
    const grupo=rows.filter(r=>r.ano===ano&&r.grid>=8&&r.grid<=13&&(!el('pista').value||r.circuito===el('pista').value));
    if(!grupo.length){continuo=false;continue}
    const taxaAno=taxa(grupo),desc=ano+' · '+pct(taxaAno)+' · '+grupo.filter(r=>r.top10).length+' de '+grupo.length+' largadas';
    caminho+=(continuo?' L':' M')+x(ano)+' '+y(taxaAno);continuo=true;
    pontos.push('<circle tabindex="0" cx="'+x(ano)+'" cy="'+y(taxaAno)+'" r="5" aria-label="'+desc+'"><title>'+desc+'</title></circle>');
  }
  el('serie').innerHTML=svg.join('')+'<path d="'+caminho+'"/>'+pontos.join('')+'</svg>';
  el('ponto').textContent=pontos.length?'Selecione um ponto para ver o resultado.':'Sem largadas neste período e circuito.';
  for(const ponto of el('serie').querySelectorAll('circle')){
    ponto.onfocus=ponto.onmouseenter=ponto.onclick=()=>{
      el('serie').querySelector('.selecionado')?.classList.remove('selecionado');
      ponto.classList.add('selecionado');
      el('ponto').textContent=ponto.getAttribute('aria-label');
    };
  }
}
function explorar(){
  const periodo=[[2010,2025],[2010,2013],[2014,2021],[2022,2025]][+el('periodo').value];
  const rows=dados.filter(r=>r.ano>=periodo[0]&&r.ano<=periodo[1]);
  desenharSerie(rows,periodo);
  el('grid').innerHTML=Array.from({length:24},(_,i)=>{
    const group=rows.filter(r=>r.grid===i+1), p=taxa(group);
    return '<div class="col" title="'+(group.length?pct(p):'Sem dados')+' · '+group.length+' largadas">'+(group.length?Math.round(100*p)+'%':'—')+'<div class="bar" style="height:'+(group.length?130*p:0)+'px"></div>'+(i+1)+'</div>';
  }).join('');
  const ranges=[[8,9],[10,11],[12,13],[8,13]];
  tabela('heat',['Circuito','8–9','10–11','12–13','Total P8–P13'],[...new Set(rows.map(r=>r.circuito))].sort().map(c=>[nome(c),...ranges.map(([a,b])=>{
    const g=rows.filter(r=>r.circuito===c&&r.grid>=a&&r.grid<=b),p=taxa(g);
    return g.length?'<span style="display:block;background:rgba(184,32,32,'+(0.04+p*.96)+')">'+pct(p)+'<br><small style="letter-spacing:0;color:#fff">'+g.filter(r=>r.top10).length+'/'+g.length+'</small></span>':'—';
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
  tabela('metrics',['Métrica','Grid','Grid + histórico'],['Acurácia','Precisão','Recall','F1','AUC-ROC'].map((m,i)=>[m,barra(base.values[i],'#8ba9ff'),barra(hist.values[i],'#ff635c')]));
  const key=el('modelo').value;
  el('calibracao').replaceChildren();
  for(let i=0;i<5;i++){
    const grupo=rows.filter(r=>Math.min(4,Math.floor(r[key]*5))===i);
    const linha=document.createElement('div');
    linha.className='calrow';
    const previsto=grupo.reduce((s,r)=>s+r[key],0)/grupo.length;
    linha.innerHTML='<b>'+20*i+'–'+20*(i+1)+'% · '+grupo.length+' largadas</b>'+(grupo.length?
      '<div>Previsão média '+barra(previsto,'#8ba9ff')+'</div><div>Top 10 observado '+barra(taxa(grupo),'#ff635c')+'</div>':'Sem observações');
    el('calibracao').append(linha);
  }
  const matrix=(el('modelo').value==='base'?base:hist).matrix;
  tabela('matrix',['Resultado real','Previsto fora','Previsto top 10'],[['Fora',...matrix[0]],['Top 10',...matrix[1]]]);
}
function corrida(revelado=false){
  const rows=teste.filter(r=>r.ano+'-'+r.etapa===el('gp').value);
  const selecionado=rows.find(r=>r.piloto===el('piloto').value);
  const escolha=el('palpite').value;
  const acerta=r=>(r.historico>=0.5)===Boolean(r.top10);
  const posicao=r=>Number(r.chegada)||Infinity;
  if(revelado)rows.sort((a,b)=>posicao(a)-posicao(b)||a.grid-b.grid);
  const cabecalho=revelado?['Chegada','Piloto','Largada','Prob. top 10','Modelo','Conferência']:['Largada','Piloto','Prob. top 10','Modelo'];
  tabela('race',cabecalho,rows.map(r=>{
    const piloto=r===selecionado?'<strong>'+nome(r.piloto)+' ★</strong>':nome(r.piloto);
    const classe=r.historico>=0.5?'Top 10':'Fora';
    return revelado?[r.chegada,piloto,r.grid,pct(r.historico),classe,acerta(r)?'Acerto':'Erro']:[r.grid,piloto,pct(r.historico),classe];
  }));
  let texto='Ordem de largada. O modelo estima a chance de top 10 de cada piloto. O limiar de decisão é 50%.';
  if(revelado){
    texto='Ordem de chegada oficial entre os pilotos analisados. Modelo: '+rows.filter(acerta).length+' acertos em '+rows.length+' largadas. Códigos de situação aparecem ao final.';
    if(escolha!=='')texto+=' Seu palpite para '+nome(selecionado.piloto)+': '+(Number(escolha)===selecionado.top10?'acertou.':'errou.');
  }
  el('resumo').textContent=texto;
  el('piloto').disabled=el('palpite').disabled=revelado;
  el('revelar').textContent=revelado?'Ocultar resultado':'Revelar resultado';
  el('revelar').onclick=()=>corrida(!revelado);
}
function prepararGP(){
  const rows=teste.filter(r=>r.ano+'-'+r.etapa===el('gp').value);
  el('piloto').replaceChildren(...rows.map(r=>new Option(nome(r.piloto),r.piloto)));
  el('piloto').value=(rows.find(r=>r.grid===12)||rows[0]).piloto;
  el('palpite').value='';
  corrida();
}
function mudarTela(){
  const telas=[...document.querySelectorAll('main > section')];
  const ativa=telas.find(s=>'#'+s.id===location.hash)||el('largada');
  telas.forEach(s=>s.hidden=s!==ativa);
  document.querySelectorAll('nav a').forEach(a=>{
    if(a.hash==='#'+ativa.id)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo({top:0,behavior:'instant'});
}
for(const r of teste){const id=r.ano+'-'+r.etapa;if(!el('gp').options.namedItem(id)){const op=new Option(r.ano+' · '+nome(r.gp),id);op.id=id;el('gp').add(op)}}
for(const pista of [...new Set(dados.map(r=>r.circuito))].sort())el('pista').add(new Option(nome(pista),pista));
el('pista').onchange=el('periodo').onchange=el('faixa').onchange=explorar;
el('ano').onchange=el('modelo').onchange=avaliarPeriodo;
el('gp').onchange=prepararGP;
el('piloto').onchange=()=>{el('palpite').value='';corrida()};
window.addEventListener('hashchange',mudarTela);
const raiz='https://github.com/miranromeiro/f1-em-perspectiva/blob/main/f1-alem-do-grid/';
const materiais={'Artigo IEEE (PDF)':'relatorio/artigo.pdf','Dataset final':'dados/largadas.csv','Código da análise':'analise/preparar.py','Índice do trio':'apresentacao/indice.md','Roteiro detalhado':'apresentacao/roteiro.md','Conferência do enunciado':'apresentacao/requisitos.md'};
for(const [titulo,caminho] of Object.entries(materiais)){
  const a=document.createElement('a');a.textContent=titulo;a.href=raiz+caminho;el('materiais').append(a);
}
explorar();avaliarPeriodo();prepararGP();mudarTela();
