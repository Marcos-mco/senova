// 
//  SENOVA WORKER v6
//  Cloudflare Worker — senova-proxy.marcos-mco.workers.dev
//
//  ROTAS:
//  GET  /health                    -> status do worker + outlook status
//  POST /api/claude                -> proxy Anthropic API
//  POST /api/analisar-vaga         -> análise Anti-ATS
//  GET  /api/auth/outlook          -> inicia OAuth Microsoft
//  GET  /api/auth/callback         -> callback OAuth, salva token KV
//  DELETE /api/auth/outlook        -> desconecta Outlook
//  GET  /api/emails                -> busca emails novos + filtra IA
//  POST /api/emails/marcar-visto   -> marca emails como vistos no KV
//  DELETE /api/emails/limpar-vistos -> limpa histórico de vistos
//  POST /api/whitelist             -> adiciona domínio à whitelist
//  DELETE /api/whitelist           -> remove domínio da whitelist
//  GET  /api/whitelist             -> lista whitelist atual
//
//  VARIÁVEIS DE AMBIENTE (Cloudflare -> Workers -> senova-proxy -> Settings):
//  ANTHROPIC_API_KEY   -> sua chave API Anthropic
//  MS_CLIENT_ID        -> Azure App Registration Client ID
//  MS_CLIENT_SECRET    -> Azure App Registration Client Secret
//  KV_SENOVA           -> binding KV namespace (nome do binding: KV_SENOVA)
// 

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
};

const REDIRECT_URI = 'https://senova-proxy.marcos-mco.workers.dev/api/auth/callback';

const PERFIL_MARCOS = `
Marcos Franco, 57 anos, Curitiba/PR. Executivo sênior de marketing, mídia e negócios (~30 anos experiência).
Cargos-alvo: CEO, CMO, CSO, Diretor de Marketing, Head de Negócios, VP Marketing.
Pretensão: R$19.000-25.000 CLT. Aceita PJ via LaborDei. Aceita remoto/híbrido/presencial Curitiba ou SC.
Formação: Master Barcelona, Master Évora, MBA FGV, FAAP Publicidade.
Idiomas: português nativo, inglês avançado, espanhol avançado.
Experiência principal: RPC/Globo Diretor Marketing 2012-2019, Popper Head Expansão 2024-2025, Consigliere Consultor Senior atual.
Candidaturas ativas: Payoneer, PinkMed, SKY, Adlook, Omie, Keeta, Samsung, Binance, Ambev, Publicis, Wise, BSI, Gaudium, GPAC, FIEP, 99/DiDi, Thomson Reuters, Figma, CI&T.
`.trim();

