// O QUE MARCOS ESCREVE NO PERFIL É O QUE SAI NO CV.
//
// O defeito (21/ago/2026): a tela Perfil › Minhas Experiências existia desde a S47, tinha campo
// para cargo, empresa, datas e entregas, salvava no Worker e devolvia "✅ Perfil salvo" — e nada
// daquilo chegava ao documento. A carreira do CV vinha de um bloco fixo dentro do index.html.
// Marcos perguntou "como faço para editar as informações dos últimos 6 anos?" e a resposta
// honesta era: por esta tela, não dá. Ela salvava num lugar que o CV não lia.
//
// Este teste guarda os dois lados dessa correção:
//   1. quem edita o Perfil vê a edição no CV (senão a tela volta a ser decorativa);
//   2. quem NÃO editou nada continua recebendo a carreira de sempre, inteira — o documento
//      nunca sai vazio, nem pela metade, porque o Worker caiu ou o navegador é outro.
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _nivelAlvoPDF(',
  'function _cvParaPDF(',
  'let _expDados =',
  'function _expNovoId(',
  'function expRenderizar(',
  'function _expCarregar(',
  'function _expParaPayload(',
  'let _formDados =',
  'function _formNovoId(',
  'function formRenderizar(',
  'function _formCarregar(',
  'function _formParaPayload(',
]);

const VAGA = 'Gerente Comercial em Curitiba, liderança de equipe de vendas e canais indiretos.';
const cvDoc = () => chamar(s, '_cvParaPDF', [VAGA, 'MARCOS FRANCO\n\nRESUMO EXECUTIVO\nx', 'Gerente Comercial', 'PT', null]);
const semente = exec(s, 'PERFIL_MARCOS.experiencias');

console.log('=== sem nada salvo, a carreira é a de sempre (a rede) ===');
let pdf = cvDoc();
t('o CV sai com a trajetória inteira', pdf.experiencias.length >= 9, String(pdf.experiencias.length));
t('e começa pelo cargo atual', /Consigliere/.test(pdf.experiencias[0].empresa), pdf.experiencias[0].empresa);
t('nenhum cargo sai sem empresa', pdf.experiencias.every(e => e.cargo && e.empresa));

console.log('\n=== a tela abre com essa mesma carreira, não vazia ===');
chamar(s, '_expCarregar', [[]]);
let tela = exec(s, '_expDados');
t('a tela mostra as 13 experiências do histórico', tela.length === semente.length, String(tela.length));
t('as datas aparecem como a pessoa escreve (mm/aaaa)', tela[0].inicio === '11/2025', tela[0].inicio);
t('o cargo em curso vem marcado como atual', tela[0].atual === true && tela[0].fim === '');
t('um cargo encerrado traz a data de saída', tela[1].fim === '11/2025' && tela[1].atual === false, tela[1].fim);
t('as áreas viram texto separado por vírgula', /consultoria, marketing/.test(tela[0].tags_area), tela[0].tags_area);
t('as entregas vêm uma por linha', tela[1].bullets_texto.split('\n').length === 3);
t('o id original é preservado (é por ele que a guarda de veracidade casa o fato)', tela[0].id === 'consigliere');

console.log('\n=== salvar sem mudar nada não muda o CV (ida e volta pela tela) ===');
exec(s, 'guardarExperienciasSalvas(_expParaPayload())');
let pdf2 = cvDoc();
t('o mesmo número de experiências', pdf2.experiencias.length === pdf.experiencias.length, `${pdf2.experiencias.length} vs ${pdf.experiencias.length}`);
t('os mesmos cargos, na mesma ordem', JSON.stringify(pdf2.experiencias.map(e => e.cargo)) === JSON.stringify(pdf.experiencias.map(e => e.cargo)));
t('os mesmos períodos', JSON.stringify(pdf2.experiencias.map(e => e.periodo)) === JSON.stringify(pdf.experiencias.map(e => e.periodo)),
  (pdf2.experiencias[0] || {}).periodo);
t('as mesmas entregas', JSON.stringify(pdf2.experiencias.map(e => e.bullets)) === JSON.stringify(pdf.experiencias.map(e => e.bullets)));

console.log('\n=== o que Marcos edita na tela chega ao documento ===');
exec(s, `(function(){
  const e=_expDados.find(x=>x.id==='consigliere');
  e.bullets_texto='Conduziu 4 projetos de reestruturação comercial, com ganho médio de 18% em receita recorrente.';
  const p=_expDados.find(x=>x.id==='popper');
  p.local='Curitiba, PR';
  guardarExperienciasSalvas(_expParaPayload());
})()`);
let pdf3 = cvDoc();
let cons = pdf3.experiencias.find(e => /Consigliere/.test(e.empresa));
t('a entrega reescrita está no CV', /18% em receita recorrente/.test((cons.bullets || []).join(' ')), (cons.bullets || []).join(' ').slice(0, 80));
t('e a antiga saiu de cena', !/fase de crescimento e consolidação/.test((cons.bullets || []).join(' ')));
t('a trajetória continua inteira depois da edição', pdf3.experiencias.length === pdf.experiencias.length);

