// O PERFIL É DE QUEM O ESCREVEU — E NINGUÉM ABRE O SENOVA COM A VIDA DE OUTRA PESSOA.
//
// 22/ago/2026, S50, Fix 1 do plano do Plano de Vida. Até aqui o Perfil inteiro morava numa
// chave única do KV (`perfil_usuario`): o nome, o telefone, a carreira, a formação, o projeto de
// vida escrito à mão. É dela que a análise de vaga tira QUEM é o candidato. Com um segredo
// compartilhado e uma pessoa usando, ninguém sentia — mas o segundo usuário a salvar o Perfil
// gravaria a vida dele por cima da do primeiro, e a análise sairia com a identidade trocada.
// Não era risco de amanhã: aconteceria no primeiro minuto do primeiro convidado.
//
// Junto vinha a duplicidade R9: a régua de nota mínima por região tinha duas casas — o perfil e
// `config_varredura`, esta GLOBAL —, então a régua de uma pessoa valeria para todas.
//
// As regras que este teste guarda:
//   1. cada dono lê e grava o SEU perfil, e nunca o de outro;
//   2. a chave antiga não é apagada nem uma vez, e continua espelhada enquanto for do mesmo dono;
//   3. o legado só é herdado por quem o escreveu — um usuário novo começa VAZIO, jamais com a
//      vida de alguém na tela;
//   4. banco fora do ar não vira "o Senova esqueceu quem você é": volta a operar pela chave antiga;
//   5. a régua de nota mínima tem uma casa só (o perfil), e a config continua respondendo o campo
//      para não quebrar nenhum leitor — inclusive um app aberto há dias no navegador.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { webcrypto } = require('crypto');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// Extrai do Worker por balanceamento de chaves — mesmo mecanismo do _lib para o index.html.
// Uma constante de uma linha só (`const CHAVE_PERFIL_LEGADO = '...'`) não tem chave para
// balancear: nesse caso vale a linha inteira, senão o balanceador iria buscar o `{` da função
// seguinte e arrastaria meio arquivo junto.
function extraiW(assinatura) {
  const i = worker.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const fimLinha = worker.indexOf('\n', i);
  const ab = worker.indexOf('{', i);
  if (ab < 0 || ab > fimLinha) return worker.slice(i, fimLinha);
  let d = 0, j = ab;
  for (; j < worker.length; j++) { const c = worker[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return worker.slice(i, j + 1);
}

// KV de mentira, mas de verdade: guarda, devolve e CONTA o que foi apagado. A contagem existe
// porque a trava mais importante aqui é negativa — a chave antiga não pode sumir nunca.
function kvFalso(inicial = {}) {
  const m = { ...inicial };
  const apagados = [];
  return {
    _m: m, _apagados: apagados,
    get: async (k) => (k in m ? m[k] : null),
    put: async (k, v) => { m[k] = String(v); },
    delete: async (k) => { apagados.push(k); delete m[k]; },
  };
}
// D1 de mentira: uma tabela `usuarios` na memória, achada pelo hash da chave de acesso.
function dbFalso(porHash = {}, quebrado = false) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (quebrado) throw new Error('D1 fora do ar');
              if (/SELECT user_id FROM usuarios/.test(sql)) return porHash[args[0]] ? { user_id: porHash[args[0]] } : null;
              return null;
            },
            async run() { if (quebrado) throw new Error('D1 fora do ar'); return { success: true }; },
          };
        },
      };
    },
  };
}

