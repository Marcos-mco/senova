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

  if (d.forma_candidatura) {
    el('candidatura-tipo').textContent = d.forma_candidatura;
    el('candidatura-wrap').style.display = 'flex';
  }

  el('btn-salvar').addEventListener('click', salvarVaga);
  el('btn-analisar').addEventListener('click', abrirAnalisar);
}

// ── SCORE COM CACHE ──────────────────────────────────────────────────
// Usa chrome.storage.session para não recalcular ao reabrir o popup na mesma URL

async function analisarComCache(d) {
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
  el('score-wrap').style.display = 'none';
}

function renderScore(r) {
  const score = r.score ?? 0;
  const sw = el('score-wrap');
  sw.style.display = 'block';

  // Pré-análise: score zerado = AI não recebeu descrição suficiente
  const semDados = score === 0 || /nenhuma vaga|dados insuficientes|não foi fornecida/i.test(r.resumo || '');
  if (semDados) {
    sw.style.background = '#FFFAF2';
    sw.style.borderColor = '#C9A84C55';
    sw.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#B8670A;background:#FDECC8;border-radius:4px;padding:3px 8px;">Pré-análise</span>
        <span style="font-size:20px;font-weight:800;color:#B8670A;">—&thinsp;/100</span>
      </div>
      <div style="font-size:12.5px;color:#5A4A2A;line-height:1.55;margin-bottom:10px;">
        A descrição da vaga não foi lida automaticamente. Score baseado só em cargo e empresa.
      </div>
      <div style="font-size:12px;color:#7A5C14;background:#FEF5E1;border:1px dashed #C9A84C;border-radius:6px;padding:8px 10px;line-height:1.5;">
        Para o score real, clique em <strong>Analisar ↗</strong> e cole a descrição completa da vaga.
      </div>`;
    // Destaca botão Analisar como CTA principal
    const btnA = el('btn-analisar');
    if (btnA) { btnA.style.background='#1A3A5C'; btnA.style.color='#fff'; btnA.style.border='none'; }
    return;
  }

  // Score completo
  const cor = score >= 75 ? '#1A7A4A' : score >= 55 ? '#B8670A' : '#C0281E';
  const bg  = score >= 75 ? '#EAF7EF' : score >= 55 ? '#FFF8EC' : '#FEF0EF';
  sw.style.background  = bg;
  sw.style.borderColor = cor + '44';
  sw.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      <span style="font-size:11px;font-weight:700;color:#5A6A7A;text-transform:uppercase;letter-spacing:.05em;">Match com seu perfil</span>
      <span style="font-size:22px;font-weight:800;color:${cor};">${score}/100</span>
    </div>
    <div style="height:6px;background:#E5ECF2;border-radius:3px;overflow:hidden;margin-bottom:8px;">
      <div style="height:6px;width:${score}%;background:${cor};border-radius:3px;transition:width .5s;"></div>
    </div>
    <div style="font-size:12px;color:#3A4A5A;line-height:1.4;margin-bottom:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${r.resumo || ''}</div>
    <div id="pontos-lista" style="display:flex;flex-direction:column;gap:4px;"></div>
  `;
  const lista = el('pontos-lista');
  (r.pontos_fortes || []).slice(0, 2).forEach(p => {
    lista.innerHTML += `<div style="font-size:12px;color:#1A7A4A;display:flex;gap:5px;">✓ <span>${p}</span></div>`;
  });
  (r.pontos_atencao || []).slice(0, 1).forEach(p => {
    lista.innerHTML += `<div style="font-size:12px;color:#B8670A;display:flex;gap:5px;">△ <span>${p}</span></div>`;
  });
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
    // Mostra botão de ação após salvar
    const acoes = el('acoes-pos-save');
    if (acoes) acoes.style.display = 'block';
    showToast('✓ Salvo! Abra o app → Importar Vagas para ver.');
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
