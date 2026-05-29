// Popup — Senova Extension v2.3

const APP_URL = 'https://marcos-mco.github.io/senova';

let _dadosVaga = null;
let _analise   = null;

// ── INIT ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-abrir-app').addEventListener('click', () => {
    chrome.tabs.create({ url: APP_URL });
  });

  mostrarEstado('loading');
  setLoadingTxt('Lendo a página...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) { mostrarEstado('generico'); return; }

  // Injeta content script (para sites fora do manifest — Gupy, Catho, etc.)
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) {}

  await new Promise(r => setTimeout(r, 200));

  let dados;
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRAIR_DADOS' });
    dados = resp?.dados;
  } catch (_) {
    mostrarEstado('generico'); return;
  }

  if (!dados) { mostrarEstado('generico'); return; }

  if (dados.tipo === 'vaga' && (dados.cargo || dados.empresa)) {
    _dadosVaga = dados;
    renderVaga(dados);
    await analisarComCache(dados);
  } else if (dados.tipo === 'sinal') {
    renderSinal(dados);
  } else {
    // LinkedIn obfusca classes — sugere selecionar o texto da vaga
    const isLinkedIn = tab.url && tab.url.includes('linkedin.com');
    mostrarEstadoGenerico(isLinkedIn);
  }
});

// ── RENDER VAGA ─────────────────────────────────────────────────────

function renderVaga(d) {
  mostrarEstado('vaga');
  el('vaga-cargo').textContent   = d.cargo || d.empresa || 'Vaga capturada';
  el('vaga-empresa').textContent = d.empresa || '';
  el('vaga-canal').textContent   = d.canal || '';
  el('vaga-local').textContent   = d.local || '';

  el('btn-salvar').addEventListener('click', salvarVaga);
  el('btn-analisar').addEventListener('click', abrirAnalisar);
  el('btn-ver-processos').addEventListener('click', abrirProcessos);
}

// ── SCORE COM CACHE ──────────────────────────────────────────────────
// Usa chrome.storage.session para não recalcular ao reabrir o popup na mesma URL

async function analisarComCache(d) {
  // Sem descrição — orienta sem expor linguagem técnica
  if (!d.descricao || d.descricao.length < 100) {
    const sw = el('score-wrap');
    sw.style.display = 'block';
    sw.style.background = '#F8F9FB';
    sw.style.borderColor = '#D0D9E4';
    sw.innerHTML = '<div style="font-size:12.5px;color:#5A6A7A;padding:4px 0;line-height:1.7;">🔍 Abra a página completa da vaga para que o Senova avalie se vale a pena para você.</div>';
    return;
  }

  const cacheKey = 'score_' + btoa(encodeURIComponent((d.url || d.cargo || '').slice(0, 80)));

  // Tenta mostrar do cache primeiro
  try {
    const cached = await chrome.storage.session.get(cacheKey);
    if (cached[cacheKey]) {
      _analise = cached[cacheKey];
      renderScore(cached[cacheKey]);
      return;
    }
  } catch (_) {}

  // Sem cache — analisa
  mostrarScoreLoading();
  const timeoutPromise = new Promise(r => setTimeout(() => r(null), 25000));
  let res = null;
  try {
    res = await Promise.race([
      chrome.runtime.sendMessage({
        type: 'ANALISAR_VAGA',
        payload: { titulo: d.cargo, empresa: d.empresa, descricao: d.descricao },
      }),
      timeoutPromise,
    ]);
  } catch (_) {}

  if (res?.score != null) {
    _analise = res;
    renderScore(res);
    // Guarda no cache de sessão
    try { await chrome.storage.session.set({ [cacheKey]: res }); } catch (_) {}
  } else {
    esconderScore();
  }
}

function mostrarScoreLoading() {
  const sw = el('score-wrap');
  sw.style.display = 'block';
  sw.style.background = '#F0F4F8';
  sw.style.borderColor = '#D0D9E4';
  sw.innerHTML = '<div style="text-align:center;padding:12px 0;font-size:12px;color:#5A6A7A;">Calculando score...</div>';
}

function esconderScore() {
  const sw = el('score-wrap');
  sw.style.display = 'block';
  sw.style.background = '#F8F9FB';
  sw.style.borderColor = '#D0D9E4';
  sw.innerHTML = '<div style="font-size:12.5px;color:#5A6A7A;padding:4px 0;line-height:1.7;">🔍 Abra a página completa da vaga para que o Senova avalie se vale a pena para você.</div>';
}

