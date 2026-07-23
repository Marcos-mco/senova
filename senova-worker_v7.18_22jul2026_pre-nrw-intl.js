// ══════════════════════════════════════════════════════════════════
//  SENOVA PROXY — Worker v7.17
//  Cloudflare Workers · senova-proxy.marcos-mco.workers.dev
//
//  NOVIDADES v7.14 (22/jul/2026) — Compatibilidade pesa a VIDA, não só o CV:
//  · PROJETO_DE_VIDA entra na análise ao lado do PERFIL: raiz em Curitiba,
//    piso real, querer liderar de novo, estabilidade, trabalho com sentido.
//    Vaga que afasta a pessoa do que ela quer vale menos — e diz por quê.
//  · Campo `impedimentos`: o que torna a vaga inviável (idioma que não fala,
//    presencial fora da base, salário abaixo do piso, trabalho operacional
//    sob título de diretor, exigência eliminatória). Avaliado ANTES da nota.
//  · Trava em código (não no prompt): com impedimento, a nota é limitada a 45
//    e os impedimentos entram no TOPO de pontos_atencao. O app rotula o card
//    pela faixa de nota — sem esta trava, vaga em alemão vinha como "Ótima
//    oportunidade". Fecha o gap medido na S29 (nota 72 sobre requisito
//    eliminatório operacional).
//  · Informação insuficiente agora é dita, não preenchida com invenção.
//
//  NOVIDADES v7.13 (22/jul/2026) — Busca automática destravada (Camada A):
//  · CAUSA RAIZ: a gravação do radar fazia sort((a,b)=>b.score-a.score) com
//    score null → NaN → sort não reordena → .slice(0,100) cortava justamente
//    as vagas novas (que entram no fim do array). O radar ficou congelado em
//    100 itens desde 22/jun: toda varredura gravava e jogava fora. Medido em
//    3 evidências (KV sem vaga Adzuna desde 10/jun · log do cron de 22/jul
//    com "5 novas" que não existem no KV · cenário reproduzido em node).
//    Agora: ordena por score real (sem score = -1) e recência, teto 500, e
//    NADA que entrou nas últimas 48h pode ser cortado.
//  · Log honesto: registra o que SOBREVIVEU à gravação, não o que foi achado.
//  · Brasil é varrido todo dia + 1 país rotativo (antes: 1 país a cada 5 dias).
//  · Rotação de termos de busca: pool de 8 por idioma, 5 por execução.
//  · Adzuna: 20 resultados/termo (era 5), janela 7 dias, retry em 5xx/429.
//  · Jobicy: janela de 14 dias (a de 3 dias descartava 100% do feed — medido:
//    os itens mais recentes têm 4+ dias), termos em inglês, e empresa/local/
//    descrição lidos das tags certas (job_listing:*) em vez de virem vazios.
//  · Filtro de título: blocklist (júnior/analista/product manager/engenheiro)
//    + termos executivos que faltavam (superintendente, head of, presidente).
//  · Freio de 60 vagas novas por execução: PARA DE BUSCAR (não descarta) —
//    o app analisa todas as pendentes em paralelo ao importar.
//  NOVIDADES v7.12 (10/jul/2026) — anexo no envio de candidatura:
//  · /api/emails/enviar aceita `anexos: [{ nome, conteudoBase64, tipo }]`
//    e repassa ao Graph sendMail como fileAttachment (contentBytes base64).
//    Retrocompatível: sem anexos, envia como antes. Espinha — Estação 3:
//    o CV Executivo em PDF agora vai ANEXADO, não colado como texto no corpo.
//  NOVIDADES v7.11 (09/jul/2026) — fim do "fetch silencioso":
//  · analisarVaga e classificarEmails checavam resp.ok? Não. Erro de rede/IA
//    virava resultado fake (score:50 "revisar manualmente" / e-mail inteiro
//    marcado "irrelevante" e "visto" pra sempre). Agora: resp.ok checado,
//    erro logado (console.error) e NUNCA disfarçado de resultado real —
//    vaga fica sem nota (o app já trata isso como falha e re-tenta/avisa) e
//    e-mail cujo lote falhou fica de fora de "vistos"/lidos, reaparecendo
//    como novo na próxima busca em vez de sumir.
//  NOVIDADES v7.10 (06/jul/2026) — explica queda de Compatibilidade:
//  · analisarVaga aceita scoreAnterior; se a nova nota vier MENOR, a IA
//    preenche explicacao_queda (motivo real, sem trava — a nota pode cair
//    de verdade quando a informação nova pesa contra).
//  v7.9 (06/jul/2026) — candidatura direta generalizada: cobre canal
//  (Email/WhatsApp/Telefone) + destino OU instrução pura sem canal nenhum.
//  NOVIDADES v7.8 (03/jul/2026) — Sprint 1 vazamento zero:
//  · extrairVagasEmail: extrai TODAS as vagas de e-mail multi-vaga.
//  · /api/emails alimenta o funil vagas_lead (dedup jobid/URL + relevância).
//  · /api/emails/diagnostico expõe email_vagas_stats (tamanho do vazamento).
//  v7.7 (03/jul/2026) — A1.1 costura de identidade:
//  · analisarVaga aceita perfilCandidato (fallback PERFIL_MARCOS).
//    Worker fica stateless quanto à identidade do candidato.
//  · Regra de IDIOMAS generica (le os niveis do perfil, nao crava Marcos).
//  v7.6 — S2: segredoOk fail-closed.
//  v7.5 — S1: gate de segredo por MÉTODO+path (fecha DELETE outlook/whitelist).
//  v7.4: gate x-senova-key nas rotas de escrita/dados privados.
//  v7.3: rotas OAuth Outlook + emails + calendar + whitelist.
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

// Extrai TODAS as vagas de um e-mail multi-vaga (alerta LinkedIn, newsletter…),
// não só a primeira como detectarLinkVaga. Pareia texto-âncora com href de vaga.
// URLs normalizadas (LinkedIn → /jobs/view/ID/) para dedup estável por jobid.
function extrairVagasEmail(html) {
  const out = [];
  const seen = new Set();
  const htmlStr = html || '';
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of htmlStr.matchAll(re)) {
    const href = m[1].replace(/&amp;/g, '&');
    let url = '';
    const jid = href.match(/jobid_(\d+)/i) || href.match(/linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)/i);
    if (jid) url = `https://www.linkedin.com/jobs/view/${jid[1]}/`;
    else if (JOB_URL_PATTERNS.some(p => p.test(href))) url = href;
    else {
      const r = href.match(/[?&](?:q|url)=(https?[^&]+)/i);
      if (r) {
        try {
          const alvo = decodeURIComponent(r[1]);
          const j2 = alvo.match(/jobid_(\d+)/i) || alvo.match(/jobs\/view\/(\d+)/i);
          if (j2) url = `https://www.linkedin.com/jobs/view/${j2[1]}/`;
          else if (JOB_URL_PATTERNS.some(p => p.test(alvo))) url = alvo;
        } catch {}
      }
    }
    if (!url || seen.has(url)) continue;
    const titulo = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&nbsp;/gi, ' ')
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, 120);
    if (titulo.length < 4) continue;
    seen.add(url);
    out.push({ titulo, url });
  }
  return out.slice(0, 25);
}

