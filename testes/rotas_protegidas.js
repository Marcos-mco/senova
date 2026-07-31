// GUARD — o que sai do Worker sem credencial é uma lista FECHADA, e a lista tem dono.
//
// Por que este teste existe. `/api/vagas-lead` viveu isenta de x-senova-key sob o rótulo
// "extensão — Fase B", catalogada como radar de vagas: dado público, exposição aceitável.
// Medido no Worker no ar em 31/jul/2026, sem credencial nenhuma: HTTP 200, 750.338 bytes,
// 399 vagas, 160 vindas da caixa de e-mail pessoal do usuário — e cada vaga levando junto o
// `resumo` e os `pontos_atencao` que a IA escreveu SOBRE A PESSOA ("confirmar se atinge o
// piso de R$8k", "pode exigir deslocamento de Curitiba", "Lacuna recente pode gerar
// questionamento sobre continuidade executiva"). O rótulo estava certo sobre o objeto e
// errado sobre o conteúdo.
//
// A regra que fica, e é geral: ANÁLISE SOBRE A PESSOA É DADO PESSOAL, mesmo quando o objeto
// analisado é público. Por isso o guard é uma lista de PERMISSÃO, não de proibição: uma lista
// do que é proibido só barra o vazamento que alguém já imaginou. Rota nova entra isenta só
// depois de alguém escrever aqui por que ela não carrega dado de ninguém.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// ── O que PODE ficar sem credencial, e o motivo de cada uma ────────────────────
// Mexer nesta lista é uma decisão de segurança, não de conveniência: escreva o motivo.
const ISENCAO_AUTORIZADA = {
  'GET /health':            'status do Worker — não lê KV de usuário nem devolve conteúdo dele',
  'GET /api/auth/outlook':  'navegação OAuth — redirect no browser, não há como injetar header',
  'GET /api/auth/callback': 'idem',
};

// Rotas que JÁ ESTIVERAM isentas e não podem voltar. Elas saíram por motivos diferentes e a
// distinção importa: /api/vagas-lead vazava dado da pessoa; as de IA gastam a chave da
// Anthropic de quem chamar (conta de terceiro paga por Marcos); /api/whitelist deixava
// qualquer um habilitar portal. Todas saíram quando a extensão aprendeu a carregar a chave.
const NUNCA_MAIS_ISENTAS = [
  'GET /api/vagas-lead', 'POST /api/vagas-lead',
  'POST /api/claude', 'POST /api/analisar-vaga', 'POST /api/sofia-parecer',
  'GET /api/whitelist', 'POST /api/whitelist',
];

// Extrai o conteúdo real do Set ROTAS_SEM_SEGREDO, ignorando linhas comentadas.
function rotasIsentas() {
  const i = worker.indexOf('const ROTAS_SEM_SEGREDO');
  if (i < 0) throw new Error('não achei ROTAS_SEM_SEGREDO no senova-worker.js');
  const fim = worker.indexOf(']);', i);
  const bloco = worker.slice(i, fim);
  const out = [];
  for (const linha of bloco.split('\n')) {
    const semComentario = linha.replace(/\/\/.*$/, '');   // '// GET /api/x' não é rota isenta
    for (const m of semComentario.matchAll(/'([A-Z]+ \/[^']*)'/g)) out.push(m[1]);
  }
  return out;
}

const isentas = rotasIsentas();

console.log('=== a lista de isenção é fechada: nada entra sem motivo escrito ===');
t('a lista foi lida do arquivo (não vazia)', isentas.length > 0, isentas.length + ' rotas');
const semMotivo = isentas.filter(r => !ISENCAO_AUTORIZADA[r]);
t('toda rota isenta tem motivo declarado neste teste', semMotivo.length === 0,
  semMotivo.length ? 'sem motivo: ' + semMotivo.join(', ') : '');

console.log('\n=== o que já foi fechado não reabre ===');
for (const r of NUNCA_MAIS_ISENTAS) {
  t(r + ' exige credencial', !isentas.includes(r));
}

