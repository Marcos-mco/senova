// GUARD — o app tem de poder dizer NÃO a si mesmo (S53, 26/ago/2026).
//
// Por que este teste existe. Marcos abriu a fatura do cartão e disse: "estou desempregado e
// não posso gastar tanto assim. Vamos mudar o processo de trabalho e colocar como regra não
// poder passar dos 200 reais mensais." A medição do D1 confirmou o susto: R$ 263,56 em 13
// dias com registro, ritmo de R$ 430/mês, 83% num clique só.
//
// O que faltava NÃO era medir — isso existe desde a v7.29. Era FREIO: nenhuma linha do
// Worker perguntava quanto já se gastou antes de gastar de novo. Um teto que mora só na
// intenção não é teto; é promessa. Este arquivo é a versão executável da promessa.
//
// Quatro coisas ele guarda, e cada uma já falhou antes em outra roupa:
//
//  1. PORTEIRO ANTES, NÃO DEPOIS. Toda rota que gasta IA consulta o teto ANTES de chamar a
//     Anthropic. Cobrar depois é contabilidade, não trava.
//
//  2. O TETO É DADO DE QUEM USA, NUNCA CONSTANTE. "R$ 200" é a decisão do Marcos. Virar
//     `const TETO = 200` seria a sexta vez que a medição de UM usuário vira lei para todos
//     — [[feedback_senova_para_qualquer_um_s51]]. Quem usa o Senova em Berlim tem outra
//     moeda e outro limite.
//
//  3. FALHA NOSSA NÃO FECHA A TORNEIRA. Se o D1 não responde, não dá para AFIRMAR que
//     estourou — e afirmar isso cala o app sem motivo. Limite nosso não se cobra do usuário
//     ([[feedback_limite_nosso_nao_cobra_do_usuario]]).
//
//  4. A RECUSA DIZ O QUÊ, POR QUÊ E O QUE FAZER AGORA — a S52 ensinou isso do jeito caro
//     ([[feedback_repetir_pedido_e_defeito_meu_s52]]). Quem está sem emprego e vê o app
//     parar sem explicação conclui que ele quebrou.
//
// Este teste roda as funções REAIS do Worker num sandbox — não confere se o código "parece"
// certo, confere o que ele decide. A S52 mostrou o custo de uma suíte verde afirmando o
// defeito ([[feedback_teste_documentava_o_bug_s52]]).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Carrega o bloco do teto no sandbox ────────────────────────────────────────────────
// Recorte por marcador de início/fim em vez de por lista de funções: o bloco é UM assunto e
// cresce junto. Se o recorte deixar de achar as pontas, o teste falha alto — nunca passa
// verde medindo um pedaço.
const INICIO = 'const MODELO_NAO_REGISTRADO';
const FIM    = '// A recusa em formato HTTP.';
const iIni = worker.indexOf(INICIO), iFim = worker.indexOf(FIM);
if (iIni < 0 || iFim < 0 || iFim < iIni) {
  console.log('  FAIL  não achei o bloco do teto no Worker (marcadores mudaram de nome?)');
  process.exit(1);
}
const fonte = worker.slice(iIni, iFim);
const fonteSemComentario = fonte.replace(/\/\/[^\n]*/g, '');

// `porUsuario` é a tabela de custo de mentira: quanto cada user_id gastou no mês. É assim
// que o teste consegue perguntar a coisa que importa desde que o legado entrou na conta —
// QUAIS LINHAS o teto somou —, em vez de aceitar um total pronto.
function novoSandbox({
  gastoUSD = 0, porUsuario = null, orcamentoNoKV = null,
  donoDoLegado = null, usuariosAtivos = 1, semD1 = false, d1Explode = false,
} = {}) {
  const conta = porUsuario || { u1: gastoUSD };
  const s = {
    console: { error() {}, warn() {}, log() {} },
    Intl, Date, Math, Number, String, JSON, Map, Set,
    CHAVE_DONO_LEGADO: 'perfil_dono_legado',
    CUSTO_SEM_DONO: 'nao_atribuido',
    _sha256hex: async (x) => 'hash:' + x,
    donoSeguro: async () => 'u1',
    env: {
      SENOVA_KV: { get: async (k) => {
        if (k === 'perfil_dono_legado') return donoDoLegado;
        return orcamentoNoKV === null ? null : JSON.stringify(orcamentoNoKV);
      } },
      SENOVA_DB: semD1 ? null : {
        // O mock lê o SQL de verdade: uma soma que ignorasse o IN (...) deixaria passar
        // exatamente o defeito que estes testes existem para pegar.
        prepare: (sql) => {
          const responder = (args) => async () => {
            if (d1Explode) throw new Error('D1 fora do ar');
            if (/COUNT\(\*\)/.test(sql)) return { n: usuariosAtivos };
            const ids = args.slice(0, args.length - 1); // o último bind é o primeiro dia do mês
            return { total: ids.reduce((soma, id) => soma + (conta[id] || 0), 0) };
          };
          // A contagem de usuários ativos roda sem .bind() — o mock imita as duas formas.
          return { first: responder([]), bind: (...args) => ({ first: responder(args) }) };
        },
      },
    },
  };
  s.globalThis = s;
  vm.createContext(s);
  vm.runInContext(fonte, s);
  return s;
}
const rodar = (s, expr) => vm.runInContext(expr, s);

