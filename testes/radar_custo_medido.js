// GUARD — a linha de base de custo do Radar (S45, reunião de viabilidade/margem).
//
// Por que este teste existe. A reunião mediu a margem do Radar por ESTIMATIVA
// (IER 0,3-0,6) porque não existia nenhum contador real de quanto /api/analisar-vaga
// gasta em IA por dia — o número era chute com fonte, não medição. `analisarVaga` já
// recebe `usage` de graça em toda resposta bem-sucedida da Anthropic; a instrumentação
// só guarda o que já chega. A regra que este teste protege: instrumentação NUNCA pode
// mudar o comportamento do usuário, NUNCA pode atrasar ou derrubar a análise real se a
// gravação falhar, e NUNCA pode inventar um número quando não há `usage` de verdade
// (resposta sem sucesso) — ver [[feedback_instrumentacao_precisa_de_sujeito]].
//
// v7.30: a 1ª versão (v7.29) gravava em KV, lido-modificado-regravado — as 5 chamadas
// paralelas de um mesmo lote se atropelavam na mesma chave (o defeito de
// index.html:6109-6113, achado pelo agente senova-viabilidade antes de virar incidente
// de novo). Agora usa D1 com UPDATE...SET x=x+1 atômico — este teste passa a exigir o
// padrão D1, não mais o padrão KV read-modify-write.
//
// v7.40 (S48, Fix 0): o balde deixou de ser único. `radar_custo_ia` tinha `dia` como chave
// e somava tudo numa linha — bastava enquanto só o Radar era medido. Com as portas do Plano
// de Vida chamando IA, aquele total passaria a misturar dois módulos e não serviria para
// nenhuma decisão de margem. A tabela agora é `custo_ia` com PK (dia, origem) e TODO ponto
// de chamada à Anthropic carimba de onde veio — inclusive `/api/claude`, que até aqui
// gastava sem aparecer em lugar nenhum.
//
// v7.43 (S52, Passo D0): o mesmo defeito, um andar acima. `custo_ia` respondia "o que
// gastou" e a PK (dia, origem) tornava "QUEM gastou" impossível de perguntar. A tabela agora
// é `custo_ia_v3` com PK (dia, user_id, origem, modelo). Duas coisas dependem disso: o teto
// por pessoa (com balde comum, o primeiro a gastar fecharia a torneira dos outros dois) e os
// três usuários de homologação, que virariam um total sem atribuição. E uma regra nova de
// honestidade entra aqui: chamada cujo dono não foi conferido é carimbada 'nao_atribuido',
// NUNCA posta na conta de alguém por conveniência — atribuir sem conferir é exatamente a
// doença que a catraca de universalidade nomeia.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

console.log('=== a instrumentação nunca inventa número ===');
t('_registrarCustoIA sai cedo quando não há usage ou não há D1 (resposta sem sucesso)',
  /async function _registrarCustoIA\(env, usage, origem[,)][^)]*\) \{\s*\n\s*if \(!usage \|\| !env\.SENOVA_DB\) return;/.test(worker));

console.log('\n=== a instrumentação nunca derruba nem atrasa a análise real ===');
t('_registrarCustoIA está em try/catch (falha na gravação não propaga)',
  /async function _registrarCustoIA[\s\S]{0,700}try \{[\s\S]{0,1700}\} catch \(err\) \{[\s\S]{0,120}\}\r?\n\}/.test(worker));