//  Helpers 

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function htmlResp(content, status = 200) {
  return new Response(content, {
    status,
    headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

//  KV: Token Outlook 

async function getTokenData(env) {
  try {
    const raw = await env.SENOVA_KV.get('outlook_token');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveTokenData(env, tokenData) {
  if (!env || !env.SENOVA_KV) {
    const k = env ? Object.keys(env).join(',') : 'env=null';
    throw new Error('SENOVA_KV indisponivel. Bindings: ' + k);
  }
  await env.SENOVA_KV.put('outlook_token', JSON.stringify(tokenData));
}

async function getValidToken(env) {
  const data = await getTokenData(env);
  if (!data) return null;

  // Verifica se precisa renovar (margem de 5 min)
  if (Date.now() < data.expires_at - 300000) {
    return data.access_token;
  }

  // Renova via refresh_token
  try {
    const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.MS_CLIENT_ID,
        client_secret: env.MS_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: data.refresh_token,
        scope: 'Mail.Read Calendars.ReadWrite offline_access',
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

//  KV: Emails vistos 

async function getVistos(env) {
  try {
    const raw = await env.SENOVA_KV.get('emails_vistos');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

async function salvarVistos(env, ids) {
  const vistos = await getVistos(env);
  ids.forEach(id => vistos.add(id));
  const lista = [...vistos].slice(-1000); // mantém últimos 1000
  await env.SENOVA_KV.put('emails_vistos', JSON.stringify(lista));
}

//  KV: Whitelist de domínios 

async function getWhitelist(env) {
  try {
    const raw = await env.SENOVA_KV.get('whitelist_dominios');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function salvarWhitelist(env, lista) {
  await env.SENOVA_KV.put('whitelist_dominios', JSON.stringify(lista));
}

//  Claude call 

async function claudeCall(prompt, env, maxTokens = 2000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

//  Classificação de emails por IA 

async function classificarEmails(emails, whitelist, env) {
  if (!emails.length) return [];

  const CATEGORIAS = {
    positivo: { label: 'Retorno positivo', emoji: '🟢', prioridade: 1 },
    pipeline: { label: 'Pipeline ativo', emoji: '⭐', prioridade: 2 },
    hunter: { label: 'Contato de headhunter', emoji: '🎯', prioridade: 3 },
    vaga: { label: 'Vaga nova', emoji: '📋', prioridade: 4 },
    negativo: { label: 'Retorno negativo', emoji: '⚫', prioridade: 5 },
    irrelevante: { label: 'Irrelevante', emoji: '—', prioridade: 9 },
  };

  // Processa em lotes de 10
  const lotes = [];
  for (let i = 0; i < emails.length; i += 10) {
    lotes.push(emails.slice(i, i + 10));
  }

  const resultados = [];

  for (const lote of lotes) {
    const listaEmails = lote.map((e, i) =>
      `[${i}] De: ${e.from_name||e.from} | Assunto: ${e.subject} | Conteúdo: ${(e.conteudo_vaga||e.preview||'').slice(0, 400)}`
    ).join('\n');

    const wlStr = whitelist.length ? `\nWhitelist de domínios prioritários: ${whitelist.join(', ')}` : '';

    const prompt = `Você é assistente de recolocação executiva de Marcos Franco, executivo sênior de marketing de Curitiba/PR.

PERFIL: ${PERFIL_MARCOS}
${wlStr}

Classifique cada e-mail abaixo em uma das categorias:
- positivo: convite para entrevista, avanço em processo seletivo, retorno favorável de empresa/headhunter
- pipeline: e-mail de empresa onde Marcos tem candidatura ativa (verifique whitelist e candidaturas listadas no perfil)
- hunter: headhunter entrando em contato com oportunidade
- vaga: alerta de nova vaga relevante para o perfil (LinkedIn Jobs, Gupy, etc.)
- negativo: rejeição, encerramento de processo
- irrelevante: newsletter, spam, marketing, bancário, pessoal não relacionado à recolocação

E-mails em qualquer idioma (PT, EN, ES, DE) — responda APENAS em JSON válido:
{"resultados":[{"indice":0,"categoria":"positivo","resumo":"resumo em português em 1 linha"},{"indice":1,...}]}

E-MAILS:
${listaEmails}`;

    try {
      const texto = await claudeCall(prompt, env, 1000);
      const clean = texto.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      parsed.resultados.forEach(r => {
        const email = lote[r.indice];
        if (!email) return;
        const cat = CATEGORIAS[r.categoria] || CATEGORIAS.irrelevante;
        resultados.push({
          ...email,
          categoria: r.categoria,
          label: cat.label,
          emoji: cat.emoji,
          prioridade: cat.prioridade,
          resumo: r.resumo,
          conteudo_vaga: email.conteudo_vaga || email.body || email.preview || '',
          link_vaga: email.link_vaga || '',
        });
      });
    } catch {
      // Se IA falhar no lote, retorna emails sem classificação
      lote.forEach(e => resultados.push({ ...e, categoria: 'irrelevante', label: 'Irrelevante', emoji: '—', prioridade: 9, resumo: '' }));
    }
  }

  // Ordena por prioridade e filtra irrelevantes
  return resultados
    .filter(e => e.categoria !== 'irrelevante')
    .sort((a, b) => a.prioridade - b.prioridade);
}

//
//  VARREDURA AUTOMÁTICA DE VAGAS
//

const PALAVRAS_CHAVE_VAGA = [
  'cmo','cso','cco','vp marketing','vp de marketing',
  'diretor de marketing','director de marketing','marketing director',
  'chief marketing','head de marketing','head of marketing',
  'diretor comercial','head comercial','gerente sênior de marketing',
];

const RSS_VAGAS = [
  { url: 'https://br.indeed.com/rss?q=diretor+marketing+CMO&sort=date', fonte: 'Indeed BR' },
  { url: 'https://de.indeed.com/rss?q=marketing+director+CMO&sort=date', fonte: 'Indeed DE' },
  { url: 'https://es.indeed.com/rss?q=director+marketing+CMO&sort=date', fonte: 'Indeed ES' },
];

function parseRSS(xml) {
  const items = [];
  const matches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const item of matches) {
    const getTag = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!m) return '';
      return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').trim();
    };
    const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim()
               || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() || '';
    items.push({
      titulo: getTag('title'),
      empresa: getTag('source') || getTag('author') || '',
      descricao: getTag('description').slice(0, 500),
      url: link,
    });
  }
  return items;
}

function passaFiltro(item) {
  const texto = (item.titulo + ' ' + item.descricao).toLowerCase();
  return PALAVRAS_CHAVE_VAGA.some(kw => texto.includes(kw));
}

async function getLeadsKV(env) {
  try {
    const raw = await env.SENOVA_KV.get('leads_varredura');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function salvarLeadsKV(env, leads) {
  await env.SENOVA_KV.put('leads_varredura', JSON.stringify(leads.slice(0, 50)));
}

async function varrerVagas(env) {
  const hoje = new Date().toISOString().slice(0, 10);
  const existentes = await getLeadsKV(env);
  const urlsExistentes = new Set(existentes.map(l => l.url));
  const candidatos = [];

  for (const feed of RSS_VAGAS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SenovaBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseRSS(xml)) {
        if (!item.url || urlsExistentes.has(item.url)) continue;
        if (!passaFiltro(item)) continue;
        candidatos.push({ ...item, fonte: feed.fonte, data: hoje });
      }
    } catch {}
  }

  if (!candidatos.length) return { novos: 0, total: existentes.length };

  // Score ATS — máx 5 por rodada para economizar tokens
  const paraScore = candidatos.slice(0, 5);
  const aprovados = [];

  for (const vaga of paraScore) {
    try {
      const prompt = `Avalie a compatibilidade desta vaga com o perfil de Marcos Franco.\n\nPERFIL:\n${PERFIL_MARCOS}\n\nVAGA:\nTítulo: ${vaga.titulo}\nEmpresa: ${vaga.empresa}\nDescrição: ${vaga.descricao}\n\nResponda APENAS em JSON: {"score":85,"resumo":"1 linha de compatibilidade"}`;
      const texto = await claudeCall(prompt, env, 200);
      const { score, resumo } = JSON.parse(texto.replace(/```json|```/g, '').trim());
      if ((score || 0) >= 60) aprovados.push({ ...vaga, score, resumo: resumo || '' });
    } catch {}
  }

  const atualizados = [...aprovados, ...existentes].slice(0, 50);
  await salvarLeadsKV(env, atualizados);
  return { novos: aprovados.length, total: atualizados.length };
}

//
//  VARREDURA DE SINAIS DE MERCADO
//

const RSS_SINAIS = [
  { url: 'https://news.google.com/rss/search?q=CEO+CMO+diretor+saiu+OR+deixa+OR+novo+Paraná+OR+Curitiba&hl=pt-BR&gl=BR&ceid=BR:pt', tipo: 'movimentacao_exec', label: 'Movimentação executiva' },
  { url: 'https://news.google.com/rss/search?q=empresa+alemã+OR+espanhola+expansão+OR+filial+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt', tipo: 'empresa_europeia', label: 'Empresa europeia' },
  { url: 'https://news.google.com/rss/search?q=afiliada+Globo+OR+RPC+OR+comunicação+mídia+diretor+marketing&hl=pt-BR&gl=BR&ceid=BR:pt', tipo: 'midia_tv', label: 'Mídia/TV' },
  { url: 'https://news.google.com/rss/search?q=fusão+OR+aquisição+OR+expansão+Paraná+empresa&hl=pt-BR&gl=BR&ceid=BR:pt', tipo: 'fusao_aquisicao', label: 'Fusão/Aquisição' },
  { url: 'https://news.google.com/rss/search?q=startup+captação+OR+rodada+investimento+Curitiba+OR+Paraná&hl=pt-BR&gl=BR&ceid=BR:pt', tipo: 'startup_captacao', label: 'Startup/Captação' },
];

const PALAVRAS_SINAL = [
  'saiu', 'deixa', 'deixou', 'demitido', 'afastado', 'novo ceo', 'novo cmo', 'novo diretor',
  'expansão', 'expande', 'fusão', 'aquisição', 'adquire', 'captação', 'captou',
  'contratou', 'contrata', 'abre escritório', 'chegando ao brasil', 'entra no brasil', 'investe',
];

async function getSinaisKV(env) {
  try {
    const raw = await env.SENOVA_KV.get('sinais_mercado');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function salvarSinaisKV(env, sinais) {
  await env.SENOVA_KV.put('sinais_mercado', JSON.stringify(sinais.slice(0, 30)));
}

function passaFiltroSinal(item) {
  const texto = (item.titulo + ' ' + item.descricao).toLowerCase();
  return PALAVRAS_SINAL.some(kw => texto.includes(kw));
}

async function analisarSinal(item, tipo, env) {
  const label = RSS_SINAIS.find(f => f.tipo === tipo)?.label || tipo;
  const prompt = `Você é assistente de recolocação executiva de Marcos Franco, executivo sênior de marketing de Curitiba/PR.

PERFIL: ${PERFIL_MARCOS}

Notícia detectada como possível sinal de oportunidade:
Tipo: ${label}
Título: ${item.titulo}
Conteúdo: ${item.descricao}

Responda APENAS em JSON válido:
{"empresa":"nome da empresa","cargo_vago":"cargo executivo possivelmente necessário ou null","resumo":"1 frase sobre a oportunidade para Marcos","acao":"ação concreta recomendada","mensagem_sugerida":"mensagem curta pronta para enviar ao decisor (máx 3 linhas, tom executivo direto)","relevancia":"alta|media|baixa"}`;

  try {
    const texto = await claudeCall(prompt, env, 400);
    return JSON.parse(texto.replace(/```json|```/g, '').trim());
  } catch {
    return { empresa: '', cargo_vago: null, resumo: item.titulo, acao: 'Verificar manualmente', mensagem_sugerida: '', relevancia: 'baixa' };
  }
}

async function varrerSinais(env) {
  const hoje = new Date().toISOString().slice(0, 10);
  const existentes = await getSinaisKV(env);
  const urlsExistentes = new Set(existentes.map(s => s.url));
  const candidatos = [];

  for (const feed of RSS_SINAIS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SenovaBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseRSS(xml)) {
        if (!item.url || urlsExistentes.has(item.url)) continue;
        if (!passaFiltroSinal(item)) continue;
        candidatos.push({ ...item, tipo: feed.tipo, data: hoje });
      }
    } catch {}
  }

  if (!candidatos.length) return { novos: 0, total: existentes.length };

  const paraAnalise = candidatos.slice(0, 5);
  const novos = [];

  for (const item of paraAnalise) {
    const analise = await analisarSinal(item, item.tipo, env);
    if (analise.relevancia === 'baixa') continue;
    novos.push({
      id: 'sinal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      titulo: item.titulo,
      url: item.url,
      tipo: item.tipo,
      data: hoje,
      nova: true,
      hunter_email: null,
      ...analise,
    });
  }

  const atualizados = [...novos, ...existentes].slice(0, 30);
  await salvarSinaisKV(env, atualizados);
  return { novos: novos.length, total: atualizados.length };
}

//
//  HANDLER PRINCIPAL
//

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    //  1. Health check 
    if (path === '/health') {
      const token = await getValidToken(env);
      const wl = await getWhitelist(env);
      return jsonResp({
        status: 'ok',
        worker: 'senova-proxy',
        versao: '6.0',
        outlook: token ? 'conectado' : 'desconectado',
        whitelist_dominios: wl.length,
        idiomas: ['pt', 'en', 'es', 'de'],
      });
    }

    //  2. Proxy Claude API 
    if (path === '/api/claude' && request.method === 'POST') {
      const body = await request.json();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    //  3. Anti-ATS 
    if (path === '/api/analisar-vaga' && request.method === 'POST') {
      const { titulo, empresa, descricao } = await request.json();
      const prompt = `Você é especialista em ATS e recrutamento executivo, analisando para Marcos Franco.\n\nPERFIL:\n${PERFIL_MARCOS}\n\nVAGA:\nTítulo: ${titulo}\nEmpresa: ${empresa}\nDescrição: ${descricao}\n\nResponda APENAS em JSON:\n{"score":85,"classificacao":"candidatar","resumo":"...","pontos_fortes":["..."],"pontos_atencao":["..."],"salario_compativel":true}`;
      const texto = await claudeCall(prompt, env);
      try {
        const clean = texto.replace(/```json|```/g, '').trim();
        return jsonResp(JSON.parse(clean));
      } catch {
        return jsonResp({ score: 0, classificacao: 'analisar', resumo: 'Erro ao analisar.', pontos_fortes: [], pontos_atencao: [], salario_compativel: false });
      }
    }

    //  4. Auth Outlook — inicia OAuth 
    if (path === '/api/auth/outlook' && request.method === 'GET') {
      const params = new URLSearchParams({
        client_id: env.MS_CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: 'Mail.Read Calendars.ReadWrite offline_access',
        response_mode: 'query',
        prompt: 'consent',
      });
      return Response.redirect(`https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`, 302);
    }

    //  5. Auth Callback 
    if (path === '/api/auth/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) return htmlResp('<h2>Erro: código OAuth não recebido.</h2>', 400);

      const res = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.MS_CLIENT_ID,
          client_secret: env.MS_CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
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

    //  6. Desconectar Outlook 
    if (path === '/api/auth/outlook' && request.method === 'DELETE') {
      await env.SENOVA_KV.delete('outlook_token');
      return jsonResp({ ok: true, mensagem: 'Outlook desconectado.' });
    }

    //  7. Buscar e-mails 
    if (path === '/api/emails' && request.method === 'GET') {
      const token = await getValidToken(env);
      if (!token) {
        return jsonResp({ erro: 'Outlook não conectado.', reauth: true, url_auth: `${REDIRECT_URI.replace('/api/auth/callback', '')}/api/auth/outlook` }, 401);
      }

      const limite = parseInt(url.searchParams.get('limite') || '50');
      const apenasNovos = url.searchParams.get('apenas_novos') !== 'false';

      // Busca emails do Outlook com corpo completo
      const msRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${limite}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,body`,
        { headers: { Authorization: `Bearer ${token}`, 'Prefer': 'outlook.body-content-type="text"' } }
      );

      if (!msRes.ok) {
        const err = await msRes.json();
        return jsonResp({ erro: 'Erro ao buscar emails', detalhes: err }, 502);
      }

      const msData = await msRes.json();
      const emails = (msData.value || []).map(e => {
        const corpo = e.body?.content || e.bodyPreview || '';
        // Extrai links do corpo
        const links = [...corpo.matchAll(/https?:\/\/[^\s"'<>)]+/g)]
          .map(m => m[0])
          .filter(l => !l.includes('unsubscribe') && !l.includes('optout') && !l.includes('tracking'))
          .slice(0, 5);
        return {
          id: e.id,
          subject: e.subject || '(sem assunto)',
          from: e.from?.emailAddress?.address || '',
          from_name: e.from?.emailAddress?.name || '',
          date: e.receivedDateTime,
          preview: (e.bodyPreview || '').slice(0, 300),
          body: corpo.slice(0, 2000),
          links,
          is_read: e.isRead,
          outlook_url: `https://outlook.live.com/mail/0/inbox`,
        };
      });

      // Filtra já vistos
      const vistos = await getVistos(env);
      const novos = apenasNovos ? emails.filter(e => !vistos.has(e.id)) : emails;

      if (!novos.length) {
        return jsonResp({ emails: [], total_lidos: emails.length, total_novos: 0, whitelist: await getWhitelist(env) });
      }

      // Para emails de vaga: busca conteúdo do link principal
      const novosComConteudo = await Promise.all(novos.map(async (e) => {
        const isVagaEmail = /linkedin\.com\/jobs|gupy|greenhouse|lever|workday|jobscore|indeed|vagas|emprego|job|career|oportunidade/i.test(e.from + e.subject + e.body);
        if (isVagaEmail && e.links.length > 0) {
          // Ignora links do LinkedIn (exigem login) e tenta outros
          const linkVaga = e.links.find(l =>
            /gupy\.io|greenhouse\.io|lever\.co|workday|jobscore|jobs\./i.test(l)
          );
          if(linkVaga) {
            try {
              const r = await fetch(linkVaga, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SenovaBot/1.0)' },
                redirect: 'follow',
                signal: AbortSignal.timeout(5000),
              });
              if (r.ok) {
                const html = await r.text();
                const texto = html
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 3000);
                return { ...e, conteudo_vaga: texto, link_vaga: linkVaga };
              }
            } catch {}
          }
          // LinkedIn e outros: usa o corpo do email diretamente
          return { ...e, conteudo_vaga: e.body || e.preview, link_vaga: e.links[0] || '' };
        }
        return { ...e, conteudo_vaga: e.body || e.preview, link_vaga: e.links[0] || '' };
      }));

      // Classifica por IA
      const whitelist = await getWhitelist(env);
      const classificados = await classificarEmails(novosComConteudo, whitelist, env);

      // Marca todos os novos como vistos
      await salvarVistos(env, novos.map(e => e.id));

      return jsonResp({
        emails: classificados,
        total_lidos: emails.length,
        total_novos: novos.length,
        total_relevantes: classificados.length,
        whitelist,
      });
    }

    //  8. Marcar emails como vistos 
    if (path === '/api/emails/marcar-visto' && request.method === 'POST') {
      const { ids } = await request.json();
      if (!Array.isArray(ids)) return jsonResp({ erro: 'ids deve ser array' }, 400);
      await salvarVistos(env, ids);
      return jsonResp({ ok: true, marcados: ids.length });
    }

    //  9. Limpar histórico de vistos 
    if (path === '/api/emails/limpar-vistos' && (request.method === 'DELETE' || request.method === 'GET')) {
      await env.SENOVA_KV.delete('emails_vistos');
      return jsonResp({ ok: true, mensagem: 'Histórico limpo. Todos os emails serão reanalisados.' });
    }

    //  10. Calendar — criar evento no Outlook
    if (path === '/api/calendar/evento' && request.method === 'POST') {
      const token = await getValidToken(env);
      if (!token) return jsonResp({ erro: 'Outlook não conectado.' }, 401);
      const { titulo, data } = await request.json();
      if (!titulo || !data) return jsonResp({ erro: 'titulo e data são obrigatórios' }, 400);
      const evento = {
        subject: titulo,
        start: { dateTime: `${data}T09:00:00`, timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: `${data}T09:30:00`, timeZone: 'America/Sao_Paulo' },
        isReminderOn: true,
        reminderMinutesBeforeStart: 30,
      };
      const res = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(evento),
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        return jsonResp({ erro: 'Erro ao criar evento', detalhe: err }, res.status);
      }
      const criado = await res.json();
      return jsonResp({ ok: true, id: criado.id });
    }

    //  11. Whitelist — listar
    if (path === '/api/whitelist' && request.method === 'GET') {
      return jsonResp({ dominios: await getWhitelist(env) });
    }

    //  11. Whitelist — adicionar 
    if (path === '/api/whitelist' && request.method === 'POST') {
      const { dominio } = await request.json();
      if (!dominio) return jsonResp({ erro: 'dominio obrigatório' }, 400);
      const lista = await getWhitelist(env);
      const dom = dominio.toLowerCase().trim();
      if (!lista.includes(dom)) {
        lista.push(dom);
        await salvarWhitelist(env, lista);
      }
      return jsonResp({ ok: true, dominios: lista });
    }

    //  12. Whitelist — remover 
    if (path === '/api/whitelist' && request.method === 'DELETE') {
      const { dominio } = await request.json();
      const lista = (await getWhitelist(env)).filter(d => d !== dominio?.toLowerCase().trim());
      await salvarWhitelist(env, lista);
      return jsonResp({ ok: true, dominios: lista });
    }

    //  13. Sinais de mercado — listar
    if (path === '/api/sinais' && request.method === 'GET') {
      return jsonResp({ sinais: await getSinaisKV(env) });
    }

    //  14. Sinais — acionar manualmente (testes)
    if (path === '/api/sinais/processar' && request.method === 'POST') {
      const resultado = await varrerSinais(env);
      return jsonResp({ ok: true, ...resultado });
    }

    //  15. Sinais — descartar
    if (path === '/api/sinais' && request.method === 'DELETE') {
      const { id } = await request.json();
      const sinais = await getSinaisKV(env);
      await salvarSinaisKV(env, sinais.filter(s => s.id !== id));
      return jsonResp({ ok: true });
    }

    //  16. Hunter.io — buscar email por domínio
    if (path === '/api/hunter' && request.method === 'POST') {
      const { dominio, sinal_id } = await request.json();
      if (!dominio) return jsonResp({ erro: 'dominio obrigatório' }, 400);
      if (!env.HUNTER_API_KEY) return jsonResp({ erro: 'HUNTER_API_KEY não configurada' }, 500);

      const res = await fetch(
        `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(dominio)}&limit=10&api_key=${env.HUNTER_API_KEY}`
      );
      const data = await res.json();
      const todos = data.data?.emails || [];

      const executivos = todos.filter(e =>
        /ceo|cmo|cso|cco|diretor|director|marketing|head|vp |chief|gerente|president/i.test(e.position || '')
      );
      const emails = (executivos.length ? executivos : todos).slice(0, 3).map(e => ({
        email: e.value,
        nome: [e.first_name, e.last_name].filter(Boolean).join(' '),
        cargo: e.position || '',
        confianca: e.confidence || 0,
      }));

      if (sinal_id && emails.length) {
        const sinais = await getSinaisKV(env);
        await salvarSinaisKV(env, sinais.map(s =>
          s.id === sinal_id ? { ...s, hunter_email: emails[0].email, hunter_nome: emails[0].nome } : s
        ));
      }

      return jsonResp({ emails, organizacao: data.data?.organization || dominio });
    }

    //  19. Leads varredura — listar
    if (path === '/api/vagas-lead' && request.method === 'GET') {
      return jsonResp({ leads: await getLeadsKV(env) });
    }

    //  20. Leads varredura — acionar manualmente (testes)
    if (path === '/api/vagas-lead/processar' && request.method === 'POST') {
      const resultado = await varrerVagas(env);
      return jsonResp({ ok: true, ...resultado });
    }

    //  21. Leads varredura — descartar
    if (path === '/api/vagas-lead' && request.method === 'DELETE') {
      const { url } = await request.json();
      const leads = await getLeadsKV(env);
      await salvarLeadsKV(env, leads.filter(l => l.url !== url));
      return jsonResp({ ok: true });
    }

    return jsonResp({ erro: 'Rota não encontrada' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([varrerVagas(env), varrerSinais(env)]));
  },
};
