// Content script — Senova Extension v2.3
// Extrai dados de vagas e sinais de qualquer página

(function () {
  if (window.__senovaContentLoaded) return;
  window.__senovaContentLoaded = true;

  const host = location.hostname;
  const url  = location.href;

  // ── HELPERS ─────────────────────────────────────────────────────

  function txt(...sels) {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim()) return el.innerText.trim();
    }
    return '';
  }

  function txtArea(...sels) {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim()) return el.innerText.trim().slice(0, 5000);
    }
    return '';
  }

  function emailNaDesc(desc) {
    const m = desc.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    return m ? 'Email: ' + m[0] : null;
  }

  // ── LINKEDIN ─────────────────────────────────────────────────────
  // Funciona na página de detalhe (/jobs/view/) E no painel lateral da busca (/jobs/search/)

  function extractLinkedIn() {
    const cargo = txt(
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1[class*="job-title"]',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '[class*="topcard"] h1',
      '.job-details-jobs-unified-top-card__job-title a',
      '.jobs-details-top-card__job-title',
      'h1'
    );

    const empresa = txt(
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '[class*="company-name"] a',
      '[class*="company-name"]',
      '[class*="topcard__org-name-link"]',
      '.jobs-details-top-card__company-url'
    );

    const local = txt(
      '.job-details-jobs-unified-top-card__primary-description-without-modal span',
      '.jobs-unified-top-card__workplace-type',
      '[class*="topcard__flavor--bullet"]',
      '.job-details-jobs-unified-top-card__bullet'
    );

    const desc = txtArea(
      '.jobs-description__content',
      '#job-details',
      '[class*="description__content"]',
      '.jobs-description-content__text',
      '[class*="job-view-layout"] section',
      '.jobs-box__html-content'
    );

    let forma = '';
    const applyBtn = document.querySelector(
      'button[aria-label*="Candidatura simplificada"], button[aria-label*="Easy Apply"], ' +
      '.jobs-apply-button--top-card, [class*="apply-button"], button[class*="jobs-apply"]'
    );
    if (applyBtn) {
      const btnTxt = applyBtn.innerText?.trim() || '';
      if (/simpl|easy/i.test(btnTxt)) {
        forma = 'LinkedIn — Candidatura Simplificada';
      } else if (/site|company|empresa/i.test(btnTxt)) {
        forma = 'Site da empresa (link externo)';
      } else if (btnTxt) {
        forma = btnTxt;
      }
    }
    if (!forma) {
      const foraLI = document.body.innerText.match(/gerenciadas fora|managed outside/i);
      if (foraLI) forma = 'Site da empresa (link externo)';
    }
    if (!forma) forma = emailNaDesc(desc) || 'Ver na vaga';

    return { tipo: 'vaga', cargo, empresa, local, descricao: desc, forma_candidatura: forma, canal: 'LinkedIn', url };
  }

  // ── GUPY ─────────────────────────────────────────────────────────

  function extractGupy() {
    const cargo = txt(
      '[data-testid="job-title"]',
      'h1[class*="JobTitle"]',
      'h1[class*="job-title"]',
      'h1'
    );
    const empresa = txt(
      '[data-testid="job-company-name"]',
      '[class*="CompanyName"]',
      '[class*="company-name"]',
      '[class*="company"]'
    );
    const desc = txtArea(
      '[data-testid="job-description"]',
      '[class*="JobDescription"]',
      '[class*="job-description"]',
      'main'
    );
    const forma = emailNaDesc(desc) || 'Candidatura via Gupy';
    return { tipo: 'vaga', cargo, empresa, local: '', descricao: desc, forma_candidatura: forma, canal: 'Gupy', url };
  }

  // ── INHIRE / OUTROS GUPY-POWERED ─────────────────────────────────

  function extractInhire() {
    const cargo = txt('h1[class*="title"], h1[class*="job"], h1');
    const empresa = txt(
      '[class*="company"] h2',
      '[class*="empresa"]',
      '[class*="company-name"]',
      'header [class*="name"]'
    );
    const desc = txtArea(
      '[class*="description"]',
      '[class*="content"]',
      'main section',
      'article'
    );
    const forma = emailNaDesc(desc) || 'Candidatura via site da empresa';
    return { tipo: 'vaga', cargo, empresa, local: '', descricao: desc, forma_candidatura: forma, canal: 'Empresa', url };
  }

  // ── INDEED ───────────────────────────────────────────────────────

  function extractIndeed() {
    const cargo = txt(
      'h1[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1.jobsearch-JobInfoHeader-title',
      'h1'
    );
    const empresa = txt(
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.icl-u-lg-mr--sm'
    );
    const desc = txtArea('#jobDescriptionText', '[id*="jobDescription"]', 'main');
    const forma = emailNaDesc(desc) || 'Indeed — Candidatura no site';
    return { tipo: 'vaga', cargo, empresa, local: '', descricao: desc, forma_candidatura: forma, canal: 'Indeed', url };
  }

  // ── CATHO ────────────────────────────────────────────────────────

  function extractCatho() {
    const cargo = txt('h1[class*="title"], h1[class*="job"], h1');
    const empresa = txt('[class*="company"] h2', '[class*="company-name"]', '[class*="empresa"]');
    const desc = txtArea('[class*="job-description"]', '[class*="description"]', 'main');
    const forma = emailNaDesc(desc) || 'Catho — Candidatura no site';
    return { tipo: 'vaga', cargo, empresa, local: '', descricao: desc, forma_candidatura: forma, canal: 'Catho', url };
  }

  // ── VAGAS.COM ────────────────────────────────────────────────────

  function extractVagas() {
    const cargo = txt('h1.job-shortdescription__title', 'h1[class*="title"]', 'h1');
    const empresa = txt('[class*="company"] h2', '[class*="company-name"]');
    const desc = txtArea('[class*="job-description"]', '#vaga-description', 'main');
    const forma = emailNaDesc(desc) || 'Vagas.com — Candidatura no site';
    return { tipo: 'vaga', cargo, empresa, local: '', descricao: desc, forma_candidatura: forma, canal: 'Vagas.com', url };
  }

  // ── GENÉRICO ─────────────────────────────────────────────────────

  function extractGenerico() {
    const selecao   = window.getSelection()?.toString().trim().slice(0, 5000) || '';
    const metaTitle = document.querySelector('meta[property="og:title"]')?.content || document.title || '';
    const metaDesc  = document.querySelector('meta[property="og:description"]')?.content || '';
    const empresaOg = document.querySelector('meta[property="og:site_name"]')?.content || host;

    const isVagaUrl   = /(vaga|emprego|job|career|oportunidade|process)/i.test(url);
    const isVagaTitulo = /(vaga|emprego|job|cargo|oportunidade|diretor|gerente|head|CEO|CMO|CSO)/i.test(metaTitle);

    if (isVagaUrl || isVagaTitulo) {
      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
      const desc = selecao || metaDesc || '';
      return {
        tipo: 'vaga',
        cargo: h1 || metaTitle,
        empresa: empresaOg,
        local: '',
        descricao: desc,
        forma_candidatura: emailNaDesc(desc) || 'Ver na vaga',
        canal: 'Empresa',
        url,
      };
    }

    return {
      tipo: 'sinal',
      titulo: metaTitle,
      empresa: empresaOg,
      resumo: selecao || metaDesc,
      url,
    };
  }

  // ── ROTEADOR ────────────────────────────────────────────────────

  function extract() {
    if (host.includes('linkedin.com'))                        return extractLinkedIn();
    if (host.includes('gupy.io') || host.includes('gupy.com')) return extractGupy();
    if (host.includes('inhire.app'))                          return extractInhire();
    if (host.includes('indeed.com'))                          return extractIndeed();
    if (host.includes('catho.com.br'))                        return extractCatho();
    if (host.includes('vagas.com.br') || host.includes('vagas.com')) return extractVagas();
    return extractGenerico();
  }

  // ── LISTENER ────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== 'EXTRAIR_DADOS') return;

    // LinkedIn SPA: job panel carrega após interação — tenta até 8× com 300ms de intervalo
    if (host.includes('linkedin.com')) {
      let tries = 0;
      function tryLinkedIn() {
        const d = extractLinkedIn();
        if (d.cargo || d.empresa || tries >= 8) {
          sendResponse({ ok: true, dados: (d.cargo || d.empresa) ? d : extractGenerico() });
        } else {
          tries++;
          setTimeout(tryLinkedIn, 300);
        }
      }
      tryLinkedIn();
      return true; // mantém canal aberto para resposta assíncrona
    }

    try {
      sendResponse({ ok: true, dados: extract() });
    } catch (e) {
      sendResponse({ ok: false, erro: e.message });
    }
  });

})();
