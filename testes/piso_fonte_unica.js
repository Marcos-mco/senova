// GUARD — o piso de dignidade tem UM dono (S53, 27/ago/2026).
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
// Este teste NÃO guarda o valor 12000. Guarda a fonte única — se Marcos mudar o piso de novo,
// muda a constante e o teste continua verde. O que ele reprova é alguém reescrever o número
// à mão em qualquer um dos consumidores.
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const { t, fim } = assert();

console.log('=== o piso é declarado uma vez, como número ===');
const decl = worker.match(/const PISO_DIGNIDADE_BRL = (\d+);/);
t('existe a constante PISO_DIGNIDADE_BRL', !!decl, 'a fonte única sumiu');
const PISO = decl ? Number(decl[1]) : 0;
t('e ela é um valor mensal plausível em reais (não anual, não centavos)',
  PISO >= 1000 && PISO <= 100000, 'valor: ' + PISO);
t('declarada ANTES dos blocos que a citam (senão o prompt sai com undefined)',
  worker.indexOf('const PISO_DIGNIDADE_BRL') < worker.indexOf('const PERFIL_MARCOS'));

console.log('\n=== os dois blocos de prompt citam a constante, não um número ===');
// A identidade é montada por interpolação: quem lê o prompt tem de ver o piso vigente,
// nunca um número congelado numa string.
const iP = worker.indexOf('const PERFIL_MARCOS'), iF = worker.indexOf('async function montarIdentidadeCandidato');
const blocos = worker.slice(iP, iF);
t('PERFIL_MARCOS e PROJETO_DE_VIDA interpolam o piso', (blocos.match(/\$\{_pisoK\}/g) || []).length >= 4,
  'achei ' + (blocos.match(/\$\{_pisoK\}/g) || []).length + ' interpolações, esperava 4+');
t('e nenhum deles traz um piso em reais escrito à mão',
  !/R\$\d+k é o PISO/.test(blocos) && !/a partir de R\$\d+k/.test(blocos),
  'há piso literal dentro dos blocos de identidade');

console.log('\n=== o filtro da colheita deriva do mesmo número ===');
// O corte da varredura fala em base ANUAL. Enquanto o 96000 estava digitado, ele era um
// segundo piso que ninguém lembrava de mexer.
t('o piso brasileiro da colheita é derivado da constante',
  /salarioMinAnual:\s*PISO_DIGNIDADE_BRL\s*\*\s*12/.test(worker),
  'salarioMinAnual do Brasil voltou a ser número digitado');
t('e o valor anual antigo não sobrou em lugar nenhum',
  !/salarioMinAnual:\s*96000/.test(worker));

console.log('\n=== o piso só corta quem DECLARA salário ===');
// A regra de Marcos: "se não informar o salário não tem problema, mas eliminamos as que
// forem abaixo". Silêncio nunca elimina — 29 de 30 anúncios não dizem quanto pagam.
t('vaga sem salário declarado passa pelo filtro',
  /if \(!local\.salarioMinAnual \|\| !v\.salarioDeclarado\) return true;/.test(worker),
  'o silêncio voltou a eliminar');
t('numa faixa declarada, quem decide é o TETO, não o piso da negociação',
  /const teto = v\.salarioMax \|\| v\.salarioMin;/.test(worker));
t('e o corte continua contado (descarte silencioso é como se perde confiança num filtro)',
  /cortadasPorSalario\+\+/.test(worker));

fim('piso_fonte_unica');
