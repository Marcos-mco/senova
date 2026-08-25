// GUARD — "cuidado em não sermos bloqueados" (Marcos, 24/ago/2026, S52).
//
// O LinkedIn já devolveu HTTP 429 ao Senova. O enriquecimento em segundo plano da extensão
// apagava esse 429 (`if(!r.ok) return null`), tratava como "não consegui" e, como só o
// SUCESSO queimava a tentativa, o alarme de 1 minuto repetia as MESMAS 6 URLs para sempre:
// 6/min = 8.640 requisições/dia ao mesmo host, do IP de casa, ficando mais agressivo
// justamente enquanto o portal pedia para parar.
//
// Este teste mede a ponta que importa: QUANTAS REQUISIÇÕES SAEM. Não basta a função
// "tratar" o 429 — o número tem de cair.
const fs = require('fs'), vm = require('vm'), path = require('path');
const { assert } = require('./_lib');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
const { t, fim } = assert();

function extrai(a) {
  const i = src.indexOf(a);
  if (i < 0) throw new Error('nao achei no background.js: ' + a);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}

// As duas réguas são `const` de array/número — sem chaves, `extrai` não as alcança. Lidas do
// próprio arquivo por regex para que o teste guarde o VALOR REAL, não uma cópia.
const _mRecuo = src.match(/const\s+_RECUO_MIN\s*=\s*\[([^\]]*)\]/);
const _mFalhas = src.match(/const\s+_FALHAS_ATE_DESISTIR\s*=\s*(\d+)/);
const RECUO_MIN = _mRecuo ? _mRecuo[1].split(',').map(x => +x.trim()) : null;
const FALHAS_ATE_DESISTIR = _mFalhas ? +_mFalhas[1] : null;

const FUNCOES = [
  'function _hostDe(', 'function _ehRecusaDePortal(', 'async function _pausasGet(',
  'function _emPausa(', 'async function _pausaRegistrar(', 'async function _pausaLimpar(',
  'async function _falhaContar(', 'async function _tentadasGet(', 'async function _tentadasAdd(',
  'async function _linkedInLogado(', 'async function _notificarLogin(', 'async function _notificarProcessando(',
  'function _htmlToText(', 'function _metaDoJsonLd(', 'async function _buscarDescricaoGuest(',
  'async function _enriquecerUma(', 'async function enriquecerPendentes(',
];

