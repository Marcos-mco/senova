// O período do teto é o da CONTA de quem paga, não o do calendário (S53).
//
// Marcos: "o limite é 200 a partir do dia 20 passado até 19 do próximo mês. É quando fecha a
// fatura do cartão." Em 26/ago/2026 o calendário dizia R$ 268 gastos e a fatura que vai chegar
// dizia R$ 117 — frear pelo número errado é frear na hora errada.
//
// O que este teste guarda: (a) as datas, incluindo as bordas que quebram aritmética ingênua
// (fevereiro com fechamento 31, virada de ano, o próprio dia do fechamento); (b) que o dia de
// fechamento é DADO DE QUEM PAGA e não uma constante — o crivo de universalidade: quem não usa
// cartão continua no mês do calendário, sem nunca ter ouvido falar deste campo.

const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib.js');

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const { t, fim } = assert('Ciclo de fatura');

// Carrega as três funções puras do Worker num sandbox — são de data, não tocam em D1 nem KV.
const vm = require('vm');
const ctx = { console };
vm.createContext(ctx);
for (const nome of ["diaDeFechamentoValido", "function _ultimoDiaDoMes", "function _fechamentoDoMes", "function _diaSeguinte", "function inicioDoCiclo", "function zeramentoDoCiclo"]) {
  const busca = nome.startsWith('function') ? nome : `function ${nome}`;
  const i = worker.indexOf(busca);
  if (i < 0) { t(`função ${nome} existe no Worker`, false); continue; }
  let n = 0, j = worker.indexOf('{', i);
  const ini = i;
  do { if (worker[j] === '{') n++; else if (worker[j] === '}') n--; j++; } while (n > 0 && j < worker.length);
  vm.runInContext(worker.slice(ini, j), ctx);
}

const em = (iso) => new Date(iso + 'T12:00:00Z');
const ini = (f, d) => ctx.inicioDoCiclo(f, em(d));
const zera = (f, d) => ctx.zeramentoDoCiclo(f, em(d));

// ── O caso dele: fatura fecha dia 19, hoje é 26/ago ──────────────────────────
t('26/ago com fechamento 19 → ciclo começou em 20/ago', ini(19, '2026-08-26') === '2026-08-20');
t('26/ago com fechamento 19 → contador zera em 20/set', zera(19, '2026-08-26') === '2026-09-20');

// ── Bordas do próprio fechamento ─────────────────────────────────────────────
// No DIA do fechamento a fatura ainda não fechou: o ciclo é o que abriu no mês passado.
t('no dia 19 o ciclo ainda é o que abriu em 20/jul', ini(19, '2026-08-19') === '2026-07-20');
t('no dia 20 o ciclo é novo, começa hoje',            ini(19, '2026-08-20') === '2026-08-20');

// ── Virada de ano ────────────────────────────────────────────────────────────
t('05/jan com fechamento 19 → ciclo abriu em 20/dez do ano anterior', ini(19, '2027-01-05') === '2026-12-20');
t('26/dez com fechamento 19 → zera em 20/jan do ano seguinte',        zera(19, '2026-12-26') === '2027-01-20');

// ── Fevereiro e o fechamento que não cabe no mês ─────────────────────────────
// Fechamento 31 em fevereiro: a fatura fecha no último dia dele. O mês é que é curto.
t('fechamento 31 em fevereiro fecha no último dia do mês', ini(31, '2026-02-15') === '2026-02-01');
t('fechamento 30 em 05/mar → ciclo abriu em 01/mar (fev acabou no 28)', ini(30, '2026-03-05') === '2026-03-01');
t('fechamento 31 em 15/mar → ciclo abriu em 01/mar',       ini(31, '2026-03-15') === '2026-03-01');

// ── Sem fatura declarada: o comportamento de antes, o mês do calendário ──────
t('sem dia de fechamento o ciclo é o mês do calendário', ini(null, '2026-08-26') === '2026-08-01');
t('sem dia de fechamento o contador zera no dia 1º',     zera(null, '2026-08-26') === '2026-09-01');
t('dia de fechamento inválido não vira ciclo torto',     ini(0, '2026-08-26') === '2026-08-01' && ini(99, '2026-08-26') === '2026-08-01');

// ── O ciclo é sempre um período fechado e contíguo ──────────────────────────
// Nenhum dia pode cair fora de todos os ciclos, nem em dois ao mesmo tempo: o zeramento de um
// ciclo é exatamente o início do próximo. Sem isso, gasto some ou é contado duas vezes.
let contiguo = true;
for (const f of [1, 5, 19, 28, 29, 30, 31, null]) {
  for (let d = 1; d <= 28; d++) {
    for (const mes of ['01', '02', '03', '08', '12']) {
      const hoje = `2026-${mes}-${String(d).padStart(2, '0')}`;
      const fim1 = zera(f, hoje);
      // Um instante depois do zeramento, o ciclo corrente tem de ser exatamente aquele dia.
      if (ini(f, fim1) !== fim1) { contiguo = false; }
    }
  }
}
t('o dia em que um ciclo zera é o primeiro dia do ciclo seguinte', contiguo);

// ── Crivo de universalidade: o dia é dado, nunca constante ──────────────────
// Se algum dia "19" ou "20" for escrito na camada que decide, a trava passa a ser a do cartão
// do Marcos, não a de quem usar o Senova em Berlim. [[feedback_senova_para_qualquer_um_s51]]
const decide = worker.slice(worker.indexOf('function inicioDoCiclo'), worker.indexOf('async function estadoDoOrcamento'));
t('nenhum dia de fechamento hardcoded na camada que decide', !/[^\w](19|20)\s*[;,)]/.test(decide.replace(/\/\/[^\n]*/g, '')));
t('o dia de fechamento sai do orçamento de quem paga', /dia_fechamento: diaDeFechamentoValido\(o\.dia_fechamento\)/.test(worker));
t('sem fechamento declarado, o padrão é o mês do calendário', /dia_fechamento: null/.test(worker));

// ── A trava e o painel leem o MESMO ciclo ───────────────────────────────────
// Dois cálculos de janela é como a tela discordar da trava — o defeito que estadoDoOrcamento
// existe para impedir. A soma do gasto recebe o início; ninguém recalcula por fora.
t('a soma do gasto recebe o início do ciclo, não o calcula',
  /async function _gastoDoCicloUSD\(env, dono, inicio\)/.test(worker) &&
  /\.bind\(\.\.\.meus, inicio\)/.test(worker));
t('o estado do orçamento publica o ciclo para a tela',
  /ciclo = \{ inicio: inicioDoCiclo\(orcamento\.dia_fechamento\), zera_em: zeramentoDoCiclo\(orcamento\.dia_fechamento\) \}/.test(worker));
t('a recusa promete a data de zeramento do ciclo, não o dia 1º',
  /_dataCurta\(ciclo\.zera_em\)/.test(worker) && !/desde o dia 1º/.test(worker));

fim();
