// Service worker — Senova Extension v2.16

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
  if (msg.type === 'HABILITAR_PORTAL') {
    fetch(WORKER + '/api/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dominio: msg.dominio }),
    })
      .then(r => r.json())
      .then(d => sendResponse({ ok: true, dominios: d.dominios }))
      .catch(e => sendResponse({ ok: false, erro: e.message }));
    return true;
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
  console.log('[SNV] descrição chegou da aba:', url, '|', (descricao || '').length, 'chars');
  if (!descricao || descricao.length < 100) { console.log('[SNV] descrição curta/vazia (<100) — aba de fundo não renderizou'); return; }

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
      args: [url, descricao, { local, salario, modalidade, jornada, cargo, empresa }],
    }).then(() => console.log('[SNV] card atualizado no app:', url)).catch(e => console.log('[SNV] erro ao atualizar card:', e.message));
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

// ── ENRIQUECIMENTO EM SEGUNDO PLANO ──────────────────────────────────
// Enquanto o Senova está aberto, abre as vagas do LinkedIn sem descrição em
// uma ABA DE FUNDO (mesma janela, sem foco). O content.js auto-extrai e envia
// AUTO_UPDATE_DESC; fechamos a aba. Throttle: uma por vez, com pausa (anti-bot).
chrome.alarms.create('senova-enrich', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'senova-enrich') { console.log('[SNV] alarme disparou'); enriquecerPendentes().catch(e => console.log('[SNV] erro no ciclo:', e.message)); } });

// Ao abrir/recarregar o Senova, checa pendências logo (sem esperar o alarme de 1 min).
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab?.url || !tab.url.startsWith(APP_URL)) return;
  console.log('[SNV] Senova carregou — checando pendências em 2.5s');
  setTimeout(() => enriquecerPendentes().catch(e => console.log('[SNV] erro no ciclo:', e.message)), 2500);
});

let _enriquecendo = false;
async function _tentadasGet() {
  const s = await chrome.storage.session.get('senova_enriq_tentadas');
  return new Set(s.senova_enriq_tentadas || []);
}
async function _tentadasAdd(set, url) {
  set.add(url);
  await chrome.storage.session.set({ senova_enriq_tentadas: [...set].slice(-300) });
}

// Lê APENAS a existência do cookie de sessão do LinkedIn (li_at) para saber se o
// usuário está logado. Nunca lê o valor do cookie, nunca o transmite — princípio
// ético do Senova. Serve só para não abrir abas inúteis quando não há sessão.
async function _linkedInLogado() {
  try {
    const c = await chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'li_at' });
    return !!c;
  } catch (e) { console.log('[SNV] cookies indisponível:', e.message); return true; } // sem permissão/erro: não bloqueia o fluxo antigo
}

// Mostra (necessario=true) ou esconde (false) no app o aviso "faça login no LinkedIn".
async function _notificarLogin(tabId, necessario, qtd) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId }, world: 'MAIN',
      func: (n, q) => { if (typeof window.__senovaLoginLinkedIn === 'function') window.__senovaLoginLinkedIn(n, q); },
      args: [necessario, qtd],
    });
  } catch {}
}

