// Helper compartilhado dos testes. Extrai as funções REAIS do index.html (por balanceamento de
// chaves) e monta um sandbox vm com mocks mínimos. Centraliza o NÚCLEO de auxiliares — assim um
// portão novo (setCV, setStatus…) entra UMA vez aqui e não quebra os testes por falta de extração
// (era a fragilidade que fazia cada portão derrubar 4 testes de uma vez).
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extrai o corpo de uma função/atribuição pelo início da assinatura, balanceando { }.
function extrai(assinatura) {
  const i = html.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no index.html: ' + assinatura);
  const ab = html.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return html.slice(i, j + 1);
}

// Auxiliares que quase todo teste precisa. Portão novo entra AQUI (uma vez).
const NUCLEO = [
  'function _jobIdLinkedIn(',
  'function dataAtualFormatada(',
  'function _acharVagaRef(',
  'function _extrairSoCV(',
  'function setCV(',
  'function setStatus(',
  'function _statusLabel(',
  'function _confirmarArquivarProtegido(',
  'function _marcarCandidaturaEnviada(',
  // Idioma do CV: decidido pela vaga (ver _idiomaDoPedido). Entra no núcleo porque o portão de
  // escrita e a ponte da extensão dependem dele.
  'const _IDIOMA_MARCAS = {',
  'function _idiomaDaVaga(',
  'function _idiomaDoCV(',
  'function _idiomaDoPedido(',
  'function _extrairPerfilTraduzido(',
];

// Carrega o app num sandbox: núcleo + funções `extras` do teste, com mocks mínimos (sobrescrevíveis).
function carregarApp(extras = [], mocks = {}) {
  const fontes = [...NUCLEO, ...extras].map(extrai).join('\n;\n');
  const sandbox = Object.assign({
    vagas: [], filtroAtivo: null,
    saveVagas() {}, renderCRM() {}, aplicarFiltros() {}, showToast() {},
    setTimeout: () => 0, clearTimeout() {},
    document: { getElementById: () => null },
    MODELOS: { rapido: 'm', analise: 'm' },
    ATS_SYSTEM: () => 'SYS', CARTA_SYSTEM: () => 'SYS',
    _STATUS_PROTEGIDO: ['entrevista', 'proposta', 'aceito'], // usado por _confirmarArquivarProtegido
    confirm: () => true,                                     // trava confirma por padrão; teste sobrescreve
    alert: () => {},
    lastCV: '', lastCVFilename: '', atsCargo: '', _pdfExecBase64: () => 'FAKEB64',
    cvLang: 'PT', cvLangManual: false, lastCVLang: 'PT', lastCVTrad: null,
    // Perfil mínimo: quem testa os fatos traduzidos carrega o PERFIL_MARCOS real nos `extras`.
    PERFIL_MARCOS: { experiencias: [], formacao: [], idiomas: [] },
    btoa: s => Buffer.from(s, 'binary').toString('base64'),
    unescape: global.unescape || (s => decodeURIComponent(s)),
    encodeURIComponent, console,
  }, mocks);
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  return sandbox;
}

// Chama uma função exposta em window dentro do sandbox, serializando os args.
function chamar(sandbox, fn, args = []) {
  return vm.runInContext('window.' + fn + '(' + args.map(a => JSON.stringify(a)).join(',') + ')', sandbox);
}

// Roda uma expressão CRUA no contexto — use quando precisar da referência real (ex.: setStatus
// muta a vaga por referência; passar por JSON perderia a mutação). Ex.: exec(s,'setStatus(vagas[0],"entrevista")').
function exec(sandbox, expr) {
  return vm.runInContext(expr, sandbox);
}

// Micro-assert compartilhado. Retorna um contador; o teste chama fim() no final.
function assert() {
  let ok = 0, fail = 0;
  const t = (nome, cond, det) => {
    if (cond) { ok++; console.log('  PASS  ' + nome); }
    else { fail++; console.log('  FAIL  ' + nome + (det ? '  → ' + det : '')); }
  };
  const fim = (titulo) => {
    console.log('\n──────────────────────────────');
    console.log(fail === 0 ? `${titulo}: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
    process.exit(fail === 0 ? 0 : 1);
  };
  return { t, fim };
}

module.exports = { extrai, carregarApp, chamar, exec, assert, html };
