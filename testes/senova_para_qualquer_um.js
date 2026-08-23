// GUARD — o Senova é para qualquer pessoa, em qualquer lugar do planeta (S51).
//
// Regra dita por Marcos em 23/ago/2026, depois de eu escrever, no mesmo dia, uma regra de
// negócio com nome próprio de portal dentro: "o código fonte tem que estar limpo de
// qualquer informação já direcionada... uma pessoa na Alemanha pode escolher os portais que
// quer usar... vc está escrevendo um aplicativo para venda em qualquer lugar do planeta".
//
// O PRINCÍPIO, que este arquivo existe para tornar impossível de esquecer:
//
//   Nome de serviço, de país ou de pessoa só pode viver em DUAS camadas: no adaptador que
//   fala com aquele serviço, e no dado que o usuário configurou. NUNCA na camada que decide.
//
// Falar com a Adzuna exige código da Adzuna — isso é um plugin, é legítimo. O que é
// indefensável é o app perguntar "isto é Adzuna?" para decidir alguma coisa, ou nascer com
// a vida de uma pessoa específica dentro.
//
// POR QUE UM TESTE, E NÃO UMA REGRA ESCRITA. Porque já era regra escrita e falhou cinco
// vezes: DEFAULT_VAGAS (S40), o dossiê servido sem credencial (S41), a semente do contexto
// complementar com a vida do Marcos (S49), PERFIL_MARCOS concatenado em toda análise de todo
// usuário, e _fonteVarredura (S51). Uma doença só: a medição de UM usuário virando lei para
// todos. Comentário não impede; teste no pre-commit impede.
//
// COMO ELE FUNCIONA — catraca, não muralha. A dívida de hoje é grande demais para ser paga
// num commit, e fingir que dá seria pior do que não ter trava. Então cada família tem um
// TETO com o número medido hoje, e o teto SÓ PODE CAIR. Passar do teto reprova (dívida
// nova); ficar abaixo dele também reprova, pedindo que o número seja corrigido aqui — é
// assim que o extrato continua verdadeiro. O redesenho do Perfil (Passo D) é o que paga a
// maior parte da família C.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const raiz = path.join(__dirname, '..');
const ARQUIVOS = ['index.html', 'senova-worker.js'];

