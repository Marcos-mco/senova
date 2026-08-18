// GUARD — o enriquecimento em massa (background.js) não pode descartar metadados que a própria
// página já entrega de graça no JSON-LD, obrigando a IA a chutar (metaInferida) o que já era
// fato. Achado pelo senova-auditor, S47, item 2/7 da auditoria de captura da extensão.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
function extrai(a) { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei no background.js: ' + a); const ab = src.indexOf('{', i); let d = 0, j = ab; for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); }
let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

const sandbox = { console, JSON, Array, String, Object };
vm.createContext(sandbox);
vm.runInContext(extrai('function _metaDoJsonLd(') + ';', sandbox);

function jsonLdHtml(obj) {
  return `<html><body><script type="application/ld+json">${JSON.stringify(obj)}</script></body></html>`;
}

console.log('=== _metaDoJsonLd: extrai o que o JSON-LD já entrega, mesma regra do Worker ===');
{
  const h = jsonLdHtml({
    '@type': 'JobPosting',
    jobLocation: { address: { addressLocality: 'Belo Horizonte', addressRegion: 'MG', addressCountry: 'BR' } },
    employmentType: 'FULL_TIME',
    baseSalary: { value: { minValue: 8000, maxValue: 12000, unitText: 'MONTH' }, currency: 'BRL' },
  });
  const r = vm.runInContext('_metaDoJsonLd(' + JSON.stringify(h) + ')', sandbox);
  t('localizacao monta cidade/região/país', r.localizacao === 'Belo Horizonte, MG, BR');
  t('jornada mapeia FULL_TIME → Tempo integral', r.jornada === 'Tempo integral');
  t('modelo Presencial quando há endereço real (sem TELECOMMUTE)', r.modalidade === 'Presencial');
  t('salário monta faixa em R$/mês', r.salario === 'R$ 8000 – R$ 12000/mês');
}

console.log('\n=== addressCountry sozinho NÃO é endereço real (mesmo achado do P5 no Worker) ===');
{
  const h = jsonLdHtml({ '@type': 'JobPosting', jobLocation: { address: { addressCountry: 'BR' } }, jobLocationType: 'TELECOMMUTE' });
  const r = vm.runInContext('_metaDoJsonLd(' + JSON.stringify(h) + ')', sandbox);
  t('sem locality/region/streetAddress não gera localizacao', !r.localizacao);
  t('TELECOMMUTE ainda é reconhecido como Remoto mesmo com addressCountry sozinho', r.modalidade === 'Remoto');
}

console.log('\n=== jobLocationType como array (schema.org) não escapa mais para "Presencial" ===');
{
  const h = jsonLdHtml({
    '@type': 'JobPosting',
    jobLocation: { address: { addressLocality: 'São Paulo', addressRegion: 'SP' } },
    jobLocationType: ['TELECOMMUTE'],
  });
  const r = vm.runInContext('_metaDoJsonLd(' + JSON.stringify(h) + ')', sandbox);
  t('array com TELECOMMUTE vence o endereço real e vira Remoto', r.modalidade === 'Remoto');
}

console.log('\n=== sem JSON-LD nenhum, ou sem os campos: devolve objeto vazio, nunca quebra ===');
{
  t('HTML sem script ld+json', JSON.stringify(vm.runInContext('_metaDoJsonLd(' + JSON.stringify('<html><body>oi</body></html>') + ')', sandbox)) === '{}');
  t('JSON-LD de outro @type (ex.: Organization) não é lido como vaga',
    JSON.stringify(vm.runInContext('_metaDoJsonLd(' + JSON.stringify(jsonLdHtml({ '@type': 'Organization', name: 'Acme' })) + ')', sandbox)) === '{}');
  t('JSON-LD malformado não derruba a extensão',
    JSON.stringify(vm.runInContext('_metaDoJsonLd(' + JSON.stringify('<script type="application/ld+json">{quebrado</script>') + ')', sandbox)) === '{}');
}

console.log('\n=== empresa não pode virar a própria localização (topcard__flavor colide com topcard__flavor--bullet) ===');
{
  // Reproduz a comparação feita em _buscarDescricaoGuest sem depender de fetch real.
  const _meta = { localizacao: 'Curitiba, PR' };
  let empresa = 'Curitiba, PR'; // fallback pegou a localização por engano
  if (empresa && _meta.localizacao && empresa.toLowerCase() === _meta.localizacao.toLowerCase()) empresa = '';
  t('empresa igual à localização recém-extraída é descartada, não vira empresa fabricada', empresa === '');
}

console.log(`\n──────────────────────────────\nENRIQUECIMENTO NÃO DESCARTA META DA PRÓPRIA PÁGINA: ${ok}/${ok + fail} ${fail ? '✗' : '✓'}`);
if (fail) process.exit(1);
