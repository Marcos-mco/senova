// Estrutura do CV para o PDF: fatos do PERFIL_MARCOS (robusto) + adaptação do CV da IA.
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'const _PDF_LABELS={',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _secaoDoCV(',
  'function _nivelAlvoPDF(',
  'const CV_EXPS_COM_BULLETS =',
  'function _cvParaPDF(',
]);

const cvAlelo = `MARCOS FRANCO
Executivo Comercial · Parcerias & Desenvolvimento de Negócios · Curitiba, PR
(41) 99615-2224 · marcos_mco@hotmail.com · linkedin.com/in/marcos-franco-69153a12

RESUMO EXECUTIVO
Executivo com mais de 25 anos em desenvolvimento de negócios e parcerias estratégicas de grande escala.

COMPETÊNCIAS & IDIOMAS
Business Development · Parcerias Estratégicas · Canais Indiretos · Gestão de Pipeline`;

console.log('=== estrutura: fatos do perfil + adaptação do CV ===');
let r = chamar(s, '_cvParaPDF', ['Gerente Comercial de Parcerias na Alelo', cvAlelo]);
t('nome do perfil', r.nome === 'Marcos Franco');
t('subtítulo ADAPTADO à vaga (do CV, não o fixo)', /Parcerias/.test(r.subtitulo), r.subtitulo);
t('contato do perfil, uma vez', /marcos_mco@hotmail.com/.test(r.contato) && /linkedin/.test(r.contato));
t('resumo ADAPTADO (veio do CV)', /desenvolvimento de negócios/i.test(r.resumo), r.resumo.slice(0, 40));
t('competências = keywords da vaga (do CV)', /Business Development/.test(r.competencias));
t('experiências estruturadas (fatos)', Array.isArray(r.experiencias) && r.experiencias.length > 0);
t('cada experiência tem cargo/empresa/período/bullets', r.experiencias.every(e => e.cargo && e.empresa && e.periodo && Array.isArray(e.bullets)));
t('cargo atual primeiro (cronológico reverso)', /presente/.test(r.experiencias[0].periodo), r.experiencias[0].periodo);
t('data em português', /Novembro 2025 – presente/.test(r.experiencias[0].periodo), r.experiencias[0].periodo);
t('RPC aparece nos 2 cargos (regra inviolável)', r.experiencias.filter(e => /RPC|Paranaense/i.test(e.empresa)).length === 2, r.experiencias.filter(e => /RPC|Paranaense/i.test(e.empresa)).length + ' cargos');
t('formação estruturada (4)', r.formacao.length === 4 && /Barcelona/.test(r.formacao[0].instituicao));
t('idiomas', /Português.*Inglês.*Espanhol/.test(r.idiomas));

console.log('\n=== fallback: sem CV da IA, subtítulo neutro/calibrado — NUNCA C-level chumbado (S37) ===');
r = chamar(s, '_cvParaPDF', ['', '']);
t('sem cargo da vaga, subtítulo cai em posicionamento neutro por área', /Marketing · Vendas · Operações Comerciais/.test(r.subtitulo), r.subtitulo);
t('fallback NUNCA é o C-level chumbado (era o smoking gun da Kapazi)', !/CMO · CSO · CEO/.test(r.subtitulo), r.subtitulo);
r = chamar(s, '_cvParaPDF', ['', '', 'Analista de Marketing de Produto']);
t('com cargo da vaga, fallback posiciona PELA VAGA (não pelo ápice da carreira)', /^Analista de Marketing de Produto · Curitiba/.test(r.subtitulo), r.subtitulo);
r = chamar(s, '_cvParaPDF', ['', '']);
t('resumo cai no resumo_geral do perfil', r.resumo.length > 20);
t('experiências ainda vêm (fatos)', r.experiencias.length > 0);

console.log('\n=== defesa dupla: análise junto → limpa antes ===');
r = chamar(s, '_cvParaPDF', ['vaga', 'MATCH SCORE: 80\nKeywords\n---CV---\nMARCOS FRANCO\nDiretor Comercial\n\nRESUMO EXECUTIVO\nx']);
t('análise nunca entra na estrutura', !/MATCH SCORE/.test(JSON.stringify(r)));
t('subtítulo pega a linha certa após o nome', r.subtitulo === 'Diretor Comercial', r.subtitulo);

