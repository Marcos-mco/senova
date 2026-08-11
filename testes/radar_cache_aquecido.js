// GUARD — o aquecimento de cache do lote não pode virar o remendo que a S45 avisou.
//
// Por que este teste existe. O agente senova-viabilidade mediu que as 5 análises de um
// lote, disparadas 100% em paralelo, sempre pagam escrita de cache (a mais cara) porque
// nenhuma delas chega depois da outra ter aquecido o lado da Anthropic. O desenho óbvio —
// "1ª chamada + espera + as 4 restantes, em TODO lote" — foi DESCARTADO pelo mesmo agente
// porque dobraria a latência da esteira inteira (30 lotes × 20s = 10min, contra os 5min
// medidos e documentados em index.html:10420-10422). A correção real é aquecer por JANELA
// DE TEMPO (~4min, dentro do TTL de 5min do cache): só serializa a 1ª chamada quando o
// cache está frio E o lote tem 3+ vagas; do contrário mantém o paralelismo de sempre.
//
// A regra que este teste protege, comportamento real (fetch mockado, ordem de disparo
// medida), não leitura de código:
//   · cache frio + lote com 3+ vagas → a 1ª chamada termina ANTES das outras serem disparadas
//   · cache quente (dentro da janela) → as 5 disparam juntas, como sempre
//   · lote pequeno (<3) → dispara junto mesmo com cache frio (a espera não vale a pena)
//   · a 1ª falhando NUNCA trava as outras 4, e NUNCA finge que aqueceu o que não aqueceu
const vm = require('vm');
const { extrai, assert } = require('./_lib');
const { t, fim } = assert();

function fabricarVagas(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: 'vaga_' + i,
    status: 'triagem',
    jobDescription: 'Descrição longa o bastante para ser elegível para análise. '.repeat(3),
  }));
}

// Fetch de mentira: cada chamada leva um tempo real (setTimeout de verdade) para
// responder, e registra quantas chamadas JÁ TINHAM SIDO DISPARADAS no instante em que a
// 1ª termina — é esse número que denuncia paralelo (5) vs. serializado-depois-paralelo (1).
function montarFetch({ falharTodas = false } = {}) {
  let disparos = 0;
  let disparosQuandoAPrimeiraRespondeu = null;
  async function fetchMock() {
    disparos++;
    const minhaOrdem = disparos;
    await new Promise(resolve => setTimeout(resolve, 15));
    if (minhaOrdem === 1) disparosQuandoAPrimeiraRespondeu = disparos;
    if (falharTodas) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => ({ score: 50, classificacao: 'Compatível' }) };
  }
  return { fetchMock, info: () => ({ total: disparos, disparosQuandoAPrimeiraRespondeu }) };
}

function montarSandbox(vagas, fetchMock, cacheQuenteAte) {
  const sandbox = {
    vagas, WORKER_URL: 'https://w',
    fetch: fetchMock,
    _loteEmAnalise: new Set(), _analiseFalhou: new Set(),
    _cacheQuenteAte: cacheQuenteAte,
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
  const fontes = [extrai('function _elegivelParaAnalise('), extrai('async function analisarLoteBackground(')].join('\n;\n');
  vm.runInContext(fontes, sandbox);
  return sandbox;
}

(async () => {
  console.log('=== cache frio + lote com 3+ vagas: a 1ª chamada termina sozinha antes das outras ===');
  {
    const { fetchMock, info } = montarFetch();
    const sb = montarSandbox(fabricarVagas(5), fetchMock, /*cacheQuenteAte*/ 0);
    await vm.runInContext('window.analisarLoteBackground()', sb);
    t('as 5 vagas foram todas analisadas', info().total === 5, 'total=' + info().total);
    t('quando a 1ª respondeu, só ela tinha sido disparada (serializado, não paralelo)',
      info().disparosQuandoAPrimeiraRespondeu === 1, 'era ' + info().disparosQuandoAPrimeiraRespondeu);
    t('o cache ficou marcado como quente para o próximo lote',
      sb._cacheQuenteAte > Date.now());
  }

  console.log('\n=== cache quente (dentro da janela): as 5 disparam juntas, como sempre ===');
  {
    const { fetchMock, info } = montarFetch();
    const sb = montarSandbox(fabricarVagas(5), fetchMock, /*cacheQuenteAte*/ Date.now() + 60000);
    await vm.runInContext('window.analisarLoteBackground()', sb);
    t('as 5 vagas foram todas analisadas', info().total === 5, 'total=' + info().total);
    t('as 5 já tinham sido disparadas quando a 1ª respondeu (paralelo de verdade)',
      info().disparosQuandoAPrimeiraRespondeu === 5, 'era ' + info().disparosQuandoAPrimeiraRespondeu);
  }

  console.log('\n=== lote pequeno (<3): dispara junto mesmo com cache frio — a espera não vale a pena ===');
  {
    const { fetchMock, info } = montarFetch();
    const sb = montarSandbox(fabricarVagas(2), fetchMock, /*cacheQuenteAte*/ 0);
    await vm.runInContext('window.analisarLoteBackground()', sb);
    t('as 2 vagas foram analisadas', info().total === 2, 'total=' + info().total);
    t('as 2 já tinham sido disparadas quando a 1ª respondeu (não serializou)',
      info().disparosQuandoAPrimeiraRespondeu === 2, 'era ' + info().disparosQuandoAPrimeiraRespondeu);
  }

  console.log('\n=== a 1ª falhando nunca trava as outras 4, e nunca finge que aqueceu o que não aqueceu ===');
  {
    const { fetchMock, info } = montarFetch({ falharTodas: true });
    const sb = montarSandbox(fabricarVagas(5), fetchMock, /*cacheQuenteAte*/ 0);
    await vm.runInContext('window.analisarLoteBackground()', sb);
    t('as outras 4 foram chamadas mesmo com a 1ª falhando (fila não trava)',
      info().total === 5, 'total=' + info().total);
    t('nenhuma respondeu ok, então o cache NÃO foi marcado como quente',
      sb._cacheQuenteAte === 0, 'era ' + sb._cacheQuenteAte);
    t('as 5 vagas caíram em _analiseFalhou (sem nota, sem trava eterna)',
      sb._analiseFalhou.size === 5);
  }

  fim('radar_cache_aquecido');
})();
