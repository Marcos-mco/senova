// GUARD — vaga que exige fluência acima do nível declarado tem que ser IMPEDIMENTO, nunca só
// um ponto de atenção que o score ignora.
//
// Por que este teste existe. Em 17/ago/2026 Marcos disse: "Vagas que pedem inglês fluente não
// podem passar. Eu tenho apenas avançado." O senova-auditor mediu no KV real (381 vagas): 67
// tinham gap de fluência já detectado pela própria IA em pontos_atencao ("gap real",
// "eliminatório") e mesmo assim passavam do Critério da região (55) — porque a instrução do
// prompt só mandava registrar o gap em pontos_atencao, nunca em impedimentos, e só
// `impedimentos` aciona o teto de score 45 (TETO_SCORE_COM_IMPEDIMENTO, código, já existia e já
// funciona — nunca era acionado para este caso). Vagas como "Director of Sales & Marketing"
// (79/100) e "Diretor comercial — inglês fluente" (52/100) eram promovidas a Oportunidade com
// o próprio texto da IA dizendo que o requisito era eliminatório.
//
// O mecanismo de corte (senova-worker.js: TETO_SCORE_COM_IMPEDIMENTO, o merge impedimentos→
// pontos_atencao, o rebaixe de classificacao) é código existente e não mudou — só a instrução
// que decide QUANDO algo vira impedimento. Este teste protege a instrução, por leitura de
// código (o mecanismo de corte já não é responsabilidade deste arquivo).
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const iniAnalisar = worker.indexOf('async function analisarVaga(');
const fimAnalisar = worker.indexOf('\nasync function', iniAnalisar + 1);
const corpoAnalisar = worker.slice(iniAnalisar, fimAnalisar);
const iniSystem = corpoAnalisar.indexOf('const systemPrompt');
const systemPromptSrc = corpoAnalisar.slice(iniSystem, corpoAnalisar.indexOf('const resp'));

console.log('=== a instrução de IDIOMAS manda gap de fluência para impedimentos, não só pontos_atencao ===');
t('diz explicitamente que o gap "é IMPEDIMENTO"',
  /exige fluência[^.]*NÃO é fluente[^.]*isto é IMPEDIMENTO/.test(systemPromptSrc));
t('manda listar em "impedimentos" (nunca apenas em pontos_atencao)',
  /liste em "impedimentos" \(nunca apenas em pontos_atencao/.test(systemPromptSrc));
t('idioma não declarado no perfil também vira impedimento, não só "o candidato não fala"',
  /Idioma NÃO declarado no perfil = o candidato não fala, também impedimento/.test(systemPromptSrc));

console.log('\n=== a seção IMPEDIMENTOS lista fluência abaixo do exigido como caso explícito ===');
t('o bullet de idioma cobre fluência acima do nível DECLARADO, com exemplo avançado→fluente',
  /idioma local ou exigido que o candidato não fala, OU que exige fluência[^;]*acima do nível DECLARADO[^;]*avançado[^;]*fluente[^;]*impedimento/.test(worker));

console.log('\n=== o mecanismo de corte que este fix ativa continua no lugar (não mudou, mas tem de existir) ===');
t('TETO_SCORE_COM_IMPEDIMENTO ainda existe e vale 45',
  /const TETO_SCORE_COM_IMPEDIMENTO = 45;/.test(worker));
t('score acima do teto é rebaixado quando há impedimentos',
  /if \(typeof r\.score === 'number' && r\.score > TETO_SCORE_COM_IMPEDIMENTO\) r\.score = TETO_SCORE_COM_IMPEDIMENTO;/.test(worker));
t('classificacao "candidatar" é rebaixada para "analisar" quando há impedimentos',
  /if \(r\.classificacao === 'candidatar'\) r\.classificacao = 'analisar';/.test(worker));
t('impedimentos entram no topo de pontos_atencao — nenhum impedimento fica invisível ao app',
  /r\.pontos_atencao = \[\.\.\.r\.impedimentos, \.\.\.atencao\]/.test(worker));

fim('IMPEDIMENTO DE FLUÊNCIA · VAGA QUE PEDE FLUENTE E O CANDIDATO TEM AVANÇADO NÃO PASSA');
