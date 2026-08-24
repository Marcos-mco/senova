// GUARD — a descrição completa da vaga não pode depender de um único caminho de captura.
//
// Por que este teste existe. 24/ago/2026 (S52), bug relatado por Marcos: "a candidatura por
// email do card parou de funcionar" e "também parou de trazer a descrição completa da vaga".
// Os dois sintomas têm UMA raiz. Medição própria, 6 buscas (3 vagas ativas do LinkedIn,
// página pública E endpoint guest): HTTP 200, ~300 KB, e **zero** blocos
// `application/ld+json`. O portal removeu o JSON-LD — que era o único passo de
// /api/fetch-descricao capaz de devolver descrição COMPLETA.
//
// A cascata que isso provocava, medida byte a byte sobre o HTML real:
//   passo 1 (JSON-LD)  → não acha nada
//   passo 2/3 (og/meta) → "…veja esta vaga e outras semelhantes" → rejeitado por _isEmailTeaser
//   passo 4 (texto geral) → 13.302 chars com "cookie" E "privacidade" → _isPrivacyGarbage
//   → HTTP 422 'Conteúdo insuficiente'
// E na tela: card sem descrição → sem análise (o piso é 120/400 chars) → sem
// `candidatura_direta_destino` → o pill deixa de ser "Enviar candidatura por e-mail" e vira
// "Resposta por e-mail". Para quem usa, o botão sumiu. Nada foi publicado naquele dia — e
// nada precisava ser: a captura dependia de um contrato de terceiro que ninguém controla.
//
// O que este arquivo trava, portanto, não é "o LinkedIn": é a REGRA. Existe um passo que lê o
// bloco da descrição do próprio HTML, ele vem ANTES dos fallbacks parciais, ele balanceia a
// tag (parar no primeiro </div> truncaria no primeiro sub-bloco), e as guardas de lixo valem
// para ele também. A tabela de contêineres é adaptador — tentada em ordem para QUALQUER
// página, sem nenhuma linha perguntando de que portal se trata (crivo de universalidade).
//
// O HTML aqui é SINTÉTICO, reproduzindo a forma medida (sem JSON-LD, com divs aninhadas,
// com o aviso de cookie fora do bloco da vaga). Página real de terceiro não entra no repo —
// ver [[project_dados_terceiros_historico_git]].
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// Recorta a rota inteira para provar que as asserções são sobre ELA, não sobre o arquivo.
const iRota = worker.indexOf("if (path === '/api/fetch-descricao' && request.method === 'POST')");
const iFim = worker.indexOf("if (path === '/api/contacts'", iRota);
const rota = iRota === -1 ? '' : worker.slice(iRota, iFim);

