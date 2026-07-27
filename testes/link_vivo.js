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

let ok = 0, falhou = 0;
const t = (nome, cond, extra) => {
  if (cond) { ok++; console.log('  PASS  ' + nome); }
  else { falhou++; console.log('  FAIL  ' + nome + (extra ? ' → ' + extra : '')); }
};

// Sandbox com um fetch de mentira: cada teste diz o que o portal responde.
let _resposta = null, _urlPedida = '', _headersPedidos = null;
const sandbox = {
  console, URL,   // o vm isola os globais; sem isto todo endereço vira "url_invalida"
  setTimeout: () => 0, clearTimeout() {},
  AbortController: function () { this.signal = {}; this.abort = () => {}; },
  fetch: async (u, init) => {
    _urlPedida = u; _headersPedidos = init && init.headers;
    if (_resposta instanceof Error) throw _resposta;
    return {
      status: _resposta.status,
      ok: _resposta.status >= 200 && _resposta.status < 300,
      text: async () => _resposta.html || '',
    };
  },
};
vm.createContext(sandbox);
vm.runInContext([
  extrai('const SINAIS_DE_ENCERRAMENTO ='),
  extrai('function _hostProibido('),
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

  console.log('\n=== o alvo é barrado antes do fetch (buscar URL arbitrária é poder de proxy) ===');
  for (const [nome, u] of [
    ['localhost', 'http://localhost:8080/x'],
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
  t('URL com credencial embutida é barrada', (await checar('https://u:p@site.com/vaga')).motivo === 'url_com_credencial');
  t('protocolo não-http é barrado', (await checar('file:///etc/passwd')).motivo === 'protocolo_nao_suportado');
  t('URL inválida não quebra', (await checar('nao é url')).estado === 'inconclusivo');
  t('vazio não quebra', (await checar('')).estado === 'inconclusivo');

  console.log('\n──────────────────────────────');
  console.log('LINK VIVO: ' + ok + '/' + (ok + falhou) + (falhou ? ' ✗' : ' ✓'));
  process.exit(falhou ? 1 : 0);
})();
