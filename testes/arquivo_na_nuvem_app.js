// GUARD — o lado do APP da mudança do arquivo para a nuvem.
//
// Por que este teste existe.
// O arquivo de processos encerrados (654 cards, ~6 MB) sai do navegador e passa a morar no
// Cloudflare D1. O que muda no app não é "onde grava": é que a gravação passou a ser REMOTA,
// ASSÍNCRONA e FALÍVEL. Três coisas que, sozinhas, transformam qualquer descuido em perda
// silenciosa de histórico:
//
//   · a rede pode não responder — e "não respondeu" NÃO é "está vazio". Confundir os dois faz
//     o app gravar `[]` por cima de 654 processos, que é o acidente que a S40 já quase teve
//     duas vezes;
//   · as descrições chegam DEPOIS da tela (decisão de Marcos, S42: abrir um processo encerrado
//     não pode ter espera). Existe portanto uma janela real em que o card está em memória sem o
//     texto da vaga. Se uma gravação cair nessa janela AFIRMANDO que não há descrição, o texto
//     morre no banco — 45% do conteúdo de cada card;
//   · o que sai da lista tem de sair de lá também, senão o card RESSUSCITA no próximo arranque.
//
// A régua é a da S40 e não se negocia: o dado só sai do lugar antigo depois de ser lido DE VOLTA
// e conferido. Aqui isso é verificado como comportamento — o `Store` REAL do index.html rodando
// contra uma nuvem de mentira — e não por leitura de código. Um grep passa verde sobre um portão
// que não fecha; este teste não.
const { extrai, html, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

// ── A nuvem de mentira ──────────────────────────────────────────────────────
// Guarda exatamente o que o Worker guarda (uma linha por card, com o texto numa coluna à
// parte) e responde às mesmas rotas. `humor` permite adoecê-la de propósito.
function nuvem(humor) {
  const linhas = new Map();          // card_id → { status, atualizado, dados, descricao }
  const chamadas = [];
  const corpos = [];                 // todo pacote que subiu, do jeito que subiu
  function resposta(obj, ok) {
    return Promise.resolve({ ok: ok !== false, json: () => Promise.resolve(obj) });
  }
  function fetchFalso(url, opcoes) {
    const u = String(url);
    const caminho = u.replace('https://w', '').split('?')[0];
    const busca = new URLSearchParams(u.split('?')[1] || '');
    const metodo = (opcoes && opcoes.method) || 'GET';
    chamadas.push(metodo + ' ' + caminho);
    if (humor === 'muda') return new Promise(() => {});          // nunca responde
    if (humor === 'fora') return Promise.reject(new Error('rede'));
    if (humor === 'grava-nao' && metodo === 'POST' && caminho === '/api/arquivo') {
      return resposta({ erro: 'banco_indisponivel' }, false);
    }

    if (caminho === '/api/arquivo' && metodo === 'GET') {
      const comDesc = busca.get('com_descricao') === '1';
      const limite = Math.min(parseInt(busca.get('limite') || '150', 10), comDesc ? 25 : 500);
      const apos = busca.get('apos') || '';
      const ids = Array.from(linhas.keys()).sort().filter(id => id > apos).slice(0, limite);
      const cards = ids.map(id => {
        const l = linhas.get(id);
        const saida = { card_id: id, status: l.status, atualizado: l.atualizado, dados: l.dados };
        if (comDesc) saida.descricao = l.descricao;
        return saida;
      });
      return resposta({ ok: true, cards, ultimo: ids.length ? ids[ids.length - 1] : null,
                        tem_mais: ids.length === limite });
    }
    if (caminho === '/api/arquivo' && metodo === 'POST') {
      const body = JSON.parse(opcoes.body);
      corpos.push(body);
      body.cards.forEach(c => {
        const antes = linhas.get(c.card_id);
        // A regra que o Worker aplica, replicada aqui porque é justamente ela que este
        // teste precisa poder violar: campo AUSENTE preserva; campo presente sobrescreve.
        const declarou = Object.prototype.hasOwnProperty.call(c, 'descricao');
        linhas.set(c.card_id, {
          status: c.status, atualizado: c.atualizado, dados: c.dados,
          descricao: declarou ? (c.descricao == null ? null : c.descricao) : (antes ? antes.descricao : null),
        });
      });
      return resposta({ ok: true, gravados: body.cards.length });
    }
    if (caminho === '/api/arquivo/remover' && metodo === 'POST') {
      const body = JSON.parse(opcoes.body);
      let n = 0;
      body.ids.forEach(id => { if (linhas.delete(id)) n++; });
      return resposta({ ok: true, pedidos: body.ids.length, removidos: n });
    }
    if (caminho === '/api/arquivo/migracao' && metodo === 'POST') return resposta({ ok: true });
    return resposta({ erro: 'Rota não encontrada' }, false);
  }
  return { fetch: fetchFalso, linhas, chamadas, corpos };
}

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

function montar(ls, ceu, extras) {
  const avisos = [];
  const sandbox = {
    localStorage: ls, fetch: ceu.fetch, WORKER_URL: 'https://w',
    vagas: [], contatos: [],
    indexedDB: { open() { const r = {}; setImmediate(() => r.onerror && r.onerror()); return r; } },
    _avisarGravacaoFalhou: motivo => avisos.push(String(motivo)),
    _limparAvisoGravacao() {},
    _descartarRestos() {}, _podarAutoBackups() {},
    JSON, Date, console, Promise, Set, Map, Error, Object, String, Array, Math, Number, Boolean,
    encodeURIComponent, URLSearchParams,
    // unref: o prazo de 20 s do transporte não pode segurar o processo do teste vivo.
    setTimeout: (f, ms) => { const h = setTimeout(f, ms); if (h && h.unref) h.unref(); return h; },
    clearTimeout, setImmediate,
  };
  sandbox.window = sandbox;
  sandbox.avisos = avisos;
  vm.createContext(sandbox);
  vm.runInContext([extrai('const Store = {')].concat(extras || []).join('\n'), sandbox);
  sandbox.ST = vm.runInContext('Store', sandbox);
  return sandbox;
}

// Cards de verdade: acento, aspas, quebra de linha e um objeto aninhado. É onde a serialização
// mal feita aparece — e onde ela já apareceu antes, no /api/vagas-lead.
function fabricar(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: 'vaga_' + String(i).padStart(4, '0'),
    empresa: 'Indústria Ação & Cia "' + i + '"',
    cargo: 'Gerente de Operações',
    status: 'arquivado',
    analise: { score: 70 + (i % 20), impedimentos: ['exige mudança'] },
    jobDescription: 'Descrição da vaga ' + i + '\nSegunda linha com acentuação: coordenação.\n"Aspas" e \\barras\\.',
  }));
}

