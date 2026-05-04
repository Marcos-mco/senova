// ═══════════════════════════════════════════════════
//  SENOVA — outlook-patch v2
//  Busca token via Worker /api/auth/token (KV)
// ═══════════════════════════════════════════════════

const WORKER_URL = 'https://senova-proxy.marcos-mco.workers.dev';

window.addEventListener('load', function () {

  // Processar callback ?auth=ok — limpar URL e recarregar emails
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth') === 'ok') {
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => {
      if (typeof window.carregarEmailsHome === 'function') {
        window.carregarEmailsHome();
      }
    }, 500);
  }

  // Sobrescrever carregarEmailsHome para buscar token do Worker KV
  window.carregarEmailsHome = async function () {
    const el = document.getElementById('home-emails');
    if (!el) return;

    el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:13px;">Verificando autenticação...</div>';

    try {
      // Buscar token do Worker (que lê do KV)
      const tokenRes = await fetch(`${WORKER_URL}/api/auth/token`);

      if (!tokenRes.ok) {
        el.innerHTML = `
          <div style="padding:20px 16px;text-align:center;">
            <div style="font-size:13px;color:var(--text3);margin-bottom:12px;">Conecte seu Outlook para ver emails relevantes aqui</div>
            <a href="${WORKER_URL}/api/auth/outlook" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-flex;">
              📧 Conectar Outlook
            </a>
          </div>`;
        return;
      }

      const { access_token } = await tokenRes.json();

      el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:13px;">Buscando emails...</div>';

      const emailRes = await fetch(`${WORKER_URL}/api/emails?folder=inbox&limit=50`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });

      if (!emailRes.ok) {
        el.innerHTML = `
          <div style="padding:20px 16px;text-align:center;">
            <div style="font-size:13px;color:var(--text3);margin-bottom:12px;">Sessão expirada. Reconecte o Outlook.</div>
            <a href="${WORKER_URL}/api/auth/outlook" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-flex;">
              📧 Reconectar Outlook
            </a>
          </div>`;
        return;
      }

      const data = await emailRes.json();
      const emails = data.value || [];

      const empresasPipeline = (window.vagas || []).map(v => v.empresa.toLowerCase());
      const palavrasChave = [
        // PT
        'vaga', 'oportunidade', 'processo seletivo', 'entrevista', 'candidatura',
        'recrutador', 'headhunter', 'proposta', 'oferta', 'seleção', 'alerta de vaga',
        'alertas de vaga', 'sua candidatura', 'candidatura enviada', 'recolocação',
        'oportunidade de emprego', 'posição', 'contratação', 'currículo', 'perfil',
        // EN
        'recruiter', 'job', 'position', 'opportunity', 'hiring', 'application',
        'interview', 'offer', 'career',
        // Remetentes / plataformas
        'linkedin', 'hays', 'robert half', 'michael page', 'korn ferry',
        'heidrick', 'gupy', 'indeed', 'infojobs', 'catho', 'vagas.com',
        'pageexecutive', 'pagegroup', 'odgers', 'egon zehnder', 'spencer stuart'
      ];

      const relevantes = emails.filter(e => {
        const assunto = (e.subject || '').toLowerCase();
        const remetente = (e.from?.emailAddress?.address || '').toLowerCase();
        const preview = (e.bodyPreview || '').toLowerCase();
        return palavrasChave.some(p => assunto.includes(p) || preview.includes(p)) ||
          empresasPipeline.some(emp => assunto.includes(emp) || remetente.includes(emp));
      }).slice(0, 5);

      if (relevantes.length === 0) {
        el.innerHTML = `<div style="padding:16px;color:var(--text3);font-size:13px;">
          Nenhum email relevante encontrado.
          <a href="https://outlook.office.com/mail" target="_blank" style="color:var(--action);margin-left:8px;">Abrir Outlook →</a>
        </div>`;
        return;
      }

      el.innerHTML = relevantes.map(e => {
        const nome = e.from?.emailAddress?.name || e.from?.emailAddress?.address || 'Desconhecido';
        const inicial = nome.charAt(0).toUpperCase();
        const assunto = e.subject || '(sem assunto)';
        const dataEmail = new Date(e.receivedDateTime);
        const agora = new Date();
        const diffH = Math.floor((agora - dataEmail) / 3600000);
        const tempo = diffH < 1 ? 'agora' : diffH < 24 ? `${diffH}h atrás` :
          diffH < 48 ? 'ontem' : dataEmail.toLocaleDateString('pt-BR');
        const naoLido = !e.isRead;
        return `<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border);cursor:pointer;"
                     onclick="window.open('https://outlook.office.com/mail/inbox/id/${e.id}','_blank')">
          <div style="width:32px;height:32px;border-radius:50%;background:${naoLido ? '#DBEAFE' : 'var(--bg3)'};color:${naoLido ? '#1D4ED8' : 'var(--text3)'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${inicial}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:${naoLido ? '700' : '500'};color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${assunto}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.bodyPreview || ''}</div>
          </div>
          <div style="font-size:11px;color:var(--text3);flex-shrink:0;margin-top:2px;">${tempo}</div>
        </div>`;
      }).join('') +
        `<div style="padding:10px 16px;"><a href="https://outlook.office.com/mail" target="_blank" style="font-size:12px;color:var(--action);text-decoration:none;">Ver todos no Outlook →</a></div>`;

    } catch (e) {
      el.innerHTML = '<div style="padding:16px;color:var(--red);font-size:13px;">Erro ao carregar emails.</div>';
    }
  };

  console.log('✅ Senova Outlook patch v2 carregado');
});
