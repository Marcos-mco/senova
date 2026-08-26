// GUARD — nenhuma vaga é analisada sem um gesto (S53, 26/ago/2026).
//
// Por que este teste existe. Marcos: "não estou preocupado com estes avisos, é perda de
// tempo. O que precisamos é fazer ações para diminuir consumo." Medido no D1: a análise
// automática da Home era 55–75% do gasto de cada dia — 55 a 83 análises diárias, nenhuma
// pedida por ninguém. `verificarVagasVarredura` roda a cada visita à Home e chamava
// `_recalcLeadsReset()`, que é até 60 rodadas de 5 vagas. E o rendimento dessa esteira é
// conhecido: de 88 vagas pontuadas e arquivadas, 20 passaram de 70.
//
// Quatro coisas este arquivo guarda, e todas já falharam em alguma roupa:
//
//  1. A HOME NÃO GASTA SOZINHA. Nenhuma porta automática (visita à Home, migração de dado)
//     pode voltar a chamar a esteira. Elas OFERECEM.
//
//  2. AS DUAS FILAS SÃO A MESMA CONTA. A fila que o app oferece e a que ele analisa mudam
//     só na permissão. Divergindo, a esteira para achando que acabou — foi assim que 152
//     vagas ficaram mudas no Kanban.
//
//  3. NADA FICA NO LIMBO. Vaga liberada e não analisada (ele parou no meio) volta a ser
//     oferecida. Sem isso ela some do convite (já tem permissão) e ninguém a analisa (nada
//     roda sozinho) — muda para sempre.
//
//  4. A REGRA NÃO PERGUNTA DE QUAL SERVIÇO A VAGA VEIO. Era `_fonteVarredura` na camada
//     que decide — o modo de falha que o crivo nomeia ([[feedback_senova_para_qualquer_um_s51]]).
//     A pergunta agora é única e vale em Berlim: alguém pediu?
const fs = require('fs');
const path = require('path');
const { assert, carregarApp } = require('./_lib');
const { t, fim } = assert('NADA GASTA SEM GESTO');

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── 1. as portas automáticas ──────────────────────────────────────────────────────────
console.log('=== a Home não gasta sozinha ===');
{
  // verificarVagasVarredura roda a cada visita à Home. Se voltar a chamar a esteira, o
  // gasto volta inteiro — é literalmente a linha que estava lá.
  const iv = app.indexOf('async function verificarVagasVarredura');
  // Sem os comentários: o texto que EXPLICA a linha removida cita o nome dela, e não pode
  // fazer o guard passar nem falhar. Guard mede código, nunca prosa.
  const corpo = app.slice(iv, app.indexOf('function atualizarSinalOportunidades', iv)).replace(/\/\/[^\n]*/g, '');
  t('a visita à Home não dispara a esteira', iv > 0 && !/_recalcLeadsReset\(\)/.test(corpo));
  t('a visita à Home OFERECE a fila', /_esteiraOferecer\(\)/.test(corpo));

  // Migração de dado zera notas; não tem autoridade para gastar recalculando tudo.
  const im = app.indexOf("senova_migration_score_reset_v2','1'");
  const trecho = app.slice(im, im + 300);
  t('migração que zera notas não recalcula sozinha', im > 0 && !/_recalcLeadsReset/.test(trecho) && /_esteiraOferecer/.test(trecho));
}

