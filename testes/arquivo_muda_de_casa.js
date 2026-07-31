// O arquivo morto sai do localStorage e vai para o IndexedDB (S40).
//
// Medido no app real de Marcos em 30/jul, na cópia que ele exportou:
//   senova_vagas_arquivadas_v1   5,84 MB   654 cards arquivados
//   senova_vagas_v2              2,52 MB   333 cards vivos
//   tudo o mais                  0,13 MB
//   TOTAL                        8,49 MB   contra um teto de ~10 MB
//
// Separar quente de frio foi necessário e não bastou: 69% do peso é histórico
// que ele não trabalha mas quer manter, e continuava dentro de uma caixa cheia.
// O IndexedDB não tem o teto de 5 MB. Nada é apagado; muda de cômodo.
//
// A regra que este arquivo existe para provar, e a única que importa de verdade:
// o arquivo morto SÓ sai do localStorage depois de ser lido de volta do banco,
// byte a byte igual. Verificar antes de apagar é a diferença entre uma mudança
// de casa e uma perda. Tudo o mais aqui é consequência disso.

const { extrai, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

const QUENTE = 'senova_vagas_v2', FRIO = 'senova_vagas_arquivadas_v1';
const CHAVE_BANCO = 'vagas_arquivadas';

function fakeLS() {
  const ls = {
    setItem(k, v) { ls[k] = String(v); },
    getItem(k) { return typeof ls[k] === 'string' ? ls[k] : null; },
    removeItem(k) { delete ls[k]; },
  };
  return ls;
}

// IndexedDB de mentira, com o mesmo formato de eventos do de verdade: os
// callbacks disparam depois, não na hora. Um banco que respondesse na mesma
// linha esconderia justamente os defeitos de ordem que procuramos.
function fakeIDB(regime) {
  const dados = {};
  const depois = fn => setTimeout(fn, 0);
  return {
    dados,
    open() {
      const req = {};
      depois(() => {
        if (regime === 'sem_banco') { req.error = new Error('sem indexedDB'); req.onerror && req.onerror(); return; }
        if (regime === 'nunca_responde') return;   // silêncio: o app não pode ficar preso
        req.result = {
          transaction(_loja, modo) {
            const tx = {};
            const store = {
              get(k) {
                const r = {};
                depois(() => {
                  if (regime === 'leitura_falha') { r.error = new Error('leitura'); r.onerror && r.onerror(); return; }
                  if (regime === 'volta_diferente' && tx._gravou) { r.result = 'CONTEUDO TRUNCADO'; r.onsuccess && r.onsuccess(); return; }
                  r.result = dados[k];
                  r.onsuccess && r.onsuccess();
                });
                return r;
              },
              put(v, k) {
                if (regime === 'gravacao_falha') { depois(() => { tx.error = new Error('gravação'); tx.onerror && tx.onerror(); }); return {}; }
                if (regime === 'volta_diferente') { tx._gravou = true; depois(() => tx.oncomplete && tx.oncomplete()); return {}; }
                dados[k] = String(v);
                depois(() => tx.oncomplete && tx.oncomplete());
                return {};
              },
            };
            tx.objectStore = () => store;
            if (modo !== 'readwrite') depois(() => { });
            return tx;
          },
        };
        req.onsuccess && req.onsuccess();
      });
      return req;
    },
  };
}
// 'volta_diferente' precisa que o get anterior à gravação devolva null; o flag
// _gravou vive na transação, e cada transação é nova. Guardamos fora dela.
function fakeIDBVoltaDiferente() {
  const dados = {};
  let gravou = false;
  const depois = fn => setTimeout(fn, 0);
  return {
    dados,
    open() {
      const req = {};
      depois(() => {
        req.result = {
          transaction() {
            const tx = {};
            tx.objectStore = () => ({
              get(k) {
                const r = {};
                depois(() => { r.result = gravou ? 'TRUNCADO NA VOLTA' : dados[k]; r.onsuccess && r.onsuccess(); });
                return r;
              },
              put(v, k) { gravou = true; depois(() => tx.oncomplete && tx.oncomplete()); return {}; },
            });
            return tx;
          },
        };
        req.onsuccess && req.onsuccess();
      });
      return req;
    },
  };
}

function montar(idb) {
  const fontes = [
    'const Store = {',
    'function _restosDescartaveis(',
    'function _descartarRestos(',
    'function _podarAutoBackups(',
  ].map(extrai).join('\n;\n');

  const ls = fakeLS();
  let avisos = 0;
  const sandbox = {
    vagas: [], contatos: [],
    localStorage: ls, indexedDB: idb,
    _LOGO_CACHE_KEY: 'senova_logo_cache_v5',
    _avisarGravacaoFalhou() { avisos++; }, _limparAvisoGravacao() { },
    JSON, Object, Date, console, Error, String, Set, Promise, setTimeout,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  return { sandbox, ls, run: e => vm.runInContext(e, sandbox), avisos: () => avisos };
}

const card = (id, status) => ({ id, status, empresa: 'E' + id });
const ARQUIVADOS = JSON.stringify([card(101, 'arquivado'), card(102, 'arquivado'), card(103, 'arquivado')]);
const VIVOS = JSON.stringify([card(1, 'lead'), card(2, 'aplicado')]);

const carregar = ({ run }) => run('Store.carregarFrio()');

(async () => {

  console.log('=== a mudança de casa: grava, CONFERE, e só então devolve o espaço ===');
  {
    const idb = fakeIDB('ok');
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);

    t('o arquivo foi para o banco', idb.dados[CHAVE_BANCO] === ARQUIVADOS);
    t('e só então saiu do localStorage', ctx.ls.getItem(FRIO) === null);
    t('o Store sabe que o arquivo mora no banco', ctx.run('Store._frioNoBanco') === true);
    t('o arquivo está carregado', ctx.run('Store._frioCarregado') === true);

    const lidas = ctx.run('Store.lerVagas()');
    t('a lista continua inteira: 2 vivos + 3 arquivados', lidas.length === 5);
    t('nenhum card duplicado', new Set(lidas.map(v => v.id)).size === 5);
  }

  console.log('\n=== se a volta não bater, NADA é apagado ===');
  {
    // O caso que justifica a conferência existir: o banco aceita a gravação mas
    // devolve outra coisa. Apagar aqui seria destruir 654 cards confiando numa
    // promessa que não se cumpriu.
    const idb = fakeIDBVoltaDiferente();
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);

    t('o arquivo continua no localStorage', ctx.ls.getItem(FRIO) === ARQUIVADOS);
    t('o Store NÃO considera o banco a casa do arquivo', ctx.run('Store._frioNoBanco') === false);
    t('e ainda assim a lista está inteira', ctx.run('Store.lerVagas()').length === 5);
  }
  {
    const ctx = montar(fakeIDB('gravacao_falha'));
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);
    t('gravação recusada: o arquivo fica onde estava', ctx.ls.getItem(FRIO) === ARQUIVADOS);
    t('gravação recusada: a lista está inteira', ctx.run('Store.lerVagas()').length === 5);
  }

  console.log('\n=== banco indisponível: pior, mas verdadeiro — e nunca preso ===');
  {
    const ctx = montar(fakeIDB('sem_banco'));
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);
    t('sem IndexedDB, o app carrega assim mesmo', ctx.run('Store._frioCarregado') === true);
    t('sem IndexedDB, o arquivo continua no localStorage', ctx.ls.getItem(FRIO) === ARQUIVADOS);
    t('sem IndexedDB, a lista está inteira', ctx.run('Store.lerVagas()').length === 5);
  }
  {
    // Um banco que não responde não pode deixar Marcos olhando para uma tela
    // em branco para sempre. A promessa resolve por desistência.
    const ctx = montar(fakeIDB('nunca_responde'));
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    const relogio = [];
    const origSetTimeout = setTimeout;
    ctx.sandbox.setTimeout = (fn, ms) => { if (ms >= 1000) relogio.push(fn); else origSetTimeout(fn, 0); };
    const p = carregar(ctx);
    t('existe uma desistência agendada (o app não fica preso)', relogio.length === 1);
    relogio.forEach(fn => fn());     // o tempo passa
    await p;
    t('desistiu e carregou do localStorage', ctx.run('Store.lerVagas()').length === 5);
    t('e não deu o banco como casa do arquivo', ctx.run('Store._frioNoBanco') === false);
  }

  console.log('\n=== arquivar um card depois da mudança grava no banco ===');
  {
    const idb = fakeIDB('ok');
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);

    ctx.sandbox.vagas = ctx.run('Store.lerVagas()');
    ctx.sandbox.vagas[0].status = 'arquivado';        // arquivou um card vivo
    t('gravou', ctx.run('Store.gravar()') === true);
    await new Promise(r => setTimeout(r, 5));

    const noBanco = JSON.parse(idb.dados[CHAVE_BANCO]);
    t('o banco agora tem 4 arquivados', noBanco.length === 4);
    t('o localStorage NÃO voltou a guardar o arquivo', ctx.ls.getItem(FRIO) === null);
    t('o bloco quente ficou só com o vivo restante', JSON.parse(ctx.ls.getItem(QUENTE)).length === 1);
    t('nada duplicou', new Set(JSON.parse(ctx.ls.getItem(QUENTE)).concat(noBanco).map(v => v.id)).size === 5);
  }

  console.log('\n=== mexer só num processo vivo não toca no banco ===');
  {
    const idb = fakeIDB('ok');
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);
    ctx.sandbox.vagas = ctx.run('Store.lerVagas()');
    const antes = idb.dados[CHAVE_BANCO];

    ctx.sandbox.vagas[0].empresa = 'mudou';
    ctx.run('Store.gravar()');
    await new Promise(r => setTimeout(r, 5));
    t('o arquivo no banco não foi reescrito', idb.dados[CHAVE_BANCO] === antes);
  }

  console.log('\n=== o arquivo morto nunca é sobrescrito antes de ser carregado ===');
  {
    // O acidente que apagaria 654 cards de uma vez: gravar com a lista da
    // memória ainda sem os arquivados. O código do arranque espera o
    // carregamento antes de montar a tela — esta é a prova de que espera.
    const boot = extrai('Store.carregarFrio().then(function(){');
    t('o loadCRM roda DENTRO da espera pelo arquivo', /loadCRM\(\)/.test(boot));
    t('a tela também só é montada depois', /showPage\(/.test(boot));
  }
  {
    const idb = fakeIDB('ok');
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);
    // Sem passar pelo lerVagas: a memória tem só os vivos, como no meio de um
    // arranque mal feito. _rawFrio guarda o que está gravado, então uma lista
    // sem arquivados é uma MUDANÇA e seria gravada. A defesa real é o arranque.
    t('depois de carregar, o Store conhece os bytes do arquivo',
      ctx.run('Store._frio') === ARQUIVADOS);
  }

  console.log('\n=== restaurar um ponto COMPLETO esvazia o banco, sem duplicar ===');
  {
    const idb = fakeIDB('ok');
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, VIVOS);
    ctx.ls.setItem(FRIO, ARQUIVADOS);
    await carregar(ctx);

    const ponto = JSON.stringify([card(1, 'lead'), card(101, 'arquivado'), card(999, 'arquivado')]);
    t('restaurou', ctx.run('Store.restaurar(' + JSON.stringify(ponto) + ')') === true);
    await new Promise(r => setTimeout(r, 5));
    t('o banco foi esvaziado', idb.dados[CHAVE_BANCO] === '[]');
    const lidas = ctx.run('Store.lerVagas()');
    t('voltaram os 3 cards do ponto', lidas.length === 3);
    t('o card 101 não aparece duas vezes', lidas.filter(v => v.id === 101).length === 1);
  }
  {
    // Trava de duplicata: mesmo que a limpeza do banco não chegue a tempo antes
    // do recarregamento, o mesmo card não pode aparecer nos dois lados.
    const idb = fakeIDB('ok');
    const ctx = montar(idb);
    ctx.ls.setItem(QUENTE, JSON.stringify([card(1, 'lead'), card(101, 'arquivado')]));
    idb.dados[CHAVE_BANCO] = ARQUIVADOS;    // o banco ainda tem o 101
    await carregar(ctx);
    const lidas = ctx.run('Store.lerVagas()');
    t('o card repetido nos dois lados aparece uma vez só',
      lidas.filter(v => v.id === 101).length === 1);
    t('e nenhum outro card se perdeu', new Set(lidas.map(v => v.id)).size === 4);
  }

  console.log('\n=== a cópia de segurança continua saindo INTEIRA ===');
  {
    // A rede de segurança de Marcos é o botão "Baixar uma cópia agora". Com o
    // arquivo fora do localStorage, a varredura de chaves deixaria 654 cards de
    // fora — e uma cópia incompleta é pior do que nenhuma: mente que está inteira.
    const exp = extrai('function exportarDados(');
    t('a exportação junta o arquivo morto que está fora do localStorage',
      /backup\.dados\[Store\.CHAVE_ARQUIVADAS\]\s*=\s*Store\._frio/.test(exp), exp.slice(0, 400));
    t('e só quando ele de fato mora no banco', /Store\._frioNoBanco/.test(exp));

    const imp = extrai('function importarDados(');
    t('a importação devolve o arquivo ao banco, não só ao localStorage',
      /Store\._gravarBanco\(db,Store\.BANCO_CHAVE_FRIO/.test(imp));
    t('cópia sem arquivado nenhum zera o banco em vez de manter o antigo',
      /\|\|'\[\]'/.test(imp));
  }

  console.log('\n=== usuário novo: sem arquivo nenhum, nada quebra ===');
  {
    const ctx = montar(fakeIDB('ok'));
    await carregar(ctx);
    t('lista vazia', ctx.run('Store.lerVagas()').length === 0);
    t('carregou mesmo sem nada', ctx.run('Store._frioCarregado') === true);
  }

  fim('ARQUIVO MORTO MUDA DE CASA · CONFERE ANTES DE APAGAR');
})();
