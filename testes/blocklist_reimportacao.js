// A blocklist de reimportação — a metade invisível de apagar uma Oportunidade (S45).
//
// O radar reimporta do KV todo dia. Quando Marcos apaga uma Oportunidade, o id
// dela fica numa blocklist para que ela não volte sozinha amanhã. Apagar sem
// anotar não é apagar: é adiar.
//
// O DEFEITO MEDIDO (S44, senova-auditor). Três lugares gravavam nessa lista com
// regras próprias: um com `push` + `slice(-500)`, dois com Set sem teto nenhum.
// A lista já estava em 492 de 500. A limpeza autorizada por Marcos registraria
// 859 ids de uma vez — e o `slice(-500)` expulsaria pela porta dos fundos os 492
// antigos. Resultado: 441 vagas apagadas há meses voltariam no primeiro F5, e a
// limpeza pareceria feita enquanto se desfazia sozinha.
//
// E a segunda armadilha, irmã da S43: gravar é o que pode falhar. Com a cota
// estourada, `setItem` cru joga e o `catch{}` engole — o card some da tela e o
// Senova acha que anotou. Aqui a gravação DIZ se falhou.

const { extrai, html, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

function fakeLS(limiteChars) {
  const ls = {
    setItem(k, v) {
      v = String(v);
      const usado = Object.keys(ls).filter(x => typeof ls[x] === 'string')
        .reduce((s, x) => s + (x === k ? 0 : ls[x].length), 0);
      if (limiteChars && usado + v.length > limiteChars) {
        const e = new Error('exceeded the quota'); e.name = 'QuotaExceededError'; throw e;
      }
      ls[k] = v;
    },
    getItem(k) { return typeof ls[k] === 'string' ? ls[k] : null; },
    removeItem(k) { delete ls[k]; },
  };
  return ls;
}

function montar(limiteChars) {
  const fontes = [
    'const Store = {',
    'function _restosDescartaveis(',
    'function _descartarRestos(',
    'function _podarAutoBackups(',
  ].map(extrai).join('\n;\n');

  const sandbox = {
    vagas: [], contatos: [],
    localStorage: fakeLS(limiteChars),
    _LOGO_CACHE_KEY: 'senova_logo_cache_v5',
    _avisarGravacaoFalhou() {}, _limparAvisoGravacao() {},
    JSON, Object, Date, console, Error, String, Set, Array,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  vm.runInContext('Store._frioCarregado=true', sandbox);
  const rodar = expr => vm.runInContext(expr, sandbox);
  return { rodar, lista: () => JSON.parse(sandbox.localStorage.getItem('senova_deleted_ids') || '[]') };
}

console.log('=== 1. ponto único: ninguém mais grava na blocklist por fora ===');
{
  // O Store usa this.CHAVE_DELETADAS — nunca o literal. Qualquer chamada de
  // armazenamento com a chave escrita à mão é uma regra paralela nascendo.
  const atalhos = html.match(/localStorage\.\w+Item\(\s*'senova_deleted_ids'/g) || [];
  t('nenhuma leitura/gravação da blocklist passa por fora do Store', atalhos.length === 0,
    atalhos.length + ' atalho(s) encontrado(s)');

  const store = extrai('const Store = {');
  t('o Store declara a chave da blocklist', /CHAVE_DELETADAS:\s*'senova_deleted_ids'/.test(store));
  t('o Store sabe ler, registrar e limpar', /\bdeletados\(\)/.test(store)
    && /\bregistrarDeletado\(/.test(store) && /\blimparDeletados\(\)/.test(store));

  // O `slice(-500)` era o defeito. Se voltar, este teste morre junto com a limpeza.
  // (Olha só o corpo de quem grava — o comentário acima da função cita o número
  // antigo de propósito, para explicar o que aconteceu.)
  const escrita = store.slice(store.indexOf('registrarDeletado('), store.indexOf('limparDeletados('));
  t('o corte por 500 saiu de quem grava a blocklist', !/slice\(-500\)/.test(escrita));
  t('o teto folgado está declarado e é o que corta', /TETO_DELETADAS:\s*3000/.test(store)
    && /slice\(-this\.TETO_DELETADAS\)/.test(escrita));
}

console.log('\n=== 2. anotar de verdade: o id registrado é o id lido de volta ===');
{
  const { rodar, lista } = montar();
  t('lista nasce vazia', rodar('Store.deletados().size') === 0);

  rodar('Store.registrarDeletado("vaga_1")');
  t('aceita um id solto', rodar('Store.deletados().has("vaga_1")') === true);

  rodar('Store.registrarDeletado(["vaga_2","vaga_3"])');
  t('aceita uma lista de ids', rodar('Store.deletados().has("vaga_2")') && rodar('Store.deletados().has("vaga_3")'));

  // Chamar de novo não pode apagar o que já estava — era o risco de ter três
  // escritas com regras diferentes conversando com a mesma chave.
  t('registrar de novo não perde os anteriores', rodar('Store.deletados().size') === 3);

  rodar('Store.registrarDeletado("vaga_1")');
  t('id repetido não vira duas entradas', lista().length === 3);

  // Cards inteiros também: quem apaga em massa tem os objetos na mão, não os ids.
  rodar('Store.registrarDeletado([{id:"vaga_9"},{id:"vaga_10"}])');
  t('aceita cards, não só ids', rodar('Store.deletados().has("vaga_9")') && rodar('Store.deletados().has("vaga_10")'));

  rodar('Store.registrarDeletado([null, undefined, ""])');
  t('lixo não entra na lista', lista().length === 5, 'lista: ' + lista().join(','));

  rodar('Store.limparDeletados()');
  t('limpar zera a lista', rodar('Store.deletados().size') === 0);
}

console.log('\n=== 3. o caso real da S44: 859 ids novos não podem expulsar os 492 antigos ===');
{
  const { rodar } = montar();
  const antigos = Array.from({ length: 492 }, (_, i) => 'antiga_' + i);
  const limpeza = Array.from({ length: 859 }, (_, i) => 'vaga_' + i);

  rodar('Store.registrarDeletado(' + JSON.stringify(antigos) + ')');
  t('as 492 antigas estão anotadas', rodar('Store.deletados().size') === 492);

  rodar('Store.registrarDeletado(' + JSON.stringify(limpeza) + ')');
  t('as 859 da limpeza entraram', rodar('Store.deletados().has("vaga_858")') === true);

  // O coração deste arquivo. Com `slice(-500)` sobrariam 500 e as 441 primeiras
  // antigas teriam sumido — e voltariam ao Kanban no F5 seguinte.
  const sobreviveram = rodar(JSON.stringify(antigos) + '.filter(id=>Store.deletados().has(id)).length');
  t('nenhuma das 492 antigas foi expulsa pela limpeza', sobreviveram === 492,
    'sobraram ' + sobreviveram + ' de 492');
  t('a lista guarda as 1351 sem cortar', rodar('Store.deletados().size') === 1351);
}

console.log('\n=== 4. honestidade: se não coube, registrarDeletado NÃO diz que anotou ===');
{
  // Irmão do bug da S43: setItem cru dentro de try{}catch{} engole a recusa, e
  // quem apaga em massa segue em frente achando que anotou.
  const { rodar } = montar(40); // cota minúscula: nem a primeira gravação cabe
  const ok = rodar('Store.registrarDeletado(["vaga_1","vaga_2","vaga_3","vaga_4","vaga_5"])');
  t('gravação recusada devolve false', ok === false);
  t('e a lista realmente não foi gravada', rodar('Store.deletados().size') === 0);

  const { rodar: r2 } = montar();
  t('gravação que coube devolve true', r2('Store.registrarDeletado("vaga_1")') === true);
  t('nada a registrar também é sucesso', r2('Store.registrarDeletado([])') === true);
}

console.log('\n=== 5. quem apaga avisa quando não conseguiu anotar ===');
{
  // A regra do Senova: nunca mostrar como resolvido o que não se conseguiu
  // guardar. Apagar o card e falhar a anotação é meio gesto — e o usuário
  // precisa saber na hora, não descobrir a vaga de volta na busca seguinte.
  const del = extrai('function deleteVaga(');
  t('deleteVaga registra pelo Store', /Store\.registrarDeletado\(/.test(del));
  t('deleteVaga avisa se não conseguiu anotar', /if\(!_anotou\)\s*showToast/.test(del));

  const ignorarTodas = extrai('function _ignorarTodasVagasLead(');
  t('ignorar todas registra pelo Store', /Store\.registrarDeletado\(/.test(ignorarTodas));
  t('ignorar todas avisa se não conseguiu anotar', /_anotou\s*\?/.test(ignorarTodas));
}

fim('BLOCKLIST DE REIMPORTAÇÃO · APAGAR SÓ VALE SE FICOU ANOTADO');
