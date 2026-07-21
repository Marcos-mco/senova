// Estrutura do CV para o PDF: fatos do PERFIL_MARCOS (robusto) + adaptação do CV da IA.
const { carregarApp, chamar, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'function _mesLabelPDF(',
  'function _secaoDoCV(',
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

console.log('\n=== fallback: sem CV da IA, usa o perfil ===');
r = chamar(s, '_cvParaPDF', ['', '']);
t('subtítulo cai no posicionamento padrão', /Executivo de Marketing/.test(r.subtitulo));
t('resumo cai no resumo_geral do perfil', r.resumo.length > 20);
t('experiências ainda vêm (fatos)', r.experiencias.length > 0);

console.log('\n=== defesa dupla: análise junto → limpa antes ===');
r = chamar(s, '_cvParaPDF', ['vaga', 'MATCH SCORE: 80\nKeywords\n---CV---\nMARCOS FRANCO\nDiretor Comercial\n\nRESUMO EXECUTIVO\nx']);
t('análise nunca entra na estrutura', !/MATCH SCORE/.test(JSON.stringify(r)));
t('subtítulo pega a linha certa após o nome', r.subtitulo === 'Diretor Comercial', r.subtitulo);

fim('CV_ESTRUTURA');
