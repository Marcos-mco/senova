// ══════════════════════════════════════════════════════════════════
//  SENOVA PROXY — Worker v7.3
//  Cloudflare Workers · senova-proxy.marcos-mco.workers.dev
//
//  NOVIDADES v7.3 (mai/2026):
//  · Restaura rotas OAuth Outlook + emails + calendar + whitelist
//  · Mantém varredura v7.2: rotação países, Adzuna + Jobicy
//  · Health check inclui status Outlook
// ══════════════════════════════════════════════════════════════════

// ── Helpers de email ────────────────────────────────────────────────

function stripHtml(html) {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ').trim();
}

function extrairLinksEmail(conteudo) {
  const links = new Set();
  const txt = conteudo || '';
  // href de tags <a> (HTML) — mais confiável
  for (const m of txt.matchAll(/href\s*=\s*["'](https?:\/\/[^"'\s]{10,})["']/gi)) links.add(m[1]);
  // URLs no texto plano (fallback)
  for (const m of txt.matchAll(/https?:\/\/[^\s"'<>)\]}]{10,}/g)) links.add(m[0]);
  return [...links]
    .map(l => l.replace(/&amp;/g, '&').replace(/[.,;]+$/, ''))
    .filter(l => !/unsubscribe|optout|opt-out|\/comm\/feed\/|\/mynetwork\/|email\/preferences/i.test(l));
}

const JOB_URL_PATTERNS = [
  /linkedin\.com\/(?:comm\/)?jobs\/view\/\d+/i,
  /gupy\.io\/(?:job|jobs|vagas)\//i,
  /boards\.greenhouse\.io\/[^/]+\/jobs\/\d+/i,
  /(?:jobs\.)?lever\.co\/[^/]+\//i,
  /indeed\.com\/[^?]*(?:viewjob|\/job\/)/i,
  /michaelpage\.[a-z.]+\/[^?]*job/i,
  /workday(?:jobs)?\.com\/[^?]*\/job\//i,
  /\.wd\d*\.myworkdayjobs\.com/i,
  /catho\.com\.br\/emprego/i,
  /vagas\.com\.br\//i,
  /empregos\.com\.br\//i,
  /infojobs\.net\/emprego/i,
  /roberthalf\.[a-z.]+\/(jobs|emprego)/i,
  /glassdoor\.com\.br\/Vagas/i,
];

function detectarLinkVaga(links) {
  if (!links || !links.length) return '';
  // 1. LinkedIn: jobid_NUMBER no parâmetro trk de QUALQUER URL linkedin
  //    Funciona mesmo na URL do feed — só links de vaga têm jobid_
  for (const l of links) {
    const m = l.match(/jobid_(\d+)/i);
    if (m) return `https://www.linkedin.com/jobs/view/${m[1]}/`;
  }
  // 2. Padrão direto de vaga conhecida
  for (const l of links) {
    if (JOB_URL_PATTERNS.some(p => p.test(l))) {
      const lk = l.match(/linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)/i);
      return lk ? `https://www.linkedin.com/jobs/view/${lk[1]}/` : l;
    }
  }
  // 3. Google redirect (?q= ou ?url= apontando para vaga)
  for (const l of links) {
    const r = l.match(/[?&](?:q|url)=(https?[^&]+)/i);
    if (r) {
      const alvo = decodeURIComponent(r[1]);
      const jid = alvo.match(/jobid_(\d+)/i) || alvo.match(/jobs\/view\/(\d+)/i);
      if (jid) return `https://www.linkedin.com/jobs/view/${jid[1]}/`;
      if (JOB_URL_PATTERNS.some(p => p.test(alvo))) return alvo;
    }
  }
  return '';
}

function extrairArtigosGoogleAlert(html) {
  const artigos = [];
  const htmlStr = html || '';
  // Google Alerts: <a href="https://www.google.com/url?...url=ENCODED_URL...">Título</a>
  const reGoogle = /<a\s[^>]*href="https:\/\/www\.google\.com\/url\?[^"]*?url=(https?[^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of htmlStr.matchAll(reGoogle)) {
    try {
      const url = decodeURIComponent(m[1]);
      const titulo = m[2]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/&#39;/g,"'").replace(/&quot;/g,'"')
        .replace(/\s+/g,' ').trim().slice(0, 120);
      if (url && titulo.length > 4) artigos.push({ titulo, url });
    } catch {}
  }
  // Fallback: links diretos sem o redirect do Google
  if (!artigos.length) {
    const reDireto = /<a\s[^>]*href="(https?:\/\/(?!(?:www\.google|accounts\.google|policies\.google|mail\.google))[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    for (const m of htmlStr.matchAll(reDireto)) {
      const titulo = m[2].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0, 120);
      if (titulo.length > 4) artigos.push({ titulo, url: m[1] });
    }
  }
  return [...new Map(artigos.map(a => [a.url, a])).values()].slice(0, 8);
}

const ADZUNA_PAISES = { br:'br', es:'es', de:'de', pt:'pt', us:'us' };

const JOBICY_REGIOES = {
  br:'brazil', es:'spain', de:'germany', pt:'portugal', us:'usa', remoto:null
};

const ROTACAO_PAISES = ['br','es','de','pt','remoto'];

