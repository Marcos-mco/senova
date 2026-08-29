// GUARD — régua v4: dimensão sem dado sai da conta, e a nota diz quanto foi possível julgar.
// (S53, 28/ago/2026 — Movimentos 2 e 3 da proposta de régua, aprovados por Marcos.)
//
// O buraco. Anúncio que não declarava salário recebia nota em remuneração assim mesmo: o
// modelo improvisava entre 0 e 15 e ninguém sabia qual improviso tinha sido. Dois modelos
// diferentes chutavam diferente sobre a MESMA vaga, e a diferença entre eles aparecia como
// desacordo sobre o candidato. Não era: era desacordo sobre o que fazer com o que ninguém
// informou. Zero afirma que a vaga é ruim naquilo; null afirma que não se sabe. As duas
// afirmações não são intercambiáveis, e o app vinha trocando uma pela outra em silêncio.
//
// O que este teste protege, em ordem de gravidade:
//
// 1. A COBERTURA SÓ É PORCENTAGEM PORQUE OS TETOS SOMAM 100. O denominador da nota é a soma
//    dos tetos respondidos, e ele é publicado ao usuário como "% do que dava para saber".
//    Mexer num teto sem mexer nos outros transforma esse número num absurdo que continua
//    parecendo uma porcentagem — instrumentação mentindo sobre o próprio sujeito.
//
// 2. NADA DO ACERVO É REPONTUADO. Decisão dele, verbatim: "o que está feito está feito".
//    Nota v3 e nota v4 convivem no mesmo Kanban, e só podem conviver porque o deslocamento
//    medido entre as escalas é pequeno (+2,3 pontos em média sobre 28 vagas reais, máximo 8).
//
// 3. O DETALHAMENTO DO ACERVO NÃO É APAGADO POR UMA TROCA DE RÉGUA. A v4 mudou a soma, não
//    os nomes nem os tetos: o detalhamento de um card v3 continua verdadeiro sobre o card que
//    o produziu.
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const raiz = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(raiz, 'senova-worker.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const { t, fim } = assert();

console.log('=== os tetos somam 100 — é o que faz a cobertura ser porcentagem ===');
const mT = worker.match(/const TETOS_DIMENSAO = \{([^}]+)\}/);
t('TETOS_DIMENSAO existe', !!mT);
const tetos = {};
(mT ? mT[1] : '').split(',').forEach(p => {
  const m = p.match(/(\w+)\s*:\s*(\d+)/);
  if (m) tetos[m[1]] = Number(m[2]);
});
const soma = Object.values(tetos).reduce((a, b) => a + b, 0);
t('a soma dos tetos é exatamente 100 (é ' + soma + ')', soma === 100,
  'a cobertura publicada ao usuário deixou de ser porcentagem e continua com o símbolo %');
t('as 5 dimensões continuam sendo as 5', Object.keys(tetos).length === 5,
  'o número de dimensões mudou sem a régua ser versionada');

console.log('\n=== a dimensão nula sai da soma E do denominador ===');
const iSoma = worker.indexOf('for (const [k, teto] of Object.entries(TETOS_DIMENSAO))');
const bloco = worker.slice(iSoma, iSoma + 900);
t('null e ausente são tratados como "sem dado", não como zero',
  /if \(v === null \|\| v === undefined\) \{ semDado\.push\(k\); continue; \}/.test(bloco),
  'voltou a tratar dado ausente como número — o chute silencioso renasce');
t('a dimensão sem dado não entra no obtido nem na cobertura',
  /obtido \+= v;/.test(bloco) && /cobertura \+= teto;/.test(bloco),
  'o denominador deixou de acompanhar o numerador: a nota vira fração de um total errado');
t('a nota é o obtido sobre o respondido, em 0-100',
  /Math\.round\(100 \* obtido \/ cobertura\)/.test(worker),
  'a redistribuição proporcional sumiu — dimensão ausente voltaria a valer zero na prática');
t('cobertura zero vira nota nula, não nota baixa',
  /cobertura > 0\) \? Math\.round\(100 \* obtido \/ cobertura\) : null/.test(worker),
  'ausência total de análise passou a ser apresentada como nota — a pior das confusões');
t('o Worker devolve a cobertura', /r\.cobertura = /.test(worker),
  'a nota voltou a viajar sem dizer sobre quanto ela foi dada');
t('e diz quais dimensões ficaram de fora', /r\.dimensoes_sem_dado = /.test(worker),
  'a lista do que não deu para julgar sumiu');

console.log('\n=== a instrução distingue "não informado" de "ruim" ===');
t('o esquema do JSON admite null', /"area":\(0-30 ou null\)/.test(worker),
  'o modelo voltou a ser obrigado a inventar um número');
t('e a regra proíbe usar null para fugir de nota baixa',
  /null é ausência de dado, nunca nota baixa disfarçada/.test(worker),
  'sem essa frase o null vira escapatória e a nota fica mais alta por omissão');
t('informação fraca continua sendo julgada',
  /Se a informação existe mas é pouca, vaga ou indireta, JULGUE com o que há/.test(worker),
  'o modelo passa a chamar de ausente tudo que é difícil — e a cobertura vira ficção');

console.log('\n=== o acervo não é repontuado, e não perde o que já mostrava ===');
t('a régua está na v4', /const RUBRICA_V=4;/.test(app),
  'a versão da régua não acompanhou a mudança da soma');
t('o detalhamento aceita cards de régua anterior',
  /if\(v\?\.rubricaV>=3&&v\?\.compatDimensoes/.test(app),
  'preso à versão exata: cada troca de régua apaga o detalhamento do acervo inteiro');
t('não há repontuação em lote em lugar nenhum',
  !/reanalisarTudo|repontuarAcervo|recalcularTodas/.test(app),
  'nasceu uma varredura que repontua o acervo — ele disse "o que está feito está feito"');

console.log('\n=== a dimensão sem dado aparece na tela, não some dela ===');
t('a linha do detalhamento mostra "não informado"',
  /não informado<\/span>/.test(app),
  'a dimensão sem dado sumiu da linha: a soma parece não fechar e vira erro aparente nosso');
t('e a cobertura é dita em palavra, não só em número',
  /do que dava para saber/.test(app),
  'a porcentagem ficou sem sujeito — número sem dizer de quê é o defeito recorrente do projeto');
t('cobertura de 100% não vira selo em toda vaga',
  /v\.compatCobertura<100/.test(app),
  'o caso normal virou ruído em todos os cards');

console.log('\n=== um gravador só para os campos novos ===');
// rubricaV/perfilV/compatDimensoes já nascem repetidos em três esteiras. Acrescentar um
// quarto campo às três seria repetir de propósito o padrão que já custou duas correções.
// A atribuição, não a leitura: [^=] separa "compatCobertura=" de "compatCobertura===".
const gravacoes = (app.match(/.compatCoberturas*=[^=]/g) || []).length;
t('compatCobertura é escrito em UM lugar só (' + gravacoes + ')', gravacoes === 1,
  'a cobertura ganhou um segundo gravador — é assim que dois números do mesmo fato divergem');
const iFn = app.indexOf('function _aplicarSinaisWorker');
const iGrav = app.indexOf('alvo.compatCobertura=');
t('e esse lugar é a função por onde as três esteiras passam',
  iFn > 0 && iGrav > iFn && (iGrav - iFn) < 2000,
  'saiu de _aplicarSinaisWorker: alguma esteira deixa de gravar a cobertura');

fim('regua_cobertura');
