// A extensão fala com a aba do Senova que RESPONDE — não com a primeira que achar.
//
// Por que existe (20/out/2026): o copiloto dizia "Abra o Senova numa aba e recarregue esta
// página" com o Senova aberto e saudável. background.js fazia tabs.find(startsWith(APP_URL)) em
// ~15 lugares: pegava a PRIMEIRA aba do Senova na ordem das janelas — uma aba travada de mais cedo
// — e a aba boa, aberta depois, nunca era usada. Reabrir o Senova não resolvia.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8').replace(/\r\n/g, '\n');
const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
let ok = 0, total = 0;
function t(nome, cond, extra) { total++; if (cond) ok++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}${!cond && extra ? ' — ' + extra : ''}`); }

console.log('=== um ponto só escolhe a aba ===');
t('nenhum tabs.find(startsWith(APP_URL)) sobrou no background', !/\.find\(t => t\.url && t\.url\.startsWith\(APP_URL\)\)/.test(bg));
t('existe _abaSenova()', /async function _abaSenova\(\)/.test(bg));
const usos = (bg.match(/await _abaSenova\(\)/g) || []).length;
t('os chamadores usam _abaSenova (≥ 14)', usos >= 14, 'usos=' + usos);

const ini = bg.indexOf('const _APP_RE');
const fim = bg.indexOf('\n}\n', bg.indexOf('async function _abaSenova()')) + 3;
const helper = bg.slice(ini, fim);

function mundo(abas, vivas, acordaAoRecarregar) {
  const sondadas = [], recarregadas = [];
  let relogio = 0;                                   // relógio falso: a espera de 15 s roda em ms
  const sb = {
    Promise, setTimeout: (f, ms) => { relogio += ms; return setTimeout(f, 1); },
    Date: { now: () => relogio },
    chrome: {
      tabs: { query: async () => abas,
              reload: async id => { recarregadas.push(id); if (acordaAoRecarregar) vivas.push(id); } },
      scripting: { executeScript: ({ target }) => {
        sondadas.push(target.tabId);
        if (vivas.includes(target.tabId)) return Promise.resolve([{ result: true }]);
        if (target.tabId === 99) return Promise.reject(new Error('Frame with ID 0 is showing error page'));
        return new Promise(() => {}); // renderer pendurado: nunca resolve
      } },
    },
  };
  vm.createContext(sb);
  vm.runInContext(helper + '\n;this._abaSenova=_abaSenova;', sb);
  return { escolher: () => sb._abaSenova(), sondadas, recarregadas };
}

(async () => {
  console.log('\n=== a aba travada vem primeiro; a boa, depois ===');
  {
    const m = mundo([
      { id: 1, url: 'https://marcos-mco.github.io/senova/?v=ab99fb6-a', active: false, lastAccessed: 100 },
      { id: 2, url: 'https://marcos-mco.github.io/senova/', active: false, lastAccessed: 50 },
    ], [2]);
    const a = await m.escolher();
    t('escolhe a aba que responde (2), não a primeira (1)', a && a.id === 2, a && a.id);
  }

  console.log('\n=== descartada, congelada, página de erro e o que não é o app ficam de fora ===');
  {
    const m = mundo([
      { id: 3, url: 'https://marcos-mco.github.io/senova/', discarded: true, lastAccessed: 900 },
      { id: 4, url: 'https://marcos-mco.github.io/senova/', frozen: true, lastAccessed: 800 },
      { id: 5, url: 'https://marcos-mco.github.io/senova_v12_2026.html', lastAccessed: 700 },
      { id: 99, url: 'https://marcos-mco.github.io/senova/', lastAccessed: 600 },
      { id: 6, url: 'https://marcos-mco.github.io/senova/?page=crm#x', lastAccessed: 10 },
    ], [6]);
    const a = await m.escolher();
    t('escolhe a 6', a && a.id === 6, a && a.id);
    t('nem sonda descartada, congelada ou senova_v12.html', !m.sondadas.some(i => [3, 4, 5].includes(i)), m.sondadas.join(','));
  }

  console.log('\n=== prefere a ativa, depois a mais recente ===');
  {
    const m = mundo([
      { id: 7, url: 'https://marcos-mco.github.io/senova/', active: false, lastAccessed: 900 },
      { id: 8, url: 'https://marcos-mco.github.io/senova/', active: true, lastAccessed: 1 },
    ], [7, 8]);
    const a = await m.escolher();
    t('a ativa vence', a && a.id === 8, a && a.id);
  }

  console.log('\n=== aba congelada pelo Chrome (21/out): recarrega a mais recente e espera ===');
  {
    const m = mundo([
      { id: 1, url: 'https://marcos-mco.github.io/senova/', frozen: true, lastAccessed: 900 },
      { id: 2, url: 'https://marcos-mco.github.io/senova/', frozen: true, lastAccessed: 10 },
    ], [], true);
    const a = await m.escolher();
    t('acorda a aba mais recente (1) e a usa', a && a.id === 1, a && a.id);
    t('recarrega UMA aba só (nunca abre outra: dois gravadores)', m.recarregadas.join() === '1', m.recarregadas.join());
  }

  console.log('\n=== recarregou e mesmo assim não respondeu → null (vira "Abra o Senova") ===');
  {
    const m = mundo([{ id: 1, url: 'https://marcos-mco.github.io/senova/' }], [], false);
    const a = await m.escolher();
    t('devolve null sem pendurar', a === null);
  }

  console.log('\n=== nenhuma aba do Senova → null, sem recarregar nada ===');
  {
    const m = mundo([{ id: 9, url: 'https://example.com/' }], [], true);
    const a = await m.escolher();
    t('null e nenhuma recarga', a === null && m.recarregadas.length === 0);
  }

  console.log('\n=== painel órfão (extensão atualizada) diz a verdade ===');
  t('o copiloto distingue extensão atualizada de Senova fechado', /chrome\.runtime && chrome\.runtime\.id\)\) erroMsg = 'A extensão foi atualizada/.test(ct));

  console.log('\n──────────────────────────────');
  console.log(`ABA DO SENOVA VIVA: ${ok}/${total} ${ok === total ? '✓' : '✗'}`);
  if (ok !== total) process.exit(1);
})();
