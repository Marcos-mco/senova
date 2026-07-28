// O CV TEM QUE SAIR NO NÍVEL DA VAGA — NUNCA C-LEVEL PARA VAGA DE EXECUÇÃO.
//
// 25/jul/2026 (S37): Marcos comparou o CV que o Senova gerou para uma vaga de "Analista de
// Marketing de Produto Pleno" (Kapazi) com um CV feito à mão. O do Senova saiu com o subtítulo
// "Executivo de Marketing & Crescimento | CMO · CSO · CEO" — nível de diretoria numa vaga de
// analista. Isso desqualifica por sobrequalificação e é o oposto de calibrado.
//
// Causa raiz (auditada, com linha): o NÍVEL da vaga nunca entrava na geração do CV.
//   1. montarPedidoCV chamava ATS_SYSTEM(idioma, vagaTexto) SEM o 3º parâmetro nivelVaga.
//   2. ATS_SYSTEM declarava um CARGO-ALVO fixo "CMO / CSO / CEO / Diretor..." — mandava mirar
//      C-level independentemente da vaga.
//   3. O PDF tinha um subtítulo C-level chumbado como fallback (o "smoking gun").
//
// A correção (geral, vale para qualquer vaga): montarPedidoCV deriva o nível da vaga (do cargo, ou
// do título no topo da descrição) e passa a ATS_SYSTEM; o prompt calibra o ENQUADRAMENTO ao nível
// da vaga (os FATOS não mudam) e proíbe rótulo acima do nível; o fallback do PDF nunca é C-level.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extrai(assinatura) {
  const i = html.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no index.html: ' + assinatura);
  const ab = html.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < html.length; j++) { const c = html[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return html.slice(i, j + 1);
}

// As funções/consts REAIS que compõem a geração do CV, na ordem de dependência.
const fontes = [
  'const PERFIL_MARCOS =',
  'const IDIOMAS={',
  'const _PDF_LABELS={',
  'function idiomaEntregavel(',
  'let _perfilIdioma=',
  'function _niveisIdiomaDeclarados(',
  'function idiomasDoUsuario(',
  'const _IDIOMA_MARCAS = {',
  'function _idiomaDaVaga(',
  'function _idiomaDoCV(',
  'function _idiomaDecidido(',
  'function _idiomaDoPedido(',
  'function filtrarExperienciasRelevantes(',
  'function formatarExperienciasPerfil(',
  'function perfilFormatadoPara(',
  'function _nivelAlvoPDF(',
  'const ATS_SYSTEM =',
  'function montarPedidoCV(',
].map(extrai).join('\n;\n');

// CV_DESC_MINIMA é escalar (const = 400, sem corpo {}) — o extrator por chaves não o pega; entra
// como stub com o mesmo valor real. Só alimenta o flag `curta`, irrelevante para o system do CV.
const sandbox = { console, MODELOS: { analise: 'm', rapido: 'm' }, cvLang: 'PT', cvLangManual: false, CV_DESC_MINIMA: 400 };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontes, sandbox);

let ok = 0, fail = 0;
const t = (nome, cond, det) => { if (cond) { ok++; console.log('  PASS  ' + nome); } else { fail++; console.log('  FAIL  ' + nome + (det ? '  → ' + det : '')); } };
// system do CV para uma vaga dada (cargo + descrição). Pega o prompt REAL que iria à IA.
const systemDe = (o) => vm.runInContext('montarPedidoCV(' + JSON.stringify(o) + ').body.system', sandbox);

// Uma descrição de vaga de execução real (analista pleno de produto) — o caso da Kapazi.
const JD_ANALISTA = `Analista de Marketing de Produto Pleno. Responsável por apoiar o ciclo de vida do produto,
lançamento (go-to-market), gestão de portfólio, pesquisa e inteligência de mercado, análise de concorrência,
posicionamento e materiais de apoio a vendas. Trabalha com times de produto, vendas e comunicação.
Requisitos: experiência com marketing de produto, dados, e comunicação. Superior completo em Marketing.`;

console.log('=== vaga de ANALISTA: o enquadramento desce ao nível da vaga ===');
const sysAnalista = systemDe({ descricao: JD_ANALISTA, cargo: 'Analista de Marketing de Produto Pleno' });
t('rótulo de nível é de execução (Gerência/…/Analista), não C-level',
  /NÍVEL-ALVO DESTA VAGA: Gerência \/ Coordenação \/ Especialista \/ Analista/.test(sysAnalista),
  (sysAnalista.match(/NÍVEL-ALVO DESTA VAGA:[^\n]*/) || [''])[0]);