function carregarWorker() {
  const fontes = [
    'async function _sha256hex(',
    'async function donoAtual(',
    'const CHAVE_PERFIL_LEGADO =', 'const CHAVE_DONO_LEGADO   =',
    'function chavePerfil(',
    'async function donoSeguro(',
    'async function _donoDoLegado(',
    'async function lerPerfilBruto(',
    'async function gravarPerfilBruto(',
    'const REGUA_REGIOES =', 'const REGUA_PADRAO =',
    'async function lerReguaDoPerfil(',
    'async function gravarReguaNoPerfil(',
  ].map(extraiW).join('\n;\n');
  const sandbox = { console: { log() {}, warn() {} }, crypto: webcrypto, TextEncoder };
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  return sandbox;
}
const W = carregarWorker();
const chamar = (fn, ...args) => { sandboxArgs.a = args; return vm.runInContext(`${fn}(...sandboxArgs.a)`, W); };
const sandboxArgs = {};
W.sandboxArgs = sandboxArgs;

const MARCOS = '47d8d702-8c3a-4d83-b0fa-ce1d3d8a2f89';
const ANA = 'aaaaaaaa-1111-2222-3333-444444444444';
const PERFIL_MARCOS_KV = JSON.stringify({ nome: 'Marcos Franco', telefone: '(41) 99615-2224', projeto_vida_texto: 'CANARIO-PROJETO-DE-VIDA', score_minimo_br: 55, score_minimo_us: 75 });

