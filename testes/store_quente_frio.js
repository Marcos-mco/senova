// O CRM não é mais um bloco só (S40).
//
// O caso real, medido no app de Marcos em 30/jul: senova_vagas_v2 tinha 8,4 MB
// num único valor. Dos 987 cards, 654 estavam ARQUIVADOS e pesavam 6,1 MB —
// dado que já não muda, reescrito por inteiro a cada gesto dele. Todo clique
// pedia ao navegador que regravasse 8 MB, e o navegador recusava. A tarja de
// "não consegui salvar" era o sintoma; isto é a causa.
//
// Agora são dois blocos na mesma array em memória:
//   QUENTE  senova_vagas_v2            processos vivos, pequeno, gravado sempre
//   FRIO    senova_vagas_arquivadas_v1 arquivados, grande, gravado só se mudar
//
// O que este arquivo protege, e que é onde mora o perigo de verdade: um card
// arquivado nunca pode existir nos dois blocos ao mesmo tempo. Duplicar o
// histórico de alguém é tão ruim quanto perdê-lo.

const { extrai, assert } = require('./_lib');
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

  const ls = fakeLS(limiteChars);
  const sandbox = {
    vagas: [], contatos: [],
    localStorage: ls,
    _LOGO_CACHE_KEY: 'senova_logo_cache_v5',
    _avisarGravacaoFalhou() {}, _limparAvisoGravacao() {},
    JSON, Object, Date, console, Error, String,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  // O app só grava depois que carregarFrio() respondeu — é o portão de
  // testes/nao_gravar_sem_arquivo.js. Todos os cenários daqui são do app JÁ carregado
  // (é assim que Store.gravar() é chamado na vida real), então o estado inicial diz isso.
  vm.runInContext('Store._frioCarregado=true', sandbox);
  return { sandbox, ls, run: (e) => vm.runInContext(e, sandbox) };
}

const card = (id, status) => ({ id, status, empresa: 'E' + id, jobDescription: 'd'.repeat(50) });
const QUENTE = 'senova_vagas_v2', FRIO = 'senova_vagas_arquivadas_v1';
const lidos = (ls) => JSON.parse(ls.getItem(QUENTE) || '[]').concat(JSON.parse(ls.getItem(FRIO) || '[]'));

console.log('=== a separação: arquivados saem do bloco que se regrava a cada clique ===');
{
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado'), card(3, 'lead'), card(4, 'arquivado')];
  t('gravou', run('Store.gravar()') === true);

  const q = JSON.parse(ls.getItem(QUENTE)), f = JSON.parse(ls.getItem(FRIO));
  t('o bloco quente só tem processos vivos', q.every(v => v.status !== 'arquivado') && q.length === 2);
  t('o bloco frio só tem arquivados', f.every(v => v.status === 'arquivado') && f.length === 2);
  t('o quente é MENOR que o bloco único de antes',
    ls.getItem(QUENTE).length < JSON.stringify(sandbox.vagas).length);
  t('nenhum card se perdeu na separação', lidos(ls).length === 4);
  t('nenhum card aparece duas vezes',
    new Set(lidos(ls).map(v => v.id)).size === 4);
}

console.log('\n=== ler devolve a lista inteira: o resto do app não sabe que são dois ===');
{
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado'), card(3, 'arquivado')];
  run('Store.gravar()');
  const devolvidas = run('Store.lerVagas()');
  t('devolve os 3 cards, vivos e arquivados', devolvidas.length === 3);
  t('os arquivados vêm junto', devolvidas.filter(v => v.status === 'arquivado').length === 2);
}
{
  // Compatibilidade: quem abre o app pela primeira vez depois da mudança tem
  // TUDO no bloco antigo e nenhum bloco frio. Não pode faltar nada na tela.
  const { ls, run } = montar(0);
  ls.setItem(QUENTE, JSON.stringify([card(1, 'aplicado'), card(2, 'arquivado')]));
  const devolvidas = run('Store.lerVagas()');
  t('bloco único antigo, sem bloco frio: lê os dois cards', devolvidas.length === 2);
}

console.log('\n=== o bloco frio só é regravado quando os arquivados MUDAM ===');
{
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado')];
  run('Store.gravar()');
  const antes = ls.getItem(FRIO);

  let escritas = 0;
  const orig = ls.setItem;
  ls.setItem = function (k, v) { if (k === FRIO) escritas++; return orig.call(ls, k, v); };

  sandbox.vagas[0].empresa = 'mudou';   // mexeu só no vivo
  run('Store.gravar()');
  t('mexer num processo vivo não regrava os 654 arquivados', escritas === 0);
  t('o bloco frio continua intacto', ls.getItem(FRIO) === antes);

  sandbox.vagas.push(card(9, 'arquivado'));   // agora sim mudou o frio
  run('Store.gravar()');
  t('arquivar um card novo regrava o bloco frio', escritas === 1);
  t('e o card novo está lá', JSON.parse(ls.getItem(FRIO)).length === 2);
}

