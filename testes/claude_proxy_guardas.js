// GUARD — /api/claude não repassa mais o corpo do cliente verbatim (S48, Fix 0).
//
// Por que este teste existe. Até a v7.39 a rota `/api/claude` lia o JSON do browser e o
// mandava inteiro para a Anthropic: `model`, `max_tokens` e conteúdo escolhidos pelo
// cliente, sem nenhum teto. Enquanto o único cliente era o app do Marcos, era uma aposta
// silenciosa. O plano do Plano de Vida abre uma porta de CÂMERA — o usuário aponta para o
// diploma e a imagem sobe por esta mesma rota. A partir daí, um corpo sem teto é conta do
// dono do Worker acionada por botão de usuário: uma foto em resolução cheia vira ~4 MB de
// base64, e trocar `max_tokens` de 800 para 64000 multiplica a saída, que é 56% do custo
// medido do Radar.
//
// A régua vem do parecer do `senova-viabilidade`: o onboarding inteiro custa R$ 0,42.
// Nada que passe por aqui pode custar múltiplos disso por engano ou por abuso.
//
// O que este teste NÃO faz: não trata de autenticação. `/api/claude` continua atrás do
// mesmo `x-senova-key` compartilhado de todas as rotas — login por pessoa é fix separado,
// declarado fora de escopo no plano. Teto não substitui porta.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// Recorta o corpo da rota para provar que as guardas estão NELA, e não soltas no arquivo.
const i = worker.indexOf("if (path === '/api/claude' && request.method === 'POST')");
const rota = i === -1 ? '' : worker.slice(i, i + 2200);

console.log('=== a rota existe e não repassa mais o corpo cru ===');
t('a rota /api/claude foi encontrada', rota.length > 0);
t('o corpo é validado antes de chegar à Anthropic',
  rota.indexOf('recusarPedidoClaude') !== -1 &&
  rota.indexOf('recusarPedidoClaude') < rota.indexOf('api.anthropic.com'));
t('a recusa devolve 400 com motivo legível, não 500 nem silêncio',
  /if \(recusa\) return json\(\{ error: recusa \}, 400\)/.test(rota));

console.log('\n=== modelo: lista fechada, não o que o browser pedir ===');
// Recorta a DECLARAÇÃO, não a 1ª menção — o cabeçalho do arquivo cita o nome da constante.
const decl = worker.indexOf('const MODELOS_PERMITIDOS = new Set([');
const lista = decl === -1 ? '' : worker.slice(decl, worker.indexOf(']);', decl));
t('existe allowlist de modelos', decl !== -1);
t('a allowlist cobre os três modelos que o app e a extensão já usam hoje',
  ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
    .every(m => lista.includes(`'${m}'`)));
t('modelo fora da lista é recusado', /if \(!MODELOS_PERMITIDOS\.has\(body\.model\)\) return/.test(worker));
t('o modelo obsoleto sonnet-4-5 NÃO está na allowlist (regra do CLAUDE.md)',
  lista !== '' && !lista.includes("'claude-sonnet-4-5'"));

console.log('\n=== teto de saída: o que mais pesa na conta ===');
// Este bloco existe porque a 1ª versão do teto foi escrita em 4096 por LEITURA de código
// ("o maior uso é 3000") e teria derrubado em silêncio todo CV em inglês e espanhol —
// montarPedidoCV pede 6000 fora do português. O teto tem de ser medido contra os call
// sites REAIS, e é isso que este teste trava: ele lê o index.html e compara.
const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const teto = (worker.match(/const TETO_MAX_TOKENS\s*=\s*(\d+)/) || [])[1];
const pedidos = [...app.matchAll(/max_tokens\s*:\s*(?:[^,\n]*\?\s*)?(\d+)(?:\s*:\s*(\d+))?/g)]
  .flatMap(m => [m[1], m[2]]).filter(Boolean).map(Number);
const maiorReal = Math.max(...pedidos);

t('existe teto de max_tokens', !!teto);
t(`o teto (${teto}) cobre o maior max_tokens que o app realmente pede (${maiorReal})`,
  !!teto && +teto >= maiorReal);
t('e ainda assim é teto de verdade — não o máximo que o modelo aceitaria (64000)',
  !!teto && +teto <= 2 * maiorReal);
t('max_tokens ausente, não-inteiro ou acima do teto é recusado',
  /if \(!Number\.isInteger\(mt\) \|\| mt < 1\) return/.test(worker) &&
  /if \(mt > TETO_MAX_TOKENS\) return/.test(worker));

