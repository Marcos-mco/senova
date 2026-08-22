// GUARD — o card não pode negar saber o que ele mesmo já mostra numa pill.
//
// Por que este teste existe. Em 17/ago/2026 Marcos abriu o card "Head de Desenvolvimento"
// (ALS) e viu uma contradição: as pills do topo mostravam "Presencial"/"Tempo integral", mas
// os pontos_atencao diziam "localização e regime não declarados na vaga" — mesmo o LinkedIn
// dizendo "Belo Horizonte, Minas Gerais" no alto da página. Causa raiz (senova-auditor), duas
// pilhas independentes:
//   P1 — /api/analisar-vaga só recebia titulo/empresa/descricao; localizacao/modelo/regime que
//        o card JÁ tinha (capturados da página) nunca chegavam ao prompt, então a IA opinava
//        sem saber o que o Senova já sabia.
//   P2 — a própria função criada UM DIA ANTES (_aplicarSinaisWorker, v7.34) para acabar com a
//        cópia manual de campo por esteira não copiava localizacao/modelo/regime de volta —
//        ironicamente repetindo, num campo novo, o exato erro que ela nasceu para fechar.
// O fix (senova-viabilidade aprovou o custo, 17/ago/2026): manda o que já se sabe como bloco de
// FATO na mensagem de usuário (nunca no bloco de sistema cacheado — variaria por vaga e
// invalidaria o cache caro), instrui a IA a nunca contradizer isso, e _aplicarSinaisWorker passa
// a copiar os 3 campos de volta — mas SÓ quando o card ainda não tinha o valor: dado capturado
// da página é fato de primeira mão e nunca pode ser sobrescrito pela leitura da IA.
const fs = require('fs');
const path = require('path');
const { carregarApp, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

console.log('=== _metaConhecidaVaga: só manda o que existe, nunca um rótulo vazio ===');
{
  const s = carregarApp(['function _metaConhecidaVaga(']);
  t('os 3 campos preenchidos saem todos',
    JSON.stringify(exec(s, '_metaConhecidaVaga("Belo Horizonte, MG","Presencial","CLT")')) ===
    JSON.stringify({ localizacao: 'Belo Horizonte, MG', modelo: 'Presencial', regime: 'CLT' }));
  t('campo vazio/ausente não aparece no objeto (nunca manda rótulo vazio)',
    JSON.stringify(exec(s, '_metaConhecidaVaga("Belo Horizonte, MG","","")')) === JSON.stringify({ localizacao: 'Belo Horizonte, MG' }));
  t('nada preenchido → objeto vazio, não um objeto com chaves vazias',
    JSON.stringify(exec(s, '_metaConhecidaVaga("","","")')) === '{}');
  t('espaço em branco não conta como preenchido',
    JSON.stringify(exec(s, '_metaConhecidaVaga("   ","  ","")')) === '{}');
  t('undefined/null não quebram',
    JSON.stringify(exec(s, '_metaConhecidaVaga(undefined,null,"Ambos")')) === JSON.stringify({ regime: 'Ambos' }));
  t('jornada (4º campo, S47 backlog) entra junto quando preenchida',
    JSON.stringify(exec(s, '_metaConhecidaVaga("Belo Horizonte, MG","Presencial","CLT","Tempo integral")')) ===
    JSON.stringify({ localizacao: 'Belo Horizonte, MG', modelo: 'Presencial', regime: 'CLT', jornada: 'Tempo integral' }));
  t('jornada vazia não aparece, e não quebra os outros 3',
    JSON.stringify(exec(s, '_metaConhecidaVaga("Belo Horizonte, MG","","","")')) === JSON.stringify({ localizacao: 'Belo Horizonte, MG' }));
  t('campo marcado em metaInferida (S47 S6: foi CHUTE da IA, não fato da página) é OMITIDO do bloco',
    JSON.stringify(exec(s, '_metaConhecidaVaga("Belo Horizonte, MG","Presencial","CLT","",{modelo:true})')) ===
    JSON.stringify({ localizacao: 'Belo Horizonte, MG', regime: 'CLT' }));
  t('os 3 campos marcados como inferidos somem, só jornada fica (jornada nunca é marcada — só vem de JSON-LD)',
    JSON.stringify(exec(s, '_metaConhecidaVaga("BH","Presencial","CLT","Tempo integral",{localizacao:true,modelo:true,regime:true})')) ===
    JSON.stringify({ jornada: 'Tempo integral' }));
  t('sem metaInferida nenhuma (card antigo, campo não existe), comportamento é igual ao de antes',
    JSON.stringify(exec(s, '_metaConhecidaVaga("Belo Horizonte, MG","Presencial","CLT","")')) ===
    JSON.stringify({ localizacao: 'Belo Horizonte, MG', modelo: 'Presencial', regime: 'CLT' }));
}

console.log('\n=== _aplicarSinaisWorker: só preenche o que o card ainda NÃO sabia, e marca o chute (S47 S6) ===');
{
  const s = carregarApp(['function _aplicarSinaisWorker(']);
  t('card vazio recebe localizacao/modelo/regime da IA',
    (() => {
      const r = exec(s, '_aplicarSinaisWorker({}, {localizacao:"Belo Horizonte, MG",modelo:"presencial",regime:"CLT"})');
      return r.localizacao === 'Belo Horizonte, MG' && r.modelo === 'presencial' && r.regime === 'CLT';
    })());
  t('os 3 campos que a IA preencheu ficam marcados em metaInferida — não são fato, são chute',
    (() => {
      const r = exec(s, '_aplicarSinaisWorker({}, {localizacao:"Belo Horizonte, MG",modelo:"presencial",regime:"CLT"})');
      return r.metaInferida.localizacao === true && r.metaInferida.modelo === true && r.metaInferida.regime === true;
    })());
  t('card que JÁ tinha localização (capturada da página) não é sobrescrito pela IA',
    exec(s, '_aplicarSinaisWorker({localizacao:"Belo Horizonte, MG"}, {localizacao:"Curitiba, PR"}).localizacao') === 'Belo Horizonte, MG');
  t('campo que já tinha valor não ganha marca de inferido — não foi a IA que preencheu',
    (() => {
      const r = exec(s, '_aplicarSinaisWorker({localizacao:"Belo Horizonte, MG"}, {localizacao:"Curitiba, PR"})');
      return !r.metaInferida || !r.metaInferida.localizacao;
    })());
  t('mesmo vale para modelo e regime já capturados',
    (() => {
      const r = exec(s, '_aplicarSinaisWorker({modelo:"hibrido",regime:"PJ"}, {modelo:"remoto",regime:"CLT"})');
      return r.modelo === 'hibrido' && r.regime === 'PJ';
    })());
  t('resposta sem os 3 campos não apaga o que já estava gravado',
    (() => {
      const r = exec(s, '_aplicarSinaisWorker({localizacao:"Belo Horizonte, MG",modelo:"presencial",regime:"CLT"}, {})');
      return r.localizacao === 'Belo Horizonte, MG' && r.modelo === 'presencial' && r.regime === 'CLT';
    })());
}

console.log('\n=== mvAutoCompatCheck: manda o que o formulário já tem, sem sobrescrever o card ===');
{
  const app = carregarApp(['async function mvAutoCompatCheck('], {
    editingVagaId: 'v1',
    vagas: [{ id: 'v1', cargo: 'Head de Desenvolvimento', empresa: 'ALS', localizacao: 'Belo Horizonte, MG' }],
    CV_DESC_MINIMA: 10,
    WORKER_URL: 'https://worker.teste',
    document: {
      getElementById: id => ({
        'mv-job-desc': { value: 'descrição de teste com tamanho suficiente para análise' },
        'mv-localizacao': { value: 'Belo Horizonte, MG' },
        'mv-modelo': { value: 'Presencial' },
        'mv-regime': { value: '' },
        'mv-verd-hint': null,
      }[id] ?? null),
    },
    ctxTextoAtivos: () => '', RUBRICA_V: 3,
    fetch: (url, opts) => {
      const corpo = JSON.parse(opts.body);
      global.__corpoCapturado = corpo;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
          localizacao: 'Curitiba, PR', modelo: 'remoto', regime: 'CLT',
        }),
      });
    },
  });

  return exec(app, 'mvAutoCompatCheck()').then(() => {
    t('o corpo enviado ao Worker leva metaConhecida com o que o formulário já tinha',
      JSON.stringify(global.__corpoCapturado.metaConhecida) === JSON.stringify({ localizacao: 'Belo Horizonte, MG', modelo: 'Presencial' }),
      JSON.stringify(global.__corpoCapturado.metaConhecida));
    const v = app.vagas[0];
    t('localização do card NÃO foi trocada pela leitura da IA (Curitiba)', v.localizacao === 'Belo Horizonte, MG', v.localizacao);
    t('regime, que o card não tinha, foi preenchido pela IA', v.regime === 'CLT', v.regime);
    t('regime preenchido pela IA fica marcado em metaInferida (S47 S6)', v.metaInferida?.regime === true, JSON.stringify(v.metaInferida));
    delete global.__corpoCapturado;
    resto();
  });
}