(async () => {
  console.log('=== a chave de cada um é a sua ===');
  {
    const kv = kvFalso();
    const env = { SENOVA_KV: kv };
    await chamar('gravarPerfilBruto', env, MARCOS, PERFIL_MARCOS_KV);
    await chamar('gravarPerfilBruto', env, ANA, JSON.stringify({ nome: 'Ana Ribeiro Costa' }));
    t('o perfil de cada dono vai para a chave dele',
      kv._m['perfil_usuario:' + MARCOS] === PERFIL_MARCOS_KV && JSON.parse(kv._m['perfil_usuario:' + ANA]).nome === 'Ana Ribeiro Costa');
    t('quem lê recebe o seu, não o do outro',
      JSON.parse(await chamar('lerPerfilBruto', env, ANA)).nome === 'Ana Ribeiro Costa'
      && JSON.parse(await chamar('lerPerfilBruto', env, MARCOS)).nome === 'Marcos Franco');
    t('gravar o perfil de uma pessoa não toca no da outra',
      JSON.parse(kv._m['perfil_usuario:' + MARCOS]).projeto_vida_texto === 'CANARIO-PROJETO-DE-VIDA');
  }

  console.log('\n=== a chave antiga é do dono dela, e continua intocada ===');
  {
    // O estado real de produção depois da migração de 22/ago: as três chaves existem.
    const kv = kvFalso({ 'perfil_usuario': PERFIL_MARCOS_KV, ['perfil_usuario:' + MARCOS]: PERFIL_MARCOS_KV, 'perfil_dono_legado': MARCOS });
    const env = { SENOVA_KV: kv };
    const novo = JSON.stringify({ nome: 'Marcos Franco', telefone: '(41) 3333-1010' });
    await chamar('gravarPerfilBruto', env, MARCOS, novo);
    t('salvar grava na chave nova', kv._m['perfil_usuario:' + MARCOS] === novo);
    t('e espelha na antiga, para o caminho de volta continuar barato', kv._m['perfil_usuario'] === novo);
    t('nada foi apagado do KV', kv._apagados.length === 0, kv._apagados.join(','));
  }

  console.log('\n=== um usuário novo começa VAZIO — nunca com a vida de outra pessoa ===');
  {
    const kv = kvFalso({ 'perfil_usuario': PERFIL_MARCOS_KV, 'perfil_dono_legado': MARCOS });
    const env = { SENOVA_KV: kv };
    t('Ana não herda o perfil da chave antiga', (await chamar('lerPerfilBruto', env, ANA)) === null);
    t('e nem a cópia dele aparece na chave dela', !('perfil_usuario:' + ANA in kv._m));
    // E quando Ana salva o dela, o legado de Marcos não pode ser espelhado por cima.
    await chamar('gravarPerfilBruto', env, ANA, JSON.stringify({ nome: 'Ana Ribeiro Costa' }));
    t('salvar o perfil de Ana não escreve na chave antiga de Marcos', kv._m['perfil_usuario'] === PERFIL_MARCOS_KV);
    t('o projeto de vida de Marcos continua onde estava', /CANARIO-PROJETO-DE-VIDA/.test(kv._m['perfil_usuario']));
  }

  console.log('\n=== o dono do legado o recebe, e a cópia nasce sem destruir a origem ===');
  {
    const kv = kvFalso({ 'perfil_usuario': PERFIL_MARCOS_KV, 'perfil_dono_legado': MARCOS });
    const env = { SENOVA_KV: kv };
    t('Marcos lê o que sempre foi dele', (await chamar('lerPerfilBruto', env, MARCOS)) === PERFIL_MARCOS_KV);
    t('a cópia preguiçosa criou a chave nova', kv._m['perfil_usuario:' + MARCOS] === PERFIL_MARCOS_KV);
    t('e a chave antiga segue lá, byte por byte', kv._m['perfil_usuario'] === PERFIL_MARCOS_KV);
  }

  console.log('\n=== sem marcador, o primeiro dono adota a chave antiga (rede do deploy sem migração) ===');
  {
    const kv = kvFalso({ 'perfil_usuario': PERFIL_MARCOS_KV });
    const env = { SENOVA_KV: kv };
    t('o primeiro a chegar recebe o legado', (await chamar('lerPerfilBruto', env, MARCOS)) === PERFIL_MARCOS_KV);
    t('e a adoção fica registrada no KV', kv._m['perfil_dono_legado'] === MARCOS);
    t('do segundo em diante, ninguém mais herda', (await chamar('lerPerfilBruto', env, ANA)) === null);
  }

  console.log('\n=== banco fora do ar não faz o Senova esquecer quem a pessoa é ===');
  {
    const env = { SENOVA_KV: kvFalso({ 'perfil_usuario': PERFIL_MARCOS_KV }), SENOVA_DB: dbFalso({}, true) };
    const req = { headers: { get: () => 'chave-de-acesso' } };
    const dono = await chamar('donoSeguro', req, env);
    t('donoSeguro devolve null em vez de explodir', dono === null);
    t('e a leitura cai na chave antiga, que é o comportamento de sempre',
      (await chamar('lerPerfilBruto', env, dono)) === PERFIL_MARCOS_KV);
    // Esta é a trava que impede o pior caminho: sem dono, gravar não pode criar
    // `perfil_usuario:null` nem deixar de gravar — grava onde o app sempre leu.
    const env2 = { SENOVA_KV: kvFalso({ 'perfil_usuario': PERFIL_MARCOS_KV }) };
    await chamar('gravarPerfilBruto', env2, null, '{"nome":"Marcos Franco"}');
    t('e a gravação sem dono vai para a chave antiga, não para uma chave órfã',
      env2.SENOVA_KV._m['perfil_usuario'] === '{"nome":"Marcos Franco"}' && !('perfil_usuario:null' in env2.SENOVA_KV._m));
  }

  console.log('\n=== o dono vem da chave de acesso, e a mesma chave dá sempre o mesmo dono ===');
  {
    const hashDaChave = [...new Uint8Array(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('chave-do-marcos')))]
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const env = { SENOVA_KV: kvFalso(), SENOVA_DB: dbFalso({ [hashDaChave]: MARCOS }) };
    const req = { headers: { get: () => 'chave-do-marcos' } };
    t('a chave de acesso encontra o dono registrado', (await chamar('donoSeguro', req, env)) === MARCOS);
    t('e duas leituras seguidas dão o mesmo dono', (await chamar('donoSeguro', req, env)) === MARCOS);
  }

  console.log('\n=== a régua de nota mínima tem uma casa só, e é o perfil ===');
  {
    const kv = kvFalso({ ['perfil_usuario:' + MARCOS]: PERFIL_MARCOS_KV });
    const env = { SENOVA_KV: kv };
    const r = await chamar('lerReguaDoPerfil', env, MARCOS);
    t('a régua sai do perfil de quem pediu', r.br === 55 && r.us === 75, JSON.stringify(r));
    t('e o que ele nunca ajustou cai no padrão, sem inventar número', r.de === 50 && r.remoto === 60);
    const rAna = await chamar('lerReguaDoPerfil', env, ANA);
    t('quem ainda não tem perfil recebe o padrão, nunca a régua de outra pessoa',
      rAna.br === 70 && rAna.us === 65, JSON.stringify(rAna));

    await chamar('gravarReguaNoPerfil', env, MARCOS, { br: 62, espt: 55, de: 0, remoto: 55, us: 75 });
    const p = JSON.parse(kv._m['perfil_usuario:' + MARCOS]);
    t('salvar a régua atualiza o perfil', p.score_minimo_br === 62 && p.score_minimo_de === 0);
    t('e não apaga o resto do perfil', p.projeto_vida_texto === 'CANARIO-PROJETO-DE-VIDA' && p.nome === 'Marcos Franco');
    t('zero é um valor legítimo, não "vazio"', (await chamar('lerReguaDoPerfil', env, MARCOS)).de === 0);

    await chamar('gravarReguaNoPerfil', env, MARCOS, { br: 'setenta' });
    t('lixo no lugar do número não entra no perfil',
      JSON.parse(kv._m['perfil_usuario:' + MARCOS]).score_minimo_br === 62);
    await chamar('gravarReguaNoPerfil', env, ANA, { br: 80 });
    t('a régua de Ana vai para o perfil de Ana', JSON.parse(kv._m['perfil_usuario:' + ANA]).score_minimo_br === 80);
    t('e a de Marcos continua a dele', JSON.parse(kv._m['perfil_usuario:' + MARCOS]).score_minimo_br === 62);
  }

  console.log('\n=== fiação: isto vale no Worker no ar ===');
  t('GET /api/perfil lê pela chave do dono',
    /path === '\/api\/perfil' && request\.method === 'GET'\)\s*\{\s*\n\s*const raw = await lerPerfilBruto\(env, await donoSeguro\(request, env\)\);/.test(worker));
  t('POST /api/perfil grava pela chave do dono',
    /await gravarPerfilBruto\(env, await donoSeguro\(request, env\), JSON\.stringify\(dados\)\);/.test(worker));
  t('nenhum ponto do Worker lê a chave antiga direto',
    (worker.match(/SENOVA_KV\.get\('perfil_usuario'\)/g) || []).length === 0);
  t('a análise de vaga monta a identidade do dono que pediu',
    /montarIdentidadeCandidato\(env, perfilCandidato, dono\)/.test(worker)
    && /analisarVaga\([^)]*metaConhecida, await donoSeguro\(request, env\)\)/.test(worker));
  t('o parecer da Sofia também', /parecerSofia\(body, env, body\.perfilCandidato, ctx, await donoSeguro\(request, env\)\)/.test(worker));
  t('GET /api/config-varredura deriva a régua do perfil, sem quebrar quem lê o campo',
    /config\.score_minimo_por_regiao = await lerReguaDoPerfil\(env, await donoSeguro\(request, env\)\);/.test(worker));
  t('POST /api/config-varredura encaminha a régua ao perfil e não a devolve para a config',
    /await gravarReguaNoPerfil\(env, await donoSeguro\(request, env\), nova\.score_minimo_por_regiao\);\s*\n\s*delete nova\.score_minimo_por_regiao;/.test(worker));
  t('o GET da config não muta a constante do módulo (cópia antes de escrever)',
    /const config = \{ \.\.\.\(raw \? JSON\.parse\(raw\) : CONFIG_PADRAO\) \};/.test(worker));
  t('o Worker não apaga a chave antiga em lugar nenhum',
    !/SENOVA_KV\.delete\('perfil_usuario/.test(worker));

  fim('O Perfil é de quem o escreveu');
})();
