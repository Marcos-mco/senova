// CURSOS COMPLEMENTARES: O QUE A PESSOA CADASTRA NO PERFIL SAI NO CV, NUMA SEÇÃO PRÓPRIA.
//
// Nasceu em 15/out/2026: dois cursos livres (jardinagem, 2007) estavam só como foto em
// Perfil › Certificados e diplomas — o CV não tinha onde pô-los. A seção nova segue a regra da
// formação: ponto único de leitura (cursosDoCV), sem semente, e lista vazia NÃO aparece no CV
// (nem o título da seção, nem um "nenhum curso").
//
// Guarda:
//   1. quem não cadastrou curso não ganha seção vazia (prompt nem documento);
//   2. quem cadastrou vê os cursos no prompt e no documento, na ordem dada;
//   3. num CV traduzido, título e conteúdo traduzidos entram; instituição e ano são fato;
//   4. tradução pela metade não passa calada — vira "ficou em português".
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _nivelAlvoPDF(',
  'function _cvParaPDF(',
  'function _extrairPerfilTraduzido(',
  'function _nomeProprioSobrevive(',
  'function _numerosNovosDe(',
  'let _cursoDados =',
  'function _cursoNovoId(',
  'function cursoRenderizar(',
  'function _cursoCarregar(',
  'function _cursoParaPayload(',
]);

const VAGA = 'Gerente de operações, liderança de equipe.';
const cvDoc = (lang, trad) => chamar(s, '_cvParaPDF', [VAGA, 'NOME\n\nRESUMO EXECUTIVO\nx', 'Gerente', lang || 'PT', trad || null]);

const CURSOS = [
  { id: 'c1', titulo: 'Curso Alfa', instituicao: 'Escola Um', periodo: '2010', conteudo: 'Tema A; tema B.' },
  { id: 'c2', titulo: 'Curso Beta', instituicao: 'Escola Dois', periodo: '2011', conteudo: '' },
];

console.log('\n=== sem curso cadastrado, não há seção ===');
exec(s, 'guardarCursosSalvos([],true)');
t('cursosDoCV devolve lista vazia', exec(s, 'cursosDoCV().length') === 0);
t('o prompt não ganha bloco de cursos', exec(s, '_blocoCursosPrompt()') === '');
t('o documento não ganha cursos', (cvDoc().cursos || []).length === 0);

console.log('\n=== a tela salva o que a pessoa digitou, na ordem ===');
exec(s, `_cursoCarregar(${JSON.stringify(CURSOS)})`);
exec(s, `_cursoDados.push({id:'c3',titulo:'',instituicao:'',periodo:'',conteudo:''})`);
const payload = exec(s, '_cursoParaPayload()');
t('curso em branco não vai para o Worker', payload.length === 2);
exec(s, `guardarCursosSalvos(${JSON.stringify(payload)},true)`);
t('o que foi salvo é o que o CV lê', exec(s, 'cursosDoCV().map(c=>c.titulo).join("|")') === 'Curso Alfa|Curso Beta');

console.log('\n=== o prompt recebe os cursos ===');
const bloco = exec(s, '_blocoCursosPrompt()');
t('bloco tem o título da seção', bloco.includes('CURSOS COMPLEMENTARES'));
t('com instituição, ano e conteúdo', bloco.includes('- Curso Alfa, Escola Um (2010) — Tema A; tema B.'));
t('sem conteúdo, sem traço pendurado', bloco.includes('- Curso Beta, Escola Dois (2011)\n'));

console.log('\n=== o documento em português ===');
const doc = cvDoc();
t('dois cursos, na ordem dada', doc.cursos.length === 2 && doc.cursos[0].titulo === 'Curso Alfa');
t('conteúdo vai como foi escrito', doc.cursos[0].conteudo === 'Tema A; tema B.');

console.log('\n=== tradução ===');
// Uma experiência de id desconhecido entra só para o bloco não ser descartado como vazio.
const resp = (cursos) => '---CV---\nx\n---PERFIL---\n' + JSON.stringify({ idioma: 'EN', exp: { inexistente: { bullets: [] } }, cursos });
const ok = exec(s, `_extrairPerfilTraduzido(${JSON.stringify(resp([{ titulo: 'Alpha Course', conteudo: 'Topic A; topic B.' }, { titulo: 'Beta Course', conteudo: '' }]))})`);
t('tradução completa é aceita', ok && ok.cursos && ok.cursos.length === 2);
const docEN = cvDoc('EN', ok);
t('título traduzido entra no documento', docEN.cursos[0].titulo === 'Alpha Course');
t('instituição e ano são fato: não mudam', docEN.cursos[0].instituicao === 'Escola Um' && docEN.cursos[0].periodo === '2010');
t('"Cursos complementares" não é acusado de ficar em português', !(docEN._emPortugues || []).includes('Cursos complementares'));

const metade = exec(s, `_extrairPerfilTraduzido(${JSON.stringify(resp([{ titulo: 'Alpha Course', conteudo: 'Topic A.' }]))})`);
t('lista com contagem diferente é recusada inteira', !(metade && metade.cursos));
const semConteudo = exec(s, `_extrairPerfilTraduzido(${JSON.stringify(resp([{ titulo: 'Alpha Course', conteudo: '' }, { titulo: 'Beta Course', conteudo: '' }]))})`);
t('conteúdo que existia e sumiu na tradução derruba a lista', !(semConteudo && semConteudo.cursos));
t('e o documento avisa que ficou em português', (cvDoc('EN', metade)._emPortugues || []).includes('Cursos complementares'));

exec(s, 'guardarCursosSalvos([],true)');
fim('CURSOS COMPLEMENTARES · seção própria, nunca vazia');
