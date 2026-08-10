// GUARD — o arquivo de processos encerrados vai para a nuvem INTEIRO, e tem dono.
//
// Por que este teste existe.
// Em 10/ago/2026 o navegador de Marcos encheu (10,0 MB) e o app parou de gravar. A saída é
// tirar o arquivo morto do computador e pô-lo no D1. Isso significa mover 654 processos —
// anos de trabalho dele — por cima de uma rede, com um passo que APAGA o original no fim.
// Todo defeito nesse caminho é perda de dado, não bug de tela.
//
// Um já apareceu na primeira execução das rotas, antes de qualquer dado real passar por elas:
// o card era gravado com `String(c.dados)`, e um objeto vira a palavra "[object Object]".
// A resposta era `200 {ok:true, gravados:7}`. Nenhum erro, nenhum log, nenhum sintoma — e o
// arquivo inteiro viraria sete palavras iguais. É a mesma família da cicatriz de
// /api/vagas-lead (senova-worker.js:996): de 280 vagas, só 26 ficaram com nota, e ninguém
// soube até alguém abrir.
//
// A REGRA DA S40, que não se negocia: o dado só sai do lugar antigo depois de ser lido de
// volta byte a byte igual. Este guard cobre a metade da nuvem — que a volta seja fiel, que
// nenhuma página pule um card, que "não consegui" nunca se pareça com "está vazio", e que o
// arquivo de uma pessoa não apareça para outra quando o Senova tiver três usuários.
//
// Comportamental de propósito, e com SQL DE VERDADE: o teste roda o código REAL das rotas
// (extraído do senova-worker.js) contra um SQLite real em memória (node:sqlite, embutido),
// com o esquema lido do próprio migrations/001_inicial.sql. Um banco de mentira responderia o
// que eu esperasse ouvir; este responde o que o SQLite responde — ON CONFLICT, LENGTH(),
// ordenação e tudo. E se o esquema mudar sem as rotas mudarem juntas, o teste quebra aqui.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { DatabaseSync } = require('node:sqlite');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const esquema = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_inicial.sql'), 'utf8');

// Extrai um bloco do Worker por balanceamento de chaves (mesma ideia do _lib.extrai, que lê
// o index.html). As rotas não são funções soltas: são blocos `if (path === ...) { }` dentro do
// fetch. Extraídos assim, é o código de produção que roda — não uma cópia que envelhece.
function trecho(assinatura) {
  const i = worker.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const ab = worker.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < worker.length; j++) { const c = worker[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return worker.slice(i, j + 1);
}

const ROTAS = [
  "if (path === '/api/arquivo' && request.method === 'GET')",
  "if (path === '/api/arquivo/descricao' && request.method === 'GET')",
  "if (path === '/api/arquivo' && request.method === 'POST')",
  "if (path === '/api/arquivo/conferencia' && request.method === 'GET')",
  "if (path === '/api/arquivo/migracao' && request.method === 'POST')",
];

// ── D1 de mentira por fora, SQLite de verdade por dentro ──────────────────────
// Só traduz a forma da chamada (prepare/bind/first/all/run/batch); quem responde é o SQLite.
function d1(sqlite) {
  const prep = (sql, args) => ({
    sql, args: args || [],
    bind(...a) { return prep(sql, a); },
    async first() { const r = sqlite.prepare(sql).get(...this.args); return r === undefined ? null : r; },
    async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
    async run() { sqlite.prepare(sql).run(...this.args); return { success: true }; },
  });
  return {
    prepare: sql => prep(sql, []),
    // batch é transação: ou o lote inteiro entra, ou nenhum. Meio lote gravado é o estado
    // que ninguém sabe consertar depois.
    async batch(lote) {
      sqlite.exec('BEGIN');
      try { for (const s of lote) sqlite.prepare(s.sql).run(...s.args); sqlite.exec('COMMIT'); }
      catch (e) { sqlite.exec('ROLLBACK'); throw e; }
      return lote.map(() => ({ success: true }));
    },
  };
}

// Monta o sandbox com o código real das rotas dentro de uma função despachante.
function montar(comBanco = true) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(esquema);
  const env = comBanco ? { SENOVA_DB: d1(sqlite) } : {};
  const sandbox = {
    CORS: {}, Response, Request, URL, TextEncoder, crypto, JSON, Date, Number, String,
    Object, Array, Math, Boolean, Error, console, parseInt, isNaN,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    trecho('function json('),
    trecho('async function _sha256hex('),
    trecho('async function donoAtual('),
    'async function despachar(metodo, caminho, params, corpo, chave) {',
    '  const url = new URL("https://x" + caminho + (params || ""));',
    '  const path = url.pathname;',
    '  const request = { method: metodo, headers: { get: h => h === "x-senova-key" ? chave : null },',
    '                    json: async () => corpo };',
    '  const env = __env;',
    ROTAS.map(trecho).join('\n'),
    '  return json({ erro: "Rota não encontrada" }, 404);',
    '}',
  ].join('\n'), sandbox);
  sandbox.__env = env;

  // Chamada de conveniência: devolve { status, corpo } já lido.
  const chamar = async (metodo, caminho, opts = {}) => {
    const r = await vm.runInContext('despachar', sandbox)(
      metodo, caminho, opts.params || '', opts.corpo || null,
      'chave' in opts ? opts.chave : 'CANARIO-CHAVE-DO-DONO');
    return { status: r.status, corpo: JSON.parse(await r.text()) };
  };
  return { chamar, sqlite };
}