t('proíbe explicitamente rótulo acima do nível (sobrequalificação)',
  /desqualifica por sobrequalificação/.test(sysAnalista));
t('manda espelhar o subtítulo no nível da vaga, não no ápice da carreira',
  /o subtítulo é a ÁREA da vaga/.test(sysAnalista));
t('NÃO manda mais mirar C-level como CARGO-ALVO fixo',
  !/^CARGO-ALVO: CMO \/ CSO \/ CEO \/ Diretor Comercial/m.test(sysAnalista));
t('os FATOS continuam íntegros (só muda o destaque)',
  /Os FATOS não mudam/.test(sysAnalista));

console.log('\n=== vaga C-LEVEL: aí sim o nível-alvo é executivo ===');
const sysCLevel = systemDe({ descricao: 'Chief Executive Officer para operação nacional. Reporta ao board. Responsável por P&L, estratégia e crescimento. Lidera diretoria executiva.', cargo: 'CEO' });
t('rótulo de nível é C-Level quando a vaga é C-level',
  /NÍVEL-ALVO DESTA VAGA: C-Level \/ Diretoria executiva/.test(sysCLevel),
  (sysCLevel.match(/NÍVEL-ALVO DESTA VAGA:[^\n]*/) || [''])[0]);

console.log('\n=== vaga de DIRETORIA: nível diretoria ===');
const sysDir = systemDe({ descricao: 'Diretor de Marketing responsável pela estratégia de marca e comunicação, liderando equipe e orçamento de mídia.', cargo: 'Diretor de Marketing' });
t('rótulo de nível é Diretoria', /NÍVEL-ALVO DESTA VAGA: Diretoria/.test(sysDir),
  (sysDir.match(/NÍVEL-ALVO DESTA VAGA:[^\n]*/) || [''])[0]);

console.log('\n=== sem cargo e sem título claro: a IA infere da JD (não chumba nível) ===');
const sysSemCargo = systemDe({ descricao: 'Buscamos profissional para atuar em nossa equipe com foco em resultados e colaboração no dia a dia da operação da empresa.' });
t('rótulo cai em "inferir da vaga" quando não há sinal de nível',
  /NÍVEL-ALVO DESTA VAGA: inferir do título e das responsabilidades/.test(sysSemCargo),
  (sysSemCargo.match(/NÍVEL-ALVO DESTA VAGA:[^\n]*/) || [''])[0]);

console.log('\n=== o nível é derivado do cargo pela mesma régua do PDF (_nivelAlvoPDF) ===');
t('_nivelAlvoPDF classifica "Analista…" como gerencial (execução)',
  vm.runInContext("_nivelAlvoPDF('Analista de Marketing de Produto Pleno')", sandbox) === 'gerencial');
t('_nivelAlvoPDF classifica "CEO" como c-level',
  vm.runInContext("_nivelAlvoPDF('CEO')", sandbox) === 'c-level');

// ── FIAÇÃO no index.html: sem isto, a calibração acima nunca é acionada de verdade ──────────────
console.log('\n=== FIAÇÃO: os pontos que fazem a calibração valer ===');
t('montarPedidoCV passa o nivelVaga para ATS_SYSTEM (3º arg)',
  /ATS_SYSTEM\(idioma, vagaTexto, nivelVaga\)/.test(html));
t('montarPedidoCV deriva nivelVaga do cargo/descrição via _nivelAlvoPDF',
  /const nivelVaga = _nivelAlvoPDF\(String\(o\.cargo/.test(html));
t('o card (Análise) passa o cargo ao portão',
  /montarPedidoCV\(\{descricao:jobDesc,localizacao,modelo,regime,contexto:ctx,cargo[,}]/.test(html));
t('a extensão passa o cargo ao portão',
  /montarPedidoCV\(\{descricao:desc,[^}]*cargo:v\.cargo\|\|''[,}]/.test(html));
t('o fallback de subtítulo do PDF NÃO é mais C-level chumbado',
  !/if\(!subtitulo\) subtitulo='Executivo de Marketing & Crescimento \| CMO · CSO · CEO/.test(html));
t('o fallback de subtítulo do PDF posiciona pela vaga (cargoVaga)',
  /if\(!subtitulo\) subtitulo=\(cargoVaga&&String\(cargoVaga\)\.trim\(\)\)/.test(html));

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `CV_NIVEL_CALIBRA: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
