// O ANÚNCIO AINDA EXISTE? — a verificação de link na hora do uso.
//
// 27/jul/2026: Marcos preparou o CV de uma vaga e, ao abrir o link, leu "infelizmente essa vaga
// não está mais disponível". Medido no mesmo dia: dos 444 links do radar, 86 estavam mortos (todos
// da Adzuna) e 24 apenas BLOQUEADOS. Daí as duas regras que este teste protege:
//
//   1. A Adzuna responde HTTP 200 com a página dizendo que encerrou — checar só o status não basta.
//   2. 403/429/timeout NÃO é prova de morte. Onde não há prova, a resposta é "não sei".
//
// A segunda é a que impede o Senova de mentir com confiança — e foi ela que evitou apagar 24 leads.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
function extrai(assinatura) {
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const ab = src.indexOf('{', i), fim = src.indexOf('[', i);
  const abre = (fim >= 0 && fim < ab) ? '[' : '{', fecha = abre === '[' ? ']' : '}';
  let d = 0, j = (abre === '[' ? fim : ab);
  for (; j < src.length; j++) { const c = src[j]; if (c === abre) d++; else if (c === fecha) { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}

// Função de primeiro nível cuja ASSINATURA já tem chave (`opcoes = {}`): balancear a partir
// da primeira '{' fecharia no parâmetro padrão e devolveria um fragmento truncado. Aqui o fim é
// a primeira '}' na coluna zero — mesma técnica de testes/saida_externa.js.
function extraiTopo(assinatura) {
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const f = src.indexOf('\n}\n', i);
  if (f < 0) throw new Error('função sem fim na coluna zero: ' + assinatura);
  return src.slice(i, f + 2);
}

let ok = 0, falhou = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  PASS  ' + nome); }
  else { falhou++; console.log('  FAIL  ' + nome + (extra ? ' → ' + extra : '')); }
};

// Sandbox com um fetch de mentira: cada teste diz o que o portal responde.
// _respostaPorUrl permite respostas DIFERENTES por URL (necessário pro LinkedIn: jobs-guest e
// a página original são dois fetches distintos) — o padrão devolve sempre _resposta, como antes.
let _resposta = null, _urlPedida = '', _headersPedidos = null, _urlsPedidas = [];
let _respostaPorUrl = (u) => _resposta;
const sandbox = {
  console, URL,   // o vm isola os globais; sem isto todo endereço vira "url_invalida"
  setTimeout: () => 0, clearTimeout() {},
  AbortController: function () { this.signal = {}; this.abort = () => {}; },
  fetch: async (u, init) => {
    _urlPedida = u; _headersPedidos = init && init.headers; _urlsPedidas.push(u);
    const resp = _respostaPorUrl(u);
    if (resp instanceof Error) throw resp;
    return {
      status: resp.status,
      ok: resp.status >= 200 && resp.status < 300,
      text: async () => resp.html || '',
      url: resp.url || u,
      // v7.61: com `redirect:'manual'` no ponto único, quem decide se houve salto é o header
      // Location — não mais o `url` final que o fetch devolvia depois de seguir sozinho.
      headers: { get: (k) => (resp.headers || {})[String(k).toLowerCase()] ?? null },
    };
  },
};
vm.createContext(sandbox);
// Linha inteira, para constantes que não têm bloco balanceável (`new Set([...])` engana o
// extrator: ele fecha no ']' e deixa o ');' de fora).
function linhaConst(nome) {
  const m = src.match(new RegExp('^const ' + nome + ' = .*$', 'm'));
  if (!m) throw new Error('não achei a constante: ' + nome);
  return m[0];
}
vm.runInContext([
  extrai('const SINAIS_DE_ENCERRAMENTO ='),
  linhaConst('_PORTAS_EXTERNAS_OK'),
  linhaConst('MAX_SALTOS_EXTERNO'),
  linhaConst('TETO_CORPO_EXTERNO'),
  extrai('function _hostProibido('),
  extrai('function _alvoExternoOk('),
  extraiTopo('async function fetchExterno('),
  extrai('function _ehRecusaDePortal('),
  extrai('async function _verificarLinkedInGuest('),
  extrai('async function verificarLinkVaga('),
].join('\n;\n'), sandbox);

const checar = (url) => vm.runInContext('verificarLinkVaga(' + JSON.stringify(url) + ')', sandbox);
const VAGA_VIVA = '<html><body><h1>Head de Vendas</h1><p>Responsável pela equipe comercial. Envie seu currículo.</p></body></html>';
const URL_ADZUNA = 'https://www.adzuna.com.br/details/5199?utm_medium=api&utm_source=65c2a129';

(async () => {

  console.log('=== o caso real: HTTP 200 e a página diz que encerrou ===');
  _resposta = { status: 200, html: '<html><body><div class="alert">Infelizmente essa vaga não está mais disponível</div></body></html>' };
  let r = await checar(URL_ADZUNA);
  t('200 + texto de encerramento = MORTO (status sozinho não bastaria)', r.estado === 'morto', JSON.stringify(r));
  t('devolve a prova junto (o trecho da própria página)', /não está mais disponível/i.test(r.trecho || ''), JSON.stringify(r));

  console.log('\n=== a URL vai INTEIRA — o utm_source da Adzuna é a nossa credencial ===');
  t('não mutila a query (mutilar devolve 403 e mataria vaga viva)', _urlPedida === URL_ADZUNA, _urlPedida);
  t('vai com user-agent de browser', /Mozilla/.test((_headersPedidos || {})['User-Agent'] || ''), JSON.stringify(_headersPedidos));

  console.log('\n=== página que sumiu ===');
  _resposta = { status: 404, html: '' };
  t('404 = morto', (await checar(URL_ADZUNA)).estado === 'morto');
  _resposta = { status: 410, html: '' };
  t('410 = morto', (await checar(URL_ADZUNA)).estado === 'morto');

  console.log('\n=== A REGRA QUE PROTEGE: bloqueio não é morte ===');
  _resposta = { status: 403, html: '' };
  r = await checar(URL_ADZUNA);
  t('403 = INCONCLUSIVO (nunca morto)', r.estado === 'inconclusivo', JSON.stringify(r));
  t('e diz que foi bloqueio', r.motivo === 'portal_bloqueou', JSON.stringify(r));
  _resposta = { status: 429, html: '' };
  t('429 = inconclusivo', (await checar(URL_ADZUNA)).estado === 'inconclusivo');
  _resposta = { status: 503, html: '' };
  t('5xx = inconclusivo (portal fora do ar não é vaga encerrada)', (await checar(URL_ADZUNA)).estado === 'inconclusivo');
  _resposta = new Error('network');
  t('erro de rede = inconclusivo', (await checar(URL_ADZUNA)).estado === 'inconclusivo');
  const abort = new Error('abort'); abort.name = 'AbortError';
  _resposta = abort;
  r = await checar(URL_ADZUNA);
  t('timeout = inconclusivo', r.estado === 'inconclusivo' && r.motivo === 'demorou_demais', JSON.stringify(r));

  console.log('\n=== vaga viva continua viva (o detector não pode virar carrasco) ===');
  _resposta = { status: 200, html: VAGA_VIVA };
  t('página normal de vaga = vivo', (await checar(URL_ADZUNA)).estado === 'vivo');
  _resposta = { status: 200, html: '<html><body>Vaga aberta. As inscrições expiram em 30/08.</body></html>' };
  t('"expiram em 30/08" não é encerramento (frase fraca não mata)', (await checar(URL_ADZUNA)).estado === 'vivo');
  _resposta = { status: 200, html: '<html><script>var msg="no longer available";</script><body>Head de Vendas — candidate-se</body></html>' };
  t('sinal dentro de <script> não conta (só o que a pessoa lê)', (await checar(URL_ADZUNA)).estado === 'vivo');

  console.log('\n=== os outros idiomas do radar (ES/EN/DE) ===');
  _resposta = { status: 200, html: '<html><body>Esta oferta ya no está disponible</body></html>' };
  t('ES: "ya no está disponible" = morto', (await checar('https://www.adzuna.es/details/1')).estado === 'morto');
  _resposta = { status: 200, html: '<html><body>This job is no longer available</body></html>' };
  t('EN: "no longer available" = morto', (await checar('https://jobicy.com/jobs/1')).estado === 'morto');
  _resposta = { status: 200, html: '<html><body>Diese Stelle ist nicht mehr verfügbar</body></html>' };
  t('DE: "nicht mehr verfügbar" = morto', (await checar('https://www.adzuna.de/details/1')).estado === 'morto');

  console.log('\n=== LinkedIn: o jobs-guest decide primeiro, sem passar pelo authwall (Furo 5) ===');
  // 14/ago: o Fix 1 (identidade da resposta) só consegue rebaixar o /comm/jobs/view/ de "vivo"
  // falso pra "inconclusivo" — o authwall redireciona igual pra vaga viva ou morta. O jobs-guest
  // é o único caminho que devolve um veredito de verdade pra esse formato (maioria dos leads
  // de Marcos, que vêm de digest de e-mail). Ver senova-extension/background.js:_buscarDescricaoGuest.
  const VAGA_LINKEDIN_FECHADA = '<html><body><div class="closed-job closed-job__flavor">No longer accepting applications</div></body></html>';
  const VAGA_LINKEDIN_ABERTA = '<html><body><h1 class="top-card-layout__title">Head of Sales</h1></body></html>';

  _urlsPedidas = [];
  _respostaPorUrl = (u) => u.includes('jobs-guest') ? { status: 200, html: VAGA_LINKEDIN_ABERTA } : { status: 200, html: '<html>fallback nunca deveria ser lido</html>' };
  r = await checar('https://www.linkedin.com/jobs/view/4320681531');
  t('jobs-guest com título = VIVO', r.estado === 'vivo', JSON.stringify(r));
  t('bateu no jobs-guest com o ID certo', _urlsPedidas.some(u => u.includes('jobs-guest/jobs/api/jobPosting/4320681531')), _urlsPedidas.join(','));
  t('nem chegou a chamar a página original (o guest já respondeu)', !_urlsPedidas.includes('https://www.linkedin.com/jobs/view/4320681531'));

  _urlsPedidas = [];
  _respostaPorUrl = (u) => u.includes('jobs-guest') ? { status: 200, html: VAGA_LINKEDIN_FECHADA } : { status: 200, html: VAGA_VIVA };
  r = await checar('https://www.linkedin.com/jobs/view/4310000111');
  t('jobs-guest com "closed-job" = MORTO, mesmo o fallback dizendo o contrário (o guest manda)', r.estado === 'morto' && r.motivo === 'linkedin_closed_job', JSON.stringify(r));

  console.log('\n=== LinkedIn: /comm/jobs/view/ (formato de e-mail) usa o mesmo ID ===');
  _urlsPedidas = [];
  _respostaPorUrl = (u) => u.includes('jobs-guest') ? { status: 200, html: VAGA_LINKEDIN_FECHADA } : { status: 200, html: VAGA_VIVA };
  r = await checar('https://www.linkedin.com/comm/jobs/view/4310000111?trk=email_jymbii');
  t('/comm/jobs/view/{id} também extrai o ID e vira MORTO via jobs-guest', r.estado === 'morto', JSON.stringify(r));
  t('o ID extraído do /comm/ é o número certo', _urlsPedidas.some(u => u.endsWith('/jobPosting/4310000111')), _urlsPedidas.join(','));

  console.log('\n=== LinkedIn: guest bloqueado ou ambíguo NUNCA inventa "vivo" ===');
  // 25/ago/2026 (S52), Marcos: "cuidado em não sermos bloqueados". Recusa explícita do portal
  // deixou de cair no fetch genérico: insistir no MESMO host que acabou de dizer não fazia cada
  // verificação bloqueada custar 2 requisições em vez de 1 — e a higiene do radar faz 30 por
  // rodada, 8 rodadas por dia. O bloqueio DOBRAVA a carga justamente quando ele já tinha
  // pedido para parar. A resposta continua a mesma (inconclusivo); o que mudou é o preço.
  for (const [nome, status] of [['429 (excesso de requisições)', 429], ['403 (recusa)', 403], ['503 (indisponível)', 503]]) {
    _urlsPedidas = [];
    _respostaPorUrl = () => ({ status, html: '' });
    r = await checar('https://www.linkedin.com/jobs/view/4320681531');
    t(`${nome} = INCONCLUSIVO (nunca vivo, nunca morto)`, r.estado === 'inconclusivo', JSON.stringify(r));
    t(`${nome}: diz que foi bloqueio, não "não sei"`, r.motivo === 'portal_bloqueou', JSON.stringify(r));
    t(`${nome}: NÃO bate uma segunda vez no mesmo host`, _urlsPedidas.length === 1, _urlsPedidas.length + ' requisições: ' + _urlsPedidas.join(','));
  }
  // 404 continua sendo prova de que a vaga sumiu — bloqueio e ausência são coisas diferentes.
  _urlsPedidas = [];
  _respostaPorUrl = () => ({ status: 404, html: '' });
  r = await checar('https://www.linkedin.com/jobs/view/4320681531');
  t('404 no guest continua sendo MORTO (não virou bloqueio)', r.estado === 'morto', JSON.stringify(r));

  _urlsPedidas = [];
  _respostaPorUrl = (u) => u.includes('jobs-guest') ? { status: 200, html: '<html>marcação que o guest não reconhece</html>' } : { status: 200, html: VAGA_VIVA };
  r = await checar('https://www.linkedin.com/jobs/view/4320681531');
  t('jobs-guest com resposta não reconhecida cai pro fetch genérico (não trava em null)', r.estado === 'vivo', JSON.stringify(r));
  t('o fetch genérico foi mesmo chamado nesse caso de ambiguidade', _urlsPedidas.includes('https://www.linkedin.com/jobs/view/4320681531'), _urlsPedidas.join(','));

  _respostaPorUrl = (u) => _resposta; // volta ao padrão de um valor só, pro resto dos testes

  console.log('\n=== o alvo é barrado antes do fetch (buscar URL arbitrária é poder de proxy) ===');
  for (const [nome, u] of [
    ['localhost', 'http://localhost/x'],
    ['loopback', 'http://127.0.0.1/x'],
    ['rede interna 192.168', 'http://192.168.0.10/x'],
    ['rede interna 10.x', 'http://10.1.2.3/x'],
    ['rede interna 172.20', 'http://172.20.5.5/x'],
    ['metadados de nuvem', 'http://169.254.169.254/latest/meta-data/'],
    ['host .internal', 'https://painel.internal/x'],
  ]) {
    const res = await checar(u);
    t(nome + ' é barrado', res.estado === 'inconclusivo' && res.motivo === 'host_nao_permitido', JSON.stringify(res));
  }
  // v7.61: a porta é checada ANTES do host. Sem esta linha, a asserção de cima passaria a
  // medir a regra de porta achando que mede a de host — o alvo continuaria barrado e ninguém
  // perceberia se a lista de hosts privados fosse esvaziada.
  t('porta fora de 80/443 é barrada, em qualquer host',
    (await checar('https://portal-legitimo.com:6379/vaga')).motivo === 'porta_nao_permitida');
  t('URL com credencial embutida é barrada', (await checar('https://u:p@site.com/vaga')).motivo === 'url_com_credencial');
  t('protocolo não-http é barrado', (await checar('file:///etc/passwd')).motivo === 'protocolo_nao_suportado');
  t('URL inválida não quebra', (await checar('nao é url')).estado === 'inconclusivo');
  t('vazio não quebra', (await checar('')).estado === 'inconclusivo');

  console.log('\n──────────────────────────────');
  console.log('LINK VIVO: ' + ok + '/' + (ok + falhou) + (falhou ? ' ✗' : ' ✓'));
  process.exit(falhou ? 1 : 0);
})();
