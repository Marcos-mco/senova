// GUARD — a mesma vaga tem UM nome só, venha o copiloto por onde vier e olhe quando olhar.
//
// 31/jul/2026, dois diagnósticos de Marcos no mesmo dia, com a mesma raiz:
//
//   identidade: análise "url:https://www.linkedin.com/jobs/view/4444879003/"
//                 tela "job:4444879003"                          → NÃO casa
//   identidade: análise "url:https://www.linkedin.com/jobs/search-results/"
//                 tela "ec:vide linkdin|esses resultados foram úteis?"  → NÃO casa
//
// No primeiro, a MESMA vaga (repare no 4444879003 dos dois lados) com dois nomes. No segundo,
// numa página que mostrava "Sales Director (Brazil)" da D Prime em painel dividido, o copiloto
// batizou a vaga com mobília da tela — "Esses resultados foram úteis?" como cargo — e casou com
// um card ARQUIVADO de outra vaga, compat 52.
//
// Duas falhas, uma só natureza: a identidade dependia de QUANDO se olha e de POR ONDE se entrou,
// em vez de depender da vaga. Consequência visível: o aviso "você já se candidatou a esta vaga"
// suprimido justamente na vaga certa — que é o aviso que existe para não deixar a pessoa se
// candidatar duas vezes à mesma coisa.
//
// A régua que fica: a URL sempre soube quem era a vaga. Identidade se DERIVA do que é estável na
// página, nunca do que um pacote em trânsito por acaso trouxe.
const fs = require('fs'), vm = require('vm'), path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) {
  const i = src.indexOf(a);
  if (i < 0) throw new Error('não achei no content.js: ' + a);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}

// As URLs REAIS dos diagnósticos, com o rastreamento inteiro — é nele que a chave se perdia.
const URL_VIEW = 'https://www.linkedin.com/jobs/view/4444879003/';
const URL_SPLIT = 'https://www.linkedin.com/jobs/search-results/?currentJobId=4424367558&eBP=CwEAAAGfubEhl92U6XzwOjOeKp3FBkIwXYS-Ljywcsh&refId=hDEW3V%2FusZ2EFrldozFB9g%3D%3D&keywords=Diretor%20or%20Administrador&origin=PREFERENCES_LANDING&geoId=91000011';
const URL_BUSCA_SEM_VAGA = 'https://www.linkedin.com/jobs/search-results/';
const URL_FORA = 'https://portal-qualquer.com.br/vagas/gerente-comercial';

// Sandbox: só as funções puras de identidade. `location` e `_copilotoAnalise` são o que muda
// entre um instante e outro — é exatamente o que o teste varia.
function id(href, analise) {
  const box = {
    location: { href, hostname: new URL(href).hostname },
    _copilotoAnalise: analise || null,
    URL, console,
  };
  vm.createContext(box);
  vm.runInContext([extrai('function _jobIdDaUrl('), extrai('function _refVaga('), extrai('function _chaveVaga(')].join('\n'), box);
  return { ref: vm.runInContext('_refVaga()', box), chave: vm.runInContext('_chaveVaga()', box) };
}

console.log('=== o jobId sai da URL, nas duas formas que o LinkedIn usa ===');
{
  const box = { location: { href: 'https://www.linkedin.com/' }, URL };
  vm.createContext(box);
  vm.runInContext(extrai('function _jobIdDaUrl('), box);
  const f = u => vm.runInContext('_jobIdDaUrl(' + JSON.stringify(u) + ')', box);
  t('página de detalhe (/jobs/view/ID)', f(URL_VIEW) === '4444879003', String(f(URL_VIEW)));
  t('busca em painel dividido (?currentJobId=ID)', f(URL_SPLIT) === '4424367558', String(f(URL_SPLIT)));
  t('busca sem vaga aberta não inventa jobId', f(URL_BUSCA_SEM_VAGA) === null);
  t('portal de fora não vira vaga do LinkedIn', f(URL_FORA) === null);
  t('lixo não vira identidade', f('') === null && f(null) === null && f('não é url') === null);
}

console.log('\n=== o caso do 1º diagnóstico: a mesma vaga com dois nomes ===');
// O copiloto passa pela mesma página em dois instantes: um antes de o pacote trazer o jobId
// (entrada pelo ícone, sem passe) e outro depois. Antes do conserto isso dava `url:...` e
// `job:...` — e a comparação por igualdade de texto concluía "vagas diferentes".
{
  const antes = id(URL_VIEW, { url: URL_VIEW, cargo: 'Sales Director', empresa: 'D Prime' });
  const depois = id(URL_VIEW, { jobId: '4444879003', url: URL_VIEW, cargo: 'Sales Director', empresa: 'D Prime' });
  t('sem jobId no pacote, a chave já é a da vaga', antes.chave === 'job:4444879003', antes.chave);
  t('com jobId no pacote, a chave é a mesma', depois.chave === 'job:4444879003', depois.chave);
  t('os dois instantes casam entre si (era isto que falhava)', antes.chave === depois.chave);
}

