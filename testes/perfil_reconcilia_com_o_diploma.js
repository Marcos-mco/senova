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
//   4. a semente é a formação de UMA pessoa: um segundo usuário jamais recebe o diploma dela.
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
t('as três formações com diploma são apontadas', d.length === 3, d.length + ' → ' + d.map(x => x.doc.instituicao).join(' | '));
t('a FAAP entra: o título salvo omite o grau de bacharel', !!porInst(d, 'faap'));
t('e propõe o texto do diploma', porInst(d, 'faap').doc.titulo === 'Bacharel em Comunicação Social — habilitação em Publicidade e Propaganda');
t('com a data que o diploma conhece', porInst(d, 'faap').doc.periodo === '1989-1995');
t('a FGV entra: o certificado não confere MBA', porInst(d, 'fgv').doc.titulo === 'Pós-Graduação Lato Sensu em Gestão Empresarial (Especialização)');
t('a proposta guarda o que estava salvo, para mostrar os dois lados', porInst(d, 'fgv').atual.titulo === 'MBA em Administração de Empresas');
t('e aponta a linha certa da tela', porInst(d, 'fgv').id === 'f3');
t('Évora entra porque o título salvo está incompleto', !!porInst(d, 'évora'));

console.log('\n=== Barcelona NÃO entra: não existe documento ===');
// A única linha da formação sem foto na pasta de diplomas. Sem papel, o Senova não corrige
// ninguém — nem para melhor. Se um dia o diploma aparecer, ele ganha fonte:'diploma' e passa a
// valer pela mesma porta.
t('nenhuma proposta menciona Barcelona', !d.some(x => /barcelona/i.test(x.doc.instituicao)));
t('e a semente marca só o que tem documento', chamar(s, '_formDocumentadas', []).length === 3);

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
t('o aviso diz quantas são', /3 formações não batem/.test(html));
t('mostra o que está salvo', /MBA em Administração de Empresas/.test(html));
t('e o que o documento diz', /Pós-Graduação Lato Sensu em Gestão Empresarial/.test(html));
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
exec(s, `guardarContatoSalvo(null)`);
t('de volta ao dono da semente, o aviso volta', chamar(s, '_perfilEhDaSemente', []) === true);
// E a trava não pode calar o dono por causa do nome do meio: quem escreve o nome completo na
// tela é a mesma pessoa. Uma comparação exata daria o mesmo silêncio que se está consertando.
exec(s, `guardarContatoSalvo({nome:'Marcos Ribeiro Franco',telefone:'(41) 99615-2224',email:'marcos_mco@hotmail.com'})`);
t('o nome completo continua sendo o dono da semente', chamar(s, '_perfilEhDaSemente', []) === true);
t('e o aviso continua de pé', divs(TELA_DELE).length === 2, 'FAAP segue dispensada acima');
exec(s, `guardarContatoSalvo(null)`);

console.log('\n=== fiação: isto vale na tela real ===');
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
t('formRenderizar desenha o aviso antes da lista', /const _aviso = _formBannerHTML\(_formDivergencias\(_formDados\)\);/.test(src));
t('o aviso aparece mesmo sem nenhuma formação cadastrada', /lista\.innerHTML = _aviso \+ '<p style/.test(src));
t('e junto da lista quando há', /lista\.innerHTML = _aviso \+ _formDados\.map/.test(src));
t('aceitar não para na tela: salva o perfil', /f\.periodo=d\.doc\.periodo;[\s\S]{0,80}await salvarPerfil\(\);/.test(src));

fim('O Perfil reconcilia com o diploma');
