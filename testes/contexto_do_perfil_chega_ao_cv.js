// O QUE MARCOS ESCREVEU SOBRE SI PRECISA CHEGAR AO CV — E QUASE NUNCA CHEGAVA.
//
// 22/ago/2026. Marcos perguntou se o "Contexto" do Perfil está funcionando. Está: as entradas
// ativas vão inteiras para o score de compatibilidade. Mas no CV havia uma peneira, e a peneira
// era literal: só entrava a entrada que dividisse DUAS palavras de MAIS de 5 letras com o texto
// da vaga. O efeito prático, medido na lista real dele:
//
//   "Gestão de implantação ERP: Oracle · SAP · TOTVS" NÃO entrava num CV para vaga de SAP.
//
// Porque "SAP" tem três letras. O mesmo valia para IA, ISO, CRM, B2C — justamente as palavras
// que um anúncio usa para dizer o que quer. O score enxergava; o documento que vai ao recrutador,
// não. Um perfil complementar que só entra quando não é preciso é o mesmo que não existir.
//
// A régua nova pontua: etiqueta declarada em "Relevante:" = 2, sigla em caixa alta = 2, palavra
// comum de 6+ letras = 1; entra com 2. A parte antiga foi preservada intacta dentro da nova —
// este teste prova que NADA que entrava antes deixa de entrar.
const fs = require('fs');
const path = require('path');
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const s = carregarApp([
  'function _ctxNorm(',
  'function _ctxEtiquetas(',
  'function _ctxSiglas(',
  'function ctxCarregar(',
  'function ctxInicializar(',
  'function ctxSalvarTodos(',
  'function ctxTextoAtivos(',
  'function ctxBuscarRelevantes(',
]);

// A lista de fábrica REAL do app (as 7 informações que Marcos declarou), lida do index.html.
// Testar com uma lista inventada provaria só que a função roda; o que importa é se o material
// DELE chega ao documento.
function sementeReal() {
  const i = src.indexOf('const CTX_DEFAULT = [');
  const j = src.indexOf('\n];', i);
  if (i < 0 || j < 0) throw new Error('não achei CTX_DEFAULT no index.html');
  return src.slice(src.indexOf('[', i), j + 2);
}
// O teto vem do próprio index.html: se alguém mudar o número lá, o teste passa a medir o novo.
const TETO = Number(/const CTX_MAX_NO_CV = (\d+);/.exec(src)[1]);
exec(s, `CTX_MAX_NO_CV = ${TETO}; CTX_KEY = 'senova_contexto_extra'; CTX_DEFAULT = ${sementeReal()};`);
exec(s, `localStorage.setItem(CTX_KEY, JSON.stringify(CTX_DEFAULT))`);

const rel = (vaga) => chamar(s, 'ctxBuscarRelevantes', [vaga]).map(e => e.id);
// A régua ANTIGA, copiada como era, para provar que a nova a contém.
const relAntiga = (vaga) => JSON.parse(exec(s, 'JSON.stringify(ctxCarregar())'))
  .filter(e => e.usar)
  .filter(e => e.texto.toLowerCase().split(/[\s,·•\-–:()\/]+/).filter(w => w.length > 5)
    .filter(w => vaga.toLowerCase().includes(w)).length >= 2)
  .map(e => e.id);

console.log('=== a sigla de três letras, que era o buraco ===');
const VAGA_SAP = 'Analista Sênior SAP MM — atuar no rollout do S/4HANA em ambiente multinacional, '
  + 'apoiando as áreas de compras e estoque.';
t('a entrada de ERP/SAP/TOTVS agora entra no CV', rel(VAGA_SAP).includes('ctx_06'), rel(VAGA_SAP).join(',') || '(nenhuma)');
t('e a régua antiga realmente a deixava de fora', !relAntiga(VAGA_SAP).includes('ctx_06'));
t('ISO também deixou de ser invisível',
  rel('Vaga: Coordenador da Qualidade. Exige experiência com ISO 9001 e auditoria interna.').includes('ctx_05'));

console.log('\n=== mas sigla não pode virar coincidência ===');
// "ia" minúsculo é o verbo ir. Se a sigla casasse sem olhar a caixa, toda vaga em português
// afirmaria que Marcos tem experiência com inteligência artificial.
const VAGA_IA_FALSA = 'A pessoa selecionada ia responder ao head de operações e ia conduzir o time.';
t('"ia ser" não é experiência com IA', !rel(VAGA_IA_FALSA).includes('ctx_07'), rel(VAGA_IA_FALSA).join(',') || '(nenhuma)');
t('mas "IA" em caixa alta é', rel('Buscamos líder de produto com uso de IA aplicada ao negócio.').includes('ctx_07'));
t('sigla lida da entrada, sem lista fixa que envelhece',
  chamar(s, '_ctxSiglas', ['Gestão de ERP: Oracle · SAP · TOTVS']).join(',') === 'ERP,SAP,TOTVS');
t('palavra comum de início maiúsculo não é sigla', chamar(s, '_ctxSiglas', ['Marcos Franco']).length === 0);