function resto() {

console.log('\n=== mvReanalisarCompat: mesmo contrato ===');
{
  const app = carregarApp(['async function mvReanalisarCompat('], {
    vagas: [{ id: 'v1', cargo: 'Head de Desenvolvimento', empresa: 'ALS', rubricaV: 3, atsScore: '75', modelo: 'Presencial' }],
    editingVagaId: 'v1',
    CV_DESC_MINIMA: 10,
    WORKER_URL: 'https://worker.teste',
    document: {
      getElementById: id => ({
        'mv-job-desc': { value: 'descrição de teste com tamanho suficiente para análise' },
        'mv-localizacao': { value: '' },
        'mv-modelo': { value: 'Presencial' },
        'mv-regime': { value: '' },
      }[id] ?? null),
    },
    ctxTextoAtivos: () => '', RUBRICA_V: 3,
    fetch: (url, opts) => {
      global.__corpoCapturado = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
          localizacao: 'Belo Horizonte, MG', modelo: 'remoto', regime: 'CLT',
        }),
      });
    },
    mvUpdateScoreDisplay() {},
  });

  return exec(app, 'mvReanalisarCompat()').then(() => {
    t('metaConhecida mandou só o que o formulário tinha (modelo), sem rótulo vazio',
      JSON.stringify(global.__corpoCapturado.metaConhecida) === JSON.stringify({ modelo: 'Presencial' }),
      JSON.stringify(global.__corpoCapturado.metaConhecida));
    const v = app.vagas[0];
    t('modelo já capturado não foi sobrescrito pela IA (Presencial, não remoto)', v.modelo === 'Presencial', v.modelo);
    t('localização, que o card não tinha, foi preenchida pela IA', v.localizacao === 'Belo Horizonte, MG', v.localizacao);
    t('localização preenchida pela IA fica marcada em metaInferida, modelo (já capturado) não', v.metaInferida?.localizacao === true && !v.metaInferida?.modelo, JSON.stringify(v.metaInferida));
    delete global.__corpoCapturado;
    resto2();
  });
}

