// GUARD — a esteira para de escrever o que ninguém lê (S53, 28/ago/2026).
//
// O que mudou. A análise de uma vaga devolve, entre outras coisas, quatro campos de texto:
// `resumo` (2 linhas em prosa), `pontos_fortes` ("a favor"), `pontos_atencao` ("contra") e
// `impedimentos`. A esteira analisa o ACERVO INTEIRO. O card aberto é o único lugar do app
// que mostra `resumo` e `pontos_fortes` — e Marcos abre uma fração dos cards. Ou seja: dois
// campos escritos 100% das vezes, lidos numa fração. Saída é o token caro. Era desperdício
// puro, e mensurável: ~100 dos ~250 tokens de saída de cada análise.
//
// A economia tem três condições, e é para elas que este teste existe.
//
// 1. A MÁ NOTÍCIA NUNCA É ADIADA. `pontos_atencao` e `impedimentos` continuam vindo sempre,
//    de todo mundo. O que se adia é o argumento de venda da vaga, jamais o motivo de recusa.
//    Uma "economia" que escondesse por que a nota é baixa não seria economia, seria mentira.
//
// 2. `pontos_atencao` É TAMBÉM O SENTINELA DE COMPLETUDE. Em index.html, a esteira de
//    importação reaproveita a nota que o radar já trouxe só quando `Array.isArray(v.
//    pontos_atencao)` — "nota sem pontos de atenção é resto de gravação incompleta".
//    Cortar esse campo faria TODA vaga parecer incompleta e ser reanalisada para sempre:
//    o corte multiplicaria o custo em vez de reduzi-lo. Foi o que a leitura do código
//    mostrou antes de eu escrever uma linha — por isso o campo está aqui, travado.
//
// 3. A INSTRUÇÃO NÃO PODE MORAR NO PROMPT DE SISTEMA. O bloco de sistema é cacheado (dois
//    blocos ephemeral). Duas variantes = duas entradas de cache, e a rara pagaria ESCRITA de
//    cache quase toda vez — o remédio custaria mais que a doença. Ela mora na mensagem do
//    usuário, que é barata e não é cacheada.
//
// E a contrapartida, sem a qual isto vira informação sonegada: ao ABRIR um card que tem nota
// mas não tem prosa, o app refaz a análise completa sozinho, sem clique nenhum. É latência,
// não é um botão "pague para ver por quê".
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const raiz = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(raiz, 'senova-worker.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const { t, fim } = assert();

console.log('=== as duas esteiras pedem saída curta ===');
// A da Home (analisarLoteBackground, origem esteira_home) e a da importação
// (_pedirAnaliseVaga). As duas gravam nos mesmos campos e as duas varrem o acervo.
t('a esteira da Home pede saidaCurta',
  /origem:'esteira_home',\s*saidaCurta:true/.test(app),
  'a esteira da Home voltou a pagar prosa de vaga que ninguém abriu');
t('a esteira de importação pede saidaCurta',
  /descricao:descricao\|\|'',contexto:ctxTextoAtivos\(\),saidaCurta:true/.test(app),
  'a esteira de importação voltou a pagar prosa');
t('o card aberto NÃO pede saída curta — é ele quem lê a prosa',
  !/origem:'card_aberto'[^}]*saidaCurta/.test(app),
  'o card aberto pediu saída curta: a prosa nunca mais seria escrita por ninguém');

console.log('\n=== a má notícia continua chegando inteira ===');
const iCurta = worker.indexOf('const _blocoSaidaCurta');
t('existe o bloco de saída curta no Worker', iCurta > 0);
const instr = worker.slice(iCurta, iCurta + 1200);
t('a instrução manda esvaziar resumo', /"resumo":""/.test(instr));
t('a instrução manda esvaziar pontos_fortes', /"pontos_fortes":\[\]/.test(instr));
t('e ela reafirma pontos_atencao como obrigatório',
  /pontos_atencao/.test(instr), 'a saída curta parou de proteger os pontos contra');
