// O QUE ESTÁ SALVO PODE FICAR VELHO — E O SENOVA TEM DE AVISAR.
//
// 21/ago/2026. Marcos arrastou os diplomas para o Perfil, eu corrigi a formação pelo que está
// escrito nos documentos, publiquei — e ele abriu a tela e viu a linha errada de novo:
// "Publicidade e Propaganda · FAAP · 1989-1993". Não era bug de gravação. Era o desenho:
// desde que o Perfil passou a mandar no CV, o que está SALVO vence o texto de fábrica. Está
// certo — quem manda é a pessoa. Mas não havia nenhum caminho de volta: quando o Senova passa a
// saber algo melhor, o dado salvo fica velho e o CV segue saindo com ele, calado.
//
// A regra que este teste guarda:
//   1. divergência entre o salvo e o documento SEMPRE aparece na tela (nunca some no silêncio);
//   2. o Senova NUNCA sobrescreve sozinho — a pessoa aceita ou mantém o dela;
//   3. só se propõe o que tem documento por trás (fonte:'diploma');
//   4. a semente é a formação de UMA pessoa: um segundo usuário jamais recebe o diploma dela;
//   5. quem edita e salva encerrou o assunto — o Senova não reabre a proposta que ela já respondeu.
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function _expEsc(',
  'function _formNorm(',
  'function _formDocumentadas(',
  'function _perfilEhDaSemente(',
  'function _formDispensadas(',
  'function _formDispensar(',
  'function _formChaveProposta(',
  'function _formDivergencias(',
  'function _formBannerHTML(',
  'function _formDispensarEditadas(',
]);

// A tela de Marcos no dia em que ele reclamou, campo por campo.
const TELA_DELE = [
  { id: 'f1', titulo: 'Mestre em Direção de Marketing e Vendas', instituicao: 'Universitat de Barcelona, Espanha', periodo: '2013/2014' },
  { id: 'f2', titulo: 'Mestrado em Gestão de Empresas', instituicao: 'Universidade de Évora, Portugal', periodo: '2002-2004' },
  { id: 'f3', titulo: 'MBA em Administração de Empresas', instituicao: 'FGV, Curitiba', periodo: '1998-2000' },
  { id: 'f4', titulo: 'Publicidade e Propaganda', instituicao: 'FAAP, São Paulo', periodo: '1989-1993' },
];
const divs = (lista) => chamar(s, '_formDivergencias', [lista]);

console.log('=== a tela dele: o Senova enxerga o que não bate ===');
let d = divs(TELA_DELE);
const porInst = (ds, marca) => ds.find(x => x.doc.instituicao.toLowerCase().includes(marca));
t('as quatro formações com diploma são apontadas', d.length === 4, d.length + ' → ' + d.map(x => x.doc.instituicao).join(' | '));
t('a FAAP entra: o título salvo omite o grau de bacharel', !!porInst(d, 'faap'));
t('e propõe o texto do diploma', porInst(d, 'faap').doc.titulo === 'Bacharel em Comunicação Social — habilitação em Publicidade e Propaganda');
t('com a data que o diploma conhece', porInst(d, 'faap').doc.periodo === '1989-1995');
t('a FGV entra: o certificado não diz "Administração de Empresas"', porInst(d, 'fgv').doc.titulo === 'MBA em Gestão Empresarial');
t('a proposta guarda o que estava salvo, para mostrar os dois lados', porInst(d, 'fgv').atual.titulo === 'MBA em Administração de Empresas');
t('e aponta a linha certa da tela', porInst(d, 'fgv').id === 'f3');
t('Évora entra porque o título salvo está incompleto', !!porInst(d, 'évora'));

