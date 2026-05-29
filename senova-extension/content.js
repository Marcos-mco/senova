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

  // Parseia título do documento LinkedIn para extrair cargo e empresa
  // Formatos comuns: "Head de Marketing | LinkedIn", "Head de Marketing no Grupo Muffato | LinkedIn"
  // "(1) Head de Marketing | Grupo Muffato | LinkedIn"
  function _parseTitleLinkedIn() {
    const raw = document.title.replace(/^\(\d+\)\s*/, '').trim();
    if (!raw || raw === 'LinkedIn') return { cargo: '', empresa: '' };
    const partes = raw.split(' | ').map(s => s.trim()).filter(s => s && s !== 'LinkedIn');
    // "Cargo | Empresa" ou "Cargo no/em Empresa"
    let cargo = partes[0] || '';
    let empresa = partes[1] || '';
    // Remove "no Empresa" do final do cargo se empresa não veio das partes
    const mNo = cargo.match(/^(.+?)\s+(?:no|na|em|at)\s+(.+)$/i);
    if (mNo && !empresa) { cargo = mNo[1].trim(); empresa = mNo[2].trim(); }
    return { cargo, empresa };
  }

  // Headings de seção do LinkedIn que NÃO são título de vaga
  const _LI_SECTION_HEADINGS = /vagas que mais combinam|jobs you may be interested|recommended for you|sugerido para você|pesquisa de emprego|job search results|people also viewed|notificaç|notification|^\d+\s/i;

  function extractLinkedIn() {
    // 1. Seletores DOM específicos (LinkedIn obfusca classes — lista atualizada 2025)
    let cargo = txt(
      'h1.job-details-jobs-unified-top-card__job-title',
      'h1[class*="job-title"]',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '[class*="topcard"] h1',
      '.job-details-jobs-unified-top-card__job-title a',
      '.jobs-details-top-card__job-title'
    );

    // 1b. Split-view: currentJobId → busca o card no painel esquerdo
    //     Usa strong interno ou split por separadores LinkedIn (·, •) com filtro de metadados
    if (!cargo) {
      try {
        const jobId = new URL(url).searchParams.get('currentJobId');
        if (jobId) {
          // Prefere href com /jobs/view/ID (mais preciso que qualquer href com o número)
          const cardLink = document.querySelector(
            `a[href*="/jobs/view/${jobId}"], a[href*="currentJobId=${jobId}"]`
          );
          if (cardLink) {
            // 1ª opção: elemento <strong> — LinkedIn coloca o título da vaga nele
            const strongTxt = cardLink.querySelector('strong')?.innerText?.trim() || '';
            if (strongTxt && strongTxt.length > 5 && strongTxt.length < 150 &&
                !_LI_SECTION_HEADINGS.test(strongTxt) && !/^\d/.test(strongTxt)) {
              cargo = strongTxt;
            } else {
              // 2ª opção: divide por separadores LinkedIn e filtra metadados
              const seg = (cardLink.innerText || '')
                .replace(/\(vaga verificada\)/gi, '')
                .split(/[\n·•|]/)
                .map(s => s.trim())
                .find(s => s.length > 5 && s.length < 150 &&
                  !_LI_SECTION_HEADINGS.test(s) && !/^\d/.test(s) &&
                  !/(presencial|remoto|híbrido|há \d|mes(es)?|visto|verificad|anunciada|promovida|contrato|brasil|visualizad)/i.test(s));
              if (seg) cargo = seg;
            }
          }
        }
      } catch (_) {}
    }

    // 1c. Âncora "Sobre a vaga" — encontra o heading que vem ANTES dela no DOM
    //     Não depende de seletores de classe (imune a mudanças do LinkedIn)
    if (!cargo) {
      const _SKIP = /(pessoas que você|people you may|sobre o|about the company|candidatura|avalie|candidate|conexão|connection|promovida|promoted)/i;
      const allH = Array.from(document.querySelectorAll('h1,h2,h3'));
      const sobreIdx = allH.findIndex(h => /^(sobre a vaga|about the job|job description)$/i.test(h.innerText?.trim()));
      if (sobreIdx > 0) {
        const found = allH.slice(0, sobreIdx).reverse().find(h => {
          const t = h.innerText?.trim() || '';
          return t.length > 5 && t.length < 160 &&
            !_LI_SECTION_HEADINGS.test(t) && !/^\d/.test(t) && !_SKIP.test(t);
        });
        if (found) cargo = found.innerText.trim();
      }
    }

    // 1c. Fallback h1 filtrado: ignora headings de seção e notificações (^\d)
    if (!cargo) {
      cargo = Array.from(document.querySelectorAll('h1'))
        .map(el => el.innerText?.trim())
        .find(t => t && t.length > 3 && t.length < 150 &&
             !_LI_SECTION_HEADINGS.test(t) && !/^\d/.test(t)) || '';
    }

    let empresa = txt(
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '[class*="company-name"] a',
      '[class*="company-name"]',
      '[class*="topcard__org-name-link"]',
      '.jobs-details-top-card__company-url'
    );

    // 2. Fallback: meta OG (LinkedIn preenche corretamente para crawlers — não é obfuscado)
    //    Nas páginas de coleções o og:title é o da página, não da vaga — filtrar
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
    const ogDesc  = document.querySelector('meta[property="og:description"]')?.content || '';

    if (!cargo && ogTitle && !_LI_SECTION_HEADINGS.test(ogTitle)) {
      const partes = ogTitle.split(/\s*[\|–\-]\s*/);
      cargo = partes[0]?.trim() || '';
      if (!empresa && partes.length >= 2) empresa = partes[1]?.trim() || '';
    }

    // 3. Fallback: título do documento — filtrar headings de seção
    if (!cargo) {
      const t = _parseTitleLinkedIn();
      if (t.cargo && !_LI_SECTION_HEADINGS.test(t.cargo)) cargo = t.cargo;
      if (!empresa && t.empresa && !_LI_SECTION_HEADINGS.test(t.empresa)) empresa = t.empresa;
    }

    const local = txt(
      '.job-details-jobs-unified-top-card__primary-description-without-modal span',
      '.jobs-unified-top-card__workplace-type',
      '[class*="topcard__flavor--bullet"]',
      '.job-details-jobs-unified-top-card__bullet'
    );

    // 4. Descrição: DOM (seletores progressivamente mais amplos) → og:description → seleção
    let desc = txtArea(
      // Seletores específicos conhecidos
      '.jobs-description__content',
      '#job-details',
      '[class*="description__content"]',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      // Seletores mais amplos para collections/recommended
      'div[class*="jobs-description"]',
      '.scaffold-layout__detail section',
      '[data-view-name="job-details"] section',
      '[class*="job-view-layout"] section'
    );

    // Fallback: localiza "Sobre a vaga" no DOM pelo heading
    if (!desc) {
      const headings = Array.from(document.querySelectorAll('h2,h3,h4,span,strong'));
      const sobreH = headings.find(el => /^(sobre a vaga|about the job|job description)$/i.test(el.innerText?.trim()));
      if (sobreH) {
        // Tenta irmão seguinte, depois container pai progressivo
        const next = sobreH.nextElementSibling || sobreH.parentElement?.nextElementSibling;
        if (next && (next.innerText||'').length > 100) {
          desc = next.innerText.trim().slice(0, 5000);
        } else {
          const container = sobreH.closest('section') || sobreH.closest('article') || sobreH.parentElement?.parentElement;
          if (container) desc = (container.innerText || '').replace(/^Sobre a vaga\s*/i,'').trim().slice(0, 5000);
        }
      }
    }

    // Fallback texto puro: regex no bodyText (imune à obfuscação de classes do LinkedIn)
    if (!desc || desc.length < 80) {
      const bodyText = document.body.innerText || '';
      const m = bodyText.match(
        /(?:Sobre a vaga|About the job)\s*\n+([\s\S]{80,5000}?)(?=\n(?:Sobre a empresa|About the company|Habilidades|Skills|Formação|Education|Conheça a equipe|Meet the team|Candidatos semelhantes|Similar jobs|\d+ candidat))/i
      );
      if (m && m[1].length > 80) desc = m[1].trim().slice(0, 5000);
    }

    // Fallback final: og:description → texto selecionado pelo usuário
    if (!desc && ogDesc && ogDesc.length > 80) desc = ogDesc.slice(0, 5000);
    if (!desc) desc = (window.getSelection()?.toString().trim() || '').slice(0, 5000);

    // Limpeza: remove URLs de tracking do LinkedIn (comm/feed, lipi=, etc.) e linhas em branco excessivas
    if (desc) {
      desc = desc.replace(/https?:\/\/[^\s]{30,}/g, '').replace(/\n{3,}/g, '\n\n').trim();
      if (desc.length < 80) desc = '';
    }

    // 5. Forma de candidatura
    let forma = '';
    const applyBtn = document.querySelector(
      'button[aria-label*="Candidatura simplificada"], button[aria-label*="Easy Apply"], ' +
      '.jobs-apply-button--top-card, [class*="apply-button"], button[class*="jobs-apply"]'
    );
    if (applyBtn) {
      const btnTxt = applyBtn.innerText?.trim() || '';
      if (/simpl|easy/i.test(btnTxt)) forma = 'LinkedIn — Candidatura Simplificada';
      else if (/site|company|empresa/i.test(btnTxt)) forma = 'Site da empresa (link externo)';
      else if (btnTxt) forma = btnTxt;
    }
    if (!forma && /gerenciadas fora|managed outside/i.test(document.body.innerText)) {
      forma = 'Site da empresa (link externo)';
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
      // Filtra section headings em h1 E em metaTitle — ambos podem conter lixo no LinkedIn
      const h1Ok    = h1 && !_LI_SECTION_HEADINGS.test(h1) && !/^\d/.test(h1);
      const titleOk = metaTitle && !_LI_SECTION_HEADINGS.test(metaTitle) && !/^\d/.test(metaTitle);
      const cargoFinal = h1Ok ? h1 : (titleOk ? metaTitle : '');
      return {
        tipo: 'vaga',
        cargo: cargoFinal,
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

    // LinkedIn SPA: painel direito carrega após interação — espera até ter título E descrição
    // Máximo 12 tentativas × 300ms = 3.6s; retorna imediatamente se ambos presentes
    if (host.includes('linkedin.com')) {
      let tries = 0;
      function tryLinkedIn() {
        const d = extractLinkedIn();
        const hasTitle = !!(d.cargo || d.empresa);
        const hasDesc  = !!(d.descricao && d.descricao.length > 80);
        if ((hasTitle && hasDesc) || tries >= 12) {
          sendResponse({ ok: true, dados: hasTitle ? d : extractGenerico() });
        } else {
          tries++;
          setTimeout(tryLinkedIn, 300);
        }
      }
      tryLinkedIn();
      return true;
    }

    try {
      sendResponse({ ok: true, dados: extract() });
    } catch (e) {
      sendResponse({ ok: false, erro: e.message });
    }
  });

})();