// Portugal NÃO está aqui de propósito: o Adzuna não cobre PT e devolvia 404 em
// toda consulta — 5 chamadas desperdiçadas a cada rodízio, com "erro" no log
// escondendo problemas de verdade. Portugal fica no Jobicy até ganhar fonte
// própria (InfoJobs/Net-Empregos entram na camada D).
const ADZUNA_PAISES = { br:'br', es:'es', de:'de', us:'us' };

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
Remuneração: alvo R$15–25k CLT, mas ACEITA a partir de R$8k — declarado por ele: "qualquer cargo aqui no Brasil que ganhe 8 mil já é bom pra mim". R$8k não é piso de sobrevivência, é oferta viável. Aceita PJ · Aceita relocação SC
Formação europeia (vale como qualificação da UE): Mestrado — Universidade de Évora, Portugal · Mestrado — Universitat de Barcelona, Espanha. Diplomas emitidos e reconhecidos dentro da União Europeia.
Aberto a: Brasil, Espanha, Alemanha, Portugal, remoto
IMPORTANTE: "Sales" = "Vendas" = "Comercial" são sinônimos — tratar como equivalentes na análise.
`.trim();

// Projeto de vida — a segunda metade da Compatibilidade. Até aqui a nota media
// vaga × currículo; faltava vaga × VIDA. Sem isto, uma vaga tecnicamente perfeita
// que afasta a pessoa do que ela quer marcava 85 e vinha rotulada "Ótima
// oportunidade" — e uma vaga em país cujo idioma ela não fala também.
// DERIVADO DA DOCUMENTAÇÃO (PERFIL_MARCOS.md, DOSSIE_SENOVA.md), não da voz dele:
// é uma primeira versão para Marcos corrigir. Como PERFIL_MARCOS, é o ponto de
// costura da identidade — multi-usuário depois só troca de quem é este bloco.
const PROJETO_DE_VIDA = `
PROJETO DE VIDA DO CANDIDATO (pesa na nota tanto quanto o currículo):
- Busca RECOLOCAÇÃO EXECUTIVA estável, não um emprego qualquer. Reserva financeira de 3–4 meses: estabilidade vale mais que salto arriscado.
- Raiz em Curitiba/PR — vida, família e comunidade estão ali. No Brasil, aceita mudar para Santa Catarina; remoto e híbrido servem. Presencial obrigatório em outra praça brasileira o afasta do que quer.
- Está aberto ao exterior — Espanha, Portugal, e Alemanha ou EUA quando o trabalho for conduzido em inglês ou espanhol. Vaga no exterior NÃO é impedimento por ser no exterior: só é impedimento pelo idioma que ele não fala.
- Remuneração: o ALVO é R$15–25k, mas R$8k no Brasil já é oferta boa para ele — palavras dele. Só é impedimento o que fica abaixo de R$8k. Entre R$8k e R$15k não é impedimento nem demérito: registre a distância para o alvo em pontos_atencao e siga.
- A FILHA MORA EM RÜTHEN, Renânia do Norte-Vestfália, Alemanha (região de Lippstadt/Soest/Paderborn). Estar perto dela é prioridade declarada, e vale por si: trabalho honesto de qualquer natureza naquela região — inclusive serviços gerais, jardinagem, marcenaria, logística, produção — serve ao projeto de vida, desde que NÃO exija alemão. Ali o critério é o idioma, não o cargo.
- Ele quer LIDERAR de novo — time, orçamento, estratégia, P&L. Esse é o alvo, não uma condição. Trabalho abaixo do porte executivo só é impedimento quando NADA mais no conjunto compensa: se aproxima da filha, ou dá residência legal na Europa, ou é o que viabiliza a vida agora, então é caminho, não retrocesso — e a análise deve dizer isso com todas as letras em vez de recusar.
- Trabalha por trabalho com sentido: honestidade, gente e construção de longo prazo. Não quer ambiente que exija agir contra a própria consciência.
- 57 anos: quer ser avaliado pela obra que fez, não gastar energia em processos onde a idade será barreira silenciosa.
`.trim();

// Pool de termos por idioma. A cada execução o Worker usa QUERIES_POR_RODADA
// termos, avançando o ponto de partida (KV `rotacao_query_idx`) — assim o pool
// inteiro é coberto ao longo dos dias sem estourar o teto de subrequests do
// Worker (2 países × 5 termos × 2 fontes = 20 fetches por execução).
const QUERIES_POR_RODADA = 5;

// Teto do radar. O corte antigo era `.slice(0, 100)` DEPOIS de um sort por score —
// e vaga nova entra com score null, então `null - null` = NaN, o sort virava no-op
// e o corte comia exatamente as novas (que ficam no fim do array). Resultado medido:
// funil parado desde 10/jun. Agora o corte é honesto (sem score vai por data) e
// qualquer vaga com menos de 48h sobrevive ao teto, até o teto absoluto.
const TETO_RADAR = 300;
const TETO_RADAR_ABSOLUTO = 500;
// Quantas vagas cada termo pode trazer por fonte (era 5 — teto teórico de 15/dia).
const VAGAS_POR_TERMO = 20;
// Freio de mão da execução: ao atingir este número de vagas novas, a varredura
// PARA DE BUSCAR (não descarta nada — o que não foi buscado não entra em `vistos`
// e reaparece na próxima rodada). Existe porque o app analisa todas as vagas
// pendentes em paralelo ao importar: sem freio, uma manhã traria centenas de
// chamadas de análise de uma vez.
const NOVAS_POR_EXECUCAO = 60;
// Freio POR FRENTE. Sem ele, o Brasil (mercado grande, varrido toda execução)
// consome sozinho as 60 vagas do freio global e a frente prioritária — a região
// da filha de Marcos — nunca chega a ser buscada.
const NOVAS_POR_FRENTE = 20;
// Quantas vagas do MESMO anunciante um único termo pode trazer.
const MAX_POR_ANUNCIANTE = 3;
// Teto de nota quando há impedimento real. O app rotula por faixa (>=75 "Ótima
// oportunidade", >=55 "Pode valer a pena"): 45 põe a vaga abaixo das duas, sem
// escondê-la — ela continua no radar, com o motivo à vista.
const TETO_SCORE_COM_IMPEDIMENTO = 45;

const CONFIG_PADRAO = {
  ativa: true,
  queries: {
    pt: ['diretor comercial','diretor de vendas','diretor de marketing','head comercial',
         'gerente geral','CMO','superintendente comercial','diretor executivo'],
    en: ['sales director','commercial director','country manager','VP sales',
         'head of business development','chief marketing officer','general manager','managing director'],
    es: ['director comercial','director de ventas','director general','jefe comercial',
         'CMO','director de marketing','country manager','director ejecutivo'],
    de: ['sales director','Vertriebsdirektor','international sales manager','commercial director',
         'Latin America manager','Geschäftsführer','Vertriebsleiter','country manager'],
  },
  locais: [
    { id:'br',     label:'Brasil',   ativo:true  },
    // Frente Rüthen — a filha de Marcos mora em Rüthen (Kreis Soest, NRW).
    // Âncora na própria Rüthen com raio de 40 km: alcança Lippstadt (21 km),
    // Soest (25 km), Paderborn (34 km) e Meschede sem puxar o cinturão do Ruhr
    // (Unna, Kamen, Bergkamen) — a 1ª colheita, ancorada em Lippstadt com 50 km,
    // trouxe exatamente esse ruído do lado oposto. Aqui o critério é o IDIOMA,
    // não o cargo: `semFiltroCargo` desliga o filtro executivo — jardinagem e
    // armazém valem tanto quanto diretoria, desde que dispensem alemão. Termos
    // próprios (não o pool executivo), janela larga e teto baixo por termo,
    // porque é mercado pequeno e a variedade importa mais que o volume.
    { id:'ruthen', label:'Rüthen e região (NRW)', ativo:true,
      adzunaPais:'de', where:'Rüthen', distanciaKm:40, diasMax:21,
      semFiltroCargo:true, semJobicy:true, maxPorTermo:4,
      queries:[
        // Primeiro os que transformam o idioma dele em qualificação — é onde
        // 30 anos de Brasil valem mais que qualquer diploma local.
        'Portugiesisch','Spanisch','Brasilien','english speaking','international',
        // Depois trabalho honesto que tende a dispensar alemão de atendimento.
        'Lagerhelfer','Produktionshelfer','Gärtner','Tischler','Hausmeister',
        'Fahrer','Reinigung','Logistik','Kommissionierer',
      ] },
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
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, x-senova-key',
};

// Segredo compartilhado: barra chamadas diretas à URL pública do Worker (CORS só
// protege o navegador, não curl/script). Rotas de escrita real (e-mail/agenda) e de
// leitura de dados privados (inbox/perfil) exigem o header x-senova-key == SENOVA_APP_SECRET.
// Isenção é por MÉTODO+path (não por path só): DELETE nunca é isento — é sempre chamada
// do app, que injeta o header. Ficam de fora só os pares que genuinamente não carregam
// header: navegação OAuth (GET, redirect no browser) e as rotas da extensão (Fase B).
// Fail-CLOSED (S2): se o segredo não estiver configurado, o gate NEGA — segredo ausente
// nunca pode significar "aberto". As rotas isentas acima seguem livres (não passam por aqui).
const ROTAS_SEM_SEGREDO = new Set([
  'GET /health',
  'POST /api/claude', 'POST /api/analisar-vaga',    // extensão — Fase B
  'GET /api/vagas-lead', 'POST /api/vagas-lead',     // extensão — Fase B
  'GET /api/whitelist', 'POST /api/whitelist',       // extensão HABILITAR_PORTAL — Fase B
  'GET /api/auth/outlook', 'GET /api/auth/callback', // navegação/OAuth (redirect no browser)
]);
function segredoOk(request, env) {
  if (!env.SENOVA_APP_SECRET) return false; // não configurado → NEGA (fail-closed, S2)
  return (request.headers.get('x-senova-key') || '') === env.SENOVA_APP_SECRET;
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// Rate limit por IP — protege o proxy de IA contra abuso (a URL do Worker é pública).
// Janela fixa simples via KV. Fail-open: se o KV falhar, não bloqueia o usuário legítimo.
async function rateLimit(request, env, limite = 40, janelaSeg = 60) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'desconhecido';
    const bucket = Math.floor(Date.now() / (janelaSeg * 1000));
    const key = `rl:${ip}:${bucket}`;
    const atual = parseInt(await env.SENOVA_KV.get(key) || '0', 10) || 0;
    if (atual >= limite) return false;
    await env.SENOVA_KV.put(key, String(atual + 1), { expirationTtl: janelaSeg * 2 });
    return true;
  } catch { return true; }
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
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0,300)}`);
      const data = await res.json();
      const texto = data.content?.[0]?.text || '';
      const parsed = JSON.parse(texto.replace(/```json|```/g,'').trim());
      parsed.resultados.forEach(r => {
        const email = lote[r.indice];
        if (!email) return;
        const cat = CATEGORIAS[r.categoria] || CATEGORIAS.irrelevante;
        resultados.push({ ...email, categoria:r.categoria, label:cat.label, emoji:cat.emoji, prioridade:cat.prioridade, resumo:r.resumo });
      });
    } catch (err) {
      console.error('classificarEmails: lote falhou, será retentado na próxima busca —', err.message);
      // Nunca marcar como 'irrelevante' por fingimento: e-mails deste lote ficam de fora de
      // "resultados" e, por isso (ver chamador), fora de "vistos"/lidos — reaparecem como
      // novos no próximo /api/emails em vez de sumirem em silêncio.
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

    // ── Gate de segredo (por método+path; DELETE nunca é isento) ─────
    if (!ROTAS_SEM_SEGREDO.has(request.method + ' ' + path) && !segredoOk(request, env)) {
      return json({ erro: 'nao_autorizado', detalhe: 'Chave de acesso ausente ou inválida.' }, 401);
    }

    // ── Health ──────────────────────────────────────────────────────
    if (path === '/health') {
      const token = await getValidToken(env);
      const wl = await getWhitelist(env);
      const statsHoje = await env.SENOVA_KV.get('stats_' + new Date().toISOString().slice(0,10), 'json') || { novos: 0, alertas: 0 };
      // Colheita de e-mail à vista: uma entrada que falha em silêncio já custou
      // 42 dias de funil morto. Se parar de rodar, tem que dar para ver aqui.
      const colheita = await env.SENOVA_KV.get('colheita_email_status', 'json');
      return json({
        status: 'ok', worker: 'senova-proxy', versao: '7.18',
        outlook: token ? 'conectado' : 'desconectado',
        auth: env.SENOVA_APP_SECRET ? 'ativo' : 'inativo',
        whitelist_dominios: wl.length,
        statsHoje,
        colheita_email: colheita || 'ainda não rodou',
      });
    }

    // ── Claude proxy ─────────────────────────────────────────────────
    if (path === '/api/claude' && request.method === 'POST') {
      if (!(await rateLimit(request, env))) return json({ error: 'Muitas requisições em pouco tempo. Aguarde um instante.' }, 429);
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
      if (!(await rateLimit(request, env))) return json({ error: 'Muitas requisições em pouco tempo. Aguarde um instante.' }, 429);
      const { titulo, empresa, descricao, contexto, perfilCandidato, scoreAnterior } = await request.json();
      return json(await analisarVaga(titulo, empresa, descricao, env, contexto, perfilCandidato, scoreAnterior));
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

    // Aceita UMA nota ou um LOTE ({itens:[…]}). O lote existe porque cada
    // chamada aqui é um ler-alterar-gravar do registro inteiro: notas enviadas
    // em paralelo se atropelavam e a última gravação apagava as outras — das
    // 280 vagas do radar, só 26 ficaram com nota. Um lote = uma gravação só.
    if (path === '/api/vagas-lead/score' && request.method === 'POST') {
      const corpo = await request.json();
      const itens = Array.isArray(corpo.itens) ? corpo.itens : [corpo];
      const raw = await env.SENOVA_KV.get('vagas_lead');
      const vagasKV = raw ? JSON.parse(raw) : [];
      const porId = new Map(vagasKV.map((v, i) => [v.id, i]));
      let atualizados = 0;
      for (const it of itens) {
        const idx = porId.get(it.id);
        if (idx === undefined) continue;
        const { score, classificacao, resumo, pontos_fortes, pontos_atencao, salario_compativel } = it;
        vagasKV[idx] = { ...vagasKV[idx], score, classificacao, resumo, pontos_fortes, pontos_atencao, salario_compativel };
        atualizados++;
      }
      if (atualizados) await env.SENOVA_KV.put('vagas_lead', JSON.stringify(vagasKV));
      return json({ status: 'ok', atualizado: atualizados > 0, atualizados });
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

      await enriquecerEmailsComHtml(emailsBase, token, isAlertaFn);

      const emails = emailsBase;

      // ── Vazamento zero: vagas escondidas em e-mail multi-vaga → funil vagas_lead ──
      await alimentarFunilComEmail(emails, env);

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
      const emailsParaClassificar = autorizado.filter(e => !isAlertaFn(e));

      // Pré-filtro: notificações sociais do LinkedIn → irrelevante sem custo de IA
      // Padrão: messaging-digest, notifications de conexão/mensagem/visualização
      const _linkedinSocialFrom = /messaging-digest-noreply@linkedin\.com|notifications@linkedin\.com/i;
      const _linkedinSocialSubj = /enviou uma mensagem|acabou de se conectar|aceitou seu convite|visualizou seu perfil|curtiu sua|comentou em|parabenizou|celebrando|aniversário|new message|has accepted|accepted your|viewed your|reacted to|commented on|birthday|new connection|connected with/i;
      const isSocialLinkedIn = e => {
        const from = (e.from || '').toLowerCase();
        const subj = (e.subject || '');
        return _linkedinSocialFrom.test(from) ||
          (from.includes('linkedin.com') && _linkedinSocialSubj.test(subj));
      };
      const socialIrrelevante = emailsParaClassificar.filter(isSocialLinkedIn)
        .map(e => ({...e, categoria:'irrelevante', label:'Social LinkedIn', emoji:'👥', prioridade:1, resumo:'Notificação social do LinkedIn'}));
      const emailsNormais = emailsParaClassificar.filter(e => !isSocialLinkedIn(e));

      const classificadosIA = await classificarEmails(emailsNormais, whitelist, env);
      const idsClassificadosIA = new Set(classificadosIA.map(e => e.id));
      // E-mails cujo lote de classificação falhou (rede/IA) não entram em classificadosIA —
      // não marcar como vistos/lidos, para reaparecerem como novos na próxima busca em vez
      // de sumirem em silêncio (ver catch em classificarEmails).
      const idsFalhaAnalise = new Set(emailsNormais.filter(e => !idsClassificadosIA.has(e.id)).map(e => e.id));
      const todoClassificados = [...classificadosIA, ...socialIrrelevante];
      // Salvar vistos APENAS para emails autorizados — emails bloqueados por consentimento
      // não devem ser marcados como vistos, para reaparecer quando o usuário autorizar a fonte.
      await salvarVistos(env, autorizado.filter(e => !idsFalhaAnalise.has(e.id)).map(e => e.id));

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

      // Marcar como lido: apenas emails autorizados (privacidade + consentimento)
      // Emails não autorizados não são marcados — reaparecem quando fonte for liberada
      // Via Graph $batch (20/subrequest) para não estourar o limite do Worker.
      const paraMarcarLido = autorizado.filter(e => !e.is_read && !idsFalhaAnalise.has(e.id));
      ctx.waitUntil((async () => {
        // 1. Marcar como lido (PATCH em lote)
        if (paraMarcarLido.length) {
          await graphBatch(token, paraMarcarLido.map((e, i) => ({
            id: String(i), method: 'PATCH',
            url: `/me/messages/${encodeURIComponent(e.id)}`,
            headers: { 'Content-Type': 'application/json' },
            body: { isRead: true },
          })));
        }
        // 2. Mover relevantes + alertas para "Lidos pelo Senova" (POST em lote)
        if (moverParaPasta) {
          const paraMovar = novos.filter(e => idsParaMover.has(e.id));
          if (paraMovar.length > 0) {
            const folderId = await getOrCreateSenovaFolder(token, env);
            if (folderId) {
              await graphBatch(token, paraMovar.map((e, i) => ({
                id: String(i), method: 'POST',
                url: `/me/messages/${encodeURIComponent(e.id)}/move`,
                headers: { 'Content-Type': 'application/json' },
                body: { destinationId: folderId },
              })));
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
      const { para, assunto, corpo, anexos } = await request.json();
      if (!para || !assunto || !corpo) return json({ erro: 'para, assunto e corpo obrigatórios' }, 400);
      // Anexos opcionais: [{ nome, conteudoBase64, tipo }]. Sem anexo, envia como antes (retrocompatível).
      const attachments = Array.isArray(anexos) ? anexos
        .filter(a => a && a.nome && a.conteudoBase64)
        .map(a => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: a.nome,
          contentType: a.tipo || 'application/pdf',
          contentBytes: a.conteudoBase64,
        })) : [];
      const message = {
        subject: assunto,
        body: { contentType: 'Text', content: corpo },
        toRecipients: [{ emailAddress: { address: para } }],
      };
      if (attachments.length) message.attachments = attachments;
      const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, saveToSentItems: true }),
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
        `https://graph.microsoft.com/v1.0/me/messages?$top=50&$filter=receivedDateTime ge ${dataMinima}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,isRead`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msData = await msRes.json();
      const emails = (msData.value || []).map(e => {
        const fromAddr = e.from?.emailAddress?.address || '';
        const fromName = e.from?.emailAddress?.name || '';
        const subj = e.subject || '';
        const autorizado = estaAutorizado({ from: fromAddr, subject: subj }, whitelist, padroesAtivos);
        return { from: fromAddr, from_name: fromName, subject: subj.slice(0, 80), autorizado, is_read: e.isRead, date: e.receivedDateTime.slice(0,16) };
      });
      const autorizadosNaoLidos = emails.filter(e => e.autorizado && !e.is_read).length;
      let vagasEmailStats = null;
      try { vagasEmailStats = await env.SENOVA_KV.get('email_vagas_stats', 'json'); } catch {}
      return json({ whitelist, padroes: padroesAtivos, autorizados_nao_lidos: autorizadosNaoLidos, vagas_email: vagasEmailStats, emails });
    }

    // ── Limpar backlog: não-lidos antigos da Caixa de Entrada ──────
    // Busca não-lidos da inbox (sem janela de data), filtra autorizados,
    // marca-lido + move via $batch. Repetível: chamar até processados=0.
    if (path === '/api/emails/limpar-backlog' && request.method === 'GET') {
      const token = await getValidToken(env);
      if (!token) return json({ erro: 'Outlook não conectado' }, 401);
      const moverParaPasta = url.searchParams.get('mover') === 'true';
      const whitelist = await getWhitelist(env);
      const padroesAtivos = await getPadroes(env);
      const folderId = moverParaPasta ? await getOrCreateSenovaFolder(token, env) : null;
      const msRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$filter=isRead eq false&$top=100&$orderby=receivedDateTime desc&$select=id,subject,from`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!msRes.ok) { const err = await msRes.json().catch(()=>null); return json({ erro: 'fetch inbox falhou', status: msRes.status, detalhes: err }, 502); }
      const msData = await msRes.json();
      const naoLidos = (msData.value || []);
      const autorizados = naoLidos
        .map(e => ({ id: e.id, from: e.from?.emailAddress?.address || '', subject: e.subject || '' }))
        .filter(e => estaAutorizado({ from: e.from, subject: e.subject }, whitelist, padroesAtivos));
      // Marcar lido
      const marcRes = autorizados.length ? await graphBatch(token, autorizados.map((e, i) => ({
        id: String(i), method: 'PATCH', url: `/me/messages/${encodeURIComponent(e.id)}`,
        headers: { 'Content-Type': 'application/json' }, body: { isRead: true },
      }))) : [];
      // Mover
      const movRes = (folderId && autorizados.length) ? await graphBatch(token, autorizados.map((e, i) => ({
        id: String(i), method: 'POST', url: `/me/messages/${encodeURIComponent(e.id)}/move`,
        headers: { 'Content-Type': 'application/json' }, body: { destinationId: folderId },
      }))) : [];
      const marc_ok = marcRes.filter(r => r.status >= 200 && r.status < 300).length;
      const mov_ok = movRes.filter(r => r.status >= 200 && r.status < 300).length;
      return json({
        inbox_nao_lidos: naoLidos.length,
        autorizados: autorizados.length,
        marcados_ok: marc_ok,
        movidos_ok: mov_ok,
        restam_aprox: naoLidos.length, // chamar de novo se ainda houver autorizados
      });
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

  // Dois crons:
  //  "0 10 * * *"   = 07:00 BRT — varredura de vagas nas fontes (Adzuna/Jobicy)
  //  "0 */3 * * *"  = de 3 em 3 horas — colhe as vagas que chegam por e-mail.
  // A colheita é frequente de propósito: alerta de vaga é perecível, e esperar
  // Marcos abrir o app custou uma candidatura já encerrada.
  async scheduled(event, env, ctx) {
    if (event.cron === '0 10 * * *') ctx.waitUntil(executarVarredura(env, true));
    else ctx.waitUntil(colherVagasDeEmail(env));
  },
};

// ═══════════════════════════════════════════════════════════════════
//  COLHEITA DE VAGAS NO E-MAIL
//  Estas três funções eram um trecho solto dentro de GET /api/emails, o que
//  significava que uma vaga só existia no Senova quando Marcos abrisse o app.
//  Medido em 22/jul: alerta do LinkedIn chegou 21/07 23:42 e a vaga entrou no
//  radar 22/07 15:26 — 15h44 de atraso, tempo suficiente para a candidatura
//  fechar. Agora o cron colhe sozinho, e a rota continua usando o mesmo código.
// ═══════════════════════════════════════════════════════════════════
const JOB_FROM_PATTERN = /linkedin|gupy|greenhouse|lever|workday|indeed|michaelpage|roberthalf|catho|vagas\.com|empregos\.com|infojobs|jobscore/i;
const JOB_SUBJ_PATTERN = /vaga|emprego|oportunidade|job|career|position|role|hiring|processo seletivo/i;
const HTML_CAP = 20;

function isAlertaFn(e) {
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
}

// Fetch HTML individual só para e-mails com aparência de vaga — o texto puro do
// Graph perde os hrefs, e é neles que moram as vagas do alerta multi-vaga.
// Cap de subrequests: o prefixo síncrono do .map serializa o contador, então o
// limite é respeitado mesmo com execução concorrente.
async function enriquecerEmailsComHtml(emails, token, ehAlerta = isAlertaFn) {
  let _htmlCount = 0;
  await Promise.allSettled(emails.map(async e => {
    const mightBeVaga = JOB_FROM_PATTERN.test(e.from) || JOB_SUBJ_PATTERN.test(e.subject);
    const isAlerta = ehAlerta(e);
    if (!mightBeVaga && !isAlerta) return;
    if (_htmlCount >= HTML_CAP) return;
    _htmlCount++;
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
      if (mightBeVaga) e.vagas_extraidas = extrairVagasEmail(html);
    } catch {}
  }));
  return _htmlCount;
}

// Alimenta o MESMO funil da varredura. Dedup por id (jobid/URL) via
// vagas_vistas_ids; filtro de relevância; score e gate por limiar acontecem no
// cliente. Best-effort: encapsulado, nunca derruba quem a chamou.
async function alimentarFunilComEmail(emails, env) {
  try {
    const rawLead = await env.SENOVA_KV.get('vagas_lead');
    const vagasLead = rawLead ? JSON.parse(rawLead) : [];
    const rawVistos = await env.SENOVA_KV.get('vagas_vistas_ids');
    const vistosSet = new Set(rawVistos ? JSON.parse(rawVistos) : []);
    const idsLead = new Set(vagasLead.map(v => v.id));
    let extraidas = 0, novasLead = 0, emailsMulti = 0;
    for (const e of emails) {
      const vs = e.vagas_extraidas || [];
      if (vs.length > 1) emailsMulti++;
      for (const v of vs) {
        extraidas++;
        const id = gerarId({ titulo: v.titulo, empresa: '', url: v.url });
        if (vistosSet.has(id) || idsLead.has(id)) continue;   // dedup jobid/URL
        if (!tituloRelevante(v.titulo)) continue;             // filtra ruído
        vistosSet.add(id); idsLead.add(id);
        vagasLead.push({
          id, titulo: v.titulo, empresa: '', local: 'Brasil', url: v.url,
          descricao: '', canal: 'Email', fonte: 'email_alerta',
          data: new Date().toLocaleDateString('pt-BR'),
          score: null, resumo: '', pontos_fortes: [], pontos_atencao: [],
          forma_candidatura: '', badge: 'Email',
          criadoEm: new Date().toISOString(), status: 'lead',
        });
        novasLead++;
      }
    }
    if (novasLead > 0) {
      // Mesmo corte honesto da varredura: nada das últimas 48h é descartado.
      // O `slice(-250)` antigo cortava pela ponta e podia jogar fora vaga boa.
      await env.SENOVA_KV.put('vagas_lead', JSON.stringify(cortarRadar(vagasLead)));
      await env.SENOVA_KV.put('vagas_vistas_ids', JSON.stringify([...vistosSet].slice(-5000)));
    }
    await env.SENOVA_KV.put('email_vagas_stats', JSON.stringify({
      ultima: new Date().toISOString(),
      emails_multivaga: emailsMulti,
      vagas_extraidas: extraidas,
      vagas_novas_lead: novasLead,
    }));
    return { extraidas, novasLead, emailsMulti };
  } catch (err) {
    return { erro: err.message };
  }
}

// Colheita agendada. Faz SÓ o que precisa ser feito na hora: buscar, abrir o
// HTML dos que têm cara de vaga e alimentar o funil. NÃO classifica com IA, NÃO
// marca como visto, NÃO move de pasta — se mexesse nisso, o e-mail sumiria da
// tela de Marcos antes de ele ler. A rota /api/emails continua dona disso.
async function colherVagasDeEmail(env) {
  const inicio = Date.now();
  try {
    const token = await getValidToken(env);
    if (!token) {
      await env.SENOVA_KV.put('colheita_email_status', JSON.stringify({
        quando: new Date().toISOString(), status: 'sem_token',
        detalhe: 'Outlook desconectado — reconectar em Configurações',
      }));
      return;
    }
    const dataMinima = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0,10) + 'T00:00:00Z';
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=60&$filter=receivedDateTime ge ${dataMinima}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview`,
      { headers: { Authorization: `Bearer ${token}`, 'Prefer': 'outlook.body-content-type="text"' } }
    );
    if (!res.ok) throw new Error('Graph HTTP ' + res.status);
    const data = await res.json();
    const emails = (data.value || []).map(e => ({
      id: e.id, subject: e.subject || '',
      from: e.from?.emailAddress?.address || '',
      date: e.receivedDateTime,
    }));
    // Sem esta memória o teto de 20 aberturas viraria vazamento permanente: a
    // ordem é sempre a mesma (mais recente primeiro), então o 21º e-mail da
    // janela nunca seria aberto — as vagas dele se perderiam para sempre.
    // Guardando quem já foi colhido, cada rodada abre os 20 seguintes e o
    // acúmulo se esvazia em poucas horas.
    const rawColhidos = await env.SENOVA_KV.get('emails_colhidos_ids');
    const colhidos = new Set(rawColhidos ? JSON.parse(rawColhidos) : []);
    const pendentes = emails.filter(e => !colhidos.has(e.id));

    const abertos = await enriquecerEmailsComHtml(pendentes, token);
    const r = await alimentarFunilComEmail(pendentes, env);

    // Só marca como colhido o que foi REALMENTE aberto (tem o campo preenchido).
    // O que não chegou a ser aberto volta na próxima rodada.
    for (const e of pendentes) {
      if ('vagas_extraidas' in e || 'artigos' in e) colhidos.add(e.id);
    }
    await env.SENOVA_KV.put('emails_colhidos_ids', JSON.stringify([...colhidos].slice(-2000)));

    await env.SENOVA_KV.put('colheita_email_status', JSON.stringify({
      quando: new Date().toISOString(), status: 'ok',
      emails_na_janela: emails.length,
      pendentes_de_colheita: pendentes.length, emails_abertos: abertos,
      vagas_extraidas: r.extraidas, vagas_novas: r.novasLead,
      duracao_ms: Date.now() - inicio,
    }));
  } catch (err) {
    await env.SENOVA_KV.put('colheita_email_status', JSON.stringify({
      quando: new Date().toISOString(), status: 'erro', erro: err.message,
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════
//  VARREDURA COM ROTAÇÃO DE PAÍSES
// ═══════════════════════════════════════════════════════════════════
// Corte honesto do radar, usado por TODO caminho que grava vagas_lead (varredura
// e colheita de e-mail). Sem score vale -1 na ordenação, mas isso nunca é motivo
// de descarte; empate desempata por recência; e nada das últimas 48h pode ser
// cortado — vaga nova jamais é jogada fora em silêncio. Foi o corte antigo
// (`sort(b.score-a.score).slice(0,100)`) que matou o funil por 42 dias.
function cortarRadar(vagasLead) {
  const AGORA = Date.now();
  const ts = v => { const t = new Date(v.criadoEm || 0).getTime(); return isNaN(t) ? 0 : t; };
  const notaDe = v => (typeof v.score === 'number' && !isNaN(v.score)) ? v.score : -1;
  const ordenadas = vagasLead.slice().sort((a, b) => (notaDe(b) - notaDe(a)) || (ts(b) - ts(a)));
  const dentroDoTeto = ordenadas.slice(0, TETO_RADAR);
  const recentesCortadas = ordenadas.slice(TETO_RADAR)
    .filter(v => AGORA - ts(v) < 48 * 60 * 60 * 1000);
  return [...dentroDoTeto, ...recentesCortadas].slice(0, TETO_RADAR_ABSOLUTO);
}

// A DEFINIÇÃO das frentes mora no código; o KV guarda só o que Marcos liga e
// desliga. Sem isso, uma frente nova (Rüthen) nunca rodaria: o `config_varredura`
// salvo no KV traz uma lista antiga de locais e sobrescreveria o padrão inteiro.
function locaisEfetivos(config) {
  const salvos = Array.isArray(config?.locais) ? config.locais : [];
  const base = CONFIG_PADRAO.locais.map(l => {
    const s = salvos.find(x => x.id === l.id);
    return s ? { ...l, ativo: s.ativo } : l; // só o liga/desliga vem do KV
  });
  const extras = salvos.filter(s => !CONFIG_PADRAO.locais.some(l => l.id === s.id));
  return [...base, ...extras];
}

async function executarVarredura(env, isCron) {
  const rawIdx = await env.SENOVA_KV.get('rotacao_idx');
  let idx = rawIdx ? parseInt(rawIdx) : 0;

  const rawConfig = await env.SENOVA_KV.get('config_varredura');
  const config = rawConfig ? JSON.parse(rawConfig) : CONFIG_PADRAO;

  if (!config.ativa) {
    await salvarStatus(env, { ativa: false, msg: 'Varredura desativada' });
    return;
  }

  const locaisAtivos = locaisEfetivos(config).filter(l => l.ativo);
  if (locaisAtivos.length === 0) return;

  // Frentes FIXAS, varridas toda execução: Brasil (mercado principal) e Rüthen
  // (prioridade declarada — estar perto da filha). As demais seguem em rodízio,
  // 1 por dia. Uma prioridade que só é varrida a cada 5 dias não é prioridade.
  const FRENTES_FIXAS = ['br', 'ruthen'];
  const fixos = locaisAtivos.filter(l => FRENTES_FIXAS.includes(l.id));
  const rotativos = locaisAtivos.filter(l => !FRENTES_FIXAS.includes(l.id));
  const alvos = fixos.map(l => l.id);
  if (rotativos.length) {
    alvos.push(rotativos[idx % rotativos.length].id);
    await env.SENOVA_KV.put('rotacao_idx', String((idx + 1) % rotativos.length));
  }
  if (!alvos.length) alvos.push(locaisAtivos[0].id);

  await executarVarreduraPais(alvos, env, config);
}

async function executarVarreduraPais(paisId, env, config) {
  const inicio = Date.now();
  const log = [];
  let totalNovas = 0;
  const paises = Array.isArray(paisId) ? paisId : [paisId];

  try {
    if (!config) {
      const raw = await env.SENOVA_KV.get('config_varredura');
      config = raw ? JSON.parse(raw) : CONFIG_PADRAO;
    }

    const locaisConfig = locaisEfetivos(config);

    const rawVistos = await env.SENOVA_KV.get('vagas_vistas_ids');
    const vistosSet = new Set(rawVistos ? JSON.parse(rawVistos) : []);

    const rawLead = await env.SENOVA_KV.get('vagas_lead');
    const vagasLead = rawLead ? JSON.parse(rawLead) : [];
    const totalAntes = vagasLead.length;

    // Rotação de termos: cobre o pool inteiro ao longo dos dias sem estourar
    // o teto de subrequests numa única execução.
    const rawQIdx = await env.SENOVA_KV.get('rotacao_query_idx');
    const qIdx = rawQIdx ? parseInt(rawQIdx) || 0 : 0;

    let freado = false;
    for (const pid of paises) {
      if (totalNovas >= NOVAS_POR_EXECUCAO) { freado = true; break; }
      const local = locaisConfig.find(l => l.id === pid) || { id: pid, label: pid };
      // Uma frente pode trazer os próprios termos (Rüthen busca ofícios e sinais
      // de "sem alemão", não o pool executivo). Como ela só consulta o Adzuna,
      // cabe o dobro de termos por rodada dentro do mesmo orçamento de rede.
      let queries;
      if (Array.isArray(local.queries) && local.queries.length) {
        const n = Math.min(QUERIES_POR_RODADA * 2, local.queries.length);
        queries = Array.from({ length: n }, (_, i) => local.queries[(qIdx + i) % local.queries.length]);
      } else {
        const idioma = idiomaDoLocal(pid);
        const pool = CONFIG_PADRAO.queries[idioma] || []; // sempre do código — KV só guarda score/locais
        queries = pool.length
          ? Array.from({ length: Math.min(QUERIES_POR_RODADA, pool.length) },
                       (_, i) => pool[(qIdx + i) % pool.length])
          : [];
      }

      let novasDaFrente = 0;
      const usaAdzuna = pid !== 'remoto' && (local.adzunaPais || ADZUNA_PAISES[pid]);
      for (const query of queries) {
        if (totalNovas >= NOVAS_POR_EXECUCAO) { freado = true; break; }
        if (novasDaFrente >= NOVAS_POR_FRENTE) {
          log.push(`⏸️ ${local.label}: ${NOVAS_POR_FRENTE} novas nesta frente — o restante volta amanhã`);
          break;
        }
        if (usaAdzuna) {
          try {
            const vagas = await buscarAdzuna(query, local, env);
            const novas = processarVagas(vagas, vistosSet, vagasLead, local, 'Adzuna');
            totalNovas += novas; novasDaFrente += novas;
            log.push(`✅ Adzuna ${local.label} / "${query}" — ${vagas.length} vagas, ${novas} novas`);
          } catch (err) {
            log.push(`⚠️ Adzuna ${local.label} / "${query}" — ${err.message}`);
          }
        }
        // Feed global de remoto não serve a uma frente local: quem procura
        // trabalho perto de Rüthen não vai atrás de vaga remota no mundo.
        if (local.semJobicy) continue;
        try {
          const vagas = await buscarJobicy(query, local);
          const novas = processarVagas(vagas, vistosSet, vagasLead, local, 'Jobicy');
          totalNovas += novas; novasDaFrente += novas;
          log.push(`✅ Jobicy ${local.label} / "${query}" — ${vagas.length} vagas, ${novas} novas`);
        } catch (err) {
          log.push(`⚠️ Jobicy ${local.label} / "${query}" — ${err.message}`);
        }
      }
    }

    if (freado) log.push(`⏸️ Freio da execução: ${NOVAS_POR_EXECUCAO} vagas novas atingidas — o restante volta na próxima rodada`);

    const poolMax = Math.max(...Object.values(CONFIG_PADRAO.queries).map(q => q.length));
    await env.SENOVA_KV.put('rotacao_query_idx', String((qIdx + QUERIES_POR_RODADA) % poolMax));

    // ── Gravação honesta do radar ────────────────────────────────────
    // O corte antigo (`sort(b.score-a.score).slice(0,100)`) descartava
    // exatamente as vagas novas: sem score, `null - null` = NaN, o sort não
    // reordenava nada e as recém-chegadas (no fim do array) caíam fora do
    // slice. Agora: sem score vale -1 na ordenação (mas nunca é motivo de
    // descarte), empate desempata por recência, e nada das últimas 48h pode
    // ser cortado — vaga nova jamais é jogada fora em silêncio.
    const finais = cortarRadar(vagasLead);
    const descartadas = vagasLead.length - finais.length;

    await env.SENOVA_KV.put('vagas_vistas_ids', JSON.stringify([...vistosSet].slice(-5000)));
    await env.SENOVA_KV.put('vagas_lead', JSON.stringify(finais));

    log.push(`📥 Radar: ${totalAntes} → ${finais.length} vagas (${totalNovas} novas gravadas${descartadas > 0 ? `, ${descartadas} antigas saíram pelo teto de ${TETO_RADAR}` : ''})`);

    await salvarStatus(env, {
      ultima_execucao: new Date().toISOString(),
      pais_varrido: paises.join(' + '),
      duracao_ms: Date.now() - inicio,
      total_novas: totalNovas,
      total_no_radar: finais.length,
      log, status: 'ok',
    });

  } catch (err) {
    await salvarStatus(env, {
      ultima_execucao: new Date().toISOString(),
      pais_varrido: paises.join(' + '),
      status: 'erro', erro: err.message, log,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PROCESSAR VAGAS — filtra duplicatas, salva brutas (sem Claude)
// ═══════════════════════════════════════════════════════════════════
function processarVagas(vagas, vistosSet, vagasLead, local, fonte) {
  let novas = 0;
  const idsLead = new Set(vagasLead.map(v => v.id));
  // Dedup por URL, não só por id. O id é um hash de título+empresa+url, então
  // qualquer mudança em como o título é lido — foi o caso ao passar a decodificar
  // "&#8211;" — muda o id e a MESMA vaga voltaria como card novo. A URL é a
  // identidade de verdade e não depende de detalhe de parsing.
  const norm = u => String(u || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  const urlsLead = new Set(vagasLead.map(v => norm(v.url)).filter(Boolean));
  // Teto por anunciante: uma agência de recrutamento em massa publica o mesmo
  // anúncio dezenas de vezes trocando a cidade. Sem este teto, um único
  // anunciante toma o radar inteiro de um termo — foi o que a primeira colheita
  // de Rüthen mostrou (20 vagas, 18 da mesma agência, todas o mesmo anúncio).
  const porEmpresa = new Map();
  const tetoTermo = local.maxPorTermo || VAGAS_POR_TERMO;
  for (const vaga of vagas.slice(0, VAGAS_POR_TERMO)) {
    if (novas >= tetoTermo) break;
    const id = gerarId(vaga);
    // Dedup por id do funil TAMBÉM — `vistos` é uma janela finita (últimos
    // 5000); sem esta checagem uma vaga que saiu dessa janela voltaria como
    // card duplicado no radar.
    const chaveUrl = norm(vaga.url);
    if (vistosSet.has(id) || idsLead.has(id) || (chaveUrl && urlsLead.has(chaveUrl))) continue;
    vistosSet.add(id);
    // `semFiltroCargo`: numa frente onde o valor é estar perto de quem se ama,
    // jardinagem e armazém valem tanto quanto diretoria. O corte ali é o idioma,
    // e quem faz esse corte é a Compatibilidade (impedimentos), não o título.
    if (!local.semFiltroCargo && !tituloRelevante(vaga.titulo)) continue;
    const chave = String(vaga.empresa || '').toLowerCase().trim();
    if (chave) {
      const qtd = porEmpresa.get(chave) || 0;
      if (qtd >= MAX_POR_ANUNCIANTE) continue;
      porEmpresa.set(chave, qtd + 1);
    }
    idsLead.add(id);
    if (chaveUrl) urlsLead.add(chaveUrl);
    vagasLead.push(montarCard(vaga, local, fonte));
    novas++;
  }
  return novas;
}

// Filtro de primeira linha (antes de qualquer custo de IA): deixa passar o que
// tem cara de posição executiva e barra o ruído que "manager"/"head" atraem —
// Product Manager, Engineering Manager, estágio, júnior, analista. O que passa
// daqui ainda é avaliado pela Compatibilidade; este filtro só evita gastar
// análise (e poluir o radar) com o que nunca seria candidatura.
function tituloRelevante(titulo) {
  if (!titulo) return false;
  const t = titulo.toLowerCase();
  const bloqueados = [
    'estágio','estagio','estagiário','estagiaria','intern','trainee','aprendiz',
    'júnior','junior','jr.',' pleno','assistente','auxiliar','analista','analyst',
    'product manager','project manager','program manager','engineering manager',
    'product owner','scrum','desenvolvedor','developer','engineer','engenheiro',
    'designer','recruiter','recrutador','estética','promotor','atendente',
  ];
  if (bloqueados.some(b => t.includes(b))) return false;
  // Alargado em 22/jul: "qualquer cargo aqui no Brasil que ganhe 8 mil já é bom
  // pra mim" (Marcos). Coordenação, supervisão e consultoria pagam essa faixa e
  // estavam sendo descartadas antes de qualquer análise. Quem julga se serve é a
  // Compatibilidade, que agora pesa o projeto de vida — não este filtro.
  const relevantes = [
    'diretor','director','diretora','head','chief','cmo','ceo','cso','coo','cro','vp ',
    'gerente','manager','marketing','comercial','negócios','negocios','presidente',
    'expansão','expansao','regional','country','general','superintendente','executive',
    'vendas','sales','ventas','venda','business development','account','geschäftsführer',
    'vertriebsleiter','vertriebsdirektor','leiter','jefe','director general','managing',
    'coordenador','coordenadora','coordinator','supervisor','supervisora','consultor',
    'especialista','encarregado','líder','lider','chefe','responsável','responsavel',
  ];
  return relevantes.some(r => t.includes(r));
}

// ═══════════════════════════════════════════════════════════════════
//  ADZUNA API
// ═══════════════════════════════════════════════════════════════════
async function buscarAdzuna(query, local, env) {
  const appId  = env.ADZUNA_APP_ID;
  const appKey = env.ADZUNA_APP_KEY;
  // adzunaPais permite uma frente apontar para um país sem ser o país inteiro
  // (Rüthen usa 'de', mas ancorada em Lippstadt com raio).
  const pais   = local.adzunaPais || ADZUNA_PAISES[local.id];

  const params = new URLSearchParams({
    app_id: appId, app_key: appKey, results_per_page: String(VAGAS_POR_TERMO),
    what: query, sort_by: 'date', max_days_old: String(local.diasMax || 7),
  });
  // Busca ancorada numa praça: mercado local pequeno pede raio, não país.
  if (local.where) {
    params.set('where', local.where);
    if (local.distanciaKm) params.set('distance', String(local.distanciaKm));
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${pais}/search/1?${params}`;
  // Retry só em transitório (429/5xx/timeout) — nunca em 4xx. O log do cron de
  // 22/jul mostrou "Adzuna HTTP 503" derrubando um termo inteiro do dia.
  let resp = null, ultimoErro = '';
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) break;
      ultimoErro = `HTTP ${resp.status}`;
      if (resp.status < 500 && resp.status !== 429) break; // erro definitivo
    } catch (e) {
      ultimoErro = e.message || 'timeout';
      resp = null;
    }
    if (tentativa === 0) await new Promise(r => setTimeout(r, 700));
  }
  if (!resp || !resp.ok) throw new Error(`Adzuna ${ultimoErro || 'sem resposta'}`);
  const data = await resp.json();
  return (data.results || []).map(r => ({
    // Mesmo tratamento do RSS: o Adzuna também devolve "&amp;" e tags soltas
    // no título e na descrição — sem isso o card mostra o código, não o texto.
    titulo: limparHtml(r.title || ''), empresa: limparHtml(r.company?.display_name || local.label),
    url: r.redirect_url || '', descricao: limparHtml(r.description || ''),
    local: limparHtml(r.location?.display_name || local.label), pubDate: r.created || '',
  })).filter(v => v.titulo && v.url);
}

// ═══════════════════════════════════════════════════════════════════
//  JOBICY RSS
// ═══════════════════════════════════════════════════════════════════
async function buscarJobicy(query, local) {
  const regiao = JOBICY_REGIOES[local.id];
  // O feed do Jobicy é global e indexado em inglês: termo em português volta
  // zero resultado (medido — o log de 22/jul tinha "0 vagas" em toda query pt).
  // Traduzimos o termo para o equivalente em inglês do pool.
  const termo = termoJobicy(query);
  const params = new URLSearchParams({ feed:'job_feed', job_categories:'management', search_keywords:termo });
  if (regiao) params.set('search_region', regiao);
  const resp = await fetch(`https://jobicy.com/?${params}`, {
    headers: { 'User-Agent':'Mozilla/5.0 (compatible; SenovaBot/1.0)', 'Accept':'text/xml' },
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) return [];
  // Janela de 14 dias: o feed publica com atraso declarado de 6h e é pouco
  // movimentado — com a janela de 3 dias, 100% dos itens era descartado
  // (medido contra o feed vivo: o item mais recente tinha 4 dias).
  return parsearRSS(await resp.text(), 'Jobicy', local, 14, VAGAS_POR_TERMO);
}

// Ponte pt/es/de → en para o feed do Jobicy (indexado em inglês).
const TERMOS_EN = {
  'diretor comercial':'commercial director', 'diretor de vendas':'sales director',
  'diretor de marketing':'marketing director', 'head comercial':'head of sales',
  'gerente geral':'general manager', 'superintendente comercial':'sales director',
  'diretor executivo':'managing director',
  'director comercial':'commercial director', 'director de ventas':'sales director',
  'director general':'general manager', 'jefe comercial':'head of sales',
  'director de marketing':'marketing director', 'director ejecutivo':'managing director',
  'vertriebsdirektor':'sales director', 'vertriebsleiter':'head of sales',
  'geschäftsführer':'managing director', 'marketingleiter':'marketing director',
};
function termoJobicy(query) {
  return TERMOS_EN[(query || '').toLowerCase()] || query;
}

// ═══════════════════════════════════════════════════════════════════
//  PARSER RSS
// ═══════════════════════════════════════════════════════════════════
// `janelaDias` e `maxItens` são parâmetros porque as duas fontes que passam por
// aqui têm ritmos diferentes: notícia é perecível (3 dias, poucos itens), feed de
// vaga não (Jobicy publica com atraso e é pouco movimentado — com 3 dias descartava
// 100% do feed, medido). As tags job_listing:* são do namespace do Jobicy; em feed
// de notícia elas simplesmente não existem e o fallback antigo continua valendo.
function parsearRSS(xml, fonte, local, janelaDias = 3, maxItens = 8) {
  const vagas = [];
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const item of items.slice(0, maxItens)) {
    // Título, empresa e local vinham crus do XML — só a descrição era limpa.
    // Por isso o travessão aparecia como "&#8211;" no card. A URL também é
    // decodificada: em XML o "&" de query string vem escapado como "&amp;".
    const titulo    = decodeEntidades(extrairTag(item, 'title') || '');
    const url       = decodeEntidades(extrairTag(item, 'link') || extrairTag(item, 'guid') || '');
    const empresa   = decodeEntidades(extrairTag(item, 'job_listing:company')
                   || extrairTag(item, 'source') || extrairTag(item, 'author') || local.label);
    const localVaga = decodeEntidades(extrairTag(item, 'job_listing:location') || '');
    const descricao = limparHtml(
      extrairTag(item, 'content:encoded') || extrairTag(item, 'description') || ''
    ).slice(0, 4000);
    const pubDate   = extrairTag(item, 'pubDate') || '';
    if (pubDate && !vagaRecente(pubDate, janelaDias)) continue;
    if (titulo && url) vagas.push({ titulo, empresa, url, descricao, pubDate, local: localVaga });
  }
  return vagas;
}

function extrairTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
         || xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

// Entidades HTML por extenso E numéricas. A versão antiga só conhecia cinco
// nomeadas, então travessão, aspa curva e afins chegavam crus à tela de Marcos
// ("Data Center Sites &#8211; Remote"). &amp; fica por último de propósito:
// desfeito antes, transformaria "&amp;#8211;" em travessão que não existia.
// Pontuação + o conjunto acentuado das quatro línguas que o radar varre
// (português, espanhol, alemão, inglês). Gerado a partir de pares "nome:letra"
// para caber numa linha por acento em vez de oitenta entradas soltas.
const ENTIDADES_NOMEADAS = Object.assign(
  { lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ndash:'–', mdash:'—',
    lsquo:'‘', rsquo:'’', ldquo:'“', rdquo:'”', hellip:'…', bull:'•',
    euro:'€', pound:'£', deg:'°', middot:'·', iexcl:'¡', iquest:'¿', szlig:'ß' },
  ...[
    ['acute','aeiouyAEIOUY','áéíóúýÁÉÍÓÚÝ'],
    ['grave','aeiouAEIOU',  'àèìòùÀÈÌÒÙ'],
    ['circ', 'aeiouAEIOU',  'âêîôûÂÊÎÔÛ'],
    ['tilde','anoANO',      'ãñõÃÑÕ'],
    ['uml',  'aeiouAEIOU',  'äëïöüÄËÏÖÜ'],
    ['cedil','cC',          'çÇ'],
  ].map(([sufixo, letras, acentuadas]) =>
    Object.fromEntries([...letras].map((l, i) => [l + sufixo, acentuadas[i]]))
  )
);
function decodeEntidades(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, nome) => ENTIDADES_NOMEADAS[nome.toLowerCase()] ?? m)
    .replace(/&amp;/g, '&');
}

function limparHtml(h) {
  return decodeEntidades(String(h || '').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}

function vagaRecente(d, janelaDias = 3) {
  try { return Date.now() - new Date(d).getTime() < janelaDias*24*60*60*1000; } catch { return true; }
}

// ═══════════════════════════════════════════════════════════════════
//  ANÁLISE ATS via Claude
// ═══════════════════════════════════════════════════════════════════
async function analisarVaga(titulo, empresa, descricao, env, contexto, perfilCandidato, scoreAnterior) {
  // Costura de identidade (A1): pontua o perfil que RECEBE. Sem perfilCandidato,
  // cai no PERFIL_MARCOS (retrocompatível — o app hoje não manda). O Worker fica
  // stateless quanto à identidade: multi-user depois só troca qual perfil chega.
  const perfil = (typeof perfilCandidato === 'string' && perfilCandidato.trim())
    ? perfilCandidato.trim() : PERFIL_MARCOS;
  const _scoreAnt = (typeof scoreAnterior === 'number' && scoreAnterior > 0) ? scoreAnterior : 0;
  const systemPrompt = `Analise compatibilidade vaga×candidato. Responda APENAS JSON sem markdown.

CANDIDATO: ${perfil}

Regime: se não encontrar CLT ou PJ explicitamente, inferir pelo contexto — vagas de grandes empresas brasileiras são geralmente CLT; vagas de consultoria ou projetos podem ser PJ ou ambos.

IDIOMAS — regra obrigatória: use os níveis de idioma DECLARADOS no perfil do CANDIDATO acima. "avançado" ≠ "fluente". Se a vaga exige fluência (fluente/nativo/bilíngue/proficient/C1/C2) num idioma em que o candidato NÃO é fluente (nível avançado ou inferior), registrar OBRIGATORIAMENTE em pontos_atencao; nunca registrar esse idioma como ponto_forte quando o requisito for fluência; nunca afirmar que o candidato "atende" a exigência de fluência nesse idioma. Idioma NÃO declarado no perfil = o candidato não fala. Vaga sediada num país cujo idioma local o candidato não fala é impedimento, salvo se a descrição deixar explícito que o trabalho é conduzido em idioma que ele fala.

${PROJETO_DE_VIDA}

IMPEDIMENTOS — avalie ANTES de pontuar. Impedimento é o que torna esta vaga inviável ou contrária ao projeto de vida acima, não um requisito que faltou. Só é impedimento o que a descrição REALMENTE sustenta:
· idioma local ou exigido que o candidato não fala;
· presença física obrigatória em praça que ele não aceita (ver projeto de vida) — estar no exterior, por si só, não é impedimento;
· remuneração declarada abaixo do piso do candidato (ver projeto de vida — o piso é baixo de propósito);
· nível do trabalho abaixo do porte dele SEM nada que compense — execução individual, operação, porta em porta, "consultor de vendas" com carteira própria, ainda que o TÍTULO diga gerente ou diretor. Julgue pelas responsabilidades, nunca pelo título. ATENÇÃO: isto NÃO é impedimento quando a vaga serve a outra prioridade do projeto de vida (proximidade da filha, residência legal na Europa, viabilizar a vida agora) — aí registre a perda de nível em pontos_atencao e siga;
· exigência eliminatória objetiva que ele não tem (registro em conselho, certificação obrigatória, formação específica).
Liste cada um em "impedimentos" em UMA frase curta (máx. 20 palavras), dizendo o que impede. Sem impedimento, devolva []. NUNCA repita um impedimento dentro de pontos_atencao — o app já mostra os dois juntos, e repetir faz a pessoa ler a mesma coisa duas vezes.

CONCISÃO: no máximo 4 pontos_fortes e 4 pontos_atencao, os que MAIS pesam, uma linha cada (máx. 20 palavras). Quem lê é um executivo decidindo em segundos, não um relatório. Nada de repetir entre si nem reexplicar o que já está no resumo.

PONTUAÇÃO: mede o encontro entre a vaga e a VIDA do candidato, não só entre a vaga e o currículo. Vaga tecnicamente compatível que o afasta do projeto de vida vale MENOS, e o motivo tem de aparecer em pontos_atencao. Vaga que serve à vida dele pesa MAIS mesmo com alguma lacuna técnica. Nada que seja impedimento pode ser listado como ponto forte.

INFORMAÇÃO INSUFICIENTE: se a descrição for curta ou vazia demais para julgar de verdade, não invente nem impedimento nem ponto forte. Diga em pontos_atencao que a avaliação foi feita com pouca informação e mantenha a nota contida — é honesto ficar em dúvida.

O campo "resumo" tem 2 linhas: a primeira diz o que é a vaga; a segunda diz, sem rodeio, o que ela faz com o projeto de vida dele — aproxima, é neutra, ou afasta.

CANDIDATURA DIRETA: identifique o canal REAL de candidatura sempre que ele NÃO for um botão de portal (LinkedIn Easy Apply, Gupy, etc.) — ou seja, sempre que a vaga só puder ser respondida por e-mail, WhatsApp ou telefone, com ou sem frase imperativa como "envie seu CV para" (inclui e-mail/contato de recrutador ou headhunter listado na descrição como forma de aplicação, mesmo em assinatura). Nesse caso extraia candidatura_direta_canal ("Email"|"WhatsApp"|"Telefone") e candidatura_direta_destino (e-mail ou telefone encontrado). Se não houver nenhum canal de candidatura fora de portal, deixe candidatura_direta_canal e candidatura_direta_destino como "". Independente do canal acima, se a vaga pedir em qualquer lugar da descrição para mencionar uma palavra, código ou fazer uma ação específica na candidatura — teste de atenção, pode estar solta, longe de "como se candidatar" — preencha candidatura_direta_instrucao com essa palavra/código/ação. Se não houver nada disso, retorne "" nos três campos.${_scoreAnt ? `

SCORE ANTERIOR desta vaga (antes do perfil complementar mais recente abaixo): ${_scoreAnt}. Se a SUA nova pontuação for MENOR que ${_scoreAnt}, preencha "explicacao_queda" com uma frase curta e direta (1 linha, tom neutro) explicando o motivo real da queda — ex.: a informação nova já constava de forma mais específica no perfil complementar; a informação é vaga demais para mudar a avaliação; ou algum requisito da vaga passou a pesar mais nesta leitura completa. Nunca invente um motivo — só descreva o que de fato pesou. Se a pontuação não diminuiu, deixe "explicacao_queda" como "".` : ''}

JSON: {"score":(0-100),"classificacao":("candidatar"|"analisar"|"recusar"),"resumo":"2 linhas","pontos_fortes":["p1","p2"],"pontos_atencao":["p1"],"impedimentos":[],"salario_compativel":(true|false),"localizacao":"cidade/estado extraído ou ''","modelo":("hibrido"|"remoto"|"presencial"|""),"regime":("CLT"|"PJ"|"ambos"|""),"candidatura_direta_canal":"canal extraído ou ''","candidatura_direta_destino":"e-mail ou telefone extraído ou ''","candidatura_direta_instrucao":"palavra/ação exigida ou ''","explicacao_queda":"motivo da queda de score ou ''"}`;

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
        temperature:0,
        max_tokens:1000,
        system:[{ type:'text', text:systemPrompt, cache_control:{ type:'ephemeral' } }],
        messages:[{ role:'user', content:`VAGA: ${titulo} | ${empresa||''} | ${(descricao||'').slice(0,4000)}${Array.isArray(contexto)&&contexto.length?'\n\nPERFIL COMPLEMENTAR DO CANDIDATO (considere na avaliação de fit e score):\n'+contexto.map(t=>'• '+t).join('\n'):''}` }]
      }),
    });
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${(await resp.text()).slice(0,300)}`);
    const data = await resp.json();
    const r = JSON.parse((data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim());

    // Trava de honestidade: impedimento não pode virar nota alta. O app decide o
    // rótulo do card pelo NÚMERO (>=75 "Ótima oportunidade", >=55 "Pode valer a
    // pena"), então sem este teto uma vaga inviável apareceria como ótima. Aqui é
    // código, não instrução — não depende de o modelo obedecer. E os impedimentos
    // entram no topo de pontos_atencao porque é esse campo que o app já mostra:
    // não existe impedimento invisível.
    const imped = Array.isArray(r.impedimentos) ? r.impedimentos.filter(i => typeof i === 'string' && i.trim()) : [];
    r.impedimentos = imped.slice(0, 4);
    r.pontos_fortes = (Array.isArray(r.pontos_fortes) ? r.pontos_fortes : []).slice(0, 4);
    let atencao = (Array.isArray(r.pontos_atencao) ? r.pontos_atencao : []).slice(0, 4);
    if (r.impedimentos.length) {
      // O modelo tende a reescrever o impedimento com outras palavras dentro de
      // pontos_atencao; comparação literal não pega. Aqui compara o CONTEÚDO
      // (palavras significativas em comum) para a pessoa não ler duas vezes.
      atencao = atencao.filter(a => !r.impedimentos.some(i => textoRepetido(a, i)));
      r.pontos_atencao = [...r.impedimentos, ...atencao].slice(0, 6);
      if (typeof r.score === 'number' && r.score > TETO_SCORE_COM_IMPEDIMENTO) r.score = TETO_SCORE_COM_IMPEDIMENTO;
      if (r.classificacao === 'candidatar') r.classificacao = 'analisar';
    } else {
      r.pontos_atencao = atencao;
    }
    return r;
  } catch (err) {
    console.error('analisarVaga falhou:', err.message);
    // Nunca fingir um resultado: score:null é honesto e cai nos guards que já existem no app
    // (mvAutoCompatCheck/mvReanalisarCompat/analisarLoteBackground/importar vagas), que tratam
    // "sem score" como falha real — avisam o usuário ou re-tentam, em vez de gravar nota falsa.
    return { erro:true, score:null, classificacao:'', resumo:'', pontos_fortes:[], pontos_atencao:[], impedimentos:[], salario_compativel:null, localizacao:'', modelo:'', regime:'', explicacao_queda:'' };
  }
}

// Duas frases dizem a mesma coisa? Compara as palavras que CARREGAM sentido
// (sem acento, sem conectivo): metade em comum já é repetição para quem lê.
// Rede de segurança do prompt — na dúvida NÃO corta, porque descartar um ponto
// legítimo custa mais ao leitor do que ver uma repetição.
const VAZIAS = new Set(['nao','sim','uma','uns','das','dos','com','sem','por','pelo','pela','que','mais','menos','muito','pode','deve','ser','esta','este','isso','ainda','tambem','entre','sobre','apenas','real','mesmo','ele','ela','seu','sua','aos','nas','nos','ate','tem','foi','vaga']);
function textoRepetido(a, b) {
  const norm = s => new Set(
    String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(p => p.length >= 3 && !VAZIAS.has(p))
      .map(p => p.slice(0, 5)) // radical tosco: "conduzida"/"conduzido" e "alemão"/"Alemanha" contam como a mesma ideia
  );
  const A = norm(a), B = norm(b);
  if (!A.size || !B.size) return false;
  let comuns = 0;
  for (const p of A) if (B.has(p)) comuns++;
  return comuns / Math.min(A.size, B.size) >= 0.5;
}

// ═══════════════════════════════════════════════════════════════════
//  PASTA OUTLOOK — "Lidos pelo Senova"
// ═══════════════════════════════════════════════════════════════════
// Graph $batch: executa até 20 requests por subrequest, em chunks.
// Reduz drasticamente o nº de subrequests (limite ~50/invocação no Worker).
async function graphBatch(token, requests) {
  const respostas = [];
  for (let i = 0; i < requests.length; i += 20) {
    const chunk = requests.slice(i, i + 20);
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/$batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        respostas.push(...(data.responses || []));
      }
    } catch {}
  }
  return respostas;
}

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