function renderScore(r) {
  const score = r.score || 0;

  const v = score >= 75
    ? { icon: '✨', titulo: 'Ótima oportunidade', sub: 'Vale uma análise completa — alto alinhamento com seu perfil.', cor: '#1A7A4A', bg: '#EAF7EF', bc: '#1A7A4A33' }
    : score >= 55
    ? { icon: '🔍', titulo: 'Pode valer a pena', sub: 'Alinhamento parcial — analise antes de se candidatar.', cor: '#B8670A', bg: '#FFF8EC', bc: '#C9A84C44' }
    : { icon: '⚡', titulo: 'Fora do seu perfil', sub: 'Provavelmente não vale o tempo — mas você decide.', cor: '#C0281E', bg: '#FEF0EF', bc: '#C0281E33' };

  const sw = el('score-wrap');
  sw.style.display = 'block';
  sw.style.background = v.bg;
  sw.style.borderColor = v.bc;

  let motivos = '';
  (r.pontos_fortes || []).slice(0, 2).forEach(p => {
    motivos += `<div style="font-size:12px;color:#1A7A4A;display:flex;gap:5px;margin-top:4px;">✓ <span>${p}</span></div>`;
  });
  (r.pontos_atencao || []).slice(0, 2).forEach(p => {
    motivos += `<div style="font-size:12px;color:#B8670A;display:flex;gap:5px;margin-top:4px;">△ <span>${p}</span></div>`;
  });

  sw.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
      <span style="font-size:20px;line-height:1;">${v.icon}</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:${v.cor};line-height:1.2;">${v.titulo}</div>
        <div style="font-size:11.5px;color:#5A6A7A;margin-top:2px;line-height:1.4;">${v.sub}</div>
      </div>
      <span style="font-size:16px;font-weight:800;color:${v.cor};white-space:nowrap;">${score}/100</span>
    </div>
    <div style="height:4px;background:#E5ECF2;border-radius:2px;overflow:hidden;margin-bottom:8px;">
      <div style="height:4px;width:${score}%;background:${v.cor};border-radius:2px;"></div>
    </div>
    ${motivos}
  `;
}

// ── RENDER SINAL ─────────────────────────────────────────────────────

function renderSinal(d) {
  mostrarEstado('sinal');
  el('sinal-titulo').textContent = d.titulo || 'Sinal detectado';
  el('sinal-resumo').textContent = d.resumo || '';
  el('btn-salvar-sinal').addEventListener('click', () => salvarSinalFn(d));
  el('btn-ignorar-sinal').addEventListener('click', () => window.close());
}

// ── AÇÕES ────────────────────────────────────────────────────────────

async function salvarVaga() {
  const btn = el('btn-salvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const res = await chrome.runtime.sendMessage({
    type: 'SALVAR_VAGA',
    payload: {
      empresa:           _dadosVaga.empresa,
      cargo:             _dadosVaga.cargo,
      canal:             _dadosVaga.canal,
      origemUrl:         _dadosVaga.url,
      descricao:         _dadosVaga.descricao,
      forma_candidatura: _dadosVaga.forma_candidatura,
      score:             _analise?.score,
      resumo:            _analise?.resumo,
      pontos_fortes:     _analise?.pontos_fortes,
      pontos_atencao:    _analise?.pontos_atencao,
    },
  });

  if (res?.erro) {
    btn.disabled = false;
    btn.textContent = 'Salvar';
    showToast('Erro ao salvar: ' + res.erro, true);
  } else {
    btn.textContent = '✓ Salvo!';
    btn.style.background = '#1A7A4A';
    const acoes = el('acoes-pos-save');
    if (acoes) acoes.style.display = 'block';
    showToast('✓ Salvo no Pipeline');
  }
}

async function abrirAnalisar() {
  if (!_dadosVaga) return;
  const btn = el('btn-analisar');
  btn.disabled = true;
  btn.textContent = 'Abrindo...';

  await chrome.runtime.sendMessage({
    type: 'ABRIR_ANALISE',
    payload: { ..._dadosVaga, analise: _analise },
  });
}

async function salvarSinalFn(d) {
  const btn = el('btn-salvar-sinal');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const res = await chrome.runtime.sendMessage({
    type: 'SALVAR_SINAL',
    payload: { titulo: d.titulo, empresa: d.empresa, url: d.url, resumo: d.resumo },
  });

  if (res?.erro) {
    btn.disabled = false;
    btn.textContent = 'Salvar Sinal';
    showToast('Erro: ' + res.erro, true);
  } else {
    btn.textContent = '✓ Sinal salvo!';
    btn.style.background = '#1A7A4A';
    showToast('✓ Sinal salvo!');
  }
}

function abrirApp() {
  chrome.tabs.create({ url: APP_URL });
}

async function abrirProcessos() {
  const url = APP_URL + '/?page=crm';
  try {
    const tabs = await chrome.tabs.query({});
    const senovaTab = tabs.find(t => t.url && t.url.startsWith(APP_URL));
    if (senovaTab) {
      await chrome.tabs.update(senovaTab.id, { active: true, url });
      await chrome.windows.update(senovaTab.windowId, { focused: true });
    } else {
      await chrome.tabs.create({ url });
    }
  } catch (_) {
    chrome.tabs.create({ url });
  }
}

// ── UTILS ────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function mostrarEstado(estado) {
  ['loading','vaga','sinal','generico'].forEach(e => {
    el('estado-' + e).style.display = e === estado ? 'block' : 'none';
  });
}

function mostrarEstadoGenerico(isLinkedIn) {
  mostrarEstado('generico');
  const ico = el('generico-ico');
  const txt = el('generico-txt');
  if (isLinkedIn) {
    if (ico) ico.textContent = '💼';
    if (txt) txt.innerHTML =
      '<strong style="color:#1A3A5C;">LinkedIn detectado</strong><br><br>' +
      'Selecione todo o texto da vaga (Ctrl+A dentro do painel ou arraste o mouse)<br>' +
      'e clique no ícone Senova novamente.';
  } else {
    if (ico) ico.textContent = '🔍';
    if (txt) txt.innerHTML =
      'Selecione o texto de uma vaga ou notícia<br>e clique no ícone Senova novamente.';
  }
}

function setLoadingTxt(txt) {
  const e = el('loading-txt');
  if (e) e.textContent = txt;
}

function showToast(msg, erro = false) {
  const t = el('toast');
  t.textContent = msg;
  t.className = erro ? 'erro' : '';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 4000);
}
