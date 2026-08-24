// GUARD — o lote automático (e-mail/Radar) tem que pontuar a descrição REAL da vaga, nunca o
// resumo curto do digest que originou o card.
//
// Por que este teste existe. 17/ago/2026 (S47), auditoria de backlog do fix ALS: em
// `analisarLoteBackground`, a única esteira do app que lia `v.descricao||v.jobDescription` —
// invertido. Todo o resto do código (14 pontos, ver index.html:5298 "o app SEMPRE lê os dois
// juntos") lê `jobDescription||descricao`, porque um card nasce do e-mail/Radar com um resumo
// curto em `descricao` e só ganha o texto completo da vaga em `jobDescription` depois do
// enriquecimento (index.html:12705). Com a ordem invertida, toda vaga que já tinha as duas
// versões era pontuada em cima do resumo do digest, não da vaga — o mesmo `_elegivelParaAnalise`
// que libera a vaga para análise (index.html:10808) já lê na ordem certa; só a leitura que
// MONTA o corpo da requisição estava trocada.
const vm = require('vm');
const { extrai, assert, html } = require('./_lib');
const { t, fim } = assert();

// RUBRICA_V é uma const simples (sem chaves) — extrai() balanceia { }, então não serve aqui;
// lê o valor real do arquivo por regex para o sandbox nunca divergir da régua vigente.
const RUBRICA_V = Number((html.match(/const RUBRICA_V=(\d+);/) || [, '1'])[1]);

function montarSandbox(vaga, fetchMock) {
  const sandbox = {
    vagas: [vaga], WORKER_URL: 'https://w',
    RUBRICA_V,
    fetch: fetchMock,
    _loteEmAnalise: new Set(), _analiseFalhou: new Set(),
    TETO_TENTATIVAS_ANALISE: 3, // const simples; guarda do valor em testes/analise_para_de_tentar.js
    _cacheQuenteAte: Date.now() + 60000, // cache quente: dispara direto, sem serializar
    ctxTextoAtivos: () => '',
    _criterioParaVaga: () => 0,
    setStatus: () => {}, classificacaoDoScore: () => ({ titulo: 'x' }),
    _cardIntocadoDaBusca: () => false,
    saveVagas: () => {}, renderCRM: () => {}, renderParaConsiderar: () => {},
    _gravarNotasNoRadar: async () => {},
    setTimeout: (f, ms) => setTimeout(f, ms),
    JSON, Date, console, Promise, Set, Map, String, Array, Math, Number,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const fontes = [extrai('function _fonteVarredura('), extrai('function _elegivelParaAnalise('), extrai('function _analiseNoTeto('), extrai('function _registrarFalhaAnalise('), extrai('async function analisarLoteBackground('), extrai('function _gravarMetaVaga('), extrai('function _aplicarSinaisWorker('), extrai('function _metaConhecidaVaga(')].join('\n;\n');
  vm.runInContext(fontes, sandbox);
  return sandbox;
}

(async () => {
  console.log('=== card com resumo curto (descricao) E texto completo (jobDescription): manda o completo ===');
  {
    const descricaoResumoDigest = 'Vaga de Head de Desenvolvimento na ALS. '.repeat(4); // >120 chars, elegível
    const jobDescriptionReal = 'DESCRIÇÃO REAL DA VAGA — texto completo capturado pelo enriquecimento. '.repeat(5);
    const vaga = { id: 'v1', status: 'triagem', descricao: descricaoResumoDigest, jobDescription: jobDescriptionReal };

    let corpoEnviado = null;
    const fetchMock = async (url, opts) => {
      corpoEnviado = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ score: 50, classificacao: 'Compatível' }) };
    };

    const sb = montarSandbox(vaga, fetchMock);
    await vm.runInContext('window.analisarLoteBackground()', sb);

    t('a requisição foi disparada', corpoEnviado !== null);
    t('mandou o texto de jobDescription (a descrição real), não o resumo do digest',
      corpoEnviado && corpoEnviado.descricao === jobDescriptionReal,
      'mandou: ' + JSON.stringify(corpoEnviado && corpoEnviado.descricao));
    t('não mandou o resumo curto do digest',
      corpoEnviado && corpoEnviado.descricao !== descricaoResumoDigest);
  }

  console.log('\n=== card só com descricao (ainda sem enriquecimento): usa o que tem ===');
  {
    const soDescricao = 'Vaga sem enriquecimento ainda, só o resumo do e-mail chegou até aqui. '.repeat(3);
    const vaga = { id: 'v2', status: 'triagem', descricao: soDescricao };

    let corpoEnviado = null;
    const fetchMock = async (url, opts) => {
      corpoEnviado = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ score: 50, classificacao: 'Compatível' }) };
    };

    const sb = montarSandbox(vaga, fetchMock);
    await vm.runInContext('window.analisarLoteBackground()', sb);

    t('sem jobDescription, cai para descricao normalmente',
      corpoEnviado && corpoEnviado.descricao === soDescricao);
  }

  console.log('\n=== a leitura da esteira usa a MESMA ordem do gatekeeper de elegibilidade (index.html:10808) ===');
  t('analisarLoteBackground lê jobDescription||descricao, igual _elegivelParaAnalise',
    /const desc=v\.jobDescription\|\|v\.descricao\|\|''/.test(html));
  t('a ordem antiga (invertida) não existe mais no arquivo',
    !/const desc=v\.descricao\|\|v\.jobDescription\|\|''/.test(html));

  fim('lote_descricao_correta');
})();