// Um card como o app realmente tem: objeto aninhado, acento, aspas, quebra de linha.
const cardReal = n => ({
  id: 'vaga_' + String(n).padStart(3, '0'),
  cargo: 'Gerente de Operações — Região Sul',
  empresa: 'Construtora "São João" Ltda.',
  notas: 'Conversa com a Ana em 12/03.\nPediu retorno até sexta.',
  analise: { score: 78, pontos: ['inglês avançado', 'não exige mudança'] },
});
const abrir = txt => { try { return JSON.parse(txt); } catch (_) { return null; } };
const lote = (de, ate) => {
  const cards = [];
  for (let i = de; i <= ate; i++) {
    cards.push({
      card_id: 'vaga_' + String(i).padStart(3, '0'), status: 'arquivada',
      atualizado: 1700000000000 + i, dados: cardReal(i),
      descricao: 'DESCRIÇÃO LONGA DA VAGA ' + i + ' ' + 'x'.repeat(300),
    });
  }
  return { cards };
};

async function main() {
  // ── 1. Controle positivo: o card sai e volta INTEIRO ────────────────────────
  // Primeiro de tudo, e não por formalidade: sem ele, todo "não corrompeu" abaixo passaria
  // verde num banco que não gravou nada.
  console.log('=== o card volta da nuvem exatamente como saiu ===');
  {
    const { chamar } = montar();
    const env = await chamar('POST', '/api/arquivo', { corpo: lote(1, 3) });
    t('o lote foi aceito', env.status === 200 && env.corpo.gravados === 3, JSON.stringify(env.corpo));

    const lista = await chamar('GET', '/api/arquivo');
    t('os três voltaram', lista.corpo.cards.length === 3, String(lista.corpo.cards.length));

    // `abrir` em vez de JSON.parse direto: o defeito que este guard persegue grava a palavra
    // "[object Object]", e um parse cru estouraria a suíte inteira com um SyntaxError em vez
    // de dizer qual card voltou torto. Um teste que morde tem que morder com nome.
    const voltou = abrir(lista.corpo.cards[0].dados);
    t('o card voltou idêntico ao que saiu (objeto inteiro)',
      voltou && JSON.stringify(voltou) === JSON.stringify(cardReal(1)), lista.corpo.cards[0].dados);
    t('acento e aspas atravessaram a rede sem se perder',
      !!voltou && voltou.cargo.includes('Operações') && voltou.empresa.includes('"São João"'));
    t('a quebra de linha das notas dele continua lá', !!voltou && voltou.notas.includes('\n'));
    t('a análise aninhada não achatou', !!voltou && voltou.analise.score === 78 && voltou.analise.pontos.length === 2);
  }

  // ── 2. O defeito que este guard existe para impedir ─────────────────────────
  // `String({...})` === '[object Object]'. Silencioso, 200 OK, e o arquivo vira lixo.
  console.log('\n=== um card jamais vira a palavra "[object Object]" ===');
  {
    const { chamar, sqlite } = montar();
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 5) });
    const cru = sqlite.prepare('SELECT dados FROM cards').all().map(r => r.dados).join(' ');
    t('nenhuma linha gravada contém "[object Object]"', !cru.includes('[object Object]'),
      cru.slice(0, 120));
    t('e toda linha é JSON que abre de volta',
      sqlite.prepare('SELECT dados FROM cards').all().every(r => {
        try { return !!JSON.parse(r.dados).cargo; } catch (_) { return false; }
      }));
    // A rota também aceita `dados` já serializado — quem chama pode mudar. O que ela não faz
    // é aceitar em silêncio a forma errada.
    const jaTexto = await chamar('POST', '/api/arquivo', {
      corpo: { cards: [{ card_id: 'v_texto', status: 'arquivada', atualizado: 1, dados: '{"cargo":"veio pronto"}' }] },
    });
    t('dados já em texto continuam aceitos', jaTexto.status === 200);
    const um = sqlite.prepare('SELECT dados FROM cards WHERE card_id=?').get('v_texto');
    t('e chegam sem uma segunda camada de aspas', JSON.parse(um.dados).cargo === 'veio pronto', um.dados);
  }

  // ── 3. O que a rota RECUSA, em vez de gravar torto ──────────────────────────
  // Recusar em voz alta é a única forma de a migração poder confiar no "gravados: N".
  console.log('\n=== o que não dá para gravar direito é recusado, não maquiado ===');
  {
    const { chamar, sqlite } = montar();
    const semDados = await chamar('POST', '/api/arquivo', { corpo: { cards: [{ card_id: 'v1', status: 'x', atualizado: 1 }] } });
    t('card sem conteúdo é recusado (400)', semDados.status === 400 && semDados.corpo.erro === 'card_sem_dados',
      JSON.stringify(semDados.corpo));
    t('e não sobra um card vazio no banco',
      sqlite.prepare('SELECT COUNT(*) AS n FROM cards').get().n === 0);

    const descTorta = await chamar('POST', '/api/arquivo', { corpo: { cards: [{ card_id: 'v1', dados: {}, descricao: { a: 1 } }] } });
    t('descrição que não é texto é recusada', descTorta.status === 400 && descTorta.corpo.erro === 'descricao_invalida');

    const semId = await chamar('POST', '/api/arquivo', { corpo: { cards: [{ card_id: 'v_bom', dados: {} }, { dados: {} }] } });
    t('card sem id é recusado', semId.status === 400 && semId.corpo.erro === 'card_sem_id');
    t('e o lote inteiro fica de fora — nunca meio lote gravado',
      sqlite.prepare('SELECT COUNT(*) AS n FROM cards').get().n === 0);

    const gigante = { cards: [] };
    for (let i = 0; i < 201; i++) gigante.cards.push({ card_id: 'g' + i, dados: {} });
    t('lote acima do teto é recusado', (await chamar('POST', '/api/arquivo', { corpo: gigante })).status === 400);
  }

  // ── 4. Idempotência: a migração interrompida recomeça, não duplica ──────────
  // Aba fechada no meio, rede caindo, Marcos clicando duas vezes. O reenvio tem que ser inócuo.
  console.log('\n=== reenviar o mesmo lote não duplica nem corrompe ===');
  {
    const { chamar, sqlite } = montar();
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 10) });
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 10) });
    await chamar('POST', '/api/arquivo', { corpo: lote(5, 14) });   // sobreposto de propósito
    t('14 cards, não 24', sqlite.prepare('SELECT COUNT(*) AS n FROM cards').get().n === 14,
      String(sqlite.prepare('SELECT COUNT(*) AS n FROM cards').get().n));
    const um = sqlite.prepare('SELECT dados FROM cards WHERE card_id=?').get('vaga_007');
    t('o card reenviado continua íntegro', JSON.stringify(JSON.parse(um.dados)) === JSON.stringify(cardReal(7)));
  }

  // ── 5. Paginação: nenhuma página pula um card ───────────────────────────────
  // O cenário exato que OFFSET quebra: um card é gravado ENTRE duas páginas. Com OFFSET, a
  // janela desloca e um card do meio nunca aparece — e a conferência byte a byte acusaria a
  // falta sem dizer de quem. Ancorada em card_id, a varredura continua onde parou.
  console.log('\n=== a varredura cobre todos os cards, mesmo com gravação no meio ===');
  {
    const { chamar } = montar();
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 12) });
    const vistos = [];
    let apos = '', voltas = 0;
    for (;;) {
      const p = await chamar('GET', '/api/arquivo', { params: '?limite=5&apos=' + encodeURIComponent(apos) });
      p.corpo.cards.forEach(c => vistos.push(c.card_id));
      if (++voltas === 1) await chamar('POST', '/api/arquivo', { corpo: lote(20, 21) }); // chega gente no meio
      if (!p.corpo.tem_mais) break;
      apos = p.corpo.ultimo;
      if (voltas > 20) break;
    }
    t('nenhum card apareceu duas vezes', new Set(vistos).size === vistos.length, vistos.join(','));
    const faltando = [];
    for (let i = 1; i <= 12; i++) if (!vistos.includes('vaga_' + String(i).padStart(3, '0'))) faltando.push(i);
    t('nenhum dos 12 originais ficou para trás', faltando.length === 0, 'faltaram: ' + faltando.join(','));
    t('os que chegaram durante a varredura também vieram',
      vistos.includes('vaga_020') && vistos.includes('vaga_021'));
  }

  // ── 6. A descrição fica no banco até alguém abrir o card ────────────────────
  // 45% do peso de tudo (medido em 30/jul). Se ela viajasse na lista, a varredura de 654
  // cards puxaria megabytes que ninguém vai ler — e a migração levaria o dobro do tempo.
  console.log('\n=== a listagem não arrasta a descrição junto ===');
  {
    const { chamar } = montar();
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 3) });
    const lista = await chamar('GET', '/api/arquivo');
    t('a lista não traz a descrição', !JSON.stringify(lista.corpo).includes('DESCRIÇÃO LONGA'));
    const d = await chamar('GET', '/api/arquivo/descricao', { params: '?id=vaga_002' });
    t('mas ela está guardada e vem inteira quando pedida',
      d.status === 200 && d.corpo.descricao.includes('DESCRIÇÃO LONGA DA VAGA 2') && d.corpo.descricao.length > 300);
    const nada = await chamar('GET', '/api/arquivo/descricao', { params: '?id=nao_existe' });
    t('e card inexistente responde 404, não texto vazio', nada.status === 404 && nada.corpo.erro === 'nao_encontrado');
  }

  // ── 7. O arquivo tem dono ───────────────────────────────────────────────────
  // Com três usuários chegando, esta é a linha que não pode ser cruzada. O teste usa o MESMO
  // card_id nos dois donos de propósito: se alguma consulta esquecer o `user_id=?`, é aqui
  // que aparece. (O portão de credencial hoje é um segredo único — ver a seção 10.)
  console.log('\n=== o arquivo de uma pessoa nunca aparece para outra ===');
  {
    const { chamar, sqlite } = montar();
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 4) });
    sqlite.prepare('INSERT INTO usuarios (user_id,nome,chave_hash,criado_em,ativo) VALUES (?,?,?,?,1)')
      .run('outra-pessoa', 'Outra', 'hash-de-outra-pessoa', 1);
    sqlite.prepare('INSERT INTO cards (user_id,card_id,status,atualizado,dados,descricao) VALUES (?,?,?,?,?,?)')
      .run('outra-pessoa', 'vaga_002', 'arquivada', 9, '{"cargo":"CARD-DA-OUTRA-PESSOA"}', 'DESCRIÇÃO DA OUTRA PESSOA');

    // Controle positivo: o card da outra pessoa existe mesmo no banco.
    t('o card da outra pessoa está no banco (controle)',
      sqlite.prepare('SELECT COUNT(*) AS n FROM cards').get().n === 5);

    const lista = await chamar('GET', '/api/arquivo', { params: '?limite=500' });
    t('a lista dele não traz o card da outra', !JSON.stringify(lista.corpo).includes('CARD-DA-OUTRA-PESSOA'));
    t('e traz os quatro dele', lista.corpo.cards.length === 4, String(lista.corpo.cards.length));

    const conf = await chamar('GET', '/api/arquivo/conferencia');
    t('a conferência conta só os dele', conf.corpo.quantos === 4, String(conf.corpo.quantos));

    const d = await chamar('GET', '/api/arquivo/descricao', { params: '?id=vaga_002' });
    t('com o mesmo card_id, ele recebe a SUA descrição, não a dela',
      d.corpo.descricao.includes('VAGA 2') && !d.corpo.descricao.includes('OUTRA PESSOA'), d.corpo.descricao.slice(0, 60));
  }

  // ── 8. A marca d'água da mudança de casa ────────────────────────────────────
  console.log('\n=== a marca de "já conferi este bloco" é gravada e não duplica ===');
  {
    const { chamar, sqlite } = montar();
    await chamar('POST', '/api/arquivo', { corpo: lote(1, 3) });
    await chamar('POST', '/api/arquivo/migracao', { corpo: { bloco: 'arquivo_morto', conferido: true, quantos: 3 } });
    await chamar('POST', '/api/arquivo/migracao', { corpo: { bloco: 'arquivo_morto', conferido: true, quantos: 3 } });
    t('duas marcas do mesmo bloco viram uma',
      sqlite.prepare('SELECT COUNT(*) AS n FROM migracoes_dado').get().n === 1);
    const conf = await chamar('GET', '/api/arquivo/conferencia');
    t('a conferência devolve a marca', conf.corpo.migracoes.length === 1 && conf.corpo.migracoes[0].conferido === 1);
    t('e devolve o peso do que está lá, para comparar com o que saiu',
      conf.corpo.chars_dados > 0 && conf.corpo.chars_descricao > 0, JSON.stringify(conf.corpo));
    const semBloco = await chamar('POST', '/api/arquivo/migracao', { corpo: { conferido: true } });
    t('marca sem nome de bloco é recusada', semBloco.status === 400);
  }

  // ── 9. "Não consegui" não pode se parecer com "está vazio" ──────────────────
  // A regra da S40 vive ou morre aqui. Se o banco fora do ar respondesse 200 com lista vazia,
  // o app leria "o arquivo na nuvem está completo e tem zero cards" — e a migração apagaria
  // 654 processos do computador dele achando que já estavam salvos.
  console.log('\n=== banco fora do ar responde ERRO, nunca "arquivo vazio" ===');
  {
    const { chamar } = montar(false);
    for (const [m, c] of [['GET', '/api/arquivo'], ['GET', '/api/arquivo/descricao'], ['POST', '/api/arquivo'],
                          ['GET', '/api/arquivo/conferencia'], ['POST', '/api/arquivo/migracao']]) {
      const r = await chamar(m, c, { params: c.includes('descricao') ? '?id=x' : '', corpo: { cards: [], bloco: 'b' } });
      t(m + ' ' + c + ' devolve 503, não 200 vazio', r.status === 503 && r.corpo.erro === 'banco_indisponivel',
        r.status + ' ' + JSON.stringify(r.corpo));
    }
  }

  // ── 10. As rotas do arquivo exigem credencial ───────────────────────────────
  // Elas servem o acervo de processos de uma pessoa: a coisa mais privada que o Senova guarda.
  // A lista de isenção do Worker é de PERMISSÃO (ver testes/rotas_protegidas.js); o que este
  // teste garante é que nenhuma das cinco entrou nela por descuido.
  console.log('\n=== nenhuma rota do arquivo é isenta de credencial ===');
  {
    const i = worker.indexOf('const ROTAS_SEM_SEGREDO');
    const isentas = worker.slice(i, worker.indexOf(']);', i));
    t('o bloco de isenção foi lido (controle)', i > 0 && isentas.length > 20);
    t('nenhuma rota /api/arquivo aparece entre as isentas', !isentas.includes('/api/arquivo'),
      isentas.slice(0, 200));
  }

  // ── 11. A razão fica escrita ao lado do código ──────────────────────────────
  // O `String(c.dados)` era a forma óbvia e curta. Alguém vai querer encurtar de novo.
  console.log('\n=== a razão está escrita junto de quem tem que ler ===');
  {
    const post = trecho("if (path === '/api/arquivo' && request.method === 'POST')");
    t('a gravação explica por que serializa em vez de String()',
      /object Object/.test(post), post.slice(0, 200));
    const get = trecho("if (path === '/api/arquivo' && request.method === 'GET')");
    t('a listagem explica por que a paginação não usa OFFSET', /OFFSET/.test(get));
  }

  fim('ARQUIVO NA NUVEM · VAI INTEIRO E TEM DONO');
}

main().catch(e => { console.error(e); process.exit(1); });
