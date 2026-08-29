// GUARD — o canal de vagas que não custa nada: feeds escritos pelo usuário (S54, 29/ago/2026).
//
// A varredura paga foi desligada em 23/ago. O que sobrou (e-mail) traz só o que os alertas já
// assinados mandam. Este canal devolve volume sem gastar um centavo: a pessoa cola o endereço
// do alerta que ela mesma criou, e o Senova lê. A regra que sustenta tudo é uma: NADA DE IA
// NESTE CAMINHO — se um dia alguém plugar uma chamada de análise aqui, a economia inteira que
// motivou a feature evapora e ninguém percebe até a fatura chegar.
//
// O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR é o da S52 ("guard verde com produto
// quebrado"): o parser antigo só conhecia <item> de RSS, e o alerta que se salva num buscador
// sai em Atom (<entry>, destino no atributo href). Um teste que só conferisse "existe a função
// parsearFeed" ficaria verde para sempre enquanto metade dos endereços colados devolvesse zero
// item em silêncio. Por isso aqui o parser RODA, contra os dois formatos de verdade.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// Toda função do Worker é de primeiro nível: o fim é a primeira '}' na coluna zero. Balancear
// chaves não serve aqui — assinatura com parâmetro `= {}` faria o balanço fechar no default.
function pedaco(assinatura) {
  const i = worker.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const f = worker.indexOf('\n}\n', i);
  if (f < 0) throw new Error('sem fim na coluna zero: ' + assinatura);
  return worker.slice(i, f + 2);
}
// Const de várias linhas: vai até a primeira linha que fecha na coluna zero.
function constMultilinha(assinatura) {
  const i = worker.indexOf(assinatura);
  if (i < 0) throw new Error('não achei: ' + assinatura);
  const f = worker.indexOf('\n);\n', i);
  if (f < 0) throw new Error('sem fim: ' + assinatura);
  return worker.slice(i, f + 4);
}
function linhaConst(nome) {
  const m = worker.match(new RegExp('^const ' + nome + ' += .*$', 'm'));
  if (!m) throw new Error('não achei a constante ' + nome);
  return m[0];
}

const caixa = new Function([
  linhaConst('MAX_FEEDS_USUARIO'),
  linhaConst('ITENS_POR_FEED'),
  linhaConst('JANELA_FEED_DIAS'),
  linhaConst('NOVAS_POR_COLHEITA_FEED'),
  linhaConst('VAGAS_POR_TERMO'),
  linhaConst('MAX_POR_ANUNCIANTE'),
  constMultilinha('const ENTIDADES_NOMEADAS = Object.assign('),
  pedaco('function decodeEntidades('),
  pedaco('function limparHtml('),
  pedaco('function _textoDeFeed('),
  pedaco('function extrairTag('),
  pedaco('function vagaRecente('),
  pedaco('function _desembrulharLink('),
  pedaco('function parsearFeed('),
  pedaco('function feedsDoPerfil('),
  pedaco('function gerarId('),
  pedaco('function tituloRelevante('),
  pedaco('function montarCard('),
  pedaco('function processarVagas('),
  'return { _desembrulharLink, parsearFeed, feedsDoPerfil, processarVagas, MAX_FEEDS_USUARIO, ITENS_POR_FEED, NOVAS_POR_COLHEITA_FEED };',
].join('\n'))();

const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toUTCString();
const anoPassado = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toUTCString();

// ── 1. Os DOIS formatos, rodando ───────────────────────────────────────────────
console.log('=== o parser lê RSS e Atom, porque na vida real chegam os dois ===');

const RSS = `<rss version="2.0"><channel><title>Vagas do portal</title>
  <item><title>Diretor de Marketing</title><link>https://portal.exemplo.com/v/1</link>
    <description>Descrição da vaga</description><pubDate>${ontem}</pubDate></item>
  <item><title>Gerente Comercial</title><link>https://portal.exemplo.com/v/2</link>
    <description>Outra vaga</description><pubDate>${ontem}</pubDate></item>
</channel></rss>`;

