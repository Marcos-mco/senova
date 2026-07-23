// O PAINEL PRECISA ENXERGAR O CARD EM QUALQUER PORTAL.
//
// 23/jul/2026, emprego.com: Marcos estava numa página de candidatura com o card já no Senova e o
// copiloto não sabia de nada — nem a Compatibilidade, nem que a candidatura JÁ tinha sido enviada.
// O aviso "✓ Você já se candidatou a esta vaga" (content.js) depende de `status === 'aplicado'`,
// e esse status nunca chegava.
//
// CAUSA RAIZ (medida, não lida): `__senovaAnaliseDoCard` tinha casamento PRÓPRIO e só por jobId do
// LinkedIn (`if(!jobId) return null`), e o `buscarAnaliseDoApp` do background repetia a mesma
// exigência. Fora do LinkedIn não existe jobId — então o copiloto ficava cego em TODO portal
// externo. Casamento de vaga duplicado divergindo já custou o TV Integração (S24): o ponto único
// é `_acharVagaRef` (jobId → URL real → empresa+cargo), e agora esta função também passa por ele.
//
// Este teste prova o casamento pelos três caminhos e prova que o estado que o painel usa
// (status, temCV) chega junto.
const { carregarApp, chamar, assert } = require('./_lib');
const { t, fim } = assert();

const s = carregarApp(['window.__senovaAnaliseDoCard=function(']);

const CARD_LINKEDIN = {
  id: 1, empresa: 'Humanizata', cargo: 'Diretor Executivo',
  origemUrl: 'https://www.linkedin.com/jobs/view/4437703325/',
  atsScore: '78', compatFortes: ['liderança'], compatAtencao: ['inglês'],
  status: 'lead', atsCV: 'CV ADAPTADO',
};
const CARD_PORTAL = {
  id: 2, empresa: 'O Emprego', cargo: 'Head Comercial',
  origemUrl: 'https://emprego.com/vagas/head-comercial-123',
  atsScore: '64', compatFortes: [], compatAtencao: [],
  status: 'aplicado', atsCV: '',
};
const reset = () => { s.vagas.length = 0; s.vagas.push(JSON.parse(JSON.stringify(CARD_LINKEDIN)), JSON.parse(JSON.stringify(CARD_PORTAL))); };
reset();

console.log('=== o formato antigo (string jobId) continua funcionando ===');
let r = chamar(s, '__senovaAnaliseDoCard', ['4437703325']);
t('casou pelo jobId em string', !!r && r.empresa === 'Humanizata', JSON.stringify(r));
t('devolve a Compatibilidade', r && r.score === 78, String(r && r.score));

console.log('\n=== FORA do LinkedIn: casa pela URL real da página ===');
r = chamar(s, '__senovaAnaliseDoCard', [{ url: 'https://emprego.com/vagas/head-comercial-123' }]);
t('achou o card sem nenhum jobId', !!r && r.empresa === 'O Emprego', JSON.stringify(r));
t('entrega o status — é o que acende "você já se candidatou"', r && r.status === 'aplicado', String(r && r.status));
t('entrega a Compatibilidade do card', r && r.score === 64, String(r && r.score));
t('entrega temCV (card sem CV → false)', r && r.temCV === false, String(r && r.temCV));

console.log('\n=== a URL casa mesmo com query/âncora/barra final (normalização do ponto único) ===');
r = chamar(s, '__senovaAnaliseDoCard', [{ url: 'https://emprego.com/vagas/head-comercial-123/?utm_source=email#topo' }]);
t('ignora ?query e #âncora', !!r && r.empresa === 'O Emprego', JSON.stringify(r));

console.log('\n=== último recurso: empresa + cargo (vaga achada por fora, URL diferente) ===');
r = chamar(s, '__senovaAnaliseDoCard', [{ url: 'https://emprego.com/applications/8e6c2aa4-b17e-419e-89cc-3aca560343d7', empresa: 'O Emprego', cargo: 'Head Comercial' }]);
t('a URL pós-envio não bate, mas empresa+cargo sim', !!r && r.status === 'aplicado', JSON.stringify(r));

