// GUARD — CPF, PIS, data de nascimento, gênero, raça e orientação NÃO SAEM DESTE NAVEGADOR.
//
// Por que este teste existe, e por que ele é comportamental e não um grep.
// O cofre `senova_dados_sensiveis` foi desenhado na S21 com uma fronteira escrita em comentário:
// "vivem APENAS no localStorage; NUNCA são enviados ao Worker/KV nem à IA — por isso têm Salvar
// próprio, fora de salvarPerfil". Comentário não é trava. A fronteira é sustentada por uma
// coincidência frágil: `salvarPerfil` monta o payload lendo id por id, e ninguém escreveu lá as
// seis linhas de `perfil-cpf`. Uma linha a mais em qualquer sessão futura desfaz tudo em
// silêncio — não quebra nada, não dá erro, só passa a subir.
//
// Em 31/jul/2026 aprendemos, com `/api/vagas-lead`, o preço de confiar no rótulo em vez do
// payload: a rota estava catalogada como "radar de vagas, dado público" e servia 750 KB do
// parecer da IA sobre a pessoa. A lição foi olhar o QUE SAI, não o que está escrito que sai
// (ver testes/rotas_protegidas.js). Este teste faz isso com o cofre: enche a tela inteira de
// canários, roda as funções REAIS que falam com o Worker, e lê cada corpo enviado.
//
// Estes dados são de categoria especial (LGPD Art. 11 — raça, orientação). Com o MVP de 3
// usuários chegando, e o D1 vindo depois, a fronteira precisa ser executável antes de a
// migração acontecer: é fácil um `SELECT *` levar junto o que hoje nem existe no servidor.
const path = require('path');
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

// Canários: strings que não existem em lugar nenhum do app. Se uma delas aparecer num corpo
// enviado, ela só pode ter vindo da tela ou do cofre.
const CANARIO = {
  'perfil-cpf':        'CANARIO-CPF-99988877766',
  'perfil-pis':        'CANARIO-PIS-12345678901',
  'perfil-nascimento': 'CANARIO-NASC-15071967',
  'perfil-genero':     'CANARIO-GENERO',
  'perfil-raca':       'CANARIO-RACA',
  'perfil-orientacao': 'CANARIO-ORIENTACAO',
};
const SENSIVEIS = Object.values(CANARIO);
const NOME_NA_TELA = 'CANARIO-NOME-QUE-PODE-SUBIR';

// DOM falso que responde a QUALQUER id — é o ponto do teste. Se alguém acrescentar
// `cpf:document.getElementById('perfil-cpf').value` ao payload, o campo existe e o canário sai.
function telaCheia() {
  const cache = {};
  return {
    getElementById(id) {
      if (!cache[id]) cache[id] = {
        id,
        value: CANARIO[id] || (id === 'perfil-nome' ? NOME_NA_TELA : 'x'),
        checked: true, textContent: '', style: {}, disabled: false,
        setAttribute() {}, removeAttribute() {}, hasAttribute: () => false,
        appendChild() {}, addEventListener() {}, options: [], innerHTML: '',
      };
      return cache[id];
    },
    querySelector: () => ({ value: 'diaria' }),
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, click() {}, setAttribute() {} }),
  };
}

// ── 1. salvarPerfil: a função que POSTa o perfil ao Worker ─────────────────────
console.log('=== salvar o Perfil não pode levar o cofre junto ===');
{
  const enviados = [];
  const app = carregarApp(['async function salvarPerfil(', 'function _expParaPayload('], {
    document: telaCheia(),
    WORKER_URL: 'https://worker.teste',
    fetch: (url, init) => {
      enviados.push({ url, body: (init && init.body) || '' });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    },
    // Dependências que não são o objeto do teste — moldadas para o payload sair completo.
    _expDados: [],
    _PONTOS_TERMOS: { otima: 10, valer: 5 },
    _setPontosTermos() {}, _lerCriterioUI: () => ({ br: 60, espt: 60, de: 60, remoto: 60, us: 60 }),
    _cvMasterDados: { pt: 'CV em português', en: '', es: '' },
    _guardarPerfilIdioma() {}, _perfilRenderIdiomaPadrao() {},
    parseInt, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });

  return exec(app, 'salvarPerfil()').then(() => {
    t('salvarPerfil realmente falou com o Worker (o gravador funciona)',
      enviados.length > 0, enviados.length + ' chamadas');
    const corpos = enviados.map(e => String(e.body)).join('\n');
    // Prova de que o gravador enxerga a tela: um campo NÃO sensível da mesma tela aparece.
    t('o que é do Perfil sobe mesmo (controle negativo)', corpos.includes(NOME_NA_TELA));
    for (const [id, canario] of Object.entries(CANARIO)) {
      const onde = enviados.filter(e => String(e.body).includes(canario)).map(e => e.url);
      t(id.replace('perfil-', '') + ' não sai no corpo de nenhuma chamada',
        onde.length === 0, onde.join(', '));
    }
    resto();
  });
}