const espera = () => new Promise(r => setImmediate(() => setImmediate(r)));
async function assentar(n) { for (let i = 0; i < (n || 60); i++) await espera(); }

async function main() {
  // ── 1. A mudança de casa: conferir a volta ANTES de liberar o espaço ────────
  console.log('=== a mudança de casa confere a volta antes de soltar o que é daqui ===');
  {
    const cards = fabricar(60);
    const vivo = { id: 'vaga_viva', empresa: 'Viva', status: 'lead' };
    const ls = armazenamento({ senova_vagas_v2: JSON.stringify(cards.concat([vivo])) });
    const ceu = nuvem('ok');
    const s = montar(ls, ceu);
    s.localStorage.setItem('senova_app_key', 'chave-de-teste');
    Object.assign(s.ST, { _frioCarregado: true, _frio: null, _rawFrio: null });
    s.vagas = cards.concat([vivo]);

    const r = await vm.runInContext('Store.mudarParaNuvem()', s);
    await assentar();

    t('a mudança se declara feita', r === 'feita', 'devolveu: ' + r);
    t('os 60 encerrados estão na nuvem', ceu.linhas.size === 60, ceu.linhas.size + ' linha(s)');
    t('a migalha ficou gravada', ls.getItem('senova_arquivo_na_nuvem') === '1');
    t('o app sabe que o arquivo mora lá', s.ST._frioNaNuvem === true);

    // O ganho de espaço, que é o motivo de tudo isto existir.
    const quente = ls.getItem('senova_vagas_v2');
    t('o bloco de processos deixou de carregar os encerrados',
      !quente.includes('vaga_0000') && quente.includes('vaga_viva'),
      'sobrou: ' + quente.slice(0, 120));
    t('e o bloco frio antigo saiu do localStorage',
      ls.getItem('senova_vagas_arquivadas_v1') === null);

    // O texto da vaga foi junto, e na coluna dele.
    const uma = ceu.linhas.get('vaga_0007');
    t('o texto da vaga subiu, separado do resto', !!uma && !!uma.descricao && uma.descricao.includes('coordenação'));
    t('e não ficou duplicado dentro do card', !uma.dados.includes('coordenação'));
    t('nada virou "[object Object]"',
      !Array.from(ceu.linhas.values()).some(l => String(l.dados).includes('[object Object]')));
  }

  // ── 2. A volta que não confere não apaga NADA ───────────────────────────────
  // O coração da regra da S40. Sem esta seção, "mudar de casa" seria só "mandar".
  console.log('\n=== volta adulterada: nada é apagado, nada é marcado ===');
  {
    const cards = fabricar(20);
    const ls = armazenamento({ senova_vagas_v2: JSON.stringify(cards) });
    const ceu = nuvem('ok');
    const s = montar(ls, ceu);
    s.localStorage.setItem('senova_app_key', 'k');
    Object.assign(s.ST, { _frioCarregado: true });
    s.vagas = cards.slice();

    // A nuvem devolve um card diferente do que recebeu — o cenário exato da perda
    // silenciosa: 200 OK em tudo, e o dado corrompido do outro lado.
    const fetchBom = ceu.fetch;
    s.fetch = function (url, op) {
      const p = fetchBom(url, op);
      if (String(url).includes('com_descricao=1')) {
        return p.then(r => r.json().then(j => {
          if (j.cards && j.cards.length) j.cards[0].dados = JSON.stringify({ id: 'vaga_0000', empresa: 'OUTRA COISA' });
          return { ok: true, json: () => Promise.resolve(j) };
        }));
      }
      return p;
    };

    const r = await vm.runInContext('Store.mudarParaNuvem()', s);
    await assentar();

    t('a mudança se recusa a concluir', r === 'conferencia_falhou', 'devolveu: ' + r);
    t('a migalha NÃO foi gravada', ls.getItem('senova_arquivo_na_nuvem') === null);
    t('o app continua tratando o arquivo como local', s.ST._naNuvem() === false);
    t('e os cards continuam onde estavam',
      String(ls.getItem('senova_vagas_v2')).includes('vaga_0019'));
  }

  // ── 3. Mexeram no arquivo no meio da mudança ────────────────────────────────
  // A mudança demora (654 cards, dezenas de idas). O usuário continua trabalhando. Uma
  // conferência feita sobre uma lista que já mudou não vale para o estado atual — e concluir
  // assim mesmo apagaria daqui um card que nunca chegou lá.
  console.log('\n=== arquivaram um processo no meio: desiste hoje, tenta amanhã ===');
  {
    const cards = fabricar(10);
    const ls = armazenamento({ senova_vagas_v2: JSON.stringify(cards) });
    const ceu = nuvem('ok');
    const s = montar(ls, ceu);
    s.localStorage.setItem('senova_app_key', 'k');
    Object.assign(s.ST, { _frioCarregado: true });
    s.vagas = cards.slice();

    const fetchBom = ceu.fetch;
    s.fetch = function (url, op) {
      // No meio da leitura de volta, o usuário arquiva mais um processo.
      if (String(url).includes('com_descricao=1')) {
        s.vagas = s.vagas.concat([{ id: 'vaga_nova', empresa: 'Nova', status: 'arquivado' }]);
      }
      return fetchBom(url, op);
    };

    const r = await vm.runInContext('Store.mudarParaNuvem()', s);
    await assentar();
    t('desiste em vez de concluir sobre uma lista velha', r === 'mexeram_no_meio', 'devolveu: ' + r);
    t('nada foi apagado daqui', String(ls.getItem('senova_vagas_v2')).includes('vaga_0009'));
    t('e a migalha não foi marcada', ls.getItem('senova_arquivo_na_nuvem') === null);
  }

  // ── 4. Nuvem muda no arranque: "não sei" ≠ "está vazio" ─────────────────────
  console.log('\n=== nuvem que não responde: o app admite que não sabe ===');
  {
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const ceu = nuvem('fora');
    const s = montar(ls, ceu);

    await vm.runInContext('Store.carregarFrio()', s);
    t('NÃO se declara carregado', s.ST._frioCarregado === false, '_frio=' + JSON.stringify(s.ST._frio));

    s.vagas = [{ id: 'nova', status: 'lead' }];
    const ok = vm.runInContext('Store.gravar()', s);
    await assentar(10);
    t('e por isso a gravação é recusada', ok === false);
    t('o usuário é avisado', s.avisos.length > 0, JSON.stringify(s.avisos));
    t('nada foi mandado para a nuvem', ceu.linhas.size === 0);
  }

  // ── 4b. Sem credencial é o mesmo caso: não dá para perguntar ────────────────
  console.log('\n=== sem chave de acesso, também não se afirma vazio ===');
  {
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1' });
    const s = montar(ls, nuvem('ok'));
    await vm.runInContext('Store.carregarFrio()', s);
    t('NÃO se declara carregado', s.ST._frioCarregado === false);
    t('e a gravação segue barrada', vm.runInContext('Store.gravar()', s) === false);
  }

  // ── 5. Controle positivo: nuvem que responde deixa o app pronto ─────────────
  // Sem esta seção, um `_frioCarregado=false` fixo passaria em tudo acima.
  console.log('\n=== nuvem que responde: o arquivo chega e o app grava ===');
  {
    const ceu = nuvem('ok');
    const cards = fabricar(30);
    cards.forEach(c => {
      const texto = { jobDescription: c.jobDescription };
      const leve = Object.assign({}, c); delete leve.jobDescription;
      ceu.linhas.set(c.id, { status: 'arquivado', atualizado: 1, dados: JSON.stringify(leve), descricao: JSON.stringify(texto) });
    });
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);

    await vm.runInContext('Store.carregarFrio()', s);
    t('o arquivo chegou', s.ST._frioCarregado === true);
    t('com os 30 cards', JSON.parse(s.ST._frio || '[]').length === 30);
    t('e sem o texto das vagas, que vem depois',
      !String(s.ST._frio).includes('coordenação'));
    t('o app sabe DE QUAIS cards ainda não conhece o texto', s.ST._descIgnotas.size === 30);

    // E agora o texto, em segundo plano.
    s.vagas = JSON.parse(s.ST._frio);
    const n = await vm.runInContext('Store.baixarDescricoes()', s);
    await assentar();
    t('as descrições chegaram', n === 30, 'chegaram ' + n);
    t('e foram parar no card certo, inteiras',
      s.vagas[7].jobDescription === cards[7].jobDescription,
      JSON.stringify(String(s.vagas[7].jobDescription).slice(0, 60)));
    t('já não há card com texto desconhecido', s.ST._descIgnotas.size === 0);

    // O texto que acabou de chegar não pode virar "diferença" e reenviar tudo.
    ceu.corpos.length = 0;
    t('gravar depois disso não reenvia o arquivo inteiro',
      vm.runInContext('Store.gravar()', s) === true);
    await assentar();
    t('e de fato não subiu nada', ceu.corpos.length === 0,
      JSON.stringify(ceu.corpos.map(c => c.cards.length)));
  }

  // ── 6. AUSÊNCIA NÃO É NEGAÇÃO ───────────────────────────────────────────────
  // A janela em que o card está em memória sem o texto. Uma gravação aqui não pode
  // afirmar "não tem descrição" — ela apagaria 45% do card no banco.
  console.log('\n=== gravar antes de o texto chegar NÃO apaga o texto que está lá ===');
  {
    const ceu = nuvem('ok');
    const cards = fabricar(3);
    cards.forEach(c => {
      const leve = Object.assign({}, c); delete leve.jobDescription;
      ceu.linhas.set(c.id, { status: 'arquivado', atualizado: 1,
        dados: JSON.stringify(leve), descricao: JSON.stringify({ jobDescription: c.jobDescription }) });
    });
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);
    await vm.runInContext('Store.carregarFrio()', s);

    // O usuário renomeia um processo encerrado ANTES de o texto ter chegado.
    s.vagas = JSON.parse(s.ST._frio);
    s.vagas[0].empresa = 'NOME NOVO';
    t('grava normalmente', vm.runInContext('Store.gravar()', s) === true);
    await assentar();

    const subiu = ceu.corpos[ceu.corpos.length - 1].cards[0];
    t('o pacote sobe SEM o campo da descrição',
      !Object.prototype.hasOwnProperty.call(subiu, 'descricao'),
      'subiu: ' + JSON.stringify(Object.keys(subiu)));
    // `abrir` e não JSON.parse cru: quando esta trava cai, a descrição vira null e um parse
    // aqui explodiria o arquivo inteiro — o teste morreria em vez de acusar. Um teste que
    // morde tem que morder COM NOME, senão quem quebrou não sabe o que quebrou.
    const abrir = txt => { try { return JSON.parse(txt); } catch (_) { return null; } };
    const guardada = abrir(ceu.linhas.get('vaga_0000').descricao);
    t('e o texto da vaga continua no banco, intacto',
      !!guardada && guardada.jobDescription === cards[0].jobDescription,
      'ficou: ' + JSON.stringify(ceu.linhas.get('vaga_0000').descricao));
    t('a alteração do usuário chegou lá', ceu.linhas.get('vaga_0000').dados.includes('NOME NOVO'));

    // Controle positivo: com o texto conhecido, o campo VAI — senão apagar de propósito
    // (o usuário limpou a descrição) nunca aconteceria.
    await vm.runInContext('Store.baixarDescricoes()', s);
    await assentar();
    s.vagas[1].jobDescription = '';
    vm.runInContext('Store.gravar()', s);
    await assentar();
    const depois = ceu.corpos[ceu.corpos.length - 1].cards[0];
    t('com o texto conhecido, o campo sobe',
      Object.prototype.hasOwnProperty.call(depois, 'descricao'));
    t('e a limpeza pedida pelo usuário vale',
      (abrir(ceu.linhas.get('vaga_0001').descricao) || {}).jobDescription === '');
  }

  // ── 7. Só o que mudou trafega ───────────────────────────────────────────────
  // O motivo de a mudança valer a pena: 6 MB por gesto foi o que encheu o localStorage.
  console.log('\n=== um card alterado manda um card, não o arquivo inteiro ===');
  {
    const ceu = nuvem('ok');
    const cards = fabricar(50);
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true,
      _frio: JSON.stringify(cards), _rawFrio: JSON.stringify(cards), _descIgnotas: new Set() });
    s.vagas = JSON.parse(JSON.stringify(cards));
    s.vagas[42].empresa = 'MUDOU';

    vm.runInContext('Store.gravar()', s);
    await assentar();
    const subiram = ceu.corpos.reduce((n, c) => n + c.cards.length, 0);
    t('subiu 1 card', subiram === 1, subiram + ' card(s)');
    t('e é o certo', ceu.linhas.has('vaga_0042') && ceu.linhas.size === 1);
  }

  // ── 8. O card que sai da lista sai da nuvem ─────────────────────────────────
  // Sem isto ele volta no arranque seguinte: o processo que o usuário apagou RESSUSCITA.
  console.log('\n=== processo removido não ressuscita no próximo arranque ===');
  {
    const ceu = nuvem('ok');
    const cards = fabricar(5);
    cards.forEach(c => ceu.linhas.set(c.id, { status: 'arquivado', atualizado: 1, dados: JSON.stringify(c), descricao: null }));
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true,
      _frio: JSON.stringify(cards), _rawFrio: JSON.stringify(cards), _descIgnotas: new Set() });
    s.vagas = cards.filter(c => c.id !== 'vaga_0002');

    vm.runInContext('Store.gravar()', s);
    await assentar();
    t('o card saiu da nuvem', !ceu.linhas.has('vaga_0002'));
    t('e só ele', ceu.linhas.size === 4, ceu.linhas.size + ' restante(s)');
  }

  // ── 8b. Sem referência confiável, não se deduz desaparecimento ──────────────
  // Depois de uma gravação falha, o app não sabe mais o que a nuvem tem. Deduzir
  // "sumiu" a partir de uma crença que ele mesmo admitiu não ter é apagar por palpite.
  console.log('\n=== depois de uma falha, nada é apagado por dedução ===');
  {
    const ceu = nuvem('ok');
    const cards = fabricar(5);
    cards.forEach(c => ceu.linhas.set(c.id, { status: 'arquivado', atualizado: 1, dados: JSON.stringify(c), descricao: null }));
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true,
      _frio: null, _rawFrio: null, _descIgnotas: new Set() });
    s.vagas = cards.slice(0, 2);      // a memória tem menos do que a nuvem

    vm.runInContext('Store.gravar()', s);
    await assentar();
    t('os 5 continuam lá', ceu.linhas.size === 5, ceu.linhas.size + ' restante(s)');
    t('e nenhuma remoção foi pedida',
      !ceu.chamadas.some(c => c.includes('/api/arquivo/remover')), JSON.stringify(ceu.chamadas));
  }

  // ── 9. Gravação que não chega: avisa e esquece o que achava saber ───────────
  console.log('\n=== gravação que não chega à nuvem é dita, não engolida ===');
  {
    const ceu = nuvem('grava-nao');
    const cards = fabricar(3);
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true,
      _frio: JSON.stringify(cards), _rawFrio: JSON.stringify(cards), _descIgnotas: new Set() });
    s.vagas = JSON.parse(JSON.stringify(cards));
    s.vagas[0].empresa = 'MUDOU';

    vm.runInContext('Store.gravar()', s);
    await assentar();
    t('o usuário é avisado, com o motivo certo', s.avisos.indexOf('nuvem') >= 0, JSON.stringify(s.avisos));
    t('e o app para de fingir que sabe o que há na nuvem', s.ST._rawFrio === null);

    // A consequência prática: a próxima gravação reenvia tudo, em vez de um diff errado.
    ceu.corpos.length = 0;
    const ceuBom = nuvem('ok');
    s.fetch = ceuBom.fetch;
    vm.runInContext('Store.gravar()', s);
    await assentar();
    t('a gravação seguinte reenvia o arquivo inteiro', ceuBom.linhas.size === 3, ceuBom.linhas.size + ' card(s)');
  }

  // ── 10. A cópia de segurança leva o arquivo junto ───────────────────────────
  // Rede de segurança que mente é pior que rede nenhuma: só se descobre no dia de usar.
  console.log('\n=== o backup exportado leva os processos encerrados ===');
  {
    const ceu = nuvem('ok');
    const cards = fabricar(4);
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const baixados = [];
    const s = montar(ls, ceu, [
      extrai('function _naoExportar('), extrai('function exportarDados('), extrai('async function _documentosManifesto('), extrai('async function _exportarDadosAgora('),
    ]);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true,
      _frio: JSON.stringify(cards), _rawFrio: JSON.stringify(cards), _descIgnotas: new Set() });
    s.vagas = JSON.parse(JSON.stringify(cards));
    s.Blob = function (partes) { baixados.push(String(partes[0])); };
    s.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
    s.document = { createElement: () => ({ click() {} }), getElementById: () => null };
    s.showToast = () => {}; s.alert = () => {};

    vm.runInContext('exportarDados()', s);
    await assentar();
    const copia = JSON.parse(baixados[0] || '{}');
    const arq = JSON.parse((copia.dados || {}).senova_vagas_arquivadas_v1 || '[]');
    t('a cópia traz os 4 encerrados', arq.length === 4, arq.length + ' na cópia');
    t('com o texto da vaga dentro', String((arq[0] || {}).jobDescription || '').includes('coordenação'));
    t('e sem a credencial', !('senova_app_key' in (copia.dados || {})));
  }

  // ── 10b. Cópia tirada antes de o texto chegar é RECUSADA ────────────────────
  // Sairia com 654 processos vazios por dentro e com cara de completa.
  console.log('\n=== não se exporta uma cópia que sairia sem o texto das vagas ===');
  {
    const ceu = nuvem('fora');
    const cards = fabricar(4);
    const ls = armazenamento({ senova_vagas_v2: '[]', senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const baixados = [], alertas = [];
    const s = montar(ls, ceu, [
      extrai('function _naoExportar('), extrai('function exportarDados('), extrai('async function _documentosManifesto('), extrai('async function _exportarDadosAgora('),
    ]);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true,
      _frio: JSON.stringify(cards), _rawFrio: JSON.stringify(cards),
      _descIgnotas: new Set(cards.map(c => c.id)) });
    s.vagas = JSON.parse(JSON.stringify(cards));
    s.Blob = function (partes) { baixados.push(String(partes[0])); };
    s.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
    s.document = { createElement: () => ({ click() {} }), getElementById: () => null };
    s.showToast = () => {}; s.alert = m => alertas.push(String(m));

    vm.runInContext('exportarDados()', s);
    await assentar();
    t('nenhum arquivo é gerado', baixados.length === 0);
    t('e a pessoa é avisada do porquê', alertas.length === 1 && /texto das vagas/i.test(alertas[0]),
      JSON.stringify(alertas));
  }

  // ── 11. Restaurar uma cópia manda a nuvem obedecer à cópia ──────────────────
  console.log('\n=== restaurar substitui o arquivo na nuvem, inclusive tirando o que sobra ===');
  {
    const ceu = nuvem('ok');
    fabricar(6).forEach(c => ceu.linhas.set(c.id, { status: 'arquivado', atualizado: 1, dados: JSON.stringify(c), descricao: null }));
    const ls = armazenamento({ senova_arquivo_na_nuvem: '1', senova_app_key: 'k' });
    const s = montar(ls, ceu);
    Object.assign(s.ST, { _frioCarregado: true, _frioNaNuvem: true });

    const daCopia = fabricar(2);      // a cópia só tinha 2 encerrados
    const r = await vm.runInContext('Store.substituirArquivoNaNuvem(COPIA)', Object.assign(s, { COPIA: daCopia }));
    await assentar();
    t('a substituição se declara feita', r === 'feita', 'devolveu: ' + r);
    t('a nuvem passou a ter só o que a cópia tinha', ceu.linhas.size === 2, ceu.linhas.size + ' card(s)');
    t('e são os certos', ceu.linhas.has('vaga_0000') && !ceu.linhas.has('vaga_0005'));
  }

  // ── 12. As razões escritas junto do código ──────────────────────────────────
  // Daqui a seis meses, quem mexer aqui precisa saber por que cada trava existe — senão
  // a primeira delas cai como "código defensivo demais".
  {
    console.log('\n=== a razão de cada trava está escrita ao lado dela ===');
    const store = extrai('const Store = {');
    t('a mudança de casa diz que confere antes de apagar',
      /mudarParaNuvem/.test(store) && /(conferid|de volta|antes de)/i.test(store));
    t('a regra da ausência está escrita', /[Aa]usência não é negação/.test(store));
    t('o arranque explica por que a mudança roda depois da tela',
      /DEPOIS da tela|depois que a tela/i.test(extrai('Store.carregarFrio().then(')));
  }

  fim('O ARQUIVO NA NUVEM — LADO DO APP');
}

main();
