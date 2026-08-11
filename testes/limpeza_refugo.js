// A limpeza do refugo do radar (S45) — e o critério que decide quem morre.
//
// "Para Considerar" virou o depósito do que a peneira reprovava: 910 cards, ~6 MB,
// dentro do mesmo bloco que o navegador passou a recusar. A auditoria da S44 abriu
// os 910 um por um e não achou nada dentro: 0 CVs, 0 candidaturas, 0 contatos,
// 0 anotações.
//
// O QUE ESTE ARQUIVO PROTEGE não é a limpeza — é o critério dela. "Eu olhei e não
// tinha nada" vale para os 910 de hoje e não vale para o mês que vem. Por isso o
// critério é POSITIVO: pergunta "há trabalho humano dentro?", nunca "isto é lixo?".
// Um critério negativo por status apaga um processo real no dia em que alguém
// mudar o significado de um status — e ninguém descobre até fazer falta.
//
// E protege a ORDEM DAS GRAVAÇÕES, que com a cota estourada é o que separa
// funcionar de não sair do lugar.

const { extrai, html, assert } = require('./_lib');
const vm = require('vm');
const { t, fim } = assert();

function fakeLS() {
  const ls = {
    setItem(k, v) { ls[k] = String(v); },
    getItem(k) { return typeof ls[k] === 'string' ? ls[k] : null; },
    removeItem(k) { delete ls[k]; },
  };
  return ls;
}

function montar(listaVagas, revisao) {
  const fontes = [
    'const Store = {',
    'function _restosDescartaveis(',
    'function _descartarRestos(',
    'function _podarAutoBackups(',
    'const _REVISAO_KEY',
    'const _TIMELINE_MAQUINA',
    'function _timelineHumana(',
    'function _temTrabalhoReal(',
    'function descartarTodasRejeitadas(',
    'function _montarCardVarredura(',
  ].map(extrai).join('\n;\n');

  const ls = fakeLS();
  if (revisao) ls.setItem('senova_revisao_pendente', JSON.stringify(revisao));
  const avisos = [];
  const toasts = [];
  const sandbox = {
    vagas: listaVagas || [], contatos: [],
    localStorage: ls,
    _LOGO_CACHE_KEY: 'senova_logo_cache_v5',
    _avisarGravacaoFalhou(m) { avisos.push(m); }, _limparAvisoGravacao() {},
    showToast(m) { toasts.push(m); },
    confirm: () => true,
    updateBadge() {}, atualizarStatsHome() {}, renderHomeAcoes() {},
    atualizarSinais() {}, renderIndicacoesHome() {}, aplicarFiltros() {},
    renderWidgetRevisao() {},
    JSON, Object, Date, console, Error, String, Set, Array, RegExp,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fontes, sandbox);
  vm.runInContext('Store._frioCarregado=true', sandbox);
  return {
    sandbox, ls, avisos, toasts,
    rodar: e => vm.runInContext(e, sandbox),
    quentes: () => JSON.parse(ls.getItem('senova_vagas_v2') || '[]'),
    blocklist: () => JSON.parse(ls.getItem('senova_deleted_ids') || '[]'),
  };
}

// Card como o radar o entrega: nota, descrição, nada de humano dentro.
function refugo(id, extra) {
  return Object.assign({
    id: 'vaga_' + id, empresa: 'Empresa ' + id, cargo: 'Cargo ' + id,
    canal: 'Busca automática', status: 'triagem', score: 12,
    notas: '', proxima: '', emailDest: '', atsCV: '', tags: [],
    timeline: [{ ts: 1, texto: 'Importado via varredura — score 12/100' },
               { ts: 2, texto: 'Abaixo do Critério da região (12/100) — foi para Para Considerar' }],
  }, extra || {});
}

