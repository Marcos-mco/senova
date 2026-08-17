// GUARD — nenhum card nasce com salário FABRICADO. Salário é fato da vaga ou não existe.
//
// Por que este teste existe. 17/ago/2026 (S47), durante o parecer de viabilidade do S5
// (jornada em metaConhecida), o senova-viabilidade achou `saveVagaFromCV` (index.html:4298)
// gravando `salario:'R$15k CLT'` em TODO card criado por ali — um valor fixo, sem qualquer
// relação com a vaga real, escrito como se fosse dado capturado. Isso é o oposto da regra
// ética do projeto (SOFIA_ALMA.md: nada desonesto, jamais) e era um dos motivos pelos quais
// o parecer REPROVOU mandar `salario` para a IA como "fato conhecido" (S5): o campo já estava
// contaminado na origem. Removido o valor fixo — o card nasce sem salário (campo ausente),
// consistente com a regra "nunca mostrar campos vazios" do design system (skill_design_senova
// §9) em vez de mostrar um número que ninguém declarou.
const { html, assert } = require('./_lib');
const { t, fim } = assert();

console.log('=== saveVagaFromCV não fabrica salário ===');
const iniFn = html.indexOf('function saveVagaFromCV()');
const fimFn = html.indexOf('\nfunction ', iniFn + 1);
const corpoFn = html.slice(iniFn, fimFn);

t('a função existe e foi localizada', iniFn > 0 && fimFn > iniFn);
t('não grava mais o valor fixo "R$15k CLT"', !/R\$15k CLT/.test(corpoFn));
t('o objeto de vaga criado não tem chave salario nenhuma (nem vazia)', !/salario\s*:/.test(corpoFn));
t('continua gravando empresa/cargo normalmente (não quebrou o resto do card)',
  /empresa,cargo,canal:'LinkedIn'/.test(corpoFn));

fim('salario_nao_inventado');
