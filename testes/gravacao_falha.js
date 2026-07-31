// A gravação nunca falha calada (S40).
//
// O bug real, relatado por Marcos: "sumiram na segunda coluna e reaparecem na
// primeira". Não era backup antigo ressuscitando. A gravação engolia o
// QuotaExceededError num catch vazio: a tela seguia mostrando o estado em
// memória (a Oportunidade já em "CV Enviado") enquanto o disco guardava o
// estado anterior. No recarregamento seguinte, o disco vencia.
//
// Hoje quem grava é o Store, e este teste fixa as garantias dele:
//   1. os autobackups são sacrificados ANTES de desistir;
//   2. se ainda assim falhar, a pessoa é avisada e recebe a saída (baixar cópia);
//   3. se o dado guardado ficar ILEGÍVEL, os bytes são preservados e — quando nem
//      a cópia couber — a gravação TRAVA, em vez de apagar o que sobrou;
//   4. saveVagas NUNCA lança — são 56 pontos de chamada no app.

const { extrai, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

// ── localStorage falso, com os três regimes que importam ──────────────────────
// 'ok'              → grava sempre
// 'cheio'           → estoura sempre (nem podar resolve)
// 'cheio_ate_podar' → estoura enquanto houver autobackup; passa depois da poda
// 'cheio_ate_restos'→ estoura enquanto houver resto de versão antiga
function fakeLS(regime) {
  const ls = {
    setItem(k, v) {
      const temBackup = Object.keys(ls).some(x => x.startsWith('senova_autobackup_'));
      const temResto = Object.keys(ls).some(x => x.startsWith('senova_pre_restauro_')
        || (x.startsWith('senova_logo_cache_v') && x !== 'senova_logo_cache_v5'));
      if (regime === 'cheio'
        || (regime === 'cheio_ate_podar' && temBackup)
        || (regime === 'cheio_ate_restos' && temResto)) {
        const e = new Error('exceeded the quota'); e.name = 'QuotaExceededError'; throw e;
      }
      ls[k] = String(v);
    },
    getItem(k) { return typeof ls[k] === 'string' ? ls[k] : null; },
    removeItem(k) { delete ls[k]; },
  };
  return ls;
}

// ── DOM falso: só o que _avisarGravacaoFalhou toca ────────────────────────────
function fakeDOM() {
  const porId = {};
  const novo = (tag) => ({
    tagName: tag, id: '', innerHTML: '', textContent: '', style: { cssText: '', display: '' },
    _handlers: {}, _filhos: {},
    addEventListener(ev, fn) { this._handlers[ev] = fn; },
    querySelector(sel) {
      const id = sel.replace('#', '');
      if (!this._filhos[id]) this._filhos[id] = novo('div');
      return this._filhos[id];
    },
  });
  return {
    getElementById: (id) => porId[id] || null,
    createElement: novo,
    body: { appendChild(el) { if (el.id) porId[el.id] = el; } },
  };
}

function montar(regime, comBackups = true) {
  const fontes = [
    'const Store = {',
    'function _podarAutoBackups(',
    'function _restosDescartaveis(',
    'function _descartarRestos(',
    'function _medirArmazenamento(',
    'function _avisarGravacaoFalhou(',
    'function _limparAvisoGravacao(',
    'function saveVagas(',
  ].map(extrai).join('\n;\n');

  const ls = fakeLS(regime);
  if (comBackups) { ls['senova_autobackup_2026-07-28'] = '{}'; ls['senova_autobackup_2026-07-29'] = '{}'; }

  const chamadas = { exportar: 0 };
  const sandbox = {
    _avisoGravacaoAtivo: false,
    _ultimaFalhaGravacao: null,
    vagas: [{ id: 1, empresa: 'Teste', status: 'aplicado' }],
    contatos: [{ id: 1, nome: 'Teste' }],
    localStorage: ls,
    _LOGO_CACHE_KEY: 'senova_logo_cache_v5',   // o cache atual; v1..v4 são restos
    document: fakeDOM(),
    exportarDados() { chamadas.exportar++; },
    updateBadge() {}, atualizarStatsHome() {}, renderHomeAcoes() {},
    atualizarSinais() {}, renderIndicacoesHome() {},
    JSON, Object, Date, console, Error,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  return { sandbox, ls, chamadas, run: (expr) => vm.runInContext(expr, sandbox) };
}

const banner = (s) => s.document.getElementById('aviso-gravacao');
const avisoVisivel = (s) => { const el = banner(s); return !!el && el.style.display !== 'none'; };
const tituloAviso = (s) => { const el = banner(s); return el ? el.querySelector('#aviso-gravacao-titulo').textContent : ''; };
const corpoAviso = (s) => { const el = banner(s); return el ? el.querySelector('#aviso-gravacao-corpo').textContent : ''; };
const medidaAviso = (s) => { const el = banner(s); return el ? el.querySelector('#aviso-gravacao-medida').textContent : ''; };

console.log('=== caminho normal: grava e não incomoda ninguém ===');
{
  const { sandbox, ls, run } = montar('ok');
  run('saveVagas()');
  t('gravou de fato no armazenamento', ls.getItem('senova_vagas_v2') !== null);
  t('nenhum aviso aparece', !avisoVisivel(sandbox));
  t('os autobackups continuam intactos', Object.keys(ls).filter(k => k.startsWith('senova_autobackup_')).length === 2);
}

console.log('\n=== cota apertou: sacrifica os autobackups ANTES de desistir ===');
{
  const { sandbox, ls, run } = montar('cheio_ate_podar');
  run('saveVagas()');
  t('gravou na segunda tentativa', ls.getItem('senova_vagas_v2') !== null);
  t('os autobackups foram descartados para abrir espaço', Object.keys(ls).filter(k => k.startsWith('senova_autobackup_')).length === 0);
  t('não avisa à toa — a gravação deu certo', !avisoVisivel(sandbox));
}

console.log('\n=== o bug original: cota cheia de verdade → NUNCA mais em silêncio ===');
{
  const { sandbox, ls, run } = montar('cheio');
  let lancou = false;
  try { run('saveVagas()'); } catch (_) { lancou = true; }
  t('saveVagas não lança (56 pontos de chamada dependem disso)', !lancou);
  t('NÃO gravou — e é justamente por isso que precisa avisar', ls.getItem('senova_vagas_v2') === null);
  t('a pessoa é avisada', avisoVisivel(sandbox));
  t('o aviso diz que o trabalho não foi salvo', /não consegui salvar/i.test(tituloAviso(sandbox)));
  t('o aviso nomeia a causa: armazenamento cheio', /cheio/i.test(corpoAviso(sandbox)));
  t('o aviso oferece a saída: baixar uma cópia', /Baixar uma cópia agora/.test(banner(sandbox).innerHTML));
}

console.log('\n=== a escada do descartável: restos primeiro, trabalho do usuário NUNCA ===');
{
  // Medido no app real de Marcos em 30/jul: uma chave 'senova_pre_restauro_' de
  // uma restauração encerrada havia meses, mais quatro caches de logotipo de
  // versões velhas, somavam ~15% de todo o espaço — segurando trabalho que já
  // não cabia. Nenhuma linha do código lia qualquer uma delas.
  const { sandbox, ls, run } = montar('cheio_ate_restos');
  ls['senova_pre_restauro_1782309412089'] = 'x'.repeat(700000);
  ls['senova_logo_cache_v1'] = 'a'; ls['senova_logo_cache_v4'] = 'b';
  ls['senova_logo_cache_v5'] = '{"Acme":"u"}';

  run('saveVagas()');
  t('gravou depois de descartar os restos', ls.getItem('senova_vagas_v2') !== null);
  t('o resto da restauração antiga saiu', ls.getItem('senova_pre_restauro_1782309412089') === null);
  t('os caches de logotipo velhos saíram', ls.getItem('senova_logo_cache_v1') === null && ls.getItem('senova_logo_cache_v4') === null);
  t('o cache de logotipo ATUAL fica — está em uso', ls.getItem('senova_logo_cache_v5') !== null);
  t('não precisou sacrificar os autobackups: o resto bastou',
    Object.keys(ls).filter(k => k.startsWith('senova_autobackup_')).length === 2);
  t('não avisa à toa — a gravação deu certo', !avisoVisivel(sandbox));
}
{
  // A trava que importa: a escada é de descartáveis. Processos, contatos e o
  // resgate de dado ilegível não são descartáveis em hipótese alguma.
  const { ls, run } = montar('cheio', false);
  ls['senova_vagas_v2'] = 'processos reais';
  ls['senova_contatos_v2'] = 'contatos reais';
  ls['senova_ilegivel_vagas_v2_123'] = 'resgate';
  ls['senova_revisao_pendente'] = 'vagas para considerar';
  run('_descartarRestos()');
  t('não toca nos processos', ls.getItem('senova_vagas_v2') === 'processos reais');
  t('não toca nos contatos', ls.getItem('senova_contatos_v2') === 'contatos reais');
  t('não toca no resgate de dado ilegível', ls.getItem('senova_ilegivel_vagas_v2_123') === 'resgate');
  t('não toca nas vagas para considerar', ls.getItem('senova_revisao_pendente') === 'vagas para considerar');
}

console.log('\n=== o aviso de cota NOMEIA o que está ocupando o espaço ===');
{
  // Dizer "está cheio" sem dizer do quê deixa a pessoa sem o que decidir — e
  // obrigaria a abrir ferramentas de desenvolvedor, que é justamente o que
  // ninguém deve precisar fazer para usar o Senova.
  const { sandbox, ls, run } = montar('cheio');
  ls['senova_vagas_v2'] = 'x'.repeat(1600000);          // ~3,2 MB
  ls['senova_revisao_pendente'] = 'y'.repeat(600000);   // ~1,2 MB
  ls['senova_autobackup_2026-07-30'] = 'z'.repeat(900000);
  run('saveVagas()');

  const m = medidaAviso(sandbox);
  t('o aviso informa quanto está ocupado', /Ocupado agora: \d+,\d MB/.test(m), m);
  t('nomeia o maior ocupante primeiro', /pesa: seus processos/.test(m), m);
  t('nomeia também as vagas para considerar', /vagas para considerar/.test(m), m);
  t('usa o nome do usuário, nunca o nome da chave', !/senova_/.test(m), m);
  t('as cópias automáticas já não contam — foram descartadas antes de desistir',
    !/cópias automáticas/.test(m), m);
  // Saber QUE falhou não basta: sem o tamanho do bloco recusado não dá para
  // distinguir "o total estourou" de "esta gravação é grande demais", e o
  // conserto é diferente em cada caso.
  t('registra o tamanho do bloco que o navegador recusou', /de \d+,\d MB de uma vez/.test(m), m);
  // O tamanho sozinho já mandou o diagnóstico para o lado errado uma vez: "4,2 MB"
  // sem sujeito não diz se travou nos processos vivos ou no arquivo morto, e o
  // conserto é outro em cada caso.
  t('e NOMEIA o bloco, não só o tamanho', /Recusou o bloco dos seus processos/.test(m), m);
  t('e diz qual chave falhou, para o diagnóstico',
    run('_ultimaFalhaGravacao && _ultimaFalhaGravacao.chave') === 'senova_vagas_v2');
}
{
  const { sandbox, ls, run } = montar('cheio');
  ls['senova_vagas_v2'] = 'x'.repeat(1600000);
  ls['senova_vagas_v2'] = '{{{ ilegível';
  run('Store.socorrer()');
  t('na falha de LEITURA a medida não aparece — espaço não é o problema ali',
    medidaAviso(sandbox) === '', medidaAviso(sandbox));
}

console.log('\n=== dado ilegível: preserva os bytes, avisa, e NÃO apaga o que sobrou ===');
{
  const { sandbox, ls, run } = montar('ok', false);
  ls['senova_vagas_v2'] = '{{{ lixo não parseável';
  ls['senova_contatos_v2'] = ']]] também quebrado';
  run('Store.socorrer()');
  const copias = Object.keys(ls).filter(k => k.startsWith('senova_ilegivel_'));
  t('guardou cópia dos processos ilegíveis', copias.some(k => k.includes('vagas_v2')));
  t('guardou cópia dos contatos ilegíveis (não só das vagas)', copias.some(k => k.includes('contatos_v2')));
  t('a pessoa é avisada', avisoVisivel(sandbox));
  t('a mensagem é a de LEITURA, não a de cota', /não consegui ler/i.test(tituloAviso(sandbox)));
  t('a cópia foi preservada, então gravar segue liberado', run('Store.travado') === false);
}

console.log('\n=== ilegível E sem espaço para a cópia: TRAVA em vez de destruir ===');
{
  const { sandbox, ls, run } = montar('cheio', false);
  ls['senova_vagas_v2'] = '{{{ lixo não parseável';
  run('Store.socorrer()');
  t('travou a gravação', run('Store.travado') === true);
  t('gravar() recusa enquanto travado', run('Store.gravar()') === false);
  t('os bytes originais continuam no disco, intactos', ls.getItem('senova_vagas_v2') === '{{{ lixo não parseável');
  t('a mensagem é a de leitura', /não consegui ler/i.test(tituloAviso(sandbox)));
}

console.log('\n=== usuário novo: armazenamento vazio não é acidente, não avisa nada ===');
{
  const { sandbox, run } = montar('ok', false);
  run('Store.socorrer()');
  t('sem dado guardado, nenhum alarme falso', !avisoVisivel(sandbox));
  t('e nada trava', run('Store.travado') === false);
}

console.log('\n=== idempotência: 56 gravações falhas não viram 56 avisos ===');
{
  const { sandbox, run } = montar('cheio');
  let criados = 0;
  const orig = sandbox.document.createElement;
  sandbox.document.createElement = (tag) => { criados++; return orig(tag); };
  for (let i = 0; i < 56; i++) run('saveVagas()');
  t('um único aviso foi criado, não 56', criados === 1, 'criados=' + criados);
}

console.log('\n=== o aviso não mente: some quando resolve, volta quando falha ===');
{
  const { sandbox, run } = montar('cheio');
  run('saveVagas()');
  t('avisando (cota cheia)', avisoVisivel(sandbox));

  sandbox.localStorage.setItem = function (k, v) { sandbox.localStorage[k] = String(v); }; // espaço liberado
  run('saveVagas()');
  t('gravação voltou a funcionar → aviso some sozinho', !avisoVisivel(sandbox));
  // A falha registrada morre junto com o aviso. Se sobrevivesse, a PRÓXIMA tarja
  // mostraria o tamanho de uma recusa velha — um número verdadeiro descrevendo o
  // momento errado, que foi exatamente o que atrapalhou o diagnóstico em 30/jul.
  t('e a falha registrada é esquecida, para não contaminar o próximo aviso',
    run('_ultimaFalhaGravacao') === null);
}
{
  const { sandbox, run } = montar('cheio');
  run('saveVagas()');
  banner(sandbox).querySelector('#aviso-gravacao-fechar')._handlers.click();
  t('fechar esconde o aviso', !avisoVisivel(sandbox));
  run('saveVagas()');
  t('a próxima gravação que falha traz o aviso de volta', avisoVisivel(sandbox));
}

console.log('\n=== contatos têm a mesma proteção (tinham o mesmo catch vazio) ===');
{
  const { sandbox, ls, run } = montar('ok');
  t('gravarContatos grava', run('Store.gravarContatos()') === true && ls.getItem('senova_contatos_v2') !== null);
}
{
  const { sandbox, run } = montar('cheio');
  t('gravarContatos falha sem lançar', run('Store.gravarContatos()') === false);
  t('e avisa, em vez de engolir', avisoVisivel(sandbox));
}

console.log('\n=== o botão de saída usa a exportação já aprovada ===');
{
  const { sandbox, chamadas, run } = montar('cheio');
  run('saveVagas()');
  banner(sandbox).querySelector('#aviso-gravacao-baixar')._handlers.click();
  t('"Baixar uma cópia agora" chama exportarDados (não inventa caminho novo)', chamadas.exportar === 1);
}

console.log('\n=== o código-fonte: as regressões que trariam o bug de volta ===');
{
  const store = extrai('const Store = {');
  t('o Store ainda poda os autobackups antes de desistir', /_podarAutoBackups\(0\)/.test(store));
  t('o Store avisa em vez de engolir o erro', /_avisarGravacaoFalhou/.test(store));
  t('a trava existe e é consultada antes de escrever', /travado/.test(store) && /if\(this\.travado\) return false/.test(store));
  t('saveVagas delega ao Store (não grava por conta própria)',
    /Store\.gravar\(\)/.test(extrai('function saveVagas(')));
}

fim('GRAVAÇÃO NUNCA FALHA CALADA');
