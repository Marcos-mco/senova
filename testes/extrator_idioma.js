// O detector genérico da extensão tem de reconhecer vaga nas línguas que o radar varre.
//
// 22/jul/2026: numa vaga real de espanha (adzuna.es — "Jefe de Ventas Nacional", Mur&Partners),
// a extensão mostrou "Sinal de mercado" em vez do copiloto de candidatura. Causa: as duas regex
// do extractGenerico só tinham vocabulário PT/EN. ES e DE são frentes ativas do radar — duas
// geografias inteiras não candidatavam.
//
// Este teste lê as regex do content.js real (não uma cópia) e as roda contra casos concretos.
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');

function regexDoFonte(nome) {
  const m = src.match(new RegExp('const\\s+' + nome + '\\s*=\\s*(/.*/[a-z]*)\\s*;'));
  if (!m) { console.log('  FAIL  ' + nome + ' não existe mais no content.js'); process.exit(1); }
  return eval(m[1]);
}
const RX_URL_VAGA = regexDoFonte('RX_URL_VAGA');
const RX_TITULO_VAGA = regexDoFonte('RX_TITULO_VAGA');

// Réplica fiel da decisão do extractGenerico: vaga se casar a URL OU o título.
const ehVaga = (url, titulo) => RX_URL_VAGA.test(url) || RX_TITULO_VAGA.test(titulo || '');

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

console.log('=== O caso que quebrou (espanha, adzuna) ===');
t('adzuna.es · "Jefe de Ventas Nacional Empleos en España" é VAGA',
  ehVaga('https://www.adzuna.es/details/5804097773?utm_medium=api&utm_source=65c2a129',
         'Jefe de Ventas Nacional Empleos en España'),
  'voltou a cair como sinal de mercado');

console.log('\n=== Espanha ===');
t('"Director Comercial | Ofertas de empleo"', ehVaga('https://ex.es/x/1', 'Director Comercial | Ofertas de empleo'));
t('"Responsable de Marketing - Vacante en Madrid"', ehVaga('https://ex.es/x/2', 'Responsable de Marketing - Vacante en Madrid'));
t('url com /empleo/', ehVaga('https://empresa.es/empleo/1234', 'Únete a nosotros'));
t('url com /ofertas-de-trabajo/', ehVaga('https://portal.es/ofertas-de-trabajo/abc', 'Detalle'));
t('"Puesto de Jefa de Ventas"', ehVaga('https://ex.es/x/3', 'Puesto de Jefa de Ventas'));

console.log('\n=== Alemanha ===');
t('"Vertriebsleiter (m/w/d) - Stellenangebot"', ehVaga('https://ex.de/x/1', 'Vertriebsleiter (m/w/d) - Stellenangebot'));
t('"Leiter Vertrieb"', ehVaga('https://ex.de/x/2', 'Leiter Vertrieb'));
t('"Geschäftsführer gesucht"', ehVaga('https://ex.de/x/3', 'Geschäftsführer gesucht'));
t('url com /karriere/', ehVaga('https://firma.de/karriere/12', 'Willkommen'));
t('url com /stellenangebote/', ehVaga('https://firma.de/stellenangebote/12', 'Willkommen'));

console.log('\n=== Português e inglês seguem valendo (não regredir) ===');
t('"Head de Vendas | Vagas"', ehVaga('https://ex.com.br/x', 'Head de Vendas | Vagas'));
t('url /vagas/', ehVaga('https://emprego.com/pt-BR/vagas/head-de-vendas-curitiba-cd7', 'Detalhe'));
t('"Sales Director job at Acme"', ehVaga('https://ex.com/x', 'Sales Director job at Acme'));
t('url /careers/', ehVaga('https://acme.com/careers/42', 'Acme'));

console.log('\n=== Sinal continua sinal (o detector não pode virar sim-senhor) ===');
t('notícia de mercado NÃO é vaga',
  !ehVaga('https://valor.globo.com/financas/noticia/2026/07/20/banco-x.ghtml', 'Banco X anuncia resultado do trimestre'));
t('página de produto NÃO é vaga',
  !ehVaga('https://loja.es/producto/zapatos-negros', 'Zapatos negros - Envío gratis'));
t('post de LinkedIn NÃO é vaga',
  !ehVaga('https://www.linkedin.com/feed/update/urn:li:activity:7123', 'Publicação de Fulano'));

console.log('\n=== Entidades HTML não vazam para o card (Mur&amp;Partners) ===');
t('_decodeEntidades existe no content.js', /function _decodeEntidades\(/.test(src),
  'sem ele, "&amp;" chega ao prompt e ao CV do recrutador');
t('as metas passam pelo decodificador', /const metaTitle = meta\('og:title'\)/.test(src));

console.log('\n──────────────────────────────');
console.log('DETECTOR DE VAGA (PT/EN/ES/DE): ' + ok + '/' + (ok + fail) + (fail ? ' ✗' : ' ✓'));
process.exit(fail ? 1 : 0);