console.log('\n=== sem documento, sem proposta — a regra que não depende de qual linha é ===');
// Em 21/ago/2026 Barcelona era a única formação sem foto na pasta, e servia de prova viva desta
// regra. Em 22/ago Marcos anexou o diploma, e ela entrou pela porta certa: ganhou fonte:'diploma'
// e passou a ser proposta como as outras. A regra continua valendo, e agora é guardada por um
// caso que não depende de qual linha da vida dele está descoberta.
t('Barcelona agora tem documento e é proposta', !!porInst(d, 'barcelona'));
t('com o título que o diploma confere', porInst(d, 'barcelona').doc.titulo === 'Máster en Dirección de Marketing and Sales');
t('uma formação que o Senova não conhece nunca é tocada',
  divs([{ id: 'x1', titulo: 'Extensão em Finanças', instituicao: 'Insper, São Paulo', periodo: '2010' }]).length === 0);
t('e uma entrada sem instituição também não', divs([{ id: 'x2', titulo: 'Curso qualquer', instituicao: '', periodo: '2010' }]).length === 0);
t('só o que tem documento por trás pode propor', chamar(s, '_formDocumentadas', []).every(f => f.fonte === 'diploma'));

console.log('\n=== o que já bate com o diploma fica quieto ===');
const JA_CERTO = [
  { id: 'g1', titulo: 'Bacharel em Comunicação Social — habilitação em Publicidade e Propaganda', instituicao: 'FAAP, São Paulo', periodo: '1989-1995' },
];
t('sem divergência, não há aviso', divs(JA_CERTO).length === 0);
t('e o banner não é desenhado (seção vazia desaparece)', chamar(s, '_formBannerHTML', [[]]) === '');
t('diferença só de acento ou caixa não conta como divergência',
  divs([{ id: 'g2', titulo: 'BACHAREL EM COMUNICAÇÃO SOCIAL — HABILITAÇÃO EM PUBLICIDADE E PROPAGANDA', instituicao: 'FAAP', periodo: '1989–1995' }]).length === 0);

console.log('\n=== o Senova mostra os dois lados, e a pessoa decide ===');
const html = chamar(s, '_formBannerHTML', [divs(TELA_DELE)]);
t('o aviso diz quantas são', /4 formações não batem/.test(html));
t('mostra o que está salvo', /MBA em Administração de Empresas/.test(html));
t('e o que o documento diz', /MBA em Gestão Empresarial/.test(html));
t('oferece aceitar', /formUsarDoDiploma\('f3'\)/.test(html));
t('e oferece manter o que é dela', /formManterOMeu\('f3'\)/.test(html));
t('no singular, o texto acompanha', /Uma formação não bate/.test(chamar(s, '_formBannerHTML', [divs(JA_CERTO.concat([TELA_DELE[3]]))])));

console.log('\n=== "Manter o meu" cala aquela proposta — não todas, nem para sempre ===');
const chaveFAAP = porInst(divs(TELA_DELE), 'faap').chave;
exec(s, `_formDispensar(${JSON.stringify(chaveFAAP)})`);
let d2 = divs(TELA_DELE);
t('a FAAP para de ser proposta', !porInst(d2, 'faap'));
t('mas a FGV continua aparecendo', !!porInst(d2, 'fgv'));
t('a decisão dela fica registrada', chamar(s, '_formDispensadas', []).includes(chaveFAAP));
// Se amanhã o documento disser outra coisa, a proposta é OUTRA — e volta a aparecer. Dispensar
// uma vez não pode calar o Senova para sempre sobre aquela instituição.
const outraProposta = chamar(s, '_formChaveProposta', [{ marcas: ['faap'], titulo: 'Bacharel em Comunicação Social', periodo: '1989-1995' }]);
t('uma proposta nova para a mesma instituição não nasce dispensada', !chamar(s, '_formDispensadas', []).includes(outraProposta));