// v7.42 (S51): o rótulo da análise deixou de ser a constante 'radar' — quem chama diz de
// qual esteira veio, e 'radar' virou o padrão de quem não disser. O que este teste guarda
// é o waitUntil (não atrasar a resposta), não mais o literal; a sub-origem tem guarda
// própria em testes/varredura_cancelada.js.
t('a chamada roda em ctx.waitUntil (não atrasa a resposta ao cliente)',
  /ctx\.waitUntil\(_registrarCustoIA\(env, data\.usage, origemCusto \|\| 'radar'[,)]/.test(worker));
t('analisarVaga recebe ctx e o call site de POST /api\\/analisar-vaga o repassa',
  /async function analisarVaga\([^)]*\bctx\b[^)]*\)/.test(worker) &&
  // O que importa aqui é a POSIÇÃO do ctx, não quantos argumentos vêm depois: fixar a lista
  // inteira fazia este teste cair a cada argumento novo (foi o que aconteceu na S50, quando o
  // dono do Perfil entrou no fim da chamada) sem nada ter quebrado de verdade.
  /analisarVaga\(titulo, empresa, descricao, env, contexto, perfilCandidato, scoreAnterior, ctx[,)]/.test(worker));

console.log('\n=== o contador é atômico — sem corrida entre chamadas paralelas do mesmo lote ===');
t('_registrarCustoIA usa D1 (env.SENOVA_DB), não KV',
  /async function _registrarCustoIA[\s\S]{0,900}env\.SENOVA_DB\.prepare/.test(worker) &&
  !/async function _registrarCustoIA[\s\S]{0,1400}env\.SENOVA_KV/.test(worker));
// A CHAVE DE CONFLITO INCLUI O MODELO (v7.53, migração 006). Enquanto era (dia, user_id,
// origem), dois modelos no mesmo dia e origem caíam na mesma linha: o dinheiro somava certo
// e a etiqueta virava a do último a rodar. Somar POR essa etiqueta — que foi o que a v7.51
// fez — produz um número com sujeito errado, e ele existia para decidir uma troca de modelo.
// A 005 já avisava disso no próprio texto; guardar aqui é o que impede o aviso de virar
// letra morta pela segunda vez ([[feedback_instrumentacao_precisa_de_sujeito]]).
t('o upsert soma com o registro existente (ON CONFLICT ... DO UPDATE SET x = x + excluded.x)',
  /ON CONFLICT\(dia, user_id, origem, modelo\) DO UPDATE SET chamadas = chamadas \+ 1/.test(worker) &&
  /tokens_entrada = tokens_entrada \+ excluded\.tokens_entrada/.test(worker));

console.log('\n=== o número tem SUJEITO: Radar e Plano de Vida nunca viram o mesmo total ===');
// [[feedback_instrumentacao_precisa_de_sujeito]] — número sem dizer QUAL bloco é mentira.
t('a gravação carimba a origem E o modelo (as duas colunas que dão sujeito ao número)',
  /INSERT INTO custo_ia_v3 \(dia, user_id, origem, modelo,/.test(worker));
// Um leitor esquecido na tabela velha é pior que nenhum: some do painel sem sumir da conta.
t('e nenhuma consulta ficou para trás na tabela antiga',
  !/(FROM|INTO) custo_ia_v2/.test(worker), 'ainda há consulta em custo_ia_v2');
t('a origem vem de um catálogo fechado, e o que não estiver nele cai em "app"',
  /const ORIGENS_CUSTO = new Set\(\[[^\]]*'radar'[^\]]*'plano_vida'[^\]]*\]\)/.test(worker) &&
  /ORIGENS_CUSTO\.has\(origem\) \? origem : 'app'/.test(worker));
t('todo ponto de chamada à Anthropic carimba a sua origem',
  ['email','sofia','mercado'].every(o => new RegExp(`_registrarCustoIA\\(env, [a-z]+\\.usage, '${o}'[,)]`).test(worker)) &&
  // A análise de vaga carimba a esteira que pediu, com 'radar' de padrão (v7.42).
  /_registrarCustoIA\(env, data\.usage, origemCusto \|\| 'radar'[,)]/.test(worker) &&
  /_registrarCustoIA\(env, dados\.usage, origem[,)]/.test(worker));

