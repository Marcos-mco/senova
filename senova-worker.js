// ══════════════════════════════════════════════════════════════════
//  SENOVA PROXY — Worker v7.2
//  Cloudflare Workers · senova-proxy.marcos-mco.workers.dev
//
//  NOVIDADES v7.2 (mai/2026):
//  · Rotação de países: cada cron varre 1 país por vez
//  · Ordem: BR → ES → DE → PT → Remoto → BR → ...
//  · Máx 3 queries por execução + máx 5 vagas por query
//  · Score ATS só para vagas com score estimado > 40 (filtro rápido)
//  · Resolve timeout do Cloudflare free tier (~30s CPU)
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
};

function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

// ═══════════════════════════════════════════════════════════════════
//  HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default {

  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);

    if (url.pathname === '/api/claude') {
      if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);
      const body = await request.json();
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify(body),
      });
      return json(await resp.json(), resp.status);
    }

    if (url.pathname === '/api/analisar-vaga') {
      if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);
      const { titulo, empresa, descricao } = await request.json();
      return json(await analisarVaga(titulo, empresa, descricao, env));
    }

    if (url.pathname === '/api/varredura-manual') {
      if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);
      // Manual: varre o próximo país da rotação
      ctx.waitUntil(executarVarredura(env, false));
      return json({ status: 'Varredura iniciada', timestamp: new Date().toISOString() });
    }

    // Manual forçando país específico: POST { "pais": "br" }
    if (url.pathname === '/api/varredura-pais') {
      if (request.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);
      const { pais } = await request.json();
      ctx.waitUntil(executarVarreduraPais(pais, env));
      return json({ status: `Varredura de ${pais} iniciada`, timestamp: new Date().toISOString() });
    }

    if (url.pathname === '/api/vagas-lead') {
      const raw = await env.SENOVA_KV.get('vagas_lead');
      const vagas = raw ? JSON.parse(raw) : [];
      return json({ vagas, total: vagas.length });
    }

    if (url.pathname === '/api/vagas-lead/clear' && request.method === 'POST') {
      await env.SENOVA_KV.put('vagas_lead', JSON.stringify([]));
      return json({ status: 'ok' });
    }

    // /api/vagas-lead/score — atualiza score de uma vaga no KV
    if (url.pathname === '/api/vagas-lead/score' && request.method === 'POST') {
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

    if (url.pathname === '/api/config-varredura' && request.method === 'GET') {
      const raw = await env.SENOVA_KV.get('config_varredura');
      return json(raw ? JSON.parse(raw) : CONFIG_PADRAO);
    }

    if (url.pathname === '/api/config-varredura' && request.method === 'POST') {
      const nova = await request.json();
      await env.SENOVA_KV.put('config_varredura', JSON.stringify(nova));
      return json({ status: 'Configuração salva' });
    }

    if (url.pathname === '/api/varredura-status') {
      const raw = await env.SENOVA_KV.get('varredura_status');
      return json(raw ? JSON.parse(raw) : { nunca_executada: true });
    }

    if (url.pathname === '/health') {
      return json({ status:'ok', worker:'senova-proxy', versao:'7.2' });
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
  // Descobre qual país é o próximo na rotação
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

  // Seleciona o país desta execução
  const localAtual = locaisAtivos[idx % locaisAtivos.length];

  // Avança o índice para a próxima execução
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
    // Máx 3 queries por execução para não estourar CPU
    const queries = (config.queries?.[idioma] || CONFIG_PADRAO.queries[idioma] || []).slice(0, 3);

    for (const query of queries) {

      // ── Adzuna (países com código mapeado, exceto remoto) ──
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

      // ── Jobicy RSS ──────────────────────────────────────────
      try {
        const vagas = await buscarJobicy(query, local);
        const novas = processarVagas(vagas, vistosSet, vagasLead, local, 'Jobicy');
        totalNovas += novas;
        log.push(`✅ Jobicy ${local.label} / "${query}" — ${vagas.length} vagas, ${novas} novas`);
      } catch (err) {
        log.push(`⚠️ Jobicy ${local.label} / "${query}" — ${err.message}`);
      }
    }

    // Salva IDs vistos (máx 2000)
    await env.SENOVA_KV.put('vagas_vistas_ids', JSON.stringify([...vistosSet].slice(-2000)));

    // Salva leads (máx 100, por score)
    await env.SENOVA_KV.put('vagas_lead',
      JSON.stringify(vagasLead.sort((a,b) => b.score - a.score).slice(0, 100))
    );

    await salvarStatus(env, {
      ultima_execucao: new Date().toISOString(),
      pais_varrido: local.label,
      duracao_ms: Date.now() - inicio,
      total_novas: totalNovas,
      log,
      status: 'ok',
    });

  } catch (err) {
    await salvarStatus(env, {
      ultima_execucao: new Date().toISOString(),
      pais_varrido: paisId,
      status: 'erro',
      erro: err.message,
      log,
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

// Filtro rápido por título — evita chamar Claude para vagas claramente irrelevantes
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
    app_id:           appId,
    app_key:          appKey,
    results_per_page: '5',
    what:             query,
    sort_by:          'date',
    max_days_old:     '3',
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${pais}/search/1?${params}`;
  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) throw new Error(`Adzuna HTTP ${resp.status}`);

  const data = await resp.json();
  return (data.results || []).map(r => ({
    titulo:    r.title || '',
    empresa:   r.company?.display_name || local.label,
    url:       r.redirect_url || '',
    descricao: r.description || '',
    local:     r.location?.display_name || local.label,
    pubDate:   r.created || '',
  })).filter(v => v.titulo && v.url);
}

// ═══════════════════════════════════════════════════════════════════
//  JOBICY RSS
// ═══════════════════════════════════════════════════════════════════
async function buscarJobicy(query, local) {
  const regiao = JOBICY_REGIOES[local.id];
  const params = new URLSearchParams({
    feed: 'job_feed',
    job_categories: 'management',
    search_keywords: query,
  });
  if (regiao) params.set('search_region', regiao);

  const resp = await fetch(`https://jobicy.com/?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SenovaBot/1.0)', 'Accept': 'text/xml' },
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

VAGA: ${titulo} | ${empresa || ''} | ${(descricao||'').slice(0,600)}

JSON: {"score":(0-100),"classificacao":("candidatar"|"analisar"|"recusar"),"resumo":"2 linhas","pontos_fortes":["p1","p2"],"pontos_atencao":["p1"],"salario_compativel":(true|false)}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-5', max_tokens:400, messages:[{role:'user',content:prompt}] }),
    });
    const data = await resp.json();
    return JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim());
  } catch {
    return { score:50, classificacao:'analisar', resumo:'Revisar manualmente.', pontos_fortes:[], pontos_atencao:[], salario_compativel:true };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════
function montarCard(vaga, local, fonte) {
  return {
    id: gerarId(vaga),
    titulo: vaga.titulo,
    empresa: vaga.empresa,
    local: vaga.local || local.label,
    url: vaga.url,
    fonte,
    descricao: (vaga.descricao||'').slice(0,500),
    score: null,
    classificacao: null,
    resumo: null,
    pontos_fortes: [],
    salario_compativel: null,
    badge: 'Nova hoje',
    criadoEm: new Date().toISOString(),
    status: 'lead',
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
