const WORKER_URL = 'https://senova-proxy.marcos-mco.workers.dev';

// Função injetada no contexto da página — NÃO pode referenciar variáveis externas
function extractJobData() {
  const url = location.href;
  const host = location.hostname;
  let titulo = '', empresa = '', descricao = '';

  // LinkedIn Jobs
  if (host.includes('linkedin.com')) {
    titulo = document.querySelector(
      'h1.job-details-jobs-unified-top-card__job-title, ' +
      'h1[class*="job-title"], ' +
      '.jobs-unified-top-card__job-title h1'
    )?.innerText?.trim() || '';
    empresa = document.querySelector(
      '.job-details-jobs-unified-top-card__company-name, ' +
      '.jobs-unified-top-card__company-name, ' +
      '[class*="company-name"] a'
    )?.innerText?.trim() || '';
    descricao = document.querySelector(
      '.jobs-description__content, #job-details, [class*="description__content"]'
    )?.innerText?.trim().slice(0, 5000) || '';
  }

  // Gupy
  else if (host.includes('gupy.io') || host.includes('gupy.com')) {
    titulo = document.querySelector(
      '[data-testid="job-title"], h1[class*="JobTitle"], h1[class*="job-title"]'
    )?.innerText?.trim() || '';
    empresa = document.querySelector(
      '[data-testid="job-company-name"], [class*="CompanyName"], [class*="company-name"]'
    )?.innerText?.trim() || '';
    descricao = document.querySelector(
      '[data-testid="job-description"], [class*="JobDescription"], [class*="job-description"]'
    )?.innerText?.trim().slice(0, 5000) || '';
  }

  // Indeed
  else if (host.includes('indeed.com') || host.includes('indeed.com.br')) {
    titulo = document.querySelector(
      'h1[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title'
    )?.innerText?.trim() || '';
    empresa = document.querySelector(
      '[data-testid="inlineHeader-companyName"] a, .icl-u-lg-mr--sm'
    )?.innerText?.trim() || '';
    descricao = document.querySelector(
      '#jobDescriptionText, [id*="jobDescription"]'
    )?.innerText?.trim().slice(0, 5000) || '';
  }

  // Vagas.com.br
  else if (host.includes('vagas.com.br') || host.includes('vagas.com')) {
    titulo = document.querySelector('h1.job-shortdescription__title, h1[class*="title"]')?.innerText?.trim() || '';
    empresa = document.querySelector('[class*="company"] h2, [class*="company-name"]')?.innerText?.trim() || '';
    descricao = document.querySelector('[class*="job-description"], #vaga-description')?.innerText?.trim().slice(0, 5000) || '';
  }

  // Catho
  else if (host.includes('catho.com.br')) {
    titulo = document.querySelector('h1[class*="JobTitle"], h1[class*="job-title"]')?.innerText?.trim() || '';
    empresa = document.querySelector('[class*="CompanyName"], [class*="company-name"]')?.innerText?.trim() || '';
    descricao = document.querySelector('[class*="JobDescription"]')?.innerText?.trim().slice(0, 5000) || '';
  }

  // Inhire
  else if (host.includes('inhire.app')) {
    titulo = document.querySelector('h1')?.innerText?.trim() || '';
    empresa = document.querySelector('[class*="company-name"], [class*="CompanyName"]')?.innerText?.trim() || '';
    descricao = document.querySelector('[class*="job-description"], [class*="JobDescription"], [class*="vacancy"]')?.innerText?.trim().slice(0, 5000) || '';
  }

  // Fallback genérico — funciona em qualquer site
  if (!titulo) {
    titulo = document.querySelector('h1')?.innerText?.trim()
      || document.title.split(' - ')[0].split(' | ')[0].split(' — ')[0].trim();
  }
  if (!empresa) {
    const titleParts = document.title.split(/\s[-|—]\s/);
    empresa = titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : host.replace('www.', '');
  }
  if (!descricao) {
    const CANDIDATOS = [
      '[class*="job-description"]','[class*="jobDescription"]','[class*="JobDescription"]',
      '[class*="vacancy-description"]','[class*="position-description"]','[class*="job-detail"]',
      '[class*="job-content"]','[class*="posting-content"]',
      '[data-automation-id="jobPostingDescription"]',
      'article','[role="main"]','main','#content','.content',
    ];
    for (const sel of CANDIDATOS) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const txt = el.innerText.trim();
      if (txt.length > 300) { descricao = txt.slice(0, 5000); break; }
    }
    if (!descricao) descricao = document.body.innerText.trim().slice(0, 5000);
  }

  return { titulo, empresa, url, descricao };
}

function limparUrl(url) {
  try {
    const u = new URL(url);
    ['trackingId','refId','trk','utm_source','utm_medium','utm_campaign',
     'utm_term','utm_content','fbclid','gclid'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch { return url; }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const elTitulo  = document.getElementById('campo-titulo');
  const elEmpresa = document.getElementById('campo-empresa');
  const elUrl     = document.getElementById('campo-url');
  const elBtnSalvar = document.getElementById('btn-salvar');
  const elStatus  = document.getElementById('status-extract');
  const elMsgOk   = document.getElementById('msg-ok');
  const elMsgErro = document.getElementById('msg-erro');

  // Mostrar status de extração
  elStatus.style.display = 'block';

  let _desc = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    elUrl.value = limparUrl(tab.url || '');

    // Injetar extrator na aba ativa
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJobData,
    });

    const data = results?.[0]?.result;
    if (data) {
      elTitulo.value  = data.titulo  || '';
      elEmpresa.value = data.empresa || '';
      elUrl.value     = limparUrl(data.url || tab.url || '');
      _desc           = data.descricao || '';
    }
  } catch (e) {
    // Pode falhar em chrome://, extensões, etc — tudo bem
    elUrl.value = '';
  }

  elStatus.style.display = 'none';
  elBtnSalvar.disabled = false;

  // ── Salvar ──────────────────────────────────────────────────────────────────
  elBtnSalvar.addEventListener('click', async () => {
    const titulo  = elTitulo.value.trim();
    const empresa = elEmpresa.value.trim();
    const url     = elUrl.value.trim();

    if (!titulo) {
      elTitulo.focus();
      elTitulo.style.borderColor = '#CC0000';
      setTimeout(() => { elTitulo.style.borderColor = ''; }, 2000);
      return;
    }

    elBtnSalvar.disabled = true;
    elBtnSalvar.textContent = 'Salvando...';
    elMsgOk.style.display = 'none';
    elMsgErro.style.display = 'none';

    try {
      const resp = await fetch(`${WORKER_URL}/api/vagas-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, empresa, url, descricao: _desc }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      elMsgOk.style.display = 'block';
      elBtnSalvar.textContent = '✅ Salvo!';
    } catch (e) {
      elMsgErro.textContent = `Erro ao salvar: ${e.message}. Verifique sua conexão.`;
      elMsgErro.style.display = 'block';
      elBtnSalvar.disabled = false;
      elBtnSalvar.textContent = 'Salvar no Pipeline';
    }
  });

  // Limpar borda vermelha ao digitar
  elTitulo.addEventListener('input', () => { elTitulo.style.borderColor = ''; });
});