console.log('\n=== temCV reflete o card, não um resíduo ===');
r = chamar(s, '__senovaAnaliseDoCard', ['4437703325']);
t('card com CV → temCV true', r && r.temCV === true);

console.log('\n=== card SEM nota ainda é entregue (o Caminho A cria card sem score) ===');
s.vagas.push({ id: 3, empresa: 'Empresa X', cargo: 'Gerente', origemUrl: 'https://x.com/v/9', status: 'lead' });
r = chamar(s, '__senovaAnaliseDoCard', [{ url: 'https://x.com/v/9' }]);
t('devolve o card mesmo sem análise', !!r, JSON.stringify(r));
t('score vem null (quem exige nota é o chamador)', r && r.score === null, String(r && r.score));
t('status vem junto', r && r.status === 'lead');

console.log('\n=== nada a entregar continua sendo null (nunca objeto vazio) ===');
t('referência vazia → null', chamar(s, '__senovaAnaliseDoCard', [{}]) === null);
t('sem argumento → null', chamar(s, '__senovaAnaliseDoCard', []) === null);
t('jobId inexistente → null', chamar(s, '__senovaAnaliseDoCard', ['0000000000']) === null);
t('URL de vaga que não está no Senova → null', chamar(s, '__senovaAnaliseDoCard', [{ url: 'https://outra.com/vaga/1' }]) === null);
t('empresa sem cargo não casa por si só', chamar(s, '__senovaAnaliseDoCard', [{ empresa: 'O Emprego' }]) === null);

console.log('\n=== não vaza objeto do card (o painel recebe cópia de leitura) ===');
r = chamar(s, '__senovaAnaliseDoCard', [{ url: 'https://emprego.com/vagas/head-comercial-123' }]);
t('não devolve atsCV (documento nunca trafega no PULL)', r && r.atsCV === undefined);
t('não devolve id interno', r && r.id === undefined);
t('compatFortes é sempre array', Array.isArray(r.compatFortes) && Array.isArray(r.compatAtencao));

// ── A ponte da extensão precisa mandar a REFERÊNCIA, não só o jobId ──────────────────────────
// Sem isto, o app resolveria por URL mas ninguém perguntaria por URL: o gargalo tinha DUAS
// trancas (app e background), e destrancar só uma não abre nada.
console.log('\n=== a extensão pergunta pela referência inteira ===');
const fs = require('fs'), path = require('path');
const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
t('background aceita ref (não exige jobId)', /buscarAnaliseDoApp\(msg\.ref \|\| msg\.jobId\)/.test(bg));
t('background não tem mais a trava "if (!jobId) return null"', !/async function buscarAnaliseDoApp\(jobId\)/.test(bg));
t('background repassa a ref inteira ao app', /func: \(r\) =>[\s\S]{0,120}__senovaAnaliseDoCard\(r\)/.test(bg));
t('content pede o card com ref também fora do LinkedIn', /function _puxarCardDoApp\(\)/.test(ct));
t('o pedido carrega a URL da página', /sendMessage\(\{ type: 'GET_ANALISE', ref \}\)/.test(ct));
t('o caminho do popup puxa o card', /injetarCopiloto\(an\); \} catch \(_\) \{\}\s*\n\s*_puxarCardDoApp\(\);/.test(ct));
t('o caminho do passe externo puxa o card', /injetarCopiloto\(\{[\s\S]{0,220}\}\);\s*\n\s*_puxarCardDoApp\(\);/.test(ct));
t('no LinkedIn continua exigindo nota para aparecer', /if \(!an \|\| !an\.score\) return;/.test(ct));
t('o diagnóstico mostra se o card casou', /'card no app: ' \+ d\.card/.test(ct));

fim('PAINEL VÊ O CARD');