function resto2() {

console.log('\n=== analisarLoteBackground: mesmo contrato, sem formulário aberto (lê a vaga direto) ===');
{
  const app = carregarApp(['async function analisarLoteBackground('], {
    vagas: [{ id: 'v1', cargo: 'Head de Desenvolvimento', empresa: 'ALS', descricao: 'descrição de teste com tamanho suficiente para ser elegível', regime: 'CLT' }],
    WORKER_URL: 'https://worker.teste',
    fetch: (url, opts) => {
      global.__corpoCapturado = JSON.parse(opts.body);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
          localizacao: 'Belo Horizonte, MG', modelo: 'presencial', regime: 'PJ',
        }),
      });
    },
    _elegivelParaAnalise: () => true,
    _criterioParaVaga: () => 999,
    _temTrabalhoReal: () => true,
    _gravarNotasNoRadar: () => Promise.resolve(),
    RUBRICA_V: 3, ctxTextoAtivos: () => '', _cacheQuenteAte: 0, _loteEmAnalise: new Set(),
  });

  return exec(app, 'analisarLoteBackground()').then(() => {
    t('metaConhecida levou o regime que a vaga já tinha',
      JSON.stringify(global.__corpoCapturado.metaConhecida) === JSON.stringify({ regime: 'CLT' }),
      JSON.stringify(global.__corpoCapturado.metaConhecida));
    const v = app.vagas[0];
    t('regime já capturado (CLT) não foi sobrescrito pela leitura da IA (PJ)', v.regime === 'CLT', v.regime);
    t('localização e modelo, que a vaga não tinha, vieram da IA', v.localizacao === 'Belo Horizonte, MG' && v.modelo === 'presencial');
    t('localização e modelo (vindos da IA) marcados em metaInferida, regime (já capturado) não', v.metaInferida?.localizacao === true && v.metaInferida?.modelo === true && !v.metaInferida?.regime, JSON.stringify(v.metaInferida));
    delete global.__corpoCapturado;
    resto3();
  });
}

