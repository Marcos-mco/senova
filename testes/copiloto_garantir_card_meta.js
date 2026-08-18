// GUARD — __senovaCopilotoGarantirCard tinha 3 bugs, achados lendo o código lado a lado com
// __senovaAtualizarDesc (a função irmã, já correta, que atualiza descrição vinda da página):
//
// 1) Gravava a descrição da página em `v.descricao` — campo LEGADO. O resto do app (formulário de
//    edição, __senovaAtualizarDesc, geração de CV/carta) já usa `jobDescription` como campo
//    corrente, com `descricao` só como fallback de leitura. Um card criado/atualizado pelo
//    Copiloto guardava a descrição num campo que praticamente ninguém mais escreve.
// 2) Ao ATUALIZAR a descrição de um card existente, não zerava atsScore/atsCvScore/atsAnalise —
//    diferente de __senovaAtualizarDesc, que zera porque uma nota calculada contra a descrição
//    ANTIGA não vale mais depois que a descrição muda.
// 3) Não chamava _gravarMetaVaga — então local/salario/modalidade/jornada (que o item 5 passou a
//    extrair e o item 4 passou a propagar até aqui) eram descartados no último passo, silenciosamente.
//
// Achado e corrigido pelo próprio Bruno, seguindo o padrão já provado em __senovaAtualizarDesc
// (index.html). S47, item 6/7 — fila do senova-auditor.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extrai(assinatura) {
  const i = html.indexOf(assinatura);
  if (i < 0) throw new Error('não achei: ' + assinatura);
  const abre = html.indexOf('{', i);
  let d = 0, j = abre;
  for (; j < html.length; j++) {
    const c = html[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) break; }
  }
  return html.slice(i, j + 1);
}

const fontesTexto = [
  'function _jobIdLinkedIn(',
  'function dataAtualFormatada(',
  'function _acharVagaRef(',
  'function _gravarMetaVaga(',
  'window.__senovaCopilotoGarantirCard=function(',
].map(extrai).join('\n;\n');

const sandbox = {
  vagas: [], filtroAtivo: null,
  saveVagas: () => {}, renderCRM: () => {}, aplicarFiltros: () => {},
  document: { getElementById: () => null },
  setTimeout: () => 0, clearTimeout: () => {},
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontesTexto, sandbox);

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };
const reset = (vs) => { sandbox.vagas = vs; };
const run = (args) => vm.runInContext('window.__senovaCopilotoGarantirCard(' + JSON.stringify(args) + ')', sandbox);

const DESC_LONGA = 'Buscamos Diretor Comercial com forte atuação em expansão de receita. '.repeat(10);

console.log('=== card NOVO: descrição vai para jobDescription (campo corrente), não descricao ===');
reset([]);
let r = run({ url: 'https://x.com/vaga/1', cargo: 'Diretor Comercial', empresa: 'Acme',
  descricao: DESC_LONGA, score: 80, canal: 'x.com' });
t('criou o card', r && r.ok && r.criou === true, JSON.stringify(r));
t('jobDescription recebeu a descrição da página', sandbox.vagas[0].jobDescription === DESC_LONGA);
t('descricao (legado) NÃO foi usado', !sandbox.vagas[0].descricao);

console.log('\n=== card NOVO: local/salario/modalidade/jornada chegam via _gravarMetaVaga ===');
reset([]);
run({ url: 'https://x.com/vaga/2', cargo: 'Diretor', empresa: 'Beta', descricao: DESC_LONGA,
  local: 'São Paulo, SP', salario: 'R$ 20.000/mês', modalidade: 'Remoto', jornada: 'Tempo integral' });
t('localizacao gravada', sandbox.vagas[0].localizacao === 'São Paulo, SP');
t('modelo gravado (traduzido de modalidade)', sandbox.vagas[0].modelo === 'Remoto');
t('jornada gravada', sandbox.vagas[0].jornada === 'Tempo integral');
t('salario gravado', sandbox.vagas[0].salario === 'R$ 20.000/mês');

console.log('\n=== card EXISTENTE: descrição melhor atualiza jobDescription e ZERA a nota antiga ===');
reset([{ id: 9, empresa: 'Gama', cargo: 'CEO', status: 'lead', origemUrl: 'https://y.com/v/1',
  jobDescription: 'resumo curto', atsScore: '85', atsCvScore: '90', atsAnalise: 'análise antiga', score: 85, timeline: [] }]);
r = run({ url: 'https://y.com/v/1', cargo: 'CEO', empresa: 'Gama', descricao: DESC_LONGA });
t('achou o card (não criou outro)', r && r.ok && r.criou === false, JSON.stringify(r));
t('jobDescription foi atualizada', sandbox.vagas[0].jobDescription === DESC_LONGA);
t('atsScore zerado', sandbox.vagas[0].atsScore === '');
t('atsCvScore zerado', sandbox.vagas[0].atsCvScore === '');
t('atsAnalise zerada', sandbox.vagas[0].atsAnalise === '');
t('score (num) zerado', sandbox.vagas[0].score === null);

console.log('\n=== card EXISTENTE: descrição PIOR (mais curta) não sobrescreve nem zera a nota ===');
reset([{ id: 10, empresa: 'Delta', cargo: 'COO', status: 'lead', origemUrl: 'https://z.com/v/1',
  jobDescription: DESC_LONGA, atsScore: '77', score: 77, timeline: [] }]);
run({ url: 'https://z.com/v/1', cargo: 'COO', empresa: 'Delta', descricao: 'curta' });
t('jobDescription não mudou', sandbox.vagas[0].jobDescription === DESC_LONGA);
t('atsScore preservado', sandbox.vagas[0].atsScore === '77');
t('score (num) preservado', sandbox.vagas[0].score === 77);

console.log('\n=== card EXISTENTE: local/salario/modalidade/jornada da página sempre sobrescrevem ===');
reset([{ id: 11, empresa: 'Epsilon', cargo: 'CFO', status: 'lead', origemUrl: 'https://w.com/v/1',
  jobDescription: DESC_LONGA, localizacao: 'valor velho', metaInferida: { localizacao: true }, timeline: [] }]);
run({ url: 'https://w.com/v/1', cargo: 'CFO', empresa: 'Epsilon',
  local: 'Curitiba, PR', salario: '', modalidade: 'Híbrido', jornada: '' });
t('localizacao sobrescrita pelo valor real da página', sandbox.vagas[0].localizacao === 'Curitiba, PR');
t('modelo gravado', sandbox.vagas[0].modelo === 'Híbrido');
t('flag metaInferida.localizacao removida (não é mais chute)', !(sandbox.vagas[0].metaInferida || {}).localizacao);
t('campos vazios (salario/jornada) não sobrescrevem com string vazia', sandbox.vagas[0].salario === undefined && sandbox.vagas[0].jornada === undefined);

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `GARANTIR CARD · META + jobDescription + SCORE ZERADO: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