console.log('\n=== a etiqueta que a própria pessoa escreveu vale sozinha ===');
t('"docência" na vaga traz a experiência de docência',
  rel('Professor convidado para MBA executivo. Docência em cursos de pós-graduação.').includes('ctx_04'));
t('as etiquetas saem do que vem depois de "Relevante:"',
  chamar(s, '_ctxEtiquetas', ['Fiz coisas. Relevante: qualidade, compliance, processos.']).join('|') === 'qualidade|compliance|processos');
t('entrada sem "Relevante:" simplesmente não tem etiqueta',
  chamar(s, '_ctxEtiquetas', ['Fiz um curso de marcenaria na Escócia.']).length === 0);

console.log('\n=== acento e caixa deixaram de decidir ===');
t('vaga escrita sem acento encontra "produção gráfica"',
  rel('VAGA: coordenador de PRODUCAO GRAFICA para editora. Experiencia com fluxo editorial.').includes('ctx_01'));
t('a normalização tira acento e caixa', chamar(s, '_ctxNorm', ['PRODUÇÃO Gráfica']) === 'producao grafica');

console.log('\n=== nada que entrava antes deixa de entrar ===');
// A parte antiga da régua (palavra comum de 6+ letras, casada como substring) foi preservada
// literalmente dentro da nova. Se alguém a "simplificar" um dia, este teste acusa.
const AMOSTRAS = [
  VAGA_SAP,
  'Diretor de Marketing para grupo de mídia. Gestão de equipe comercial e planejamento estratégico.',
  'Gerente de Produção gráfica, com gestão de equipe em múltiplos estados e controle de qualidade.',
  'Head de Operações — supply chain, logística e eficiência operacional em escala nacional.',
  'Analista de sistemas para transformação digital, projetos de tecnologia e integração.',
];
AMOSTRAS.forEach((v, i) => {
  const antes = relAntiga(v), agora = rel(v);
  t('amostra ' + (i + 1) + ': a régua nova contém a antiga',
    antes.every(id => agora.includes(id)), 'antes=[' + antes + '] agora=[' + agora + ']');
});

console.log('\n=== e continua sendo uma peneira, não um despejo ===');
t('vaga sem nada a ver não arrasta material irrelevante',
  rel('Vaga para chef de cozinha em restaurante de frutos do mar no litoral.').length === 0);
t('o que está desmarcado no Perfil não entra', (() => {
  exec(s, `(function(){const l=ctxCarregar();l.forEach(e=>e.usar=false);ctxSalvarTodos(l);})()`);
  const vazio = rel(VAGA_SAP).length === 0;
  exec(s, `(function(){const l=ctxCarregar();l.forEach(e=>e.usar=true);ctxSalvarTodos(l);})()`);
  return vazio;
})());
t('a lista real de Marcos continua inteira depois do teste', chamar(s, 'ctxTextoAtivos', []).length === 7);

console.log('\n=== o teto do CV: os mais fortes primeiro ===');
// Um CV com tudo o que a pessoa já fez é o oposto de um CV adaptado. O corte existe — e tira
// o mais fraco, nunca o mais forte, porque a lista vai ordenada por pontos.
exec(s, `(function(){
  const l = ctxCarregar();
  for(let i=0;i<12;i++) l.push({id:'extra_'+i, usar:true, dt:'2026-08-22',
    texto:'Experiência em marketing e planejamento estratégico. Relevante: marketing.'});
  ctxSalvarTodos(l);
})()`);
const muitos = rel('Vaga de marketing: planejamento estratégico e gestão de marca.');
t('no máximo ' + TETO + ' complementos vão ao CV', muitos.length <= TETO, muitos.length + '');
t('e o teto está escrito uma vez só, com nome', TETO === 8, TETO + '');

console.log('\n=== fiação: isto chega mesmo ao documento ===');
t('o CV recebe os complementos como PERFIL COMPLEMENTAR', /PERFIL COMPLEMENTAR \(inclua apenas o relevante/.test(src));
t('e o score recebe TODOS os ativos, sem peneira', /contexto:ctxTextoAtivos\(\)/.test(src));

console.log('\n=== o contexto de uso único do card, que o código lia e a tela não tinha ===');
// gerarCVInline e gerarDocModal liam 'mv-ctx-analise' desde sempre; o campo nunca existiu na
// marcação, então o CV do card saía com contexto de rodada vazio, sempre.
t('o campo existe na tela do card', /id="mv-ctx-analise"/.test(src));
t('a geração do CV continua lendo o mesmo campo', /getElementById\('mv-ctx-analise'\)/.test(src));
t('e a tela diz que ele não fica salvo', /Não fica salvo — para valer em todas as vagas/.test(src));
// O modal do card é UM só, reaproveitado. Sem limpar na abertura, o contexto da vaga A entraria
// dentro do CV da vaga B — e ninguém veria, porque o campo nasce recolhido.
t('abrir um card zera o contexto do card anterior', /_mvLimparCtxAnalise\(\);\s+\/\/ contexto de uso único/.test(src));
t('a limpeza é incondicional (card novo ou antigo)',
  /const isNew=id==='new';\s*\r?\n\s*_mvLimparCtxAnalise\(\);/.test(src));

fim('O contexto do Perfil chega ao CV');
