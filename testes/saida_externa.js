// GUARD — toda saída externa do Worker passa por UM ponto, e esse ponto valida cada salto
// (S54, 29/ago/2026).
//
// O buraco, achado pelo senova-auditor. A guarda de alvo (`_hostProibido`) existia desde a
// S52 e tinha UM chamador: `verificarLinkVaga`. A rota irmã, `/api/fetch-descricao`, nasceu
// antes dela e nunca a recebeu — buscava host arbitrário, porta arbitrária, seguia redirect
// às cegas, lia o corpo sem teto e devolvia até 4.000 caracteres do que encontrasse. A
// proteção não era uma camada: era adorno de uma rota.
//
// E o pior não era esse. `redirect: 'follow'` anulava a guarda no único lugar onde ela era
// usada: validava-se o primeiro endereço e o fetch seguia o 302 para onde o dono da página
// mandasse, sem nova checagem. O alvo tampouco exige a chave de acesso — o link chega pelo
// e-mail de alerta e a higiene do radar o busca sozinha, sem humano no caminho.
//
// É a mesma família de defeito que a S47 ("N gravadores") e a S52 ("N leitores"), agora em
// saída de rede: N portas de saída, cada uma com a sua própria ideia de segurança. Este
// arquivo trava a porta única — e roda a guarda de verdade, porque teste que só confere o
// formato do código é o que deixou passar os defeitos das duas sessões anteriores.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// Toda função do Worker é de primeiro nível: o fim é a primeira '}' na coluna zero.
function extraiDoWorker(assinatura) {
  const i = worker.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const f = worker.indexOf('\n}\n', i);
  if (f < 0) throw new Error('função sem fim na coluna zero: ' + assinatura);
  return worker.slice(i, f + 2);
}
function trechoEntre(de, ate) {
  const i = worker.indexOf(de);
  if (i < 0) throw new Error('não achei: ' + de);
  const f = worker.indexOf(ate, i);
  if (f < 0) throw new Error('não achei o fim: ' + ate);
  return worker.slice(i, f);
}

const mPortas = worker.match(/const _PORTAS_EXTERNAS_OK = new Set\(\[[^\]]*\]\);/);
const guarda = new Function(
  (mPortas ? mPortas[0] : '') + '\n' +
  extraiDoWorker('function _hostProibido(') + '\n' +
  extraiDoWorker('function _alvoExternoOk(') + '\n' +
  'return { _hostProibido, _alvoExternoOk };'
)();

// ── 1. A guarda de host, rodando ────────────────────────────────────────────────
console.log('=== o que a guarda de host recusa (executando a função real) ===');

const PROIBIDOS = [
  ['localhost',                 'o clássico'],
  ['127.0.0.1',                 'loopback'],
  ['10.0.0.5',                  'RFC1918 classe A'],
  ['192.168.1.1',               'RFC1918 doméstica'],
  ['172.20.0.1',                'RFC1918 classe B'],
  ['169.254.169.254',           'metadados de nuvem'],
  ['0.0.0.0',                   'endereço nulo'],
  ['100.64.0.1',                'CGNAT'],
  ['198.18.0.1',                'faixa de benchmarking'],
  ['239.1.1.1',                 'multicast'],
  ['api.internal',              'sufixo interno'],
  ['coisa.local',               'mDNS'],
  ['router.home.arpa',          'nome de rede doméstica'],
  ['::1',                       'loopback IPv6 — era igualdade literal e passava em qualquer outra grafia'],
  ['0:0:0:0:0:0:0:1',           'loopback IPv6 por extenso'],
  ['fd00::1',                   'IPv6 ULA'],
  ['fe80::1',                   'IPv6 link-local'],
  ['::ffff:127.0.0.1',          'IPv4 mapeado em IPv6'],
  ['::ffff:169.254.169.254',    'metadados de nuvem por dentro do IPv6'],
  ['2130706433',                '127.0.0.1 em decimal'],
  // O ponto final foi achado durante o security-review deste MESMO patch, medindo o parser em
  // vez de supor: `new URL('http://127.0.0.1./')` normaliza o IP e tira o ponto, mas
  // `new URL('http://localhost./')` devolve o host COM o ponto — e toda regra ancorada
  // passava ao largo. Guarda que só cobre a grafia canônica é guarda que não cobre.
  ['localhost.',                'FQDN absoluto: o parser NÃO tira o ponto de nome, só de IP'],
  ['painel.internal.',          'sufixo interno com ponto final'],
  ['coisa.local.',              'mDNS com ponto final'],
];
for (const [host, porque] of PROIBIDOS) {
  t('recusa ' + host + ' (' + porque + ')', guarda._hostProibido(host) === true,
    'a guarda deixou passar ' + host);
}

console.log('\n=== e o que ela NÃO pode recusar, senão quebra o uso real ===');
const PERMITIDOS = ['www.linkedin.com', 'br.indeed.com', 'www.adzuna.com.br', 'jobicy.com',
                    'careers.exemplo.de', '8.8.8.8', 'vagas.com.br'];
for (const host of PERMITIDOS) {
  t('deixa passar ' + host, guarda._hostProibido(host) === false,
    'a guarda ficou apertada demais e recusou um portal legítimo: ' + host);
}

