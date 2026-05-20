// ══════════════════════════════════════════════════════════════════
//  SENOVA PROXY — Worker v7.3
//  Cloudflare Workers · senova-proxy.marcos-mco.workers.dev
//
//  NOVIDADES v7.3 (mai/2026):
//  · Restaura rotas OAuth Outlook + emails + calendar + whitelist
//  · Mantém varredura v7.2: rotação países, Adzuna + Jobicy
//  · Health check inclui status Outlook
// ══════════════════════════════════════════════════════════════════

const ADZUNA_PAISES = { br:'br', es:'es', de:'de', pt:'pt', us:'us' };

const JOBICY_REGIOES = {
  br:'brazil', es:'spain', de:'germany', pt:'portugal', us:'usa', remoto:null
};

const ROTACAO_PAISES = ['br','es','de','pt','remoto'];

const PERFIL_MARCOS = `
Marcos Franco, 57 anos, Curitiba/PR — Brasil.
Executivo sênior de marketing e negócios, 30 anos de experiência.
Formação: Master's Barcelona (Marketing), MBA FGV, FAAP Publicidade.
Idiomas: português nativo, inglês avançado, espanhol avançado.
Experiências:
- RPC/Globo: Diretor de Marketing (2012-2019) — 30 pessoas, 8 afiliadas, R$500mi
- Popper: Head de Expansão & Novos Negócios (2024-2025)
- Consigliere: Consultor Sênior C-Level (dez/2025-atual)
Cargos-alvo: CEO, CMO, CSO, Diretor, Head, Gerente Sênior
Pretensão: R$19-25k CLT · Aceita PJ · Aceita relocação SC
Aberto a: Brasil, Espanha, Alemanha, Portugal, remoto
`.trim();

const CONFIG_PADRAO = {
  ativa: true,
  queries: {
    pt: ['diretor marketing','CMO','head marketing','diretor comercial','VP marketing'],
    en: ['marketing director','chief marketing officer','VP marketing','head of marketing','country manager'],
    es: ['director de marketing','director comercial','CMO','director general'],
    de: ['Marketingleiter','Vertriebsdirektor','Geschäftsführer Marketing'],
  },
  locais: [
    { id:'br',     label:'Brasil',   ativo:true  },
    { id:'es',     label:'Espanha',  ativo:true  },
    { id:'de',     label:'Alemanha', ativo:true  },
    { id:'pt',     label:'Portugal', ativo:true  },
    { id:'us',     label:'EUA',      ativo:false },
    { id:'remoto', label:'Remoto',   ativo:true  },
  ],
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
};

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