console.log('\n=== o caso do 2º diagnóstico: mobília da página virando identidade ===');
// A tela mostrava "Sales Director (Brazil)" da D Prime em painel dividido. O extrator, porém,
// tinha raspado uma pergunta de pesquisa do LinkedIn como cargo. Com a vaga identificada pela
// URL, o que o extrator raspou deixa de decidir com QUEM o card casa.
{
  const lixo = { cargo: 'Esses resultados foram úteis?', empresa: 'vide linkdin', url: URL_SPLIT };
  const r = id(URL_SPLIT, lixo);
  t('a vaga do painel dividido é identificada pelo currentJobId', r.chave === 'job:4424367558', r.chave);
  t('o cargo raspado errado NÃO entra mais na identidade', !r.chave.includes('úteis'));
  t('nem a empresa raspada errada', !r.chave.includes('vide linkdin'));
  // A prova de que a correção morde onde doía: duas vagas diferentes da MESMA lista de busca
  // colapsavam numa chave só (a URL sem query), e o status de uma acendia na outra.
  const outra = id(URL_SPLIT.replace('4424367558', '4499999999'), lixo);
  t('duas vagas da mesma busca não compartilham identidade', r.chave !== outra.chave,
    r.chave + ' vs ' + outra.chave);
}

console.log('\n=== fora do LinkedIn nada muda: a régua antiga continua valendo ===');
{
  const comCard = id(URL_FORA, { cargo: 'Gerente Comercial', empresa: 'Acme', url: URL_FORA });
  t('portal de fora casa por empresa|cargo, como antes', comCard.chave === 'ec:acme|gerente comercial', comCard.chave);
  const soUrl = id(URL_FORA, { url: URL_FORA });
  t('sem empresa/cargo, cai na url, como antes', soUrl.chave === 'url:' + URL_FORA, soUrl.chave);
  t('o jobId do LinkedIn não é inventado em portal de fora', comCard.ref.jobId === null);
}

console.log('\n=== a chave é carimbada DEPOIS de a análise nova entrar em vigor ===');
// Esta era a outra metade do bug, e não dá para exercitá-la aqui (injetarCopiloto monta o painel
// inteiro no DOM). Mas a falha era de ORDEM, e ordem se lê na fonte: carimbar antes de trocar a
// análise corrente é carimbar a vaga ANTERIOR na vaga nova.
{
  const corpo = extrai('function injetarCopiloto(');
  const iTroca = corpo.indexOf('_copilotoAnalise = an;');
  const iCarimbo = corpo.indexOf('_analiseChave = _chaveVaga()');
  t('injetarCopiloto troca a análise corrente antes de carimbar a identidade',
    iTroca > 0 && iCarimbo > 0 && iTroca < iCarimbo,
    'troca em ' + iTroca + ' · carimbo em ' + iCarimbo);
  t('a decisão de "análise nova" é tomada antes da troca (senão comparia consigo mesma)',
    corpo.indexOf('an !== _copilotoAnalise') < iTroca);
}

console.log('\n=== o status continua preso à vaga certa (a trava que tudo isto serve) ===');
{
  const box = {
    location: { href: URL_VIEW, hostname: 'www.linkedin.com' },
    _copilotoAnalise: { jobId: '4444879003', url: URL_VIEW, status: 'aplicado' },
    _analiseChave: 'job:4444879003', URL, console,
  };
  vm.createContext(box);
  vm.runInContext([extrai('function _jobIdDaUrl('), extrai('function _refVaga('),
    extrai('function _chaveVaga('), extrai('function _statusVagaAtual(')].join('\n'), box);
  t('na vaga em que a análise foi estabelecida, o status vale',
    vm.runInContext('_statusVagaAtual(_copilotoAnalise)', box) === 'aplicado');
  // Navegou para outra vaga: o painel sobrevive ao SPA, o status não pode sobreviver junto.
  box.location.href = 'https://www.linkedin.com/jobs/view/4111111111/';
  box._copilotoAnalise = { url: box.location.href, status: 'aplicado' };
  t('noutra vaga, o "já se candidatou" NÃO vaza',
    vm.runInContext('_statusVagaAtual(_copilotoAnalise)', box) === '');
}

fim('IDENTIDADE DA VAGA · UM NOME SÓ, VENHA POR ONDE VIER');
