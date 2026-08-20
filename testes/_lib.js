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
  // Idioma do CV: decidido pela vaga e pela régua do Perfil (ver _idiomaDecidido). Entra no
  // núcleo porque o portão de escrita e a ponte da extensão dependem dele. _PDF_LABELS entra
  // junto: é ele que diz em que línguas sabemos entregar o documento inteiro, e sem ele a
  // lista de idiomas do usuário sairia vazia dentro do sandbox.
  'const IDIOMAS={',
  'const _PDF_LABELS={',
  'function idiomaEntregavel(',
  'let _perfilIdioma=',
  'function _niveisIdiomaDeclarados(',
  'function idiomasDoUsuario(',
  'function idiomasEntregaveis(',
  'function _dividaIdioma(',
  'const _IDIOMA_MARCAS = {',
  'function _idiomaDaVaga(',
  'function _idiomaDoCV(',
  'function _idiomaDecidido(',
  'function _idiomaDoPedido(',
  // Guarda de veracidade dos bullets reescritos por vaga (S48): desde que a IA adapta o texto dos
  // fatos, e não só o traduz, é este par que impede número novo de entrar no CV.
  // _extrairPerfilTraduzido depende dos dois — entram no núcleo pela razão do topo do arquivo.
  'function _numerosDe(',
  'function _bulletsFieisAosFatos(',
  'function _extrairPerfilTraduzido(',
  // Ponto único de gravação de localizacao/modelo/regime/jornada/salario (S47, auditoria de
  // captura). _aplicarSinaisWorker depende dela — entra no núcleo pela mesma razão.
  'function _gravarMetaVaga(',
  // Ponto único de gravação dos sinais do Worker (candidatura direta + idioma exigido do
  // documento, S47). Toda esteira que lê /api/analisar-vaga chama esta função — entra no núcleo
  // porque um teste que extrai só a esteira (ex.: analisarLoteBackground) sem extrair este
  // portão junto quebraria com ReferenceError na primeira chamada real.
  'function _aplicarSinaisWorker(',
  // Monta o bloco de fatos já conhecidos (localização/modelo/regime) que as 3 esteiras de
  // análise mandam ao Worker — mesma razão do portão acima: quem extrai só a esteira sem isto
  // junto quebra com ReferenceError.
  'function _metaConhecidaVaga(',
  // Quantas experiências ganham bullets no PDF de nível gerencial (S48). Entra no núcleo pela
  // razão escrita no topo: é dependência de _cvParaPDF, e sem ela os 4 testes que extraem essa
  // função morriam com ReferenceError — exatamente a fragilidade que este núcleo existe para
  // evitar. Régua de produto, não detalhe de layout: ver o comentário dela no index.html.
  'const CV_EXPS_COM_BULLETS =',
  // Colhe subtítulo, RESUMO e COMPETÊNCIAS do texto livre da IA — outra dependência de
  // _cvParaPDF, pela mesma razão do topo.
  'function _secaoDoCV(',
];

// Carrega o app num sandbox: núcleo + funções `extras` do teste, com mocks mínimos (sobrescrevíveis).
function carregarApp(extras = [], mocks = {}) {
  // Set: um teste pode listar nos `extras` algo que já está no núcleo (_PDF_LABELS, por
  // exemplo) — extrair duas vezes daria `const` declarado duas vezes e SyntaxError.
  const fontes = [...new Set([...NUCLEO, ...extras])].map(extrai).join('\n;\n');
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
    // 6º campo do contexto de PDF (S48): a descrição da vaga que originou o CV em lastCV. Quem
    // extrai _pdfCtxUsar/_pdfCtxDoCard sem isto quebra com ReferenceError.
    lastCVVaga: '',
    // Perfil mínimo: quem testa os fatos traduzidos carrega o PERFIL_MARCOS real nos `extras`.
    // Os idiomas declarados vêm junto porque é deles que sai em que línguas o app pode escrever
    // (idiomasDoUsuario) — um perfil sem idiomas faria todo CV cair em português no sandbox.
    PERFIL_MARCOS: { experiencias: [], formacao: [], idiomas: [
      { idioma: 'Português', nivel: 'nativo' }, { idioma: 'Inglês', nivel: 'avancado' }, { idioma: 'Espanhol', nivel: 'avancado' },
    ] },
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