console.log('\n=== a trava do segundo usuário ===');
// A semente é a formação de UMA pessoa. Propor o diploma dela a outra pessoa poria uma
// credencial falsa no CV de alguém — o oposto do que o Senova é.
exec(s, `guardarContatoSalvo({nome:'Ana Ribeiro Costa',telefone:'(11) 90000-0000',email:'ana@exemplo.com'})`);
t('o perfil deixa de ser o da semente', chamar(s, '_perfilEhDaSemente', []) === false);
t('e nenhuma formação alheia é proposta a ela', divs(TELA_DELE).length === 0);
exec(s, `guardarContatoSalvo(null,true)`);
t('de volta ao dono da semente, o aviso volta', chamar(s, '_perfilEhDaSemente', []) === true);
// E a trava não pode calar o dono por causa do nome do meio: quem escreve o nome completo na
// tela é a mesma pessoa. Uma comparação exata daria o mesmo silêncio que se está consertando.
exec(s, `guardarContatoSalvo({nome:'Marcos Ribeiro Franco',telefone:'(41) 99615-2224',email:'marcos_mco@hotmail.com'})`);
t('o nome completo continua sendo o dono da semente', chamar(s, '_perfilEhDaSemente', []) === true);
t('e o aviso continua de pé', divs(TELA_DELE).length === 3, 'FAAP segue dispensada acima');
exec(s, `guardarContatoSalvo(null,true)`);

console.log('\n=== fiação: isto vale na tela real ===');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
t('formRenderizar desenha o aviso antes da lista', /const _aviso = _formBannerHTML\(_formDivergencias\(_formDados\)\);/.test(src));
t('o aviso aparece mesmo sem nenhuma formação cadastrada', /lista\.innerHTML = _aviso \+ '<p style/.test(src));
t('e junto da lista quando há', /lista\.innerHTML = _aviso \+ _formDados\.map/.test(src));
t('aceitar não para na tela: salva o perfil', /f\.periodo=d\.doc\.periodo;[\s\S]{0,80}await salvarPerfil\(\);/.test(src));
t('e salvar o Perfil registra o que ela reescreveu',
  /guardarFormacaoSalva\(dados\.formacao,true\);\s*_formDispensarEditadas\(\);/.test(src));
t('a tela guarda como estava ao abrir, para saber o que ela mexeu',
  /_formOriginal = _formDados\.map/.test(src));


console.log('\n=== a última palavra é de quem escreve na tela ===');
// 22/ago/2026, Marcos: "vou editar o texto novo. O que vai valer é o que eu edito por último".
// Sem esta regra o Senova viraria um chato: ele reescreve a linha do jeito dele, salva, e o aviso
// reaparece propondo o diploma outra vez, para sempre. Editar E salvar É a decisão dele.
exec(s, `localStorage.removeItem('senova_form_reconc_dispensadas')`);
exec(s, `_formDados = ${JSON.stringify(TELA_DELE)}`);
exec(s, `_formOriginal = _formDados.map(f=>({id:f.id, titulo:f.titulo, periodo:f.periodo}))`);
t('antes de qualquer edição, as quatro seguem propostas', divs(TELA_DELE).length === 4);
// Ele reescreve a linha da FGV — mantendo o "MBA", que no Brasil é como se chama a pós-graduação
// lato sensu — e corrige o ano de entrada. Continua diferente do certificado, e tudo bem: é dele.
exec(s, `_formDados[2].titulo = 'MBA em Gestão Empresarial pela FGV'; _formDados[2].periodo = '1999-2000'`);
exec(s, `_formDispensarEditadas()`);
const depois = exec(s, `_formDivergencias(_formDados)`);
t('a linha que ele reescreveu para de ser proposta', !porInst(depois, 'fgv'));
t('e as que ele não tocou continuam sendo', depois.length === 3, depois.length + '');
t('inclusive a FAAP, que ele nem abriu', !!porInst(depois, 'faap'));
// Salvar o Perfil por outro motivo (mudar o telefone, por exemplo) não pode calar avisos que ele
// nunca leu: sem edição na formação, nada mais é dispensado.
exec(s, `_formDispensarEditadas()`);
t('salvar sem mexer na formação não dispensa mais nada', exec(s, `_formDivergencias(_formDados)`).length === 3);
// E a decisão dele fica de pé: a tela reaberta amanhã não ressuscita a proposta já encerrada.
t('a dispensa sobrevive à releitura da tela', divs(TELA_DELE).length === 3);
fim('O Perfil reconcilia com o diploma');