function htmlResp(content, status=200) {
  return new Response(content, {
    status, headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  OUTLOOK — TOKEN KV
// ═══════════════════════════════════════════════════════════════════
async function getTokenData(env) {
  try {
    const raw = await env.SENOVA_KV.get('outlook_token');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveTokenData(env, tokenData) {
  await env.SENOVA_KV.put('outlook_token', JSON.stringify(tokenData));
}

async function getValidToken(env) {
  const data = await getTokenData(env);
  if (!data) return null;
  if (Date.now() < data.expires_at - 300000) return data.access_token;
  // Renova via refresh_token
  try {
    const res = await fetch(`https://login.microsoftonline.com/consumers/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.MS_CLIENT_ID,
        client_secret: env.MS_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: data.refresh_token,
        scope: 'Mail.Read Mail.Send Calendars.ReadWrite offline_access',
      }),
    });
    const novo = await res.json();
    if (novo.access_token) {
      await saveTokenData(env, {
        access_token: novo.access_token,
        refresh_token: novo.refresh_token || data.refresh_token,
        expires_at: Date.now() + (novo.expires_in * 1000),
      });
      return novo.access_token;
    }
  } catch {}
  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  OUTLOOK — EMAILS VISTOS
// ═══════════════════════════════════════════════════════════════════
async function getVistos(env) {
  try {
    const raw = await env.SENOVA_KV.get('emails_vistos');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

async function salvarVistos(env, ids) {
  const vistos = await getVistos(env);
  ids.forEach(id => vistos.add(id));
  await env.SENOVA_KV.put('emails_vistos', JSON.stringify([...vistos].slice(-1000)));
}

// ═══════════════════════════════════════════════════════════════════
//  WHITELIST DE DOMÍNIOS
// ═══════════════════════════════════════════════════════════════════
async function getWhitelist(env) {
  try {
    const raw = await env.SENOVA_KV.get('whitelist_dominios');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function salvarWhitelist(env, lista) {
  await env.SENOVA_KV.put('whitelist_dominios', JSON.stringify(lista));
}

// ═══════════════════════════════════════════════════════════════════
//  CLASSIFICAÇÃO DE EMAILS VIA IA
// ═══════════════════════════════════════════════════════════════════
async function classificarEmails(emails, whitelist, env) {
  if (!emails.length) return [];

  const CATEGORIAS = {
    positivo:    { label: 'Retorno positivo',      emoji: '🟢', prioridade: 1 },
    pipeline:    { label: 'Pipeline ativo',         emoji: '⭐', prioridade: 2 },
    hunter:      { label: 'Contato de headhunter',  emoji: '🎯', prioridade: 3 },
    vaga:        { label: 'Vaga nova',              emoji: '📋', prioridade: 4 },
    negativo:    { label: 'Retorno negativo',       emoji: '⚫', prioridade: 5 },
    irrelevante: { label: 'Irrelevante',            emoji: '—',  prioridade: 9 },
  };

  const resultados = [];
  for (let i = 0; i < emails.length; i += 10) {
    const lote = emails.slice(i, i + 10);
    const listaEmails = lote.map((e, idx) =>
      `[${idx}] De: ${e.from_name||e.from} | Assunto: ${e.subject} | Conteúdo: ${(e.conteudo_vaga||e.preview||'').slice(0, 400)}`
    ).join('\n');
    const wlStr = whitelist.length ? `\nWhitelist de domínios prioritários: ${whitelist.join(', ')}` : '';
    const prompt = `Você é assistente de recolocação executiva de Marcos Franco, executivo sênior de marketing de Curitiba/PR.

PERFIL: ${PERFIL_MARCOS}
${wlStr}

Classifique cada e-mail em: positivo | pipeline | hunter | vaga | negativo | irrelevante
Responda APENAS em JSON: {"resultados":[{"indice":0,"categoria":"positivo","resumo":"resumo em 1 linha"},...]}

E-MAILS:
${listaEmails}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:800, messages:[{role:'user',content:prompt}] }),
      });
      const data = await res.json();
      const texto = data.content?.[0]?.text || '';
      const parsed = JSON.parse(texto.replace(/```json|```/g,'').trim());
      parsed.resultados.forEach(r => {
        const email = lote[r.indice];
        if (!email) return;
        const cat = CATEGORIAS[r.categoria] || CATEGORIAS.irrelevante;
        resultados.push({ ...email, categoria:r.categoria, label:cat.label, emoji:cat.emoji, prioridade:cat.prioridade, resumo:r.resumo });
      });
    } catch {
      lote.forEach(e => resultados.push({ ...e, categoria:'irrelevante', label:'Irrelevante', emoji:'—', prioridade:9, resumo:'' }));
    }
  }

  return resultados.filter(e => e.categoria !== 'irrelevante').sort((a,b) => a.prioridade - b.prioridade);
}

// ═══════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default {

  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Health ──────────────────────────────────────────────────────
    if (path === '/health') {
      const token = await getValidToken(env);
      const wl = await getWhitelist(env);
      const statsHoje = await env.SENOVA_KV.get('stats_' + new Date().toISOString().slice(0,10), 'json') || { novos: 0, alertas: 0 };
      return json({
        status: 'ok', worker: 'senova-proxy', versao: '7.3',
        outlook: token ? 'conectado' : 'desconectado',
        whitelist_dominios: wl.length,
        statsHoje,
      });
    }

    // ── Claude proxy ─────────────────────────────────────────────────
    if (path === '/api/claude' && request.method === 'POST') {
      const body = await request.json();
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify(body),
      });
      return json(await resp.json(), resp.status);
    }

    // ── Análise ATS ──────────────────────────────────────────────────
    if (path === '/api/analisar-vaga' && request.method === 'POST') {
      const { titulo, empresa, descricao } = await request.json();
      return json(await analisarVaga(titulo, empresa, descricao, env));
    }

    // ── Varredura manual (próximo país da rotação) ───────────────────
    if (path === '/api/varredura-manual' && request.method === 'POST') {
      ctx.waitUntil(executarVarredura(env, false));
      return json({ status: 'Varredura iniciada', timestamp: new Date().toISOString() });
    }

    // ── Varredura manual forçando país específico ───────────────────
    if (path === '/api/varredura-pais' && request.method === 'POST') {
      const { pais } = await request.json();
      ctx.waitUntil(executarVarreduraPais(pais, env));
      return json({ status: `Varredura de ${pais} iniciada`, timestamp: new Date().toISOString() });
    }

    // ── Vagas lead ───────────────────────────────────────────────────
    if (path === '/api/vagas-lead' && request.method === 'GET') {
      const raw = await env.SENOVA_KV.get('vagas_lead');
      const vagas = raw ? JSON.parse(raw) : [];
      return json({ vagas, total: vagas.length });
    }

    if (path === '/api/vagas-lead' && request.method === 'POST') {
      const { titulo, empresa, url, descricao } = await request.json();
      if (!titulo) return json({ erro: 'titulo obrigatório' }, 400);
      const raw = await env.SENOVA_KV.get('vagas_lead');
      const vagas = raw ? JSON.parse(raw) : [];
      const novaVaga = {
        id: gerarId({ titulo, empresa: empresa || '', url: url || '' }),
        titulo: titulo.trim(),
        empresa: (empresa || '').trim(),
        local: 'Brasil',
        url: url || '',
        descricao: descricao || '',
        fonte: 'extensao_chrome',
        data: new Date().toLocaleDateString('pt-BR'),
        score_ats: 0,
        pontos_fortes: [],
        salario_compativel: null,
        badge: 'Extensão Chrome',
        criadoEm: new Date().toISOString(),
        status: 'lead',
      };
      vagas.push(novaVaga);
      await env.SENOVA_KV.put('vagas_lead', JSON.stringify(vagas));
      return json({ ok: true, id: novaVaga.id });
    }

    if (path === '/api/vagas-lead/clear' && request.method === 'POST') {
      await env.SENOVA_KV.put('vagas_lead', JSON.stringify([]));
      return json({ status: 'ok' });
    }

    if (path === '/api/vagas-lead/score' && request.method === 'POST') {
      const { id, score, classificacao, resumo, pontos_fortes, salario_compativel } = await request.json();
      const raw = await env.SENOVA_KV.get('vagas_lead');
      const vagasKV = raw ? JSON.parse(raw) : [];
      const idx = vagasKV.findIndex(v => v.id === id);
      if (idx >= 0) {
        vagasKV[idx] = { ...vagasKV[idx], score, classificacao, resumo, pontos_fortes, salario_compativel };
        await env.SENOVA_KV.put('vagas_lead', JSON.stringify(vagasKV));
      }
      return json({ status: 'ok', atualizado: idx >= 0 });
    }

    // ── Config varredura ─────────────────────────────────────────────
    if (path === '/api/config-varredura' && request.method === 'GET') {
      const raw = await env.SENOVA_KV.get('config_varredura');
      return json(raw ? JSON.parse(raw) : CONFIG_PADRAO);
    }

    if (path === '/api/config-varredura' && request.method === 'POST') {
      const nova = await request.json();
      await env.SENOVA_KV.put('config_varredura', JSON.stringify(nova));
      return json({ status: 'Configuração salva' });
    }

    // ── Status varredura ─────────────────────────────────────────────
    if (path === '/api/varredura-status') {
      const raw = await env.SENOVA_KV.get('varredura_status');
      return json(raw ? JSON.parse(raw) : { nunca_executada: true });
    }

    // ── Auth Outlook — iniciar OAuth ─────────────────────────────────
    if (path === '/api/auth/outlook' && request.method === 'GET') {
      const redirectUri = env.MS_REDIRECT_URI || 'https://senova-proxy.marcos-mco.workers.dev/api/auth/callback';
      const params = new URLSearchParams({
        client_id: env.MS_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: 'Mail.Read Mail.Send Calendars.ReadWrite offline_access',
        response_mode: 'query',
        prompt: 'consent',
      });
      return Response.redirect(`https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`, 302);
    }

    // ── Auth Callback ────────────────────────────────────────────────
    if (path === '/api/auth/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) return htmlResp('<h2>Erro: código OAuth não recebido.</h2>', 400);
      const redirectUri = env.MS_REDIRECT_URI || 'https://senova-proxy.marcos-mco.workers.dev/api/auth/callback';
      const res = await fetch(`https://login.microsoftonline.com/consumers/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.MS_CLIENT_ID,
          client_secret: env.MS_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const token = await res.json();
      if (!token.access_token) {
        return htmlResp(`<h2>Erro ao obter token.</h2><pre>${JSON.stringify(token, null, 2)}</pre>`, 400);
      }
      await saveTokenData(env, {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: Date.now() + (token.expires_in * 1000),
      });
      return htmlResp(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#F7F5F0;}.box{background:#fff;border-radius:14px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1);}.icon{font-size:48px;margin-bottom:16px;}.title{font-size:22px;font-weight:700;color:#1A3A5C;margin-bottom:8px;}.sub{color:#8A8680;font-size:14px;}</style></head><body><div class="box"><div class="icon">✅</div><div class="title">Outlook conectado!</div><div class="sub">Feche esta janela e volte ao Senova.</div></div></body></html>`);
    }

    // ── Desconectar Outlook ──────────────────────────────────────────
    if (path === '/api/auth/outlook' && request.method === 'DELETE') {
      await env.SENOVA_KV.delete('outlook_token');
      return json({ ok: true, mensagem: 'Outlook desconectado.' });
    }

    // ── Buscar e-mails ───────────────────────────────────────────────
    if (path === '/api/emails' && request.method === 'GET') {
      const token = await getValidToken(env);
      if (!token) {
        const base = env.MS_REDIRECT_URI?.replace('/api/auth/callback','') || 'https://senova-proxy.marcos-mco.workers.dev';
        return json({ erro: 'Outlook não conectado.', reauth: true, url_auth: base + '/api/auth/outlook' }, 401);
      }
      const limite = parseInt(url.searchParams.get('limite') || '50');
      const apenasNovos = url.searchParams.get('apenas_novos') !== 'false';

      const msRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${limite}&$filter=isRead eq false&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,body`,
        { headers: { Authorization: `Bearer ${token}`, 'Prefer': 'outlook.body-content-type="text"' } }
      );
      if (!msRes.ok) {
        const err = await msRes.json();
        return json({ erro: 'Erro ao buscar emails', detalhes: err }, 502);
      }
      const msData = await msRes.json();
      const emails = (msData.value || []).map(e => {
        const corpo = e.body?.content || e.bodyPreview || '';
        const links = [...corpo.matchAll(/https?:\/\/[^\s"'<>)]+/g)]
          .map(m => m[0])
          .filter(l => !l.includes('unsubscribe') && !l.includes('optout') && !l.includes('tracking'))
          .slice(0, 5);
        return {
          id: e.id, subject: e.subject || '(sem assunto)',
          from: e.from?.emailAddress?.address || '',
          from_name: e.from?.emailAddress?.name || '',
          date: e.receivedDateTime,
          preview: (e.bodyPreview || '').slice(0, 300),
          body: corpo.slice(0, 2000), links, is_read: e.isRead,
        };
      });

      const vistos = await getVistos(env);
      const novos = apenasNovos ? emails.filter(e => !vistos.has(e.id)) : emails;

      if (!novos.length) {
        return json({ emails: [], total_lidos: emails.length, total_novos: 0, whitelist: await getWhitelist(env) });
      }

      const novosComConteudo = await Promise.all(novos.map(async (e) => {
        const isVagaEmail = /linkedin\.com\/jobs|gupy|greenhouse|lever|workday|jobscore|indeed|vagas|emprego|job|career|oportunidade/i.test(e.from + e.subject + e.body);
        if (isVagaEmail && e.links.length > 0) {
          const linkVaga = e.links.find(l => /gupy\.io|greenhouse\.io|lever\.co|workday|jobscore|jobs\./i.test(l));
          if (linkVaga) {
            try {
              const r = await fetch(linkVaga, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SenovaBot/1.0)' },
                redirect: 'follow', signal: AbortSignal.timeout(5000),
              });
              if (r.ok) {
                const html = await r.text();
                const texto = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0, 3000);
                return { ...e, conteudo_vaga: texto, link_vaga: linkVaga };
              }
            } catch {}
          }
          return { ...e, conteudo_vaga: e.body || e.preview, link_vaga: e.links[0] || '' };
        }
        return { ...e, conteudo_vaga: e.body || e.preview, link_vaga: e.links[0] || '' };
      }));

      const whitelist = await getWhitelist(env);
      const classificados = await classificarEmails(novosComConteudo, whitelist, env);
      await salvarVistos(env, novos.map(e => e.id));

      // Marcar como lido no Outlook após processar
      await Promise.allSettled(novos.map(e =>
        fetch(`https://graph.microsoft.com/v1.0/me/messages/${e.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        })
      ));

      // Stats do dia no KV
      const isAlertaFn = e => { const f = (e.from || '').toLowerCase(); return f.includes('googlealerts-noreply') || f.includes('google-alerts'); };
      const totalAlertas = classificados.filter(isAlertaFn).length;
      const totalNovos = classificados.filter(e => e.categoria !== 'irrelevante' && !isAlertaFn(e)).length;
      const hoje = new Date().toISOString().slice(0, 10);
      const statsKey = 'stats_' + hoje;
      const statsAtuais = await env.SENOVA_KV.get(statsKey, 'json') || { novos: 0, alertas: 0 };
      statsAtuais.novos = Math.max(statsAtuais.novos, totalNovos);
      statsAtuais.alertas = Math.max(statsAtuais.alertas, totalAlertas);
      await env.SENOVA_KV.put(statsKey, JSON.stringify(statsAtuais), { expirationTtl: 86400 });

      return json({
        emails: classificados, total_lidos: emails.length,
        total_novos: novos.length, total_relevantes: classificados.length, whitelist,
      });
    }

    // ── Marcar emails como vistos ────────────────────────────────────
    if (path === '/api/emails/marcar-visto' && request.method === 'POST') {
      const { ids } = await request.json();
      if (!Array.isArray(ids)) return json({ erro: 'ids deve ser array' }, 400);
      await salvarVistos(env, ids);
      return json({ ok: true, marcados: ids.length });
    }

    // ── Limpar histórico de vistos ───────────────────────────────────
    if (path === '/api/emails/limpar-vistos' && (request.method === 'DELETE' || request.method === 'GET')) {
      await env.SENOVA_KV.delete('emails_vistos');
      return json({ ok: true, mensagem: 'Histórico limpo.' });
    }

    // ── Responder email via Outlook ──────────────────────────────────
    if (path === '/api/emails/responder' && request.method === 'POST') {
      const token = await getValidToken(env);
      if (!token) {
        const base = env.MS_REDIRECT_URI?.replace('/api/auth/callback','') || 'https://senova-proxy.marcos-mco.workers.dev';
        return json({ erro: 'Outlook não conectado.', reauth: true, url_auth: base + '/api/auth/outlook' }, 401);
      }
      const { messageId, comentario } = await request.json();
      if (!messageId || !comentario) return json({ erro: 'messageId e comentario obrigatórios' }, 400);
      const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comentario }),
      });
      if (!res.ok) return json({ erro: 'Erro ao enviar resposta', detalhe: await res.json().catch(()=>({})) }, res.status);
      return json({ ok: true });
    }

    // ── Enviar email (candidatura) via Outlook ───────────────────────
    if (path === '/api/emails/enviar' && request.method === 'POST') {
      const token = await getValidToken(env);
      if (!token) {
        const base = env.MS_REDIRECT_URI?.replace('/api/auth/callback','') || 'https://senova-proxy.marcos-mco.workers.dev';
        return json({ erro: 'Outlook não conectado.', reauth: true, url_auth: base + '/api/auth/outlook' }, 401);
      }
      const { para, assunto, corpo } = await request.json();
      if (!para || !assunto || !corpo) return json({ erro: 'para, assunto e corpo obrigatórios' }, 400);
      const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: assunto,
            body: { contentType: 'Text', content: corpo },
            toRecipients: [{ emailAddress: { address: para } }],
          },
          saveToSentItems: true,
        }),
      });
      if (!res.ok) return json({ erro: 'Erro ao enviar email', detalhe: await res.json().catch(()=>({})) }, res.status);
      return json({ ok: true });
    }

    // ── Calendar — criar evento ──────────────────────────────────────
    if (path === '/api/calendar/evento' && request.method === 'POST') {
      const token = await getValidToken(env);
      if (!token) {
        const base = env.MS_REDIRECT_URI?.replace('/api/auth/callback','') || 'https://senova-proxy.marcos-mco.workers.dev';
        return json({ erro: 'Outlook não conectado.', reauth: true, url_auth: base + '/api/auth/outlook' }, 401);
      }
      const { titulo, data } = await request.json();
      if (!titulo || !data) return json({ erro: 'titulo e data obrigatórios' }, 400);
      const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: titulo,
          start: { dateTime: `${data}T09:00:00`, timeZone: 'America/Sao_Paulo' },
          end:   { dateTime: `${data}T09:30:00`, timeZone: 'America/Sao_Paulo' },
          isReminderOn: true, reminderMinutesBeforeStart: 30,
        }),
      });
      if (!res.ok) return json({ erro: 'Erro ao criar evento', detalhe: await res.json().catch(()=>({})) }, res.status);
      const criado = await res.json();
      return json({ ok: true, id: criado.id });
    }

    // ── Whitelist de domínios ────────────────────────────────────────
    if (path === '/api/whitelist' && request.method === 'GET') {
      return json({ dominios: await getWhitelist(env) });
    }
    if (path === '/api/whitelist' && request.method === 'POST') {
      const { dominio } = await request.json();
      if (!dominio) return json({ erro: 'dominio obrigatório' }, 400);
      const lista = await getWhitelist(env);
      const dom = dominio.toLowerCase().trim();
      if (!lista.includes(dom)) { lista.push(dom); await salvarWhitelist(env, lista); }
      return json({ ok: true, dominios: lista });
    }
    if (path === '/api/whitelist' && request.method === 'DELETE') {
      const { dominio } = await request.json();
      const lista = (await getWhitelist(env)).filter(d => d !== dominio?.toLowerCase().trim());
      await salvarWhitelist(env, lista);
      return json({ ok: true, dominios: lista });
    }

    if (path === '/api/sinais-mercado' && request.method === 'GET') {
      const hoje = new Date().toISOString().slice(0, 10);
      const cacheKey = `sinais_mercado_${hoje}`;
      const cached = await env.SENOVA_KV.get(cacheKey);
      if (cached) return json(JSON.parse(cached));
      const resultado = await buscarSinaisMercado(env);
      await env.SENOVA_KV.put(cacheKey, JSON.stringify(resultado), { expirationTtl: 86400 });
      return json(resultado);
    }

    if (path === '/api/fetch-descricao' && request.method === 'POST') {
      const { url } = await request.json();
      if (!url || !url.startsWith('http')) return json({ error: 'URL inválida' }, 400);
      try {
        const pageRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
          signal: AbortSignal.timeout(8000),
        });
        if (!pageRes.ok) return json({ error: `HTTP ${pageRes.status}` }, 502);
        const html = await pageRes.text();
        // Remove blocos não relevantes
        const stripped = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '')
          .replace(/\s{2,}/g, ' ').trim();
        const descricao = stripped.slice(0, 4000);
        if (descricao.length < 200) return json({ error: 'Conteúdo insuficiente na URL' }, 422);
        return json({ descricao });
      } catch (e) {
        return json({ error: 'Erro ao buscar URL: ' + (e.message||'timeout') }, 502);
      }
    }

    return json({ erro: 'Rota não encontrada' }, 404);
  },

  // Cron: "0 10 * * *" = 07:00 BRT
  async scheduled(event, env, ctx) {
    ctx.waitUntil(executarVarredura(env, true));
  },
};