console.log('\n=== apagar tudo na tela não apaga a carreira do documento ===');
// Regra dura: o CV é o que a pessoa manda para o recrutador. Uma tela zerada por engano — ou um
// navegador novo, ou um Worker fora do ar — não pode virar um currículo sem carreira nenhuma.
exec(s, 'guardarExperienciasSalvas([])');
let pdf4 = cvDoc();
t('o CV volta para a carreira de sempre', pdf4.experiencias.length === pdf.experiencias.length, String(pdf4.experiencias.length));

console.log('\n=== dado quebrado não vira documento pela metade ===');
exec(s, `guardarExperienciasSalvas([{id:'x',cargo:'Diretor',empresa:'',inicio:'',bullets:['algo']}])`);
t('experiência sem empresa e sem início é descartada', exec(s, 'experienciasSalvas()') === null);
t('e o CV cai na carreira de sempre, não numa lista vazia', cvDoc().experiencias.length === pdf.experiencias.length);

exec(s, `guardarExperienciasSalvas([
  {id:'a',cargo:'Diretor Comercial',empresa:'Empresa A',inicio:'03/2020',fim:'',atual:true,tags_area:'vendas, gestão',nivel:'diretoria',incluir_por_padrao:true,bullets:['Dobrou a receita da operação.']},
  {id:'b',cargo:'Gerente',empresa:'',inicio:'01/2015',bullets:[]}
])`);
let mix = exec(s, 'experienciasSalvas()');
t('numa lista mista, a boa fica e a quebrada sai', mix.length === 1 && mix[0].id === 'a', String(mix.length));
t('o cargo em curso vira fim:null (é assim que o filtro sabe que ainda está em curso)', mix[0].fim === null);
t('a data digitada em mm/aaaa vira aaaa-mm para o documento', mix[0].inicio === '2020-03', mix[0].inicio);
t('as áreas voltam a ser lista', Array.isArray(mix[0].tags_area) && mix[0].tags_area.length === 2);
let pdf5 = cvDoc();
t('o CV mostra só a experiência utilizável', pdf5.experiencias.length === 1 && /Empresa A/.test(pdf5.experiencias[0].empresa));
t('e escreve o período por extenso, a partir da data convertida', /Março 2020/.test(pdf5.experiencias[0].periodo), pdf5.experiencias[0].periodo);

console.log('\n=== a conversão de datas aceita o que a pessoa realmente digita ===');
const iso = v => chamar(s, '_mesISO', [v]);
t('"11/2025"', iso('11/2025') === '2025-11');
t('"3/2020" (sem zero à esquerda)', iso('3/2020') === '2020-03');
t('"2025-11" (já no formato do documento)', iso('2025-11') === '2025-11');
t('"2019" (só o ano)', iso('2019') === '2019-01');
t('"ontem" não vira data', iso('ontem') === '');
t('vazio continua vazio', iso('') === '');
t('a volta para a tela', chamar(s, '_mesBR', ['2020-03']) === '03/2020');

// ─────────────────────────────────────────────────────────────────────────────────────────────
// FORMAÇÃO — mesmo defeito, descoberto um dia depois. Marcos: "foi atualizado no meu perfil o
// mestrado de Évora, mas não no CV". Não tinha como: o Perfil não possuía NENHUM campo de
// formação. O único lugar onde dava para escrever "Évora" era o CV mestre colado, que é texto
// guardado e nunca lido na hora de escrever o documento.
console.log('\n=== a formação sai do Perfil, com a mesma rede da carreira ===');
const sementeForm = exec(s, 'PERFIL_MARCOS.formacao');
let doc = cvDoc();
t('sem nada salvo, a formação é a de sempre', doc.formacao.length === sementeForm.length, String(doc.formacao.length));
t('e o mestrado de Évora está lá', doc.formacao.some(f => /Évora/.test(f.instituicao)));

chamar(s, '_formCarregar', [[]]);
t('a tela de formação abre preenchida, não vazia', exec(s, '_formDados.length') === sementeForm.length);
t('com o curso, a instituição e o período', exec(s, `_formDados.find(f=>/Évora/.test(f.instituicao)).titulo`) === 'Mestre em Marketing');

exec(s, `(function(){
  const e=_formDados.find(f=>/Évora/.test(f.instituicao));
  e.titulo='Mestre em Marketing e Comunicação Empresarial';
  e.periodo='2002-2005';
  guardarFormacaoSalva(_formParaPayload());
})()`);
let doc2 = cvDoc();
let evora = doc2.formacao.find(f => /Évora/.test(f.instituicao));
t('a correção do mestrado chega ao documento', evora.titulo === 'Mestre em Marketing e Comunicação Empresarial', evora.titulo);
t('e o período corrigido também', evora.periodo === '2002-2005', evora.periodo);
t('as outras formações continuam intactas', doc2.formacao.length === sementeForm.length);

exec(s, `guardarFormacaoSalva([{titulo:'',instituicao:'',periodo:'2020'}])`);
t('formação sem curso e sem instituição é descartada', exec(s, 'formacaoSalva()') === null);
t('e o CV volta para a formação de sempre', cvDoc().formacao.length === sementeForm.length);

exec(s, 'guardarFormacaoSalva([])');
t('apagar tudo na tela não apaga a formação do documento', cvDoc().formacao.length === sementeForm.length);

fim('Perfil manda no CV');
