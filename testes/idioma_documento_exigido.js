// GUARD — quando a vaga PEDE o documento numa língua específica ("envie o CV em inglês"), o
// Senova tem que ouvir isso e não só olhar em que língua o ANÚNCIO está escrito.
//
// Por que este teste existe. Em 17/ago/2026 Marcos abriu o card "Diretor Executivo (Vendas)"
// (Brasil 24-7) e reportou: a vaga tinha uma pegadinha — "enviar CV em inglês" — e o app não
// pegou. Causa raiz (senova-auditor): a IA nunca foi instruída a procurar um PEDIDO explícito de
// idioma do documento; _idiomaDecidido só sabia olhar a língua em que o próprio anúncio estava
// ESCRITO (_idiomaDaVaga), que é uma coisa diferente. O fix (senova-viabilidade aprovou o custo)
// ensina a IA a extrair `documento_idioma_exigido` e liga isso como um novo degrau em
// _idiomaDecidido — acima do idioma do anúncio, abaixo da escolha manual daquela vaga. Este
// teste cobre o degrau em si (o motivo tem que dizer a verdade, nunca cair em silêncio quando a
// pessoa não declarou a língua pedida ou o Senova não entrega) e as esteiras que hoje gravam o
// campo a partir da resposta do Worker — a mesma disciplina de
// testes/candidatura_direta_nao_desaparece.js, para o mesmo tipo de campo novo não sumir numa
// esteira que ninguém lembrou de atualizar.
const fs = require('fs');
const path = require('path');
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

console.log('=== _idiomaDecidido: novo degrau para o pedido explícito da vaga ===');
{
  const s = carregarApp(); // _idiomaDecidido, IDIOMAS, idiomasDoUsuario etc. já vêm no NÚCLEO

  t('vaga pede inglês, ela declara inglês → sai em inglês',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'EN' }]).lang === 'EN');
  t('e o motivo diz que foi a vaga que pediu, não "idioma da vaga"',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'EN' }]).motivo === 'a vaga pede o documento em inglês',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'EN' }]).motivo);

  t('vaga pede alemão, ela não declarou alemão → cai na melhor língua que ela tem (inglês), não em silêncio',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'DE' }]).lang === 'EN',
    JSON.stringify(chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'DE' }])));
  t('e o motivo AVISA que a língua pedida não foi declarada (não finge que ela pediu inglês)',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'DE' }]).motivo === 'a vaga pede o documento em alemão, que você não declarou',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'DE' }]).motivo);

  t('a escolha MANUAL daquela vaga (cvIdioma) continua vencendo o pedido da vaga',
    chamar(s, '_idiomaDecidido', ['', { cvIdioma: 'PT', idiomaDocExigido: 'EN' }]).lang === 'PT');
  t('e o motivo continua "sua escolha para esta vaga", não o pedido da vaga',
    chamar(s, '_idiomaDecidido', ['', { cvIdioma: 'PT', idiomaDocExigido: 'EN' }]).motivo === 'sua escolha para esta vaga');

  t('o pedido da vaga vence o padrão do Perfil (é mais específico daquela vaga)', (() => {
    exec(s, '_perfilIdioma = ' + JSON.stringify({ padrao: 'pt', niveis: { PT: 'nativo', EN: 'avancado', ES: 'avancado', DE: 'nao' } }));
    const d = chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'EN' }]);
    exec(s, '_perfilIdioma = ' + JSON.stringify({ padrao: 'auto', niveis: null }));
    return d.lang === 'EN' && d.motivo === 'a vaga pede o documento em inglês';
  })());

  t('idiomaDocExigido inválido/desconhecido não quebra — cai nos degraus de sempre',
    chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'XX' }]).lang === 'PT',
    JSON.stringify(chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'XX' }])));

  t('quando ela DECLAROU a língua pedida mas o Senova ainda não monta documento nela, a falta é nossa (não silenciosa)', (() => {
    exec(s, '_perfilIdioma = ' + JSON.stringify({ padrao: 'auto', niveis: { PT: 'nativo', EN: 'avancado', ES: 'avancado', DE: 'avancado' } }));
    const d = chamar(s, '_idiomaDecidido', ['', { idiomaDocExigido: 'DE' }]);
    exec(s, '_perfilIdioma = ' + JSON.stringify({ padrao: 'auto', niveis: null }));
    return d.lang === 'EN' && d.motivo === 'o Senova ainda não monta o documento em alemão';
  })(), 'ver _dividaIdioma');

  t('_idiomaDoPedido também enxerga o campo (é ele que a tela de download usa)',
    chamar(s, '_idiomaDoPedido', ['', '', { idiomaDocExigido: 'EN' }]) === 'EN');
}

console.log('\n=== _aplicarSinaisWorker: o ponto único de gravação copia o campo novo ===');
{
  const s = carregarApp(['function _aplicarSinaisWorker(']);
  const alvo = {};
  exec(s, '_aplicarSinaisWorker(' + JSON.stringify(alvo) + ', ' + JSON.stringify({ documento_idioma_exigido: 'ES' }) + ')');
  const r = exec(s, '_aplicarSinaisWorker({}, {documento_idioma_exigido:"ES"})');
  t('idiomaDocExigido é gravado a partir de documento_idioma_exigido', r.idiomaDocExigido === 'ES', JSON.stringify(r));
  const r2 = exec(s, '_aplicarSinaisWorker({idiomaDocExigido:"EN"}, {})');
  t('resposta sem o campo não apaga o que já estava gravado (Worker pode não repetir em toda resposta)', r2.idiomaDocExigido === 'EN');
}

