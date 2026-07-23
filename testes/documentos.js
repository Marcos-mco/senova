// Double-teste das pontes de documento + garantir-card (Caminho A e portais fora do LinkedIn).
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');

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

const fontes = [
  'function _jobIdLinkedIn(',
  'function dataAtualFormatada(',
  'function _acharVagaRef(',
  'window.__senovaCopilotoGarantirCard=function(',
  'window.__senovaCopilotoGerarCarta=function(',
  'window.__senovaCopilotoSalvarCarta=function(',
  'function _extrairSoCV(', 'function setCV(',
  'window.__senovaCopilotoSalvarCV=function(',
].map(extrai).join('\n;\n');

const sandbox = {
  _idiomaDoPedido: () => 'PT', _extrairPerfilTraduzido: () => null,

  vagas: [], filtroAtivo: null,
  saveVagas: () => {}, renderCRM: () => {}, aplicarFiltros: () => {},
  showToast: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  document: { getElementById: () => null },
  MODELOS: { rapido: 'claude-sonnet-4-6', analise: 'claude-sonnet-4-6' },
  CARTA_SYSTEM: () => 'SYSTEM DA CARTA',
  ATS_SYSTEM: () => 'SYSTEM DO ATS',
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontes, sandbox);

let ok = 0, fail = 0;
const t = (nome, cond, det) => { if (cond) { ok++; console.log('  PASS  ' + nome); } else { fail++; console.log('  FAIL  ' + nome + (det ? '  → ' + det : '')); } };
const reset = (vs) => { sandbox.vagas = vs; };
const run = (fn, args) => vm.runInContext('window.' + fn + '(' + args.map(a => JSON.stringify(a)).join(',') + ')', sandbox);

console.log('\n=== GARANTIR CARD — Caminho A (vaga achada por fora, sem card) ===');
reset([]);
let r = run('__senovaCopilotoGarantirCard', [{ url: 'https://empresa-x.com/vaga/head', cargo: 'Head Comercial',
  empresa: 'Empresa X', descricao: 'Descrição completa da vaga com mais de cem caracteres para valer a geração de CV e carta.', score: 78, canal: 'empresa-x.com' }]);
t('criou o card', r && r.ok && r.criou === true, JSON.stringify(r));
t('nasce como Oportunidade (lead)', sandbox.vagas[0].status === 'lead', sandbox.vagas[0].status);
t('guardou a descrição (habilita CV/carta)', (sandbox.vagas[0].descricao || '').length > 50);
t('guardou origemUrl/empresa/cargo', sandbox.vagas[0].origemUrl === 'https://empresa-x.com/vaga/head' && sandbox.vagas[0].empresa === 'Empresa X');
t('guardou o score', sandbox.vagas[0].atsScore === '78', sandbox.vagas[0].atsScore);
t('histórico registra a criação', (sandbox.vagas[0].timeline || []).some(x => /Card criado pelo copiloto/i.test(x.texto)));

console.log('\n=== GARANTIR CARD — idempotente (clicar de novo não duplica) ===');
r = run('__senovaCopilotoGarantirCard', [{ url: 'https://empresa-x.com/vaga/head', cargo: 'Head Comercial', empresa: 'Empresa X' }]);
t('achou o card existente', r && r.ok && r.criou === false, JSON.stringify(r));
t('continua 1 card só', sandbox.vagas.length === 1, 'total=' + sandbox.vagas.length);

console.log('\n=== GARANTIR CARD — completa descrição que faltava no lead ===');
reset([{ id: 9, empresa: 'Y', cargo: 'Diretor', status: 'lead', origemUrl: 'https://y.com/v/1', descricao: '', timeline: [] }]);
run('__senovaCopilotoGarantirCard', [{ url: 'https://y.com/v/1', cargo: 'Diretor', empresa: 'Y', descricao: 'Descrição completa vinda da página da vaga, longa o suficiente.' }]);
t('preencheu a descrição que faltava', (sandbox.vagas[0].descricao || '').length > 30);
t('não criou card novo', sandbox.vagas.length === 1);

console.log('\n=== GARANTIR CARD — não sobrescreve descrição melhor já existente ===');
const longa = 'D'.repeat(500);
reset([{ id: 10, empresa: 'Z', cargo: 'CEO', status: 'lead', origemUrl: 'https://z.com/v/1', descricao: longa, timeline: [] }]);
run('__senovaCopilotoGarantirCard', [{ url: 'https://z.com/v/1', cargo: 'CEO', empresa: 'Z', descricao: 'curta' }]);
t('manteve a descrição longa', sandbox.vagas[0].descricao === longa);