// Atom é o formato do alerta de busca salvo — <entry>, título com CDATA e HTML dentro, e o
// destino no atributo href de uma tag que nem sequer fecha.
const ATOM = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">
  <title>Alerta &#8211; diretor marketing</title>
  <entry><title type="html"><![CDATA[Diretor de <b>Marketing</b> &#8211; S&#227;o Paulo]]></title>
    <link href="https://agregador.exemplo/redir?ct=ga&amp;url=https://empresa.exemplo.com/vaga/77&amp;usg=x"/>
    <published>${ontem}</published>
    <content type="html">&lt;p&gt;Texto do an&#250;ncio&lt;/p&gt;</content></entry>
  <entry><title>Head de Growth</title>
    <link href="https://empresa2.exemplo.com/careers/9"/>
    <published>${ontem}</published><summary>Resumo</summary></entry>
</feed>`;

const doRss = caixa.parsearFeed(RSS);
t('RSS: os dois itens viram vaga', doRss.length === 2, 'saíram ' + doRss.length);
t('RSS: a URL sai do texto de <link>',
  doRss[0].url === 'https://portal.exemplo.com/v/1', doRss[0] && doRss[0].url);

const doAtom = caixa.parsearFeed(ATOM);
t('Atom: as duas entradas viram vaga — este é o caso que ficaria mudo se o parser só conhecesse <item>',
  doAtom.length === 2, 'saíram ' + doAtom.length + ' (0 significa que o Atom voltou a ser ignorado)');
t('Atom: a URL sai do ATRIBUTO href, que não tem tag de fechamento',
  doAtom[1].url === 'https://empresa2.exemplo.com/careers/9', doAtom[1] && doAtom[1].url);
t('Atom: o título vem limpo de HTML e de entidade (&#8211; vira travessão, <b> some)',
  doAtom[0].titulo === 'Diretor de Marketing – São Paulo', JSON.stringify(doAtom[0].titulo));

// O escape que o formato REAL usa — medido no código antes de publicar, não suposto. Um
// título Atom `type="html"` chega com o HTML ESCAPADO (`&lt;b&gt;`), não com a tag crua: uma
// limpeza só tira a tag primeiro e desfaz a entidade depois, e o card mostraria
// `Diretor de <b>Marketing</b>` na tela de quem está procurando emprego.
const ESCAPADO = `<feed><entry><title type="html">Diretor de &lt;b&gt;Marketing&lt;/b&gt; &#8211; S&#227;o Paulo</title>
  <link href="https://empresa.exemplo.com/v/8"/><published>${ontem}</published></entry></feed>`;
const doEscapado = caixa.parsearFeed(ESCAPADO);
t('título com HTML escapado (o caso real, não o de laboratório) chega limpo ao card',
  doEscapado[0] && doEscapado[0].titulo === 'Diretor de Marketing – São Paulo',
  JSON.stringify(doEscapado[0] && doEscapado[0].titulo));

// ── 2. O link empacotado ───────────────────────────────────────────────────────
console.log('\n=== o destino real, quando o feed empacota o link ===');
t('desembrulha o endereço que está DENTRO da query',
  doAtom[0].url === 'https://empresa.exemplo.com/vaga/77',
  'ficou no agregador em vez de chegar ao anunciante: ' + doAtom[0].url);
t('um parâmetro que aponta para o MESMO host não é desembrulhado (senão vira falso positivo)',
  caixa._desembrulharLink('https://portal.exemplo.com/vaga?voltar=https://portal.exemplo.com/lista')
    === 'https://portal.exemplo.com/vaga?voltar=https://portal.exemplo.com/lista',
  'desembrulhou um link interno de navegação e perdeu a vaga');
t('endereço sem embrulho passa intacto',
  caixa._desembrulharLink('https://empresa.exemplo.com/vaga/1') === 'https://empresa.exemplo.com/vaga/1');
// A regra olha a FORMA, nunca o nome de quem empacotou — é isso que a faz sobreviver a um
// agregador que nunca vimos (crivo de universalidade).
t('desembrulha um agregador que este código nunca viu',
  caixa._desembrulharLink('https://boletim.qualquer.co/click?d=https%3A%2F%2Fvagas.novo.pt%2F55')
    === 'https://vagas.novo.pt/55',
  'só funciona com os embrulhos que alguém listou à mão');

// ── 3. A janela e o que falta ──────────────────────────────────────────────────
console.log('\n=== o que entra e o que fica de fora ===');
const VELHO = `<rss><channel><item><title>Vaga antiga</title><link>https://x.exemplo/1</link>
  <pubDate>${anoPassado}</pubDate></item></channel></rss>`;
t('item fora da janela não entra', caixa.parsearFeed(VELHO).length === 0);
const SEM_DATA = `<rss><channel><item><title>Vaga sem data</title><link>https://x.exemplo/2</link></item></channel></rss>`;
t('item SEM data entra — ausência de data não é prova de anúncio velho',
  caixa.parsearFeed(SEM_DATA).length === 1);
const SEM_LINK = `<rss><channel><item><title>Só título</title><description>nada</description></item></channel></rss>`;
t('item sem endereço não vira card (card sem link é card que não leva a lugar nenhum)',
  caixa.parsearFeed(SEM_LINK).length === 0);

// ── 4. A armadilha da empresa ──────────────────────────────────────────────────
// Aqui está a razão de `empresa` sair vazia. Preenchê-la com o rótulo do feed pareceria mais
// bonito na tela e cortaria a colheita a 3 itens, em silêncio, para sempre.
console.log('\n=== por que `empresa` fica vazia quando o feed não a traz ===');
t('o parser nunca inventa empresa', caixa.parsearFeed(ATOM).every(v => v.empresa === ''),
  'voltou a preencher empresa com algo que o feed não disse');

function colhe(itens) {
  const lead = [];
  const local = { id: 'feed:x', label: '', canal: 'x', maxPorTermo: 20, semFiltroCargo: true };
  return { n: caixa.processarVagas(itens, new Set(), lead, local, 'feed'), lead };
}
const seis = n => Array.from({ length: 6 }, (_, i) => ({
  titulo: 'Vaga ' + i, url: 'https://e.exemplo/' + i, descricao: '', local: '', empresa: n,
}));
t('com empresa vazia, os 6 anúncios entram', colhe(seis('')).n === 6);
t('com o rótulo do feed no lugar da empresa, só 3 entrariam — a armadilha é real, não teórica',
  colhe(seis('Alerta de busca')).n === 3,
  'o teto por anunciante mudou: reavaliar se `empresa` vazia ainda é necessário');

// ── 5. A lista do Perfil ───────────────────────────────────────────────────────
console.log('\n=== os endereços vêm do Perfil, um por linha ===');
t('linha que não é endereço é descartada',
  caixa.feedsDoPerfil({ feeds: 'https://a.exemplo/f\nisto não é uma url\n  https://b.exemplo/f  ' })
    .join('|') === 'https://a.exemplo/f|https://b.exemplo/f');
t('Perfil sem o campo devolve lista vazia, nunca quebra',
  caixa.feedsDoPerfil(null).length === 0 && caixa.feedsDoPerfil({}).length === 0);
t('há teto de endereços',
  caixa.feedsDoPerfil({ feeds: Array.from({ length: 30 }, (_, i) => 'https://f.exemplo/' + i).join('\n') })
    .length === caixa.MAX_FEEDS_USUARIO);

// ── 6. A regra que sustenta a feature inteira ──────────────────────────────────
console.log('\n=== NADA DE IA NESTE CAMINHO (é a feature toda) ===');
const colheita = pedaco('async function colherFeedsDoUsuario(');
t('a colheita não chama a Anthropic', !/anthropic/i.test(colheita),
  'entrou chamada de IA no canal que existe justamente por não custar nada');
t('a colheita não pontua nem classifica com IA',
  !/(analisarVaga|classificar|chamarClaude|registrarCusto)\s*\(/.test(colheita),
  'a colheita passou a gastar por vaga colhida — a economia que motivou a feature acabou');
t('e o card nasce SEM nota, para a nota continuar dependendo do gesto no card',
  /score: null/.test(pedaco('function montarCard(')),
  'card de feed passou a nascer com nota: a permissão deixou de viajar no card (S53)');

// ── 7. A porta única e o gancho que roda ───────────────────────────────────────
console.log('\n=== endereço colado por gente é endereço de fora ===');
t('a colheita sai pela porta única, nunca por fetch próprio',
  /await fetchExterno\(/.test(colheita) && !/await fetch\(/.test(colheita),
  'a colheita abriu porta de saída própria — foi exatamente o buraco fechado na v7.61');
t('a rota manual tem rateLimit',
  /\/api\/feeds\/colher[\s\S]{0,400}?rateLimit\(request, env/.test(worker),
  'gatilho de saída externa sem teto de chamadas (S52)');

// O gancho tem de estar no cron que REALMENTE roda. O ramo `0 10 * * *` foi desligado de
// propósito em 23/ago (commit d7b92e8) — pendurar a colheita lá seria escrevê-la para nunca
// executar, e o status diria "nunca executada" sem ninguém entender por quê.
const agenda = fs.readFileSync(path.join(__dirname, '..', 'wrangler.toml'), 'utf8');
const cronsAtivos = (agenda.match(/^\s*crons\s*=\s*\[([^\]]*)\]/m) || [, ''])[1];
t('o cron da varredura paga continua desligado (decisão de 23/ago)',
  !/0 10 \* \* \*/.test(cronsAtivos),
  'a varredura paga voltou a rodar — se foi de propósito, este teste é que precisa mudar');
const gancho = (worker.match(/async scheduled\([\s\S]*?\n  \},/) || [''])[0];
t('a colheita de feeds está pendurada no ramo que a agenda de fato dispara',
  /else[\s\S]*colherFeedsDoUsuario\(env\)/.test(gancho),
  'a colheita ficou num ramo que nenhum cron ativo aciona: código escrito para nunca rodar');

// ── 8. O freio da rodada, e o recibo que não guarda o endereço ─────────────────
console.log('\n=== o freio global, e o recibo que não guarda o endereço ===');
// Sem freio global, 10 endereços × 20 itens = 200 cards numa rodada e 1.600 por dia — 20x o
// volume da varredura que Marcos desligou em 23/ago justamente por despejar demais (~80/dia).
// O teto por feed sozinho não segura isso: ele é por feed. Achado pelo crivo de viabilidade.
t('o teto da rodada existe e vale MENOS que o teto estrutural (endereços × itens)',
  caixa.NOVAS_POR_COLHEITA_FEED > 0
  && caixa.NOVAS_POR_COLHEITA_FEED < caixa.MAX_FEEDS_USUARIO * caixa.ITENS_POR_FEED,
  'o freio da rodada sumiu ou virou maior que o teto estrutural: não freia nada');
t('atingido o teto, a colheita para de gastar saída externa nos endereços seguintes',
  /novas >= NOVAS_POR_COLHEITA_FEED/.test(colheita),
  'o freio virou constante sem leitor — o padrão de defeito da S49');
t('e o endereço em curso só pode trazer o que ainda cabe na rodada',
  /maxPorTermo: Math\.max\(0, Math\.min\(ITENS_POR_FEED, NOVAS_POR_COLHEITA_FEED - novas\)\)/.test(colheita),
  'o último endereço da rodada voltou a poder estourar o teto sozinho');

// O freio só vale se o funil obedecer ao teto que a colheita passa. Isto RODA o funil.
const muitos = Array.from({ length: 30 }, (_, i) => ({
  titulo: 'Vaga ' + i, empresa: '', url: 'https://portal.exemplo.com/t/' + i,
  descricao: 'Descrição', pubDate: ontem, local: '',
}));
const leadTeto = [];
const nTeto = caixa.processarVagas(muitos, new Set(), leadTeto,
  { id: 'feed:teto', label: '', canal: 'Teto', maxPorTermo: 5, semFiltroCargo: true }, 'feed');
t('o teto que a colheita passa é obedecido pelo funil (5 de 30 anúncios)',
  nTeto === 5 && leadTeto.length === 5,
  'o funil ignorou o teto por rodada: o freio existe no papel e não no dado');

// O endereço de um alerta é uma URL não-adivinhável com token: quem a tem lê a busca daquela
// pessoa. `colheita_feeds_status` é chave global de KV — guardar o endereço ali entregaria a
// busca de um usuário aos outros. A linha se identifica pela posição e pelo site, que não são
// segredo de ninguém.
const recibos = colheita.match(/porFeed\.push\([^;]*\);/g) || [];
t('todo recibo da colheita é gravado sem o endereço',
  recibos.length >= 3 && recibos.every(p => !/endereco/.test(p)),
  'o endereço do alerta voltou para o recibo em KV: é um segredo do usuário');
const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
t('e o app não tenta mostrar um endereço que o Worker não manda mais',
  !/f\.endereco/.test(app),
  'a tela lê um campo que deixou de existir: mostraria vazio sem ninguém perceber');

fim('feeds_do_usuario');
