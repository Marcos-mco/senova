// GUARD — a varredura automática está cancelada, e o corte não pode virar perda (S51).
//
// Por que este teste existe. Dez dias de medição em `custo_ia` mostraram que 97,9% do
// gasto de IA do Senova é análise de vaga, e que a busca automática (Adzuna/Jobicy)
// rendeu 2 processos e ZERO currículos enviados, contra 211 processos e 6 currículos dos
// alertas por e-mail. Marcos decidiu em 23/ago/2026: cancelar a varredura, ficar só com o
// e-mail. O risco do corte não é técnico — é o corte comer junto o que funciona, ou virar
// desaparecimento silencioso de vaga. É isso que este arquivo guarda:
//
//   1. o e-mail, a extensão e o que ele cria à mão NUNCA são bloqueados;
//   2. vaga da varredura não é analisada sozinha, mas TEM caminho de volta pelo gesto dele
//      (a permissão viaja no card, `analisePedida`, e não num modo global);
//   3. a tela não diz "Avaliando…" sobre o que ninguém vai avaliar;
//   4. o custo é dito ANTES do clique em "Buscar agora";
//   5. a colheita de e-mail (cron de 3 em 3 horas) continua de pé;
//   6. cada análise carimba de QUAL esteira veio — sem isso, "cortar o radar" no mês que
//      vem cortaria também a análise do card que ele abre para se candidatar.
const fs = require('fs');
const path = require('path');
const { carregarApp, assert, html } = require('./_lib');
const { t, fim } = assert();

const raiz = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(raiz, 'senova-worker.js'), 'utf8');
const wrangler = fs.readFileSync(path.join(raiz, 'wrangler.toml'), 'utf8');

const app = carregarApp(
  ['function _fonteVarredura(', 'function _analisavel(', 'function _elegivelParaAnalise(', 'function _analiseNoTeto(', 'function _promoverTriagem('],
  {
    // `const _analiseFalhou=new Set()` não tem corpo em chaves para o extrator balancear —
    // entra como mock. Vazio é o estado real de um app recém-aberto.
    _analiseFalhou: new Set(),
    // Idem: const simples. O valor de verdade tem guarda própria em
    // testes/analise_para_de_tentar.js; aqui só precisa existir para o predicado rodar.
    TETO_TENTATIVAS_ANALISE: 3,
    renderWidgetRevisao() {},
  }
);
const { _elegivelParaAnalise, _promoverTriagem } = app;

const DESC = 'x'.repeat(400); // acima do piso de 120 caracteres que a esteira exige
const vaga = (extra) => Object.assign({ id: 1, status: 'triagem', descricao: DESC }, extra);

// A REGRA MUDOU DE ESCOPO EM 26/ago/2026, E ESTE BLOCO MUDOU COM ELA.
// Até aqui a permissão era exigida só de quem viesse da varredura; o e-mail, a extensão e o
// que ele criava à mão eram analisados sozinhos. A medição da S53 mostrou que era ali que o
// dinheiro saía: 55 a 83 análises por dia na Home, nenhuma pedida. Agora NADA é analisado sem
// gesto — e a diferença por fonte sumiu da camada que decide (guard em
// `testes/nada_gasta_sem_gesto.js`). O que este bloco continua guardando é o que sempre
// guardou: o corte não pode COMER o canal que produz. Com o gesto, tudo analisa igual.
console.log('=== o que funciona continua funcionando: nenhuma fonte é bloqueada ===');
t('vaga vinda de alerta por e-mail analisa com o gesto (211 processos, 6 currículos — é o canal que produz)',
  _elegivelParaAnalise(vaga({ fonte: 'email_alerta', analisePedida: true })) === true);
t('vaga vinda da extensão analisa com o gesto', _elegivelParaAnalise(vaga({ fonte: 'extensao_chrome', analisePedida: true })) === true);
t('vaga criada à mão (sem fonte) analisa com o gesto', _elegivelParaAnalise(vaga({ fonte: '', analisePedida: true })) === true);
t('vaga vinda de e-mail direto analisa com o gesto', _elegivelParaAnalise(vaga({ fonte: 'email', analisePedida: true })) === true);

console.log('\n=== nenhuma fonte gasta sozinha — nem a que produz ===');
t('vaga da Adzuna não é analisada por conta própria', _elegivelParaAnalise(vaga({ fonte: 'Adzuna' })) === false);
t('vaga do Jobicy não é analisada por conta própria', _elegivelParaAnalise(vaga({ fonte: 'Jobicy' })) === false);
t('vaga de e-mail também não: era daqui que saíam 55–83 análises por dia',
  _elegivelParaAnalise(vaga({ fonte: 'email_alerta' })) === false);
t('e vaga sem fonte nenhuma também não', _elegivelParaAnalise(vaga({ fonte: '' })) === false);

console.log('\n=== o gesto destrava, e a permissão é do CARD (não um modo global) ===');
t('vaga da varredura com analisePedida É analisada',
  _elegivelParaAnalise(vaga({ fonte: 'Adzuna', analisePedida: true })) === true);
t('"Enviar para Processos" marca o pedido de análise no próprio card', (() => {
  app.vagas.length = 0;
  app.vagas.push(vaga({ id: 7, fonte: 'Adzuna' }));
  _promoverTriagem('7');
  return app.vagas[0].analisePedida === true && app.vagas[0].status === 'lead';
})());
t('a autorização de "Buscar agora" nasce falsa a cada carga do app',
  /let _varreduraPedida=false;/.test(html));
