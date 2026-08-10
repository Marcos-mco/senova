// GUARD — o Senova não grava sobre o que ainda não leu.
//
// Por que este teste existe.
// O CRM mora em dois blocos: os processos vivos (pequeno, síncrono, no localStorage) e o
// arquivo morto (654 cards, ~6 MB, assíncrono, fora do localStorage). `Store.gravar()`
// PARTICIONA a array `vagas` nesses dois blocos e grava os dois. Isso significa que ele não
// grava o que recebeu — ele grava o que ACREDITA ser o estado completo.
//
// E `vagas` nasce vazia. Enquanto o arquivo morto não chega, o estado completo que o Store
// enxerga é "não há arquivados". Uma única gravação nessa janela escreve `[]` por cima dos
// 654 cards — não por defeito de gravação, mas porque a pergunta foi feita cedo demais.
//
// A janela não é hipotética: `window.__senovaImportar()` era invocada no arranque, fora da
// espera do arquivo, e chama `saveVagas()`. Hoje ela perde a corrida quase sempre (a rede é
// mais lenta que o banco local, e a lista de já-importadas costuma barrar antes da escrita).
// "Quase sempre" é a definição de bug que só aparece no pior dia. Com o arquivo indo para o
// D1, a corrida inverte: passa a ser rede contra rede.
//
// A régua, que é a mesma da S40 (verificar antes de apagar) aplicada à ORDEM das operações:
// não saber é um estado, e é diferente de saber que está vazio. Enquanto o Senova não sabe,
// ele não grava e DIZ que não gravou — silêncio aqui é indistinguível de sucesso.
//
// Comportamental de propósito: roda o `Store` REAL contra um localStorage e um IndexedDB de
// mentira, e olha o que sobrou gravado. Um grep passaria verde sobre um portão que não fecha.
const { extrai, html, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

const VIVO = { id: 1, cargo: 'CANARIO-VAGA-VIVA', status: 'lead' };
const ARQUIVADOS = JSON.stringify(
  Array.from({ length: 654 }, (_, i) => ({ id: 1000 + i, cargo: 'CANARIO-ARQUIVADO-' + i, status: 'arquivado' }))
);

function armazenamento(inicial) {
  const m = Object.assign({}, inicial || {});
  return {
    _m: m,
    get length() { return Object.keys(m).length; },
    key(i) { return Object.keys(m)[i]; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem(k, v) { m[k] = String(v); },
    removeItem(k) { delete m[k]; },
  };
}

// IndexedDB de mentira, com três humores. `guardado` é o que o banco devolve na leitura;
// `escritas` registra tudo que tentaram gravar nele — é ali que a perda apareceria.
function banco(humor, guardado) {
  const escritas = [];
  const db = {
    transaction() {
      return {
        objectStore() {
          return {
            get() { const r = {}; setImmediate(() => r.onsuccess && r.onsuccess()); r.result = guardado; return r; },
            put(valor) { escritas.push(String(valor)); return {}; },
          };
        },
        set oncomplete(f) { setImmediate(f); },
        set onerror(_) {}, set onabort(_) {},
      };
    },
  };
  const idb = {
    open() {
      const req = { result: db };
      if (humor === 'mudo') return req;                                  // nunca responde
      setImmediate(() => { humor === 'erro' ? (req.onerror && req.onerror()) : (req.onsuccess && req.onsuccess()); });
      return req;
    },
  };
  return { idb, escritas, leituras: () => guardado };
}

function montar(ls, idb) {
  const avisos = [];
  const sandbox = {
    localStorage: ls, indexedDB: idb,
    vagas: [], contatos: [],
    _avisarGravacaoFalhou: motivo => avisos.push(String(motivo)),
    _limparAvisoGravacao() {},
    _descartarRestos() {}, _podarAutoBackups() {},
    JSON, Date, console, Promise, Set, Error, Object, String, Array, Math,
    setTimeout, setImmediate, clearTimeout,
  };
  sandbox.window = sandbox;
  sandbox.avisos = avisos;
  vm.createContext(sandbox);
  vm.runInContext(extrai('const Store = {'), sandbox);
  // `const Store` é ligação léxica: não aparece como propriedade do sandbox. Pega-se a
  // referência de dentro do próprio contexto — é o objeto real, não uma cópia.
  sandbox.ST = vm.runInContext('Store', sandbox);
  return sandbox;
}

// A gravação no banco é assíncrona: o `put` acontece um tique depois de `gravar()` voltar.
// Conferir na mesma linha daria um verde falso — o dano ainda não teria sido registrado.
const tique = () => new Promise(r => setImmediate(() => setImmediate(r)));

async function main() {
  // ── 1. O portão: sem o arquivo na mão, não grava ────────────────────────────
  console.log('=== gravar antes de o arquivo morto chegar não pode apagá-lo ===');
  {
    const ls = armazenamento({ senova_vagas_v2: JSON.stringify([VIVO]) });
    const b = banco('ok', ARQUIVADOS);
    const s = montar(ls, b.idb);
    // O estado exato do arranque: o arquivo mora no banco e ainda não veio.
    Object.assign(s.ST, { _frioCarregado: false, _frio: null, _rawFrio: null, _frioNoBanco: true });
    s.vagas = [VIVO, { id: 2, cargo: 'CANARIO-NOVA-DA-EXTENSAO', status: 'lead' }];

    const ok = vm.runInContext('Store.gravar()', s);
    await tique();

    t('a gravação é RECUSADA enquanto o arquivo não chegou', ok === false, 'devolveu: ' + ok);
    t('nada foi escrito por cima do arquivo morto', b.escritas.length === 0,
      'escreveu no banco: ' + JSON.stringify(b.escritas.map(e => e.slice(0, 40))));
    t('e o bloco de processos vivos também ficou intacto',
      ls.getItem('senova_vagas_v2') === JSON.stringify([VIVO]),
      'virou: ' + String(ls.getItem('senova_vagas_v2')).slice(0, 80));
    // Recusa calada é pior que falha: a tela mostraria o card salvo que não foi salvo.
    t('o usuário é avisado de que não deu para guardar', s.avisos.length > 0);
  }

  // ── 2. Controle positivo: com o arquivo na mão, grava normalmente ───────────
  // Sem esta seção, um `gravar(){ return false; }` passaria no teste acima.
  console.log('\n=== com o arquivo carregado, tudo grava como sempre ===');
  {
    const ls = armazenamento({ senova_vagas_v2: '[]' });
    const b = banco('ok', ARQUIVADOS);
    const s = montar(ls, b.idb);
    Object.assign(s.ST, { _frioCarregado: true, _frio: ARQUIVADOS, _rawFrio: ARQUIVADOS, _frioNoBanco: true });
    // O arquivo mudou de verdade (um card a menos), senão o Store nem tentaria regravá-lo.
    const arq = JSON.parse(ARQUIVADOS).slice(0, 653);
    s.vagas = arq.concat([VIVO]);

    const ok = vm.runInContext('Store.gravar()', s);
    await tique();

    t('a gravação acontece', ok === true);
    t('o processo vivo foi guardado', String(ls.getItem('senova_vagas_v2')).includes('CANARIO-VAGA-VIVA'));
    t('o arquivo morto chegou ao banco', b.escritas.length === 1, b.escritas.length + ' escrita(s)');
    t('e chegou inteiro', JSON.parse(b.escritas[0] || '[]').length === 653);
  }

  // ── 3. Arquivo vazio de verdade ≠ arquivo desconhecido ──────────────────────
  // Quem nunca arquivou nada tem arquivo vazio, e isso é uma resposta legítima do banco.
  // Se o portão confundisse "vazio" com "não sei", o Senova nunca mais gravaria para
  // usuário novo — que é exatamente o cenário dos 3 usuários de homologação.
  console.log('\n=== quem nunca arquivou nada continua conseguindo gravar ===');
  {
    const ls = armazenamento({});
    const b = banco('ok', null);
    const s = montar(ls, b.idb);
    Object.assign(s.ST, { _frioCarregado: true, _frio: null, _rawFrio: null, _frioNoBanco: true });
    s.vagas = [VIVO];

    t('grava sem reclamar', vm.runInContext('Store.gravar()', s) === true);
    t('e o card está lá', String(ls.getItem('senova_vagas_v2')).includes('CANARIO-VAGA-VIVA'));
  }

  // ── 4. Banco que não responde não pode virar "carregado e vazio" ────────────
  // O desistir por tempo existe para não prender o app, e está certo. O que não pode é ele
  // terminar afirmando que o arquivo chegou: o app passaria a sessão inteira acreditando
  // num arquivo vazio, e a primeira gravação tornaria a crença verdadeira.
  console.log('\n=== banco mudo: o app admite que não sabe, em vez de inventar vazio ===');
  {
    // O estado real de quem já mudou de casa: o arquivo saiu do localStorage e ficou a
    // migalha dizendo que ele existe, no banco.
    const ls = armazenamento({ senova_vagas_v2: JSON.stringify([VIVO]), senova_arquivo_no_banco: '1' });
    const b = banco('mudo', ARQUIVADOS);
    const s = montar(ls, b.idb);
    // Encurta o desistir de 4 s para o teste não esperar de verdade.
    s.setTimeout = f => { setImmediate(f); return 0; };

    await vm.runInContext('Store.carregarFrio()', s);

    t('NÃO se declara carregado quando o banco não respondeu', s.ST._frioCarregado === false,
      '_frioCarregado=' + s.ST._frioCarregado + ' com _frio=' + JSON.stringify(s.ST._frio));

    // E a consequência que importa: nesse estado, gravar continua barrado.
    s.vagas = [VIVO];
    const ok = vm.runInContext('Store.gravar()', s);
    await tique();
    t('e por isso a gravação segue recusada', ok === false);
    t('o arquivo morto não foi tocado', b.escritas.length === 0);
  }

  // ── 4b. Banco indisponível para quem NUNCA mudou de casa ────────────────────
  // Aba anônima, perfil sem IndexedDB, usuário novo: o banco falha e não há migalha
  // nenhuma. Aqui o localStorage É o arquivo, e "não há nada arquivado" é uma resposta
  // verdadeira. Travar este caso deixaria o Senova sem gravar para quem acabou de chegar —
  // exatamente os 3 usuários de homologação.
  console.log('\n=== sem banco e sem mudança de casa, o localStorage é a verdade ===');
  {
    const ls = armazenamento({ senova_vagas_arquivadas_v1: ARQUIVADOS });
    const s = montar(ls, banco('erro', null).idb);
    s.setTimeout = f => { setImmediate(f); return 0; };

    await vm.runInContext('Store.carregarFrio()', s);

    t('o app se dá por carregado', s.ST._frioCarregado === true);
    t('lendo o arquivo de onde ele nunca saiu', JSON.parse(s.ST._frio || '[]').length === 654);
    s.vagas = JSON.parse(ARQUIVADOS).concat([VIVO]);
    t('e grava normalmente', vm.runInContext('Store.gravar()', s) === true);
  }

  // ── 5. Banco que abre e responde: aí sim, carregado ─────────────────────────
  // Controle positivo do item 4 — sem ele, um `_frioCarregado=false` fixo passaria.
  console.log('\n=== banco que responde deixa o app pronto para gravar ===');
  {
    const s = montar(armazenamento({}), banco('ok', ARQUIVADOS).idb);
    await vm.runInContext('Store.carregarFrio()', s);
    t('o arquivo chegou e o app sabe disso', s.ST._frioCarregado === true);
    t('com os 654 cards na mão', JSON.parse(s.ST._frio || '[]').length === 654);
  }

  // ── 6. A ponte da extensão não grava no meio do carregamento ────────────────
  console.log('\n=== a ponte da extensão espera o arquivo, como o resto do arranque ===');
  {
    const arranque = extrai('Store.carregarFrio().then(');
    t('__senovaImportar só roda depois que o arquivo chegou',
      /__senovaImportar\(\)/.test(arranque));
    const chamadas = (html.match(/window\.__senovaImportar\(\)\s*;/g) || []).length;
    t('e é invocada uma vez só, de dentro da espera', chamadas === 1, chamadas + ' invocação(ões)');
  }

  // ── 7. A razão escrita ao lado do portão ────────────────────────────────────
  {
    const store = extrai('const Store = {');
    t('o portão explica por que existe, junto do código',
      /_frioCarregado/.test(store) && /(não sabe|desconhec|ainda não|antes de)/i.test(store));
  }

  fim('NÃO GRAVAR SOBRE O QUE AINDA NÃO SE LEU');
}

main();