// Monta um mundo de mentira com o Chrome de mentira — e um contador de requisições de verdade.
function mundo({ respostas = [], pendentes = [], logado = true } = {}) {
  const req = [];            // toda requisição que SAIU, na ordem
  const guardado = {};       // chrome.storage.session
  let i = 0;
  const sandbox = {
    console: { log() {}, warn() {}, error() {} }, JSON, Array, String, Object, Number, Math, Date, URL, Error, Promise,
    parseInt, isNaN, RegExp,
    APP_URL: 'https://marcos-mco.github.io/senova',
    _enriquecendo: false,
    _RECUO_MIN: RECUO_MIN, _FALHAS_ATE_DESISTIR: FALHAS_ATE_DESISTIR,
    setTimeout: (f) => { f(); return 0; },   // o throttle de 1,5s não precisa passar no relógio
    fetch: async (url) => {
      req.push(url);
      const r = respostas[Math.min(i++, respostas.length - 1)] || { status: 200, corpo: '' };
      return {
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        headers: { get: (h) => (String(h).toLowerCase() === 'retry-after' && r.retryAfter != null ? String(r.retryAfter) : null) },
        text: async () => r.corpo || '',
      };
    },
    chrome: {
      storage: { session: {
        get: async (k) => (k in guardado ? { [k]: guardado[k] } : {}),
        set: async (o) => { Object.assign(guardado, o); },
      } },
      tabs: { query: async () => [{ id: 7, url: 'https://marcos-mco.github.io/senova' }] },
      cookies: { get: async () => (logado ? { name: 'li_at' } : null) },
      scripting: { executeScript: async ({ func }) => {
        const s = String(func);
        if (s.includes('__senovaPendentesDesc')) return [{ result: pendentes }];
        if (s.includes('__senovaAtualizarDesc')) return [{ result: true }];
        return [{ result: undefined }];
      } },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(FUNCOES.map(extrai).join('\n;\n'), sandbox);
  return { sandbox, req, guardado, rodar: () => vm.runInContext('enriquecerPendentes()', sandbox) };
}

const descricaoBoa = '<div class="show-more-less-html__markup">' + 'Diretor de operações com responsabilidade sobre P&L, times multidisciplinares e expansão nacional. '.repeat(3) + '</div>';
const seisAlvos = Array.from({ length: 6 }, (_, n) => `https://www.linkedin.com/jobs/view/40000${n}`);

(async () => {

console.log('=== As réguas existem e são as que a auditoria pediu ===');
t('_RECUO_MIN existe e cresce 1 → 5 → 15 → 60 min', JSON.stringify(RECUO_MIN) === JSON.stringify([1, 5, 15, 60]), String(RECUO_MIN));
t('a recusa descansa no máximo 1 hora (nunca desiste do portal para sempre)', RECUO_MIN && RECUO_MIN[RECUO_MIN.length - 1] === 60);
t('_FALHAS_ATE_DESISTIR é 3 — mesma régua do teto de tentativas do app', FALHAS_ATE_DESISTIR === 3, String(FALHAS_ATE_DESISTIR));

console.log('\n=== 429: a rodada inteira para na PRIMEIRA recusa (era 6, tem de virar 1) ===');
{
  const m = mundo({ respostas: [{ status: 429 }], pendentes: seisAlvos });
  await m.rodar();
  t('saiu exatamente 1 requisição, não 6', m.req.length === 1, m.req.length + ' requisições');
  const p = m.guardado.senova_pausa_portal || {};
  t('a pausa foi registrada para o host que recusou', !!p['www.linkedin.com'], JSON.stringify(p));
  t('a pausa é de pelo menos 1 minuto', p['www.linkedin.com'] && p['www.linkedin.com'].ate - Date.now() >= 59000);
}

console.log('\n=== E o alarme de 1 minuto não pode furar a pausa ===');
{
  const m = mundo({ respostas: [{ status: 429 }], pendentes: seisAlvos });
  await m.rodar();
  const depoisDaPrimeira = m.req.length;
  await m.rodar();   // o alarme bate de novo, 60s depois
  await m.rodar();   // e de novo
  t('duas rodadas seguintes não geram NENHUMA requisição nova', m.req.length === depoisDaPrimeira, m.req.length + ' no total');
}

console.log('\n=== 403 e 503 contam como recusa; 404 não (é vaga que sumiu, não bloqueio) ===');
{
  for (const st of [403, 503]) {
    const m = mundo({ respostas: [{ status: st }], pendentes: seisAlvos });
    await m.rodar();
    t(`HTTP ${st} para a rodada na primeira`, m.req.length === 1, m.req.length + ' requisições');
  }
  const m404 = mundo({ respostas: [{ status: 404 }], pendentes: seisAlvos });
  await m404.rodar();
  t('HTTP 404 NÃO é bloqueio: as 6 seguem sendo tentadas', m404.req.length === 6, m404.req.length + ' requisições');
  t('404 não registra pausa de host', !(m404.guardado.senova_pausa_portal || {})['www.linkedin.com']);
}

console.log('\n=== Quando o portal diz quanto esperar, é ele quem manda ===');
{
  const m = mundo({ respostas: [{ status: 429, retryAfter: 900 }], pendentes: seisAlvos });
  await m.rodar();
  const p = m.guardado.senova_pausa_portal['www.linkedin.com'];
  t('Retry-After de 900s vale acima do recuo mínimo de 1 min', p.ate - Date.now() >= 890000, String(p.ate - Date.now()));
}
{
  const m = mundo({ respostas: [{ status: 429, retryAfter: 5 }], pendentes: seisAlvos });
  await m.rodar();
  const p = m.guardado.senova_pausa_portal['www.linkedin.com'];
  t('Retry-After curto (5s) não encurta o nosso recuo mínimo', p.ate - Date.now() >= 59000);
}
{
  const m = mundo({ respostas: [{ status: 429, retryAfter: 999999 }], pendentes: seisAlvos });
  await m.rodar();
  const p = m.guardado.senova_pausa_portal['www.linkedin.com'];
  t('Retry-After absurdo é limitado a 1 hora (portal não nos aposenta)', p.ate - Date.now() <= 3600001);
}

console.log('\n=== O recuo cresce a cada recusa e para de crescer no teto ===');
{
  const m = mundo({ respostas: [{ status: 429 }], pendentes: seisAlvos });
  const esperas = [];
  for (let n = 0; n < 5; n++) {
    m.guardado.senova_pausa_portal = Object.assign({}, m.guardado.senova_pausa_portal);
    if (m.guardado.senova_pausa_portal['www.linkedin.com']) m.guardado.senova_pausa_portal['www.linkedin.com'].ate = 0; // pausa venceu
    await m.rodar();
    const p = m.guardado.senova_pausa_portal['www.linkedin.com'];
    esperas.push(Math.round((p.ate - Date.now()) / 60000));
    t(`recusa nº${n + 1}: nível ${p.nivel}`, p.nivel === Math.min(n + 1, 4));
  }
  t('os recuos são 1 → 5 → 15 → 60 → 60 min', JSON.stringify(esperas) === JSON.stringify([1, 5, 15, 60, 60]), esperas.join('/'));
}

console.log('\n=== Um sucesso perdoa o portal (a pausa não fica presa) ===');
{
  const m = mundo({ respostas: [{ status: 200, corpo: descricaoBoa }], pendentes: [seisAlvos[0]] });
  m.guardado.senova_pausa_portal = { 'exemplo.pt': { ate: Date.now() + 600000, nivel: 3 } };
  await m.rodar();
  t('a busca aconteceu (host em pausa era outro)', m.req.length === 1);
  t('outro host em pausa não trava este', !!m.guardado.senova_pausa_portal['exemplo.pt']);
}
{
  const m = mundo({ respostas: [{ status: 429 }], pendentes: seisAlvos });
  await m.rodar();
  t('pausa gravada', !!m.guardado.senova_pausa_portal['www.linkedin.com']);
  m.guardado.senova_pausa_portal['www.linkedin.com'].ate = 0;         // venceu
  m.sandbox.fetch = async (url) => {                                   // agora o portal responde bem
    m.req.push(url);
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => descricaoBoa };
  };
  await m.rodar();
  t('depois do sucesso o host sai da lista de pausa', !m.guardado.senova_pausa_portal['www.linkedin.com'], JSON.stringify(m.guardado.senova_pausa_portal));
}

console.log('\n=== A pausa é por HOST, não pelo app inteiro ===');
{
  const m = mundo({ respostas: [{ status: 429 }], pendentes: seisAlvos });
  await m.rodar();
  t('só o host que recusou entra na lista', Object.keys(m.guardado.senova_pausa_portal || {}).length === 1);
  t('a chave é o host, não um nome de portal escrito no código', Object.keys(m.guardado.senova_pausa_portal)[0] === 'www.linkedin.com');
}

console.log('\n=== Falha comum (página sem descrição): 3 tentativas, não infinitas ===');
{
  const m = mundo({ respostas: [{ status: 200, corpo: '<div>vazio</div>' }], pendentes: [seisAlvos[0]] });
  await m.rodar(); await m.rodar(); await m.rodar();
  t('3 tentativas aconteceram', m.req.length === 3, m.req.length + ' requisições');
  await m.rodar(); await m.rodar();
  t('da 4ª em diante a URL descansa — o laço de 6/min acabou', m.req.length === 3, m.req.length + ' requisições');
  t('a URL foi marcada como tentada', (m.guardado.senova_enriq_tentadas || []).includes(seisAlvos[0]));
}
{
  const m = mundo({ respostas: [{ status: 200, corpo: descricaoBoa }], pendentes: [seisAlvos[0]] });
  await m.rodar();
  t('sucesso de primeira continua queimando a tentativa (comportamento antigo preservado)', (m.guardado.senova_enriq_tentadas || []).includes(seisAlvos[0]));
  await m.rodar();
  t('e não é rebuscada', m.req.length === 1);
}

console.log('\n=== Sem sessão no portal, nada sai (comportamento antigo preservado) ===');
{
  const m = mundo({ respostas: [{ status: 200, corpo: descricaoBoa }], pendentes: seisAlvos, logado: false });
  await m.rodar();
  t('não logado: zero requisições ao portal', m.req.length === 0, m.req.length + ' requisições');
}

console.log('\n=== Universalidade: quem DECIDE parar não sabe o nome de portal nenhum ===');
{
  const decisores = ['function _hostDe(', 'function _ehRecusaDePortal(', 'function _emPausa(',
                     'async function _pausaRegistrar(', 'async function _pausaLimpar(', 'async function _falhaContar('];
  for (const d of decisores) {
    const corpo = extrai(d).toLowerCase();
    const sujo = ['linkedin', 'gupy', 'indeed', 'adzuna', 'jobicy', 'brasil', 'marcos'].filter(n => corpo.includes(n));
    t(`${d.replace(/^(async )?function /, '').replace('(', '')} decide por host, sem nome de serviço`, sujo.length === 0, sujo.join(','));
  }
  t('a pausa é chaveada por _hostDe(url), não por uma lista de portais conhecidos',
    /pausas\[\s*_hostDe\(/.test(src) || /_hostDe\(url\)/.test(src));
}

console.log('\n=== O 429 não pode voltar a ser apagado ===');
{
  t('_buscarDescricaoGuest distingue recusa de "sem descrição"', /portalRecusou\s*=\s*true/.test(extrai('async function _buscarDescricaoGuest(')));
  t('_enriquecerUma deixa a recusa SUBIR em vez de engolir', /portalRecusou\)\s*throw/.test(extrai('async function _enriquecerUma(')));
  t('o laço abandona a rodada (break) ao receber recusa', /portalRecusou\)\s*\{[^}]*break;/.test(extrai('async function enriquecerPendentes(')));
  t('o throttle de 1,5s entre buscas continua no lugar', /setTimeout\(r,\s*1500\)/.test(extrai('async function enriquecerPendentes(')));
}

fim('Portal que recusa não vira laço');

})().catch(e => { console.error(e); process.exit(1); });