console.log('=== o passo novo existe, e existe NO LUGAR CERTO da cascata ===');
t('a rota /api/fetch-descricao foi encontrada', rota.length > 0);
t('a tabela de contêineres de descrição existe', /const CONTEINERES_DESCRICAO = \[/.test(rota));
t('o recorte balanceia a tag (não para no primeiro fechamento)',
  /const _recortarConteiner = /.test(rota) && /nivel \+= m\[0\]\[1\] === '\/' \? -1 : 1;/.test(rota));
t('o passo vem DEPOIS do JSON-LD — quando ele funciona, nada muda',
  rota.indexOf('application/ld+json') < rota.indexOf('CONTEINERES_DESCRICAO'));
t('e vem ANTES dos fallbacks parciais — descrição completa nunca perde para um teaser',
  rota.indexOf('CONTEINERES_DESCRICAO') < rota.indexOf("og:description"));
t('o resultado do passo novo NÃO é marcado como parcial (é a descrição inteira)',
  /return json\(\{ descricao: clean\.slice\(0, 5000\) \}\);/.test(rota));

console.log('\n=== a tabela é adaptador, não decisão: ninguém pergunta de que portal se trata ===');
const iTab = rota.indexOf('const CONTEINERES_DESCRICAO');
const bloco = rota.slice(iTab, rota.indexOf("// 2. og:description", iTab));
t('nenhuma condição dentro do passo compara o nome de um portal',
  !/(?:if\s*\(|\?|===|!==|\.includes\s*\(|\.startsWith\s*\()[^\n]{0,90}?['"`][^'"`\n]*(?:linkedin|indeed|gupy|catho|infojobs)[^'"`\n]*['"`]/i.test(bloco));
t('a lista inteira é percorrida para qualquer página (for…of, sem ramo por portal)',
  /for \(const marcador of CONTEINERES_DESCRICAO\)/.test(bloco));
t('um portal novo entra acrescentando UMA linha na tabela (5 contêineres hoje)',
  (bloco.slice(0, bloco.indexOf('];')).match(/^\s+'[^']+',/gm) || []).length >= 5);

console.log('\n=== as guardas de lixo valem para o passo novo também ===');
t('teaser de e-mail e aviso de cookie são rejeitados aqui, não só nos passos parciais',
  /if \(clean\.length > 300 && !_isEmailTeaser\(clean\) && !_isPrivacyGarbage\(clean\)\)/.test(bloco));
t('as duas guardas são DEFINIDAS antes de o passo novo usá-las',
  rota.indexOf('const _isEmailTeaser') < iTab && rota.indexOf('const _isPrivacyGarbage') < iTab);

console.log('\n=== o portal barrando por volume (429) se declara, em vez de virar "faça login" ===');
t('resposta não-ok carrega o status e diz quando é bloqueio do portal',
  /portalBloqueou: pageRes\.status === 429 \|\| pageRes\.status === 403/.test(rota) &&
  /http: pageRes\.status/.test(rota));

// ─────────────────────────────────────────────────────────────────────────────
// COMPORTAMENTO: roda o código REAL do passo contra HTML sintético.
console.log('\n=== comportamento: o código real, contra a forma de página medida ===');

function rodar(html) {
  const sandbox = { html, JSON, RegExp, String, console, resultado: null };
  sandbox.json = (obj) => { sandbox.resultado = obj; throw { _saiu: true }; };
  vm.createContext(sandbox);
  // As duas guardas + o passo novo, tal como estão escritos no Worker.
  const iG = rota.indexOf('const _isEmailTeaser');
  const fonte = rota.slice(iG, rota.indexOf('// 2. og:description'));
  try { vm.runInContext(`(function(){ ${fonte} })()`, sandbox); } catch (e) { if (!e._saiu) throw e; }
  return sandbox.resultado;
}

const AVISO_COOKIE = 'A empresa respeita a sua privacidade. Usamos cookies essenciais e cookie de análise. Política de privacidade. '.repeat(20);
const CORPO = 'Responsável por liderar a operação comercial da região, com meta anual e time próprio. '.repeat(6);

const paginaSemJsonLd = `<html><head>
  <meta property="og:description" content="Veja esta vaga e outras semelhantes no LinkedIn hoje mesmo, candidate-se agora."/>
</head><body>
  <nav>${AVISO_COOKIE}</nav>
  <section class="core-section">
    <div class="show-more-less-html__markup relative">
      <p>Descrição da vaga</p>
      <div class="sub"><ul><li>${CORPO}</li><li>Inglês avançado desejável.</li></ul></div>
      <p>Benefícios: plano de saúde e vale-refeição.</p>
    </div>
  </section>
  <footer>${AVISO_COOKIE}</footer>
</body></html>`;

{
  const r = rodar(paginaSemJsonLd);
  t('página SEM JSON-LD volta a entregar descrição (era 422 "Conteúdo insuficiente")',
    !!(r && r.descricao), JSON.stringify(r));
  t('a descrição é a completa, não o teaser do og:description',
    !!(r && r.descricao && r.descricao.includes('liderar a operação comercial')));
  t('o bloco é lido INTEIRO: a div aninhada não trunca o texto no meio',
    !!(r && r.descricao && r.descricao.includes('Inglês avançado') && r.descricao.includes('Benefícios')),
    r && r.descricao ? r.descricao.slice(-90) : '');
  t('o aviso de cookie do rodapé/menu não entra junto',
    !!(r && r.descricao && !/respeita a sua privacidade/.test(r.descricao)));
  t('a lista vira marcador legível, não uma parede de texto',
    !!(r && r.descricao && r.descricao.includes('•')));
}

{
  // Um contêiner que só contém o aviso de cookie não vale mais que nenhum: tem de cair
  // para os passos seguintes, nunca devolver lixo como se fosse a vaga.
  const soLixo = `<html><body><div class="show-more-less-html__markup">${AVISO_COOKIE}</div></body></html>`;
  const r = rodar(soLixo);
  t('contêiner contendo só aviso de cookie é recusado (cai para os passos seguintes)', r === null);
}

{
  // Contêiner presente porém curto: 300 chars é o piso: abaixo dele não é descrição de vaga,
  // é rótulo de seção — e devolver isso alimentaria uma análise cega.
  const curto = `<html><body><div class="show-more-less-html__markup">Descrição da vaga.</div></body></html>`;
  t('contêiner curto demais não é aceito como descrição', rodar(curto) === null);
}

{
  // Tag que nunca fecha (HTML quebrado): não pode devolver o resto da página inteira.
  const quebrado = `<html><body><div class="show-more-less-html__markup">${CORPO}<footer>${AVISO_COOKIE}`;
  const r = rodar(quebrado);
  t('HTML com tag não fechada não vira "descrição" com a página inteira dentro', r === null);
}

{
  // Página de outro portal, com contêiner genérico: a mesma tabela atende, sem ramo novo.
  const outroPortal = `<html><body><div class="job-description"><p>${CORPO}</p></div></body></html>`;
  const r = rodar(outroPortal);
  t('portal que usa contêiner genérico é atendido pela MESMA tabela, sem código dedicado',
    !!(r && r.descricao && r.descricao.includes('liderar a operação comercial')));
}

fim('descricao_sem_jsonld');
