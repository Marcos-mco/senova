// ═══════════════════════════════════════════════════
//  SENOVA — PATCH: Outlook OAuth fix
//  Arquivo: outlook-patch.js
//  Substituir sessionStorage por localStorage na função carregarEmailsHome
// ═══════════════════════════════════════════════════

// Aguarda o carregamento completo do Senova e sobrescreve a função
window.addEventListener('load', function() {

  // Processar callback OAuth se vier da raiz
  const urlParams = new URLSearchParams(window.location.search);
  if(urlParams.get('auth') === 'ok') {
    // Token já foi salvo no localStorage pelo index_raiz.html
    // Apenas limpar a URL
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Sobrescrever carregarEmailsHome para usar localStorage
  window.carregarEmailsHome = async function() {
    const el = document.getElementById('home-emails');
    if(!el) return;

    const WORKER_URL = 'https://senova-proxy.marcos-mco.workers.dev';

    // Ler token do localStorage (salvo pelo index_raiz.html)
    let msToken   = localStorage.getItem('senova_ms_token');
    const msExpires = localStorage.getItem('senova_ms_expires');

    // Verificar validade
    const tokenValido = msToken && (!msExpires || Date.now() < parseInt(msExpires) - 60000);

    if(!tokenValido) {
      if(msToken) {
        // Expirado — limpar
        localStorage.removeItem('senova_ms_token');
        localStorage.removeItem('senova_ms_expires');
        localStorage.removeItem('senova_oauth_ts');
      }
      el.innerHTML = `
        <div style="padding:20px 16px;text-align:center;">
          <div style="font-size:13px;color:var(--text3);margin-bottom:12px;">Conecte seu Outlook para ver emails relevantes aqui</div>
          <a href="${WORKER_URL}/api/auth/outlook" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-flex;">
            📧 Conectar Outlook
          </a>
        </div>`;
      return;
    }

    el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:13px;">Buscando emails...</div>';

    try {
      const res = await fetch(`${WORKER_URL}/api/emails?folder=inbox&limit=30`, {
        headers: { 'Authorization': `Bearer ${msToken}` }
      });

      if(res.status === 401) {
        localStorage.removeItem('senova_ms_token');
        localStorage.removeItem('senova_ms_expires');
        el.innerHTML = `
          <div style="padding:20px 16px;text-align:center;">
            <div style="font-size:13px;color:var(--text3);margin-bottom:12px;">Sessão expirada. Reconecte o Outlook.</div>
            <a href="${WORKER_URL}/api/auth/outlook" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-flex;">
              📧 Reconectar Outlook
            </a>
          </div>`;
        return;
      }

      const data = await res.json();
      const emails = data.value || [];

      // Filtrar emails relevantes
      const empresasPipeline = (window.vagas||[]).map(v => v.empresa.toLowerCase());
      const palavrasChave = ['vaga','oportunidade','processo seletivo','entrevista','candidatura',
        'recrutador','recruiter','headhunter','proposta','oferta','job','position','opportunity',
        'hays','robert half','michael page','korn ferry','heidrick','linkedin'];

      const relevantes = emails.filter(e => {
        const assunto = (e.subject || '').toLowerCase();
        const remetente = (e.from?.emailAddress?.address || '').toLowerCase();
        const preview = (e.bodyPreview || '').toLowerCase();
        return palavrasChave.some(p => assunto.includes(p) || preview.includes(p)) ||
               empresasPipeline.some(emp => assunto.includes(emp) || remetente.includes(emp));
      }).slice(0, 5);

      if(relevantes.length === 0) {
        el.innerHTML = '<div style="padding:16px;color:var(--text3);font-size:13px;">Nenhum email relevante encontrado.</div>';
        return;
      }

      el.innerHTML = relevantes.map(e => {
        const nome = e.from?.emailAddress?.name || e.from?.emailAddress?.address || 'Desconhecido';
        const inicial = nome.charAt(0).toUpperCase();
        const assunto = e.subject || '(sem assunto)';
        const data_email = new Date(e.receivedDateTime);
        const agora = new Date();
        const diffH = Math.floor((agora - data_email) / 3600000);
        const tempo = diffH < 1 ? 'agora' : diffH < 24 ? `${diffH}h atrás` :
                      diffH < 48 ? 'ontem' : data_email.toLocaleDateString('pt-BR');
        const naoLido = !e.isRead;
        return `<div style="display:flex;align-items:flex-start;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border);cursor:pointer;"
                     onclick="window.open('https://outlook.office.com/mail/inbox/id/${e.id}','_blank')">
          <div style="width:32px;height:32px;border-radius:50%;background:${naoLido?'#DBEAFE':'var(--bg3)'};color:${naoLido?'#1D4ED8':'var(--text3)'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;">${inicial}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:${naoLido?'700':'500'};color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${assunto}</div>
          </div>
          <div style="font-size:11px;color:var(--text3);flex-shrink:0;margin-top:2px;">${tempo}</div>
        </div>`;
      }).join('') + `<div style="padding:10px 16px;"><a href="https://outlook.office.com/mail" target="_blank" style="font-size:12px;color:var(--action);text-decoration:none;">Ver todos no Outlook →</a></div>`;

    } catch(e) {
      el.innerHTML = '<div style="padding:16px;color:var(--red);font-size:13px;">Erro ao carregar emails.</div>';
    }
  };

  console.log('✅ Senova Outlook patch carregado');
});