async function main() {

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('=== token vira dinheiro pelo modelo que realmente rodou ===');
  {
    const s = novoSandbox();
    // 1M de entrada em Sonnet 4.6 = US$ 3,00 exatos. Se este número mudar sem alguém mexer
    // na tabela, o teto passou a medir outra coisa.
    const sonnet = rodar(s, 'custoEmUSD({ input_tokens: 1000000 }, "claude-sonnet-4-6")');
    t('1M de entrada em Sonnet 4.6 custa US$ 3,00', Math.abs(sonnet - 3) < 1e-9, String(sonnet));
    const haiku = rodar(s, 'custoEmUSD({ input_tokens: 1000000 }, "claude-haiku-4-5")');
    t('o mesmo volume em Haiku custa 1/3 — o modelo muda a conta', Math.abs(haiku - 1) < 1e-9, String(haiku));
    const cache = rodar(s, 'custoEmUSD({ cache_read_input_tokens: 1000000 }, "claude-sonnet-4-6")');
    t('leitura de cache custa 0,1x a entrada (é onde o Senova economiza de verdade)',
      Math.abs(cache - 0.30) < 1e-9, String(cache));
    // Preço desconhecido subestimado = teto furado em silêncio. Errar para o lado de gastar
    // menos é o erro certo quando quem paga está desempregado.
    const novo = rodar(s, 'custoEmUSD({ input_tokens: 1000000 }, "modelo-que-ainda-nao-existe")');
    t('modelo fora da tabela paga pelo mais caro, nunca pelo mais barato',
      novo >= sonnet && novo >= haiku, String(novo));
    t('sem usage não há custo inventado', rodar(s, 'custoEmUSD(null, "claude-sonnet-4-6")') === 0);
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== o teto é dado de quem usa, na moeda de quem usa ===');
  {
    // Marcos: R$ 200/mês, câmbio 5,40. US$ 30 gastos = R$ 162 → ainda pode trabalhar.
    const s = novoSandbox({ gastoUSD: 30, orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 } });
    const e = await rodar(s, 'estadoDoOrcamento(env, "u1")');
    t('o gasto em dólar é convertido para a moeda da pessoa', Math.abs(e.gasto - 162) < 1e-6, String(e.gasto));
    t('abaixo do teto, não bloqueia', e.bloqueado === false);
    t('e diz quanto sobra, na mesma moeda', Math.abs(e.restante - 38) < 1e-6, String(e.restante));
    t('o teto lido é o da pessoa, não um padrão do código', e.orcamento.teto === 200 && e.orcamento.padrao === false);
  }
  {
    // A mesma pessoa, dois dias depois: US$ 38 = R$ 205,20. Passou.
    const s = novoSandbox({ gastoUSD: 38, orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 } });
    const freio = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    t('estourado, o porteiro FREIA (é a razão de o arquivo existir)', !!freio);
    t('e freia com o estado, não com um booleano mudo', !!freio && freio.orcamento.teto === 200);
  }
  {
    // Berlim: outra moeda, outro limite, mesmo código. O crivo de universalidade, medido.
    const s = novoSandbox({ gastoUSD: 40, orcamentoNoKV: { teto: 25, moeda: 'EUR', cambio_por_usd: 0.92 } });
    const e = await rodar(s, 'estadoDoOrcamento(env, "u1")');
    t('um teto europeu em euro é respeitado pelo mesmo código', e.bloqueado === true && e.orcamento.moeda === 'EUR');
    const freio = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    t('e a recusa sai na moeda dela, não em real', /€|EUR/.test(freio.mensagem), freio.mensagem.slice(0, 90));
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== a trava soma a MESMA conta que o painel mostra ===');
  {
    // 26/ago/2026, dado real do D1: R$ 21,52 atribuídos a Marcos e R$ 244,13 no histórico
    // 'nao_atribuido' (anterior à migração 004). Se o teto contasse só o atribuído, a tela
    // mostraria R$ 265 ao lado de uma trava que só conhece R$ 21 — uma tela que mente.
    const s = novoSandbox({
      porUsuario: { u1: 3.98, nao_atribuido: 45.20 },
      orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 },
    });
    const e = await rodar(s, 'estadoDoOrcamento(env, "u1")');
    t('o histórico sem dono entra na conta de quem é o único cadastrado',
      Math.abs(e.gastoUSD - 49.18) < 1e-6, String(e.gastoUSD));
    t('e com isso a trava enxerga o gasto REAL do mês', e.bloqueado === true, String(e.gasto));
  }
  {
    // A segunda pessoa não herda o passado de ninguém. A condição se fecha sozinha.
    const s = novoSandbox({
      porUsuario: { u1: 1, nao_atribuido: 999 }, usuariosAtivos: 2,
      orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 },
    });
    const e = await rodar(s, 'estadoDoOrcamento(env, "u1")');
    t('havendo mais de um cadastrado, ninguém herda o histórico sem dono',
      Math.abs(e.gastoUSD - 1) < 1e-6, String(e.gastoUSD));
  }
  {
    // Reivindicado por outra pessoa (mecanismo do Perfil, S50): não é mais de quem pergunta.
    const s = novoSandbox({
      porUsuario: { u1: 1, nao_atribuido: 999 }, donoDoLegado: 'u2',
      orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 },
    });
    const e = await rodar(s, 'estadoDoOrcamento(env, "u1")');
    t('legado já reivindicado por outro não entra na conta de quem pergunta',
      Math.abs(e.gastoUSD - 1) < 1e-6, String(e.gastoUSD));
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== ninguém fica sem freio, e lixo no KV não vira trava eterna ===');
  {
    const s = novoSandbox({ gastoUSD: 0 });
    const o = await rodar(s, 'lerOrcamento(env, "u1")');
    t('quem nunca configurou tem um teto padrão', o.teto > 0);
    t('e o padrão se declara padrão (a tela pode dizer que ninguém escolheu)', o.padrao === true);
  }
  {
    // Teto zero gravado por engano travaria o app para sempre sem o dono ter pedido isso.
    const s = novoSandbox({ orcamentoNoKV: { teto: 0, moeda: 'BRL', cambio_por_usd: 5.4 } });
    const o = await rodar(s, 'lerOrcamento(env, "u1")');
    t('teto zero não vira app morto — cai no padrão', o.teto > 0 && o.padrao === true);
  }
  {
    const s = novoSandbox({ orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 0 } });
    const o = await rodar(s, 'lerOrcamento(env, "u1")');
    t('câmbio inválido não vira comparação mentirosa — cai no padrão', o.padrao === true);
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== falha nossa não cobra do usuário ===');
  {
    const s = novoSandbox({ semD1: true });
    const e = await rodar(s, 'estadoDoOrcamento(env, null)');
    t('sem banco, o estado se declara NÃO medido em vez de fingir um total', e.medido === false);
    t('e não bloqueia (app parado por falha nossa seria cobrar do usuário)', e.bloqueado === false);
  }
  {
    const s = novoSandbox({ d1Explode: true, orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.4 } });
    const freio = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    t('D1 caindo no meio da consulta segue aberto, e nunca lança', freio === null);
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== a recusa diz o quê, por quê e o que fazer agora ===');
  {
    const s = novoSandbox({ gastoUSD: 50, orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 } });
    const freio = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    const m = freio.mensagem;
    t('diz O QUÊ aconteceu, sem jargão de erro', /limite do mês/i.test(m), m.slice(0, 60));
    t('diz POR QUÊ, citando o teto que a própria pessoa definiu', /200/.test(m), m);
    t('diz QUANTO já foi usado (número, não "muito")', /270/.test(m), m);
    t('diz O QUE FAZER AGORA', /aumente o teto/i.test(m), m);
    t('e garante que nada foi perdido — quem está desempregado precisa ouvir isso',
      /não foi perdido|nada do que você já tem/i.test(m), m);
    t('nunca manda "tente novamente" nem chama de erro (não é defeito, é decisão)',
      !/tente novamente|erro|falha/i.test(m), m);
  }
  {
    // Quem nunca escolheu não pode achar que o número é dele.
    const s = novoSandbox({ gastoUSD: 999 });
    const freio = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    t('no teto padrão, a mensagem AVISA que o valor nunca foi escolhido',
      /padrão|nunca escolheu/i.test(freio.mensagem), freio.mensagem.slice(0, 140));
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== o semáforo é barato, mas não deixa o lote furar a janela ===');
  {
    // O porteiro roda antes de CADA chamada; sem cache, cada tela do app pagaria uma
    // varredura de D1. Mas cache de 30s com 6 análises em paralelo (o LOTE do "Importar
    // vagas") deixaria as 6 passarem com o mesmo número velho — por isso todo registro soma
    // no cache na hora. Este é o teste do "dentro da janela".
    const s = novoSandbox({ gastoUSD: 36, orcamentoNoKV: { teto: 200, moeda: 'BRL', cambio_por_usd: 5.40 } });
    const antes = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    t('US$ 36 (R$ 194,40) ainda passa', antes === null);
    // Uma chamada cara acontece e é registrada — o D1 de mentira continua devolvendo 36.
    rodar(s, '_somarNoCacheDeGasto("u1", 2)');
    const depois = await rodar(s, 'bloqueadoPorTeto(env, "u1")');
    t('a chamada seguinte, dentro dos mesmos 30s, JÁ vê o gasto novo e freia', !!depois);
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== o porteiro está ANTES de toda chamada de IA, em todas as rotas ===');
  {
    // Não é regex por elegância: é a única forma de perguntar "SOBROU alguma porta aberta?".
    // A lista abaixo é o inventário das rotas que gastam IA — se nascer uma sexta, ela entra
    // aqui e o teste cobra o freio.
    const rotas = [
      ['/api/claude',         /path === '\/api\/claude'[\s\S]{0,3000}?bloqueadoPorTeto[\s\S]{0,400}?api\.anthropic\.com/],
      ['/api/analisar-vaga',  /path === '\/api\/analisar-vaga'[\s\S]{0,900}?bloqueadoPorTeto[\s\S]{0,300}?analisarVaga\(/],
      ['/api/sofia-parecer',  /path === '\/api\/sofia-parecer'[\s\S]{0,900}?bloqueadoPorTeto[\s\S]{0,300}?parecerSofia\(/],
      ['/api/sinais-mercado', /path === '\/api\/sinais-mercado'[\s\S]{0,1500}?bloqueadoPorTeto[\s\S]{0,400}?buscarSinaisMercado\(/],
    ];
    for (const [nome, re] of rotas) t(nome + ' consulta o teto ANTES de gastar', re.test(worker));
    // O lote de e-mail não é uma rota: é um laço. Um teto conferido só na entrada deixaria o
    // laço inteiro rodar depois de estourar, e é justamente o laço que gasta N vezes.
    t('a classificação de e-mail confere o teto DENTRO do laço, e para no meio',
      /for \([\s\S]{0,400}?bloqueadoPorTeto[\s\S]{0,400}?break/.test(worker));
    // 402 Payment Required: o pedido está certo, falta dinheiro autorizado. 429 seria mentira.
    t('a recusa sai como HTTP 402 e com marca que o app reconhece sem ler texto',
      /teto_atingido: true[\s\S]{0,140}402/.test(worker));
  }

  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== nenhum número de Marcos virou lei do código (crivo de universalidade) ===');
  {
    // O bloco do teto é a camada que DECIDE. Nenhum valor de uma pessoa pode morar nele.
    t('nem "200" solto na camada que decide', !/(^|[^\w.])200([^\w]|$)/m.test(fonteSemComentario),
      'algum 200 escapou para o bloco do teto');
    t('nem uma moeda chumbada como padrão de todo mundo',
      !/moeda\s*[:=]\s*['"]BRL['"]/.test(fonteSemComentario));
    t('nem um câmbio chumbado (5,40 é a cotação do cartão DELE, não do mundo)',
      !/5\.4/.test(fonteSemComentario));
    t('o teto é lido do KV, por pessoa', /SENOVA_KV\.get\(chaveOrcamento\(/.test(worker));
    // Um ponto único de LEITURA de quem é a conta — o painel e a trava chamam o mesmo.
    // Contar chamadas seria guardar o número de leitores — e leitor novo é bem-vindo (o preço
    // médio da análise virou o terceiro em 26/ago/2026). O que não pode nascer duas vezes é a
    // REGRA: quem herda o gasto antigo. Ela mora dentro de donosDaConta e em lugar nenhum mais.
    t('painel e trava perguntam "de quem é esta conta" no mesmo lugar',
      (worker.match(/await donosDaConta\(env, dono\)/g) || []).length >= 2 &&
      (worker.match(/async function donosDaConta\(/g) || []).length === 1 &&
      (worker.match(/push\(CUSTO_SEM_DONO\)/g) || []).length === 1);
    t('e a chave é por user_id', /\$\{CHAVE_ORCAMENTO\}:\$\{userId\}/.test(worker));
    t('existe rota para a pessoa definir o próprio teto', /path === '\/api\/orcamento'/.test(worker));
    t('e ela recusa teto inválido dizendo o que fazer, em vez de gravar lixo',
      /path === '\/api\/orcamento'[\s\S]{0,1600}?\(teto > 0\)\)\s*return json\(\{ error:/.test(worker));
  }
  // ════════════════════════════════════════════════════════════════════════════════════
  console.log('\n=== do lado do app: a recusa vira frase, e o teto vira campo ===');
  {
    // Uma trava que o Worker aplica e o app não explica é um app que "quebrou" aos olhos de
    // quem usa. O 402 é tratado no INTERCEPTADOR de fetch — o mesmo ponto único que injeta a
    // chave — porque são ~60 chamadas ao Worker e nenhuma delas pode ficar de fora.
    t('o app reconhece o 402 no ponto único por onde toda chamada ao Worker passa',
      /res\.status === 402[\s\S]{0,300}?teto_atingido[\s\S]{0,80}?mostrarTetoAtingido/.test(app));
    // Reconhece pelo CAMPO, nunca pela frase: a frase muda de idioma, o campo não.
    t('e reconhece pelo campo, não pela frase (a frase muda de idioma; o campo não)',
      !/teto_atingido[\s\S]{0,80}?(indexOf|includes)\('Limite/.test(app));
    // AVISA, não engole: quem chamou continua recebendo a resposta e decide o que faz com ela.
    t('o interceptador avisa sem engolir a resposta de quem chamou',
      /res\.clone\(\)\.json\(\)/.test(app) && /return res;\r?\n\s*\}\);/.test(app));
    t('um aviso por vez, e não um por chamada do lote',
      /function mostrarTetoAtingido[\s\S]{0,500}?if \(el\.style\.display === 'flex'\) return;/.test(app));
    // O caminho que a recusa manda seguir tem de existir de verdade. Uma mensagem que aponta
    // para uma tela inexistente é a recusa sem PORQUÊ da S52 com outra roupa.
    t('a recusa do Worker aponta para uma tela que existe no app',
      /Perfil › Integrações › Orçamento de IA/.test(worker) &&
      /Orçamento de IA<\/div>/.test(app) &&
      /id="perfil-panel-4"/.test(app));
    t('e o botão do aviso leva até lá', /function abrirOrcamento[\s\S]{0,400}?perfilTab\(4,/.test(app));
    t('a aba Integrações carrega o consumo ao abrir', /if\(n===4\) carregarOrcamento\(\);/.test(app));
    // Teto, moeda e câmbio são dados de quem usa — o app coleta os três, não presume nenhum.
    t('o app coleta teto, moeda E câmbio (nenhum dos três é presumido)',
      /id="orcamento-teto"/.test(app) && /id="orcamento-moeda"/.test(app) && /id="orcamento-cambio"/.test(app));
    // O teto tem de morar onde a recusa acontece. Guardado no aparelho, não protegeria nada:
    // bastaria abrir o app em outro navegador para o limite sumir.
    t('e o teto vai para o Worker, nunca para o localStorage deste aparelho',
      /\/api\/orcamento'[\s\S]{0,400}?cambio_por_usd: cambio/.test(app) &&
      !/localStorage[\s\S]{0,40}orcamento/i.test(app));
  }

  fim('Teto de gasto');
}

main().catch(e => { console.log('  FAIL  o teste explodiu: ' + e.message); process.exit(1); });
