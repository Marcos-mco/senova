// GUARD — o systemPrompt de analisarVaga não pode mais variar por chamada (S45).
//
// Por que este teste existe. O agente senova-viabilidade achou que o bloco SCORE
// ANTERIOR vivia DENTRO do systemPrompt via `${_scoreAnt ? \`...${_scoreAnt}...\` : ''}`
// — ou seja, toda reanálise manual (score anterior > 0) mudava o texto cacheado,
// quebrava o cache da Anthropic e pagava escrita nova (~12,5x mais cara que leitura)
// pela MESMA vaga/candidato de sempre. A correção: a instrução fica sempre presente e
// genérica no systemPrompt (nunca muda), e só o NÚMERO real vai para a mensagem do
// usuário — que já não é cacheada mesmo. O agente também apontou um risco de injeção:
// o SCORE ANTERIOR tem de vir ANTES da descrição da vaga na mensagem do usuário, nunca
// depois — senão uma descrição hostil poderia forjar "SCORE ANTERIOR: 95" e o texto
// real (confiável, vindo do app) ficaria indistinguível do texto injetado (vindo do
// anunciante). Este teste protege as duas regras por leitura de código.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

const iniAnalisar = worker.indexOf('async function analisarVaga(');
const fimAnalisar = worker.indexOf('\nasync function', iniAnalisar + 1);
const corpoAnalisar = worker.slice(iniAnalisar, fimAnalisar);

const iniSystem = corpoAnalisar.indexOf('const systemPrompt');
const iniMessages = corpoAnalisar.indexOf('messages:[{');
const systemPromptSrc = corpoAnalisar.slice(iniSystem, corpoAnalisar.indexOf('const resp'));
const messagesSrc = corpoAnalisar.slice(iniMessages, corpoAnalisar.indexOf('}),', iniMessages));

console.log('=== o systemPrompt nunca mais varia por chamada (cache não quebra em reanálise) ===');
t('_scoreAnt não aparece dentro do bloco do systemPrompt',
  !systemPromptSrc.includes('${_scoreAnt'));
t('a instrução sobre SCORE ANTERIOR continua no systemPrompt, mas de forma incondicional',
  systemPromptSrc.includes('SCORE ANTERIOR') && systemPromptSrc.includes('explicacao_queda'));

console.log('\n=== o número real do score anterior vai na mensagem do usuário, não no cache ===');
t('_scoreAnt aparece condicionalmente na mensagem do usuário',
  /messages:\[\{[^}]*content:`\$\{_scoreAnt\?/.test(corpoAnalisar));

console.log('\n=== ordem anti-injeção: SCORE ANTERIOR vem ANTES da descrição da vaga, nunca depois ===');
const posScoreAnt = messagesSrc.indexOf('${_scoreAnt?');
const posVaga = messagesSrc.indexOf('VAGA: $');
t('o placeholder do score anterior existe na mensagem do usuário', posScoreAnt !== -1 && posVaga !== -1);
t('SCORE ANTERIOR vem antes de VAGA: (descrição de terceiro nunca pode precedê-lo)',
  posScoreAnt < posVaga, `scoreAnt=${posScoreAnt} vaga=${posVaga}`);

console.log('\n=== a mensagem do usuário sem score anterior não muda de tamanho/forma ===');
t('sem _scoreAnt, o template não injeta texto extra (interpolação vazia)',
  messagesSrc.includes("_scoreAnt?`SCORE ANTERIOR"));

fim('radar_prompt_estavel');