// Comentário é história, não comportamento: explicar por que a Adzuna existiu não é decidir
// por causa da Adzuna. Fora eles, a linha conta.
function linhasDeCodigo(txt) {
  return txt.split('\n').map(L => {
    const s = L.trim();
    if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('<!--')) return '';
    return L.replace(/([^:'"`])\/\/.*$/, '$1');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMÍLIA A — a FONTE decide
//
// O app tem um vocabulário próprio de tipos de origem ("veio de e-mail", "veio da
// extensão"). Isso é dele e é universal. Comparar o campo de fonte contra QUALQUER OUTRA
// COISA é comparar contra um nome próprio — e é o defeito exato de _fonteVarredura.
//
// O vocabulário abaixo é a lista fechada e declarada. Um tipo de origem novo e legítimo
// entra AQUI, de propósito: obriga a decisão a ser consciente, e faz um 'stepstone' futuro
// reprovar sozinho, sem ninguém precisar lembrar de acrescentá-lo a lista nenhuma.
const VOCABULARIO_DE_ORIGEM = new Set([
  '', 'manual', 'email', 'email_alerta', 'extensao_chrome', 'diploma', 'pagina', 'ia',
  'processo', 'mercado', 'irrelevante', 'busca_automatica',
]);
const RE_FONTE = /\b(?:fonte|origem|fonteId|provedor|plataforma|portal)\s*(?:===|!==|==|!=)\s*(['"`])([^'"`]*)\1/gi;

// ─────────────────────────────────────────────────────────────────────────────
// FAMÍLIA B — o NOME DO SERVIÇO decide
//
// Nome de portal de vagas ou de provedor de e-mail dentro de uma condição, de um `?:` ou de
// um farejamento de URL. Cobre o caso em que o nome não chega pelo campo de fonte e sim pelo
// link (`url.includes('adzuna.com.br')` decidindo o Critério do país) e o caso em que o app
// trata um provedor como se fosse a única forma de existir e-mail no mundo.
//
// LIMITE DECLARADO: 'linkedin' fica de fora. São 212 ocorrências no app e a maioria é
// legítima (campo do Perfil, alvo da extensão). Triar aquilo é trabalho de uma sessão
// inteira; prometer para hoje seria mentira. Entra quando for triado.
const SERVICOS = ['adzuna', 'jobicy', 'gupy', 'catho', 'infojobs', 'stepstone', 'xing',
  'indeed', 'wellfound', 'outlook', 'gmail', 'hotmail'];
const RE_SERVICO = new RegExp(
  `(?:if\\s*\\(|\\?|===|!==|\\.includes\\s*\\(|\\.startsWith\\s*\\()[^\\n]{0,90}?['"\`][^'"\`\\n]*(?:${SERVICOS.join('|')})[^'"\`\\n]*['"\`]`,
  'gi');

// ─────────────────────────────────────────────────────────────────────────────
// FAMÍLIA C — a IDENTIDADE DE UMA PESSOA está no código
//
// A maior das três, e a que mais importa: enquanto ela não zerar, um segundo usuário abre o
// app com a vida de outra pessoa dentro — nos prompts que a IA lê, na saudação da tela e nos
// exemplos dos formulários. É o que o redesenho do Perfil (Passo D) existe para pagar.
//
// A URL de deploy (…marcos-mco.workers.dev) não conta: é endereço de infraestrutura, não
// identidade de usuário. Sai da conta antes da medição.
const RE_IDENTIDADE = /PERFIL_MARCOS|PROJETO_DE_VIDA|Marcos|marcos_mco|99615-2224|Curitiba/gi;

// ─────────────────────────────────────────────────────────────────────────────
// O EXTRATO. Medido em 23/ago/2026. Estes números só podem cair.
const TETO = {
  'index.html':       { A: 7, B: 23, C: 101 },
  'senova-worker.js': { A: 0, B: 7,  C: 15 },
};

function medir(arquivo) {
  const linhas = linhasDeCodigo(fs.readFileSync(path.join(raiz, arquivo), 'utf8'))
    .map(L => L.replace(/marcos-mco\.workers\.dev/g, 'PROXY'));
  const achados = { A: [], B: [], C: [] };
  linhas.forEach((L, i) => {
    const n = i + 1;
    let m;
    RE_FONTE.lastIndex = 0;
    while ((m = RE_FONTE.exec(L))) {
      if (!VOCABULARIO_DE_ORIGEM.has(String(m[2]).toLowerCase())) achados.A.push(`${n}: ${m[0].trim()}`);
    }
    RE_SERVICO.lastIndex = 0;
    if (RE_SERVICO.test(L)) achados.B.push(`${n}: ${L.trim().slice(0, 100)}`);
    RE_IDENTIDADE.lastIndex = 0;
    if (RE_IDENTIDADE.test(L)) achados.C.push(`${n}: ${L.trim().slice(0, 100)}`);
  });
  return achados;
}

const NOME = {
  A: 'a fonte decide (campo de origem comparado a nome próprio)',
  B: 'o nome do serviço decide (portal ou provedor dentro de condição)',
  C: 'a identidade de uma pessoa está no código',
};

let restante = 0;
for (const arquivo of ARQUIVOS) {
  console.log(`\n=== ${arquivo} ===`);
  const achados = medir(arquivo);
  for (const fam of ['A', 'B', 'C']) {
    const n = achados[fam].length;
    const teto = TETO[arquivo][fam];
    restante += n;
    if (n > teto) {
      // Dívida NOVA. As linhas vão para a tela — quem introduziu precisa ver qual é.
      console.log(`  ── ${fam} · ${NOME[fam]}`);
      achados[fam].slice(0, 30).forEach(x => console.log(`     ${x}`));
    }
    t(`${fam} · ${NOME[fam]}: ${n} (teto ${teto})`, n <= teto,
      n > teto
        ? `dívida NOVA de universalidade. O nome próprio vai para o adaptador ou para o dado do usuário — nunca para a decisão.`
        : undefined);
    if (n < teto) {
      t(`${fam} · a dívida caiu de ${teto} para ${n} em ${arquivo} — baixe o teto nesta linha do teste`, false);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// O detector morde? Uma trava que parou de achar qualquer coisa é pior do que trava
// nenhuma: ela passa, dá sensação de proteção e deixa a dívida crescer em silêncio. O teto
// já protege contra isso pelo lado de baixo (contagem abaixo do teto reprova), mas isto aqui
// prova a mordida com um caso sintético, sem depender de o app estar sujo.
console.log('\n=== a trava morde ===');
const FALSO_A = `if(v.fonte==='stepstone') return true;`;
const FALSO_B = `if(url.includes('adzuna.de')) return 50;`;
const FALSO_C = `const saud='Olá, Marcos';`;
RE_FONTE.lastIndex = 0; RE_SERVICO.lastIndex = 0; RE_IDENTIDADE.lastIndex = 0;
const mA = RE_FONTE.exec(FALSO_A);
t('um portal NOVO reprova sozinho, sem ninguém precisar acrescentá-lo a lista nenhuma',
  !!mA && !VOCABULARIO_DE_ORIGEM.has(String(mA[2]).toLowerCase()));
t('nome de portal farejado na URL para decidir país é pego', RE_SERVICO.test(FALSO_B));
t('identidade de pessoa em texto de tela é pega', RE_IDENTIDADE.test(FALSO_C));
RE_FONTE.lastIndex = 0; RE_SERVICO.lastIndex = 0; RE_IDENTIDADE.lastIndex = 0;
t('o vocabulário próprio do app NÃO é acusado (não vira falso positivo que ensina a ignorar a trava)',
  (() => { const m = RE_FONTE.exec(`if(v.fonte==='email_alerta') return true;`);
    return !!m && VOCABULARIO_DE_ORIGEM.has(String(m[2]).toLowerCase()); })());

// ─────────────────────────────────────────────────────────────────────────────
// Travas permanentes — estas não têm teto, valem para sempre.
console.log('\n=== o que nunca mais pode voltar ===');
const app = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
t('o vocabulário de origem do app é uma lista declarada, não nomes espalhados pelas condições',
  VOCABULARIO_DE_ORIGEM.size > 0);
t('nenhuma decisão de GASTAR IA depende de nome de portal',
  !/function _elegivelParaAnalise\([\s\S]{0,400}?(adzuna|jobicy|gupy|catho|indeed)/i.test(app),
  'quem decide se uma vaga vale uma análise é a política que o usuário deu à fonte, nunca o nome dela');

console.log(`\n  dívida de universalidade hoje: ${restante} pontos`);
fim('senova_para_qualquer_um');