// ── 2. o predicado ────────────────────────────────────────────────────────────────────
console.log('\n=== a permissão é obrigatória, e não pergunta de onde a vaga veio ===');
{
  const app2 = carregarApp(['function _analisavel(', 'function _elegivelParaAnalise(', 'function _filaEsperandoLiberacao('], {
    _analiseNoTeto: () => false,
    _analiseFalhou: new Set(),
  });
  const base = { status: 'triagem', descricao: 'x'.repeat(200) };

  t('sem permissão, não é elegível — venha de onde vier',
    app2._elegivelParaAnalise({ ...base, fonte: 'email_alerta' }) === false &&
    app2._elegivelParaAnalise({ ...base, fonte: 'adzuna' }) === false &&
    app2._elegivelParaAnalise({ ...base, fonte: 'extensao_chrome' }) === false &&
    app2._elegivelParaAnalise({ ...base }) === false);

  t('com permissão, é elegível — venha de onde vier',
    app2._elegivelParaAnalise({ ...base, fonte: 'email_alerta', analisePedida: true }) === true &&
    app2._elegivelParaAnalise({ ...base, fonte: 'adzuna', analisePedida: true }) === true);

  t('a permissão sozinha não basta: descrição curta continua fora',
    app2._elegivelParaAnalise({ status: 'triagem', descricao: 'curta', analisePedida: true }) === false);
  t('vaga que já tem nota não é reanalisada nem com permissão',
    app2._elegivelParaAnalise({ ...base, score: 71, analisePedida: true }) === false);

  // AS DUAS CONTAS SÃO A MESMA. Oferecida ∪ elegível = analisável, sem sobreposição.
  app2.vagas = [
    { id: 1, ...base, fonte: 'email_alerta' },                      // espera liberação
    { id: 2, ...base, fonte: 'adzuna', analisePedida: true },       // liberada
    { id: 3, status: 'triagem', descricao: 'curta' },               // nem uma coisa nem outra
    { id: 4, ...base, score: 80 },                                  // já analisada
  ];
  const oferecida = app2._filaEsperandoLiberacao().map(v => v.id);
  const elegivel = app2.vagas.filter(app2._elegivelParaAnalise).map(v => v.id);
  t('a fila oferecida é exatamente o que falta liberar', JSON.stringify(oferecida) === '[1]', JSON.stringify(oferecida));
  t('a fila analisada é exatamente o que foi liberado', JSON.stringify(elegivel) === '[2]', JSON.stringify(elegivel));
  t('nenhuma vaga cai nas duas filas ao mesmo tempo', !oferecida.some(id => elegivel.includes(id)));
  t('nenhuma vaga analisável fica fora das duas',
    app2.vagas.filter(app2._analisavel).every(v => oferecida.includes(v.id) || elegivel.includes(v.id)));
}

// ── 3. o limbo ────────────────────────────────────────────────────────────────────────
console.log('\n=== parar devolve a vaga à fila, não a deixa muda ===');
{
  const parar = app.slice(app.indexOf('function pararEsteira()'), app.indexOf('function retomarEsteira()'));
  t('parar retira a permissão de quem ainda não foi analisada', /delete v\.analisePedida/.test(parar));
  t('e persiste isso (senão a recarga traz o limbo de volta)', /saveVagas\(\)/.test(parar));

  // A bandeira de parar vale para a rodada, não para a sessão: de pé, o próximo gesto dele
  // não faria nada e o app pareceria quebrado.
  const laco = app.slice(app.indexOf('async function _recalcLeadsReset'), app.indexOf('function toggleOportunidades'));
  t('a bandeira de parar é zerada ao fim da rodada', /_esteiraParada=false/.test(laco.replace(/\s/g, '') ) || /_esteiraParada\s*=\s*false/.test(laco));
  t('e ao fim da rodada a barra volta a oferecer o que sobrou', /_esteiraOferecer\(\)/.test(laco));
}

// ── 4. o gesto ────────────────────────────────────────────────────────────────────────
console.log('\n=== o gesto existe, e libera exatamente o que foi precificado ===');
{
  const liberar = app.slice(app.indexOf('function liberarAnaliseDaFila()'), app.indexOf('function pararEsteira()'));
  t('o gesto usa a MESMA fila que a barra ofereceu', /_filaEsperandoLiberacao\(\)/.test(liberar));
  t('grava a permissão antes de gastar', /analisePedida = true/.test(liberar) && liberar.indexOf('saveVagas') < liberar.indexOf('_recalcLeadsReset'));
  t('a barra parada oferece o gesto, não só informa', /_esteiraOferecer[\s\S]{0,400}liberarAnaliseDaFila/.test(app));
  t('uma vaga só também pode ser pedida sem liberar a fila inteira', /analisar esta/.test(app));
}

fim();