console.log('\n=== o número tem o TERCEIRO sujeito: de QUEM foi o gasto (v7.43, S52) ===');
t('a tabela tem dono na chave primária — três usuários nunca viram um total só',
  /PRIMARY KEY \(dia, user_id, origem\)/.test(
    fs.readFileSync(path.join(__dirname, '..', 'migrations', '004_custo_ia_por_usuario.sql'), 'utf8')));
t('_registrarCustoIA recebe o dono e o grava',
  // Termina em [,)]: guarda a POSIÇÃO do dono, não o tamanho da lista — a v7.46 acrescentou
  // `modelo` no fim, e fixar a assinatura inteira faria este teste cair sem nada ter
  // quebrado ([[feedback_teste_guarda_posicao_nao_lista_s50]]).
  /async function _registrarCustoIA\(env, usage, origem, dono[,)]/.test(worker) &&
  /\.bind\(\s*\n?\s*hoje,\s*\n?\s*deQuem,/.test(worker));
t('dono não conferido vira "nao_atribuido" — nunca a conta de outra pessoa',
  /const CUSTO_SEM_DONO = 'nao_atribuido'/.test(worker) &&
  /const deQuem = \(typeof dono === 'string' && dono\.trim\(\)\) \? dono : CUSTO_SEM_DONO;/.test(worker));
t('as CINCO chamadas medidas passam o dono adiante (nenhuma cai no balde anônimo por esquecimento)',
  /_registrarCustoIA\(env, data\.usage, 'email', dono[,)]/.test(worker) &&
  /_registrarCustoIA\(env, data\.usage, 'sofia', dono[,)]/.test(worker) &&
  /_registrarCustoIA\(env, data\.usage, 'mercado', dono[,)]/.test(worker) &&
  /_registrarCustoIA\(env, data\.usage, origemCusto \|\| 'radar', dono[,)]/.test(worker) &&
  /_registrarCustoIA\(env, dados\.usage, origem, donoDoPedido[,)]/.test(worker));
// v7.46 (S53): token só vira dinheiro quando se sabe QUAL modelo rodou — entrada de Haiku
// custa 1/3 da de Sonnet, saída de Opus custa 5x. Uma chamada registrada sem modelo é um
// gasto que o teto tem de precificar por cima, e o histórico volta a ser "número sem
// sujeito" — a mesma doença da 003 e da 004, um andar acima.
// O que se guarda é o INVARIANTE — nenhuma gravação de custo sem dizer qual modelo rodou —,
// não a forma do argumento. Contar literais 'claude-…' era guardar a FORMA: em 26/ago/2026 a
// pontuação passou a escolher o modelo (sonnet ou haiku) e o literal virou variável na análise
// de vaga, sem que nada tenha regredido. A regra que sobrevive a isso é: toda chamada a
// _registrarCustoIA passa CINCO argumentos, e o quinto é o modelo que de fato rodou.
const _chamadasCusto = worker.match(/_registrarCustoIA\([^;]*?\)\)?;/g) || [];
const _semModelo = _chamadasCusto.filter(c => (c.match(/,/g) || []).length < 4);
t('e todas dizem TAMBÉM qual modelo rodou (sem isto, o dinheiro é chute)',
  _chamadasCusto.length >= 5 && _semModelo.length === 0,
  'chamada de custo sem modelo: ' + _semModelo.join(' | '));
// E o modelo GRAVADO é o mesmo que foi PEDIDO. Dois nomes escritos à mão em linhas distantes é
// exatamente como o defeito renasceria: trocar o modelo da chamada e esquecer o do registro
// faria a conta do mês cobrar preço de um modelo que não rodou.
t('e o modelo gravado na análise de vaga é a mesma variável que foi pedida à Anthropic',
  /model:modelo,/.test(worker) &&
  /_registrarCustoIA\(env, data\.usage, origemCusto \|\| 'radar', dono, modelo\)/.test(worker));