const PERFIL_MARCOS = `
Marcos Franco, 57 anos, Curitiba/PR — Brasil.
Executivo sênior com 30 anos de experiência em marketing, vendas/comercial e negócios.
Formação: Master em Vendas/Sales · Barcelona (2014–15); MBA Administração · FGV; FAAP Publicidade.
Idiomas: português nativo, inglês avançado, espanhol avançado.
Experiências:
- Editel Listas Telefônicas (Grupo Carvajal): Superintendente Regional de Vendas – Nordeste (2001–2005) — equipe 45 pessoas, orçamento R$5mi/ano
- RPC/Globo: Gerente (2008–2012) + Diretor (2012–2019) — 30 pessoas, 8 afiliadas, R$500mi/ano
- Popper: Head de Expansão & Novos Negócios (2024–2025)
- Consigliere: Consultor Sênior C-Level (dez/2025–atual)
Cargos-alvo: CEO, CMO, CSO, Diretor Comercial, Diretor de Vendas, Diretor de Marketing, Head de Vendas, Head de Negócios, Gerente Sênior
Pretensão: R$19–25k CLT · Aceita PJ · Aceita relocação SC
Aberto a: Brasil, Espanha, Alemanha, Portugal, remoto
IMPORTANTE: "Sales" = "Vendas" = "Comercial" são sinônimos — tratar como equivalentes na análise.
`.trim();