// ═══════════════════════════════════════════════════════════════════
//  VARREDURA COM ROTAÇÃO DE PAÍSES
// ═══════════════════════════════════════════════════════════════════
async function executarVarredura(env, isCron) {
  const rawIdx = await env.SENOVA_KV.get('rotacao_idx');
  let idx = rawIdx ? parseInt(rawIdx) : 0;

  const rawConfig = await env.SENOVA_KV.get('config_varredura');
  const config = rawConfig ? JSON.parse(rawConfig) : CONFIG_PADRAO;

  if (!config.ativa) {
    await salvarStatus(env, { ativa: false, msg: 'Varredura desativada' });
    return;
  }

  const locaisAtivos = (config.locais || CONFIG_PADRAO.locais).filter(l => l.ativo);
  if (locaisAtivos.length === 0) return;

  const localAtual = locaisAtivos[idx % locaisAtivos.length];
  await env.SENOVA_KV.put('rotacao_idx', String((idx + 1) % locaisAtivos.length));
  await executarVarreduraPais(localAtual.id, env, config);
}

async function executarVarreduraPais(paisId, env, config) {
  const inicio = Date.now();
  const log = [];
  let totalNovas = 0;

  try {
    if (!config) {
      const raw = await env.SENOVA_KV.get('config_varredura');
      config = raw ? JSON.parse(raw) : CONFIG_PADRAO;
    }

    const locaisConfig = config.locais || CONFIG_PADRAO.locais;
    const local = locaisConfig.find(l => l.id === paisId) || { id: paisId, label: paisId };

    const rawVistos = await env.SENOVA_KV.get('vagas_vistas_ids');
    const vistosSet = new Set(rawVistos ? JSON.parse(rawVistos) : []);

    const rawLead = await env.SENOVA_KV.get('vagas_lead');
    const vagasLead = rawLead ? JSON.parse(rawLead) : [];

    const idioma = idiomaDoLocal(paisId);
    const queries = (config.queries?.[idioma] || CONFIG_PADRAO.queries[idioma] || []).slice(0, 3);

    for (const query of queries) {
      if (paisId !== 'remoto' && ADZUNA_PAISES[paisId]) {
        try {
          const vagas = await buscarAdzuna(query, local, env);
          const novas = processarVagas(vagas, vistosSet, vagasLead, local, 'Adzuna');
          totalNovas += novas;
          log.push(`✅ Adzuna ${local.label} / "${query}" — ${vagas.length} vagas, ${novas} novas`);
        } catch (err) {
          log.push(`⚠️ Adzuna ${local.label} / "${query}" — ${err.message}`);
        }
      }
      try {
        const vagas = await buscarJobicy(query, local);
        const novas = processarVagas(vagas, vistosSet, vagasLead, local, 'Jobicy');
        totalNovas += novas;
        log.push(`✅ Jobicy ${local.label} / "${query}" — ${vagas.length} vagas, ${novas} novas`);
      } catch (err) {
        log.push(`⚠️ Jobicy ${local.label} / "${query}" — ${err.message}`);
      }
    }

    await env.SENOVA_KV.put('vagas_vistas_ids', JSON.stringify([...vistosSet].slice(-2000)));
    await env.SENOVA_KV.put('vagas_lead',
      JSON.stringify(vagasLead.sort((a,b) => b.score - a.score).slice(0, 100))
    );
    await salvarStatus(env, {
      ultima_execucao: new Date().toISOString(),
      pais_varrido: local.label,
      duracao_ms: Date.now() - inicio,
      total_novas: totalNovas,
      log, status: 'ok',
    });

  } catch (err) {
    await salvarStatus(env, {
      ultima_execucao: new Date().toISOString(),
      pais_varrido: paisId,
      status: 'erro', erro: err.message, log,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PROCESSAR VAGAS — filtra duplicatas, salva brutas (sem Claude)
// ═══════════════════════════════════════════════════════════════════
function processarVagas(vagas, vistosSet, vagasLead, local, fonte) {
  let novas = 0;
  for (const vaga of vagas.slice(0, 5)) {
    const id = gerarId(vaga);
    if (vistosSet.has(id)) continue;
    vistosSet.add(id);
    if (!tituloRelevante(vaga.titulo)) continue;
    vagasLead.push(montarCard(vaga, local, fonte));
    novas++;
  }
  return novas;
}

function tituloRelevante(titulo) {
  if (!titulo) return false;
  const t = titulo.toLowerCase();
  const relevantes = [
    'diretor','director','diretora','head','chief','cmo','ceo','cso','vp ',
    'gerente','manager','marketing','comercial','negócios','negocios',
    'expansão','expansao','regional','country','general'
  ];
  return relevantes.some(r => t.includes(r));
}

// ═══════════════════════════════════════════════════════════════════
//  ADZUNA API
// ═══════════════════════════════════════════════════════════════════
async function buscarAdzuna(query, local, env) {
  const appId  = env.ADZUNA_APP_ID;
  const appKey = env.ADZUNA_APP_KEY;
  const pais   = ADZUNA_PAISES[local.id];

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey, results_per_page: '5',
    what: query, sort_by: 'date', max_days_old: '3',
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${pais}/search/1?${params}`;
  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Adzuna HTTP ${resp.status}`);
  const data = await resp.json();
  return (data.results || []).map(r => ({
    titulo: r.title || '', empresa: r.company?.display_name || local.label,
    url: r.redirect_url || '', descricao: r.description || '',
    local: r.location?.display_name || local.label, pubDate: r.created || '',
  })).filter(v => v.titulo && v.url);
}

// ═══════════════════════════════════════════════════════════════════
//  JOBICY RSS
// ═══════════════════════════════════════════════════════════════════
async function buscarJobicy(query, local) {
  const regiao = JOBICY_REGIOES[local.id];
  const params = new URLSearchParams({ feed:'job_feed', job_categories:'management', search_keywords:query });
  if (regiao) params.set('search_region', regiao);
  const resp = await fetch(`https://jobicy.com/?${params}`, {
    headers: { 'User-Agent':'Mozilla/5.0 (compatible; SenovaBot/1.0)', 'Accept':'text/xml' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return [];
  return parsearRSS(await resp.text(), 'Jobicy', local);
}

// ═══════════════════════════════════════════════════════════════════
//  PARSER RSS
// ═══════════════════════════════════════════════════════════════════
function parsearRSS(xml, fonte, local) {
  const vagas = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const item of items.slice(0, 8)) {
    const titulo    = extrairTag(item, 'title') || '';
    const url       = extrairTag(item, 'link') || extrairTag(item, 'guid') || '';
    const empresa   = extrairTag(item, 'source') || extrairTag(item, 'author') || local.label;
    const descricao = limparHtml(extrairTag(item, 'description') || '').slice(0, 600);
    const pubDate   = extrairTag(item, 'pubDate') || '';
    if (pubDate && !vagaRecente(pubDate)) continue;
    if (titulo && url) vagas.push({ titulo, empresa, url, descricao, pubDate });
  }
  return vagas;
}

function extrairTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
         || xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

function limparHtml(h) {
  return h.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
          .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
}

function vagaRecente(d) {
  try { return Date.now() - new Date(d).getTime() < 3*24*60*60*1000; } catch { return true; }
}

// ═══════════════════════════════════════════════════════════════════
//  ANÁLISE ATS via Claude
// ═══════════════════════════════════════════════════════════════════
async function analisarVaga(titulo, empresa, descricao, env) {
  const prompt = `Analise compatibilidade vaga×candidato. Responda APENAS JSON sem markdown.

CANDIDATO: ${PERFIL_MARCOS}

VAGA: ${titulo} | ${empresa || ''} | ${(descricao||'').slice(0,1500)}

JSON: {"score":(0-100),"classificacao":("candidatar"|"analisar"|"recusar"),"resumo":"2 linhas","pontos_fortes":["p1","p2"],"pontos_atencao":["p1"],"salario_compativel":(true|false),"localizacao":"cidade/estado extraído ou ''","modelo":("hibrido"|"remoto"|"presencial"|""),"regime":("CLT"|"PJ"|"ambos"|"")}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:500, messages:[{role:'user',content:prompt}] }),
    });
    const data = await resp.json();
    return JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim());
  } catch {
    return { score:50, classificacao:'analisar', resumo:'Revisar manualmente.', pontos_fortes:[], pontos_atencao:[], salario_compativel:true, localizacao:'', modelo:'', regime:'' };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════
function montarCard(vaga, local, fonte) {
  return {
    id: gerarId(vaga), titulo: vaga.titulo, empresa: vaga.empresa,
    local: vaga.local || local.label, url: vaga.url, fonte,
    descricao: (vaga.descricao||'').slice(0,500),
    score: null, classificacao: null, resumo: null,
    pontos_fortes: [], salario_compativel: null,
    badge: 'Nova hoje', criadoEm: new Date().toISOString(), status: 'lead',
  };
}

function gerarId(vaga) {
  const base = `${vaga.titulo}|${vaga.empresa}|${vaga.url}`;
  let h = 0;
  for (let i=0; i<base.length; i++) { h=((h<<5)-h)+base.charCodeAt(i); h|=0; }
  return `vaga_${Math.abs(h)}`;
}

function idiomaDoLocal(id) {
  return {br:'pt',pt:'pt',es:'es',de:'de',us:'en',remoto:'en'}[id]||'en';
}

async function salvarStatus(env, s) {
  await env.SENOVA_KV.put('varredura_status', JSON.stringify(s));
}

// ═══════════════════════════════════════════════════════════════════
//  SINAIS DE MERCADO — Google News RSS + IA
// ═══════════════════════════════════════════════════════════════════
const QUERIES_SINAIS = [
  'diretor marketing nomeado Brasil',
  'CEO CMO contratado Brasil',
  'expansão empresa mídia publicidade Brasil',
  'fusão aquisição comunicação marketing',
];
const KEYWORDS_SINAL = ['saiu','novo ceo','nomeou','contratou','expansão','fusão','reestruturação','demitiu','lançou','cresce','adquiriu'];

async function buscarGoogleNewsRSS(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SenovaBot/1.0)', 'Accept': 'application/rss+xml,text/xml' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });
    if (!resp.ok) return [];
    return parsearRSS(await resp.text(), 'GoogleNews', { label: 'Brasil' });
  } catch { return []; }
}

async function buscarSinaisMercado(env) {
  const resultados = await Promise.allSettled(QUERIES_SINAIS.map(q => buscarGoogleNewsRSS(q)));
  const itens = []; let rssOk = false;
  for (const r of resultados) {
    if (r.status === 'fulfilled' && r.value.length > 0) { rssOk = true; itens.push(...r.value); }
  }
  // dedup by title
  const vistos = new Set();
  const unicos = itens.filter(i => {
    const k = (i.titulo || '').toLowerCase().slice(0, 60);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  // keyword filter
  const relevantes = unicos.filter(i => {
    const txt = (i.titulo + ' ' + (i.descricao || '')).toLowerCase();
    return KEYWORDS_SINAL.some(kw => txt.includes(kw));
  }).slice(0, 5);

  if (!relevantes.length) return { sinais: [], status: rssOk ? 'sem_resultados' : 'rss_indisponivel', fonte: 'google_news' };
  const sinaisAnalisados = await analisarSinaisMercado(relevantes, env);

  // Enriquecer com Hunter.io — só sinais de alta relevância com domínio conhecido
  const enriched = await Promise.allSettled(
    sinaisAnalisados.map(async s => {
      if (s.relevancia >= 4 && s.dominio) {
        s.email_decisor = await buscarEmailHunter(s.dominio, env);
      }
      return s;
    })
  );
  const sinais = enriched.map(r => r.status === 'fulfilled' ? r.value : r.reason);
  return { sinais, status: 'ok', fonte: 'google_news', total: sinais.length };
}

async function buscarEmailHunter(dominio, env) {
  const cacheKey = `hunter_${dominio}`;
  const cached = await env.SENOVA_KV.get(cacheKey);
  if (cached) return JSON.parse(cached);

  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(dominio)}&api_key=${env.HUNTER_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) { await env.SENOVA_KV.put(cacheKey, 'null', { expirationTtl: 86400 * 7 }); return null; }
    const data = await resp.json();
    const emails = (data?.data?.emails || []).filter(e => e.type === 'personal' && e.value);
    const prioridades = ['marketing','cmo','chief marketing','commercial','comercial','ceo','presidente','diretor','head','rh','recursos humanos','talent','people'];
    const ordenados = emails.sort((a, b) => {
      const posA = (a.position || '').toLowerCase();
      const posB = (b.position || '').toLowerCase();
      const rankA = prioridades.findIndex(p => posA.includes(p));
      const rankB = prioridades.findIndex(p => posB.includes(p));
      return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
    });
    const melhor = ordenados[0] || null;
    const resultado = melhor ? {
      email: melhor.value,
      nome: [melhor.first_name, melhor.last_name].filter(Boolean).join(' '),
      cargo: melhor.position || '',
    } : null;
    await env.SENOVA_KV.put(cacheKey, JSON.stringify(resultado), { expirationTtl: 86400 * 7 });
    return resultado;
  } catch { return null; }
}

async function analisarSinaisMercado(itens, env) {
  const lista = itens.map((it, i) => `[${i}] TÍTULO: ${it.titulo} | FONTE: ${it.empresa || it.local || ''}`).join('\n');
  const prompt = `Você é assistente de inteligência de mercado para Marcos Franco, executivo sênior de marketing (CMO/Diretor) buscando recolocação C-Level no Brasil.\n\nAnalise cada notícia e retorne JSON. Para cada item relevante, identifique oportunidade de networking ou candidatura.\n\nNOTÍCIAS:\n${lista}\n\nResponda SOMENTE JSON:\n{"sinais":[{"indice":0,"empresa":"...","dominio":"empresa.com.br","tipo":"movimento_exec|expansao|fusao|outro","relevancia":1-5,"resumo":"1 frase","sugestao_msg":"mensagem curta calorosa máx 2 linhas, tom executivo"}]}\n\nRegras:\n- Inclua apenas relevância ≥ 3.\n- "dominio": domínio web da empresa (ex: "globo.com", "itau.com.br"). Se não souber com certeza, use null.`;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await resp.json();
    const parsed = JSON.parse((data.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim());
    return (parsed.sinais || []).map(s => ({
      ...itens[s.indice],
      empresa: s.empresa || itens[s.indice]?.empresa || '',
      dominio: s.dominio || null,
      tipo: s.tipo || 'outro',
      relevancia: s.relevancia || 3,
      resumo: s.resumo || '',
      sugestao_msg: s.sugestao_msg || '',
    }));
  } catch { return itens.map(i => ({ ...i, dominio: null, tipo: 'outro', relevancia: 3, resumo: '', sugestao_msg: '' })); }
}
