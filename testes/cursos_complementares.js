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
const cvDoc = (lang, trad, fora, dentro) => chamar(s, '_cvParaPDF', [VAGA, 'NOME\n\nRESUMO EXECUTIVO\nx', 'Gerente', lang || 'PT', trad || null, fora || [], dentro || []]);

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
t('com número, instituição, ano e conteúdo', bloco.includes('- [c1] Curso Alfa, Escola Um (2010) — Tema A; tema B.'));
t('sem conteúdo, sem traço pendurado', bloco.includes('- [c2] Curso Beta, Escola Dois (2011)\n'));

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

console.log('\n=== a pessoa tira um curso do CV desta vaga (21/out/2026) ===');
// Jardinagem no CV de Diretor de Marketing: o card guarda o que fica de fora; o Perfil, todos.
const foraAlfa = [exec(s, `_cursoChave(${JSON.stringify(CURSOS[0])})`)];
const docCorte = cvDoc('PT', null, foraAlfa);
t('o curso tirado não sai no documento', docCorte.cursos.length === 1 && docCorte.cursos[0].titulo === 'Curso Beta');
t('o Perfil continua com os dois', exec(s, 'cursosDoCV().length') === 2);
const docCorteEN = cvDoc('EN', ok, foraAlfa);
t('com tradução, o curso que fica leva a SUA tradução, não a do vizinho', docCorteEN.cursos.length === 1 && docCorteEN.cursos[0].titulo === 'Beta Course');
const foraTodos = CURSOS.map(c => exec(s, `_cursoChave(${JSON.stringify(c)})`));
t('tirados todos, o documento fica sem a seção', cvDoc('PT', null, foraTodos).cursos.length === 0);
t('tirados todos num CV traduzido, nada é acusado de ficar em português', !(cvDoc('EN', metade, foraTodos)._emPortugues || []).includes('Cursos complementares'));
console.log('\n=== o curso tirado da vaga não chega à IA (21/out/2026) ===');
// Sem isto, a jardinagem tirada do PDF voltava pelo texto que a IA escreve para a vaga.
const blocoCorte = exec(s, `_blocoCursosPrompt(${JSON.stringify(foraAlfa)})`);
t('o pedido à IA não leva o curso tirado', !blocoCorte.includes('Curso Alfa') && blocoCorte.includes('Curso Beta'));
t('tirados todos, o pedido fica sem a seção', exec(s, `_blocoCursosPrompt(${JSON.stringify(foraTodos)})`) === '');
t('sem corte, o pedido leva todos', exec(s, '_blocoCursosPrompt()').includes('Curso Alfa'));
const trCorte = exec(s, `_extrairPerfilTraduzido(${JSON.stringify(resp([{ titulo: 'Beta Course', conteudo: '' }]))},${JSON.stringify(foraAlfa)})`);
t('a tradução da lista cortada é aceita (conta os cursos DESTA vaga)', trCorte && trCorte.cursos && trCorte.cursos.length === 1);
t('e casa pelo curso, não pela posição', cvDoc('EN', trCorte, foraAlfa).cursos[0].titulo === 'Beta Course');
t('curso que volta ao CV depois, sem tradução, é denunciado', (cvDoc('EN', trCorte, []) ._emPortugues || []).includes('Cursos complementares'));
t('e o que tinha tradução continua traduzido', cvDoc('EN', trCorte, []).cursos[1].titulo === 'Beta Course');
t('tradução antiga (sem chave) segue casando pela lista completa', cvDoc('EN', { exp: {}, cursos: [{ titulo: 'Alpha Course', conteudo: 'Topic A.' }, { titulo: 'Beta Course', conteudo: '' }] }, foraAlfa).cursos[0].titulo === 'Beta Course');
t('a chave ignora caixa, acento e espaço', exec(s, `_cursoChave({titulo:' Manutenção  de JARDINS ',periodo:'2007'})`) === exec(s, `_cursoChave({titulo:'manutencao de jardins',periodo:'2007'})`));