async function enriquecerPendentes() {
  if (_enriquecendo) { console.log('[SNV] já estava enriquecendo — pulei'); return; }
  const tabs = await chrome.tabs.query({});
  const senovaTab = tabs.find(t => t.url && t.url.startsWith(APP_URL));
  if (!senovaTab) { console.log('[SNV] Senova não está aberto'); return; }

  let pend = [];
  try {
    const out = await chrome.scripting.executeScript({
      target: { tabId: senovaTab.id }, world: 'MAIN',
      func: () => (typeof window.__senovaPendentesDesc === 'function') ? window.__senovaPendentesDesc() : [],
    });
    pend = out?.[0]?.result || [];
  } catch (e) { console.log('[SNV] erro lendo pendentes:', e.message); return; }

  const linkedinPend = pend.filter(u => /linkedin\.com\/.*jobs\/view\//i.test(u));
  console.log('[SNV] pendentes total:', pend.length, '| LinkedIn /jobs/view/:', linkedinPend.length, linkedinPend);

  // Nada do LinkedIn aguardando → garante o aviso oculto.
  if (!linkedinPend.length) { await _notificarLogin(senovaTab.id, false, 0); return; }

  // Não logado: não abre abas (LinkedIn bloqueia sem sessão) e avisa o usuário.
  // NÃO marca como "tentada" → ao logar, estas vagas são reprocessadas sozinhas.
  const logado = await _linkedInLogado();
  console.log('[SNV] logado no LinkedIn (cookie li_at):', logado);
  if (!logado) {
    await _notificarLogin(senovaTab.id, true, linkedinPend.length);
    return;
  }

  // Logado: some o aviso e processa em background.
  await _notificarLogin(senovaTab.id, false, 0);

  const tentadas = await _tentadasGet();
  const alvos = linkedinPend.filter(u => !tentadas.has(u)).slice(0, 3);
  console.log('[SNV] já tentadas:', tentadas.size, '| alvos deste ciclo:', alvos.length, alvos);
  if (!alvos.length) { console.log('[SNV] nada novo a tentar (todas já tentadas nesta sessão)'); return; }

  _enriquecendo = true;
  try {
    for (const url of alvos) {
      await _tentadasAdd(tentadas, url);
      console.log('[SNV] buscando descrição (API pública):', url);
      await _enriquecerUma(url, senovaTab.id);
      await new Promise(r => setTimeout(r, 4000)); // throttle entre vagas (anti rate-limit)
    }
  } finally { _enriquecendo = false; console.log('[SNV] ciclo de enriquecimento terminou'); }
}

// Converte um trecho de HTML em texto legível (sem DOMParser — indisponível no service worker).
function _htmlToText(h) {
  return (h || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6]|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// Busca a descrição pela API pública de vaga do LinkedIn (jobs-guest), que devolve
// o texto SEM abrir aba, sem foco e SEM enviar o cookie do usuário (credentials:'omit').
// Motivo: o LinkedIn congela a renderização de abas sem foco, então a antiga aba de
// fundo nunca entregava a descrição. Traz também cargo e empresa reais (limpa título feio).
async function _buscarDescricaoGuest(url) {
  const id = (url.match(/\/jobs\/view\/(\d+)/) || [])[1];
  if (!id) return null;
  const r = await fetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`, { credentials: 'omit' });
  if (!r.ok) { console.log('[SNV] guest HTTP', r.status, 'p/', id); return null; }
  const html = await r.text();
  const mDesc = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i)
             || html.match(/description__text[^>]*>([\s\S]*?)<\/div>/i);
  const descricao = mDesc ? _htmlToText(mDesc[1]) : '';
  const mCargo = html.match(/top-card-layout__title[^>]*>([\s\S]*?)<\/h[12]>/i)
              || html.match(/topcard__title[^>]*>([\s\S]*?)<\/h[12]>/i);
  const cargo = mCargo ? _htmlToText(mCargo[1]) : '';
  const mEmp = html.match(/topcard__org-name-link[^>]*>([\s\S]*?)<\/a>/i)
            || html.match(/topcard__flavor[^>]*>([\s\S]*?)<\/span>/i);
  const empresa = mEmp ? _htmlToText(mEmp[1]) : '';
  return { descricao, cargo, empresa };
}

async function _enriquecerUma(url, senovaTabId) {
  let dados = null;
  try { dados = await _buscarDescricaoGuest(url); }
  catch (e) { console.log('[SNV] erro no fetch guest:', e.message); return; }
  const desc = (dados && dados.descricao) || '';
  if (desc.length < 100) { console.log('[SNV] guest sem descrição útil p/', url, '(', desc.length, 'chars )'); return; }
  console.log('[SNV] guest OK p/', url, '|', desc.length, 'chars | cargo:', dados.cargo, '| empresa:', dados.empresa);
  await chrome.scripting.executeScript({
    target: { tabId: senovaTabId }, world: 'MAIN',
    func: (u, d, extra) => { if (typeof window.__senovaAtualizarDesc === 'function') window.__senovaAtualizarDesc(u, d, extra); },
    args: [url, desc, { cargo: dados.cargo, empresa: dados.empresa }],
  }).then(() => console.log('[SNV] card atualizado no app:', url)).catch(e => console.log('[SNV] erro ao atualizar card:', e.message));
}