t('e é gasta na colheita seguinte — não fica pendurada autorizando as próximas visitas à Home',
  /_varreduraPedida=false;\s*\n\s*\/\/ AQUI ERA O GASTO/.test(html));

console.log('\n=== nada desaparece: o que não entra fica na piscina do radar, com caminho de volta ===');
t('a filtragem acontece na ENTRADA do Kanban, não por apagamento',
  /\.filter\(v=>!_fonteVarredura\(v\)\|\|_varreduraPedida\)/.test(html) &&
  !/vagas=vagas\.filter\(v=>!_fonteVarredura/.test(html));
t('a extensão abrindo a página da vaga também vale como pedido de análise',
  /\/\/ Abrir a página da vaga com a extensão é gesto dele[\s\S]{0,220}vagas\[idx\]\.analisePedida=true;/.test(html));

console.log('\n=== a tela não promete o que não vai acontecer ===');
// A redação mudou junto com a regra: não é mais "a busca automática está desligada" (isso
// era sobre UMA fonte), é "ninguém pediu ainda" — e a tela oferece o gesto ali mesmo.
t('vaga sem análise diz que não foi analisada e oferece o gesto, em vez de "Avaliando…"',
  /v\.analisePedida!==true[\s\S]{0,900}Sem análise ainda[\s\S]{0,600}analisar esta/.test(html));
t('"Buscar agora" diz o custo ANTES de disparar a busca', (() => {
  const i = html.indexOf('async function dispararVarreduraManual(');
  const j = html.indexOf("'/api/varredura-manual'", i);
  const antes = html.slice(i, j);
  return /if\(!confirm\(/.test(antes) && /R\$ 0,08/.test(antes) && /nenhum currículo/.test(antes);
})());
t('a tela de Configurações não anuncia mais um cron diário que não existe',
  !/cron diário 07:00 BRT/.test(html));

console.log('\n=== a colheita de e-mail, que é o canal que produz, continua de pé ===');
t('o cron de 3 em 3 horas segue no wrangler.toml', /crons\s*=\s*\[[^\]]*"0 \*\/3 \* \* \*"/.test(wrangler));
t('o cron diário da varredura saiu do wrangler.toml',
  !/crons\s*=\s*\[[^\]]*"0 10 \* \* \*"/.test(wrangler));
t('o ramo da varredura continua escrito no Worker — é o caminho de volta, não código apagado',
  /event\.cron === '0 10 \* \* \*'[\s\S]{0,120}executarVarredura\(env, true\)/.test(worker));
t('"Buscar agora" (POST /api/varredura-manual) continua existindo',
  /path === '\/api\/varredura-manual'/.test(worker));

console.log('\n=== toda análise diz de QUAL esteira veio ===');
t('a origem viaja do pedido até a gravação do custo',
  /async function analisarVaga\([^)]*\borigemCusto\b\s*\)/.test(worker) &&
  // Termina em [,)] e não em ')': a v7.43 acrescentou o dono DEPOIS da origem, e fixar o
  // fecho de parêntese faria esta asserção cair sem nada ter regredido
  // ([[feedback_teste_guarda_posicao_nao_lista_s50]]).
  /_registrarCustoIA\(env, data\.usage, origemCusto \|\| 'radar'[,)]/.test(worker));
t('quem não se identifica continua sendo "radar" — o rótulo do histórico, nunca um sumiço da medição',
  /origemCusto \|\| 'radar'/.test(worker));
t('as sub-origens estão no catálogo fechado (o que não estiver nele cai em "app")',
  ['esteira_home', 'card_aberto', 'extensao'].every(o =>
    new RegExp(`const ORIGENS_CUSTO = new Set\\(\\[[\\s\\S]{0,300}'${o}'`).test(worker)));
t('a rota /api/analisar-vaga repassa a origem que o app mandou',
  // Entre a destruturação e a chamada passou a existir o porteiro do teto (v7.46). O que
  // este teste guarda é que a origem que o app mandou CHEGA à análise — não que as duas
  // linhas sejam vizinhas.
  /const \{[^}]*\borigem\b[^}]*\} = await request\.json\(\);[\s\S]{0,700}?return json\(await analisarVaga\([\s\S]{0,220}, origem\)\)/.test(worker));
t('a esteira da Home se identifica como esteira_home', /origem:'esteira_home'/.test(html));
t('o card aberto se identifica como card_aberto (2 chamadas: cálculo automático e recálculo)',
  (html.match(/origem:'card_aberto'/g) || []).length === 2);

console.log('\n=== a lista de fontes da varredura é explícita (não regex solta sobre texto livre) ===');
t('_fonteVarredura compara com um vocabulário fechado, sem casar por pedaço de texto',
  /f==='adzuna'\|\|f==='jobicy'/.test(html) && !/\/adzuna\|jobicy\/i/.test(html));
t('e não reconhece fonte parecida por acaso (uma vaga de "adzuna-legacy" não seria bloqueada por engano)',
  app._fonteVarredura({ fonte: 'adzuna-legacy' }) === false && app._fonteVarredura({ fonte: 'Adzuna' }) === true);

fim('varredura_cancelada');
