// Content script — Senova Extension v2.54
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
  let _habilidadesSel = null; // habilidades que o copiloto destacou (para mostrar no painel)
  let _selFeitas = [];        // autodeclarações (gênero/raça/orientação) que o copiloto marcou
  let _selPendentes = [];     // declaradas mas SEM opção equivalente no portal → você escolhe à mão
  let _ultimoPasse = undefined; // estado do passe lido nesta página externa (instrumentação do diag)
  let _lastDiagSig = '';      // último diagnóstico logado (evita repetir no console a cada mutação)

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

  // Um elemento "parece rótulo": texto curto, não é um controle e não embrulha campos.
  function _textoRotulo(el) {
    if (!el || !el.tagName) return '';
    if (!/^(LABEL|LEGEND|SPAN|DIV|P|STRONG|B|EM|H[1-6]|TD|TH|DT)$/.test(el.tagName)) return '';
    // se contém um campo, é um container (linha do form) e não o rótulo em si
    if (el.querySelector && el.querySelector('input,textarea,select,button')) return '';
    const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return (t.length >= 2 && t.length <= 90) ? t : '';
  }

  // Rótulo pela POSIÇÃO: o texto que antecede o campo. A maioria dos ATS (DHL, Lumesse, etc.)
  // põe o rótulo ACIMA/AO LADO do input, sem o vínculo formal "for" — sem isto o copiloto lia
  // só os poucos campos "colados" (2 de 49 no form da DHL). Sobe poucos níveis, conservador.
  function _rotuloPorPosicao(el) {
    let node = el;
    for (let nivel = 0; nivel < 4 && node && node !== document.body; nivel++) {
      let sib = node.previousElementSibling, hops = 0;
      while (sib && hops < 4) {
        const t = _textoRotulo(sib);
        if (t) return t;
        sib = sib.previousElementSibling; hops++;
      }
      node = node.parentElement;
    }
    return '';
  }

  // Rótulo de um campo: <label for> → label ancestral → aria → placeholder → POSIÇÃO (texto ao
  // redor) → name. A leitura por posição destrava os ATS que não "colam" o rótulo no campo.
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
    if (!t) t = _rotuloPorPosicao(el);
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
    // Dados sensíveis de TEXTO — preenchidos pelo Cartão (determinístico, nunca pela IA) só se o
    // usuário autorizou no Perfil; sem autorização o Cartão não traz a chave → campo fica vazio e
    // entra na mensagem honesta. Geral: casa por rótulo em qualquer portal. Gênero/raça/orientação
    // NÃO entram (são seleção; preencher select ainda não é suportado — ver fila S21).
    if (/\bcpf\b/.test(r)) return { grupo: 'pessoal', label: 'CPF', chave: 'cpf' };
    if (/\bpis\b|pasep|\bnit\b/.test(r)) return { grupo: 'pessoal', label: 'PIS/PASEP', chave: 'pis' };
    // Só DATA de nascimento — exclui "local/cidade/naturalidade de nascimento" (lugar, não data),
    // que não devem receber a data. Lugar não preenchido é melhor que lugar preenchido errado.
    if (!/local|cidade|munic|natural|cidad/.test(r) && /nascimento|nasc\.|data\s*de\s*nasc|date\s*of\s*birth|birth\s*date|birthdate/.test(r)) return { grupo: 'pessoal', label: 'Data de nascimento', chave: 'nascimento' };
    // Autodeclaração sensível (LGPD): só MARCAMOS a opção equivalente à escolha do Perfil, nunca
    // inferimos (ver _preencherSelecao). Orientação ANTES de gênero (evita "orientação sexual"
    // cair em gênero). Raça por "raça/cor/etnia". Vão para o grupo 'selecao'.
    if (/orienta[çc][ãa]o|sexual\s*orientation/.test(r)) return { grupo: 'selecao', label: 'Orientação', chave: 'orientacao' };
    if (/ra[çc]a|etnia|ethnic/.test(r)) return { grupo: 'selecao', label: 'Raça/cor', chave: 'raca' };
    if (/\bg[êe]nero\b|gender|identidade\s*de\s*g[êe]nero|\bsexo\b/.test(r)) return { grupo: 'selecao', label: 'Gênero', chave: 'genero' };
    // Nome — sobrenome / primeiro / completo / ambíguo. Ordem: específicos antes do genérico
    // ("Sobrenome" contém "nome", "First name" contém "name"). "nombre" (ES) é ambíguo como
    // "nome" — a resolução de contexto decide se é primeiro nome (há Apellido) ou nome inteiro.
    if (!/empresa|company|usu[aá]rio|user|arquivo|file/.test(r)) {
      if (/sobrenome|last\s*name|surname|family\s*name|apellido/.test(r)) return { grupo: 'pessoal', label: 'Sobrenome', chave: 'sobrenome' };
      if (/primeiro\s*nome|first\s*name|given\s*name|forename/.test(r)) return { grupo: 'pessoal', label: 'Nome', chave: 'primeiroNome' };
      if (/nome\s*completo|full\s*name|nome\s+e\s+sobrenome/.test(r)) return { grupo: 'pessoal', label: 'Nome completo', chave: 'nome' };
      if (/\bnome\b|\bname\b|\bnombre\b/.test(r)) return { grupo: 'pessoal', label: 'Nome', chave: 'nome', nomeAmbiguo: true };
    }
    // Pergunta aberta só quando é DE FATO uma pergunta (termina em "?"). Rótulos longos de
    // instrução (PIS, CPF, "código…") NÃO são pergunta — senão a IA escreveria prosa num campo
    // de formato fixo. Caixa de texto grande (textarea) já caiu como pergunta lá em cima.
    if (/\?\s*$/.test(r)) return { grupo: 'pergunta', label: r.slice(0, 60) };
    return { grupo: 'outro', label: r.slice(0, 45) };
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

  // Varre a página inteira por campos de candidatura, excluindo ruído por campo (nav/header/
  // footer/busca/login/newsletter/chat) e o próprio painel. A injeção do copiloto é estrita
  // (Google etc. não injeta), então isto só roda onde o copiloto já apareceu.
  function _scanPaginaCampos() {
    const _ruidoRe = /search|busca|pesquis|newsletter|mensagem|\bmessage\b|\bchat\b|coment|login|sign.?in|entrar|cookie|consent/;
    return Array.from(document.querySelectorAll(_CAMPO_SEL)).filter(el => {
      if (!_visivel(el)) return false;
      if (el.closest('nav,header,footer,[role=banner],[role=navigation],[role=search],#snv-copiloto')) return false;
      // Inclui o rótulo (que cobre placeholder e label) na checagem de ruído — pega caixas de
      // busca/comentário/chat/newsletter cujo aria-label/name esteja vazio.
      const a = ((el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('name') || '') + ' ' + (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '') + ' ' + _rotuloCampo(el)).toLowerCase();
      return !_ruidoRe.test(a);
    });
  }

  // Coleta os campos do formulário de candidatura COM referência ao elemento (para preencher).
  function _coletarCampos() {
    const cont = _acharContainerCandidatura();
    let els;
    if (cont) {
      els = Array.from(cont.querySelectorAll(_CAMPO_SEL)).filter(_visivel);
      // Container <form> pequeno demais: ATS como DHL/Lumesse espalham os campos em vários <form>
      // (ou fora de <form>). Se a página tem bem mais campos de candidatura que o form escolhido,
      // varre a página inteira. Modais/dialogs (LinkedIn Easy Apply) são confiáveis — não ampliar.
      if (cont.tagName === 'FORM') {
        const pagina = _scanPaginaCampos();
        if (pagina.length >= els.length + 3) els = pagina;
      }
    } else {
      els = _scanPaginaCampos();
    }
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
    const grupos = { pessoal: [], pergunta: [], selecao: [], cv: [], outro: [] };
    const vistos = new Set();
    for (const c of _coletarCampos()) {
      const k = c.grupo + '|' + c.label;
      if (vistos.has(k)) continue;
      vistos.add(k);
      grupos[c.grupo].push(c.label);
    }
    const total = grupos.pessoal.length + grupos.pergunta.length + grupos.selecao.length + grupos.cv.length + grupos.outro.length;
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

  // ── AUTODECLARAÇÃO (gênero/raça/orientação) ────────────────────────────────────────────────
  // Dado sensível (LGPD Art. 5/11): autoidentificação. O usuário declarou o valor canônico no
  // Perfil; aqui só MARCAMOS a opção do portal que corresponde EXATAMENTE a essa escolha — nunca
  // inferimos outra categoria. Sem correspondência segura (0 ou ambígua) → deixa em branco.
  function _norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function _ehPlaceholder(t) { return !_norm(t) || /\b(selecione|escolha|prefiro nao|nao informar|nao declarar|select|choose|none)\b/.test(_norm(t)); }
  // Variantes aprovadas por categoria canônica (raça/orientação). Só formas da MESMA categoria
  // (gramaticais/idioma) — jamais cruzam. Negro(a) só entra p/ Preta/Parda se o usuário autorizou.
  const _VAR = {
    raca: { branca: /\bbranc[oa]\b/, preta: /\bpret[oa]\b/, parda: /\bpard[oa]\b/, amarela: /\bamarel[oa]\b/, indigena: /\bindigena\b/ },
    orientacao: { heterossexual: /\b(heteross?exual|hetero|straight)\b/, homossexual: /\b(homoss?exual|gay|lesbic[ao]|lesbian)\b/, bissexual: /\b(bissexual|bisexual|bi)\b/, outra: /\b(outr[oa]s?|other)\b/ }
  };
  function _variantePadrao(chave, canon, racaNegro) {
    const tbl = _VAR[chave]; if (!tbl) return null;
    let re = tbl[canon]; if (!re) return null;
    if (chave === 'raca' && racaNegro && (canon === 'preta' || canon === 'parda')) re = new RegExp(re.source + '|\\bnegr[oa]\\b');
    return re;
  }
  // Gênero precisa de regra própria por causa do par identidade × (cis/trans). `spec` casa a opção
  // EXPLÍCITA. `base` (só p/ cis) é a queda para "Masculino/Feminino" quando NÃO há opção marcada
  // cis/trans/NB. Trans e não-bináries NÃO têm base: sem opção equivalente → branco (decisão de
  // Marcos: nunca reclassificar identidade numa caixa binária). Devolve a <option> ou null.
  const _GEN = {
    'homem-cis': { spec: /\b(homem cis\w*|cis ?(genero )?masculino|homem cisgenero)\b/, base: /\b(homem|masculino|male)\b/ },
    'mulher-cis': { spec: /\b(mulher cis\w*|cis ?(genero )?feminino|mulher cisgenero)\b/, base: /\b(mulher|feminino|female)\b/ },
    'homem-trans': { spec: /\b(homem trans\w*|trans ?(genero )?masculino|homem transgenero|ftm)\b/ },
    'mulher-trans': { spec: /\b(mulher trans\w*|trans ?(genero )?feminino|mulher transgenero|mtf)\b/ },
    'nao-binario': { spec: /\b(nao binari\w*|nao bin|nonbinary|non binary|enby)\b/ },
    'agenero': { spec: /\b(agenero|agender)\b/ },
    'genero-fluido': { spec: /\b(genero fluido|fluido|genderfluid)\b/ },
    'bigenero': { spec: /\b(bigenero|bigender)\b/ },
    'outro': { spec: /\b(outr[oa]s?|other)\b/ }
  };
  const _GEN_QUALIF = /\b(cis\w*|trans\w*|nao binari\w*|nonbinary|non binary|agenero|fluido|bigenero|enby)\b/;
  function _casarGenero(opts, canon) {
    const g = _GEN[canon]; if (!g) return null;
    const norm = opts.map(o => ({ o, n: _norm(o.textContent) }));
    let m = norm.filter(x => g.spec.test(x.n));
    if (m.length === 1) return m[0].o;
    if (m.length > 1) return null; // ambígua → não arrisca
    if (g.base) { // só cis cai para Masculino/Feminino, e só entre opções NÃO marcadas cis/trans/NB
      const cand = norm.filter(x => !_GEN_QUALIF.test(x.n));
      m = cand.filter(x => g.base.test(x.n));
      if (m.length === 1) return m[0].o;
    }
    return null;
  }
  // Um <select> é "vazio" se não há seleção real (placeholder/em branco). Texto: sem valor.
  function _seleVazia(el) {
    if (el.tagName === 'SELECT') { const o = el.options[el.selectedIndex]; return !o || !o.value || _ehPlaceholder(o.textContent); }
    return !el.value.trim();
  }
  // Marca a opção equivalente à autodeclaração. Só <select> (categoria fechada); campo de texto
  // livre fica para o usuário (não despeja token). Devolve true só se REALMENTE marcou.
  function _preencherSelecao(el, chave, canon, racaNegro) {
    if (el.tagName !== 'SELECT') return false;
    if (!_seleVazia(el)) return false; // não sobrescreve escolha já feita
    const opts = Array.from(el.options).filter(o => o.value !== '' && !_ehPlaceholder(o.textContent));
    let alvo = null;
    if (chave === 'genero') {
      alvo = _casarGenero(opts, canon);
    } else {
      const re = _variantePadrao(chave, canon, racaNegro); if (!re) return false;
      const casam = opts.filter(o => re.test(_norm(o.textContent)));
      alvo = casam.length === 1 ? casam[0] : null; // 0 ou ambígua → não arrisca
    }
    if (!alvo) return false;
    el.value = alvo.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value === alvo.value;
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
    // Combina texto E aria-label: o botão Easy Apply costuma exibir "Candidatar-se" mas traz
    // "Candidatura simplificada" no aria-label — usar só o innerText classificava errado (externa).
    const btnTxt = (btn ? ((btn.innerText || '') + ' ' + (btn.getAttribute('aria-label') || '')) : '').toLowerCase();
    if (/simpl|easy\s*apply/.test(btnTxt)) return 'easyapply';
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
    if (grupos.selecao.length) linhas += li('Autodeclaração: ' + grupos.selecao.join(', '));
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

  // ── DIAGNÓSTICO (modo de campo) ─────────────────────────────────────
  // O copiloto relata o que ENXERGA do formulário desta página, para o Bruno consertar a causa
  // real sem depender de Marcos descrever termos técnicos. Pequeno, reversível, sem chamada paga.
  function _diagnostico() {
    let cont = null;
    try { cont = _acharContainerCandidatura(); } catch (_) {}
    let campos = [];
    try { campos = _coletarCampos(); } catch (_) {}
    const porGrupo = g => campos.filter(c => c.grupo === g).length;
    const vazios = campos.filter(c => c.el && (
      (((c.grupo === 'pessoal' && c.chave) || c.grupo === 'pergunta') && !c.el.value.trim()) ||
      (c.grupo === 'selecao' && c.chave && _seleVazia(c.el))
    )).length;
    let inputs = 0;
    try { inputs = document.querySelectorAll(_CAMPO_SEL).length; } catch (_) {}
    // Por que campos não são lidos? Conta visíveis na página e dentro do container, quantos
    // ficam SEM rótulo, e mostra uma amostra dos rótulos achados. Diz se o container está errado
    // (campos fora dele) ou se a leitura de rótulo é que falha neste DOM.
    let visDoc = 0, visEsc = 0, semRotulo = 0; const amostra = [];
    try {
      visDoc = Array.from(document.querySelectorAll(_CAMPO_SEL)).filter(_visivel).length;
      const vis = Array.from((cont || document).querySelectorAll(_CAMPO_SEL)).filter(_visivel);
      visEsc = vis.length;
      for (const el of vis) {
        const r = _rotuloCampo(el);
        if (!r) semRotulo++;
        else if (amostra.length < 8) amostra.push(r.slice(0, 22));
      }
    } catch (_) {}
    // Upload: quantos <input type=file> existem no escopo e quantos estão VISÍVEIS. Diz a verdade
    // sobre o "adicionar arquivo" — campo escondido atrás de botão (fileN>0, fileVis=0) vs. outra
    // coisa (fileN=0: drag-drop, iframe, widget) — sem supor.
    let fileN = 0, fileVis = 0;
    try {
      const fl = Array.from((cont || document).querySelectorAll('input[type=file]'));
      fileN = fl.length; fileVis = fl.filter(_visivel).length;
    } catch (_) {}
    // iframes: um formulário de candidatura dentro de iframe cross-origin é invisível para nós.
    const ifr = Array.from(document.querySelectorAll('iframe'));
    let semAcesso = 0; const hosts = [];
    for (const f of ifr) {
      let ok = false;
      try { ok = !!f.contentDocument; } catch (_) { ok = false; }
      if (!ok) { semAcesso++; try { hosts.push(new URL(f.src, location.href).hostname); } catch (_) {} }
    }
    const an = _copilotoAnalise || {};
    const origem = !an.jobId ? 'popup/sem-card'
      : host.includes('linkedin.com') ? 'card-linkedin' : 'passe-externo';
    const container = !cont ? 'NÃO ENCONTRADO'
      : (cont.matches && cont.matches('.jobs-easy-apply-modal')) ? 'easy-apply-modal'
      : (cont.tagName === 'FORM') ? 'form' : 'dialog';
    let forma = '';
    try { forma = _detectarForma(); } catch (_) { forma = '?'; }
    return {
      origem, container, inputs, visDoc, visEsc, semRotulo, amostra: amostra.join(' | '),
      fileN, fileVis,
      classificados: campos.length, pessoal: porGrupo('pessoal'), perguntas: porGrupo('pergunta'),
      selecao: porGrupo('selecao'),
      passe: _ultimoPasse === undefined ? 'não lido' : !_ultimoPasse ? 'nenhum'
        : `jobId ${_ultimoPasse.jobId} · há ${Math.round((Date.now() - _ultimoPasse.ts) / 60000)}min`,
      upload: porGrupo('cv'), vazios, iframes: ifr.length, iframesSemAcesso: semAcesso,
      iframeHosts: [...new Set(hosts)].slice(0, 4).join(', '), forma
    };
  }

  function _formatarDiag(d) {
    return [
      'SENOVA DIAG v2.54',
      'site: ' + host,
      'origem do painel: ' + d.origem,
      'passe (card): ' + d.passe,
      'container do formulário: ' + d.container,
      'inputs na página: ' + d.inputs + ' (visíveis: ' + d.visDoc + ')',
      'no container (visíveis): ' + d.visEsc + ' · sem rótulo: ' + d.semRotulo,
      'rótulos vistos: ' + (d.amostra || '—'),
      'campos lidos: ' + d.classificados + ' (pessoal ' + d.pessoal + ' · perguntas ' + d.perguntas + ' · autodeclaração ' + d.selecao + ' · upload ' + d.upload + ')',
      'campos de arquivo (upload): ' + d.fileN + ' (visíveis: ' + d.fileVis + ')',
      'vazios p/ preencher: ' + d.vazios,
      'iframes: ' + d.iframes + ' (sem acesso: ' + d.iframesSemAcesso + (d.iframeHosts ? ' → ' + d.iframeHosts : '') + ')',
      'forma: ' + d.forma,
      'url: ' + location.href
    ].join('\n');
  }

  async function _copiarDiag(btn, txt) {
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch (_) {}
    if (!ok) {
      try {
        const pre = document.getElementById('snv-cop-diagtxt');
        const r = document.createRange(); r.selectNodeContents(pre);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        ok = document.execCommand('copy'); sel.removeAllRanges();
      } catch (_) {}
    }
    btn.textContent = ok ? '✓ Copiado — cole no chat com o Bruno' : 'Selecione o texto acima e copie';
    btn.style.background = ok ? '#1A6840' : '#9C5800';
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
    const _nSelecao = _campos.filter(c => c.grupo === 'selecao' && c.chave && c.el && _seleVazia(c.el)).length;
    const _nPreencher = _nPessoal + _nPerg + _nSelecao;
    const _temUpload = _campos.some(c => c.grupo === 'cv');
    // O CV NÃO depende de "enxergar" o campo de upload: portais como a DHL usam um widget próprio
    // (campos de arquivo: 0) e cada ATS é diferente — caçar isso seria gambiarra. O papel do
    // copiloto é te ENTREGAR o CV certo; você sobe (ou usa o "Importar do currículo" do portal).
    // Regra geral (zero código por portal): oferece o CV quando há card conhecido E estamos no
    // site de candidatura externo, OU quando há um upload de fato detectado (ex.: Easy Apply).
    const _emCandExterna = !!(an && an.jobId) && !host.includes('linkedin.com');
    const _temCV = !!(an && an.jobId) && (_temUpload || _emCandExterna);

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
      ? `<button id="snv-cop-preencher" style="width:100%;margin-top:11px;background:#1A3A5C;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Preencher para revisar</button>`
      : '';

    const btnCvHTML = _temCV
      ? `<button id="snv-cop-cv" style="width:100%;margin-top:8px;background:#fff;color:#1A3A5C;border:1.5px solid #1A3A5C;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">${an.temCV ? 'Baixar meu CV (.docx)' : 'Gerar e baixar CV (.docx)'}</button>`
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

    const _habTxt = (_respondido && _habilidadesSel && _habilidadesSel.length)
      ? ` <span style="color:#2C2C2A;">Destaquei: <b>${_esc(_habilidadesSel.join(', '))}</b> — ajuste se quiser.</span>` : '';
    // Mensagem HONESTA: diz O QUE preencheu e QUANTO falta com você (CPF, datas, dados sensíveis).
    // Nunca só "✓ Preenchido" — o usuário precisa saber que ainda há campos por fazer.
    const _feito = [...new Set([
      ..._campos.filter(c => c.grupo === 'pessoal' && c.el && c.el.value.trim()).map(c => c.label),
      ..._selFeitas
    ])].join(', ');
    const _nOutro = new Set(_campos.filter(c => c.grupo === 'outro').map(c => c.label)).size;
    // Autodeclaração declarada no Perfil mas sem opção equivalente neste portal → você escolhe à mão.
    const _selPend = [...new Set(_selPendentes)];
    const rodapeHTML = _respondido
      ? `<b style="color:#1A6840;">✓ Preenchi ${_esc(_feito || 'o que reconheci')}.</b> `
        + (_nOutro ? `Faltam <b>${_nOutro}</b> ${_nOutro === 1 ? 'campo' : 'campos'} que só você informa (CPF, datas, etc.). ` : '')
        + (_selPend.length ? `Não achei a opção equivalente para <b>${_esc(_selPend.join(', '))}</b> aqui — escolha à mão. ` : '')
        + 'Revise e envie.' + _habTxt
      : `${_esc(rodape)} <b style="color:#1A3A5C;">Você revisa e envia.</b>`;

    const _diagTxt = _formatarDiag(_diagnostico());
    // Console: registra 1× por mudança (ajuda quando o DevTools está aberto; não polui).
    if (_diagTxt !== _lastDiagSig) {
      _lastDiagSig = _diagTxt;
      try { console.log('%c[SENOVA DIAG]', 'color:#C9A84C;font-weight:700', '\n' + _diagTxt); } catch (_) {}
    }
    // Bloco visível: aberto automaticamente quando NÃO há campos para preencher (o caso que falha).
    const _leuNada = _campos.length === 0;
    const diagHTML = `
      <details ${_leuNada ? 'open' : ''} style="margin-top:11px;border-top:1px solid #E5ECF2;padding-top:9px;">
        <summary style="cursor:pointer;font-size:11px;font-weight:700;letter-spacing:0.03em;color:#98989D;">Diagnóstico Senova${_leuNada ? ' — não achei campos' : ''}</summary>
        <pre id="snv-cop-diagtxt" style="margin:8px 0 0;padding:9px 11px;background:#0F2236;color:#CFE0F0;border-radius:7px;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,Consolas,monospace;">${_esc(_diagTxt)}</pre>
        <button id="snv-cop-copiardiag" style="width:100%;margin-top:7px;background:#2E6DA4;color:#fff;border:none;border-radius:7px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Copiar para enviar ao Bruno</button>
      </details>`;

    const _html = `
      ${scoreHTML}
      <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#98989D;margin-bottom:4px;">O que esta vaga pede</div>
      ${linhas}
      ${btnHTML}
      ${btnCvHTML}
      ${btnCandHTML}
      <div style="margin-top:12px;padding:9px 11px;background:#F0F4F8;border-radius:7px;font-size:12.5px;color:#3A4A5A;line-height:1.55;">
        ${rodapeHTML}
      </div>
      ${diagHTML}`;

    // Anti-pisca: formulários que mudam o DOM o tempo todo fazem o observer chamar isto a cada
    // 0,4s. Se o conteúdo é idêntico, NÃO re-renderiza — senão o painel "pula" e o <details> do
    // diagnóstico fecha sozinho, impossível de abrir/copiar. Re-renderiza só quando algo muda.
    if (corpo._snvHTML === _html) return;
    corpo._snvHTML = _html;
    corpo.innerHTML = _html;

    const bp = document.getElementById('snv-cop-preencher');
    if (bp) bp.addEventListener('click', _preencher);
    const bcv = document.getElementById('snv-cop-cv');
    if (bcv) bcv.addEventListener('click', _baixarCV);
    const bc = document.getElementById('snv-cop-candidatei');
    if (bc) bc.addEventListener('click', _marcarCandidatei);
    const bn = document.getElementById('snv-cop-naoenviei');
    if (bn) bn.addEventListener('click', _desfazerCandidatura);
    const bcd = document.getElementById('snv-cop-copiardiag');
    if (bcd) bcd.addEventListener('click', () => _copiarDiag(bcd, _diagTxt));
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
    // "Form aberto" pelo container <form>/dialog (estrito): numa /thanks sem <form> a checagem
    // segue para a confirmação. Não usar a coleta com fallback aqui — um input residual de
    // "referência" na página de obrigado pareceria form aberto e travaria a auto-detecção.
    if (_acharContainerCandidatura()) {
      _viuForm = true;
      // Persiste "vi o formulário desta vaga" — sobrevive à navegação para a página de "obrigado"
      // (portais como Teamtailor enviam e redirecionam para outra URL, zerando o estado em memória).
      try { chrome.storage.local.set({ senova_form_visto: { jobId: an.jobId, ts: Date.now() } }); } catch (_) {}
      return; // ainda há formulário aberto
    }
    if (!_temConfirmacaoEnvio()) return;
    if (_viuForm) { _autoMarcarCandidatura(); return; } // confirmação na MESMA página (SPA)
    // Confirmação numa página NOVA (ex.: /thanks): só marca se vimos o form DESTA vaga há pouco —
    // jobId-scoped + janela de 45min evita falso positivo ao cair numa página de obrigado qualquer.
    try {
      chrome.storage.local.get('senova_form_visto').then(s => {
        const fv = s.senova_form_visto;
        if (fv && fv.jobId === an.jobId && (Date.now() - fv.ts) < 45 * 60 * 1000) _autoMarcarCandidatura();
      }).catch(() => {});
    } catch (_) {}
  }

  async function _autoMarcarCandidatura() {
    if (_candidatado) return;
    const an = _copilotoAnalise || {};
    if (!an.jobId) return;
    _candidatado = true; // trava otimista — não repete
    let res = null;
    try { res = await chrome.runtime.sendMessage({ type: 'COPILOTO_CANDIDATEI', jobId: an.jobId }); } catch (_) {}
    if (res && res.ok) { try { chrome.storage.local.remove('senova_form_visto'); } catch (_) {} _atualizarCorpo(); }
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
    // Limpa o marcador persistente: sem isto, um re-scan na página de "obrigado" re-marcaria
    // a candidatura e desfaria o "Não enviei" do usuário.
    try { chrome.storage.local.remove('senova_form_visto'); } catch (_) {}
    _atualizarCorpo();
  }

  // Preenche o formulário para revisão: dados fixos (Cartão) + respostas das perguntas abertas
  // (perfil + IA). Pausa o observer durante o preenchimento. NUNCA envia — só preenche.
  // ── HABILIDADES (chips de múltipla escolha, ex.: Gupy "Escolha até N") ───────────────
  // Escolher habilidades do próprio CV para destacar é decisão PROFISSIONAL (não dado sensível):
  // o copiloto seleciona as mais aderentes (IA) e Marcos revisa. NUNCA envia.
  const _ACAO_BTN = /enviar|submit|pr[oó]xim|continuar|avan[çc]ar|voltar|cancelar|salvar|anexar|upload|adicionar\s+arquivo|candidatar|fechar|sair|limpar|remover|anterior|finalizar|concluir|\bok\b/i;
  function _chipLabel(c) { return (c.innerText || '').replace(/\s+/g, ' ').replace(/\s*[+−–—×✕✓]\s*$/, '').trim(); }
  function _chipSelecionado(c) {
    if (c.getAttribute('aria-pressed') === 'true' || c.getAttribute('aria-selected') === 'true' || c.getAttribute('aria-checked') === 'true') return true;
    const cl = (typeof c.className === 'string' ? c.className : '').toLowerCase();
    return /selected|active|checked|ativo|marcad|selecionad/.test(cl);
  }
  // Acha o enunciado "Escolha até N habilidades…" + um container com vários botões-chip curtos
  // (exclui botões de AÇÃO). Conservador: só retorna se houver >=3 chips de verdade.
  function _acharChipsHabilidades() {
    const els = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,label,legend,p,span,strong,div'));
    let prompt = null;
    for (const el of els) {
      if (el.children.length > 3) continue;
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length > 10 && t.length < 220 && /habilidade|compet[êe]ncia|skill/i.test(t) && /(escolha|selecione|destaque|adicione|marque|at[ée]\s+\d)/i.test(t)) { prompt = el; break; }
    }
    if (!prompt) return null;
    const mm = (prompt.innerText || '').match(/at[ée]\s+(\d+)/i);
    const max = mm ? parseInt(mm[1]) : 3;
    const ehChip = b => {
      if (b.closest('nav,header,footer,[role=navigation],#snv-copiloto')) return false;
      if ((b.getAttribute('type') || '').toLowerCase() === 'submit') return false; // nunca um botão de envio
      const meta = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '')).toLowerCase();
      if (_ACAO_BTN.test(meta)) return false; // ação escondida em aria-label/title (innerText neutro)
      const t = _chipLabel(b);
      return t.length >= 2 && t.length <= 50 && !_ACAO_BTN.test(t);
    };
    // Sobe procurando o nível mais próximo com >=3 chips — sem chegar ao body (evita pegar a página toda).
    let cont = prompt.parentElement, chips = [];
    for (let i = 0; i < 6 && cont && cont !== document.body && cont !== document.documentElement; i++) {
      chips = Array.from(cont.querySelectorAll('button,[role="button"]')).filter(b => _visivel(b) && ehChip(b));
      if (chips.length >= 3) break;
      cont = cont.parentElement;
    }
    return chips.length >= 3 ? { max, chips } : null;
  }
  // Só clica chip cujo rótulo a IA escolheu DENTRE os que coletamos — nunca um botão de ação.
  async function _selecionarHabilidades() {
    const found = _acharChipsHabilidades();
    if (!found) return null;
    const pares = found.chips.map(c => ({ c, l: _chipLabel(c) })).filter(x => x.l);
    const labels = [...new Set(pares.map(x => x.l))];
    if (!labels.length) return null;
    const an = _copilotoAnalise || {};
    let resp = null;
    try { resp = await chrome.runtime.sendMessage({ type: 'COPILOTO_HABILIDADES', skills: labels, cargo: an.cargo || '', empresa: an.empresa || '', max: found.max }); } catch (_) {}
    if (!resp || resp.erro || typeof resp !== 'string') return null;
    const labelsLower = labels.map(l => l.toLowerCase());
    // Só aceita linhas que SÃO um rótulo coletado (igualdade exata) — descarta prosa/lixo da IA e
    // impede clicar qualquer coisa que não seja um chip que nós mesmos listamos. Sem includes frouxo.
    const escolhidas = resp.split('\n')
      .map(s => s.replace(/^[-•*\d.\)\s]+/, '').trim().toLowerCase())
      .filter(nome => labelsLower.includes(nome));
    const feitas = [], usados = new Set();
    for (const alvo of escolhidas) {
      if (feitas.length >= found.max) break;
      const hit = pares.find(x => !usados.has(x.c) && x.l.toLowerCase() === alvo);
      if (hit && !_chipSelecionado(hit.c)) { usados.add(hit.c); try { hit.c.click(); feitas.push(hit.l); } catch (_) {} }
    }
    return feitas.length ? feitas : null;
  }

  async function _preencher() {
    const btn = document.getElementById('snv-cop-preencher');
    const campos = _coletarCampos();
    const pessoais = campos.filter(c => c.grupo === 'pessoal' && c.chave && c.el && !c.el.value.trim());
    const perguntas = campos.filter(c => c.grupo === 'pergunta' && c.el && !c.el.value.trim());
    const selecoes = campos.filter(c => c.grupo === 'selecao' && c.chave && c.el && _seleVazia(c.el));
    if (!pessoais.length && !perguntas.length && !selecoes.length) {
      // Nunca falhar calado: o botão apareceu, mas no clique não há nada vazio a preencher.
      if (btn) { btn.style.background = '#9C5800'; btn.textContent = 'Nada vazio para preencher aqui'; setTimeout(() => _atualizarCorpo(), 2200); }
      return;
    }
    _preenchendo = true;
    _habilidadesSel = null;
    _selFeitas = []; _selPendentes = [];
    if (_copilotoObserver) _copilotoObserver.disconnect();
    const an = _copilotoAnalise || {};
    let algum = false, erroMsg = '';
    const _falha = e => e === 'app_fechado' ? 'Abra o Senova numa aba e tente de novo'
                      : e === 'sem_funcao' ? 'Recarregue o Senova (Ctrl+Shift+R)'
                      : 'Não consegui agora — tente de novo';

    // Cartão (dados fixos + autodeclaração autorizada): buscado UMA vez, reusado nas etapas 1 e 3.
    let cartao = null;
    if (pessoais.length || selecoes.length) {
      if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Preenchendo seus dados…'; }
      try { cartao = await chrome.runtime.sendMessage({ type: 'COPILOTO_CARTAO' }); } catch (_) {}
      if (cartao && cartao.erro) erroMsg = _falha(cartao.erro);
      // Resposta vazia (null): o app não respondeu. NÃO confundir com "preencheu nada" — avisa em
      // vez de silenciar (causa comum: aba do Senova fechada ou recém-recarregada).
      else if (!cartao) erroMsg = 'Abra o Senova numa aba e recarregue esta página (Ctrl+Shift+R)';
    }

    // 1) Dados fixos (Cartão de candidatura)
    if (!erroMsg && pessoais.length) {
      for (const c of pessoais) {
        const v = cartao[c.chave];
        if (v) { _preencherCampo(c.el, v); algum = true; }
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

    // 3) Autodeclaração (gênero/raça/orientação) — marca a opção do portal equivalente à escolha do
    // Perfil. Nunca infere outra categoria; sem correspondência segura, deixa em branco e avisa.
    if (!erroMsg && selecoes.length && cartao) {
      if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Conferindo autodeclaração…'; }
      for (const c of selecoes) {
        const canon = cartao[c.chave];
        if (!canon) continue; // "prefiro não informar" / não autorizado — não mexe, não cobra
        let fez = false;
        try { fez = _preencherSelecao(c.el, c.chave, canon, cartao.racaNegro); } catch (_) {}
        if (fez) { algum = true; _selFeitas.push(c.label); } else _selPendentes.push(c.label);
      }
    }

    // 4) Habilidades (chips de múltipla escolha) — auto-seleciona as mais relevantes para revisão.
    if (!erroMsg) {
      if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; btn.textContent = 'Selecionando habilidades…'; }
      try { const h = await _selecionarHabilidades(); if (h && h.length) { algum = true; _habilidadesSel = h; } } catch (_) {}
    }

    _preenchendo = false;
    if (erroMsg) {
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.background = '#B52419'; btn.textContent = erroMsg; }
    } else if (!algum) {
      // Tentou e não preencheu NADA — jamais dizer "✓ Preenchido". Avisa e mantém o botão.
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.background = '#9C5800'; btn.textContent = 'Não consegui preencher — preencha à mão'; }
    } else {
      _respondido = algum;
      _atualizarCorpo();
    }
    if (_copilotoObserver) _copilotoObserver.observe(document.body, { childList: true, subtree: true });
  }

  function injetarCopiloto(an) {
    // NÃO REBAIXAR: se já há copiloto COM card (jobId — veio do passe/LinkedIn) e chega uma análise
    // SEM card (ex.: clique no popup nesta mesma página), preserva o card — senão perde score e CV.
    if (_copilotoAnalise && _copilotoAnalise.jobId && (!an || !an.jobId) && document.getElementById('snv-copiloto')) {
      _atualizarCorpo(); return;
    }
    _copilotoAnalise = an;
    if (document.getElementById('snv-copiloto')) { _atualizarCorpo(); return; }

    const wrap = document.createElement('div');
    wrap.id = 'snv-copiloto';
    wrap.style.cssText = 'position:fixed;top:72px;right:20px;z-index:2147483647;width:300px;font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;filter:drop-shadow(0 6px 24px rgba(26,58,92,0.20));opacity:0;transition:opacity 0.25s;';
    wrap.innerHTML = `
      <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #D0D9E4;">
        <div id="snv-cop-header" title="Arraste para mover" style="background:#1A3A5C;padding:9px 12px;display:flex;align-items:center;gap:9px;cursor:move;user-select:none;">
          <div style="background:#C9A84C;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#1A3A5C;flex-shrink:0;font-family:Georgia,serif;">S</div>
          <div style="flex:1;line-height:1.15;min-width:0;">
            <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.02em;">Senova · Copiloto</div>
            <div style="color:rgba(255,255,255,0.6);font-size:10.5px;margin-top:1px;">leu esta vaga para você</div>
          </div>
          <button id="snv-cop-fechar" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:19px;padding:0 2px;line-height:1;flex-shrink:0;" title="Fechar">×</button>
        </div>
        <div id="snv-cop-corpo" style="padding:13px 14px;max-height:calc(85vh - 52px);overflow-y:auto;"></div>
      </div>`;
    document.body.appendChild(wrap);
    const _fab = document.getElementById('snv-fab'); if (_fab) _fab.remove(); // copiloto substitui o FAB
    requestAnimationFrame(() => { wrap.style.opacity = '1'; });
    document.getElementById('snv-cop-fechar').addEventListener('click', () => {
      wrap.remove();
      if (_copilotoObserver) { _copilotoObserver.disconnect(); _copilotoObserver = null; }
    });

    // Painel arrastável pela barra do título — pode estar cobrindo conteúdo importante da página.
    const _hdr = document.getElementById('snv-cop-header');
    if (_hdr) {
      let _ax = 0, _ay = 0, _arr = false;
      _hdr.addEventListener('mousedown', e => {
        if (e.target.closest('#snv-cop-fechar')) return; // o × fecha, não arrasta
        const r = wrap.getBoundingClientRect();
        wrap.style.left = r.left + 'px'; wrap.style.top = r.top + 'px'; wrap.style.right = 'auto';
        _ax = e.clientX - r.left; _ay = e.clientY - r.top; _arr = true;
        e.preventDefault();
      });
      window.addEventListener('mousemove', e => {
        if (!_arr) return;
        const maxX = Math.max(0, window.innerWidth - wrap.offsetWidth);
        const maxY = window.innerHeight - wrap.offsetHeight;
        const alvoX = e.clientX - _ax, alvoY = e.clientY - _ay;
        const x = Math.max(0, Math.min(alvoX, maxX));
        // se o painel for mais alto que a tela (maxY<0), ainda permite subir (top negativo)
        const y = maxY >= 0 ? Math.max(0, Math.min(alvoY, maxY)) : Math.min(0, Math.max(alvoY, maxY));
        wrap.style.left = x + 'px'; wrap.style.top = y + 'px';
      });
      window.addEventListener('mouseup', () => { _arr = false; });
    }

    _atualizarCorpo();
    _checarEnvioAuto(); // checa já no load — a página estática de "obrigado" pode não gerar mutação

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
      _ultimoPasse = passe || null; // instrumentação: registra o que existe (mesmo velho)
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
    }).catch(() => { _ultimoPasse = null; });
  }

  // Entrada "Por fora": o usuário chegou direto à vaga e clicou na extensão. O popup analisa a
  // vaga na hora e manda acordar o copiloto AQUI. Se houver passe FRESCO (você veio do Senova),
  // enriquece o popup com o card (jobId/score/compat) — assim não perde score/CV virando sem-card.
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'ATIVAR_COPILOTO' && msg.analise) {
      let an = msg.analise;
      if (!an.jobId && _ultimoPasse && _ultimoPasse.jobId && (Date.now() - _ultimoPasse.ts) < 45 * 60 * 1000) {
        an = Object.assign({}, an, {
          jobId: _ultimoPasse.jobId, score: _ultimoPasse.score,
          compatFortes: _ultimoPasse.compatFortes, compatAtencao: _ultimoPasse.compatAtencao,
          cargo: an.cargo || _ultimoPasse.cargo, empresa: an.empresa || _ultimoPasse.empresa
        });
      }
      try { injetarCopiloto(an); } catch (_) {}
    }
  });

})();
