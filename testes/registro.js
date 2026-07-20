// Double-teste da Estação 4 (registro do envio) — extrai as funções REAIS do index.html
// e exercita os dois caminhos do processo, sem browser.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');

// Extrai o corpo de uma função pelo nome, balanceando chaves (pega o código REAL, não uma cópia).
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
  'function _marcarCandidaturaEnviada(',
  'function _acharVagaRef(', 'function _extrairSoCV(', 'function setCV(',
  'window.__senovaCandidaturaEnviada=function(',
  'window.__senovaDesfazerCandidatura=function(',
].map(extrai).join('\n;\n');

// Sandbox com o mínimo que as funções tocam
const sandbox = {
  vagas: [],
  filtroAtivo: null,
  saveVagas: () => { sandbox._salvou = (sandbox._salvou || 0) + 1; },
  renderCRM: () => {},
  aplicarFiltros: () => {},
  showToast: (t) => { sandbox._toast = t; },
  setTimeout: () => 0,
  clearTimeout: () => {},
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontes, sandbox);

// ── helpers de teste ──────────────────────────────────────────────
let ok = 0, fail = 0;
const t = (nome, cond, detalhe) => {
  if (cond) { ok++; console.log('  PASS  ' + nome); }
  else { fail++; console.log('  FAIL  ' + nome + (detalhe ? '  → ' + detalhe : '')); }
};
const reset = (vs) => { sandbox.vagas = vs; sandbox._toast = ''; };
const call = (ref) => vm.runInContext('window.__senovaCandidaturaEnviada(' + JSON.stringify(ref) + ')', sandbox);
const desfaz = (ref) => vm.runInContext('window.__senovaDesfazerCandidatura(' + JSON.stringify(ref) + ')', sandbox);

console.log('\n=== CAMINHO B — vaga que já veio do Senova (card existe) ===');
reset([{ id: 1, empresa: 'Humanizata', cargo: 'Diretor', status: 'lead', canal: 'LinkedIn',
         origemUrl: 'https://www.linkedin.com/jobs/view/4437703325/', timeline: [] }]);
let r = call({ jobId: '4437703325', url: 'https://portal-qualquer.com/apply/xyz', cargo: 'Diretor', empresa: 'Humanizata' });
t('registra pelo jobId do LinkedIn', r && r.ok === true, JSON.stringify(r));
t('card foi para CV Enviado (aplicado)', sandbox.vagas[0].status === 'aplicado', sandbox.vagas[0].status);
t('escreveu no histórico', (sandbox.vagas[0].timeline || []).some(x => /CV enviado/i.test(x.texto)));
t('agendou follow-up', (sandbox.vagas[0].timeline || []).some(x => /Follow-up agendado/i.test(x.texto)));
t('NÃO criou card duplicado', sandbox.vagas.length === 1, 'total=' + sandbox.vagas.length);

console.log('\n=== Idempotência (extensão reenvia / auto+manual juntos) ===');
const nTl = sandbox.vagas[0].timeline.length;
r = call({ jobId: '4437703325', cargo: 'Diretor', empresa: 'Humanizata' });
t('2ª chamada não duplica timeline', sandbox.vagas[0].timeline.length === nTl, 'antes=' + nTl + ' depois=' + sandbox.vagas[0].timeline.length);
t('2ª chamada devolve jaRegistrado', r && r.ok === true && r.jaRegistrado === true, JSON.stringify(r));

console.log('\n=== PORTAL FORA DO LINKEDIN — card existe com origemUrl do portal (era o bug nº2) ===');
reset([{ id: 2, empresa: 'Robert Half', cargo: 'Head Comercial', status: 'lead', canal: 'Robert Half',
         origemUrl: 'https://www.roberthalf.com.br/vaga/head-comercial-123', timeline: [] }]);
r = call({ jobId: null, url: 'https://www.roberthalf.com.br/vaga/head-comercial-123?utm=x', cargo: 'Head Comercial', empresa: 'Robert Half' });
t('casa pela URL real (sem jobId)', r && r.ok === true, JSON.stringify(r));
t('card foi para CV Enviado', sandbox.vagas[0].status === 'aplicado', sandbox.vagas[0].status);
t('não criou card novo', sandbox.vagas.length === 1, 'total=' + sandbox.vagas.length);

console.log('\n=== Casamento por empresa+cargo (URL diferente da do card) ===');
reset([{ id: 3, empresa: 'Dialog', cargo: 'Gerente de Marketing', status: 'lead', canal: 'Sólides',
         origemUrl: 'https://dialogci.vagas.solides.com.br/vaga/999', timeline: [] }]);
r = call({ jobId: null, url: 'https://outra-url-do-formulario.com/step2', cargo: 'Gerente de Marketing', empresa: 'Dialog' });
t('casa por empresa+cargo', r && r.ok === true, JSON.stringify(r));
t('card foi para CV Enviado', sandbox.vagas[0].status === 'aplicado', sandbox.vagas[0].status);

console.log('\n=== CAMINHO A — vaga achada POR FORA, sem card (era o bug nº1: registro morto) ===');
reset([]);
r = call({ jobId: null, url: 'https://empresa-x.com/vagas/diretor-comercial', cargo: 'Diretor Comercial',
           empresa: 'Empresa X', canal: 'empresa-x.com', score: 72 });
