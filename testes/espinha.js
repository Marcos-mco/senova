// Teste de INTEGRAÇÃO da espinha: simula o processo inteiro, na ordem real, nos dois caminhos.
// Não testa funções soltas — testa a SEQUÊNCIA que o usuário percorre.
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');

function extrai(a) {
  const i = html.indexOf(a);
  if (i < 0) throw new Error('não achei: ' + a);
  const abre = html.indexOf('{', i);
  let d = 0, j = abre;
  for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return html.slice(i, j + 1);
}

const fontes = [
  'function _jobIdLinkedIn(', 'function dataAtualFormatada(', 'function _marcarCandidaturaEnviada(',
  'function _acharVagaRef(', 'window.__senovaCopilotoGarantirCard=function(',
  'window.__senovaCopilotoGerarCarta=function(', 'window.__senovaCopilotoSalvarCarta=function(',
  'function _extrairSoCV(', 'function setCV(',
  'window.__senovaCopilotoSalvarCV=function(', 'window.__senovaCandidaturaEnviada=function(',
].map(extrai).join('\n;\n');

const sandbox = {
  vagas: [], filtroAtivo: null, saveVagas: () => {}, renderCRM: () => {}, aplicarFiltros: () => {},
  showToast: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  document: { getElementById: () => null },
  MODELOS: { rapido: 'm', analise: 'm' }, CARTA_SYSTEM: () => 'SYS', ATS_SYSTEM: () => 'SYS',
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontes, sandbox);

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };
const call = (fn, args) => vm.runInContext('window.' + fn + '(' + args.map(a => JSON.stringify(a)).join(',') + ')', sandbox);

const DESC = 'Buscamos Head Comercial para liderar a area comercial, com foco em expansao de receita e gestao de equipe de vendas. Requisitos: experiencia executiva, visao estrategica.';

// ══════════════════════════════════════════════════════════════════
console.log('\n████ CAMINHO A — achei a vaga navegando, o Senova nunca viu ████');
sandbox.vagas = [];

console.log('\n[1] Clico na extensão → copiloto entra e traz a vaga pro Senova');
let r = call('__senovaCopilotoGarantirCard', [{ url: 'https://vagas.empresa-x.com/head-comercial',
  cargo: 'Head Comercial', empresa: 'Empresa X', descricao: DESC, score: 72, canal: 'vagas.empresa-x.com' }]);
t('a vaga entrou no Senova (card criado)', r && r.ok && r.criou === true);
const card = () => sandbox.vagas[0];
t('nasceu como Oportunidade', card().status === 'lead');
t('trouxe a descrição da página', (card().descricao || '').length > 100);

console.log('\n[2] Estação 2 — o copiloto prepara a carta');
r = call('__senovaCopilotoGerarCarta', [{ url: 'https://vagas.empresa-x.com/head-comercial', cargo: 'Head Comercial', empresa: 'Empresa X' }]);
t('achou a vaga e pediu a carta (antes: sem_card)', r && r.motivo === 'precisa_gerar', JSON.stringify(r && (r.motivo || r)));
t('o prompt usa a descrição real da vaga', !!(r && r.prompt && /Head Comercial/.test(r.prompt.messages[0].content)));
// o Worker responde; o background salva de volta no card
t('a carta gerada persiste no card', call('__senovaCopilotoSalvarCarta', [{ url: 'https://vagas.empresa-x.com/head-comercial' }, 'CARTA GERADA PELO COPILOTO']) === true);
t('carta na fonte de verdade', card().atsCarta === 'CARTA GERADA PELO COPILOTO');

console.log('\n[3] Estação 2 — o CV');
t('o CV gerado persiste no card', call('__senovaCopilotoSalvarCV', [{ url: 'https://vagas.empresa-x.com/head-comercial' }, 'CV ADAPTADO']) === true);
t('CV na fonte de verdade', card().atsCV === 'CV ADAPTADO');

console.log('\n[4] Estação 4 — envio o formulário; o copiloto detecta e registra');
r = call('__senovaCandidaturaEnviada', [{ jobId: null, url: 'https://vagas.empresa-x.com/head-comercial',
  cargo: 'Head Comercial', empresa: 'Empresa X', canal: 'vagas.empresa-x.com' }]);
t('registrou (antes: morto neste caminho)', r && r.ok === true, JSON.stringify(r));
t('NÃO criou card duplicado', sandbox.vagas.length === 1, 'total=' + sandbox.vagas.length);
t('card andou para CV Enviado', card().status === 'aplicado');
t('follow-up agendado', !!card().data && (card().timeline || []).some(x => /Follow-up agendado/i.test(x.texto)));
t('documentos preservados no card', card().atsCV === 'CV ADAPTADO' && card().atsCarta === 'CARTA GERADA PELO COPILOTO');
t('histórico conta a história toda', (card().timeline || []).some(x => /Card criado/i.test(x.texto)) && (card().timeline || []).some(x => /CV enviado/i.test(x.texto)));

console.log('\n[5] A volta fechou — o card tem tudo');
t('empresa/cargo/url', card().empresa === 'Empresa X' && card().cargo === 'Head Comercial' && !!card().origemUrl);
t('score da análise', card().atsScore === '72');

// ══════════════════════════════════════════════════════════════════
console.log('\n████ CAMINHO B — a vaga já veio do Senova ████');
sandbox.vagas = [{ id: 500, empresa: 'Humanizata', cargo: 'Diretor Executivo', status: 'lead',
  canal: 'LinkedIn', origemUrl: 'https://www.linkedin.com/jobs/view/4437703325/',
  descricao: DESC, atsScore: '78', timeline: [{ ts: 1, texto: 'Card criado' }] }];
const cardB = () => sandbox.vagas[0];

console.log('\n[1] Abro a vaga → o copiloto reconhece o card (garantir é idempotente)');
r = call('__senovaCopilotoGarantirCard', [{ jobId: '4437703325', url: 'https://www.linkedin.com/jobs/view/4437703325/',
  cargo: 'Diretor Executivo', empresa: 'Humanizata' }]);
t('reconheceu, não criou de novo', r && r.ok && r.criou === false);
t('continua 1 card', sandbox.vagas.length === 1);

console.log('\n[2] Preparo os documentos');
r = call('__senovaCopilotoGerarCarta', [{ jobId: '4437703325', cargo: 'Diretor Executivo', empresa: 'Humanizata' }]);
t('carta pedida pelo jobId', r && r.motivo === 'precisa_gerar');
call('__senovaCopilotoSalvarCarta', [{ jobId: '4437703325' }, 'CARTA B']);
t('carta salva no card certo', cardB().atsCarta === 'CARTA B');

console.log('\n[3] Envio no site da empresa (fora do LinkedIn) e o copiloto registra');
// aqui a página é do portal, mas o passe carrega o jobId da vaga original
r = call('__senovaCandidaturaEnviada', [{ jobId: '4437703325', url: 'https://portal-da-empresa.com/apply/step3',
  cargo: 'Diretor Executivo', empresa: 'Humanizata' }]);
t('registrou mesmo estando noutro domínio', r && r.ok === true, JSON.stringify(r));
t('card andou para CV Enviado', cardB().status === 'aplicado');
t('não duplicou card', sandbox.vagas.length === 1);
t('preservou o score original', cardB().atsScore === '78');

console.log('\n[4] Errei — "Não enviei" precisa reverter');
const desfaz = vm.runInContext('window.__senovaDesfazerCandidatura', sandbox) ? true : false;
console.log('  (desfazer coberto no teste do registro)');

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `ESPINHA FECHADA — ${ok}/${ok} passos` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