console.log('=== 1. o critério é POSITIVO: qualquer sinal de trabalho humano salva o card ===');
{
  const { rodar } = montar([]);
  const vale = extra => rodar('_temTrabalhoReal(' + JSON.stringify(refugo(1, extra)) + ')');

  t('card cru do radar não tem trabalho humano dentro', vale({}) === false);

  t('CV gerado salva', vale({ atsCV: 'MARCOS FRANCO...' }) === true);
  t('carta salva', vale({ atsCarta: 'Prezados,' }) === true);
  t('análise gravada salva', vale({ atsAnalise: 'análise' }) === true);
  t('parecer da Sofia salva', vale({ sofiaParecer: 'Vale a pena porque...' }) === true);
  t('anotação à mão salva', vale({ notas: 'ligar para o Paulo' }) === true);
  t('motivo escrito salva', vale({ motivo: 'salário abaixo' }) === true);
  t('e-mail de destino salva', vale({ emailDest: 'rh@empresa.com' }) === true);
  t('indicação salva', vale({ indicacao: 'Nailia' }) === true);
  t('próximo passo salva', vale({ proxima: 'enviar CV' }) === true);
  t('data de próximo passo salva', vale({ proximaData: '2026-08-20' }) === true);
  t('data de entrevista salva', vale({ entrevistaData: '2026-08-22' }) === true);
  t('retorno recebido salva', vale({ teveRetorno: true }) === true);
  t('tipo de retorno salva', vale({ tipoRetorno: 'entrevista' }) === true);
  t('tag salva', vale({ tags: ['prioridade'] }) === true);

  // O mais importante: qualquer linha de timeline que o Senova não escreveu.
  t('gesto humano na timeline salva',
    vale({ timeline: [{ ts: 1, texto: 'Importado via varredura' }, { ts: 2, texto: 'CV enviado por e-mail' }] }) === true);
  t('timeline só com frases da máquina NÃO salva',
    vale({ timeline: [{ ts: 1, texto: 'Card criado' }, { ts: 2, texto: 'Promovida para Oportunidade (Compatível)' },
                      { ts: 3, texto: 'Abaixo do Critério da região (12/100) — foi para Para Considerar' }] }) === false);

  // Campo vazio ou só espaço não é trabalho — senão o critério salvaria tudo e a
  // limpeza nunca aconteceria.
  t('string vazia não salva', vale({ notas: '', emailDest: '   ' }) === false);
  t('lista de tags vazia não salva', vale({ tags: [] }) === false);

  // E o card que o radar monta de verdade, não o do teste.
  const cru = rodar('_montarCardVarredura({id:"vaga_x",empresa:"A",titulo:"B",url:"http://x",score:10},Date.now())');
  cru.status = 'triagem';
  t('o card real do radar é descartável', rodar('_temTrabalhoReal(' + JSON.stringify(cru) + ')') === false);
}

console.log('\n=== 2. a limpeza apaga o refugo e não encosta em mais nada ===');
{
  const lista = [
    refugo(1), refugo(2), refugo(3),
    refugo(4, { notas: 'gostei desta' }),                        // protegido
    { id: 'v_lead', status: 'lead', empresa: 'Viva', timeline: [] },
    { id: 'v_aplic', status: 'aplicado', empresa: 'Enviada', timeline: [] },
    { id: 'v_entrev', status: 'entrevista', empresa: 'Marcada', timeline: [] },
    { id: 'v_arq', status: 'arquivado', empresa: 'Encerrada', timeline: [] },
  ];
  const { rodar, quentes, blocklist, toasts } = montar(lista);
  rodar('descartarTodasRejeitadas()');

  const ids = rodar('vagas.map(v=>v.id)');
  t('os 3 cards de refugo foram apagados',
    !ids.includes('vaga_1') && !ids.includes('vaga_2') && !ids.includes('vaga_3'));
  t('o card com anotação FICOU', ids.includes('vaga_4'));
  t('Oportunidade não foi tocada', ids.includes('v_lead'));
  t('candidatura enviada não foi tocada', ids.includes('v_aplic'));
  t('entrevista não foi tocada', ids.includes('v_entrev'));
  t('arquivado não foi tocado', ids.includes('v_arq'));

  // Apagar de vez, não arquivar: o histórico de uma pessoa não é depósito de
  // sobra de robô. Era o que o botão antigo fazia.
  t('nenhum refugo virou arquivado', rodar('vagas.filter(v=>v.status==="arquivado").length') === 1);

  t('os ids apagados foram anotados na blocklist',
    ['vaga_1', 'vaga_2', 'vaga_3'].every(id => blocklist().includes(id)));
  t('o id protegido NÃO foi anotado', !blocklist().includes('vaga_4'));

  t('o bloco gravado já está sem o refugo',
    quentes().filter(v => String(v.id).startsWith('vaga_')).length === 1);
  t('o toast diz quantos e quanto liberou', /apagada/.test(toasts.join(' ')) && /MB/.test(toasts.join(' ')));
}

console.log('\n=== 3. se a gravação não passar, NADA aconteceu ===');
{
  // O caso real de 11/ago: o armazenamento recusando tudo. Meia limpeza — a lista
  // some da tela e o disco continua com ela — é pior que limpeza nenhuma.
  const { rodar, blocklist, avisos } = montar([refugo(1), refugo(2)]);
  rodar('Store.travado=true');
  rodar('descartarTodasRejeitadas()');

  t('a lista voltou inteira', rodar('vagas.length') === 2);
  t('os cards continuam em Para Considerar', rodar('vagas.filter(v=>v.status==="triagem").length') === 2);
  t('nada foi anotado na blocklist', blocklist().length === 0);
  t('o usuário foi avisado da falha', avisos.length > 0);
}

