// O QUE ESTÁ SALVO SÓ SAI DAQUI POR ATO DA PESSOA.
//
// O defeito (encontrado pelo senova-auditor em 22/ago/2026, antes de a migração do Perfil por
// usuário começar): `carregarPerfil` mandava o que voltasse do Worker direto para a tela e para o
// cache do CV, sem nunca perguntar se a resposta era mesmo um perfil. Uma resposta de erro em
// JSON — Worker fora do ar, chave de acesso vencida, 401 — chegava como um objeto sem os campos:
//
//   1. cada campo da tela virava '' (a pessoa via um Perfil vazio, como se o Senova a tivesse
//      esquecido);
//   2. guardarExperienciasSalvas(undefined) caía no `removeItem` e APAGAVA a carreira salva;
//   3. e se ela clicasse em "Salvar perfil" para "resolver", o formulário em branco era gravado
//      por cima do que estava guardado no Worker — de onde não há volta.
//
// Nada disso avisava nada. Era o caminho de destruição em silêncio que atravessa exatamente onde
// a migração do Perfil por usuário vai passar (Passo C), por isso fecha antes.
//
// A regra que este teste guarda: NÃO SABER não é o mesmo que ter deixado de existir. Quem só LÊ
// nunca apaga; apagar é ato de quem salva. E, sem ter conseguido ler, não se salva.
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

// DOM de mentira que devolve um elemento para qualquer id — é o que carregarPerfil espera.
function tela(){
  const cache={};
  return {
    _cache:cache,
    getElementById:(id)=>(cache[id]=cache[id]||{value:'',checked:false,style:{},textContent:''}),
    querySelector:()=>({value:'diaria'}), querySelectorAll:()=>[],
    createElement:()=>({style:{},click(){},setAttribute(){}}),
    addEventListener(){},
  };
}

const CARREIRA=[{id:'e1',cargo:'Diretor de Operações',empresa:'RPC/Globo',inicio:'2010-01',fim:'2020-06',bullets:['CANARIO-BULLET-SALVO'],tags_area:['gestao'],nivel:'diretoria'}];
const FORMACAO=[{titulo:'MBA em Gestão Empresarial',instituicao:'FGV, Curitiba',periodo:'1998-2000'}];
const CONTATO={nome:'Marcos Franco',telefone:'(41) 99615-2224',email:'marcos_mco@hotmail.com',linkedin:'linkedin.com/in/x'};

// Monta o app com uma resposta de /api/perfil sob medida.
function comResposta(resposta){
  const pedidos=[], ditos=[];
  const doc=tela();
  const s=carregarApp([
    'let _perfilCarregado=',
    'async function carregarPerfil(',
    'async function salvarPerfil(',
    'function _expParaPayload(',
    'function _formParaPayload(',
  ],{
    document:doc, WORKER_URL:'https://worker.teste',
    fetch:(url,init)=>{
      pedidos.push({url:String(url),metodo:(init&&init.method)||'GET',body:(init&&init.body)||''});
      if(String(url).includes('/api/perfil')&&(!init||!init.method)) return Promise.resolve(resposta);
      return Promise.resolve({ok:true,json:()=>Promise.resolve({})});
    },
    showToast:(m)=>ditos.push(String(m)), alert:(m)=>ditos.push(String(m)),
    // Tudo o que a tela chama e não é o objeto deste teste.
    _perfilRenderIdiomaPadrao(){}, _certCarregar(){}, _cvMasterSetLang(){},
    _expCarregar(){}, _formCarregar(){}, _setAjusteFinoUI(){}, _setCriterioUI(){},
    _setPontosTermos(){}, _lerCriterioUI:()=>({br:60,espt:60,de:60,remoto:60,us:60}),
    _onPerfilProjetoVidaInput(){}, _guardarPerfilIdioma(){}, _renderWhitelistChips(){},
    _formDispensarEditadas(){}, _cvMasterLock(){}, _diasInativo:7,
    _cvMasterDados:{pt:'CV',en:'',es:''}, _expDados:[], _formDados:[],
    _PONTOS_TERMOS:{otima:10,valer:5}, parseInt,
    localStorage:(()=>{ const m={};
      return {getItem:k=>(k in m?m[k]:null),setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>{delete m[k];},_m:m}; })(),
  });
  return {s,pedidos,ditos,doc};
}

const jsonDeErro={ok:false,status:401,json:()=>Promise.resolve({erro:'chave inválida'})};
const perfilVazioMasValido={ok:true,status:200,json:()=>Promise.resolve({nome:'Marcos Franco',email:'marcos_mco@hotmail.com'})};

