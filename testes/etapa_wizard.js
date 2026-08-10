// O PAINEL FALA DA ETAPA QUE ESTÁ NA TELA — E NÃO ESCREVE A EXPERIÊNCIA DE NINGUÉM.
//
// 08/ago/2026, trampos.co/candidato#/perfil, etapa "5. Experiência": Marcos abriu o formulário de
// histórico profissional (nome da instituição · cargo · início · conclusão · descrição) e o painel
// mostrava, ao mesmo tempo, um botão congelado em "Selecionando habilidades…" e o recado
// "Nesta etapa não há campo meu" — recado da etapa ANTERIOR. Três defeitos no mesmo quadro:
//
//   1. WIZARD DE PÁGINA ÚNICA. As 10 etapas do trampos vivem na MESMA URL (`#/perfil`). Todo
//      carimbo do painel era `location.href`, então o recado do passo 4 continuava "válido" no
//      passo 5. A proteção existia e era inerte. Agora a etapa se reconhece pelo que ela PEDE.
//   2. RÓTULO DE PROGRESSO FORA DO RENDER. "Selecionando habilidades…" é escrito direto no botão;
//      só um re-render o desfazia, e o anti-pisca (HTML idêntico) legitimamente não re-renderiza.
//   3. "DESCRIÇÃO" DENTRO DO BLOCO DE UM EMPREGO IA PARA A IA COMO PERGUNTA ABERTA. Este é o mais
//      grave: não é lentidão, é a IA sendo convidada a INVENTAR a experiência profissional de
//      Marcos num formulário que ele vai assinar. Histórico é fato — o copiloto não redige fato.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) {
  const i = src.indexOf(a);
  if (i < 0) throw new Error('nao achei no content.js: ' + a);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}
let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

// ─────────────────────────────────────────────────────────────────────────────
console.log('=== a etapa é o que a tela PEDE, não a URL (wizard de página única) ===');
// Sandbox 1: só a assinatura e a comparação. `_coletarCampos` é o que muda entre as etapas.
const sbE = { console, _campos: [], _coletarCampos: () => sbE._campos, location: { href: 'https://trampos.co/candidato#/perfil' }, Math };
vm.createContext(sbE);
vm.runInContext([extrai('function _assinaturaEtapa('), extrai('function _mesmaEtapa(')].join('\n;\n'), sbE);
const etapa = labels => { sbE._campos = labels.map(l => ({ label: l })); return vm.runInContext('_assinaturaEtapa()', sbE); };
const mesma = carimbo => { sbE._carimbo = carimbo; return vm.runInContext('_mesmaEtapa(_carimbo)', sbE); };

const habilidades = etapa(['Buscar habilidade']);           // passo 4 do trampos
const experiencia = etapa(['nome da instituição', 'cargo', 'início', 'conclusão', 'descrição']);
etapa(['nome da instituição', 'cargo', 'início', 'conclusão', 'descrição']); // tela atual = Experiência

t('mesma URL, outra etapa → o recado antigo NÃO vale',
  mesma({ url: 'https://trampos.co/candidato#/perfil', etapa: habilidades }) === false);
t('mesma etapa → o recado vale (é sobre esta tela)',
  mesma({ url: 'https://trampos.co/candidato#/perfil', etapa: experiencia }) === true);
t('um campo condicional aparece no meio → ainda é a mesma etapa',
  mesma({ url: 'https://trampos.co/candidato#/perfil', etapa: experiencia.filter(l => l !== 'conclusão') }) === true);
t('outra URL → não vale, nem com os mesmos rótulos',
  mesma({ url: 'https://outro.com/vaga', etapa: experiencia }) === false);
t('carimbo inexistente → não vale', mesma(null) === false);
t('carimbo antigo sem etapa (formato velho) → não vale na tela com campos',
  mesma({ url: 'https://trampos.co/candidato#/perfil' }) === false);
{
  etapa([]); // tela sem campo nenhum dos dois lados: só a URL manda
  t('etapa sem campos, mesma URL → vale (não há o que distinguir)',
    mesma({ url: 'https://trampos.co/candidato#/perfil', etapa: [] }) === true);
}
t('a assinatura não depende da ordem nem repete rótulo',
  JSON.stringify(etapa(['cargo', 'descrição', 'cargo'])) === JSON.stringify(['cargo', 'descrição']));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== dentro do bloco de um emprego, "descrição" é histórico — não pergunta para a IA ===');
// Sandbox 2: classificação real dos campos. Fabrica o bloco de experiência do trampos.
function campos(defs) {
  const els = defs.map(d => ({ tagName: d.tag || 'INPUT', type: d.type || '', value: '', _rot: d.rot }));
  const bloco = { querySelectorAll: () => els, parentElement: null };
  els.forEach(e => { e.parentElement = bloco; });
  const sb = {
    console,
    _rotuloCampo: el => el._rot || '',
    _visivel: () => true,
    _acharContainerCandidatura: () => null,
    _scanPaginaCampos: () => els,
    Array, Set, Math,
  };
  vm.createContext(sb);
  vm.runInContext([
    src.match(/const _CAMPO_SEL = .*;/)[0],
    extrai('function _rotuloHistorico('),
    extrai('function _classificarCampo('),
    extrai('function _coletarCampos('),
  ].join('\n;\n'), sb);
  const out = vm.runInContext('_coletarCampos()', sb);
  return Object.fromEntries(out.map(c => [c.el._rot, c.grupo]));
}