console.log('\n=== curadoria nível-aware (S34): 1 pág até Gerente Sênior, 2 pág Diretoria/C-Level ===');
r = chamar(s, '_cvParaPDF', [cvAlelo, cvAlelo, 'Gerente Comercial Sênior']);
t('gerencial: no máximo 5 experiências (o recorte de trajetória; a paginação é outra régua)', r.experiencias.length <= 5, r.experiencias.length + ' exps');
t('gerencial: cargo atual continua primeiro', /presente/.test(r.experiencias[0].periodo));
// Eram 2 até 20/ago/2026: o CV do Grupo Zonta ("Gerente Comercial") saiu com 5 experiências das
// quais 3 sem uma única linha de entrega, e Marcos reprovou o documento. A régua virou 5 depois de
// medir as páginas com o jsPDF real — o custo da página é binário (acima de 2 cargos detalhados já
// são 2 páginas), então mutar cargo não compra mais nada. Ver a tabela no comentário da constante.
const NBULL = exec(s, 'CV_EXPS_COM_BULLETS');
t(`gerencial: as ${NBULL} mais recentes mantêm bullets`,
  r.experiencias.slice(0, NBULL).every(e => e.bullets.length > 0) && r.experiencias.slice(NBULL).every(e => e.bullets.length === 0),
  r.experiencias.map(e => e.bullets.length).join('/'));
t('gerencial: NENHUM cargo mostrado sai mudo — é a régua que o documento reprovado violava',
  r.experiencias.every(e => e.bullets.length > 0),
  r.experiencias.filter(e => !e.bullets.length).map(e => e.empresa).join(', ') || 'nenhum mudo');
t('gerencial: a régua é a constante, não um literal solto no ternário', NBULL >= 5);
t('gerencial: mesmo compactado, RPC continua nos 2 cargos (regra inviolável)', r.experiencias.filter(e => /RPC|Paranaense/i.test(e.empresa)).length === 2);
t('gerencial: fatos nunca somem do perfil-fonte (só o material encolhe)', exec(s, 'PERFIL_MARCOS.experiencias.length') > 5);

r = chamar(s, '_cvParaPDF', [cvAlelo, cvAlelo, 'Diretor Comercial']);
t('diretoria: mantém histórico completo (2 páginas é o aprovado p/ este nível)', r.experiencias.length > 5, r.experiencias.length + ' exps');
t('diretoria: todas mantêm bullets', r.experiencias.every(e => e.bullets.length > 0));

r = chamar(s, '_cvParaPDF', [cvAlelo, cvAlelo, 'CMO']);
t('c-level: mantém histórico completo', r.experiencias.length > 5, r.experiencias.length + ' exps');

r = chamar(s, '_cvParaPDF', [cvAlelo, cvAlelo, '']);
t('nível desconhecido: default seguro é NÃO cortar', r.experiencias.length > 5, r.experiencias.length + ' exps');

// ── o 1º argumento é a VAGA, nunca o CV ───────────────────────────────────────────────────
// _cvParaPDF(textoVaga, cvTexto, …): o 1º argumento decide QUAIS experiências entram, casando
// as tags_area de cada uma contra o texto da vaga. Até 20/ago/2026 o _buildPDFExecDoc passava
// `lastCV` nas duas pontas — o filtro comparava o CV contra ele mesmo, então "relevante" virava
// "o que a IA já tinha escrito" e a trajetória que a vaga pedia mas o CV não citou ficava fora.
// Erro invisível: o PDF sai bonito, só com as experiências erradas. Por isso é teste de FONTE.
const { html } = require('./_lib');
console.log('\n=== o filtro de relevância recebe a vaga, não o próprio CV ===');
t('_buildPDFExecDoc passa lastCVVaga como textoVaga',
  /_cvParaPDF\(lastCVVaga,\s*lastCV,/.test(html));
t('e nunca volta a passar lastCV nas duas pontas',
  !/_cvParaPDF\(lastCV,\s*lastCV/.test(html));

console.log('\n=== a descrição da vaga entra e sai pelo portão único de contexto do PDF ===');
// Mesma razão dos outros cinco campos: cada call site montando o contexto à mão é mais um lugar
// onde esquecer um — foi assim que o PDF já saiu calibrado pelo cargo de outra vaga.
t('_pdfCtxUsar guarda, escreve e restaura lastCVVaga (os três, não só dois)',
  /prev=\{[^}]*vaga:lastCVVaga\}/.test(html) &&
  /lastCVVaga=o\.vaga\|\|''/.test(html) &&
  /lastCVVaga=prev\.vaga/.test(html));
t('_pdfCtxDoCard tira a vaga do card pela cadeia canônica (jobDescription||descricao)',
  /vaga:\(v&&\(v\.jobDescription\|\|v\.descricao\)\)\|\|''/.test(html));
t('todo caminho que grava lastCV para o PDF também grava a vaga que o originou',
  html.split('\n').filter(l => /lastCVLang=/.test(l) && /lastCVTrad=/.test(l) && !/^let /.test(l.trim()) && !/prev\./.test(l))
      .every(l => /lastCVVaga=/.test(l)));

fim('CV_ESTRUTURA');
