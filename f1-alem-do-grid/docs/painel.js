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

function mostrarBarras(id,grupos){
  el(id).replaceChildren();
  for(const [nomeGrupo,total,acertos] of grupos){
    const linha=document.createElement('div');
    linha.className='resposta';
    const valor=total?acertos/total:0;
    linha.innerHTML='<strong>'+nomeGrupo+'</strong><span>'+acertos+' de '+total+' · <b>'+(total?pct(valor):'Sem dados')+'</b></span><div class="escala"><i style="width:'+100*valor+'%"></i></div>';
    el(id).append(linha);
  }
}
function mostrarFrequencias(filtro,destino,grupos){
  const [inicio,fim]=el(filtro).value.split(',').map(Number);
  const periodo=dados.filter(r=>r.ano>=inicio&&r.ano<=fim&&r.grid>=8&&r.grid<=13);
  mostrarBarras(destino,grupos.map(([titulo,incluir])=>{
    const rows=periodo.filter(incluir);
    return [titulo,rows.length,rows.filter(r=>r.top10).length];
  }));
}
el('anosGrid').onchange=()=>mostrarFrequencias('anosGrid','compararGrid',[
  ['Largaram em 8º a 10º',r=>r.grid<=10],['Largaram em 11º a 13º',r=>r.grid>=11]
]);
el('anosEquipe').onchange=()=>mostrarFrequencias('anosEquipe','compararEquipe',[
  ['Top 10 em pelo menos metade das largadas anteriores',r=>r.formaEquipe!==null&&r.formaEquipe>=.5],
  ['Top 10 em menos da metade das largadas anteriores',r=>r.formaEquipe!==null&&r.formaEquipe<.5]
]);
el('anoFaixa').onchange=()=>{
  const rows=teste.filter(r=>r.grid>=8&&r.grid<=13&&(!+el('anoFaixa').value||r.ano===+el('anoFaixa').value));
  mostrarBarras('acertosFaixa',[['Só a posição de largada','base'],['Largada e histórico','historico']].map(([titulo,key])=>
    [titulo,rows.length,rows.filter(r=>(r[key]>=.5)===Boolean(r.top10)).length]));
};
const faixaTeste=teste.filter(r=>r.grid>=8&&r.grid<=13);
for(const piloto of [...new Set(faixaTeste.map(r=>r.piloto))].sort())el('pilotoCaso').add(new Option(nome(piloto),piloto));
el('pilotoCaso').value='oscar-piastri';
function listarCasos(){
  el('caso').replaceChildren();
  faixaTeste.forEach((r,i)=>{
    if(r.piloto===el('pilotoCaso').value)el('caso').add(new Option(nome(r.gp)+' '+r.ano+' · P'+r.grid,i));
  });
  verCaso(false);
}
el('pilotoCaso').onchange=listarCasos;
function verCaso(revelado){
  const r=faixaTeste[+el('caso').value];
  tabela('doisModelos',['Antes da corrida','Chance de top 10','Palpite'],[['Só a largada',r.base],['Largada e histórico',r.historico]].map(([titulo,p])=>[titulo,pct(p),p>=.5?'Entra':'Fica fora']));
  el('chegadaCaso').textContent=revelado?'Chegada oficial: '+r.chegada+(Number(r.chegada)?'º. ':'. ')+(r.top10?'Entrou no top 10.':'Ficou fora do top 10.'):'';
  el('abrirCaso').textContent=revelado?'Ocultar chegada':'Revelar chegada';
  el('abrirCaso').onclick=()=>verCaso(!revelado);
}
el('caso').onchange=()=>verCaso(false);
el('anosGrid').onchange();el('anosEquipe').onchange();el('anoFaixa').onchange();listarCasos();

const historicoFaixa=dados.filter(r=>r.grid>=8&&r.grid<=13);
function montarDuelo(){
  const chave=el('tipoDuelo').value;
  const nomes=[...new Set(historicoFaixa.map(r=>r[chave]))].sort();
  for(const lado of ['ladoA','ladoB']){
    el(lado).replaceChildren(...nomes.map(id=>new Option(nome(id),id)));
  }
  const defaults=chave==='circuito'?['interlagos','suzuka']:['fernando-alonso','lewis-hamilton'];
  el('ladoA').value=defaults[0];el('ladoB').value=defaults[1];
  desenharDuelo();
}
function desenharDuelo(){
  const chave=el('tipoDuelo').value;
  const svg=[],pontos=[],linhas=[];
  for(const nivel of [0,.25,.5,.75,1]){
    const y=150-120*nivel;
    svg.push('<line x1="52" x2="646" y1="'+y+'" y2="'+y+'"/><text x="6" y="'+(y+4)+'">'+pct(nivel)+'</text>');
  }
  for(let pos=8;pos<=13;pos++)svg.push('<text x="'+(62+114*(pos-8))+'" y="177" text-anchor="middle">P'+pos+'</text>');
  for(const [lado,cor] of [['ladoA','#ff776e'],['ladoB','#8ba9ff']]){
    const id=el(lado).value;
    const rows=historicoFaixa.filter(r=>r[chave]===id);
    let caminho='',ligar=false;
    for(let pos=8;pos<=13;pos++){
      const g=rows.filter(r=>r.grid===pos);
      if(!g.length){ligar=false;continue}
      const x=62+114*(pos-8),y=150-120*taxa(g);
      const dica=nome(id)+' · P'+pos+' · '+g.filter(r=>r.top10).length+' de '+g.length+' no top 10 ('+pct(taxa(g))+')';
      caminho+=(ligar?' L':' M')+x+' '+y;ligar=true;
      pontos.push('<circle tabindex="0" cx="'+x+'" cy="'+y+'" r="5" fill="'+cor+'" aria-label="'+dica+'"><title>'+dica+'</title></circle>');
    }
    svg.push('<path d="'+caminho+'" fill="none" stroke="'+cor+'" stroke-width="3"/>');
    const grupos=[rows.filter(r=>r.top10),rows.filter(r=>Number(r.chegada)>10),rows.filter(r=>!Number(r.chegada))];
    linhas.push([nome(id),...grupos.map(g=>'<span class="celula" style="background:rgba(195,48,48,'+(.06+.88*g.length/rows.length)+')">'+pct(g.length/rows.length)+'<br>'+g.length+'/'+rows.length+'</span>')]);
  }
  el('linhasDuelo').innerHTML='<svg viewBox="0 0 680 190" role="group" aria-label="Taxa de top 10 por posição de largada">'+svg.join('')+pontos.join('')+'</svg>';
  el('leituraDuelo').textContent='Escolha um ponto para ler a contagem.';
  for(const p of el('linhasDuelo').querySelectorAll('circle'))p.onclick=p.onfocus=p.onmouseenter=()=>el('leituraDuelo').textContent=p.getAttribute('aria-label');
  tabela('destinos',['Comparado','Top 10','11º em diante','Sem posição numérica'],linhas);
  for(const [a,b] of [['ladoA','ladoB'],['ladoB','ladoA']]){
    for(const opt of el(a).options)opt.disabled=opt.value===el(b).value;
  }
}
el('tipoDuelo').onchange=montarDuelo;
el('ladoA').onchange=el('ladoB').onchange=desenharDuelo;
montarDuelo();