// Quem escolhe o modelo da pontuação é o cliente. Sem lista fechada, o browser poderia pedir o
// modelo mais caro do catálogo para uma tarefa de triagem e triplicar a conta sem aprovação.
t('e o cliente não escolhe modelo caro para a triagem — a lista da pontuação é fechada',
  /const MODELOS_TRIAGEM = new Set\(\['claude-sonnet-4-6', 'claude-haiku-4-5'\]\);/.test(worker) &&
  /MODELOS_TRIAGEM\.has\(modeloPedido\) \? modeloPedido : 'claude-sonnet-4-6'/.test(worker));
t('o proxy genérico continua gravando o modelo que o corpo pediu',
  /_registrarCustoIA\(env, dados\.usage, origem, donoDoPedido, body && body\.model\)/.test(worker));
t('quem não tinha dono na assinatura passou a receber — classificarEmails e os sinais de mercado',
  /async function classificarEmails\(emails, whitelist, env, ctx, dono\)/.test(worker) &&
  /async function buscarSinaisMercado\(env, ctx, dono\)/.test(worker) &&
  /async function analisarSinaisMercado\(itens, env, ctx, dono\)/.test(worker));
// A v7.46 (S53) INVERTEU esta regra, e a inversão é a razão de o teste mudar em vez de sumir.
// Até aqui /api/claude descobria o dono DENTRO do waitUntil, depois de responder: a rota é a
// mais quente do app e uma ida ao D1 antes da resposta cobraria latência de todo mundo para
// servir a contabilidade. Com o teto de gasto isso deixou de ser possível — o porteiro
// precisa saber DE QUEM é a conta ANTES de autorizar a chamada. A latência foi respondida por
// outro caminho: `donoParaTeto` guarda o dono por 60s no isolate, chaveado pelo HASH da
// credencial (segredo não mora em estrutura de vida longa). É isso que o teste guarda agora.
t('/api/claude resolve o dono ANTES de gastar, e sem ir ao D1 a cada chamada',
  /const donoDoPedido = await donoParaTeto\(request, env\);[\s\S]{0,300}?bloqueadoPorTeto\(env, donoDoPedido\)/.test(worker) &&
  /async function donoParaTeto[\s\S]{0,800}?_cacheDono\.get\(chave\)/.test(worker));
t('e o cache do dono é chaveado pelo hash da credencial, nunca pela credencial crua',
  /const chave = await _sha256hex\(cred\);/.test(worker) &&
  !/_cacheDono\.(get|set)\(cred[,)]/.test(worker));

console.log('\n=== o número fica legível sem precisar de wrangler tail ===');
t('GET /api/radar-custo existe e lê custo_ia_v3 do D1',
  /path === '\/api\/radar-custo' && request\.method === 'GET'[\s\S]{0,1800}SENOVA_DB\.prepare\([\s\S]{0,300}FROM custo_ia_v3/.test(worker));
t('a rota respeita o teto de 30 DIAS distintos (não 30 linhas)',
  /SELECT DISTINCT dia FROM custo_ia_v3 WHERE user_id IN \(\$\{vagas\}\) ORDER BY dia DESC LIMIT 30/.test(worker));
// Este teste guardava a linha do `return` INTEIRA — e em 27/ago/2026 reprovou a entrada de
// `por_modelo`, um campo NOVO que não tira nada de ninguém. Guardar a lista fechada é o
// defeito que já mordeu duas vezes ([[feedback_teste_guarda_posicao_nao_lista_s50]]): o que
// importa é que os três campos antigos continuem saindo, não que sejam os únicos.
const _retorno = (worker.match(/return json\(\{ por_dia,[^\)]*\}\)/) || [''])[0];
t('o formato antigo (por_dia com a soma do dia) continua servido — ninguém quebra',
  /const por_dia = \{\}, por_origem = \{\}, por_usuario = \{\}/.test(worker) &&
  ['por_dia','por_origem','por_usuario','orcamento'].every(c => _retorno.includes(c)),
  'o retorno deixou de servir algum campo antigo: ' + _retorno);
