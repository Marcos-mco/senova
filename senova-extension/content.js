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

})();
