// GUARD — fora do LinkedIn, os 9 outros extratores da extensão (Gupy, Inhire, Indeed, Catho,
// Vagas.com, Greenhouse, Lever, Workable, genérico) sempre devolviam local:'' e não tinham campo
// nenhum de salário/modalidade/jornada — mesmo quando a própria página já publicava tudo isso em
// JSON-LD (Gupy, Greenhouse, Lever e Workable publicam JobPosting). Achado pelo senova-auditor,
// S47, item 5/7.
//
// A correção: _metaDaPagina() (mesma regra de _metaDoJsonLd em background.js e do parser em
// senova-worker.js — três leituras da mesma fonte, duplicadas por não haver bundler no repo) lê o
// JSON-LD ao vivo do DOM, e os 9 extratores + o próprio LinkedIn (agora JSON-LD-primeiro) passam a
// usá-la antes de qualquer regex solto.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei no content.js: ' + a); const ab = src.indexOf('{', i); let d = 0, j = ab; for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); }
let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

function scriptEl(txtContent) { return { textContent: txtContent }; }
function sandboxComScripts(...jsonLdObjs) {
  const sb = {
    console, JSON, Array, String, Object,
    document: { querySelectorAll: () => jsonLdObjs.map(o => scriptEl(typeof o === 'string' ? o : JSON.stringify(o))) },
  };
  vm.createContext(sb);
  vm.runInContext(extrai('function _metaDaPagina(') + ';', sb);
  return sb;
}

console.log('=== _metaDaPagina: extrai o que o JSON-LD já entrega, mesma regra do Worker/background ===');
{
  const sb = sandboxComScripts({
    '@type': 'JobPosting',
    jobLocation: { address: { addressLocality: 'Belo Horizonte', addressRegion: 'MG', addressCountry: 'BR' } },
    employmentType: 'FULL_TIME',
    baseSalary: { value: { minValue: 8000, maxValue: 12000, unitText: 'MONTH' }, currency: 'BRL' },
  });
  const r = vm.runInContext('_metaDaPagina()', sb);
  t('local monta cidade/região/país', r.local === 'Belo Horizonte, MG, BR', JSON.stringify(r));
  t('jornada mapeia FULL_TIME → Tempo integral', r.jornada === 'Tempo integral');
  t('modalidade Presencial quando há endereço real (sem TELECOMMUTE)', r.modalidade === 'Presencial');
  t('salário monta faixa em R$/mês', r.salario === 'R$ 8000 – R$ 12000/mês');
}

console.log('\n=== addressCountry sozinho NÃO é endereço real (mesmo achado do P5 no Worker/background) ===');
{
  const sb = sandboxComScripts({ '@type': 'JobPosting', jobLocation: { address: { addressCountry: 'BR' } }, jobLocationType: 'TELECOMMUTE' });
  const r = vm.runInContext('_metaDaPagina()', sb);
  t('sem locality/region/streetAddress não gera local', !r.local);
  t('TELECOMMUTE ainda é reconhecido como Remoto mesmo com addressCountry sozinho', r.modalidade === 'Remoto');
}

console.log('\n=== jobLocationType como array não escapa mais para "Presencial" ===');
{
  const sb = sandboxComScripts({
    '@type': 'JobPosting',
    jobLocation: { address: { addressLocality: 'São Paulo', addressRegion: 'SP' } },
    jobLocationType: ['TELECOMMUTE'],
  });
  const r = vm.runInContext('_metaDaPagina()', sb);
  t('array com TELECOMMUTE vence o endereço real e vira Remoto', r.modalidade === 'Remoto');
}

console.log('\n=== sem JSON-LD nenhum, ou sem os campos: devolve objeto vazio, nunca quebra ===');
{
  t('sem nenhum <script> ld+json', JSON.stringify(vm.runInContext('_metaDaPagina()', sandboxComScripts())) === '{}');
  t('JSON-LD de outro @type (ex.: Organization) não é lido como vaga',
    JSON.stringify(vm.runInContext('_metaDaPagina()', sandboxComScripts({ '@type': 'Organization', name: 'Acme' }))) === '{}');
  t('JSON-LD malformado não derruba a extensão',
    JSON.stringify(vm.runInContext('_metaDaPagina()', sandboxComScripts('{quebrado'))) === '{}');
}

console.log('\n=== os 9 extratores fora do LinkedIn chamam _metaDaPagina() e repassam os 4 campos ===');
for (const [nome, assinatura] of [
  ['extractGupy', 'function extractGupy('],
  ['extractInhire', 'function extractInhire('],
  ['extractIndeed', 'function extractIndeed('],
  ['extractCatho', 'function extractCatho('],
  ['extractVagas', 'function extractVagas('],
  ['extractGreenhouse', 'function extractGreenhouse('],
  ['extractLever', 'function extractLever('],
  ['extractWorkable', 'function extractWorkable('],
]) {
  const corpo = extrai(assinatura);
  t(nome + ' chama _metaDaPagina()', /const jl = _metaDaPagina\(\);/.test(corpo));
  t(nome + ' repassa local vindo do JSON-LD (não mais local:\'\' fixo)', /local:\s*jl\.local\s*\|\|\s*''/.test(corpo));
  t(nome + ' ganhou salario/modalidade/jornada (antes não existiam)',
    /salario:\s*jl\.salario\s*\|\|\s*''/.test(corpo) && /modalidade:\s*jl\.modalidade\s*\|\|\s*''/.test(corpo) && /jornada:\s*jl\.jornada\s*\|\|\s*''/.test(corpo));
}

console.log('\n=== extractGenerico: mesma coisa, só no ramo de vaga (o ramo "sinal" não tem esses campos) ===');
{
  const corpo = extrai('function extractGenerico(');
  t('chama _metaDaPagina()', /const jl = _metaDaPagina\(\);/.test(corpo));
  t('ramo de vaga repassa local/salario/modalidade/jornada',
    /local:\s*jl\.local\s*\|\|\s*''/.test(corpo) && /salario:\s*jl\.salario\s*\|\|\s*''/.test(corpo) &&
    /modalidade:\s*jl\.modalidade\s*\|\|\s*''/.test(corpo) && /jornada:\s*jl\.jornada\s*\|\|\s*''/.test(corpo));
  t('ramo de sinal (página que não é vaga) não foi mexido', /tipo:\s*'sinal'/.test(corpo));
}

console.log('\n=== extractLinkedIn: JSON-LD passa a vir ANTES do regex solto no bodyText, não depois ===');
{
  const corpo = extrai('function extractLinkedIn(');
  t('chama _metaDaPagina() (variável _jl)', /const _jl = _metaDaPagina\(\);/.test(corpo));
  t('local prioriza _jl.local sobre os seletores DOM', /let local = _jl\.local \|\|/.test(corpo));
  t('salario/modalidade/jornada partem de _jl antes do scan de pills/bodyText',
    /let salario = _jl\.salario \|\| '';/.test(corpo) && /let modalidade = _jl\.modalidade \|\| '';/.test(corpo) && /let jornada = _jl\.jornada \|\| '';/.test(corpo));
}

console.log(`\n──────────────────────────────\nEXTRATORES CAPTURAM META VIA JSON-LD (fora do LinkedIn também): ${ok}/${ok + fail} ${fail ? '✗' : '✓'}`);
if (fail) process.exit(1);