t('CRIOU o card', r && r.ok === true && r.criou === true, JSON.stringify(r));
t('existe 1 card agora', sandbox.vagas.length === 1, 'total=' + sandbox.vagas.length);
t('card nasceu em CV Enviado', sandbox.vagas[0] && sandbox.vagas[0].status === 'aplicado', sandbox.vagas[0] && sandbox.vagas[0].status);
t('guardou a origemUrl real', sandbox.vagas[0] && sandbox.vagas[0].origemUrl === 'https://empresa-x.com/vagas/diretor-comercial');
t('guardou empresa/cargo', sandbox.vagas[0] && sandbox.vagas[0].empresa === 'Empresa X' && sandbox.vagas[0].cargo === 'Diretor Comercial');
t('histórico registra a criação', (sandbox.vagas[0].timeline || []).some(x => /Card criado pelo copiloto/i.test(x.texto)));
t('histórico registra o envio', (sandbox.vagas[0].timeline || []).some(x => /CV enviado/i.test(x.texto)));
t('agendou follow-up', (sandbox.vagas[0].timeline || []).some(x => /Follow-up agendado/i.test(x.texto)));
t('guardou o score', sandbox.vagas[0].atsScore === '72', sandbox.vagas[0].atsScore);

console.log('\n=== Caminho A com documentos gerados na página ===');
reset([]);
r = call({ jobId: null, url: 'https://empresa-y.com/vaga/1', cargo: 'CMO', empresa: 'Empresa Y',
           cv: 'TEXTO DO CV GERADO', carta: 'TEXTO DA CARTA GERADA' });
t('salvou o CV no card criado', sandbox.vagas[0] && sandbox.vagas[0].atsCV === 'TEXTO DO CV GERADO');
t('salvou a carta no card criado', sandbox.vagas[0] && sandbox.vagas[0].atsCarta === 'TEXTO DA CARTA GERADA');

console.log('\n=== Nunca sobrescreve documento que já existe no card ===');
reset([{ id: 4, empresa: 'Z', cargo: 'Diretor', status: 'lead', origemUrl: 'https://z.com/v/1',
         atsCV: 'CV BOM JÁ REVISADO', atsCarta: 'CARTA BOA', timeline: [] }]);
call({ url: 'https://z.com/v/1', cargo: 'Diretor', empresa: 'Z', cv: 'CV NOVO QUALQUER', carta: 'CARTA NOVA' });
t('preservou o CV existente', sandbox.vagas[0].atsCV === 'CV BOM JÁ REVISADO', sandbox.vagas[0].atsCV);
t('preservou a carta existente', sandbox.vagas[0].atsCarta === 'CARTA BOA', sandbox.vagas[0].atsCarta);

console.log('\n=== Falha honesta: sem nenhuma referência utilizável ===');
reset([]);
r = call({ jobId: null, url: '', cargo: '', empresa: '' });
t('não cria card do nada', r && r.ok === false && r.motivo === 'sem_dados', JSON.stringify(r));
t('nenhum card foi criado', sandbox.vagas.length === 0);

console.log('\n=== NÃO ENVIEI (desfazer) — o irmão do registro ===');
reset([{ id: 5, empresa: 'Robert Half', cargo: 'Head Comercial', status: 'lead',
         origemUrl: 'https://www.roberthalf.com.br/vaga/head-123', timeline: [] }]);
call({ url: 'https://www.roberthalf.com.br/vaga/head-123', cargo: 'Head Comercial', empresa: 'Robert Half' });
t('registrou (pré-condição)', sandbox.vagas[0].status === 'aplicado');
const rd = desfaz({ url: 'https://www.roberthalf.com.br/vaga/head-123', cargo: 'Head Comercial', empresa: 'Robert Half' });
t('desfez fora do LinkedIn (era impossível antes)', rd === true, String(rd));
t('voltou para Oportunidade (lead)', sandbox.vagas[0].status === 'lead', sandbox.vagas[0].status);
t('limpou o follow-up', !(sandbox.vagas[0].timeline || []).some(x => /Follow-up agendado/i.test(x.texto)));

console.log('\n=== Trava: desfazer NÃO mexe em processo real (Entrevista) ===');
reset([{ id: 6, empresa: 'TV Integração', cargo: 'Diretor', status: 'entrevista',
         origemUrl: 'https://tv.com/v/1', timeline: [] }]);
t('não reverte quem está em Entrevista', desfaz({ url: 'https://tv.com/v/1' }) === false);
t('status intacto', sandbox.vagas[0].status === 'entrevista');

console.log('\n=== Idempotência protege processo avançado ===');
reset([{ id: 7, empresa: 'W', cargo: 'CEO', status: 'entrevista', origemUrl: 'https://w.com/v/1', timeline: [] }]);
r = call({ url: 'https://w.com/v/1' });
t('não rebaixa card em Entrevista', sandbox.vagas[0].status === 'entrevista', sandbox.vagas[0].status);
t('devolve jaRegistrado', r && r.jaRegistrado === true);

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `TODOS OS ${ok} TESTES PASSARAM` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
