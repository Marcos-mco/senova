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
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

console.log('=== a instrumentação nunca inventa número ===');
t('_registrarCustoIA sai cedo quando não há usage ou não há D1 (resposta sem sucesso)',
  /async function _registrarCustoIA\(env, usage\) \{\s*\n\s*if \(!usage \|\| !env\.SENOVA_DB\) return;/.test(worker));

console.log('\n=== a instrumentação nunca derruba nem atrasa a análise real ===');
t('_registrarCustoIA está em try/catch (falha na gravação não propaga)',
  /async function _registrarCustoIA[\s\S]{0,80}try \{[\s\S]{0,900}\} catch \(err\) \{[\s\S]{0,120}\}\n\}/.test(worker));
t('a chamada roda em ctx.waitUntil (não atrasa a resposta ao cliente)',
  /ctx\.waitUntil\(_registrarCustoIA\(env, data\.usage\)\)/.test(worker));
t('analisarVaga recebe ctx e o call site de POST /api\\/analisar-vaga o repassa',
  /async function analisarVaga\([^)]*\bctx\)/.test(worker) &&
  /analisarVaga\(titulo, empresa, descricao, env, contexto, perfilCandidato, scoreAnterior, ctx\)/.test(worker));

console.log('\n=== o contador é atômico — sem corrida entre chamadas paralelas do mesmo lote ===');
t('_registrarCustoIA usa D1 (env.SENOVA_DB), não KV',
  /async function _registrarCustoIA[\s\S]{0,900}env\.SENOVA_DB\.prepare/.test(worker) &&
  !/async function _registrarCustoIA[\s\S]{0,900}env\.SENOVA_KV/.test(worker));
t('o upsert soma com o registro existente (ON CONFLICT ... DO UPDATE SET x = x + excluded.x)',
  /ON CONFLICT\(dia\) DO UPDATE SET chamadas = chamadas \+ 1/.test(worker) &&
  /tokens_entrada = tokens_entrada \+ excluded\.tokens_entrada/.test(worker));

console.log('\n=== o número fica legível sem precisar de wrangler tail ===');
t('GET /api/radar-custo existe e lê radar_custo_ia do D1',
  /path === '\/api\/radar-custo' && request\.method === 'GET'[\s\S]{0,300}SENOVA_DB\.prepare\([\s\S]{0,150}radar_custo_ia/.test(worker));
t('a rota respeita o teto de 30 dias (LIMIT 30 na consulta)',
  /FROM radar_custo_ia ORDER BY dia DESC LIMIT 30/.test(worker));

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
