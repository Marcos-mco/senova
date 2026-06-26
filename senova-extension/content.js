// Content script — Senova Extension v2.31
// Copiloto: lê/preenche vaga, baixa CV, avisa envio + entrada "Por fora" (ativar pelo popup)

(function () {
  if (window.__senovaContentLoaded) return;
  window.__senovaContentLoaded = true;
  window.dispatchEvent(new CustomEvent('senova:ext-ready'));

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

    // 1c. Âncora "Sobre a vaga" — encontra o heading ANTES dela no DOM
    //     Busca "Sobre a vaga" em QUALQUER elemento (não só headings) para cobrir
    //     variações de marcação do LinkedIn. Inclui h4 e [role=heading].
    if (!cargo) {
      const _SKIP = /(pessoas que você|people you may|sobre o|about the company|candidatura|avalie|candidate|conexão|connection|promovida|promoted)/i;
      const allH = Array.from(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'));

      // Tenta encontrar "Sobre a vaga" nos headings primeiro, depois em qualquer elemento
      let sobreEl = allH.find(h => /^(sobre a vaga|about the job|job description)$/i.test(h.innerText?.trim()));
      if (!sobreEl) {
        sobreEl = Array.from(document.querySelectorAll('strong,span,div,p')).find(
          el => el.children.length === 0 && /^(sobre a vaga|about the job|job description)$/i.test((el.innerText||'').trim())
        );
      }

      if (sobreEl) {
        // Se o elemento está nos headings, usa a posição; senão, usa todos os headings antes
        const sobreIdx = allH.indexOf(sobreEl);
        const candidates = sobreIdx > 0 ? allH.slice(0, sobreIdx).reverse() : allH.slice().reverse();
        const found = candidates.find(h => {
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

    // 3b. Metadados adicionais: salário, modalidade (Presencial/Remoto/Híbrido), jornada (Tempo integral)
    let salario = '';
    let modalidade = '';
    let jornada = '';

    // Coleta todos os textos curtos das pills de "job insights"
    const _insightTexts = Array.from(document.querySelectorAll(
      '[class*="job-insight"] li, [class*="job-insight"] span, ' +
      '[class*="salary"] span, [class*="salary"], ' +
      '[class*="workplace"] span'
    )).map(el => (el.innerText || '').trim()).filter(t => t.length > 1 && t.length < 120);

    for (const t of _insightTexts) {
      if (!salario && /R\$|€|\$\s*\d|salár|salary/i.test(t)) { salario = t.replace(/\s+/g, ' '); continue; }
      if (!modalidade && /presencial|remoto|híbrido|hybrid|remote|on.?site/i.test(t)) {
        modalidade = /presencial|on.?site/i.test(t) ? 'Presencial' : /remoto|remote/i.test(t) ? 'Remoto' : 'Híbrido'; continue;
      }
      if (!jornada && /tempo integral|full.?time|tempo parcial|part.?time/i.test(t)) {
        jornada = /tempo integral|full.?time/i.test(t) ? 'Tempo integral' : 'Tempo parcial'; continue;
      }
    }

    // Fallback: scan do bodyText para campos ainda ausentes
    if (!salario || !modalidade || !jornada) {
      const bTxt = document.body.innerText || '';
      if (!salario) {
        const sm = bTxt.match(/R\$\s*\d[\d.,]*\s*[KkMm]?(?:\s*por\s*m[eê]s|\/mês)?(?:\s*[-–]\s*R\$\s*\d[\d.,]*\s*[KkMm]?(?:\s*por\s*m[eê]s|\/mês)?)?/);
        if (sm) salario = sm[0].replace(/\s+/g, ' ').trim();
      }
      if (!modalidade) {
        if (/\bpresencial\b/i.test(bTxt)) modalidade = 'Presencial';
        else if (/\bremoto\b|\bremote\b/i.test(bTxt)) modalidade = 'Remoto';
        else if (/\bhíbrido\b|\bhybrid\b/i.test(bTxt)) modalidade = 'Híbrido';
      }
      if (!jornada) {
        if (/\btempo integral\b|\bfull.time\b/i.test(bTxt)) jornada = 'Tempo integral';
        else if (/\btempo parcial\b|\bpart.time\b/i.test(bTxt)) jornada = 'Tempo parcial';
      }
    }

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
      desc = desc.replace(/https?:\/\/[^\s]{30,}/g, '').replace(/\n{3,}/g, '\n\n').replace(/[\s\n]*\.{2,3}\s*mais\s*$/i, '').replace(/[\s\n]*…\s*mais\s*$/i, '').replace(/[\s\n]*ver mais\s*$/i, '').trim();
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

    return { tipo: 'vaga', cargo, empresa, local, descricao: desc, forma_candidatura: forma, canal: 'LinkedIn', url, salario, modalidade, jornada };
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

  // ── GREENHOUSE ───────────────────────────────────────────────────
  // URL: boards.greenhouse.io/COMPANY/jobs/ID

  function extractGreenhouse() {
    const cargo = txt(
      'h1.app-title', 'h1[class*="job-title"]', '.posting-headline h2',
      '[data-qa="job-title"]', 'h1'
    );
    const empresaUrl = (url.match(/greenhouse\.io\/([^/?#]+)/)?.[1] || '')
      .replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const empresa = txt('.company-name', '.posting-headline .company', '[class*="company"]') || empresaUrl;
    const desc = txtArea('#content', '.section-wrapper .content', '[class*="posting-description"]', 'main');
    const forma = emailNaDesc(desc) || 'Greenhouse — Candidatura no site';
    return { tipo:'vaga', cargo, empresa, local:'', descricao:desc, forma_candidatura:forma, canal:'Empresa', url };
  }

  // ── LEVER ────────────────────────────────────────────────────────
  // URL: jobs.lever.co/COMPANY/UUID

  function extractLever() {
    const cargo = txt(
      'h2[data-qa="posting-name"]', '.posting-headline h2',
      '[class*="posting-name"]', 'h2', 'h1'
    );
    const empresaUrl = (url.match(/lever\.co\/([^/?#]+)/)?.[1] || '')
      .replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const empresa = txt('.main-header-logo img[alt]', '[class*="company-name"]', 'header h1') || empresaUrl;
    const desc = txtArea(
      '.section-wrapper .content', '[data-qa="job-description"]',
      '.posting-requirements', '.content[class*="section"]', 'main'
    );
    const forma = emailNaDesc(desc) || 'Lever — Candidatura no site';
    return { tipo:'vaga', cargo, empresa, local:'', descricao:desc, forma_candidatura:forma, canal:'Empresa', url };
  }

  // ── WORKABLE ─────────────────────────────────────────────────────

  function extractWorkable() {
    const cargo   = txt('[data-ui="job-title"]', 'h1[class*="title"]', 'h1');
    const empresa = txt('[data-ui="company-name"]', '[class*="company-name"]', 'header h2');
    const desc    = txtArea('[data-ui="job-description"]', '[class*="job-description"]', 'main');
    const forma   = emailNaDesc(desc) || 'Workable — Candidatura no site';
    return { tipo:'vaga', cargo, empresa, local:'', descricao:desc, forma_candidatura:forma, canal:'Empresa', url };
  }

  // ── ROTEADOR ────────────────────────────────────────────────────

  function extract() {
    if (host.includes('linkedin.com'))                              return extractLinkedIn();
    if (host.includes('gupy.io') || host.includes('gupy.com'))    return extractGupy();
    if (host.includes('inhire.app'))                               return extractInhire();
    if (host.includes('indeed.com'))                               return extractIndeed();
    if (host.includes('catho.com.br'))                             return extractCatho();
    if (host.includes('vagas.com.br') || host.includes('vagas.com')) return extractVagas();
    if (host.includes('greenhouse.io'))                            return extractGreenhouse();
    if (host.includes('lever.co'))                                 return extractLever();
    if (host.includes('workable.com'))                             return extractWorkable();
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

  // ── BOTÃO FLUTUANTE ──────────────────────────────────────────────
  // Aparece automaticamente em páginas de vaga reconhecidas (exceto LinkedIn — usa popup)
  // Permite salvar no Senova sem precisar abrir o popup da extensão

  function injectarBotaoFlutuante(dados) {
    if (document.getElementById('snv-fab')) return;
    if (document.getElementById('snv-copiloto')) return; // copiloto ativo → FAB é redundante

    const cargo   = (dados.cargo || 'Vaga detectada').slice(0, 42) + (dados.cargo?.length > 42 ? '…' : '');
    const empresa = (dados.empresa || '').slice(0, 38);

    const fab = document.createElement('div');
    fab.id = 'snv-fab';
    fab.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;filter:drop-shadow(0 4px 20px rgba(0,0,0,0.18));opacity:0;transition:opacity 0.25s;';

    fab.innerHTML = `
      <div style="background:#fff;border-radius:10px;overflow:hidden;width:216px;border:1px solid #D0D9E4;">
        <div style="background:#1A3A5C;padding:7px 10px;display:flex;align-items:center;gap:8px;">
          <div style="background:#C9A84C;width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#1A3A5C;flex-shrink:0;font-family:Georgia,serif;">S</div>
          <span style="color:#fff;font-size:12.5px;font-weight:700;flex:1;letter-spacing:0.03em;">Senova</span>
          <button id="snv-fab-fechar" style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px;padding:0;line-height:1;" title="Fechar">×</button>
        </div>
        <div style="padding:10px 12px;">
          <div style="font-size:12.5px;font-weight:700;color:#1A3A5C;line-height:1.3;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${dados.cargo || ''}">${cargo}</div>
          <div style="font-size:11px;color:#5A6A7A;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${empresa}</div>
          <button id="snv-fab-salvar" style="width:100%;background:#1A3A5C;color:#fff;border:none;border-radius:6px;padding:9px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s;">Salvar no Senova</button>
          <div id="snv-fab-ok" style="display:none;text-align:center;padding:7px 0 2px;font-size:12px;color:#1A6840;font-weight:600;">✓ Salvo — abra o app para analisar</div>
        </div>
      </div>`;

    document.body.appendChild(fab);
    requestAnimationFrame(() => { fab.style.opacity = '1'; });

    document.getElementById('snv-fab-fechar').addEventListener('click', () => fab.remove());

    document.getElementById('snv-fab-salvar').addEventListener('click', async () => {
      const btn = document.getElementById('snv-fab-salvar');
      btn.disabled = true;
      btn.textContent = 'Salvando…';
      btn.style.opacity = '0.6';

      try {
        const res = await chrome.runtime.sendMessage({
          type: 'SALVAR_VAGA',
          payload: {
            empresa:           dados.empresa,
            cargo:             dados.cargo,
            canal:             dados.canal,
            origemUrl:         dados.url,
            descricao:         dados.descricao,
            forma_candidatura: dados.forma_candidatura,
          },
        });

        if (res?.erro) {
          btn.textContent = 'Erro — tente pelo ícone';
          btn.style.background = '#C0281E';
          btn.disabled = false;
          btn.style.opacity = '1';
        } else {
          btn.style.display = 'none';
          document.getElementById('snv-fab-ok').style.display = 'block';
          setTimeout(() => fab.remove(), 5000);
        }
      } catch (_) {
        btn.textContent = 'Erro ao salvar';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  }

  function _tentarInjetar(restantes) {
    try {
      const dados = extract();
      if (dados.tipo === 'vaga' && (dados.cargo || dados.empresa) && (dados.descricao || '').length > 80) {
        injectarBotaoFlutuante(dados);
      } else if (restantes > 0) {
        setTimeout(() => _tentarInjetar(restantes - 1), 800);
      }
    } catch (_) {}
  }

  // Botão flutuante em todas as plataformas exceto LinkedIn (usa popup).
  if (!host.includes('linkedin.com')) {
    if (document.readyState === 'complete') {
      setTimeout(() => _tentarInjetar(6), 1200);
    } else {
      window.addEventListener('load', () => setTimeout(() => _tentarInjetar(6), 1200));
    }
  }

  // Auto-atualização Senova: em /jobs/view/ o browser está logado e pode ler a descrição completa.
  // Assim que encontrar, envia para o Senova (se estiver aberto) sem precisar de clique extra.
  if (host.includes('linkedin.com') && /\/jobs\/view\//.test(url)) {
    let _autoTries = 0;
    function _tryAutoUpdate() {
      const d = extractLinkedIn();
      if (d.descricao && d.descricao.length > 100) {
        chrome.runtime.sendMessage({
          type: 'AUTO_UPDATE_DESC',
          payload: { url: location.href, descricao: d.descricao, empresa: d.empresa, cargo: d.cargo, local: d.local, salario: d.salario, modalidade: d.modalidade, jornada: d.jornada }
        }).catch(() => {});
      } else if (_autoTries < 15) {
        _autoTries++;
        setTimeout(_tryAutoUpdate, 400);
      }
    }
    if (document.readyState === 'complete') {
      setTimeout(_tryAutoUpdate, 1800);
    } else {
      window.addEventListener('load', () => setTimeout(_tryAutoUpdate, 1800));
    }
  }

  // ── COPILOTO NA PÁGINA (v1.0 — fatia 1: lê a página e mostra o que detectou) ──
  // O copiloto LÊ a página da vaga e DETERMINA o que ela pede: forma de candidatura,
  // campos de formulário, perguntas abertas, upload de CV. Esta fatia só detecta e
  // mostra — preencher (autofill), gerar resposta (IA) e entregar CV/carta são as
  // fatias seguintes. A extensão NUNCA envia por você — a linha ética do Senova.
  // Desenho oficial: docs/copiloto_candidatura.v1.0.md

  let _copilotoAnalise = null;
  let _copilotoObserver = null;
  let _copilotoT = null;
  let _preenchendo = false;
  let _respondido = false;
  let _candidatado = false;
  let _viuForm = false;

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Visível na tela (não oculto por display:none / tamanho zero)
  function _visivel(el) {
    if (!el || !el.offsetParent) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Rótulo de um campo: <label for>, label ancestral, aria-label/labelledby, placeholder, name
  function _rotuloCampo(el) {
    let t = '';
    if (el.id) { try { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) t = l.innerText; } catch (_) {} }
    if (!t) { const l = el.closest('label'); if (l) t = l.innerText; }
    if (!t && el.getAttribute('aria-label')) t = el.getAttribute('aria-label');
    if (!t && el.getAttribute('aria-labelledby')) {
      const ref = document.getElementById(el.getAttribute('aria-labelledby'));
      if (ref) t = ref.innerText;
    }
    if (!t && el.placeholder) t = el.placeholder;
    if (!t && el.name) t = el.name;
    return (t || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  // Classifica um campo pelo tipo/rótulo. Retorna null se for ruído.
  function _classificarCampo(el) {
    if ((el.type || '').toLowerCase() === 'file') return { grupo: 'cv', label: 'Upload de currículo' };
    if (el.tagName === 'TEXTAREA') return { grupo: 'pergunta', label: _rotuloCampo(el) || 'Pergunta aberta' };
    const r = _rotuloCampo(el).toLowerCase();
    if (!r) return null;
    // Campos pessoais específicos ANTES do nome: um label "Nome e e-mail" casa e-mail aqui;
    // "Nome da cidade" casa cidade — evita que o genérico de nome capture esses por engano.
    if (/e-?mail/.test(r)) return { grupo: 'pessoal', label: 'E-mail', chave: 'email' };
    if (/telefone|phone|celular|whats|fone|mobile/.test(r)) return { grupo: 'pessoal', label: 'Telefone', chave: 'telefone' };
    if (/linkedin/.test(r)) return { grupo: 'pessoal', label: 'LinkedIn', chave: 'linkedin' };
    if (/cidade|city|localidade|munic[ií]pio|endere/.test(r)) return { grupo: 'pessoal', label: 'Cidade', chave: 'cidade' };
    if (/sal[aá]r|pretens|remunera|salary/.test(r)) return { grupo: 'pessoal', label: 'Pretensão' };
    // Nome — sobrenome / primeiro / completo / ambíguo. Ordem: específicos antes do genérico
    // ("Sobrenome" contém "nome", "First name" contém "name"). "nombre" (ES) é ambíguo como
    // "nome" — a resolução de contexto decide se é primeiro nome (há Apellido) ou nome inteiro.
    if (!/empresa|company|usu[aá]rio|user|arquivo|file/.test(r)) {
      if (/sobrenome|last\s*name|surname|family\s*name|apellido/.test(r)) return { grupo: 'pessoal', label: 'Sobrenome', chave: 'sobrenome' };
      if (/primeiro\s*nome|first\s*name|given\s*name|forename/.test(r)) return { grupo: 'pessoal', label: 'Nome', chave: 'primeiroNome' };
      if (/nome\s*completo|full\s*name|nome\s+e\s+sobrenome/.test(r)) return { grupo: 'pessoal', label: 'Nome completo', chave: 'nome' };
      if (/\bnome\b|\bname\b|\bnombre\b/.test(r)) return { grupo: 'pessoal', label: 'Nome', chave: 'nome', nomeAmbiguo: true };
    }
    if (/\?\s*$/.test(r) || r.length > 45) return { grupo: 'pergunta', label: r.slice(0, 60) };
    return { grupo: 'outro', label: r.slice(0, 40) };
  }

  // Acha o container do formulário de candidatura — só dentro dele escaneamos, para
  // não confundir a barra de busca e o chat do LinkedIn com campos de candidatura.
  function _acharContainerCandidatura() {
    const nCampos = el => el.querySelectorAll('input:not([type=hidden]),textarea,select').length;
    // Ruído: busca, navegação, login, newsletter, chat, cookies — NÃO é candidatura.
    const ehRuido = el => {
      if (el.matches('[role=search]')) return true;
      if (el.closest('nav,header,[role=banner],[role=navigation],[role=search]')) return true;
      const a = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('name') || '') + ' ' + (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
      return /search|busca|pesquis|newsletter|mensagem|\bmessage\b|\bchat\b|login|sign.?in|entrar|cookie|consent/.test(a);
    };
    // Sinal de candidatura: tem upload de CV/textarea OU um campo pessoal reconhecível
    // (nome/e-mail/telefone/currículo/LinkedIn/pretensão). Só ≥3 inputs NÃO basta — o
    // form de busca do Google/portais cai nisso e dava falso positivo em todo site.
    const temCampoApply = el => !!el.querySelector('input[type=file], textarea') ||
      Array.from(el.querySelectorAll('input,select')).some(i => {
        const l = _rotuloCampo(i).toLowerCase();
        return /nome|name\b|e-?mail|telefone|phone|celular|curr[ií]cul|\bcv\b|linkedin|sal[aá]r|pretens/.test(l);
      });
    const dialogs = Array.from(document.querySelectorAll('.jobs-easy-apply-modal, [role="dialog"], .artdeco-modal')).filter(_visivel);
    for (const d of dialogs) {
      if (d.matches('.jobs-easy-apply-modal')) return d;
      if (/candidat|apply|aplicar/i.test(d.innerText || '') && temCampoApply(d)) return d;
    }
    // entre os <form> de candidatura, escolhe o que tem MAIS campos (o principal).
    const forms = Array.from(document.querySelectorAll('form')).filter(_visivel)
      .filter(f => !ehRuido(f) && temCampoApply(f));
    if (forms.length) {
      forms.sort((a, b) => nCampos(b) - nCampos(a));
      return forms[0];
    }
    return null;
  }

  const _CAMPO_SEL = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select';

  // Coleta os campos do formulário de candidatura COM referência ao elemento (para preencher).
  function _coletarCampos() {
    const cont = _acharContainerCandidatura();
    if (!cont) return [];
    const els = Array.from(cont.querySelectorAll(_CAMPO_SEL)).filter(_visivel);
    const out = [];
    for (const el of els) {
      const c = _classificarCampo(el);
      if (c) out.push({ el, grupo: c.grupo, label: c.label, chave: c.chave, nomeAmbiguo: c.nomeAmbiguo });
    }
    // Resolução de contexto: se o form tem um campo "Sobrenome", então um "Nome" ambíguo
    // é o PRIMEIRO nome (ex.: Nome + Sobrenome separados). Sem sobrenome, "Nome" = nome inteiro.
    if (out.some(c => c.chave === 'sobrenome')) {
      for (const c of out) {
        if (c.chave === 'nome' && c.nomeAmbiguo) { c.chave = 'primeiroNome'; c.label = 'Nome'; }
      }
    }
    return out;
  }

  // Agrupa os campos para exibição (rótulos sem repetição).
  function _escanearCampos() {
    const grupos = { pessoal: [], pergunta: [], cv: [], outro: [] };
    const vistos = new Set();
    for (const c of _coletarCampos()) {
      const k = c.grupo + '|' + c.label;
      if (vistos.has(k)) continue;
      vistos.add(k);
      grupos[c.grupo].push(c.label);
    }
    const total = grupos.pessoal.length + grupos.pergunta.length + grupos.cv.length + grupos.outro.length;
    return { grupos, total };
  }

  // Escreve um valor num campo e dispara os eventos que React/Vue/Angular esperam — sem isso,
  // o framework da página ignora o valor digitado por código.
  function _preencherCampo(el, valor) {
    if (!el || valor == null) return;
    try {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, valor); else el.value = valor;
    } catch (_) { el.value = valor; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Forma de candidatura desta vaga no LinkedIn.
  function _detectarForma() {
    let btn = document.querySelector(
      'button[aria-label*="Candidatura simplificada" i], button[aria-label*="Easy Apply" i], .jobs-apply-button'
    );
    // Fallback: botão/link "Candidate-se / Candidatar-se / Apply" (external apply, PT/EN).
    if (!btn) {
      btn = Array.from(document.querySelectorAll('.jobs-apply-button, button, a')).find(b => {
        const t = (((b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '')).trim().toLowerCase());
        return t.length < 40 && /\b(candidatar-se|candidate-se|candidatar|apply|aplicar)\b/.test(t);
      }) || null;
    }
    const btnTxt = ((btn && (btn.innerText || btn.getAttribute('aria-label'))) || '').toLowerCase();
    if (/simpl|easy/.test(btnTxt)) return 'easyapply';
    if (/gerenciadas fora|managed outside/i.test(document.body.innerText)) return 'externa';
    if (btn) return 'externa';
    return 'desconhecida';
  }

  // Monta as linhas da leitura ("O que esta vaga pede") + o rodapé adequado ao estado.
  function _leituraHTML() {
    const noLinkedIn = host.includes('linkedin.com');
    const forma = _detectarForma();
    const { grupos, total } = _escanearCampos();
    const li = t => `<div style="font-size:13px;color:#2C2C2A;display:flex;gap:7px;margin-top:6px;line-height:1.4;"><span style="color:#C9A84C;flex-shrink:0;font-weight:700;">›</span><span>${_esc(t)}</span></div>`;

    // No LinkedIn, a página da vaga é só descrição — a candidatura abre fora ou no
    // modal Easy Apply. Nunca afirmar "Formulário de candidatura" aqui (não há um).
    const primeira = !noLinkedIn ? 'Formulário no site da empresa'
      : forma === 'easyapply' ? 'Candidatura Simplificada (LinkedIn)'
      : 'Candidatura no site da empresa';
    let linhas = li(primeira);
    if (grupos.pessoal.length) linhas += li('Dados: ' + grupos.pessoal.join(', '));
    if (grupos.pergunta.length) linhas += li(grupos.pergunta.length + (grupos.pergunta.length === 1 ? ' pergunta aberta' : ' perguntas abertas'));
    if (grupos.cv.length) linhas += li('Upload de currículo');
    if (grupos.outro.length) linhas += li(grupos.outro.length + (grupos.outro.length === 1 ? ' outro campo' : ' outros campos'));

    const rodape = total > 0
      ? 'Em seguida eu preencho e gero o que falta.'
      : !noLinkedIn ? 'Estou lendo o formulário desta página…'
      : forma === 'easyapply' ? 'Clique em “Candidatar-se” e eu leio os campos.'
      : forma === 'externa' ? 'Vou preparar seu CV e carta para você levar.'
      : 'Quando a candidatura abrir, eu leio os campos.';

    return { linhas, rodape };
  }

  function _atualizarCorpo() {
    const corpo = document.getElementById('snv-cop-corpo');
    if (!corpo || _preenchendo) return;
    const an = _copilotoAnalise;

    // Aviso especial: vaga já tem candidatura registrada no Senova
    if (an && an.status === 'aplicado' && !_candidatado) {
      const score = parseInt(an.score) || 0;
      const cor = score >= 75 ? '#1A6840' : score >= 55 ? '#9C5800' : '#B52419';
      corpo.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:11px;margin-bottom:11px;border-bottom:1px solid #E5ECF2;">
          <span style="font-size:12.5px;font-weight:600;color:#1A3A5C;">Compatibilidade</span>
          <span style="font-size:13px;font-weight:700;color:${cor};">${score} · ${score>=75?'ótima':score>=55?'vale ver':'fora do perfil'}</span>
        </div>
        <div style="background:#EAF7EF;border:1px solid rgba(26,104,64,0.3);border-radius:8px;padding:11px 13px;font-size:13px;color:#1A6840;font-weight:600;line-height:1.4;">
          ✓ Você já se candidatou a esta vaga.<br>
          <span style="font-weight:400;color:#2C2C2A;font-size:12.5px;">O card está em <b>CV Enviado</b> no Senova.</span>
        </div>`;
      return;
    }

    const { linhas, rodape } = _leituraHTML();
    const _campos = _coletarCampos();
    const _nPessoal = _campos.filter(c => c.grupo === 'pessoal' && c.chave && c.el && !c.el.value.trim()).length;
    const _nPerg = _campos.filter(c => c.grupo === 'pergunta' && c.el && !c.el.value.trim()).length;
    const _nPreencher = _nPessoal + _nPerg;
    const _temUpload = _campos.some(c => c.grupo === 'cv');
    const _temCV = _temUpload && !!(an && an.jobId); // mostra quando há upload + card conhecido

    let scoreHTML = '';
    const score = an ? (parseInt(an.score) || 0) : 0;
    if (score > 0) {
      const cor = score >= 75 ? '#1A6840' : score >= 55 ? '#9C5800' : '#B52419';
      const rotulo = score >= 75 ? 'ótima' : score >= 55 ? 'vale ver' : 'fora do perfil';
      scoreHTML = `<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:11px;margin-bottom:11px;border-bottom:1px solid #E5ECF2;">
        <span style="font-size:12.5px;font-weight:600;color:#1A3A5C;">Compatibilidade</span>
        <span style="font-size:13px;font-weight:700;color:${cor};">${score} · ${rotulo}</span>
      </div>`;
    }

    const btnHTML = _nPreencher
      ? `<button id="snv-cop-preencher" style="width:100%;margin-top:11px;background:#1A3A5C;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">✍️ Preencher para revisar</button>`
      : '';

    const btnCvHTML = _temCV
      ? `<button id="snv-cop-cv" style="width:100%;margin-top:8px;background:#fff;color:#1A3A5C;border:1.5px solid #1A3A5C;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">📄 ${an.temCV ? 'Baixar meu CV (.docx)' : 'Gerar e baixar CV (.docx)'}</button>`
      : '';

    // Candidatura: o automático marca ao detectar o envio; o manual é a rede de segurança.
    // O botão só aparece ONDE a candidatura acontece (site da empresa ou formulário aberto) —
    // não na página da vaga do LinkedIn, onde você ainda nem foi candidatar.
    const _emContextoCand = !!(an && an.jobId) && (!host.includes('linkedin.com') || !!_acharContainerCandidatura());
    const btnCandHTML = _candidatado
      ? `<div style="margin-top:9px;display:flex;align-items:center;gap:8px;background:#EAF7EF;border:1px solid rgba(26,104,64,0.25);border-radius:8px;padding:9px 11px;">
           <span style="font-size:13px;font-weight:700;color:#1A6840;flex:1;line-height:1.3;">✓ Registrei como CV Enviado</span>
           <button id="snv-cop-naoenviei" style="background:none;border:none;color:#2E6DA4;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">Não enviei</button>
         </div>`
      : _emContextoCand
        ? `<button id="snv-cop-candidatei" style="width:100%;margin-top:8px;background:#fff;color:#1A3A5C;border:1.5px solid #1A3A5C;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Já me candidatei</button>`
        : '';

    const rodapeHTML = _respondido
      ? '<b style="color:#1A6840;">✓ Preenchido.</b> Revise e ajuste antes de enviar.'
      : `${_esc(rodape)} <b style="color:#1A3A5C;">Você revisa e envia.</b>`;

    corpo.innerHTML = `
      ${scoreHTML}
      <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#98989D;margin-bottom:4px;">O que esta vaga pede</div>
      ${linhas}
      ${btnHTML}
      ${btnCvHTML}
      ${btnCandHTML}
      <div style="margin-top:12px;padding:9px 11px;background:#F0F4F8;border-radius:7px;font-size:12.5px;color:#3A4A5A;line-height:1.55;">
        ${rodapeHTML}
      </div>`;

    const bp = document.getElementById('snv-cop-preencher');
    if (bp) bp.addEventListener('click', _preencher);
    const bcv = document.getElementById('snv-cop-cv');
    if (bcv) bcv.addEventListener('click', _baixarCV);
    const bc = document.getElementById('snv-cop-candidatei');
    if (bc) bc.addEventListener('click', _marcarCandidatei);
    const bn = document.getElementById('snv-cop-naoenviei');
    if (bn) bn.addEventListener('click', _desfazerCandidatura);
  }

  // Baixa o CV (.docx) da vaga pelo app, para o usuário subir no campo de upload do portal.
  async function _baixarCV() {
    const an = _copilotoAnalise || {};
    if (!an.jobId) return;
    const btn = document.getElementById('snv-cop-cv');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = an && an.temCV ? 'Preparando…' : 'Gerando CV…'; }
    let res = null;
    try { res = await chrome.runtime.sendMessage({ type: 'COPILOTO_CV', jobId: an.jobId }); } catch (_) {}
    if (res && res.ok) {
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.background = '#EAF7EF'; btn.style.borderColor = '#1A6840'; btn.style.color = '#1A6840'; btn.textContent = '✓ CV baixado — arraste para o Upload'; }
    } else {
      const m = (res && res.motivo === 'sem_cv') ? 'Gere o CV desta vaga no Senova'
              : (res && res.erro === 'app_fechado') ? 'Abra o Senova numa aba'
              : (res && res.erro === 'sem_funcao') ? 'Recarregue o Senova'
              : 'Não consegui — tente de novo';
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = m; }
    }
  }

  // Avisa o Senova que a candidatura foi enviada → card move para CV Enviado + follow-up 7d.
  // Usa o jobId do passe para achar o card certo (estamos no site da empresa, não no LinkedIn).
  async function _marcarCandidatei() {
    const an = _copilotoAnalise || {};
    if (!an.jobId) return;
    const btn = document.getElementById('snv-cop-candidatei');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Registrando…'; }
    let res = null;
    try { res = await chrome.runtime.sendMessage({ type: 'COPILOTO_CANDIDATEI', jobId: an.jobId }); } catch (_) {}
    if (res && res.ok) {
      _candidatado = true;
      _atualizarCorpo();
    } else if (btn) {
      btn.disabled = false; btn.style.opacity = '1'; btn.style.background = '#B52419'; btn.style.color = '#fff'; btn.style.borderColor = '#B52419';
      btn.textContent = (res && res.erro === 'app_fechado') ? 'Abra o Senova e tente de novo' : 'Não consegui — tente de novo';
    }
  }

  // ── DETECÇÃO AUTOMÁTICA DE ENVIO ("nada manual") ────────────────────
  // Quando o formulário que você preencheu SOME e aparece a confirmação do portal, o copiloto
  // marca a candidatura sozinho e avisa (reversível em "Não enviei"). Conservador: só dispara
  // na transição form→confirmação, nunca por uma frase solta. O botão manual é a rede de segurança.
  const _RE_CONFIRMA = /candidatura\s+(enviada|realizada|recebida|conclu[ií]da|registrada|efetuada)|inscri[çc][ãa]o\s+(realizada|enviada|conclu[ií]da)|curr[ií]culo\s+enviado|recebemos\s+sua\s+candidatura|obrigad[oa]\s+por\s+(se\s+candidatar|sua\s+candidatura|se\s+inscrever)|application\s+(sent|submitted|received|complete)|thank\s+you\s+for\s+(applying|your\s+application)|successfully\s+applied/i;

  function _temConfirmacaoEnvio() {
    const els = document.querySelectorAll('h1,h2,h3,h4,p,span,strong,div');
    for (const el of els) {
      if (el.children.length > 3) continue; // só folhas/quase-folhas (evita casar o body inteiro)
      const t = (el.innerText || '').trim();
      if (t.length > 8 && t.length < 200 && _RE_CONFIRMA.test(t) && _visivel(el)) return true;
    }
    return false;
  }

  function _checarEnvioAuto() {
    if (_candidatado || _preenchendo) return;
    const an = _copilotoAnalise;
    if (!an || !an.jobId) return;
    if (_acharContainerCandidatura()) { _viuForm = true; return; } // ainda há formulário aberto
    if (_viuForm && _temConfirmacaoEnvio()) _autoMarcarCandidatura();
  }

  async function _autoMarcarCandidatura() {
    if (_candidatado) return;
    const an = _copilotoAnalise || {};
    if (!an.jobId) return;
    _candidatado = true; // trava otimista — não repete
    let res = null;
    try { res = await chrome.runtime.sendMessage({ type: 'COPILOTO_CANDIDATEI', jobId: an.jobId }); } catch (_) {}
    if (res && res.ok) { _atualizarCorpo(); }
    else { _candidatado = false; } // falhou — mantém o caminho manual disponível
  }

  async function _desfazerCandidatura() {
    const an = _copilotoAnalise || {};
    if (!an.jobId) return;
    const bn = document.getElementById('snv-cop-naoenviei');
    if (bn) { bn.textContent = '…'; bn.disabled = true; }
    try { await chrome.runtime.sendMessage({ type: 'COPILOTO_DESFAZER', jobId: an.jobId }); } catch (_) {}
    _candidatado = false;
    _viuForm = false; // evita re-disparo imediato da detecção
    _atualizarCorpo();
  }

  // Preenche o formulário para revisão: dados fixos (Cartão) + respostas das perguntas abertas
  // (perfil + IA). Pausa o observer durante o preenchimento. NUNCA envia — só preenche.
  async function _preencher() {
    const btn = document.getElementById('snv-cop-preencher');
    const campos = _coletarCampos();
    const pessoais = campos.filter(c => c.grupo === 'pessoal' && c.chave && c.el && !c.el.value.trim());
    const perguntas = campos.filter(c => c.grupo === 'pergunta' && c.el && !c.el.value.trim());
    if (!pessoais.length && !perguntas.length) return;
    _preenchendo = true;
    if (_copilotoObserver) _copilotoObserver.disconnect();
    const an = _copilotoAnalise || {};
    let algum = false, erroMsg = '';
    const _falha = e => e === 'app_fechado' ? 'Abra o Senova numa aba e tente de novo'
                      : e === 'sem_funcao' ? 'Recarregue o Senova (Ctrl+Shift+R)'
                      : 'Não consegui agora — tente de novo';

    // 1) Dados fixos (Cartão de candidatura)
    if (pessoais.length) {
      if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Preenchendo seus dados…'; }
      let cartao = null;
      try { cartao = await chrome.runtime.sendMessage({ type: 'COPILOTO_CARTAO' }); } catch (_) {}
      if (cartao && cartao.erro) erroMsg = _falha(cartao.erro);
      else if (cartao) {
        for (const c of pessoais) {
          const v = cartao[c.chave];
          if (v) { _preencherCampo(c.el, v); algum = true; }
        }
      }
    }

    // 2) Perguntas abertas (perfil + IA)
    if (!erroMsg && perguntas.length) {
      let i = 0;
      for (const c of perguntas) {
        i++;
        if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = `Respondendo… (${i}/${perguntas.length})`; }
        let resp = null;
        try { resp = await chrome.runtime.sendMessage({ type: 'COPILOTO_RESPOSTA', pergunta: c.label, cargo: an.cargo || '', empresa: an.empresa || '' }); } catch (_) {}
        if (resp && resp.erro) { erroMsg = _falha(resp.erro); break; }
        if (typeof resp === 'string' && resp.trim()) { _preencherCampo(c.el, resp.trim()); algum = true; }
      }
    }

    _preenchendo = false;
    if (erroMsg) {
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.background = '#B52419'; btn.textContent = erroMsg; }
    } else {
      _respondido = algum;
      _atualizarCorpo();
    }
    if (_copilotoObserver) _copilotoObserver.observe(document.body, { childList: true, subtree: true });
  }

  function injetarCopiloto(an) {
    _copilotoAnalise = an;
    if (document.getElementById('snv-copiloto')) { _atualizarCorpo(); return; }

    const wrap = document.createElement('div');
    wrap.id = 'snv-copiloto';
    wrap.style.cssText = 'position:fixed;top:72px;right:20px;z-index:2147483647;width:300px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;filter:drop-shadow(0 6px 24px rgba(26,58,92,0.20));opacity:0;transition:opacity 0.25s;';
    wrap.innerHTML = `
      <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #D0D9E4;">
        <div style="background:#1A3A5C;padding:9px 12px;display:flex;align-items:center;gap:9px;">
          <div style="background:#C9A84C;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#1A3A5C;flex-shrink:0;font-family:Georgia,serif;">S</div>
          <div style="flex:1;line-height:1.15;min-width:0;">
            <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.02em;">Senova · Copiloto</div>
            <div style="color:rgba(255,255,255,0.6);font-size:10.5px;margin-top:1px;">leu esta vaga para você</div>
          </div>
          <button id="snv-cop-fechar" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:19px;padding:0 2px;line-height:1;flex-shrink:0;" title="Fechar">×</button>
        </div>
        <div id="snv-cop-corpo" style="padding:13px 14px;"></div>
      </div>`;
    document.body.appendChild(wrap);
    const _fab = document.getElementById('snv-fab'); if (_fab) _fab.remove(); // copiloto substitui o FAB
    requestAnimationFrame(() => { wrap.style.opacity = '1'; });
    document.getElementById('snv-cop-fechar').addEventListener('click', () => {
      wrap.remove();
      if (_copilotoObserver) { _copilotoObserver.disconnect(); _copilotoObserver = null; }
    });

    _atualizarCorpo();

    // Reescaneia quando a página muda (modal abre / avança de etapa / confirmação de envio).
    _copilotoObserver = new MutationObserver(() => {
      clearTimeout(_copilotoT);
      _copilotoT = setTimeout(() => { _checarEnvioAuto(); _atualizarCorpo(); }, 400);
    });
    _copilotoObserver.observe(document.body, { childList: true, subtree: true });
  }

  // PULL da análise: se esta vaga do LinkedIn já tem card com Compatibilidade no app, puxa a
  // análise, acorda o copiloto AQUI e deixa um "passe" para o site de candidatura externo
  // (leva só a análise — fluxograma v1.3). Sem card (app fechado/vaga nova) → nada é exibido.
  if (host.includes('linkedin.com') && /\/jobs\/view\/(\d+)/.test(url)) {
    const _jid = (url.match(/\/jobs\/view\/(\d+)/) || [])[1];
    if (_jid) {
      chrome.runtime.sendMessage({ type: 'GET_ANALISE', jobId: _jid })
        .then(an => {
          if (!an) return;
          an.jobId = _jid;
          window.__senovaAnalise = an;
          injetarCopiloto(an);
          // Passe para quando você sair para o site da empresa (Loxo, Greenhouse, etc.)
          chrome.storage.local.set({ senova_passe: {
            jobId: _jid, score: an.score, compatFortes: an.compatFortes,
            compatAtencao: an.compatAtencao, cargo: an.cargo, empresa: an.empresa, ts: Date.now()
          } }).catch(() => {});
        })
        .catch(() => {});
    }
  }

  // COPILOTO NO SITE DE CANDIDATURA EXTERNO — o copiloto te acompanha do LinkedIn para o
  // site da empresa, onde a candidatura realmente acontece. Só aparece se você veio de uma
  // vaga do Senova (passe recente) e a página parece de candidatura — não invade navegação.
  if (!host.includes('linkedin.com')) {
    chrome.storage.local.get('senova_passe').then(s => {
      const passe = s.senova_passe;
      if (!passe || (Date.now() - passe.ts) > 45 * 60 * 1000) return;
      const pareceCandidatura = /apply|candidat|job|career|vaga|position|opening|recruit/i.test(url + ' ' + document.title);
      const inject = () => {
        if (!_acharContainerCandidatura() && !pareceCandidatura) return;
        injetarCopiloto({
          jobId: passe.jobId, score: passe.score, compatFortes: passe.compatFortes,
          compatAtencao: passe.compatAtencao, cargo: passe.cargo, empresa: passe.empresa
        });
      };
      if (document.body) inject(); else window.addEventListener('DOMContentLoaded', inject);
    }).catch(() => {});
  }

  // Entrada "Por fora": o usuário chegou direto à vaga e clicou na extensão. O popup analisa a
  // vaga na hora e manda acordar o copiloto AQUI. Sem jobId de card → preenche dados e perguntas;
  // CV e "já me candidatei" dependem de um card e são a fatia seguinte.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'ATIVAR_COPILOTO' && msg.analise) {
      try { injetarCopiloto(msg.analise); } catch (_) {}
    }
  });

})();
