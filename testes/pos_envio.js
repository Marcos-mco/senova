// ESTAÇÃO DE REGISTRO PÓS-ENVIO — o copiloto reconhece a página de candidatura JÁ ENVIADA.
//
// 23/jul/2026, emprego.com/applications/<uuid>: Marcos tinha ENVIADO a candidatura (a página
// dizia "Candidatura em 23/07, 09:37" e oferecia "Retirar Candidatura"), mas o card no Senova
// seguia em Oportunidade. O funil registra menos candidaturas do que houve — é a estação de
// Registro furada, não um detalhe do emprego.com.
//
// O sinal é GENÉRICO: uma página que oferece RETIRAR/CANCELAR a candidatura só existe DEPOIS do
// envio. Nada de código por portal. Este teste prova o detector (PT/EN/ES/DE), a proteção contra
// falso-positivo ("Cancelar" de modal), e a fiação do painel (propõe registrar, sobe ao topo,
// reusa o registro já testado).
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei no content.js: ' + a); const ab = src.indexOf('{', i); let d = 0, j = ab; for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); }

const mRe = src.match(/const _RE_JA_ENVIADA = \/.*\/i;/);
const mDa = src.match(/const _daExtensao = .*;/);
let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };
if (!mRe || !mDa) { console.log('  FAIL  _RE_JA_ENVIADA / _daExtensao sumiram do content.js'); process.exit(1); }

console.log('=== o regex reconhece "retirar candidatura" em 4 idiomas ===');
const RE = eval(mRe[0].replace('const _RE_JA_ENVIADA = ', '').replace(/;$/, ''));
for (const [txt, deve] of [
  ['Retirar Candidatura', true],
  ['Cancelar candidatura', true],
  ['Retirar postulación', true],
  ['Withdraw application', true],
  ['Withdraw', true],
  ['Bewerbung zurückziehen', true],
  ['Excluir candidatura', true],
  ['Cancelar', false],                 // fechar um modal — NÃO é retirar candidatura
  ['Enviar candidatura', false],       // é o botão de ENVIAR, não de retirar
  ['Cancelar assinatura da newsletter', false],
  ['Candidatar-se', false],
]) {
  t(`"${txt}" → ${deve ? 'pós-envio' : 'não'}`, RE.test(txt) === deve, 'deu ' + RE.test(txt));
}

console.log('\n=== _pareceJaEnviada varre o DOM e ignora o próprio painel ===');
function el(txt, opts = {}) {
  return {
    tagName: opts.tag || 'BUTTON', type: opts.type || '', innerText: txt, value: '',
    getAttribute: k => (k === 'aria-label' ? (opts.aria || null) : (k === 'type' ? (opts.type || null) : null)),
    closest: sel => (opts.painel && /#snv-(copiloto|fab)/.test(sel)) ? { fake: true } : null,
  };
}
function montaSandbox(els, visiveis = () => true) {
  const sb = {
    console,
    document: { querySelectorAll: () => els },
    _visivel: visiveis,
  };
  vm.createContext(sb);
  vm.runInContext([mRe[0], mDa[0], extrai('function _pareceJaEnviada(')].join('\n;\n'), sb);
  return sb;
}

t('página com "Retirar Candidatura" visível → sim',
  vm.runInContext('_pareceJaEnviada()', montaSandbox([el('Enviar'), el('Retirar Candidatura')])) === true);
t('página só com "Enviar"/"Voltar" → não',
  vm.runInContext('_pareceJaEnviada()', montaSandbox([el('Enviar'), el('Voltar para Candidaturas')])) === false);
t('o botão de retirar é do PRÓPRIO painel → ignora (não conta)',
  vm.runInContext('_pareceJaEnviada()', montaSandbox([el('Retirar Candidatura', { painel: true })])) === false);
t('botão de retirar OCULTO não conta (só o que o usuário vê)',
  vm.runInContext('_pareceJaEnviada()', montaSandbox([el('Retirar Candidatura')], () => false)) === false);
t('reconhece por aria-label também',
  vm.runInContext('_pareceJaEnviada()', montaSandbox([el('', { aria: 'Withdraw application' })])) === true);
t('link <a> "Retirar postulación" também dispara',
  vm.runInContext('_pareceJaEnviada()', montaSandbox([el('Retirar postulación', { tag: 'A' })])) === true);

console.log('\n=== fiação do painel: reconhece e PROPÕE registrar (não botão passivo) ===');
t('computa _jaEnviada a partir do detector', /const _jaEnviada = \(\(\) => \{ try \{ return _pareceJaEnviada\(\)/.test(src));
t('só propõe registro com card em aberto (status ≠ aplicado)',
  /_proporRegistro = _jaEnviada && _temRefVaga\(\) && an && an\.status && an\.status !== 'aplicado'/.test(src));
t('o prompt diz que a vaga já foi enviada aqui', /Você já enviou esta candidatura aqui\./.test(src));
t('e que no Senova ainda está em Oportunidade', /ainda está em <b>Oportunidade<\/b>/.test(src));
t('o botão é afirmativo "Registrar como CV Enviado"', /id="snv-cop-candidatei"[^>]*>Registrar como CV Enviado</.test(src));
t('reusa o registro já testado (mesmo id → _marcarCandidatei)', /const bc = document\.getElementById\('snv-cop-candidatei'\);\s*\n\s*if \(bc\) bc\.addEventListener\('click', _marcarCandidatei\)/.test(src));

console.log('\n=== na página pós-envio, registrar é a ação PRINCIPAL (vai ao topo) ===');
// 07/ago/2026: entraram dois estados novos que também são a ação principal da tela — o registro
// EM CURSO e o registro RECUSADO (ver testes/registro_desfecho.js). O que esta asserção guarda é
// o intento (pós-envio e já-registrado sobem ao topo), não a literalidade da linha.
t('define _regNoTopo por pós-envio ou já registrado', /const _regNoTopo = _proporRegistro \|\| _candidatado\b/.test(src));
t('o registro em curso e o recusado também são ação principal', /const _regNoTopo = .*_registrando.*_falhaAtiva/.test(src));
t('quando no topo, btnCand vem ANTES do preencher/CV', /\$\{_regNoTopo \? btnCandHTML : ''\}\s*\n\s*\$\{btnHTML\}/.test(src));
t('e não se repete embaixo', /\$\{_regNoTopo \? '' : btnCandHTML\}/.test(src));

console.log('\n=== o rótulo "origem" deixou de mentir (refletia !jobId, agora reflete o card) ===');
t('origem usa an.status (o card casou), não an.jobId', /const origem = an\.status/.test(src));
t('card externo por url/empresa é rotulado como card, não "sem-card"', /'card-externo \(por url\/empresa\)'/.test(src));

console.log('\n=== o diagnóstico expõe o sinal pós-envio (instrumentar antes de adivinhar) ===');
t('diag tem o campo jaEnviada', /jaEnviada: \(\(\) => \{ try \{ return _pareceJaEnviada\(\)/.test(src));
t('e o formatador imprime a linha', /'já enviada \(pós-envio\): ' \+ d\.jaEnviada/.test(src));

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `REGISTRO PÓS-ENVIO: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail ? 1 : 0);
