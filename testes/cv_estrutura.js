// Estrutura do CV para o PDF: fatos do PERFIL_MARCOS (robusto) + adaptação do CV da IA.
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'const _PDF_LABELS={',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _secaoDoCV(',
  'function _nivelAlvoPDF(',
  'const CV_MAX_EXPS =',
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

// ── a credencial mais forte não pode depender de a IA lembrar dela ────────────────────────
// 20/ago/2026, reprovação de Marcos ao CV gerado pelo app, em uma frase: "Não cita RPC,
// Afiliada Globo, que é o mais importante." Ele estava certo, e o defeito não era da IA: o
// `resumo_geral` — semente de TODO resumo de CV, e resumo final quando a IA não devolve nada —
// dizia apenas "Executivo com mais de 25 anos liderando operações comerciais e de marketing de
// grande escala", sem uma empresa, sem um número. E os bullets da RPC diziam "8 afiliadas do
// Paraná": quem não conhece a sigla não descobria que é emissora de televisão nem que é do
// Grupo Globo — isso vivia só no parêntese do campo `empresa`. Pedir "resumo específico desta
// vaga" a partir de semente genérica devolve resumo genérico, em qualquer modelo.
console.log('\n=== a credencial mais forte está escrita no material, não subentendida (S48) ===');
const RESUMO_SEMENTE = exec(s, 'PERFIL_MARCOS.resumo_geral');
t('o resumo-semente nomeia a RPC', /RPC/.test(RESUMO_SEMENTE), RESUMO_SEMENTE.slice(0, 70) + '…');
t('o resumo-semente diz que é afiliada do Grupo Globo', /Grupo Globo/.test(RESUMO_SEMENTE));
t('o resumo-semente traz número que prova escala', /R\$ ?\d/.test(RESUMO_SEMENTE));
t('o resumo do documento (fallback sem IA) carrega a credencial', /RPC/.test(r.resumo) && /Grupo Globo/.test(r.resumo));
// Tempo de casa: 2008-11 → 2019-04 são dez anos e cinco meses. O CV chumbado antigo dizia "quase
// 12 anos" — inflar tempo de casa é mentira, e mentira não passa por aqui nem para vender melhor.
t('nenhum lugar do app infla o tempo de RPC para 11 ou 12 anos',
  !/\b(1[12]) anos\b[^.]{0,40}(RPC|Globo)|\b(RPC|Globo)\b[^.]{0,40}\b(1[12]) anos\b/i.test(html),
  (html.match(/.{0,50}\b1[12] anos\b.{0,50}/i) || ['nenhum'])[0]);

const RPC = exec(s, "PERFIL_MARCOS.experiencias.filter(e=>/^rpc-/.test(e.id))");
t('as duas passagens pela RPC continuam no perfil', RPC.length === 2);
RPC.forEach(e => {
  const texto = e.bullets.join(' ');
  t(`[${e.id}] o bullet diz que a casa é do Grupo Globo — não deixa no parêntese do nome`,
    /Grupo Globo/.test(texto), texto.slice(0, 80) + '…');
  t(`[${e.id}] o bullet diz que são emissoras, não "afiliadas" sem sujeito`,
    /emissora/i.test(texto), texto.slice(0, 80) + '…');
});

console.log('\n=== defesa dupla: análise junto → limpa antes ===');
r = chamar(s, '_cvParaPDF', ['vaga', 'MATCH SCORE: 80\nKeywords\n---CV---\nMARCOS FRANCO\nDiretor Comercial\n\nRESUMO EXECUTIVO\nx']);
t('análise nunca entra na estrutura', !/MATCH SCORE/.test(JSON.stringify(r)));
t('subtítulo pega a linha certa após o nome', r.subtitulo === 'Diretor Comercial', r.subtitulo);

// ── a trajetória não se corta pelo nível do cargo-alvo ────────────────────────────────────
// História, porque esta régua errou duas vezes seguidas e cada correção só via metade do
// problema. Até 20/ago/2026 o CV de nível gerencial mostrava as 5 mais recentes e detalhava só
// as 2 primeiras: saíam 3 cargos sem uma linha de entrega, e Marcos reprovou o CV do Grupo Zonta.
// A correção seguinte (mesmo dia) deu bullets às 5 mostradas — e Marcos reprovou de novo, o do
// Grupo Ric. A segunda reprovação é a que tinha razão: o problema nunca foi o silêncio dos
// cargos, era o CORTE. As 5 mais recentes de uma carreira são as 5 mais recentes, não as 5
// melhores — no caso dele, o corte mostrava consultoria e marcenaria e escondia a operação de
// R$ 40 milhões com 900 escolas, os 180 parceiros com 120 mil alunos e o Troféu Imprensa.
// Medido com jsPDF real (S48): 5 exps = 2 páginas, 11 exps = 2 páginas. O corte não comprava
// página nenhuma — era perda pura de credencial.
console.log('\n=== a trajetória é a mesma para qualquer nível de cargo-alvo (S48) ===');
const MAXEXPS = exec(s, 'CV_MAX_EXPS');
t('a régua é a constante, não um literal solto', MAXEXPS >= 9, MAXEXPS + '');
const NIVEIS = ['Gerente Comercial Sênior', 'Diretor Comercial', 'CMO', ''];
const porNivel = NIVEIS.map(cargo => chamar(s, '_cvParaPDF', [cvAlelo, cvAlelo, cargo]));
NIVEIS.forEach((cargo, i) => {
  const rr = porNivel[i], rot = cargo || '(nível desconhecido)';
  t(`${rot}: NENHUM cargo mostrado sai mudo — é a régua que o Grupo Zonta violava`,
    rr.experiencias.every(e => e.bullets.length > 0),
    rr.experiencias.filter(e => !e.bullets.length).map(e => e.empresa).join(', ') || 'nenhum mudo');
  t(`${rot}: nunca corta a carreira em 5 — é o defeito do Grupo Ric`,
    rr.experiencias.length > 5, rr.experiencias.length + ' exps');
  t(`${rot}: respeita o teto medido de ${MAXEXPS}`, rr.experiencias.length <= MAXEXPS, rr.experiencias.length + ' exps');
  t(`${rot}: cargo atual continua primeiro`, /presente/.test(rr.experiencias[0].periodo));
  t(`${rot}: RPC continua nos 2 cargos (regra inviolável)`,
    rr.experiencias.filter(e => /RPC|Paranaense/i.test(e.empresa)).length === 2);
});
t('gerencial vê exatamente a mesma trajetória que diretoria — o nível não cura mais o documento',
  porNivel[0].experiencias.map(e => e.empresa).join('|') === porNivel[1].experiencias.map(e => e.empresa).join('|'));
t('as credenciais de escala que o corte escondia estão no documento (EADCon · Expoente · Editel)',
  ['EADCon', 'Expoente', 'Editel'].every(emp => porNivel[0].experiencias.some(e => new RegExp(emp, 'i').test(e.empresa))),
  porNivel[0].experiencias.map(e => e.empresa.split(' ')[0]).join(', '));
t('fatos nunca somem do perfil-fonte (só o material encolhe)', exec(s, 'PERFIL_MARCOS.experiencias.length') > 5);

// ── o 1º argumento é a VAGA, nunca o CV ───────────────────────────────────────────────────
// _cvParaPDF(textoVaga, cvTexto, …): o 1º argumento decide QUAIS experiências entram, casando
// as tags_area de cada uma contra o texto da vaga. Até 20/ago/2026 o _buildPDFExecDoc passava
// `lastCV` nas duas pontas — o filtro comparava o CV contra ele mesmo, então "relevante" virava
// "o que a IA já tinha escrito" e a trajetória que a vaga pedia mas o CV não citou ficava fora.
// Erro invisível: o PDF sai bonito, só com as experiências erradas. Por isso é teste de FONTE.
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
