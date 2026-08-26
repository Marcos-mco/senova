// GUARD — o preço é dito antes do gesto, e é medido na conta de quem paga (S53, 26/ago/2026).
//
// Por que este teste existe. Depois que a trava de R$ 200 subiu, medi de onde o dinheiro
// estava saindo DE VERDADE — e o alvo mudou. Até 23/ago a origem `radar` respondia por 83%
// do mês (US$ 40,65 em 2.696 chamadas). De 24/ago em diante, com a varredura automática
// desligada, quem passou a mandar foi `esteira_home`: US$ 2,43 / 1,02 / 0,90 nos três dias
// seguintes — cerca de 70% do gasto diário.
//
// A esteira NÃO TEM CLIQUE. Ela roda sozinha ao abrir a Home, em laço de até 60 rodadas.
// "O preço antes do clique" que Marcos pediu não podia mirar num botão: o dinheiro saía de
// um laço que ninguém aperta. Por isso a esteira passou a dizer o que faz, quanto custa e a
// aceitar ser parada.
//
// E o preço que o app já dizia era escrito à mão — "cerca de R$ 0,08 por vaga", "cerca de
// R$ 6,40 a rodada". Número escrito à mão envelhece calado (o prompt cresce, o modelo muda
// de preço) e nunca foi verdade para quem usa o Senova com outro perfil e outra moeda: é a
// sétima encarnação de "a medição de UM usuário virando lei para todos"
// ([[feedback_senova_para_qualquer_um_s51]]).
//
// Três coisas este arquivo guarda:
//  1. Nenhum preço de IA escrito à mão no app. O número sai do histórico de quem paga.
//  2. Sem histórico, o app CALA — não inventa preço. Melhor não saber do que estimar.
//  3. Parar é gesto dela/dele, vale em toda porta de entrada, e não perde vaga nenhuma.

const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// Comentário que EXPLICA por que um número saiu não é o número de volta — e o porquê é a
// parte que impede a dívida de renascer. A caça a literal roda sobre o código, não sobre a
// memória escrita ao lado dele.
const appCodigo = app.split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join('\n');
const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// ════════════════════════════════════════════════════════════════════════════════════
console.log('\n=== o preço não é escrito à mão em lugar nenhum ===');
{
  // Os dois literais que existiam. Se voltarem — em qualquer moeda —, é a mesma dívida.
  t('o "R$ 0,08 por vaga" saiu do código',
    !/R\$ ?0,08/.test(appCodigo), 'preço por vaga voltou a ser literal');
  t('o "R$ 6,40 a rodada" saiu do código',
    !/R\$ ?6,40/.test(appCodigo), 'preço da rodada voltou a ser literal');
  // O teste não pode caçar só os dois números de ontem: qualquer preço de IA escrito à mão
  // é o mesmo defeito com outro algarismo. A busca é pela FRASE que carimba preço.
  const frasesDePreco = (appCodigo.match(/custa cerca de R\$ ?[\d.,]+/g) || [])
    .concat(appCodigo.match(/cerca de R\$ ?[\d.,]+ para ser/g) || []);
  t('e nenhum outro preço em moeda fixa tomou o lugar deles',
    frasesDePreco.length === 0, 'ainda há preço literal: ' + frasesDePreco.join(' | '));
  // De onde o número passa a vir.
  t('o preço por análise vem medido do Worker', /custo_analise/.test(app));
  t('e o Worker o calcula do histórico de quem paga, não de uma constante',
    /async function custoMedioDeUmaAnalise\(env, dono\)/.test(worker) &&
    /await donosDaConta\(env, dono\)/.test(worker));
  t('a média é do preço de HOJE — janela de dias, não a história inteira',
    /30 \* 86400000/.test(worker) && /dia >= \?/.test(worker));
  t('e é convertida na moeda de quem paga, nunca numa moeda chumbada',
    /custo_analise = medioUSD === null \? null : medioUSD \* orcamento\.cambio_por_usd/.test(worker));
}

// ════════════════════════════════════════════════════════════════════════════════════
console.log('\n=== sem histórico, o app cala a boca (não inventa preço) ===');
{
  t('o Worker devolve null quando não há uma única chamada medida',
    /return n > 0 \? \(Number\(row\.usd\) \|\| 0\) \/ n : null;/.test(worker));
  t('a frase da esteira só cita preço se ele for número',
    /if \(typeof e\.custo_analise === 'number'\) partes\.push/.test(app));
  t('e a busca manual troca a frase inteira em vez de mostrar zero',
    /_porVaga === null[\s\S]{0,200}?A busca é gratuita; o que custa é a análise/.test(app));
  // Um preço "R$ 0,00" seria pior que nenhum: soaria tão confiável quanto os outros.
  t('nunca cai num preço zerado por falta de dado',
    !/custo_analise \|\| 0/.test(app));
}