// ── 2. O alvo inteiro: esquema, credencial, porta ───────────────────────────────
console.log('\n=== o alvo inteiro, não só o host ===');
const casos = [
  ['https://www.linkedin.com/jobs/view/123',      true,  null],
  ['http://www.linkedin.com/jobs/view/123',       true,  null],
  ['file:///etc/passwd',                          false, 'protocolo_nao_suportado'],
  ['gopher://exemplo.com/',                       false, 'protocolo_nao_suportado'],
  ['https://usuario:senha@exemplo.com/',          false, 'url_com_credencial'],
  ['https://exemplo.com:6379/',                   false, 'porta_nao_permitida'],
  ['https://exemplo.com:8080/',                   false, 'porta_nao_permitida'],
  ['https://exemplo.com:443/vaga',                true,  null],
  ['http://10.0.0.5/',                            false, 'host_nao_permitido'],
  ['nao é uma url',                               false, 'url_invalida'],
];
for (const [alvo, esperado, motivo] of casos) {
  const r = guarda._alvoExternoOk(alvo);
  t((esperado ? 'aceita' : 'recusa') + ' ' + alvo + (motivo ? ' → ' + motivo : ''),
    r.ok === esperado && (esperado || r.motivo === motivo),
    'devolveu ' + JSON.stringify({ ok: r.ok, motivo: r.motivo }));
}

// ── 3. A mordida do próprio detector ────────────────────────────────────────────
// Trava que para de morder é pior que trava nenhuma (S51). Se alguém enfraquecer a guarda,
// os casos acima já caem — mas o de baixo prova que o teste não está medindo o vazio.
console.log('\n=== o teste morde (uma guarda que sempre diz "pode" reprova aqui) ===');
const guardaFrouxa = () => false;
t('uma guarda que aceita tudo reprovaria a lista de proibidos',
  PROIBIDOS.some(([h]) => guardaFrouxa(h) !== true),
  'o teste não distingue guarda real de guarda frouxa — está medindo o vazio');

// ── 4. O ponto único existe e é o único caminho ─────────────────────────────────
console.log('\n=== saída externa com URL de fora passa SÓ pelo ponto único ===');
t('fetchExterno existe', /async function fetchExterno\(/.test(worker),
  'o ponto único sumiu — a saída externa voltou a ser cada rota por si');

const corpoExterno = extraiDoWorker('async function fetchExterno(');
t('fetchExterno usa redirect manual', /redirect: 'manual'/.test(corpoExterno),
  "voltou o redirect automático: seguir 30x sem revalidar anula a guarda de host por completo");
t('e revalida CADA salto, não só o primeiro',
  (corpoExterno.match(/_alvoExternoOk\(/g) || []).length >= 2,
  'o destino do redirecionamento não é mais validado — foi exatamente esse o buraco da S52');
t('há teto de saltos', /MAX_SALTOS_EXTERNO/.test(corpoExterno),
  'sem teto de saltos, uma corrente de redirects vira laço');
t('o corpo é lido com teto', /slice\(0, tetoCorpo\)/.test(corpoExterno),
  'o corpo voltou a ser lido inteiro — apontar para um arquivo grande estoura o isolate');

const rota = trechoEntre("if (path === '/api/fetch-descricao'", "if (path === '/api/contacts'");
t('a rota /api/fetch-descricao não chama fetch( direto',
  !/await fetch\(/.test(rota),
  'a rota voltou a ter porta de saída própria, fora do ponto único');
t('ela usa fetchExterno', /await fetchExterno\(/.test(rota),
  'a rota parou de usar o ponto único');
t('e tem rateLimit', /rateLimit\(request, env/.test(rota),
  'sem teto de chamadas, uma chave vazada vira refletor de carga contra portal alheio (S52)');
// A precisão importa: `e.message` num console.error do SERVIDOR é diagnóstico legítimo e
// necessário. O que não pode é ele viajar de volta na resposta ao chamador. A asserção olha
// o que sai pelo json(), não o que fica no log.
t('a recusa NÃO devolve a mensagem de erro crua ao chamador',
  !/return json\([^;]*e\.message/.test(rota),
  'mensagem de rede/DNS voltou a vazar na resposta: é oráculo de varredura para quem sonda, e inútil para quem quer a vaga');

const linkVivo = extraiDoWorker('async function verificarLinkVaga(');
t('verificarLinkVaga também não chama fetch( direto',
  !/await fetch\(/.test(linkVivo),
  'a rota irmã voltou a sair por conta própria');
t('e usa o ponto único', /await fetchExterno\(/.test(linkVivo),
  'verificarLinkVaga parou de usar o ponto único');

// ── 5. O que NÃO é superfície de SSRF continua livre ────────────────────────────
// Anthropic, Graph, Adzuna, Jobicy, Bing e Google têm host CONSTANTE nosso. Obrigá-los a
// passar pela guarda não protegeria nada e só faria o teste mentir sobre o que cobre.
console.log('\n=== o limite declarado deste guard ===');
t('host constante nosso continua chamando fetch direto, e isso é correto',
  /await fetch\('https:\/\/api\.anthropic\.com/.test(worker),
  'se isto mudou, revisar: o guard fala de URL vinda DE FORA, não de toda chamada de rede');

fim('saida_externa');