t('e impedimentos também',
  /impedimentos/.test(instr), 'a saída curta parou de proteger os impedimentos');
t('nada além de resumo e pontos_fortes é esvaziado',
  !/"(pontos_atencao|impedimentos|dimensoes|classificacao|salario_compativel)":(\[\]|""|null)/.test(instr),
  'a saída curta passou a cortar um campo que decide a nota');

console.log('\n=== o sentinela de completude sobrevive ===');
// index.html: "nota sem pontos de atenção é resto de gravação incompleta e precisa ser refeita".
t('a esteira de importação ainda reconhece nota boa por pontos_atencao',
  /typeof v\.score==='number'\s*&&\s*Array\.isArray\(v\.pontos_atencao\)/.test(app),
  'o sentinela sumiu: toda vaga passaria a ser reanalisada para sempre');
t('e ainda grava pontos_atencao no card',
  /pontos_atencao:analise\.pontos_atencao\|\|\[\]/.test(app));

console.log('\n=== a instrução é barata: mensagem do usuário, nunca prompt de sistema ===');
// Se um dia alguém mover isto para dentro do systemPrompt, o cache passa a ter duas
// entradas e a chamada rara paga escrita de cache — mais caro do que a prosa que se cortou.
const iSys = worker.indexOf('const systemPrompt');
const iMsg = worker.indexOf("messages:[{ role:'user'", iCurta);   // a desta rota, não a da primeira rota do arquivo
t('o bloco é interpolado na mensagem do usuário',
  /\$\{_blocoSaidaCurta\}/.test(worker.slice(iMsg, iMsg + 900)),
  'a saída curta saiu da mensagem do usuário');
t('e o prompt de sistema continua único, sem variante por modo de saída',
  iSys > 0 && !/systemPrompt\w*\s*=\s*saidaCurta/.test(worker) && !/saidaCurta\s*\?[^\n]*systemPrompt/.test(worker),
  'nasceu um segundo prompt de sistema: o cache dobra e a economia vira prejuízo');

console.log('\n=== a posição do argumento, não a lista ===');
// Lição da S50: argumento posicional que muda de lugar em silêncio é bug mudo. `saidaCurta`
// é o ÚLTIMO da assinatura e o ÚLTIMO da chamada — se alguém inserir outro no meio, quebra aqui.
t('saidaCurta é o último parâmetro de analisarVaga',
  /async function analisarVaga\([^)]*,\s*saidaCurta\)/.test(worker),
  'saidaCurta mudou de posição na assinatura');
t('e o último argumento na chamada da rota',
  /analisarVaga\([^)]*,\s*saidaCurta\)\)/.test(worker),
  'a rota parou de repassar saidaCurta — a esteira pediria curta e receberia longa');
t('a rota lê saidaCurta do corpo do pedido',
  /origem,\s*modelo,\s*saidaCurta\s*\}\s*=\s*await request\.json\(\)/.test(worker));

console.log('\n=== a prosa que falta é buscada sozinha, sem clique ===');
t('o card aberto sabe se já tem prosa', /const _temProsa=/.test(app));
t('e o gatilho dispara quando há nota e não há prosa',
  /_hasScore&&!_temProsa/.test(app),
  'a prosa deixou de ser reposta: o card abriria mudo para sempre');
t('_prosaEm impede repagar a mesma vaga a cada abertura',
  /_vCheck\._prosaEm/.test(app) && /vagas\[idx\]\._prosaEm=Date\.now\(\)/.test(app),
  'sem o carimbo, vaga cuja análise volta sem prosa é repaga em toda abertura');
t('a regra antiga continua valendo: sem nota nenhuma, só em Oportunidade',
  /!_hasScore&&_vCheck\.status==='lead'/.test(app),
  'o app passou a pagar análise de card do refugo');

fim('saida_curta');