console.log('\n=== 4. a ordem: processos primeiro, blocklist depois ===');
{
  // Com a cota estourada nenhuma das duas gravações cabe. É a gravação dos
  // processos que devolve os ~6 MB — só depois dela existe espaço para anotar os
  // ids. Na ordem inversa as duas falham e a limpeza não sai do lugar.
  const fonte = extrai('function descartarTodasRejeitadas(');
  const iGravar = fonte.indexOf('Store.gravar()');
  const iAnotar = fonte.indexOf('Store.registrarDeletado(');
  t('Store.gravar() vem antes de Store.registrarDeletado()', iGravar > 0 && iAnotar > iGravar);
  t('a limpeza desiste quando a gravação falha', /if\(!Store\.gravar\(\)\)\{\s*vagas=antes/.test(fonte));
}

console.log('\n=== 5. a fila de revisão entra na mesma limpeza ===');
{
  const revisao = [{ id: 'rev_1', empresa: 'X' }, { id: 'rev_2', empresa: 'Y' }];
  const { rodar, ls, blocklist } = montar([refugo(1)], revisao);
  rodar('descartarTodasRejeitadas()');
  t('a fila de revisão foi esvaziada', ls.getItem('senova_revisao_pendente') === null);
  t('os ids da fila também foram anotados',
    blocklist().includes('rev_1') && blocklist().includes('rev_2'));
}

console.log('\n=== 6. sem refugo, a limpeza não mente que fez algo ===');
{
  const { rodar, toasts } = montar([refugo(1, { atsCV: 'CV' }), { id: 'v_lead', status: 'lead', timeline: [] }]);
  rodar('descartarTodasRejeitadas()');
  t('nada foi apagado', rodar('vagas.length') === 2);
  t('e o Senova diz que não havia o que descartar', /Nada a descartar/.test(toasts.join(' ')));
}

console.log('\n=== 7. a ação precisa ser VISÍVEL — foi assim que 25 cards foram apagados a dedo ===');
{
  // O botão existia e nunca chegou à tela. Ele era injetado em #sinal-vagas-txt,
  // que é `.sh-item-label` — e essa classe tem `text-overflow:ellipsis`. Marcos
  // via "141 para considerar · …" e apagava um a um, com o armazenamento cheio,
  // recusando cada gravação. Nenhum dos 25 gestos ficou gravado.
  const css = html.match(/\.sh-item-label\s*\{[^}]*\}/)[0];
  const cortaComReticencias = /text-overflow:\s*ellipsis/.test(css);

  const render = extrai('function renderWidgetRevisao(');
  const iLabel = render.indexOf('sinalTxt.innerHTML');
  const trechoLabel = render.slice(iLabel, render.indexOf('\n', render.indexOf('sinalTxt.innerHTML', iLabel + 10)) + 1);

  t('a linha do título continua cortando com reticências (é a natureza dela)', cortaComReticencias);
  t('e por isso nenhum <button> é injetado nela', !/<button/.test(trechoLabel),
    'voltou a ter botão: ' + trechoLabel.slice(0, 120));

  // Onde a ação tem de estar: na barra da lista aberta, com largura para dizer
  // o que faz e quantos são.
  t('a ação de apagar em massa está na barra da lista', /linhaApagar/.test(render));
  t('e chama a limpeza de verdade', /onclick="descartarTodasRejeitadas\(\)"/.test(render));
  t('o botão diz quantos vai apagar', /Apagar as \$\{apagaveis\}/.test(render));
  t('usa o estilo de ação destrutiva', /class="btn-danger"/.test(render));

  // O número do botão é o REAL, não o da lista visível.
  t('o contador de apagáveis não depende do que está à mostra',
    /const apagaveis = triagem\.filter\(v=>!_temTrabalhoReal\(v\)\)\.length \+ revisao\.length/.test(render));
  t('a barra avisa quantas nem aparecem na lista', /nem aparece/.test(render));

  // E a linha da Home não pode sumir enquanto houver peso guardado, mesmo que
  // nada seja "considerável".
  t('a linha da Home fica visível enquanto houver o que apagar',
    /display=\(qtd>0\|\|apagaveis>0\)\?'flex':'none'/.test(render));
  t('a lista não é esvaziada quando só restam as escondidas',
    /if\(!expandido \|\| \(qtd === 0 && apagaveis === 0\)\)/.test(render));
}

fim('LIMPEZA DO REFUGO · CRITÉRIO POSITIVO, E NADA PELA METADE');