function resto() {

// ── 2. O cofre grava sozinho, e só no navegador ────────────────────────────────
console.log('\n=== o cofre tem Salvar próprio, e ele não faz fetch ===');
{
  let gravou = null, houveFetch = false;
  // A chave vem junto de propósito: `salvarDadosSensiveis` a usa e o `catch(_)` dele engole
  // qualquer erro — sem extrair a const, o teste passaria "verde" sobre uma função que nem rodou.
  const app = carregarApp(['const _SENSIVEL_KEY=', 'function salvarDadosSensiveis('], {
    document: telaCheia(),
    localStorage: { getItem: () => null, setItem: (k, v) => { gravou = { k, v }; }, removeItem() {} },
    fetch: () => { houveFetch = true; return Promise.resolve({ ok: true }); },
    XMLHttpRequest: function () { houveFetch = true; },
    navigator: { sendBeacon: () => { houveFetch = true; return true; } },
  });
  exec(app, 'salvarDadosSensiveis()');
  t('salvou no localStorage deste navegador', gravou && gravou.k === 'senova_dados_sensiveis',
    gravou ? gravou.k : 'não gravou');
  t('o CPF chegou ao cofre (o teste está exercitando o caminho certo)',
    !!gravou && gravou.v.includes(CANARIO['perfil-cpf']));
  t('salvar o cofre NÃO faz nenhuma chamada de rede', !houveFetch);
}

// ── 3. O Cartão de candidatura: a única ponte por onde o cofre sai — e é local ──
// O Cartão vai app→extensão por executeScript, sem rede, para o copiloto digitar nos campos do
// portal. É a exceção legítima, e ela é governada por consentimento: o checkbox "autorizar" no
// Perfil. Se o gate quebrar, o cofre passa a viajar para toda página que o copiloto abrir.
console.log('\n=== o Cartão só carrega o cofre com autorização explícita ===');
{
  const CV = 'Marcos Franco | Gerente\nmarcos@teste.com\n(41) 99999-8888\nlinkedin.com/in/marcos\nCuritiba, PR';
  const cofre = autorizado => JSON.stringify({
    cpf: CANARIO['perfil-cpf'], pis: CANARIO['perfil-pis'], nascimento: CANARIO['perfil-nascimento'],
    genero: CANARIO['perfil-genero'], raca: CANARIO['perfil-raca'], orientacao: CANARIO['perfil-orientacao'],
    racaNegro: true, autorizado,
  });
  const cartao = autorizado => {
    const app = carregarApp(['window.__senovaCartaoCandidatura=function('], {
      CV_BASE: { PT: CV },
      localStorage: { getItem: k => (k === 'senova_dados_sensiveis' ? cofre(autorizado) : null) },
      document: telaCheia(),
    });
    return chamar(app, '__senovaCartaoCandidatura');
  };

  const com = cartao(true);
  t('com autorização, o Cartão leva o CPF para o copiloto preencher',
    com.cpf === CANARIO['perfil-cpf']);
  t('com autorização, leva também a autodeclaração (LGPD Art. 11)',
    com.raca === CANARIO['perfil-raca'] && com.racaNegro === true);

  const sem = cartao(false);
  const vazou = SENSIVEIS.filter(v => JSON.stringify(sem).includes(v));
  t('SEM autorização, nenhum dado do cofre entra no Cartão', vazou.length === 0, vazou.join(', '));
  t('SEM autorização, a autodeclaração também não entra', !sem.racaNegro);
  // O Cartão sempre leva o que é profissional — senão "não autorizar" viraria "copiloto morto",
  // e a pessoa seria empurrada a autorizar por necessidade, não por escolha. Consentimento
  // arrancado por inutilidade não é consentimento.
  t('sem autorização o copiloto continua útil (nome e e-mail seguem indo)',
    !!sem.nome && !!sem.email);
}

// ── 4. Os prompts da IA: o que o app manda para a Anthropic ────────────────────
// O app é o cérebro: ele monta o prompt e a extensão só entrega ao Worker (JSON.stringify do
// retorno vira o corpo de POST /api/claude). Então o retorno destas funções É um corpo enviado.
console.log('\n=== nenhum prompt da IA carrega o cofre ===');
{
  const app = carregarApp([
    'window.__senovaCopilotoRespostaPrompt=function(',
    'window.__senovaCopilotoEscolherHabilidadesPrompt=function(',
  ], {
    CV_BASE: { PT: 'CV de teste' },
    localStorage: { getItem: k => (k === 'senova_dados_sensiveis' ? JSON.stringify({
      cpf: CANARIO['perfil-cpf'], nascimento: CANARIO['perfil-nascimento'],
      raca: CANARIO['perfil-raca'], autorizado: true,   // AUTORIZADO: nem assim vai para a IA
    }) : null) },
    document: telaCheia(),
    _perfilSalvo: { nome: 'Marcos', cv_master: 'CV de teste' },
  });
  const prompts = [
    chamar(app, '__senovaCopilotoRespostaPrompt', ['Por que você quer a vaga?', 'Gerente', 'ACME']),
    chamar(app, '__senovaCopilotoEscolherHabilidadesPrompt', [['Excel', 'SAP'], 'Gerente', 'ACME', 3]),
  ];
  const txt = JSON.stringify(prompts);
  const vazou = SENSIVEIS.filter(v => txt.includes(v));
  t('mesmo com o cofre AUTORIZADO, nada dele entra nos prompts', vazou.length === 0, vazou.join(', '));
}

// ── 5. A extensão nunca põe o cofre num corpo para o Worker ────────────────────
console.log('\n=== a extensão trata o cofre como carga local, nunca como payload ===');
{
  const fs = require('fs');
  const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
  const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
  const CHAVES = /\b(cpf|pis|nascimento|orientacao|racaNegro)\b/;
  // No background moram TODAS as chamadas ao Worker. O cofre não tem o que fazer lá dentro.
  const linhasBg = bg.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => !o.l.trim().startsWith('//') && CHAVES.test(o.l));
  t('background.js (onde vivem as chamadas ao Worker) não menciona o cofre',
    linhasBg.length === 0, linhasBg.map(o => o.n + ': ' + o.l.trim().slice(0, 70)).join(' | '));
  // No content.js o cofre pode aparecer — é lá que o copiloto digita nos campos. O que não pode
  // é ele virar corpo de requisição a partir de lá.
  const postCt = ct.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => !o.l.trim().startsWith('//') && /fetch\(|sendBeacon/.test(o.l) && CHAVES.test(o.l));
  t('content.js não manda o cofre em nenhuma requisição', postCt.length === 0,
    postCt.map(o => o.n).join(', '));
  t('o cofre é lido do localStorage do app, não replicado no chrome.storage da extensão',
    !/storage\.(local|sync)\.set\([^)]*senova_dados_sensiveis/.test(bg + ct));
}

// ── 6. A fronteira continua escrita onde se lê antes de mexer ──────────────────
// Um guard que ninguém entende vira um obstáculo a contornar. A regra tem de estar no código,
// ao lado do cofre, para quem for editar a ler antes — não só aqui.
console.log('\n=== a regra está escrita ao lado do cofre ===');
t('index.html declara a fronteira junto de _SENSIVEL_KEY',
  /vivem APENAS no localStorage[\s\S]{0,200}NUNCA são enviados ao Worker/.test(html));
t('o cofre tem chave própria e única', (html.match(/senova_dados_sensiveis/g) || []).length >= 2);

fim('COFRE DE DADOS SENSÍVEIS · NÃO SAI DESTE NAVEGADOR');
}
