// Service worker — Senova Extension v2.2

const WORKER  = 'https://senova-proxy.marcos-mco.workers.dev';
const APP_URL = 'https://marcos-mco.github.io/senova';

// ── MENSAGENS DO POPUP ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ANALISAR_VAGA') {
    analisarVaga(msg.payload)
      .then(sendResponse)
      .catch(e => sendResponse({ erro: e.message }));
    return true;
  }
  if (msg.type === 'SALVAR_VAGA') {
    salvarVaga(msg.payload)
      .then(sendResponse)
      .catch(e => sendResponse({ erro: e.message }));
    return true;
  }
  if (msg.type === 'SALVAR_SINAL') {
    salvarSinal(msg.payload)
      .then(sendResponse)
      .catch(e => sendResponse({ erro: e.message }));
    return true;
  }
  if (msg.type === 'ABRIR_ANALISE') {
    // Dispara sem aguardar — popup vai fechar ao abrir nova aba
    abrirAnalise(msg.payload).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }
});

// ── ANÁLISE COMPLETA — injeta dados na aba do Senova ─────────────────

async function abrirAnalise(dados) {
  // Salva dados para injetar depois que a aba carregar
  await chrome.storage.local.set({ senova_ext_pendente: dados });

  // Busca aba existente do Senova ou cria nova
  const allTabs = await chrome.tabs.query({});
  const senovaTab = allTabs.find(t => t.url && t.url.startsWith(APP_URL));

  if (senovaTab) {
    await chrome.tabs.update(senovaTab.id, { active: true, url: APP_URL + '/?ext=1' });
  } else {
    await chrome.tabs.create({ url: APP_URL + '/?ext=1' });
  }
}

// Observa quando UMA aba do Senova com ?ext=1 fica pronta
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab?.url?.includes('marcos-mco.github.io')) return;
  if (!tab?.url?.includes('ext=1')) return;

  const store = await chrome.storage.local.get('senova_ext_pendente');
  const dados = store.senova_ext_pendente;
  if (!dados) return;

  // Remove do storage antes de injetar (evita dupla-injeção em múltiplas tabs)
  await chrome.storage.local.remove('senova_ext_pendente');

  // Aguarda 400ms para o JS do app inicializar completamente
  await new Promise(r => setTimeout(r, 400));

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (d) => {
        window.__senovaExtData = d;
        // Chama direto se o app já registrou o handler
        if (typeof window.__senovaExtCarregar === 'function') {
          window.__senovaExtCarregar();
        } else {
          // App ainda inicializando — tenta mais uma vez após 600ms
          setTimeout(() => {
            if (typeof window.__senovaExtCarregar === 'function') {
              window.__senovaExtCarregar();
            }
          }, 600);
        }
      },
      args: [dados],
    });
  } catch (_) {
    // Restaura se a injeção falhou (tab fechou antes de carregar)
    await chrome.storage.local.set({ senova_ext_pendente: dados });
  }
});

// ── CHAMADAS AO WORKER ───────────────────────────────────────────────

async function analisarVaga({ titulo, empresa, descricao }) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(`${WORKER}/api/analisar-vaga`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, empresa, descricao }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function salvarVaga(payload) {
  const res = await fetch(`${WORKER}/api/vagas-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titulo:            payload.cargo,
      empresa:           payload.empresa,
      url:               payload.origemUrl,
      descricao:         (payload.descricao || '').slice(0, 500),
      canal:             payload.canal || 'Extensão',
      score:             payload.score,
      resumo:            payload.resumo,
      pontos_fortes:     payload.pontos_fortes || [],
      pontos_atencao:    payload.pontos_atencao || [],
      forma_candidatura: payload.forma_candidatura,
      fonte:             'extensao_chrome',
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => res.status + '');
    throw new Error(txt);
  }
  return res.json();
}

async function salvarSinal({ titulo, empresa, url, resumo }) {
  const res = await fetch(`${WORKER}/api/vagas-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, empresa, url, resumo, canal: 'Sinal', fonte: 'sinal' }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
