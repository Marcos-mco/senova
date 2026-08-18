// GERAR CV/CARTA DE VAGA ACHADA POR FORA — o Caminho A entra na hora de gerar o documento.
//
// 24/jul/2026, LinkedIn Easy Apply (Jobgether): Marcos analisou a vaga pelo popup (análise
// transitória, NUNCA virou card) e clicou em gerar o CV. `__senovaCopilotoGerarCV` não achou card
// → 'sem_card' → o painel mostrava o genérico "Tente de novo", sem dizer o que fazer. O Senova
// estava ABERTO (Marcos confirmou): a vaga simplesmente não era card ainda.
//
// A régua da S30: "a extensão É o copiloto" e "cria tudo sob demanda". Gerar o documento de uma
// vaga achada por fora é o Caminho A — criar o card — só que disparado na hora de gerar, não antes.
// A costura: content manda a página INTEIRA (com descrição) via _dadosVagaCompletos(); o background,
// ao receber 'sem_card', cria o card (garantir-card já testado) e tenta UMA vez de novo.
//
// Este teste prova (1) o seam do CV no app: sem card → sem_card; com card → precisa_gerar; descrição
// magra → descricao_curta (falha honesta, não CV fraco); e (2) a fiação de background e content.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extrai(assinatura, txt) {
  const src = txt || html;
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei: ' + assinatura);
  const abre = src.indexOf('{', i);
  let d = 0, j = abre;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) break; }
  }
  return src.slice(i, j + 1);
}

const fontes = [
  'function _jobIdLinkedIn(',
  'function dataAtualFormatada(',
  'function _acharVagaRef(',
  'function _gravarMetaVaga(',
  'window.__senovaCopilotoGarantirCard=function(',
  'function _extrairSoCV(', 'function setCV(',
  'window.__senovaCopilotoGerarCV=function(',
].map(a => extrai(a)).join('\n;\n');

const sandbox = {
  vagas: [], filtroAtivo: null,
  saveVagas: () => {}, renderCRM: () => {}, aplicarFiltros: () => {},
  showToast: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  document: { getElementById: () => null },
  _idiomaDoPedido: () => 'PT',
  // Portão único do pedido de CV. Aqui só interessa o veredito curta/não-curta: com descrição longa
  // o app deve chegar a 'precisa_gerar'; com descrição magra, a 'descricao_curta'.
  montarPedidoCV: (o) => ({ body: { system: 'S', messages: [{ content: o.descricao }] }, curta: (o.descricao || '').length < 400 }),
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontes, sandbox);

let ok = 0, fail = 0;
const t = (nome, cond, det) => { if (cond) { ok++; console.log('  PASS  ' + nome); } else { fail++; console.log('  FAIL  ' + nome + (det ? '  → ' + det : '')); } };
const reset = (vs) => { sandbox.vagas = vs; };
const run = (fn, args) => vm.runInContext('window.' + fn + '(' + args.map(a => JSON.stringify(a)).join(',') + ')', sandbox);

const DESC_LONGA = 'Buscamos Gerente Comercial Nacional Sênior. '.repeat(20); // > 400
const REF = { jobId: null, url: 'https://www.linkedin.com/jobs/view/4444275054/', cargo: 'Gerente Comercial Nacional SR', empresa: 'Jobgether', descricao: DESC_LONGA, score: 72, canal: 'linkedin' };

console.log('=== o app não acha card → sem_card (o gatilho do Caminho A no background) ===');
reset([]);
let r = run('__senovaCopilotoGerarCV', [REF, 'pdf']);
t('vaga sem card devolve sem_card', r && r.ok === false && r.motivo === 'sem_card', JSON.stringify(r));

console.log('\n=== o Caminho A cria o card com a descrição da página ===');
r = run('__senovaCopilotoGarantirCard', [REF]);
t('criou o card', r && r.ok && r.criou === true, JSON.stringify(r));
t('guardou a descrição da página em jobDescription (campo corrente)', (sandbox.vagas[0].jobDescription || '').length > 400);

console.log('\n=== gerar de novo agora chega a precisa_gerar (não é mais sem_card) ===');
r = run('__senovaCopilotoGerarCV', [REF, 'pdf']);
t('já não é sem_card', !(r && r.motivo === 'sem_card'), JSON.stringify(r && r.motivo));
t('pede a geração do CV', r && r.motivo === 'precisa_gerar', JSON.stringify(r && r.motivo));
t('leva empresa e cargo reais', r && r.empresa === 'Jobgether' && r.cargo === 'Gerente Comercial Nacional SR');

console.log('\n=== descrição magra: falha honesta (não CV fraco) — o caso real do Jobgether ===');
reset([]);
const CURTA = { url: 'https://x.com/v/1', cargo: 'Head', empresa: 'Parceira', descricao: 'This position is listed on behalf of a partner company.' };
run('__senovaCopilotoGarantirCard', [CURTA]);
r = run('__senovaCopilotoGerarCV', [CURTA, 'pdf']);
t('card criado, mas descrição curta → descricao_curta', r && r.motivo === 'descricao_curta', JSON.stringify(r && r.motivo));

// ── A costura da extensão: sem estas duas pontas, o seam do app nunca é acionado ──────────────
console.log('\n=== BACKGROUND: garantir-card ao receber sem_card e tentar de novo ===');
const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
const cv = extrai('async function copilotoCV(', bg);
const carta = extrai('async function copilotoCarta(', bg);
t('copilotoCV reage a sem_card', /r\.motivo === 'sem_card'/.test(cv));
t('copilotoCV chama __senovaCopilotoGarantirCard', /__senovaCopilotoGarantirCard\(ref\)/.test(cv));
t('copilotoCV tenta gerar de novo depois', /__senovaCopilotoGarantirCard[\s\S]{0,240}r = await gerar\(\)/.test(cv));
t('copilotoCarta reage a sem_card', /r\.motivo === 'sem_card'/.test(carta));
t('copilotoCarta chama __senovaCopilotoGarantirCard', /__senovaCopilotoGarantirCard\(ref\)/.test(carta));
t('copilotoCarta tenta a ponte de novo depois', /__senovaCopilotoGarantirCard[\s\S]{0,240}r = await ponte\(\)/.test(carta));
t('só garante com algum dado da vaga (não cria card vazio)', /d\.descricao \|\| d\.cargo \|\| d\.empresa/.test(cv) && /d\.descricao \|\| d\.cargo \|\| d\.empresa/.test(carta));

console.log('\n=== CONTENT: manda a página INTEIRA (com descrição), não só a referência leve ===');
const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
t('_dadosVagaCompletos existe', /function _dadosVagaCompletos\(\)/.test(ct));
t('_dadosVagaCompletos relê a página via extract()', /function _dadosVagaCompletos\(\)[\s\S]{0,320}extract\(\)/.test(ct));
t('_dadosVagaCompletos carrega a descrição', /function _dadosVagaCompletos\(\)[\s\S]{0,320}descricao: p\.descricao/.test(ct));
t('_baixarCV manda _dadosVagaCompletos()', /type: 'COPILOTO_CV', dados: _dadosVagaCompletos\(\)/.test(ct));
t('_gerarCarta manda _dadosVagaCompletos()', /type: 'COPILOTO_CARTA', dados: _dadosVagaCompletos\(\)/.test(ct));

console.log('\n=== CONTENT: sem_card deixou de cair no genérico "Tente de novo" ===');
t('_baixarCV mapeia sem_card para uma ação clara', /motivo === 'sem_card'\) \? 'Abra a página da vaga e tente de novo'/.test(ct));

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `CAMINHO A NA GERAÇÃO: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