console.log('\n=== nenhuma rota que serve análise da pessoa pode ser isenta ===');
// GET aqui é o que importa: é o verbo que ENTREGA o acervo. Um POST que só recebe e devolve
// (analisar-vaga) não serve o acervo de ninguém — por isso o corte é por método+path, e não
// por path, como já é no próprio Worker.
const SERVEM_ACERVO = ['/api/vagas-lead', '/api/emails', '/api/config-varredura', '/api/varredura-status'];
for (const p of SERVEM_ACERVO) {
  t('GET ' + p + ' não é isenta', !isentas.includes('GET ' + p));
}

console.log('\n=== o gate continua fail-closed ===');
// Segredo ausente nunca pode significar "aberto" (S2). Se esta linha sumir, toda a lista acima
// vira decoração: sem SENOVA_APP_SECRET configurado, o Worker liberaria tudo.
t('segredoOk NEGA quando SENOVA_APP_SECRET não está configurado',
  /if \(!env\.SENOVA_APP_SECRET\) return false;/.test(worker));
t('o gate roda antes das rotas (checa método+path, não só path)',
  /!ROTAS_SEM_SEGREDO\.has\(request\.method \+ ' ' \+ path\) && !segredoOk\(/.test(worker));

console.log('\n=== a extensão manda a chave — e não por um caminho paralelo ===');
const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
// TODA chamada da extensão ao Worker tem de passar por _fetchWorker. Um fetch() cru levaria
// 401 e o usuário veria "não deu" sem saber por quê — e é fácil um caminho novo nascer cru,
// porque `fetch(WORKER + ...)` é o que já estava escrito em seis lugares.
const cruas = [];
bg.split('\n').forEach((l, i) => {
  if (l.trim().startsWith('//')) return;
  if (!/fetch\(\s*(WORKER|`\$\{WORKER\})/.test(l)) return;   // só chamadas ao NOSSO Worker
  if (!/_fetchWorker\(/.test(l)) cruas.push((i + 1) + ': ' + l.trim().slice(0, 80));
});
t('nenhuma chamada crua ao Worker na extensão', cruas.length === 0, cruas.join(' | '));
t('_fetchWorker injeta o header x-senova-key', /headers\['x-senova-key'\] = k;/.test(bg));
t('a chave NÃO está escrita no código da extensão',
  !/senova_app_key\s*[:=]\s*['"][A-Za-z0-9_\-]{8,}/.test(bg));
t('em 401 a extensão relê a chave e tenta de novo (chave trocada no Perfil)',
  /res\.status === 401 && !jaRetentou/.test(bg));
t('a falha por falta de chave é dita em português ao usuário',
  /ERRO_SEM_CHAVE/.test(bg) && /Perfil › Integrações/.test(bg));

console.log('\n=== o limitador de uso não pode comer a cota de escrita do KV ===');
// O rate limit gravava no KV a cada chamada permitida, nas 4 rotas mais quentes. O plano free
// dá 1.000 escritas/dia e os crons gastam ~63 — o resto ia embora em proporção ao USO
// LEGÍTIMO (444 links revalidados = 444 escritas). Estourada a cota, TODA gravação do Worker
// falha em silêncio, inclusive vagas_lead e emails_vistos. Nunca mais no KV.
{
  const i = worker.indexOf('function rateLimit(');
  const corpo = worker.slice(i, worker.indexOf('\n}', i));
  t('rateLimit não grava no KV', !/SENOVA_KV\.put/.test(corpo));
  t('rateLimit não lê do KV (leitura por chamada também custa)', !/SENOVA_KV\.get/.test(corpo));
  t('o balde em memória é podado (não cresce sem fim no isolate)', /_rlBaldes\.delete\(/.test(worker));
}
// Gravar valor idêntico não é gravação, é desperdício: stats_hoje era regravado a cada
// abertura da caixa de entrada, mesmo sem e-mail novo.
t('stats do dia só é gravado quando o número muda',
  /if \(novosMax !== statsAtuais\.novos \|\| alertasMax !== statsAtuais\.alertas\)/.test(worker));

console.log('\n=== a ponte existe do lado do app ===');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
t('index.html expõe window.__senovaChaveApp para a extensão',
  /window\.__senovaChaveApp\s*=\s*function/.test(html));
t('o interceptor do app continua injetando a chave em toda chamada ao Worker',
  /init\.headers\['x-senova-key'\] = k;/.test(html));

fim('ROTAS DO WORKER · O QUE SAI SEM CREDENCIAL É LISTA FECHADA');