const CONFIG_PADRAO = {
  ativa: true,
  queries: {
    pt: ['diretor comercial','diretor de vendas','head comercial','gerente geral','CMO'],
    en: ['sales director','commercial director','country manager','VP sales','head of business development'],
    es: ['director comercial','director de ventas','director general','jefe comercial','CMO'],
    de: ['sales director','Vertriebsdirektor','international sales manager','commercial director','Latin America manager'],
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
  'Access-Control-Allow-Origin': 'https://marcos-mco.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
};

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
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
        scope: 'Mail.ReadWrite Mail.Send Calendars.ReadWrite Contacts.Read offline_access',
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
const WHITELIST_DEFAULT = ['mail.michaelpage.com.br','michaelpage.com.br'];

async function getWhitelist(env) {
  try {
    const raw = await env.SENOVA_KV.get('whitelist_dominios');
    const lista = raw ? JSON.parse(raw) : [];
    const merged = [...new Set([...WHITELIST_DEFAULT, ...lista])];
    return merged;
  } catch { return WHITELIST_DEFAULT; }
}

async function salvarWhitelist(env, lista) {
  await env.SENOVA_KV.put('whitelist_dominios', JSON.stringify(lista));
}

async function getBlacklist(env) {
  try { const raw = await env.SENOVA_KV.get('blacklist_remetentes'); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
async function salvarBlacklist(env, lista) {
  await env.SENOVA_KV.put('blacklist_remetentes', JSON.stringify(lista));
}

// ── Padrões automáticos de email (consentimento explícito) ──────────
// Domínios de redes sociais: autorização APENAS por assunto, nunca por domínio
const SOCIAL_DOMAINS = ['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com'];

const PADROES_DEFINIDOS = {
  linkedin_alertas: {
    label: 'Alertas de vaga do LinkedIn',
    matchFrom: ['linkedin.com'], // ignorado para redes sociais — veja estaAutorizado()
    matchSubject: ['alerta de vaga', 'job alert', 'alertas de vaga', 'vagas salvas',
                   'vagas semelhantes', 'vagas similares', 'novas vagas', 'vaga recomendada',
                   'oportunidades de emprego', 'vagas para você', 'vagas que podem'],
  },
  adzuna: {
    label: 'Alertas Adzuna / Gabi',
    matchFrom: ['adzuna'],
    matchSubject: [],
  },
  google_alerts: {
    label: 'Google Alerts de emprego',
    matchFrom: ['googlealerts-noreply', 'google-alerts'],
    matchSubject: [],
  },
};

async function getPadroes(env) {
  try { return await env.SENOVA_KV.get('padroes_automaticos', 'json') || []; }
  catch { return []; }
}

function estaAutorizado(email, whitelist, padroesAtivos) {
  const from = (email.from || '').toLowerCase();
  const subj = (email.subject || '').toLowerCase();
  // 1. Domínio na whitelist do usuário
  if (whitelist.some(d => from.includes(d.toLowerCase().replace(/^@/, '')))) return true;
  // 2. Padrão automático habilitado pelo usuário
  for (const id of padroesAtivos) {
    const def = PADROES_DEFINIDOS[id];
    if (!def) continue;
    if (def.matchFrom.some(f => from.includes(f))) return true;
    if (def.matchSubject.length && def.matchSubject.some(s => subj.includes(s))) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
//  CLASSIFICAÇÃO DE EMAILS VIA IA
// ═══════════════════════════════════════════════════════════════════
async function classificarEmails(emails, whitelist, env) {
  if (!emails.length) return [];

  const CATEGORIAS = {
    positivo:    { label: 'Retorno positivo',        emoji: '🟢', prioridade: 1 },
    pipeline:    { label: 'Pipeline ativo',           emoji: '⭐', prioridade: 2 },
    hunter:      { label: 'Contato de headhunter',    emoji: '🎯', prioridade: 3 },
    vaga:        { label: 'Vaga nova',                emoji: '📋', prioridade: 4 },
    negativo:    { label: 'Retorno negativo',         emoji: '⚫', prioridade: 5 },
    mercado:     { label: 'Inteligência de Mercado',  emoji: '📰', prioridade: 6 },
    irrelevante: { label: 'Irrelevante',              emoji: '—',  prioridade: 9 },
  };

  // Pré-classificação por remetente conhecido — não consome tokens de IA
  const SENDERS_RULES = [
    {
      test: e => {
        const f = (e.from || '').toLowerCase();
        const s = (e.subject || '').toLowerCase();
        return f.includes('fathom.video') || f.includes('@fathom') ||
               (s.includes('fathom') && (s.includes('recording') || s.includes('gravação') || s.includes('transcript')));
      },
      categoria: 'positivo', resumo: 'Gravação de reunião disponível', is_fathom: true,
    },
  ];

  const preClassificados = [];
  const paraIA = [];
  for (const e of emails) {
    const rule = SENDERS_RULES.find(r => r.test(e));
    if (rule) {
      const cat = CATEGORIAS[rule.categoria];
      preClassificados.push({ ...e, categoria: rule.categoria, label: cat.label, emoji: cat.emoji,
                              prioridade: cat.prioridade, resumo: rule.resumo, is_fathom: !!rule.is_fathom });
    } else {
      paraIA.push(e);
    }
  }

  const resultados = [...preClassificados];
  for (let i = 0; i < paraIA.length; i += 10) {
    const lote = paraIA.slice(i, i + 10);
    const listaEmails = lote.map((e, idx) =>
      `[${idx}] De: ${e.from_name||e.from} | Assunto: ${e.subject} | Conteúdo: ${(e.conteudo_vaga||e.preview||'').slice(0, 400)}`
    ).join('\n');
    const wlStr = whitelist.length ? `\nWhitelist de domínios prioritários: ${whitelist.join(', ')}` : '';
    const systemEmail = `Você é assistente de recolocação executiva de Marcos Franco, executivo sênior de marketing de Curitiba/PR.

PERFIL: ${PERFIL_MARCOS}
${wlStr}
Classifique cada e-mail em: positivo | pipeline | hunter | vaga | negativo | mercado | irrelevante

Regras críticas:
- Emails automáticos de confirmação de candidatura ("sua inscrição foi recebida", "application received", "thank you for applying", "confirmamos sua candidatura") → SEMPRE irrelevante
- Notificações LinkedIn de rede social (aceite de convite, "aceitou seu convite", "accepted your invitation", "conheça a rede", "pessoas que você talvez conheça", "people you may know", curtidas, comentários, aniversários) → SEMPRE irrelevante
- LinkedIn job alert / newsletter de vagas / "vagas semelhantes" → vaga
- Headhunter ou recrutador fazendo contato direto → hunter
- Email de RH sobre vaga em que Marcos já se candidatou → pipeline
- Resposta positiva de empresa (convite para entrevista, proposta) → positivo
- Resposta negativa (não aprovado, vaga preenchida) → negativo
- Newsletter de mercado, conteúdo executivo, Board Academy, artigos de liderança, insights de carreira, tendências do setor → mercado
- Spam, promoções, marketing, ferramentas SaaS sem relação com recolocação → irrelevante

Responda APENAS em JSON: {"resultados":[{"indice":0,"categoria":"positivo","resumo":"resumo em 1 linha"},...]}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'x-api-key':env.ANTHROPIC_API_KEY,
          'anthropic-version':'2023-06-01',
          'anthropic-beta':'prompt-caching-2024-07-31'
        },
        body: JSON.stringify({
          model:'claude-sonnet-4-6',
          max_tokens:800,
          system:[{ type:'text', text:systemEmail, cache_control:{ type:'ephemeral' } }],
          messages:[{ role:'user', content:`E-MAILS:\n${listaEmails}` }]
        }),
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

  return resultados.sort((a,b) => a.prioridade - b.prioridade);
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
      const body = await request.json();
      const { titulo, empresa, url, descricao, canal, score, resumo, pontos_fortes, pontos_atencao, forma_candidatura, fonte } = body;
      if (!titulo) return json({ erro: 'titulo obrigatório' }, 400);
      const raw = await env.SENOVA_KV.get('vagas_lead');
      const vagas = raw ? JSON.parse(raw) : [];
      const novaVaga = {
        id: gerarId({ titulo, empresa: empresa || '', url: url || '' }),
        titulo: titulo.trim(),
        empresa: (empresa || '').trim(),
        local: 'Brasil',
        url: url || '',
        descricao: (descricao || '').slice(0, 5000),
        canal: canal || 'Extensão',
        fonte: fonte || 'extensao_chrome',
        data: new Date().toLocaleDateString('pt-BR'),
        score: score || null,
        resumo: resumo || '',
        pontos_fortes: pontos_fortes || [],
        pontos_atencao: pontos_atencao || [],
        forma_candidatura: forma_candidatura || '',
        badge: 'Extensão',
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

    // ── Perfil do usuário ────────────────────────────────────────────
    if (path === '/api/perfil' && request.method === 'GET') {
      const raw = await env.SENOVA_KV.get('perfil_usuario');
      const padrao = { nome:'', cargo_alvo:'', email:'', telefone:'', linkedin:'', idioma_preferido:'', cv_master:'', cargos_busca:'', salario_minimo:'', localizacoes:'', modelo_trabalho:'', paises:'', score_minimo_br:70, score_minimo_espt:55, score_minimo_de:50, score_minimo_remoto:60, score_minimo_us:65, empresas_alvo:'', dias_inativo:7 };
      return json(raw ? JSON.parse(raw) : padrao);
    }

    if (path === '/api/perfil' && request.method === 'POST') {
      const dados = await request.json();
      await env.SENOVA_KV.put('perfil_usuario', JSON.stringify(dados));
      return json({ ok: true });
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
        scope: 'Mail.ReadWrite Mail.Send Calendars.ReadWrite Contacts.Read offline_access',
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
      return htmlResp(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#F7F5F0;}.box{background:#fff;border-radius:14px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1);}.icon{font-size:48px;margin-bottom:16px;}.title{font-size:22px;font-weight:700;color:#1A3A5C;margin-bottom:8px;}.sub{color:#8A8680;font-size:14px;}</style></head><body><div class="box"><div class="icon">✅</div><div class="title">Outlook conectado!</div><div class="sub">Esta janela fechará automaticamente.</div></div><script>try{window.opener.postMessage('outlook_conectado','*');}catch(e){}setTimeout(function(){try{window.close();}catch(e){}},1500);</script></body></html>`);
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
      const limite = parseInt(url.searchParams.get('limite') || '100');
      const apenasNovos = !url.searchParams.get('limite');
      const moverParaPasta = url.searchParams.get('mover') === 'true';

      const dataMinima = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10) + 'T00:00:00Z';
      // Fetch principal: texto (leve, para classificação)
      const msRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${limite}&$filter=receivedDateTime ge ${dataMinima}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,body,webLink`,
        { headers: { Authorization: `Bearer ${token}`, 'Prefer': 'outlook.body-content-type="text"' } }
      );
      if (!msRes.ok) {
        const err = await msRes.json();
        return json({ erro: 'Erro ao buscar emails', detalhes: err }, 502);
      }
      const msData = await msRes.json();
      const emailsBase = (msData.value || []).map(e => {
        const corpo = e.body?.content || e.bodyPreview || '';
        // Extrai links do texto já disponível (baseline antes do HTML fetch)
        const links = extrairLinksEmail(corpo);
        const link_vaga = detectarLinkVaga(links);
        return {
          id: e.id, subject: e.subject || '(sem assunto)',
          from: e.from?.emailAddress?.address || '',
          from_name: e.from?.emailAddress?.name || '',
          date: e.receivedDateTime,
          preview: (e.bodyPreview || '').slice(0, 300),
          body: corpo.slice(0, 5000),
          links, link_vaga,
          is_read: e.isRead, webLink: e.webLink || '',
        };
      });

      const isAlertaFn = e => {
        const f = (e.from || '').toLowerCase();
        const subj = (e.subject || '').toLowerCase();
        if (f.includes('linkedin')) return false;
        if (f.includes('adzuna')) return false; // Adzuna job listings → fluxo normal de vaga
        // Google Alert sobre vagas → email normal, não signal de mercado
        if ((f.includes('googlealerts-noreply') || f.includes('google-alerts')) &&
            /vaga|emprego|\bjob\b|oportunidade|candidatura|hiring/i.test(subj)) return false;
        return f.includes('googlealerts-noreply') || f.includes('google-alerts') ||
               f.includes('alertas@') ||
               (f.includes('jobalerts') && !f.includes('linkedin')) ||
               (f.includes('job-alert') && !f.includes('linkedin'));
      };

      // Fetch HTML individual só para emails com aparência de vaga — extrai hrefs reais
      const JOB_FROM_PATTERN = /linkedin|gupy|greenhouse|lever|workday|indeed|michaelpage|roberthalf|catho|vagas\.com|empregos\.com|infojobs|jobscore/i;
      const JOB_SUBJ_PATTERN = /vaga|emprego|oportunidade|job|career|position|role|hiring|processo seletivo/i;
      // HTML fetch individual: só para emails de vaga sem URL encontrada no texto,
      // ou para alertas (extrai artigos). Não bloqueia o fluxo se falhar.
      await Promise.allSettled(emailsBase.map(async e => {
        const mightBeVaga = JOB_FROM_PATTERN.test(e.from) || JOB_SUBJ_PATTERN.test(e.subject);
        const isAlerta = isAlertaFn(e);
        const precisaHtml = (mightBeVaga && !e.link_vaga) || isAlerta;
        if (!precisaHtml) return;
        try {
          const r = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(e.id)}?$select=body`,
            { headers: { Authorization: `Bearer ${token}`, 'Prefer': 'outlook.body-content-type="html"' },
              signal: AbortSignal.timeout(4000) }
          );
          if (!r.ok) return;
          const d = await r.json();
          const html = d.body?.content || '';
          const linksHtml = extrairLinksEmail(html);
          const linkHtml = detectarLinkVaga(linksHtml);
          if (linkHtml) { e.links = linksHtml; e.link_vaga = linkHtml; }
          if (isAlerta) e.artigos = extrairArtigosGoogleAlert(html);
        } catch {}
      }));

      const emails = emailsBase;

      // Alertas: artigos já extraídos no fetch HTML individual acima
      const todosAlertas = emails.filter(isAlertaFn);

      const vistos = await getVistos(env);
      const novos = apenasNovos ? emails.filter(e => !vistos.has(e.id)) : emails;

      if (!novos.length) {
        return json({ emails: [], alertas: todosAlertas, total_lidos: emails.length, total_novos: 0, whitelist: await getWhitelist(env) });
      }
      // link_vaga já foi extraído do HTML individual acima; usar o que existe
      const novosComConteudo = novos.map(e => ({
        ...e,
        conteudo_vaga: e.body || e.preview,
        link_vaga: e.link_vaga || detectarLinkVaga(e.links),
      }));

      // Blacklist: remetentes bloqueados pelo usuário nunca chegam ao Senova
      const blacklist = await getBlacklist(env);
      const _blLower = blacklist.map(s => s.toLowerCase());
      const semBloqueados = novosComConteudo.filter(e => !_blLower.some(b => (e.from||'').toLowerCase().includes(b)));

      // Consentimento explícito: só processar emails de fontes autorizadas pelo usuário
      // A IA nunca vê o que não foi autorizado — princípio de privacidade by design (LGPD/GDPR)
      const whitelist = await getWhitelist(env);
      const padroesAtivos = await getPadroes(env);
      const autorizado = semBloqueados.filter(e => estaAutorizado(e, whitelist, padroesAtivos));

      // Separar alertas dos normais (só entre os autorizados)
      const alertasNovos = autorizado.filter(isAlertaFn);
      const emailsNormais = autorizado.filter(e => !isAlertaFn(e));

      const todoClassificados = await classificarEmails(emailsNormais, whitelist, env);
      // Salvar vistos APENAS para emails autorizados — emails bloqueados por consentimento
      // não devem ser marcados como vistos, para reaparecer quando o usuário autorizar a fonte.
      await salvarVistos(env, autorizado.map(e => e.id));

      // Whitelist override: email de domínio prioritário nunca some como irrelevante
      // Exceção: redes sociais — notificações do LinkedIn (conexões, mensagens) NÃO devem virar vaga
      const _wlLower = whitelist.map(d => d.toLowerCase().replace(/^@/,''));
      const _noOverrideDomains = ['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'];
      const comOverride = todoClassificados.map(e => {
        const from = (e.from||'').toLowerCase();
        if (e.categoria === 'irrelevante' &&
            _wlLower.some(d => from.includes(d)) &&
            !_noOverrideDomains.some(d => from.includes(d))) {
          return {...e, categoria:'vaga', label:'Vaga nova', emoji:'📋', prioridade:4, resumo: e.resumo||'Domínio prioritário'};
        }
        return e;
      });
      const classificados = comOverride.filter(e => e.categoria !== 'irrelevante');
      const irrelevantes  = comOverride.filter(e => e.categoria === 'irrelevante').slice(0, 10);

      // IDs a mover: emails relevantes (não-irrelevante) + alertas de vagas
      const idsParaMover = new Set([
        ...comOverride.filter(e => e.categoria !== 'irrelevante').map(e => e.id),
        ...alertasNovos.map(e => e.id),
      ]);

      // Marcar como lido + (opt) mover para pasta "Lidos pelo Senova" em background
      ctx.waitUntil((async () => {
        await Promise.allSettled(novos.map(e =>
          fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(e.id)}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          })
        ));
        if (moverParaPasta) {
          const paraMovar = novos.filter(e => idsParaMover.has(e.id));
          if (paraMovar.length > 0) {
            const folderId = await getOrCreateSenovaFolder(token, env);
            if (folderId) {
              await Promise.allSettled(paraMovar.map(e =>
                fetch(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(e.id)}/move`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ destinationId: folderId }),
                })
              ));
            }
          }
        }
      })());

      // Stats do dia no KV
      const totalAlertas = alertasNovos.length;
      const totalNovos = classificados.length;
      const hoje = new Date().toISOString().slice(0, 10);
      const statsKey = 'stats_' + hoje;
      const statsAtuais = await env.SENOVA_KV.get(statsKey, 'json') || { novos: 0, alertas: 0 };
      statsAtuais.novos = Math.max(statsAtuais.novos, totalNovos);
      statsAtuais.alertas = Math.max(statsAtuais.alertas, totalAlertas);
      await env.SENOVA_KV.put(statsKey, JSON.stringify(statsAtuais), { expirationTtl: 86400 });

      return json({
        emails: classificados, irrelevantes, alertas: todosAlertas, total_lidos: emails.length,
        total_novos: novos.length, total_relevantes: classificados.length, whitelist,
        movidos: moverParaPasta ? idsParaMover.size : 0,
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
      const { titulo, data, descricao, hora_inicio, hora_fim } = await request.json();
      if (!titulo || !data) return json({ erro: 'titulo e data obrigatórios' }, 400);
      const hi = hora_inicio || '09:00:00';
      const hf = hora_fim || '09:30:00';
      const corpo = [descricao, '#senova'].filter(Boolean).join('\n\n');
      const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: titulo,
          body: { contentType: 'Text', content: corpo },
          start: { dateTime: `${data}T${hi}`, timeZone: 'America/Sao_Paulo' },
          end:   { dateTime: `${data}T${hf}`, timeZone: 'America/Sao_Paulo' },
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

    // ── Diagnóstico de emails (temporário) ─────────────────────────
    if (path === '/api/emails/diagnostico' && request.method === 'GET') {
      const token = await getValidToken(env);
      if (!token) return json({ erro: 'Outlook não conectado' }, 401);
      const whitelist = await getWhitelist(env);
      const padroesAtivos = await getPadroes(env);
      const dataMinima = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10) + 'T00:00:00Z';
      const msRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=30&$filter=receivedDateTime ge ${dataMinima}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msData = await msRes.json();
      const emails = (msData.value || []).map(e => {
        const fromAddr = e.from?.emailAddress?.address || '';
        const fromName = e.from?.emailAddress?.name || '';
        const subj = e.subject || '';
        const autorizado = estaAutorizado({ from: fromAddr, subject: subj }, whitelist, padroesAtivos);
        return { from: fromAddr, from_name: fromName, subject: subj.slice(0, 80), autorizado, date: e.receivedDateTime.slice(0,16) };
      });
      return json({ whitelist, padroes: padroesAtivos, emails });
    }

    // ── Padrões automáticos de email ────────────────────────────────
    if (path === '/api/padroes' && request.method === 'GET') {
      return json({ padroes: await getPadroes(env), definidos: PADROES_DEFINIDOS });
    }
    if (path === '/api/padroes' && request.method === 'POST') {
      const { padroes } = await request.json();
      if (!Array.isArray(padroes)) return json({ erro: 'padroes deve ser array' }, 400);
      const validos = padroes.filter(id => PADROES_DEFINIDOS[id]);
      await env.SENOVA_KV.put('padroes_automaticos', JSON.stringify(validos));
      return json({ ok: true, padroes: validos });
    }

    // ── Blacklist de remetentes ──────────────────────────────────────
    if (path === '/api/blacklist' && request.method === 'GET') {
      return json({ remetentes: await getBlacklist(env) });
    }
    if (path === '/api/blacklist' && request.method === 'POST') {
      const { remetente } = await request.json();
      if (!remetente) return json({ erro: 'remetente obrigatório' }, 400);
      const lista = await getBlacklist(env);
      const r = remetente.toLowerCase().trim();
      if (!lista.includes(r)) { lista.push(r); await salvarBlacklist(env, lista); }
      return json({ ok: true, remetentes: lista });
    }
    if (path === '/api/blacklist' && request.method === 'DELETE') {
      const { remetente } = await request.json();
      const lista = (await getBlacklist(env)).filter(d => d !== remetente?.toLowerCase().trim());
      await salvarBlacklist(env, lista);
      return json({ ok: true, remetentes: lista });
    }

    if (path === '/api/sinais-mercado' && request.method === 'GET') {
      const forcar = url.searchParams.get('force') === '1';
      const slot = Math.floor(Date.now() / (4 * 60 * 60 * 1000)); // slot de 4h
      const cacheKey = `sinais_mercado_${slot}`;
      if (!forcar) {
        const cached = await env.SENOVA_KV.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Não serve cache se resultado foi erro — força retry na próxima chamada
          if (parsed.status !== 'rss_indisponivel') return json(parsed);
        }
      }
      const resultado = await buscarSinaisMercado(env);
      if (resultado.status === 'ok') {
        await env.SENOVA_KV.put(cacheKey, JSON.stringify(resultado), { expirationTtl: 4 * 60 * 60 });
      }
      return json(resultado);
    }

    if (path === '/api/fetch-descricao' && request.method === 'POST') {
      const { url } = await request.json();
      if (!url || !url.startsWith('http')) return json({ error: 'URL inválida' }, 400);
      try {
        // Normalizar URL: cards vindos de emails de alerta têm /comm/ que retorna
        // a versão de rastreamento da página, sem o JSON-LD da vaga pública.
        let fetchUrl = url;
        if (fetchUrl.includes('linkedin.com/comm/')) {
          fetchUrl = fetchUrl.replace('linkedin.com/comm/', 'linkedin.com/');
          // Remover parâmetros de tracking do LinkedIn (?trackingId=..., ?trk=...)
          try { const u = new URL(fetchUrl); fetchUrl = u.origin + u.pathname; } catch(e) {}
        }

        const pageRes = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!pageRes.ok) return json({ error: `HTTP ${pageRes.status}` }, 502);
        const html = await pageRes.text();

        // Detecta LinkedIn authwall (login obrigatório)
        const _finalUrl = pageRes.url || '';
        const _isLinkedInUrl = fetchUrl.includes('linkedin.com');
        if (_isLinkedInUrl && (
          _finalUrl.includes('authwall') || _finalUrl.includes('/login') ||
          html.includes('authwall') || html.includes('uas-login') ||
          html.includes('/checkpoint/lg/login')
        )) {
          return json({ requiresLogin: true, portal: 'LinkedIn' });
        }

        // 1. JSON-LD — LinkedIn, Indeed, Catho, InfoJobs expõem JobPosting para o Google Jobs
        //    mesmo sem login. O erro anterior era remover <script> antes de extrair isso.
        const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let ldM;
        while ((ldM = ldRe.exec(html)) !== null) {
          try {
            const parsed = JSON.parse(ldM[1].trim());
            const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
            for (const item of items) {
              const raw = item.description || item.jobDescription || '';
              if (raw.length > 100) {
                const clean = raw
                  .replace(/<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '\n• ')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"')
                  .replace(/\s{2,}/g,' ').trim();
                if (clean.length > 100) {
                  const meta = {};
                  // Localização (jobLocation.address)
                  const loc = item.jobLocation;
                  if (loc) {
                    const addr = (Array.isArray(loc) ? loc[0] : loc)?.address || {};
                    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
                    if (parts.length) meta.localizacao = parts.join(', ');
                  }
                  // Jornada (employmentType: FULL_TIME → Tempo integral)
                  const et = item.employmentType;
                  if (et) {
                    const t = Array.isArray(et) ? et[0] : et;
                    const jMap = { FULL_TIME:'Tempo integral', PART_TIME:'Tempo parcial', CONTRACT:'Contrato', TEMPORARY:'Temporário', INTERN:'Estágio' };
                    if (jMap[t]) meta.jornada = jMap[t];
                  }
                  // Modalidade (TELECOMMUTE → Remoto, localização física → Presencial)
                  if (item.jobLocationType === 'TELECOMMUTE') meta.modalidade = 'Remoto';
                  else if (loc) meta.modalidade = 'Presencial';
                  // Salário (baseSalary)
                  const sal = item.baseSalary;
                  if (sal?.value) {
                    const cur = sal.currency || 'BRL';
                    const sym = cur === 'BRL' ? 'R$ ' : cur + ' ';
                    const uMap = { MONTH:'/mês', YEAR:'/ano', HOUR:'/hora' };
                    const u = uMap[sal.value.unitText] || '';
                    const mn = sal.value.minValue, mx = sal.value.maxValue;
                    if (mn && mx) meta.salario = `${sym}${mn} – ${sym}${mx}${u}`;
                    else if (mn) meta.salario = `${sym}${mn}${u}`;
                    else if (mx) meta.salario = `${sym}${mx}${u}`;
                  }
                  return json({ descricao: clean.slice(0, 5000), ...meta });
                }
              }
            }
          } catch(e) {}
        }

        // Teaser de email LinkedIn — rejeitar sempre
        const _isEmailTeaser = (t) => t.includes('veja esta vaga') || t.includes('semelhantes no LinkedIn')
          || t.includes('see this job') || t.includes('similar jobs on LinkedIn');

        // Detecta texto de privacidade/cookies do LinkedIn (PT e EN) — rejeitar sempre
        const _isPrivacyGarbage = (t) =>
          t.includes('respeita a sua privacidade') || t.includes('respects your privacy') ||
          t.includes('cookies essenciais') || t.includes('use essential') ||
          (t.includes('cookie') && (t.includes('privacy') || t.includes('privacidade')));

        // 2. og:description — parcial mas útil para análise inicial
        const ogM = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']{60,})["']/i)
          || html.match(/<meta[^>]*content=["']([^"']{60,})["'][^>]*property=["']og:description["']/i);
        if (ogM?.[1]) {
          const val = ogM[1].replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
          if (val.length > 80 && !_isEmailTeaser(val) && !_isPrivacyGarbage(val)) return json({ descricao: val, parcial: true });
        }

        // 3. meta description — último fallback parcial
        const metaM = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']{60,})["']/i)
          || html.match(/<meta[^>]*content=["']([^"']{60,})["'][^>]*name=["']description["']/i);
        if (metaM?.[1]) {
          const val = metaM[1].replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
          if (val.length > 80 && !_isEmailTeaser(val) && !_isPrivacyGarbage(val)) return json({ descricao: val, parcial: true });
        }

        // 4. Extração de texto geral
        const stripped = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#\d+;/g,'')
          .replace(/\s{2,}/g,' ').trim();
        if (stripped.length < 150 || _isPrivacyGarbage(stripped)) return json({ error: 'Conteúdo insuficiente' }, 422);
        return json({ descricao: stripped.slice(0, 4000) });
      } catch (e) {
        return json({ error: 'Erro ao buscar URL: ' + (e.message||'timeout') }, 502);
      }
    }

    // ── Contatos Outlook — filtro estratégico ───────────────────────
    if (path === '/api/contacts' && request.method === 'GET') {
      const token = await getValidToken(env);
      if (!token) return json({ erro: 'Outlook não conectado.', reauth: true }, 401);
      const res = await fetch(
        'https://graph.microsoft.com/v1.0/me/contacts?$top=200&$select=displayName,emailAddresses,jobTitle,companyName,mobilePhone,businessPhones',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return json({ erro: 'Erro ao buscar contatos', detalhes: await res.json().catch(()=>({})) }, 502);
      const data = await res.json();
      const KEYWORDS_EXEC = ['diretor','director','ceo','cmo','cso','head','vp ','presidente','gerente','manager','recruiter','headhunter','talent','people',' rh','sócio','partner','consultor'];
      const filtrados = (data.value || []).filter(c => {
        const cargo = (c.jobTitle || '').toLowerCase();
        return KEYWORDS_EXEC.some(k => cargo.includes(k));
      });
      return json({ contatos: filtrados, total: filtrados.length });
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
    const queries = (CONFIG_PADRAO.queries[idioma] || []).slice(0, 3); // sempre do código — KV só guarda score/locais

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
    'expansão','expansao','regional','country','general',
    'vendas','sales','ventas','venda','business development','account'
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
    const descricao = limparHtml(extrairTag(item, 'description') || '').slice(0, 4000);
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
  const systemPrompt = `Analise compatibilidade vaga×candidato. Responda APENAS JSON sem markdown.

CANDIDATO: ${PERFIL_MARCOS}

Regime: se não encontrar CLT ou PJ explicitamente, inferir pelo contexto — vagas de grandes empresas brasileiras são geralmente CLT; vagas de consultoria ou projetos podem ser PJ ou ambos.

IDIOMAS — regra obrigatória: o candidato tem inglês avançado e espanhol avançado — NÃO fluente em nenhum dos dois. "avançado" ≠ "fluente". Se a vaga exige fluência (fluente/nativo/bilíngue/proficient/C1/C2) em inglês ou espanhol, registrar OBRIGATORIAMENTE em pontos_atencao. Nunca registrar inglês ou espanhol como ponto_forte se o requisito for fluência. Nunca afirmar que o candidato "atende" exigência de fluência em inglês ou espanhol.

JSON: {"score":(0-100),"classificacao":("candidatar"|"analisar"|"recusar"),"resumo":"2 linhas","pontos_fortes":["p1","p2"],"pontos_atencao":["p1"],"salario_compativel":(true|false),"localizacao":"cidade/estado extraído ou ''","modelo":("hibrido"|"remoto"|"presencial"|""),"regime":("CLT"|"PJ"|"ambos"|"")}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'x-api-key':env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01',
        'anthropic-beta':'prompt-caching-2024-07-31'
      },
      body: JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens:1000,
        system:[{ type:'text', text:systemPrompt, cache_control:{ type:'ephemeral' } }],
        messages:[{ role:'user', content:`VAGA: ${titulo} | ${empresa||''} | ${(descricao||'').slice(0,4000)}` }]
      }),
    });
    const data = await resp.json();
    return JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim());
  } catch {
    return { score:50, classificacao:'analisar', resumo:'Revisar manualmente.', pontos_fortes:[], pontos_atencao:[], salario_compativel:true, localizacao:'', modelo:'', regime:'' };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PASTA OUTLOOK — "Lidos pelo Senova"
// ═══════════════════════════════════════════════════════════════════
async function getOrCreateSenovaFolder(token, env) {
  const KV_KEY = 'senova_folder_id';
  try {
    const cached = await env.SENOVA_KV.get(KV_KEY);
    if (cached) return cached;

    // Buscar pasta existente
    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/mailFolders?$filter=displayName eq 'Lidos pelo Senova'&$select=id`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      if (listData.value?.length > 0) {
        const id = listData.value[0].id;
        await env.SENOVA_KV.put(KV_KEY, id, { expirationTtl: 86400 * 30 });
        return id;
      }
    }

    // Criar pasta
    const createRes = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Lidos pelo Senova' }),
    });
    if (!createRes.ok) return null;
    const created = await createRes.json();
    await env.SENOVA_KV.put(KV_KEY, created.id, { expirationTtl: 86400 * 30 });
    return created.id;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════
function montarCard(vaga, local, fonte) {
  return {
    id: gerarId(vaga), titulo: vaga.titulo, empresa: vaga.empresa,
    local: vaga.local || local.label, url: vaga.url, fonte,
    descricao: (vaga.descricao||'').slice(0,4000),
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
const KEYWORDS_SINAL = [
  'saiu','saída','novo ceo','nomeou','nomeação','nomeado','nomeados',
  'contratou','contratação','contratado','expansão','fusão','aquisição',
  'reestruturação','demitiu','demissão','demitidos','lançou','cresce','crescimento',
  'adquiriu','assume','assumiu','diretora','diretor','vice-presidente','vp de',
];

async function buscarBingNewsRSS(query) {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=pt-BR&setLang=pt-BR`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', 'Accept': 'application/rss+xml,text/xml,*/*' },
      signal: AbortSignal.timeout(7000),
      redirect: 'follow',
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    if (!text.includes('<item') && !text.includes('<rss')) return [];
    return parsearRSS(text, 'Bing News', { label: 'Brasil' });
  } catch { return []; }
}

async function buscarGoogleNewsRSS(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'Accept': 'application/rss+xml,text/xml' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    if (!text.includes('<item') && !text.includes('<rss')) return [];
    return parsearRSS(text, 'Google News', { label: 'Brasil' });
  } catch { return []; }
}

async function buscarSinaisMercado(env) {
  // Tenta Bing primeiro (mais acessível de IPs cloud), depois Google como fallback
  const buscar = async q => {
    const bing = await buscarBingNewsRSS(q);
    if (bing.length) return bing;
    return buscarGoogleNewsRSS(q);
  };
  const resultados = await Promise.allSettled(QUERIES_SINAIS.map(q => buscar(q)));
  const itens = []; let algumOk = false;
  for (const r of resultados) {
    if (r.status === 'fulfilled' && r.value.length > 0) { algumOk = true; itens.push(...r.value); }
  }
  // Dedup by title
  const vistos = new Set();
  const unicos = itens.filter(i => {
    const k = (i.titulo || '').toLowerCase().slice(0, 60);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  // Keyword filter — apenas se retornou muitos itens; se retornou poucos, aceitar todos
  const relevantes = (unicos.length > 10
    ? unicos.filter(i => {
        const txt = (i.titulo + ' ' + (i.descricao || '')).toLowerCase();
        return KEYWORDS_SINAL.some(kw => txt.includes(kw));
      })
    : unicos
  ).slice(0, 5);

  if (!relevantes.length) return { sinais: [], status: algumOk ? 'sem_resultados' : 'rss_indisponivel', fonte: 'bing_news' };
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
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
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