console.log('\n=== analisarLoteBackground grava o idioma exigido na vaga real ===');
{
  const app = carregarApp(['async function analisarLoteBackground('], {
    vagas: [{ id: 'v1', cargo: 'Diretor Executivo (Vendas)', empresa: 'Brasil 24-7', descricao: 'descrição de teste com tamanho suficiente para ser elegível' }],
    WORKER_URL: 'https://worker.teste',
    fetch: () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
        documento_idioma_exigido: 'EN',
      }),
    }),
    _elegivelParaAnalise: () => true,
    _criterioParaVaga: () => 999,
    _temTrabalhoReal: () => true,
    _gravarNotasNoRadar: () => Promise.resolve(),
    RUBRICA_V: 3, ctxTextoAtivos: () => '', _cacheQuenteAte: 0, _loteEmAnalise: new Set(),
  });

  return exec(app, 'analisarLoteBackground()').then(() => {
    const v = app.vagas[0];
    t('idiomaDocExigido foi gravado na vaga', v.idiomaDocExigido === 'EN', v.idiomaDocExigido);
    resto();
  });
}

function resto() {

console.log('\n=== mvReanalisarCompat grava o idioma exigido na vaga real ===');
{
  const app = carregarApp(['async function mvReanalisarCompat('], {
    vagas: [{ id: 'v1', cargo: 'Diretor Executivo (Vendas)', empresa: 'Brasil 24-7', rubricaV: 3, atsScore: '75' }],
    editingVagaId: 'v1',
    CV_DESC_MINIMA: 10,
    WORKER_URL: 'https://worker.teste',
    document: { getElementById: id => id === 'mv-job-desc' ? { value: 'descrição de teste com tamanho suficiente' } : null },
    ctxTextoAtivos: () => '', RUBRICA_V: 3,
    fetch: () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
        documento_idioma_exigido: 'EN',
      }),
    }),
    mvUpdateScoreDisplay() {},
  });

  return exec(app, 'mvReanalisarCompat()').then(() => {
    const v = app.vagas[0];
    t('idiomaDocExigido foi gravado na vaga', v.idiomaDocExigido === 'EN', v.idiomaDocExigido);
    resto2();
  });
}

function resto2() {

console.log('\n=== _montarCardVarredura não descarta o idioma exigido ao virar card ===');
{
  const app = carregarApp(['function _montarCardVarredura(']);
  const card = exec(app, `_montarCardVarredura(${JSON.stringify({
    id: 'v2', empresa: 'Brasil 24-7', titulo: 'Diretor Executivo (Vendas)', fonte: 'varredura',
    score: 78, classificacao: 'candidatar', resumo: 'r', pontos_fortes: [], pontos_atencao: [],
    idiomaDocExigido: 'EN',
  })}, ${Date.now()})`);
  t('idiomaDocExigido chegou ao card', card.idiomaDocExigido === 'EN', card.idiomaDocExigido);
}

// ── A importação do radar e o round-trip com o KV: prova textual, mesmo motivo do
// candidatura_direta_nao_desaparece.js (analisarUma fecha sobre variáveis de fora do escopo).
console.log('\n=== a importação do radar não perde o campo ao remontar o resultado ===');
t('o mapeamento de analisarUma inclui idiomaDocExigido a partir de analise.documento_idioma_exigido',
  html.includes('idiomaDocExigido:analise.documento_idioma_exigido'));

console.log('\n=== _gravarNotasNoRadar manda o campo ao Worker ===');
t('o corpo enviado a /api/vagas-lead/score inclui idiomaDocExigido',
  /idiomaDocExigido:\s*v\.idiomaDocExigido/.test(html));

console.log('\n=== o Worker persiste idiomaDocExigido no KV, não só os campos antigos ===');
{
  const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
  const rota = worker.slice(worker.indexOf("'/api/vagas-lead/score'"), worker.indexOf("'/api/vagas-lead/score'") + 1200);
  t('a rota /api/vagas-lead/score desestrutura idiomaDocExigido do corpo recebido', /idiomaDocExigido/.test(rota));
  t('e regrava o item do KV com o campo', /vagasKV\[idx\]\s*=\s*\{[^}]*idiomaDocExigido/.test(rota));
}

console.log('\n=== o prompt do Worker ensina a IA a procurar o pedido, e o schema tem o campo ===');
{
  const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
  t('o systemPrompt tem a instrução IDIOMA DO DOCUMENTO', /IDIOMA DO DOCUMENTO/.test(worker));
  t('o JSON pedido à IA inclui documento_idioma_exigido', /"documento_idioma_exigido"/.test(worker));
}

console.log('\n=== truncamento da descrição alinhado entre o front e o prompt do Worker ===');
{
  const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
  t('o Worker lê a descrição até 5000 chars, igual ao front (S47: era 4000 vs 5000)', /descricao\|\|''\)\.slice\(0,\s*5000\)/.test(worker), worker.match(/descricao[^\n]{0,40}slice\([^)]*\)/g));
}

fim('IDIOMA DO DOCUMENTO · A PEGADINHA "ENVIE O CV EM X" NÃO SOME NUMA ESTEIRA NOVA');
}
}