(async ()=>{
  console.log('=== o Worker responde erro: a carreira salva NÃO é apagada ===');
  {
    const {s,ditos,doc}=comResposta(jsonDeErro);
    exec(s,'guardarExperienciasSalvas')(CARREIRA,true);
    exec(s,'guardarFormacaoSalva')(FORMACAO,true);
    exec(s,'guardarContatoSalvo')(CONTATO,true);
    t('a carreira estava guardada (controle)', (exec(s,'experienciasSalvas()')||[]).length===1);

    await exec(s,'carregarPerfil')();
    t('a carreira continua guardada depois da leitura que falhou',
      (exec(s,'experienciasSalvas()')||[]).length===1, JSON.stringify(exec(s,'experienciasSalvas()')));
    t('a formação também', (exec(s,'formacaoSalva()')||[]).length===1);
    t('e o contato também', !!exec(s,'contatoSalvo()'));
    t('o CV continua saindo com o que ela salvou, não com a semente',
      JSON.stringify(exec(s,'experienciasDoCV()')).includes('CANARIO-BULLET-SALVO'));

    console.log('\n=== e a tela não é preenchida com a resposta de erro ===');
    t('nenhum campo da tela foi tocado', !('perfil-nome' in doc._cache),
      Object.keys(doc._cache).join(','));
    t('a pessoa é avisada de que não deu para ler o perfil',
      ditos.some(m=>/não consegui carregar o seu perfil/i.test(m)), ditos.join(' | '));
    t('e o aviso diz que nada foi perdido',
      ditos.some(m=>/continua guardado|nada foi perdido/i.test(m)), ditos.join(' | '));
  }

  console.log('\n=== sem ter conseguido ler, não se salva por cima ===');
  {
    const {s,pedidos,ditos}=comResposta(jsonDeErro);
    await exec(s,'carregarPerfil')();
    const antes=pedidos.length;
    await exec(s,'salvarPerfil')();
    const gravacoes=pedidos.slice(antes).filter(p=>p.metodo==='POST');
    t('nenhuma gravação é enviada ao Worker', gravacoes.length===0, JSON.stringify(gravacoes.map(g=>g.url)));
    t('e a recusa é dita, com o motivo', ditos.some(m=>/não vou salvar agora/i.test(m)), ditos.join(' | '));
    t('dizendo o que fazer', ditos.some(m=>/recarregue a página/i.test(m)));
  }

  console.log('\n=== leitura boa: tudo volta ao normal, e salvar funciona ===');
  {
    const {s,pedidos,doc}=comResposta(perfilVazioMasValido);
    exec(s,'guardarExperienciasSalvas')(CARREIRA,true);
    await exec(s,'carregarPerfil')();
    t('a tela foi preenchida', doc._cache['perfil-nome'].value==='Marcos Franco', JSON.stringify(doc._cache['perfil-nome']));
    // O perfil salvo no Worker é anterior ao campo de experiências (caso real de quem salvou antes
    // da S49): ele volta SEM `experiencias`. Isso não é "ela apagou a carreira" — é o servidor não
    // saber. Era exatamente aqui que a carreira sumia.
    t('um perfil sem o campo de carreira não apaga a carreira do navegador',
      (exec(s,'experienciasSalvas()')||[]).length===1);
    const antes=pedidos.length;
    await exec(s,'salvarPerfil')();
    t('salvar volta a gravar no Worker', pedidos.slice(antes).some(p=>p.metodo==='POST'&&/\/api\/perfil/.test(p.url)));
  }

  console.log('\n=== a trava não tira da pessoa o direito de esvaziar ===');
  {
    const {s}=comResposta(perfilVazioMasValido);
    exec(s,'guardarExperienciasSalvas')(CARREIRA,true);
    exec(s,'guardarContatoSalvo')(CONTATO,true);
    exec(s,'guardarExperienciasSalvas')([],true);          // ela apagou tudo na tela e salvou
    t('esvaziar a carreira de propósito ainda apaga', exec(s,'experienciasSalvas()')===null);
    exec(s,'guardarContatoSalvo')({nome:'',telefone:'',email:''},true);
    t('e apagar o cabeçalho de propósito também', exec(s,'contatoSalvo()')===null);
  }

  console.log('\n=== fiação: isto vale no app real ===');
  t('carregarPerfil confere a resposta antes de tocar na tela',
    /if\(!res\.ok\) throw new Error\('perfil HTTP '\+res\.status\);/.test(html));
  t('quem SÓ LÊ não passa a autorização de apagar',
    /guardarExperienciasSalvas\(p\.experiencias\);/.test(html) && /guardarFormacaoSalva\(p\.formacao\);/.test(html));
  t('quem salva passa', /guardarExperienciasSalvas\(dados\.experiencias,true\);/.test(html));
  t('a leitura do arranque também lê sem apagar',
    /guardarExperienciasSalvas\(p\.experiencias\); guardarFormacaoSalva\(p\.formacao\);/.test(html));

  fim('O Perfil não apaga calado');
})();
