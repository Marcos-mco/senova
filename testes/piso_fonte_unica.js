// GUARD — o piso de dignidade tem UM dono, e são DUAS pernas (S53, 27–28/ago/2026).
//
// Por que este teste existe. Marcos corrigiu o piso de R$8k para R$12k e o número estava
// escrito à mão em três lugares: a linha de remuneração do PERFIL_MARCOS, a mesma linha do
// PROJETO_DE_VIDA, e uma terceira vez em base ANUAL (96000) no filtro salarial da colheita.
// Corrigir dois e esquecer o terceiro é o modo de falha silencioso pior de todos: a nota
// passaria a dizer "impedimento abaixo de R$12k" enquanto a varredura continuava colhendo
// vagas de R$8k — duas réguas, nenhuma errada sozinha, o conjunto mentindo.
//
// É o padrão "N gravadores do mesmo fato" que já nos custou caro antes. A defesa não é
// lembrar: é o número morar num lugar só e os outros derivarem dele.
//
// ── 28/ago: e aí o piso deixou de ser um número ──────────────────────────────────────────
// "salários em Curitiba mínimo 8000 e demais localidades, 12 mil." O piso único de 12k, que
// eu tinha acabado de publicar, passava a cortar da colheita toda vaga de Curitiba entre 8k
// e 12k — exatamente as que ele quer ver. Um fix correto em 24h vira um fix errado quando a
// regra que ele tinha na cabeça era mais rica que a pergunta que eu fiz.
//
// A regra tem duas pernas porque mudar de cidade custa dinheiro; isso vale para qualquer
// pessoa. E na COLHEITA vale sempre a perna menor: ali ainda não se sabe se a vaga exige
// mudança, e cortar pelo piso maior joga fora a vaga de casa que pagava bem para casa.
//
// Este teste NÃO guarda os valores 8000/12000. Guarda a fonte única e a assimetria — se
// Marcos mudar qualquer um dos dois pisos, muda a constante e o teste segue verde. O que ele
// reprova é alguém reescrever um piso à mão num consumidor, ou a colheita voltar a cortar
// pela perna alta.
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const { t, fim } = assert();

console.log('=== o piso é declarado uma vez, e tem duas pernas ===');
const casa = worker.match(/const PISO_CASA_BRL\s*=\s*(\d+);/);
const mud  = worker.match(/const PISO_MUDANCA_BRL\s*=\s*(\d+);/);
t('existe PISO_CASA_BRL (vaga que não obriga a sair da cidade)', !!casa, 'a fonte única sumiu');
t('existe PISO_MUDANCA_BRL (vaga que obriga a mudar)', !!mud, 'a fonte única sumiu');
const C = casa ? Number(casa[1]) : 0, M = mud ? Number(mud[1]) : 0;
t('os dois são mensais plausíveis em reais (não anuais, não centavos)',
  C >= 1000 && C <= 100000 && M >= 1000 && M <= 100000, `casa: ${C} · mudança: ${M}`);
t('mudar de cidade nunca custa MENOS do que ficar — o piso de mudança é o maior',
  M >= C, `piso de mudança (${M}) ficou abaixo do de casa (${C}) — a regra inverteu`);
t('declarados ANTES dos blocos que os citam (senão o prompt sai com undefined)',
  worker.indexOf('const PISO_CASA_BRL') < worker.indexOf('const PERFIL_MARCOS'));

console.log('\n=== o piso antigo, de perna única, não sobreviveu em canto nenhum ===');
t('PISO_DIGNIDADE_BRL não existe mais', !worker.includes('PISO_DIGNIDADE_BRL'));
t('nem o atalho _pisoK, que só sabia falar de um piso', !worker.includes('${_pisoK}'));

console.log('\n=== os dois blocos de prompt citam as constantes, não números ===');
// A identidade é montada por interpolação: quem lê o prompt tem de ver o piso vigente,
// nunca um número congelado numa string.
const iP = worker.indexOf('const PERFIL_MARCOS'), iF = worker.indexOf('async function montarIdentidadeCandidato');
const blocos = worker.slice(iP, iF);
const nCasa = (blocos.match(/\$\{_pisoCasaK\}/g) || []).length;
const nMud  = (blocos.match(/\$\{_pisoMudancaK\}/g) || []).length;
t('PERFIL_MARCOS e PROJETO_DE_VIDA interpolam o piso de casa', nCasa >= 2, `achei ${nCasa}, esperava 2+`);
t('e também o de mudança — os dois blocos precisam saber das DUAS pernas',
  nMud >= 2, `achei ${nMud}, esperava 2+`);
t('e nenhum deles traz um piso em reais escrito à mão',
  !/R\$\d+k é o PISO/.test(blocos) && !/a partir de R\$\d+k/.test(blocos),
  'há piso literal dentro dos blocos de identidade');

console.log('\n=== a colheita corta pela perna MENOR, e derivada ===');
// O corte da varredura fala em base ANUAL. Enquanto o 96000 estava digitado, ele era um
// segundo piso que ninguém lembrava de mexer.
t('existe PISO_COLHEITA_BRL, derivado dos dois — nunca digitado',
  /const PISO_COLHEITA_BRL = Math\.min\(PISO_CASA_BRL, PISO_MUDANCA_BRL\);/.test(worker),
  'a colheita voltou a ter piso próprio');
t('o piso brasileiro da colheita deriva dele',
  /salarioMinAnual:\s*PISO_COLHEITA_BRL\s*\*\s*12/.test(worker),
  'salarioMinAnual do Brasil voltou a ser número digitado');
t('e o valor anual antigo não sobrou em lugar nenhum',
  !/salarioMinAnual:\s*96000/.test(worker) && !/salarioMinAnual:\s*144000/.test(worker));

console.log('\n=== o piso só corta quem DECLARA salário ===');
// A regra de Marcos: "se não informar o salário não tem problema, mas eliminamos as que
// forem abaixo". Silêncio nunca elimina — 28 de 30 anúncios não dizem quanto pagam.
t('vaga sem salário declarado passa pelo filtro',
  /if \(!local\.salarioMinAnual \|\| !v\.salarioDeclarado\) return true;/.test(worker),
  'o silêncio voltou a eliminar');
t('numa faixa declarada, quem decide é o TETO, não o piso da negociação',
  /const teto = v\.salarioMax \|\| v\.salarioMin;/.test(worker));
t('e o corte continua contado (descarte silencioso é como se perde confiança num filtro)',
  /cortadasPorSalario\+\+/.test(worker));

fim('piso_fonte_unica');