console.log('\n=== os modelos da allowlist são os que o app de fato pede ===');
const modelosApp = [...app.matchAll(/'(claude-[a-z0-9.-]+)'/g)].map(m => m[1]);
t(`todo modelo literal do index.html está na allowlist (${[...new Set(modelosApp)].join(', ') || 'nenhum'})`,
  modelosApp.every(m => lista.includes(`'${m}'`)),
  modelosApp.filter(m => !lista.includes(`'${m}'`)).join(', '));

console.log('\n=== todo caminho do app já chega à rota com modelo e teto ===');
// A guarda recusa pedido sem `max_tokens` — o que está certo, e por isso mesmo é preciso
// provar que NENHUM caminho vivo do app cai nessa recusa. Vale sobretudo para o CV: os dois
// call sites que geram currículo (analisarVaga na tela e mvRefazerCV no card) não escrevem
// `max_tokens` na linha do fetch — montam o corpo em `montarPedidoCV`, que escreve. Um
// caminho novo que esqueça os dois campos morreria em 400 e só apareceria na hora de usar.
const chamadas = app.split('\n')
  .map((l, i) => ({ l, i }))
  .filter(o => /fetch\(WORKER_URL\+'\/api\/claude'/.test(o.l))
  .map(o => ({ linha: o.i + 1, corpo: app.split('\n').slice(o.i, o.i + 12).join('\n') }));
const semTeto = chamadas.filter(c => !/max_tokens/.test(c.corpo) && !/montarPedidoCV|_pedido/.test(c.corpo));
t(`todo fetch para /api/claude manda max_tokens (${chamadas.length} call sites)`,
  chamadas.length > 0 && semTeto.length === 0, semTeto.map(c => 'linha ' + c.linha).join(', '));
const semModelo = chamadas.filter(c => !/model\s*:/.test(c.corpo) && !/montarPedidoCV|_pedido/.test(c.corpo));
t('e todo fetch manda um modelo (senão a allowlist recusa)',
  semModelo.length === 0, semModelo.map(c => 'linha ' + c.linha).join(', '));
t('montarPedidoCV — o portão do CV — escreve modelo e teto no corpo',
  /model:\s*MODELOS\.analise,\s*max_tokens:/.test(app));

console.log('\n=== imagem: a porta da câmera não pode virar torneira aberta ===');
t('existe teto de bytes do corpo inteiro', /const TETO_CORPO_BYTES\s*=/.test(worker));
t('o tamanho é medido no texto cru, ANTES de processar',
  /const bruto = await request\.text\(\)/.test(rota) && /recusarPedidoClaude\(body, bruto\.length\)/.test(rota));
t('existe teto por imagem e teto de quantidade de imagens',
  /const TETO_IMAGEM_B64\s*=/.test(worker) && /const TETO_IMAGENS\s*=/.test(worker));
t('os blocos de imagem são realmente percorridos (não é teto só no papel)',
  /bloco\.type !== 'image'/.test(worker) && /bloco\.source\?\.data/.test(worker));
t('streaming é recusado (a rota devolve JSON de uma vez)', /if \(body\.stream\) return/.test(worker));

console.log('\n=== o custo desta rota deixa de nascer invisível ===');
// Termina em [,)]: a v7.43 acrescentou o dono depois da origem
// ([[feedback_teste_guarda_posicao_nao_lista_s50]]).
t('a rota registra custo com origem',
  /_registrarCustoIA\(env, dados\.usage, origem[,)]/.test(rota));
t('só registra quando a chamada deu certo (nunca inventa número)',
  /if \(resp\.ok && ctx\) ctx\.waitUntil\(/.test(rota) &&
  // v7.46: o dono já foi resolvido ANTES da chamada, porque o teto de gasto precisa dele
  // para decidir. O registro reusa o mesmo valor em vez de perguntar duas vezes.
  /ctx\.waitUntil\(\s*\n?\s*_registrarCustoIA\(env, dados\.usage, origem, donoDoPedido[,)]/.test(rota));
// A rota mais quente do app é também a mais fácil de esquecer numa trava nova.
t('e o teto do mês é consultado ANTES de a Anthropic ser chamada',
  /bloqueadoPorTeto\(env, donoDoPedido\)[\s\S]{0,500}?api\.anthropic\.com/.test(rota));
t('o campo `origem` é nosso e sai do corpo antes de ir para a Anthropic',
  /delete body\.origem/.test(rota) &&
  rota.indexOf('delete body.origem') < rota.indexOf('api.anthropic.com'));

console.log('\n=== nada disto afrouxa o que já estava protegido ===');
const j = worker.indexOf('const ROTAS_SEM_SEGREDO');
const isentas = worker.slice(j, worker.indexOf(']);', j));
t('POST /api/claude NÃO virou rota isenta de segredo', !isentas.includes("/api/claude"));

fim('claude_proxy_guardas');