console.log('\n=== quem escolhe os cursos de cada vaga é a IA, e o documento obedece (22/out/2026) ===');
// Jardinagem no PDF de Diretor de Marketing: o texto da IA já a tinha tirado, o PDF relia o Perfil.
const kA = foraAlfa[0], kB = exec(s, `_cursoChave(${JSON.stringify(CURSOS[1])})`);
const respPT = (extra) => '---CV---\nx\n---PERFIL---\n' + JSON.stringify(Object.assign({ idioma: 'PT', exp: {} }, extra));
const extrair = (texto, fora) => exec(s, `_extrairPerfilTraduzido(${JSON.stringify(texto)}${fora ? ',' + JSON.stringify(fora) : ''})`);
const escolhaB = extrair(respPT({ cursos_no_cv: ['c2'] }));
t('em português a escolha é guardada mesmo sem bullet reescrito', escolhaB && JSON.stringify(escolhaB.cursosEscolhidos) === JSON.stringify([kB]));
t('o documento leva só o curso escolhido', cvDoc('PT', escolhaB).cursos.map(c => c.titulo).join('|') === 'Curso Beta');
t('o Perfil continua com todos', exec(s, 'cursosDoCV().length') === 2);
const nenhum = extrair(respPT({ cursos_no_cv: [] }));
t('lista vazia = nenhum curso, e a seção some', nenhum && cvDoc('PT', nenhum).cursos.length === 0);
const semEscolha = extrair(respPT({ exp: { inexistente: { bullets: [] } } }));
t('sem a escolha, ela fica null (não é "nenhum")', semEscolha && semEscolha.cursosEscolhidos === null);
t('e o documento leva todos — curso nunca some sem alguém escolher', cvDoc('PT', semEscolha).cursos.length === 2);
const invent = extrair(respPT({ cursos_no_cv: ['c9', 'jardinagem', 'c1', 1] }));
t('número que não existe é ignorado: a IA só tira, nunca acrescenta', JSON.stringify(invent.cursosEscolhidos) === JSON.stringify([kA]));
t('a numeração é a da lista que a IA recebeu (com corte, c1 é o primeiro que sobrou)',
  JSON.stringify(extrair(respPT({ cursos_no_cv: ['c1'] }), foraAlfa).cursosEscolhidos) === JSON.stringify([kB]));
t('o pedido numera na mesma lista', exec(s, `_blocoCursosPrompt(${JSON.stringify(foraAlfa)})`).includes('- [c1] Curso Beta'));

console.log('\n=== a marca da pessoa manda sobre a escolha da IA ===');
t('a pessoa põe de volta o que a IA tirou', cvDoc('PT', escolhaB, [], [kA]).cursos.map(c => c.titulo).join('|') === 'Curso Alfa|Curso Beta');
const ambos = extrair(respPT({ cursos_no_cv: ['c1', 'c2'] }));
t('o que a pessoa tirou não volta, mesmo escolhido pela IA', cvDoc('PT', ambos, foraAlfa).cursos.map(c => c.titulo).join('|') === 'Curso Beta');
t('o curso que a pessoa pôs de volta vai ao pedido como escolha dela', exec(s, `_blocoCursosPrompt([],${JSON.stringify([kA])})`).includes('Tema A; tema B. (a pessoa escolheu'));

console.log('\n=== em outra língua: traduz todos, o documento leva os escolhidos ===');
const en = extrair('---CV---\nx\n---PERFIL---\n' + JSON.stringify({ idioma: 'EN', cursos_no_cv: ['c2'], exp: { inexistente: { bullets: [] } }, cursos: [{ titulo: 'Alpha Course', conteudo: 'Topic A; topic B.' }, { titulo: 'Beta Course', conteudo: '' }] }));
t('a escolha vem junto da tradução', en && en.cursos && en.cursos.length === 2 && JSON.stringify(en.cursosEscolhidos) === JSON.stringify([kB]));
t('o documento leva o escolhido, traduzido', cvDoc('EN', en).cursos.map(c => c.titulo).join('|') === 'Beta Course');
t('e o que a pessoa pôs de volta já tem tradução', cvDoc('EN', en, [], [kA]).cursos[0].titulo === 'Alpha Course');

console.log('\n=== fiação: o pedido real pede a escolha, e todo caminho do PDF a leva ===');
const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
t('o pedido à IA traz a chave cursos_no_cv', html.includes('"cursos_no_cv":['));
t('a IA é instruída a escolher pela vaga, podendo não pôr nenhum', html.includes('CURSOS COMPLEMENTARES: escolha quais entram NESTE CV pelo que esta vaga pede') && html.includes('Pode não entrar nenhum'));
t('o PDF lê os cursos pelo ponto único', html.includes('const _noDoc=new Set(cursosDoDocumento(trad,cursosFora,cursosDentro)'));
t('o PDF recebe a marca da pessoa', /_cvParaPDF\(lastCVVaga, lastCV, atsCargo, lastCVLang, lastCVTrad, lastCVCursosFora, lastCVCursosDentro[,)]/.test(html));
t('o PDF da extensão leva a marca da pessoa', /cursosDentro:\(v&&v\.cvCursosDentro\)\|\|\[\][,}]/.test(html));
t('o card mostra a mesma seleção que o PDF', html.includes('cursosDoDocumento(v.atsPerfilTrad,v.cvCursosFora,v.cvCursosDentro)'));
t('resposta cortada no teto avisa a pessoa nos dois caminhos do card', (html.match(/stop_reason==='max_tokens'\) showToast\(/g) || []).length === 2);

exec(s, 'guardarCursosSalvos([],true)');
fim('CURSOS COMPLEMENTARES · seção própria, escolhida pela vaga, nunca vazia');
