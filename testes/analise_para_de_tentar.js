// GUARD — a quarta tentativa não acontece, e o teto sobrevive à recarga (S52, Passo D0).
//
// Por que este teste existe. A esteira da Home guardava as falhas de análise num Set de
// SESSÃO, e o comentário no código dizia com todas as letras: "no próximo Ctrl+Shift+R
// tenta de novo". Medido em produção em 24/ago/2026: 79 análises pagas contra 1 vaga nova.
// A diferença inteira é vaga que falha, volta à fila na recarga seguinte, falha de novo — e
// é paga de novo, indefinidamente. O parecer do `senova-viabilidade` mediu R$ 168/mês nisso,
// mais do que os Passos D, E, F e G do plano do Plano de Vida somados.
//
// Uma falha que se repete três vezes não é azar de rede: é vaga que não dá para analisar
// (descrição que virou 404, portal que bloqueia, texto que não é vaga). Insistir é gastar
// para descobrir a mesma coisa pela quarta vez.
//
// As quatro regras que este arquivo protege, e por que cada uma:
//
//   1. O CONTADOR MORA NA VAGA. Uma lista paralela seria um SEGUNDO GRAVADOR do mesmo fato —
//      o padrão que já custou caro duas vezes ([[feedback_nao_perder_melhorias_ngravadores_s47]]).
//      Morando na vaga, o teto sobrevive à recarga pelo mesmo saveVagas() que grava todo o
//      resto, viaja no backup e no export, e some junto com o card.
//   2. UM PONTO ÚNICO DE GRAVAÇÃO. Quem descobrir uma falha chama `_registrarFalhaAnalise`;
//      ninguém mexe em `analiseTentativas` na mão.
//   3. O TETO ENTRA NO MESMO PREDICADO QUE ESCOLHE O LOTE. Se a esteira e o "ainda falta
//      alguém?" divergirem, o loop de `_recalcLeadsReset` roda em falso para sempre.
//   4. A TELA NUNCA DIZ "Avaliando…" SOBRE O QUE NINGUÉM VAI AVALIAR. Economia paga com
//      mentira na tela não é economia. A redação é a que Marcos ditou, verbatim, e vem
//      acompanhada da data da última tentativa e de "analisar assim mesmo" à mão — teto que
//      economiza é teto; teto sem saída é porta trancada.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

console.log('=== o teto existe, é de 3, e é por vaga ===');
t('TETO_TENTATIVAS_ANALISE é 3',
  /const TETO_TENTATIVAS_ANALISE=3;/.test(app));
t('_analiseNoTeto lê o contador DA VAGA, não de uma lista à parte',
  /function _analiseNoTeto\(v\)\{[\s\S]{0,200}v\.analiseTentativas[\s\S]{0,120}>=TETO_TENTATIVAS_ANALISE/.test(app));

console.log('\n=== o teto sobrevive à recarga (era memória de sessão, e é isso que se paga) ===');
t('a falha grava o contador na vaga e a data da tentativa',
  /function _registrarFalhaAnalise\(id\)\{[\s\S]{0,600}vagas\[idx\]\.analiseTentativas=\(Number\(vagas\[idx\]\.analiseTentativas\)\|\|0\)\+1;[\s\S]{0,120}vagas\[idx\]\.analiseUltimaFalha=Date\.now\(\);/.test(app));
t('a esteira persiste o que gravou (saveVagas no fim do lote)',
  /for\(const \{v,data\} of respostas\)\{[\s\S]{0,3000}\n  saveVagas\(\);/.test(app));
t('o comentário que prometia "no próximo Ctrl+Shift+R tenta de novo" saiu do código',
  !/no próximo Ctrl\+Shift\+R tenta de novo/.test(app));

console.log('\n=== um ponto único de gravação — nunca duas verdades sobre o mesmo contador ===');
// Fora de `_registrarFalhaAnalise`, só `analisarAssimMesmo` pode tocar no contador, e para
// ZERÁ-LO — que é o gesto dele, não um efeito colateral de outra rotina.
const escritas = (app.match(/\.analiseTentativas\s*=/g) || []).length;
t('há exatamente 2 escritas de analiseTentativas no app (a falha e o gesto de reabrir)',
  escritas === 2, `encontradas ${escritas}`);
t('a esteira registra a falha PELA função, não mexendo no Set na mão',
  /if\(!data \|\| typeof data\.score!=='number'\)\{ _registrarFalhaAnalise\(v\.id\); continue; \}/.test(app));

console.log('\n=== a 4ª tentativa não acontece: o teto entra no MESMO predicado que escolhe o lote ===');
t('_elegivelParaAnalise reprova vaga no teto',
  /function _elegivelParaAnalise\(v\)\{[\s\S]{0,900}&& !_analiseNoTeto\(v\)/.test(app));
// O que se guarda é o PREDICADO, não a forma de perguntar. Em 26/ago/2026 o laço deixou de
// perguntar "sobrou alguém?" (`.some`) e passou a contar a fila (`.filter().length`), porque a
// barra da Home precisa dizer QUANTAS vagas ainda vai analisar. Contar é o mesmo crivo; o risco
// que este teste existe para pegar continua sendo o outro — o laço perguntar por um critério e o
// lote escolher por outro, e girar 60 rodadas em falso.
t('a esteira e o "ainda falta alguém?" usam o mesmo predicado (senão o loop roda em falso)',
  /const semScore=vagas\.filter\(_elegivelParaAnalise\)/.test(app) &&
  /const fila=vagas\.filter\(_elegivelParaAnalise\)\.length;[\s\S]{0,120}?if\(!fila\) break;/.test(app));

console.log('\n=== a tela diz a verdade, e devolve a decisão a ele ===');
t('a redação é a que Marcos ditou, verbatim',
  /Limite de \$\{TETO_TENTATIVAS_ANALISE\} tentativas atingido — o Senova parou de gastar análise nesta vaga/.test(app));
t('a data da última tentativa aparece junto',
  /_seloAnaliseParada\(v\)\{[\s\S]{0,600}última tentativa em \$\{formatTs\(v\.analiseUltimaFalha\)\}/.test(app));
t('"analisar assim mesmo" existe e ZERA o contador (teto que economiza, não porta trancada)',
  /analisar assim mesmo<\/button>/.test(app) &&
  /async function analisarAssimMesmo\(id\)\{[\s\S]{0,600}vagas\[idx\]\.analiseTentativas=0;/.test(app));
t('reabrir à mão vale como permissão de análise (vaga de busca automática precisa dela)',
  /async function analisarAssimMesmo\(id\)\{[\s\S]{0,800}vagas\[idx\]\.analisePedida=true;/.test(app));

console.log('\n=== nunca "Avaliando…" para o que ninguém vai avaliar ===');
// As DUAS telas que mostram vaga sem nota: "Para Considerar" e o card do Kanban. Se uma
// delas esquecer o teto, o Senova para de gastar mas continua prometendo que vai analisar.
t('"Para Considerar" checa o teto ANTES de cair em "Avaliando…"',
  /\$\{nota===null[\s\S]{0,200}_analiseNoTeto\(v\)[\s\S]{0,400}_seloAnaliseParada\(v\)[\s\S]{0,700}Avaliando…/.test(app));
t('o card do Kanban checa o teto antes de "Não analisada" e de "Aguardando análise"',
  /if\(_analiseNoTeto\(c\)\)return[\s\S]{0,1600}— Não analisada[\s\S]{0,400}Aguardando análise/.test(app));

fim('analise_para_de_tentar');