console.log('\n=== GARANTIR CARD — falha honesta sem dados ===');
reset([]);
r = run('__senovaCopilotoGarantirCard', [{ url: '', cargo: '', empresa: '' }]);
t('não cria card do nada', r && r.ok === false && r.motivo === 'sem_dados', JSON.stringify(r));

console.log('\n=== CARTA — portal FORA do LinkedIn (antes: sem_card) ===');
reset([{ id: 11, empresa: 'Robert Half', cargo: 'Head Comercial', status: 'lead',
  origemUrl: 'https://www.roberthalf.com.br/vaga/head-123',
  descricao: 'Descrição da vaga de Head Comercial com tamanho suficiente para gerar a carta de apresentação.', timeline: [] }]);
r = run('__senovaCopilotoGerarCarta', [{ jobId: null, url: 'https://www.roberthalf.com.br/vaga/head-123', cargo: 'Head Comercial', empresa: 'Robert Half' }]);
t('achou o card sem jobId do LinkedIn', r && r.motivo === 'precisa_gerar', JSON.stringify(r && r.motivo));
t('montou o prompt da carta', !!(r && r.prompt && r.prompt.system === 'SYSTEM DA CARTA'));
t('prompt leva cargo e empresa reais', !!(r && r.prompt && /Head Comercial/.test(r.prompt.messages[0].content) && /Robert Half/.test(r.prompt.messages[0].content)));

console.log('\n=== CARTA — devolve a que já existe, sem reprocessar ===');
reset([{ id: 12, empresa: 'W', cargo: 'CMO', status: 'lead', origemUrl: 'https://w.com/v/1',
  descricao: 'x'.repeat(200), atsCarta: 'CARTA JÁ ESCRITA', timeline: [] }]);
r = run('__senovaCopilotoGerarCarta', [{ url: 'https://w.com/v/1' }]);
t('devolve a carta pronta', r && r.ok === true && r.carta === 'CARTA JÁ ESCRITA', JSON.stringify(r));

console.log('\n=== CARTA — casamento por empresa+cargo ===');
reset([{ id: 13, empresa: 'Dialog', cargo: 'Gerente de Marketing', status: 'lead',
  origemUrl: 'https://solides.com/v/1', descricao: 'y'.repeat(200), timeline: [] }]);
r = run('__senovaCopilotoGerarCarta', [{ url: 'https://url-diferente.com/form', cargo: 'Gerente de Marketing', empresa: 'Dialog' }]);
t('achou por empresa+cargo', r && r.motivo === 'precisa_gerar', JSON.stringify(r && r.motivo));

console.log('\n=== CARTA — sem card mesmo: falha honesta ===');
reset([]);
r = run('__senovaCopilotoGerarCarta', [{ url: 'https://nada.com/v/1', cargo: 'X', empresa: 'Y' }]);
t('devolve sem_card', r && r.ok === false && r.motivo === 'sem_card', JSON.stringify(r));

console.log('\n=== SALVAR CARTA / CV — persistem por referência robusta ===');
reset([{ id: 14, empresa: 'Q', cargo: 'Diretor', status: 'lead', origemUrl: 'https://q.com/v/1', timeline: [] }]);
t('salvou a carta (sem jobId)', run('__senovaCopilotoSalvarCarta', [{ url: 'https://q.com/v/1' }, 'CARTA NOVA']) === true);
t('carta no card', sandbox.vagas[0].atsCarta === 'CARTA NOVA');
t('salvou o CV (por empresa+cargo)', run('__senovaCopilotoSalvarCV', [{ cargo: 'Diretor', empresa: 'Q' }, 'CV NOVO']) === true);
t('CV no card', sandbox.vagas[0].atsCV === 'CV NOVO');

console.log('\n=== Retrocompatibilidade: ponte ainda aceita string (URL) ===');
reset([{ id: 15, empresa: 'R', cargo: 'Head', status: 'lead', origemUrl: 'https://www.linkedin.com/jobs/view/123456/', descricao: 'z'.repeat(200), timeline: [] }]);
r = run('__senovaCopilotoGerarCarta', ['https://www.linkedin.com/jobs/view/123456/']);
t('aceita string como antes', r && r.motivo === 'precisa_gerar', JSON.stringify(r && r.motivo));

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `TODOS OS ${ok} TESTES PASSARAM` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