function resto3() {

console.log('\n=== o Worker: prompt instrui a nunca contradizer o que já sabe, e nunca no bloco cacheado ===');
{
  const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
  t('o systemPrompt tem a instrução DADOS JÁ CONHECIDOS DA VAGA',
    /DADOS JÁ CONHECIDOS DA VAGA/.test(worker));
  t('a instrução proíbe escrever "não declarado" sobre campo já conhecido',
    /Nunca escreva em pontos_atencao que um desses campos/.test(worker));
  t('analisarVaga aceita metaConhecida como parâmetro',
    /async function analisarVaga\([^)]*metaConhecida[^)]*\)/.test(worker));
  t('a rota POST /api\\/analisar-vaga desestrutura metaConhecida do corpo recebido e repassa',
    /const \{ titulo, empresa, descricao, contexto, perfilCandidato, scoreAnterior, perfilVAnterior, metaConhecida \}/.test(worker) &&
    // Ver a mesma nota em radar_custo_medido.js: o que se guarda é a POSIÇÃO do argumento, não o
    // tamanho da lista — argumento novo no fim (S50: o dono do Perfil) não é regressão nenhuma.
    /analisarVaga\(titulo, empresa, descricao, env, contexto, perfilCandidato, scoreAnterior, ctx, perfilVAnterior, metaConhecida[,)]/.test(worker));
  t('o bloco de metadados vai na MENSAGEM DE USUÁRIO, nunca no array `system` (cacheado)',
    (() => {
      const iSystem = worker.indexOf('system:[');
      const iSystemFim = worker.indexOf('],', iSystem);
      const blocoSystem = worker.slice(iSystem, iSystemFim);
      return !/_blocoMetaConhecida/.test(blocoSystem) && /_blocoMetaConhecida/.test(worker.slice(iSystemFim));
    })());
  t('o bloco só existe quando pelo menos 1 campo veio preenchido (nunca manda rótulo vazio)',
    /_metaPartes\.length \? `DADOS JÁ CONHECIDOS DA VAGA: /.test(worker));
  t('cada campo é sanitizado (sem quebra de linha) e truncado — vem de página de terceiro',
    /_sanitizaMeta = s => String\(s \|\| ''\)\.replace\(\/\[\\r\\n\]\+\/g, ' '\)\.trim\(\)\.slice\(0, 80\)/.test(worker));
  t('jornada (S47 backlog) entra no bloco de metaConhecida',
    /if \(_mc\.jornada\) _metaPartes\.push\(`jornada: \$\{_sanitizaMeta\(_mc\.jornada\)\}`\);/.test(worker));
  t('salário NÃO entra no bloco — senova-viabilidade reprovou (contaminado com pretensão do candidato)',
    !/_mc\.salario/.test(worker));
}

console.log('\n=== P5 (S47): parser de JSON-LD não infere "Presencial" por presença vazia nem erra jobLocationType array ===');
{
  const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
  t('jobLocationType é normalizado para array antes de checar TELECOMMUTE (schema.org permite array)',
    /\[\]\.concat\(item\.jobLocationType \|\| \[\]\)\.map\(x => String\(x\)\.toUpperCase\(\)\)/.test(worker));
  t('"Presencial" só é inferido com endereço REAL (addrReal), nunca pela mera presença de jobLocation',
    /else if \(addrReal\) meta\.modalidade = 'Presencial'/.test(worker) && !/else if \(loc\) meta\.modalidade = 'Presencial'/.test(worker));
  t('addressCountry sozinho não conta como endereço real (precisa locality/region/streetAddress)',
    /addr\.addressLocality \|\| addr\.addressRegion \|\| addr\.streetAddress\) addrReal = addr/.test(worker));
}

console.log('\n=== S6 (S47): edição manual do card limpa a marca de "chute da IA" só no campo alterado ===');
{
  t('saveVaga() limpa metaInferida do campo que a pessoa de fato mudou no formulário',
    /if\(_novaLoc!==\(existing\?\.localizacao\|\|''\)\) delete _metaInferidaPosSave\.localizacao;/.test(html) &&
    /if\(_novoModelo!==\(existing\?\.modelo\|\|''\)\) delete _metaInferidaPosSave\.modelo;/.test(html) &&
    /if\(_novoRegime!==\(existing\?\.regime\|\|''\)\) delete _metaInferidaPosSave\.regime;/.test(html));
  t('saveVaga() grava metaInferida (já filtrado) de volta no card',
    /metaInferida:_metaInferidaPosSave,/.test(html));
  t('saveVagaSilent() tem o mesmo tratamento (2º ponto de gravação do modal)',
    (html.match(/const _metaInferidaPosSave=\{\.\.\.\(existing\?\.metaInferida\|\|\{\}\)\};/g) || []).length === 2);
}

console.log('\n=== 4ª esteira (S47 S6): o Radar também chuta localizacao/modelo/regime, e também precisa do guard ===');
{
  t('_pedirAnaliseVaga do Radar não manda metaConhecida — confirma que tudo que volta de lá é CHUTE, nunca fato',
    !/_pedirAnaliseVaga[\s\S]{0,300}metaConhecida/.test(html));
  t('o resultado do Radar passa por _gravarMetaVaga (fonte "ia") — mesmo ponto único do resto do app',
    /_gravarMetaVaga\(_novoV, \{localizacao:analise\.localizacao, modelo:analise\.modelo, regime:analise\.regime\}, 'ia'\)/.test(html));
  t('o Radar NÃO monta localizacao/modelo/regime na própria mão (não reabre o "N gravadores")',
    !/localizacao:v\.localizacao\|\|analise\.localizacao/.test(html));
}

console.log('\n=== _gravarMetaVaga: ponto único de gravação (S47, auditoria de captura) ===');
{
  const s = carregarApp(['function _gravarMetaVaga(']);
  t('fonte ia preenche vazio e marca inferida',
    (() => { const r = exec(s, '_gravarMetaVaga({localizacao:""}, {localizacao:"Berlim, Alemanha"}, "ia")');
      return r.localizacao==='Berlim, Alemanha' && r.metaInferida.localizacao===true; })());
  t('fonte pagina VENCE o chute anterior da IA (correção do achado nº1 do auditor: fato chegando depois não era mais descartado)',
    (() => { const r = exec(s, '_gravarMetaVaga({localizacao:"Berlim, Alemanha", metaInferida:{localizacao:true}}, {localizacao:"São Paulo, SP"}, "pagina")');
      return r.localizacao==='São Paulo, SP'; })());
  t('fonte pagina apaga a marca metaInferida do campo que acabou de sobrescrever',
    (() => { const r = exec(s, '_gravarMetaVaga({localizacao:"Berlim, Alemanha", metaInferida:{localizacao:true}}, {localizacao:"São Paulo, SP"}, "pagina")');
      return !r.metaInferida.localizacao; })());
  t('fonte ia nunca sobrescreve fato já capturado (guarda antiga preservada)',
    (() => { const r = exec(s, '_gravarMetaVaga({localizacao:"Curitiba, PR"}, {localizacao:"Remoto"}, "ia")');
      return r.localizacao==='Curitiba, PR'; })());
  t('valor vazio não escreve nada, nem em fonte pagina',
    (() => { const r = exec(s, '_gravarMetaVaga({}, {localizacao:""}, "pagina")');
      return r.localizacao===undefined; })());
}

fim('METADADOS JÁ CONHECIDOS · O CARD NÃO PODE NEGAR O QUE A PRÓPRIA PILL MOSTRA');
}
}
}