console.log('\n=== sem espaço para o bloco frio: volta ao bloco único, nunca duplica ===');
{
  // O limite é apertado de propósito: cabe tudo junto, mas não cabe tudo junto
  // MAIS uma cópia dos arquivados.
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado'), card(3, 'arquivado')];
  const tamTudo = JSON.stringify(sandbox.vagas).length;

  // Regime: o bloco frio é sempre recusado; o quente passa.
  const orig = ls.setItem;
  ls.setItem = function (k, v) {
    if (k === FRIO) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    return orig.call(ls, k, v);
  };

  t('gravou mesmo assim', run('Store.gravar()') === true);
  t('voltou ao bloco único, com tudo dentro',
    JSON.parse(ls.getItem(QUENTE)).length === 3);
  t('o bloco frio não ficou pela metade', ls.getItem(FRIO) === null);
  t('nenhum arquivado duplicado', new Set(lidos(ls).map(v => v.id)).size === 3);
  t('o bloco único tem o tamanho de tudo', ls.getItem(QUENTE).length === tamTudo);
}
{
  // O mesmo, mas depois de a separação JÁ ter acontecido — aqui o bloco frio
  // existe no disco, e é onde a duplicação aconteceria se ninguém o removesse.
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado')];
  run('Store.gravar()');
  t('separado: o bloco frio existe', ls.getItem(FRIO) !== null);

  const orig = ls.setItem;
  ls.setItem = function (k, v) {
    if (k === FRIO) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
    return orig.call(ls, k, v);
  };
  sandbox.vagas.push(card(3, 'arquivado'));
  run('Store.gravar()');
  t('o bloco frio antigo foi removido antes de voltar ao único', ls.getItem(FRIO) === null);
  t('os 3 cards existem uma vez cada', new Set(lidos(ls).map(v => v.id)).size === 3);
  t('nenhum card se perdeu', lidos(ls).length === 3);
}

console.log('\n=== restaurar: o ponto COMPLETO substitui tudo, sem duplicar ===');
{
  // Ponto gravado antes da separação (ou arquivo exportado): traz os arquivados
  // dentro. Se o bloco frio de agora ficasse no disco, cada arquivado apareceria
  // duas vezes na volta.
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado')];
  run('Store.gravar()');
  t('antes: existe bloco frio', ls.getItem(FRIO) !== null);

  const pontoAntigo = JSON.stringify([card(1, 'aplicado'), card(2, 'arquivado'), card(5, 'arquivado')]);
  t('restaurou', run('Store.restaurar(' + JSON.stringify(pontoAntigo) + ')') === true);
  t('o bloco frio saiu junto', ls.getItem(FRIO) === null);
  t('os 3 cards do ponto voltaram, uma vez cada',
    new Set(lidos(ls).map(v => v.id)).size === 3 && lidos(ls).length === 3);
}

console.log('\n=== restaurar: o ponto SÓ DE VIVOS não pode apagar o histórico ===');
{
  // O caminho que a separação abriria se ninguém olhasse: o ponto de restauração
  // automático copia Store.ler(), que agora é só o bloco quente. Restaurá-lo
  // limpando o bloco frio apagaria 654 arquivados com uma cópia que nunca se
  // propôs a guardá-los — sumiço silencioso, o defeito mais caro deste projeto.
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado'), card(2, 'arquivado'), card(3, 'arquivado')];
  run('Store.gravar()');

  const pontoSoVivos = ls.getItem(QUENTE);       // é exatamente o que o backup diário copia
  t('o ponto diário não contém arquivado nenhum',
    JSON.parse(pontoSoVivos).every(v => v.status !== 'arquivado'));

  sandbox.vagas[0].empresa = 'estragou';
  run('Store.gravar()');
  t('restaurou', run('Store.restaurar(' + JSON.stringify(pontoSoVivos) + ')') === true);

  t('o bloco frio continua no disco', ls.getItem(FRIO) !== null);
  t('os 2 arquivados sobreviveram à restauração',
    JSON.parse(ls.getItem(FRIO)).length === 2);
  t('o processo vivo voltou ao estado do ponto',
    JSON.parse(ls.getItem(QUENTE))[0].empresa === 'E1');
  t('nada duplicou', new Set(lidos(ls).map(v => v.id)).size === 3 && lidos(ls).length === 3);
}
{
  // Quem nunca arquivou nada: os dois tipos coincidem e nada pode quebrar.
  const { sandbox, ls, run } = montar(0);
  sandbox.vagas = [card(1, 'aplicado')];
  run('Store.gravar()');
  run('Store.restaurar(' + JSON.stringify(JSON.stringify([card(1, 'aplicado'), card(7, 'lead')])) + ')');
  t('sem arquivados, restaurar devolve os 2 cards', lidos(ls).length === 2);
}

console.log('\n=== o socorro de dado ilegível cobre o bloco frio também ===');
{
  const { ls, run } = montar(0);
  ls.setItem(QUENTE, '{{{ ilegível');
  ls.setItem(FRIO, ']]] ilegível');
  run('Store.socorrer()');
  const copias = Object.keys(ls).filter(k => k.indexOf('senova_ilegivel_') === 0);
  t('guardou cópia do bloco quente', copias.some(k => k.indexOf('vagas_v2') >= 0));
  t('guardou cópia do bloco frio — 654 cards não podem ficar de fora',
    copias.some(k => k.indexOf('arquivadas') >= 0));
}

console.log('\n=== a ordem da gravação, que é o que torna a separação possível ===');
{
  const g = extrai('  gravar(){');
  const iQuente = g.indexOf('this.CHAVE,');
  const iFrio = g.indexOf('this.CHAVE_ARQUIVADAS');
  t('o bloco quente é gravado ANTES do frio', iQuente > 0 && iFrio > iQuente,
    'quente=' + iQuente + ' frio=' + iFrio);
}

fim('CRM SEPARADO EM QUENTE E FRIO · SEM PERDER E SEM DUPLICAR');
