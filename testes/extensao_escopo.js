// A extensão não pode se enxergar. O painel do copiloto vive no DOM da própria página: toda
// varredura que cai no `document` (quando não achamos o container de candidatura) devolvia os
// botões do PRÓPRIO Senova como se fossem da página.
//
// 23/jul/2026, emprego.com: o diagnóstico que Marcos mandou listava "PDF Executivo",
// ".docx (ATS)", "Carta de apresentação", "Já me candidatei" e "Copiar para enviar ao Bruno" como
// botões de envio da página. O sensor existe para um dia reconhecer o MOMENTO do envio sozinho —
// se ele confunde o próprio painel com a página, essa automação nasceria cega.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei no content.js: ' + a); const ab = src.indexOf('{', i); let d = 0, j = ab; for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); }

const mRe = src.match(/const _RE_ENVIAR = \/.*\/i;/);
const mDa = src.match(/const _daExtensao = .*;/);
let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };
if (!mRe || !mDa) { console.log('  FAIL  _RE_ENVIAR / _daExtensao sumiram do content.js'); process.exit(1); }

// DOM mínimo: só o que _botoesEnvio realmente usa (querySelectorAll, closest, innerText, type).
function el(tag, txt, opts = {}) {
  return {
    tagName: tag, type: opts.type || '', innerText: txt, value: '',
    _painel: !!opts.painel,
    getAttribute: k => (k === 'type' ? (opts.type || null) : (k === 'aria-label' ? (opts.aria || null) : null)),
    closest: sel => (opts.painel && /#snv-(copiloto|fab)/.test(sel)) ? { fake: true } : null,
  };
}

const PAGINA = [
  el('BUTTON', 'Retirar Candidatura'),
  el('BUTTON', 'Enviar'),
  el('BUTTON', 'Dismiss'),
];
const PAINEL = [                                   // o painel do copiloto, injetado na mesma página
  el('BUTTON', 'PDF Executivo', { painel: true }),
  el('BUTTON', '.docx (ATS)', { painel: true }),
  el('BUTTON', 'Carta de apresentação', { painel: true }),
  el('BUTTON', 'Já me candidatei', { painel: true }),
  el('BUTTON', 'Copiar para enviar ao Bruno', { painel: true }),
  el('BUTTON', '×', { painel: true }),
];

const sandbox = {
  console,
  document: { querySelectorAll: () => PAGINA.concat(PAINEL) },
  _visivel: () => true,
  _acharContainerCandidatura: () => null,           // é o caso real: container NÃO ENCONTRADO
};
vm.createContext(sandbox);
vm.runInContext([mRe[0], mDa[0], extrai('function _botoesEnvio(')].join('\n;\n'), sandbox);

const vistos = vm.runInContext('_botoesEnvio()', sandbox).map(b => b.txt);

console.log('=== varredura de botões: só a página, nunca o painel ===');
t('vê os botões reais da página', vistos.includes('Enviar') && vistos.includes('Retirar Candidatura'), vistos.join(' | '));
for (const b of ['PDF Executivo', '.docx (ATS)', 'Carta de apresentação', 'Já me candidatei', 'Copiar para enviar ao Bruno']) {
  t('NÃO vê o botão do próprio Senova: ' + b, !vistos.includes(b));
}
t('nenhum botão do painel sobrou', vistos.length === 3, vistos.join(' | '));

console.log('\n=== as outras varreduras já excluíam o painel — não podem regredir ===');
t('_scanPaginaCampos exclui #snv-copiloto', /_scanPaginaCampos[\s\S]{0,900}#snv-copiloto/.test(src));
t('o scanner de botões de ação exclui #snv-copiloto', /_ACAO_BTN[\s\S]{0,2000}#snv-copiloto/.test(src));
t('_daExtensao cobre painel E fab', /#snv-copiloto,#snv-fab/.test(mDa[0]), mDa[0]);

console.log('\n=== contadores do diagnóstico também não contam o painel ===');
for (const alvo of ['inputs = Array.from(document.querySelectorAll(_CAMPO_SEL)).filter(el => !_daExtensao(el))',
                    'querySelectorAll(\'input[type=file]\')).filter(el => !_daExtensao(el))']) {
  t('filtra: ' + alvo.slice(0, 46) + '…', src.includes(alvo));
}

// ── O painel não pode apagar a própria resposta ──────────────────────────────
// "Cliquei na carta e nada aconteceu" (Marcos, 23/jul/2026, emprego.com). O corpo do painel é
// re-renderizado a cada ~0,4s pelo observer, com um anti-pisca que só evita o re-render quando o
// HTML é IDÊNTICO. O bloco de diagnóstico — que aparece justamente quando o copiloto não lê nada,
// que é onde o botão da carta mais importa — trazia "há Nmin": o HTML mudava sozinho a cada
// minuto, o corpo era refeito e a resposta do botão ("Gerando carta…", "✓ Carta copiada", ou o
// motivo da falha) sumia. O clique parecia não ter feito nada.
console.log('\n=== o diagnóstico não muda sozinho com a passagem do tempo ===');
const mPasse = src.match(/passe: _ultimoPasse === undefined[\s\S]{0,260}?,\n/);
t('a linha do passe existe', !!mPasse);
if (mPasse) {
  const expr = mPasse[0].replace(/^\s*passe:\s*/, '').replace(/,\s*$/, '');
  const sb = { _ultimoPasse: { jobId: '4267', ts: new Date('2026-07-23T09:29:00').getTime() }, Date, console };
  vm.createContext(sb);
  const a = vm.runInContext('(' + expr + ')', sb);
  const b = vm.runInContext('(' + expr + ')', sb);   // "depois", com o relógio adiante
  t('o passe NÃO usa tempo relativo ("há Nmin")', !/\bhá\b/.test(expr), expr.slice(0, 80));
  t('mostra a hora do passe', /\d{2}:\d{2}/.test(a), a);
  t('o mesmo passe rende SEMPRE o mesmo texto (não força re-render)', a === b, a + ' vs ' + b);
}

console.log('\n=== ação em curso trava o re-render (senão a resposta do botão some) ===');
t('_atualizarCorpo respeita _ocupado', /if \(!corpo \|\| _preenchendo \|\| _ocupado\) return;/.test(src));
t('_ocupar/_soltar existem', /function _ocupar\(\)/.test(src) && /function _soltar\(ms\)/.test(src));
const carta = extrai('async function _gerarCarta(');
const cv = extrai('async function _baixarCV(');
t('a carta ocupa o painel e o solta no fim', /_ocupar\(\);/.test(carta) && /_soltar\(\);/.test(carta));
t('o CV ocupa o painel e o solta no fim', /_ocupar\(\);/.test(cv) && /_soltar\(\);/.test(cv));
t('a carta nunca termina calada: todo caminho escreve no botão',
  (carta.match(/btn\.textContent =/g) || []).length >= 3, (carta.match(/btn\.textContent =/g) || []).length + ' mensagens');

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `ESCOPO DA EXTENSÃO: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail ? 1 : 0);