const BLOCO_TRAMPOS = [
  { rot: 'nome da instituição' },
  { rot: 'cargo' },
  { rot: 'início' },
  { rot: 'conclusão' },
  { rot: 'descrição', tag: 'TEXTAREA' },
];
const g = campos(BLOCO_TRAMPOS);
t('"nome da instituição" → histórico', g['nome da instituição'] === 'historico', g['nome da instituição']);
t('"cargo" → histórico', g['cargo'] === 'historico', g['cargo']);
t('"descrição" (textarea no bloco do emprego) NÃO vai para a IA', g['descrição'] === 'historico', g['descrição']);
t('"início" → histórico (não é "campo solto que só você informa")', g['início'] === 'historico', g['início']);
t('"conclusão" → histórico', g['conclusão'] === 'historico', g['conclusão']);

console.log('\n=== e o rebaixamento não pode virar desculpa para não preencher o que é nosso ===');
{
  // Dado pessoal dentro do mesmo bloco continua sendo dado pessoal: rebaixá-lo seria o copiloto
  // parar de preencher e-mail/telefone só porque há um "cargo" por perto.
  const p = campos([...BLOCO_TRAMPOS, { rot: 'E-mail de contato' }, { rot: 'Telefone' }]);
  t('e-mail no bloco continua pessoal (o copiloto preenche)', p['E-mail de contato'] === 'pessoal', p['E-mail de contato']);
  t('telefone no bloco continua pessoal', p['Telefone'] === 'pessoal', p['Telefone']);
}
{
  // UM sinal só não faz bloco de emprego: "Empresa atual" ao lado de perguntas do Easy Apply não
  // pode calar a IA nas perguntas de verdade.
  const q = campos([
    { rot: 'Empresa atual' },
    { rot: 'Por que você quer trabalhar aqui?', tag: 'TEXTAREA' },
    { rot: 'Qual sua pretensão de trabalho remoto?', tag: 'TEXTAREA' },
  ]);
  t('com UM sinal de histórico, a pergunta aberta segue sendo pergunta',
    q['Por que você quer trabalhar aqui?'] === 'pergunta', q['Por que você quer trabalhar aqui?']);
}
{
  // A cidade do emprego (comportamento antigo, de 2 sinais) não pode ter se perdido na generalização.
  const c = campos([{ rot: 'Job title' }, { rot: 'Company' }, { rot: 'City' }]);
  t('cidade dentro do bloco de emprego continua rebaixada (não é onde a pessoa mora)',
    c['City'] === 'historico', c['City']);
  // De quebra: "Location" nunca casou com a regra de cidade (o rótulo não tem "city" nem "cidade"),
  // então caía em 'outro' e escapava do rebaixamento — o bloco do emprego agora o alcança.
  const l = campos([{ rot: 'Job title' }, { rot: 'Company' }, { rot: 'Location' }]);
  t('"Location" no bloco do emprego também não é mais campo solto', l['Location'] === 'historico', l['Location']);
}
{
  const c = campos([{ rot: 'Cidade onde mora' }, { rot: 'E-mail' }]);
  t('cidade FORA de bloco de emprego continua sendo preenchível', c['Cidade onde mora'] === 'pessoal', c['Cidade onde mora']);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== estado escrito fora do render tem de ser desfeito à mão ===');
{
  const p = extrai('async function _preencher(');
  const iFim = p.indexOf('_preenchendo = false;');
  const progresso = (p.slice(0, iFim).match(/btn\.textContent = /g) || []).length;
  t('há rótulos de progresso escritos direto no botão', progresso >= 2, progresso + ' encontrados');
  t('o rótulo original é guardado antes da rodada', /const _rotuloBtn = btn \? btn\.textContent : ''/.test(p));
  t('e devolvido quando a rodada acaba (o anti-pisca pode não re-renderizar)',
    /btn\.disabled = false; btn\.style\.opacity = '1'; btn\.textContent = _rotuloBtn;/.test(p.slice(iFim)));
}

console.log('\n=== nenhum recado do painel volta a ser carimbado só pela URL ===');
{
  const p = extrai('async function _preencher(');
  const carimbos = p.match(/_avisoRodada = \{[^}]*\}/g) || [];
  t('todo aviso de rodada leva a etapa junto', carimbos.length >= 3 && carimbos.every(c => /etapa|_onde/.test(c)),
    carimbos.length + ' avisos: ' + carimbos.filter(c => !/etapa|_onde/.test(c)).join(' | '));
  t('o "✓ Preenchi" também', /_respondidoOnde = _onde;/.test(p));
  t('e o painel decide por etapa, não por URL',
    /const _sucessoAtivo = _respondido && _mesmaEtapa\(_respondidoOnde\)/.test(src)
    && /const _avisoAtivo = _mesmaEtapa\(_avisoRodada\)/.test(src));
  t('não sobrou comparação crua de URL para esses dois recados',
    !/_avisoRodada\.url === location\.href/.test(src) && !/_respondidoUrl/.test(src));
}

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `A ETAPA CERTA, E O HISTÓRICO INTOCADO: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail ? 1 : 0);