// ════════════════════════════════════════════════════════════════════════════════════
console.log('\n=== a esteira diz o que está fazendo enquanto gasta ===');
{
  t('a barra existe na Home e nasce escondida',
    /id="esteira-aviso"[^>]*display:none/.test(app));
  t('o laço mostra a fila REAL a cada rodada, não o lote de 5',
    /const fila=vagas\.filter\(_elegivelParaAnalise\)\.length;[\s\S]{0,120}?_esteiraMostrar\(fila\)/.test(app));
  // Estado vazio não se anuncia: quando acaba, a barra some — não vira "nenhuma vaga".
  // Desde 26/ago/2026 quem apaga a barra no fim da rodada é `_esteiraOferecer`: se sobrou
  // fila esperando liberação ele oferece, e se não sobrou nada ele esconde (a barra some
  // sozinha em `_esteiraPintar`, quando a conta dá zero). É a mesma regra — nunca anunciar
  // vazio —, agora com o convite no lugar do sumiço mudo.
  t('e some quando termina, em vez de dizer "nenhuma"',
    /finally \{ _recalcRodando=false; _esteiraParada=false; try\{ _esteiraOferecer\(\); \}catch\{\} \}/.test(app) &&
    /if \(quantas <= 0\) \{ bar\.style\.display = 'none'; return; \}/.test(app));
  t('a frase diz quantas, quanto custa e quanto resta do teto',
    /partes\.push\('cerca de '[\s\S]{0,200}?partes\.push\('restam '/.test(app));
  t('a leitura do orçamento não vira uma segunda fonte de tráfego',
    /_orcEstadoQuando < 5\*60\*1000/.test(app));
  t('e falhar ao ler o orçamento não impede a esteira de rodar',
    /if \(!r\.ok\) return _orcEstado;/.test(app) && /\}catch\(e\)\{\}\s*\r?\n\s*return _orcEstado;/.test(app));
}

// ════════════════════════════════════════════════════════════════════════════════════
console.log('\n=== parar é gesto dele, e não custa uma vaga sequer ===');
{
  // O botão deixou de ser fixo no HTML em 26/ago/2026: a mesma barra serve os dois estados
  // (analisando → "Parar"; parada → "Analisar as N"), e o rótulo e a ação são pintados
  // juntos. O que se guarda é que o estado "analisando" continua oferecendo parar.
  t('há um botão de parar na barra',
    /<button id="esteira-aviso-acao"/.test(app) &&
    /_esteiraPintar\(quantas, 'Analisando', 'Parar', pararEsteira\)/.test(app) &&
    /btn\.onclick = acao;/.test(app));
  // Duas portas de entrada: o laço da Home e o lote chamado de fora (enriquecimento, etc).
  // Guardar só uma delas deixaria o gesto valendo pela metade.
  t('o laço obedece', /if\(_esteiraParada\) break;/.test(app));
  t('e o lote também obedece, porque é chamado de outros lugares',
    /async function analisarLoteBackground\(\)\{[\s\S]{0,200}?if\(_esteiraParada\) return;/.test(app));
  // Parar não pode ser uma forma disfarçada de perder trabalho.
  const parar = app.slice(app.indexOf('function pararEsteira()'), app.indexOf('function retomarEsteira()'));
  t('parar não muda status, não arquiva e não apaga vaga nenhuma',
    parar.length > 0 && !/status\s*=/.test(parar) && !/splice/.test(parar) && !/delete vagas\[/.test(parar));
  // Desde 26/ago/2026 parar RETIRA a permissão de quem ainda não foi analisada — sem isso a
  // vaga ficaria no limbo: some do convite (já tem permissão) e ninguém a analisa (nada roda
  // sozinho). É apagar uma autorização, não uma vaga, e é o único apagamento permitido aqui.
  t('o único "delete" é o da permissão — a vaga volta à fila em vez de ficar muda',
    (parar.match(/delete /g) || []).length === 1 && /delete v\.analisePedida;/.test(parar) &&
    /saveVagas\(\)/.test(parar));
  t('e a mensagem diz isso a quem parou',
    /Nenhuma vaga foi perdida — elas voltam para a fila de espera/.test(parar));
  t('existe caminho de volta (parar não é porta trancada)',
    /function retomarEsteira\(\)\{[\s\S]{0,120}?_recalcLeadsReset\(\)/.test(app));
}

fim('Preço antes do gesto');
