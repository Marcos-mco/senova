// GUARD — regime "Ambos" (CLT ou PJ, vindo da IA) não pode sumir do card ao salvar.
//
// Por que este teste existe. 17/ago/2026 (S47), auditoria de backlog do fix ALS: a IA devolve
// regime:"ambos" (senova-worker.js:3021), o app mapeia para o rótulo 'Ambos' ao abrir o card
// (index.html:7754), mas o <select id="mv-regime"> não tinha essa opção — só "", CLT, PJ, "CLT
// ou PJ". Atribuir um valor a um <select> sem essa <option> deixa o elemento no valor default
// (a 1ª option, vazia); como o campo fica oculto quando o pill já mostra o dado
// (_mvOcultarDadosDuplicados, index.html:9755-9762), ninguém via — e ao salvar, o app lê
// select.value e grava regime:'' (index.html:8474). O regime sumia do card no 1º salvamento.
// `modelo` nunca teve esse problema porque seu mapa (index.html:7753) já batia com as opções
// do <select id="mv-modelo">.
//
// Teste comportamental real: um <select> puro do jsdom-less DOM não existe aqui, então
// simulamos o contrato mínimo que o app depende de um <select> (lista de <option>, e
// atribuir .value só "pega" se bater com o value de alguma option) — é exatamente o
// comportamento real do browser que causou o bug.
class OptionFake { constructor(value) { this.value = value; } }
class SelectFake {
  constructor(optionValues) { this._options = optionValues.map(v => new OptionFake(v)); this._value = ''; }
  get options() { return this._options; }
  set value(v) { this._value = this._options.some(o => o.value === v) ? v : ''; }
  get value() { return this._value; }
}

const { html, assert } = require('./_lib');
const { t, fim } = assert();

console.log('=== o <select id="mv-regime"> no HTML real inclui a option "Ambos" ===');
const iniSelect = html.indexOf('<select id="mv-regime"');
const fimSelect = html.indexOf('</select>', iniSelect);
const blocoSelect = html.slice(iniSelect, fimSelect);
t('tem <option value="Ambos">', /<option value="Ambos">/.test(blocoSelect));

console.log('\n=== simulação do contrato real do <select>: atribuir "Ambos" sem a option zera o valor (é o bug) ===');
{
  const selectSemOpcao = new SelectFake(['', 'CLT', 'PJ', 'CLT ou PJ']); // como estava ANTES do fix
  selectSemOpcao.value = 'Ambos';
  t('confirma o mecanismo do bug: sem a option, o valor vira vazio', selectSemOpcao.value === '');
}

console.log('\n=== com a option presente (como está agora), o valor sobrevive ===');
{
  const selectComOpcao = new SelectFake(['', 'CLT', 'PJ', 'CLT ou PJ', 'Ambos']);
  selectComOpcao.value = 'Ambos';
  t('regime "Ambos" é preservado no select', selectComOpcao.value === 'Ambos');
}

console.log('\n=== o mapa que traduz o retorno da IA (ambos → Ambos) continua intacto ===');
t('index.html:7754 mapeia regime "ambos" (minúsculo, contrato da IA) para o rótulo "Ambos"',
  /\{clt:'CLT',pj:'PJ',ambos:'Ambos'\}/.test(html));

fim('regime_ambos_nao_some');
