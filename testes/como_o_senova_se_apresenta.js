// GUARD ÉTICO — como o Senova se apresenta quando bate na porta de outra pessoa.
//
// 25/ago/2026 (S52). Ao auditar o risco de bloqueio apareceu um header que dizia
// `Mozilla/5.0 (compatible; Googlebot/2.1)` na busca ao Google News: o Senova se
// apresentava ao Google como se fosse o robô do próprio Google. Não era volume, era
// postura — e contradiz o que está escrito na regra ética do projeto (CLAUDE.md,
// SOFIA_ALMA.md): "o Senova é símbolo de honestidade. Nada antiético, manipulador ou
// desonesto — jamais." Marcos decidiu trocar por identificação própria, aceitando o
// custo de o feed poder recusar.
//
// Este teste guarda a distinção que a decisão preserva, e que NÃO é a mesma coisa:
//   · dizer-se um robô de terceiro nomeado  → mentira sobre quem somos. Proibido.
//   · não se identificar (header de navegador) → o portal recusa robô e o Senova lê a
//     página de vaga que o usuário já podia abrir no browser dele. Permitido, e é o que
//     mantém a verificação de vaga encerrada funcionando.
const fs = require('fs'), path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const arquivos = {
  'senova-worker.js': fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8'),
  'senova-extension/background.js': fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8'),
  'senova-extension/content.js': fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8'),
  'index.html': fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'),
};

// Robôs de terceiros: dizer-se um deles é assumir a identidade de outra empresa.
const ROBOS_DE_TERCEIROS = [
  'googlebot', 'bingbot', 'msnbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'applebot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'ia_archiver', 'ahrefsbot', 'semrushbot', 'petalbot',
];

console.log('=== Nenhum lugar do Senova se diz robô de outra empresa ===');
for (const [nome, src] of Object.entries(arquivos)) {
  const linhas = src.split('\n');
  const suspeitas = [];
  linhas.forEach((l, i) => {
    if (!/user-?agent/i.test(l)) return;
    // Comentário não vai na requisição — e a história de POR QUE isto foi corrigido precisa
    // poder citar o nome errado sem o guard confundir explicação com reincidência.
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    const baixa = l.toLowerCase();
    for (const robo of ROBOS_DE_TERCEIROS) if (baixa.includes(robo)) suspeitas.push((i + 1) + ': ' + l.trim().slice(0, 90));
  });
  t(nome + ' não finge ser robô de terceiro', suspeitas.length === 0, suspeitas.join(' | '));
}

console.log('\n=== Onde o Senova se identifica, é por um nome só (ponto único) ===');
{
  const w = arquivos['senova-worker.js'];
  const decl = w.match(/const\s+UA_SENOVA\s*=\s*'([^']+)'/);
  t('existe uma constante única de identificação', !!decl, 'UA_SENOVA não encontrada');
  if (decl) {
    const ua = decl[1];
    t('o nome próprio aparece na identificação', /senovabot/i.test(ua), ua);
    t('e não carrega nome de robô de terceiro', !ROBOS_DE_TERCEIROS.some(r => ua.toLowerCase().includes(r)), ua);
    // O costume de bots pede um endereço de contato — mas o único que existe hoje carrega o
    // nome de uma pessoa, e nome de pessoa não entra em código. Fica sem, até haver domínio
    // próprio do produto. Esta asserção guarda a razão para ninguém "consertar" de volta.
    t('a identificação não carrega nome de pessoa (crivo de universalidade)', !/marcos/i.test(ua), ua);
  }
  // Identidade espalhada em N lugares é o mesmo defeito dos "N gravadores": um dia um deles
  // muda e o Senova passa a ter dois nomes.
  const literais = (w.match(/SenovaBot/g) || []).length;
  t('o nome literal "SenovaBot" aparece uma vez só, na declaração', literais === 1, literais + ' ocorrências');
  const usos = (w.match(/'User-Agent':\s*UA_SENOVA/g) || []).length;
  t('os feeds públicos usam a constante, não uma cópia', usos >= 2, usos + ' usos');
}

console.log('\n=== Feed público: o Senova se apresenta. Página de vaga: continua como navegador ===');
{
  const w = arquivos['senova-worker.js'];
  const trecho = (assinatura, tamanho = 900) => {
    const i = w.indexOf(assinatura);
    if (i < 0) return '';
    return w.slice(i, i + tamanho);
  };
  t('Google News recebe a identificação própria', /'User-Agent':\s*UA_SENOVA/.test(trecho('async function buscarGoogleNewsRSS(')));
  t('Jobicy segue com a mesma identificação', /'User-Agent':\s*UA_SENOVA/.test(trecho('https://jobicy.com/?${params}')) || /'User-Agent':\s*UA_SENOVA/.test(w));
  t('a verificação de vaga encerrada continua com header de navegador (senão o portal recusa e vaga viva vira "morta")',
    /Mozilla\/5\.0 \(Windows NT/.test(trecho('async function verificarLinkVaga(', 2500)));
}

fim('Como o Senova se apresenta');
