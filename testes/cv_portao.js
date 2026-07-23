// PORTÃO ÚNICO DE GERAÇÃO DO CV — o teste que faltava.
//
// O QA do CV (skill_qa_cv.md, cv_estrutura.js, cv_pdf.js) testava a MONTAGEM do PDF a partir de um
// CV bem formado. Ninguém testava o PEDIDO do CV. Por essa fresta passaram quatro prompts
// diferentes para o mesmo documento; o da extensão gerava com max_tokens 2000 e descrição cortada
// em 4000 chars, devolvendo um CV truncado — sem COMPETÊNCIAS e com menos experiências — que foi
// para um recrutador de verdade (22/jul/2026, vaga emprego.com).
//
// A regra é uma só: a extensão pede o MESMO CV que o card. Este teste prova isso por igualdade,
// não por inspeção visual.
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
function extrai(a) { const i = html.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a); const ab = html.indexOf('{', i); let d = 0, j = ab; for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return html.slice(i, j + 1); }

// CV_DESC_MINIMA é um const de uma linha — não tem corpo para o extrai() casar.
const mDesc = html.match(/const CV_DESC_MINIMA\s*=\s*(\d+)\s*;/);
if (!mDesc) { console.log('  FAIL  CV_DESC_MINIMA não existe mais no index.html'); process.exit(1); }
const CV_DESC_MINIMA = parseInt(mDesc[1], 10);

const fontes = [
  'function montarPedidoCV(',
  'function _jobIdLinkedIn(', 'function _acharVagaRef(', 'function _extrairSoCV(', 'function setCV(',
  'window.__senovaCopilotoGerarCV=function(',
].map(extrai).join('\n;\n');

// ATS_SYSTEM entra mockado (depende de PERFIL_MARCOS inteiro): o que este teste mede é o PEDIDO,
// não o texto do system. O mock ecoa o idioma e o texto da vaga para provar que chegaram certos.
const sandbox = {
  vagas: [], saveVagas: () => { }, document: { getElementById: () => null },
  MODELOS: { analise: 'modelo-analise', rapido: 'modelo-rapido' },
  ATS_SYSTEM: (lang, textoVaga) => 'SYS[' + lang + ']' + textoVaga,
  ctxBuscarRelevantes: () => [{ texto: 'complemento relevante do Perfil' }],
  CV_DESC_MINIMA, cvLang: 'PT',
  lastCV: '', lastCVFilename: '', atsCargo: '',
  _pdfExecBase64: () => 'FAKEB64',
  btoa: s => Buffer.from(s, 'binary').toString('base64'),
  unescape: global.unescape || (s => decodeURIComponent(s)), encodeURIComponent, console,
};
sandbox.window = sandbox; vm.createContext(sandbox); vm.runInContext(fontes, sandbox);
const run = expr => vm.runInContext(expr, sandbox);

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

// Descrição longa e realista (acima do piso), com um marcador no FIM para pegar truncamento.
const DESC = 'Head de Vendas em Curitiba. '.repeat(200) + '\nMARCADOR_FINAL_DA_DESCRICAO';
t('a descrição de teste passa dos 4000 chars (senão o teste não prova nada)', DESC.length > 4000, DESC.length + ' chars');

console.log('\n=== O pedido do portão é o pedido bom (o do card) ===');
const ped = run('montarPedidoCV(' + JSON.stringify({ descricao: DESC, localizacao: 'Curitiba, PR', modelo: 'Presencial', regime: 'CLT' }) + ')');
t('modelo é o de análise (nunca o rápido)', ped.body.model === 'modelo-analise', ped.body.model);
t('max_tokens 4000 — 2000 truncava o CV no meio', ped.body.max_tokens === 4000, String(ped.body.max_tokens));
t('descrição vai INTEIRA (não cortada em 4000 chars)', ped.body.messages[0].content.includes('MARCADOR_FINAL_DA_DESCRICAO'));
t('metadados da vaga entram no texto', ped.vagaTexto.includes('Localização: Curitiba, PR') && ped.vagaTexto.includes('Modelo: Presencial') && ped.vagaTexto.includes('Regime: CLT'));
t('PERFIL COMPLEMENTAR entra no pedido', ped.body.messages[0].content.includes('complemento relevante do Perfil'));
t('idioma sai do cvLang do app, não de literal fixo', ped.body.system.startsWith('SYS[PT]'));

console.log('\n=== Idioma acompanha o app (era fixo em "PT" na extensão) ===');
sandbox.cvLang = 'EN';
t('cvLang=EN → pedido em EN', run('montarPedidoCV({descricao:"x".repeat(500)})').body.system.startsWith('SYS[EN]'));
sandbox.cvLang = 'PT';

console.log('\n=== Piso de descrição: CV de snippet sai genérico ===');
t('descrição curta é marcada como curta', run('montarPedidoCV({descricao:"vaga de vendas"})').curta === true);
t('descrição no piso NÃO é marcada como curta', run('montarPedidoCV({descricao:"x".repeat(' + CV_DESC_MINIMA + ')})').curta === false);

console.log('\n=== PARIDADE: a extensão pede o MESMO CV que o card ===');
sandbox.vagas.length = 0;
sandbox.vagas.push({
  id: 1, empresa: 'emprego.com', cargo: 'Head de Vendas', origemUrl: 'https://emprego.com/v/1',
  jobDescription: DESC, localizacao: 'Curitiba, PR', modelo: 'Presencial', regime: 'CLT', atsCV: '',
});
const rExt = run('window.__senovaCopilotoGerarCV({url:"https://emprego.com/v/1"},"pdf")');
t('sem CV no card, a extensão pede para gerar', rExt.motivo === 'precisa_gerar', JSON.stringify(rExt).slice(0, 120));
const pedCard = run('montarPedidoCV(' + JSON.stringify({ descricao: DESC, localizacao: 'Curitiba, PR', modelo: 'Presencial', regime: 'CLT' }) + ')');
t('o pedido da extensão é IDÊNTICO ao do card',
  JSON.stringify(rExt.prompt) === JSON.stringify(pedCard.body),
  'divergiram — voltou a haver dois CVs');

console.log('\n=== Extensão respeita o mesmo piso do card ===');
sandbox.vagas[0].jobDescription = 'vaga de vendas em Curitiba';
t('descrição curta → não gera CV fraco em silêncio',
  run('window.__senovaCopilotoGerarCV({url:"https://emprego.com/v/1"},"pdf")').motivo === 'descricao_curta');

console.log('\n=== atsCargo (calibra 1 vs 2 páginas) vem do card, não do resíduo global ===');
sandbox.vagas[0].jobDescription = DESC;
sandbox.vagas[0].atsCV = 'MARCOS FRANCO\nHead de Vendas\n\nRESUMO EXECUTIVO\nx';
sandbox.atsCargo = 'CEO';   // resíduo de outra análise, do jeito que acontecia no app
let cargoVisto = null;
sandbox._pdfExecBase64 = () => { cargoVisto = sandbox.atsCargo; return 'FAKEB64'; };
run('window.__senovaCopilotoGerarCV({url:"https://emprego.com/v/1"},"pdf")');
t('o PDF é calibrado pelo cargo DO CARD', cargoVisto === 'Head de Vendas', String(cargoVisto));
t('e o resíduo global é restaurado depois', sandbox.atsCargo === 'CEO', String(sandbox.atsCargo));

console.log('\n──────────────────────────────');
console.log('PORTÃO DO CV: ' + ok + '/' + (ok + fail) + (fail ? ' ✗' : ' ✓'));
process.exit(fail ? 1 : 0);