// v7.51: `modelo` estava gravado desde a v7.46 e nada o somava. Sem esta soma, "trocar o
// modelo da triagem sai mais barato?" só tinha resposta em estimativa — e estimativa foi
// exatamente o que Marcos recusou: "só com prova".
t('e o custo é somado TAMBÉM por modelo — é a conta que decide uma troca de modelo',
  /const por_dia = \{\}, por_origem = \{\}, por_usuario = \{\}, por_modelo = \{\};/.test(worker) &&
  /soma\(por_modelo, r.modelo \|\| 'nao_registrado', r\);/.test(worker) &&
  _retorno.includes('por_modelo'));
// O teto de saída da triagem é NOSSO, e em 27/ago ele reprovou um modelo por nós: com 1100
// o Haiku teve a resposta cortada em 22 de 30 vagas, e o JSON pela metade era indistinguível
// de "o modelo não soube responder". Cortar a resposta não economiza — os tokens de entrada
// já foram pagos, e a vaga volta para a fila.
t('o teto de saída da triagem cabe na resposta dos dois modelos (não reprova por corte)',
  /max_tokens:2400,/.test(worker) && !/max_tokens:1100,/.test(worker));
// v7.46 (S53): o painel deixou de servir só token. O teto trabalha em dinheiro, e uma tela
// que mostra token enquanto a trava conta dinheiro é uma tela que vai discordar da trava.
t('e agora serve DINHEIRO junto do token (é em dinheiro que o teto decide)',
  /custo_usd, modelo FROM custo_ia_v3/.test(worker) &&
  /a\.custo_usd\s*\+= \(r\.custo_usd \|\| 0\)/.test(worker));
t('o estado do orçamento vem do MESMO cálculo do porteiro, não de uma segunda soma',
  /const orcamento = await estadoDoOrcamento\(env, dono\);/.test(worker));
// [[project_vazamento_vagas_lead_s41]] — a rota que servia o que só fazia sentido com um
// usuário. O filtro entra antes de haver o que vazar, não depois.
t('o painel mostra o gasto de QUEM PERGUNTA, não a soma do mundo',
  /path === '\/api\/radar-custo'[\s\S]{0,900}const dono = await donoSeguro\(request, env\)/.test(worker) &&
  /WHERE user_id IN \(\$\{vagas\}\)/.test(worker));
// v7.46 (S53): o cálculo saiu de dentro da rota e virou `donosDaConta`, porque o TETO de
// gasto precisa somar exatamente as mesmas linhas que este painel mostra. Enquanto fossem
// dois trechos, seriam duas respostas — uma tela mostrando R$ 265 ao lado de uma trava que
// só conhece R$ 21. A regra é a mesma; o que mudou é que agora ela mora num lugar só.
t('o histórico não atribuído só é herdado por quem é dele (mesmo mecanismo do Perfil)',
  /async function donosDaConta[\s\S]{0,600}donoLegado === dono/.test(worker) &&
  /async function donosDaConta[\s\S]{0,900}COUNT\(\*\) AS n FROM usuarios WHERE ativo=1/.test(worker) &&
  /path === '\/api\/radar-custo'[\s\S]{0,1200}const meus = await donosDaConta\(env, dono\);/.test(worker));

console.log('\n=== a rota nova segue o padrão fail-closed (exige x-senova-key) ===');
const i = worker.indexOf('const ROTAS_SEM_SEGREDO');
const fimSet = worker.indexOf(']);', i);
const isentas = worker.slice(i, fimSet);
t('GET /api/radar-custo NÃO está na lista de isenção', !isentas.includes("'GET /api/radar-custo'"));

console.log('\n=== o contrato de resposta ao cliente não muda ===');
// analisarVaga devolve `r` (o JSON pontuado); usage é lido de `data`, nunca colado em `r`.
t('o campo usage não é misturado no objeto de retorno da análise',
  !/r\.usage\s*=/.test(worker));

fim('radar_custo_medido');
