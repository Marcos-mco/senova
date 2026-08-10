// GUARD — a cópia de segurança leva o TRABALHO, nunca a CREDENCIAL.
//
// Por que este teste existe.
// `exportarDados` varre o localStorage por prefixo (`k.startsWith('senova')`) e põe tudo no
// arquivo. A varredura por prefixo é certa para o trabalho do usuário — é ela que garante que
// nada dele fica de fora, e cópia incompleta é rede de segurança que mente (ver
// testes/arquivo_muda_de_casa.js). Mas ela é cega ao que a chave SIGNIFICA: `senova_app_key`
// tem o mesmo prefixo dos cards e é a credencial que abre o Worker (header x-senova-key, v7.4).
// Resultado: o arquivo que se manda por e-mail, se guarda na nuvem ou se envia ao Bruno para
// depurar entregava junto a chave em texto claro — e com ela a cota da API de Marcos.
//
// A régua: um backup é para não perder o que a pessoa FEZ. Uma credencial não é trabalho — é
// re-emitível, e o dono a recola em Perfil › Integrações. O cofre de sensíveis (CPF, PIS) É
// trabalho dela e CONTINUA saindo: tirá-lo faria a cópia mentir (ver
// testes/dados_sensiveis_nao_sobem.js, que guarda a outra fronteira — a da rede).
//
// A simetria importa tanto quanto a saída: com o MVP de 3 usuários chegando, importar o arquivo
// de outra pessoa não pode trocar a credencial deste navegador pela dela.
//
// Comportamental de propósito: monta o localStorage real, roda as funções REAIS e lê o arquivo
// que sai. Um grep no código passaria verde sobre uma função que nem rodou.
const { extrai, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

const CREDENCIAL = 'CANARIO-CHAVE-DO-WORKER-abc123';
const CARD = 'CANARIO-CARD-Gerente-de-Operacoes';
const COFRE = 'CANARIO-CPF-99988877766';

// localStorage de verdade: o mesmo mapa que a varredura por prefixo vai percorrer.
function armazenamento(extra) {
  const m = Object.assign({
    senova_app_key: CREDENCIAL,
    senova_vagas_v2: JSON.stringify([{ id: 1, cargo: CARD }]),
    senova_dados_sensiveis: JSON.stringify({ cpf: COFRE, autorizado: true }),
    senova_pontos_termos: '{"otima":10}',
    outra_coisa_qualquer: 'não é do Senova, não sai',
  }, extra || {});
  return {
    _m: m,
    get length() { return Object.keys(m).length; },
    key(i) { return Object.keys(m)[i]; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem(k, v) { m[k] = String(v); },
    removeItem(k) { delete m[k]; },
  };
}

function montar(fontes, ls, mocks) {
  const sandbox = Object.assign({
    localStorage: ls,
    Store: { CHAVE_ARQUIVADAS: 'senova_vagas_arquivadas', _frioNoBanco: false, _frio: null },
    showToast() {}, confirm: () => true, alert() {},
    setTimeout: () => 0, location: { reload() {} },
    document: { getElementById: () => null, createElement: () => ({ style: {}, click() {}, setAttribute() {} }) },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    JSON, Date, console, Object, String, Error, Array,
  }, mocks || {});
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  // `_naoExportar` vem junto sempre: é a trava que as duas funções consultam, e sem ela o
  // sandbox estoura em ReferenceError em vez de testar o que interessa.
  vm.runInContext(['function _naoExportar(', ...fontes].map(extrai).join('\n;\n'), sandbox);
  return sandbox;
}

// ── 1. O que sai no arquivo ────────────────────────────────────────────────────
console.log('=== a cópia exportada: todo o trabalho, nenhuma credencial ===');
let arquivo = '';
{
  const ls = armazenamento();
  const s = montar(['function exportarDados('], ls, {
    Blob: function (partes) { arquivo = String(partes[0]); },
  });
  vm.runInContext('exportarDados()', s);

  // Controle positivo primeiro: sem ele, "não vaza" passaria com um arquivo vazio.
  t('o arquivo saiu e não está vazio', arquivo.length > 50, arquivo.length + ' bytes');
  t('os processos dele estão na cópia (controle)', arquivo.includes(CARD));
  t('o cofre de sensíveis CONTINUA na cópia — é trabalho dele, não credencial',
    arquivo.includes(COFRE));
  t('as preferências também (a varredura por prefixo segue viva)',
    arquivo.includes('senova_pontos_termos'));
  t('o que não é do Senova continua de fora', !arquivo.includes('outra_coisa_qualquer'));

  // O que este teste existe para impedir. Procura o VALOR da chave no arquivo inteiro —
  // não só a chave `senova_app_key` — porque o que vaza é o segredo, não o rótulo.
  t('a credencial do Worker NÃO está no arquivo', !arquivo.includes(CREDENCIAL),
    'vazou em: ' + arquivo.slice(Math.max(0, arquivo.indexOf(CREDENCIAL) - 60), arquivo.indexOf(CREDENCIAL) + 40));
  t('nem o nome da chave aparece como campo do backup', !arquivo.includes('senova_app_key'));

  // Ausência silenciosa é armadilha: quem restaurar num aparelho novo precisa saber
  // que falta uma coisa, e qual. O arquivo diz isso por escrito.
  t('o arquivo diz por que a chave não está nele', /chave de acesso/i.test(arquivo));
  t('e diz onde recolá-la', /Integra[çc][õo]es/i.test(arquivo));
}

// ── 2. O que entra na importação ───────────────────────────────────────────────
// Backups feitos ANTES deste guard trazem a chave dentro. Restaurar um deles não pode
// reescrever a credencial deste navegador — nem com a antiga do próprio dono (que pode ter
// sido trocada), nem com a de outra pessoa quando o Senova tiver mais de um usuário.
console.log('\n=== restaurar uma cópia antiga não mexe na credencial deste navegador ===');
{
  const ANTIGA = 'CANARIO-CHAVE-VELHA-DE-OUTRO-DONO';
  const ATUAL = 'CANARIO-CHAVE-DESTE-APARELHO';
  const ls = armazenamento({ senova_app_key: ATUAL });
  let leitor = null;
  const s = montar(['function importarDados('], ls, {
    FileReader: function () { leitor = this; this.readAsText = () => {}; },
  });
  vm.runInContext('importarDados({files:[{}],value:"x"})', s);
  leitor.onload({ target: { result: JSON.stringify({ versao: '1.0', data: '2026-07-01', dados: {
    senova_app_key: ANTIGA,
    senova_vagas_v2: JSON.stringify([{ id: 9, cargo: 'CANARIO-CARD-RESTAURADO' }]),
    senova_dados_sensiveis: JSON.stringify({ cpf: COFRE }),
  } }) } });

  // Controle positivo: a restauração de fato aconteceu.
  t('a restauração rodou e trouxe os processos da cópia',
    (ls.getItem('senova_vagas_v2') || '').includes('CANARIO-CARD-RESTAURADO'));
  t('e trouxe o cofre junto', (ls.getItem('senova_dados_sensiveis') || '').includes(COFRE));

  t('a credencial deste aparelho ficou intacta', ls.getItem('senova_app_key') === ATUAL,
    'virou: ' + ls.getItem('senova_app_key'));
  t('a chave que veio no arquivo foi ignorada',
    ls.getItem('senova_app_key') !== ANTIGA);
}

// ── 3. Aparelho novo: sem chave, o app precisa DIZER, não falhar calado ────────
// Sem credencial toda chamada ao Worker volta 401 e o app fica mudo — análise que não vem,
// varredura que não roda. O usuário não tem como adivinhar que o que falta é uma linha de
// texto no Perfil.
console.log('\n=== restaurar num aparelho sem chave avisa o que falta ===');
{
  const ls = armazenamento();
  ls.removeItem('senova_app_key');
  const ditos = [];
  let leitor = null;
  const s = montar(['function importarDados('], ls, {
    FileReader: function () { leitor = this; this.readAsText = () => {}; },
    alert: m => ditos.push(String(m)),
    showToast: m => ditos.push(String(m)),
  });
  vm.runInContext('importarDados({files:[{}],value:"x"})', s);
  leitor.onload({ target: { result: JSON.stringify({ versao: '1.0', dados: { senova_vagas_v2: '[]' } }) } });
  const txt = ditos.join(' | ');
  t('o app avisa que falta a chave de acesso', /chave de acesso/i.test(txt), txt);
  t('e diz onde colá-la', /Integra[çc][õo]es/i.test(txt), txt);
}

// ── 4. Com chave no aparelho, restaurar não inventa aviso nenhum ──────────────
console.log('\n=== e não incomoda quem já tem a chave ===');
{
  const ls = armazenamento();
  const ditos = [];
  let leitor = null;
  const s = montar(['function importarDados('], ls, {
    FileReader: function () { leitor = this; this.readAsText = () => {}; },
    alert: m => ditos.push(String(m)),
  });
  vm.runInContext('importarDados({files:[{}],value:"x"})', s);
  leitor.onload({ target: { result: JSON.stringify({ versao: '1.0', dados: { senova_vagas_v2: '[]' } }) } });
  t('nenhum alerta de chave para quem já tem a sua', !/chave de acesso/i.test(ditos.join(' | ')));
}

// ── 5. A regra escrita onde se lê antes de mexer ──────────────────────────────
// A varredura por prefixo é tentadora de "simplificar" de volta. A razão fica ao lado dela.
console.log('\n=== a razão está escrita junto da varredura ===');
{
  const exp = extrai('function exportarDados(');
  t('exportarDados explica por que a credencial fica de fora',
    /credencial|chave de acesso/i.test(exp), exp.slice(0, 200));
}

fim('BACKUP · LEVA O TRABALHO, NÃO A CREDENCIAL');
