// Service worker — Senova Extension v2.3

const WORKER  = 'https://senova-proxy.marcos-mco.workers.dev';
const APP_URL = 'https://marcos-mco.github.io/senova';

// ── MENSAGENS DO POPUP ───────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
  if (msg.type === 'AUTO_UPDATE_DESC') {
    autoUpdateDesc(msg.payload, sender.tab).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }
});

// ── ANÁLISE COMPLETA — injeta dados na aba do Senova ─────────────────

async function abrirAnalise(dados) {
  // Salva dados e ID da aba alvo — não depende da URL (history.replaceState limpa ?ext=1 antes do onUpdated)
  await chrome.storage.local.set({ senova_ext_pendente: dados });

  const extUrl = APP_URL + '/?ext=1&t=' + Date.now();
  const allTabs = await chrome.tabs.query({});
  const senovaTab = allTabs.find(t => t.url && t.url.startsWith(APP_URL));

  let targetTabId;
  if (senovaTab) {
    targetTabId = senovaTab.id;
    // IMPORTANTE: gravar ANTES de navegar — onUpdated pode disparar antes do set terminar
    await chrome.storage.session.set({ senova_ext_tabid: targetTabId });
    await chrome.tabs.update(senovaTab.id, { active: true, url: extUrl });
  } else {
    const newTab = await chrome.tabs.create({ url: extUrl });
    targetTabId = newTab.id;
    await chrome.storage.session.set({ senova_ext_tabid: targetTabId });
  }
}

// Observa quando a aba alvo do Senova fica pronta
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab?.url?.includes('marcos-mco.github.io')) return;

  // Verifica se é a aba que criamos para Analisar
  const s = await chrome.storage.session.get('senova_ext_tabid');
  if (s.senova_ext_tabid !== tabId) return;

  const store = await chrome.storage.local.get('senova_ext_pendente');
  const dados = store.senova_ext_pendente;
  if (!dados) { await chrome.storage.session.remove('senova_ext_tabid'); return; }

  await chrome.storage.local.remove('senova_ext_pendente');
  await chrome.storage.session.remove('senova_ext_tabid');

  // Aguarda 400ms para o JS do app inicializar completamente
  await new Promise(r => setTimeout(r, 400));

  try {
    // world: 'MAIN' garante que o script corre no mesmo contexto JS da página
    // (sem MAIN, o isolated world não enxerga window.__senovaExtCarregar definida no index.html)
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (d) => {
        window.__senovaExtData = d;
        // Dispara evento para máxima compatibilidade com qualquer timing de inicialização
        window.dispatchEvent(new CustomEvent('senova:ext-data', { detail: d }));
        if (typeof window.__senovaExtCarregar === 'function') {
          window.__senovaExtCarregar();
        } else {
          setTimeout(() => {
            if (typeof window.__senovaExtCarregar === 'function') {
              window.__senovaExtCarregar();
            }
          }, 700);
        }
      },
      args: [dados],
    });
  } catch (_) {
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
      descricao:         (payload.descricao || '').slice(0, 5000),
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
  const result = await res.json();

  // Se o app Senova estiver aberto, importa a vaga imediatamente sem esperar próxima abertura
  try {
    const tabs = await chrome.tabs.query({});
    const senovaTab = tabs.find(t => t.url && t.url.startsWith(APP_URL));
    if (senovaTab) {
      await chrome.scripting.executeScript({
        target: { tabId: senovaTab.id },
        world: 'MAIN',
        func: () => { if (typeof window.__senovaImportar === 'function') window.__senovaImportar(); },
      });
    }
  } catch (_) {}

  return result;
}

async function autoUpdateDesc({ url, descricao, empresa, cargo, local, salario, modalidade, jornada }, senderTab) {
  if (!descricao || descricao.length < 100) return;

  const tabs = await chrome.tabs.query({});
  const senovaTab = tabs.find(t => t.url && t.url.startsWith(APP_URL));

  // "Ir para vaga" abre na mesma janela do Senova → não interrompe a navegação
  // LinkedIn em janela separada → traz Senova para frente
  const isDifferentWindow = !!(senderTab?.windowId && senovaTab?.windowId &&
                               senderTab.windowId !== senovaTab.windowId);
  let isFromPopup = false;
  if (isDifferentWindow) {
    const win = await chrome.windows.get(senderTab.windowId).catch(() => null);
    isFromPopup = win?.type === 'popup';
  }

  if (senovaTab) {
    await chrome.scripting.executeScript({
      target: { tabId: senovaTab.id },
      world: 'MAIN',
      func: (u, d, extra) => { if (typeof window.__senovaAtualizarDesc === 'function') window.__senovaAtualizarDesc(u, d, extra); },
      args: [url, descricao, { local, salario, modalidade, jornada }],
    }).catch(() => {});
    if (isDifferentWindow) {
      if (isFromPopup) await chrome.tabs.remove(senderTab.id).catch(() => {});
      await chrome.tabs.update(senovaTab.id, { active: true }).catch(() => {});
      await chrome.windows.update(senovaTab.windowId, { focused: true }).catch(() => {});
    }
  } else {
    await salvarVaga({ cargo: cargo || '', empresa: empresa || '', origemUrl: url, descricao, canal: 'LinkedIn', fonte: 'extensao_chrome' }).catch(() => {});
  }
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
