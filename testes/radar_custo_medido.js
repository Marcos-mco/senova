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
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

console.log('=== a instrumentação nunca inventa número ===');
t('_registrarCustoIA sai cedo quando não há usage ou não há D1 (resposta sem sucesso)',
  /async function _registrarCustoIA\(env, usage, origem\) \{\s*\n\s*if \(!usage \|\| !env\.SENOVA_DB\) return;/.test(worker));

console.log('\n=== a instrumentação nunca derruba nem atrasa a análise real ===');
t('_registrarCustoIA está em try/catch (falha na gravação não propaga)',
  /async function _registrarCustoIA[\s\S]{0,200}try \{[\s\S]{0,1400}\} catch \(err\) \{[\s\S]{0,120}\}\r?\n\}/.test(worker));
t('a chamada roda em ctx.waitUntil (não atrasa a resposta ao cliente)',
  /ctx\.waitUntil\(_registrarCustoIA\(env, data\.usage, 'radar'\)\)/.test(worker));
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
t('o upsert soma com o registro existente (ON CONFLICT ... DO UPDATE SET x = x + excluded.x)',
  /ON CONFLICT\(dia, origem\) DO UPDATE SET chamadas = chamadas \+ 1/.test(worker) &&
  /tokens_entrada = tokens_entrada \+ excluded\.tokens_entrada/.test(worker));

console.log('\n=== o número tem SUJEITO: Radar e Plano de Vida nunca viram o mesmo total ===');
// [[feedback_instrumentacao_precisa_de_sujeito]] — número sem dizer QUAL bloco é mentira.
t('a gravação carimba a origem (coluna origem na tabela custo_ia)',
  /INSERT INTO custo_ia \(dia, origem,/.test(worker));
t('a origem vem de um catálogo fechado, e o que não estiver nele cai em "app"',
  /const ORIGENS_CUSTO = new Set\(\[[^\]]*'radar'[^\]]*'plano_vida'[^\]]*\]\)/.test(worker) &&
  /ORIGENS_CUSTO\.has\(origem\) \? origem : 'app'/.test(worker));
t('todo ponto de chamada à Anthropic carimba a sua origem',
  ['radar','email','sofia','mercado'].every(o => new RegExp(`_registrarCustoIA\\(env, [a-z]+\\.usage, '${o}'\\)`).test(worker)) &&
  /_registrarCustoIA\(env, dados\.usage, origem\)/.test(worker));

console.log('\n=== o número fica legível sem precisar de wrangler tail ===');
t('GET /api/radar-custo existe e lê custo_ia do D1',
  /path === '\/api\/radar-custo' && request\.method === 'GET'[\s\S]{0,400}SENOVA_DB\.prepare\([\s\S]{0,200}FROM custo_ia/.test(worker));
t('a rota respeita o teto de 30 DIAS distintos (não 30 linhas)',
  /SELECT DISTINCT dia FROM custo_ia ORDER BY dia DESC LIMIT 30/.test(worker));
t('o formato antigo (por_dia com a soma do dia) continua servido — ninguém quebra',
  /const por_dia = \{\}, por_origem = \{\}/.test(worker) && /return json\(\{ por_dia, por_origem \}\)/.test(worker));

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
