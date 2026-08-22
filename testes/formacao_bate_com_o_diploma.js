// A FORMAÇÃO DO CV É O QUE ESTÁ ESCRITO NO DIPLOMA — NÃO O QUE SOA MELHOR.
//
// Régua dada por Marcos em 21/ago/2026, depois de arrastar os diplomas para o Perfil:
// "Tudo o que vale é o que estão nas fotos como títulos, datas, etc."
//
// O que os documentos dizem, lidos um a um nesta data:
//
//   FAAP  — "conclusão do Curso de COMUNICAÇÃO SOCIAL em 7 de agosto de 1995 confere o título de
//            BACHAREL EM COMUNICAÇÃO SOCIAL"; apostila no verso: "NA HABILITAÇÃO PUBLICIDADE E
//            PROPAGANDA" (25/08/1997, registro USP nº 1157612). O app dizia 1989–1993 e omitia o
//            grau de bacharel: a data do fim contradizia o diploma.
//   FGV   — "Curso de Pós-Graduação Lato Sensu em GESTÃO EMPRESARIAL, nível Especialização, com
//            388 horas-aula, realizado em Curitiba–PR, em parceria com o ISAE, no período de
//            21 de maio de 1999 a 02 de setembro de 2000". O app dizia "MBA em Administração de
//            Empresas · 1998–2000": título e ano de início que o certificado não sustenta.
//   BARCELONA — "El rector de la Universitat de Barcelona otorga este Título de Máster en
//            Dirección de Marketing and Sales a MARCOS RIBEIRO FRANCO, por haber superado con
//            aprovechamiento las pruebas previstas en la edición 2013/2014 del correspondiente
//            PROGRAMA PROPIO de la Facultad de Economía y Empresa, con un total de 60 créditos"
//            (Barcelona, 11 de mayo de 2016, registro 2016/07837). Anexado por Marcos em
//            22/ago/2026. O nome do programa vale como o diploma o emite, em espanhol — traduzi-lo
//            criaria um título que nenhuma universidade conferiu.
//   ÉVORA — "concluiu a parte curricular do mestrado em Gestão de Empresas, na área de
//            especialização em Marketing, com a classificação de 14 valores, em 3 de Maio de 2004".
//            Redação escolhida por Marcos, palavra por palavra, com o documento à vista.
//
// Onde o documento é silencioso (o ano de ENTRADA), o que Marcos declarou permanece — não se
// inventa data nem se apaga a dele. Onde o documento fala, ele manda.
//
// Este teste existe para que ninguém "melhore" o CV de volta: MBA é um título que este
// certificado não confere, e 1993 é uma data que este diploma não conhece.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
const GABARITOS = 3; // PT, EN, ES — os três CVs de referência dentro do index.html

console.log('=== FAAP: o grau é bacharel, e o curso terminou em 1995 ===');
t('a semente do Perfil traz o título que o diploma confere',
  /Bacharel em Comunicação Social — habilitação em Publicidade e Propaganda/.test(html));
t('e a data que o diploma conhece', /"FAAP, São Paulo", periodo: "1989-1995"/.test(html));
t('1989–1993 não sobrou em nenhum gabarito', !/FAAP — São Paulo.{0,20}1989–1993/.test(html));
t('os três gabaritos (PT/EN/ES) foram corrigidos juntos',
  (html.match(/FAAP — São Paulo.{0,20}1989–1995/g) || []).length === GABARITOS);
t('o Worker diz a mesma coisa', /Bacharel em Comunicação Social, habilitação em Publicidade e Propaganda · FAAP/.test(worker));

console.log('\n=== FGV: o nome do curso é o do certificado; o "MBA" é decisão de Marcos ===');
// 22/ago/2026, decisão dele com o certificado à vista: "vou manter o MBA da Getúlio Vargas,
// porque aqui no Brasil MBA — por mais estranho que possa parecer — é sinônimo de pós-graduação".
// É verdade: lato sensu é o que o mercado brasileiro chama de MBA, e a própria FGV batiza assim
// os cursos dela. O erro do app nunca foi a palavra MBA — era "Administração de Empresas", nome
// que o certificado não traz. O curso é GESTÃO EMPRESARIAL, e é isso que ficou.
t('a semente nomeia o curso do certificado',
  /"MBA em Gestão Empresarial", instituicao: "FGV \/ ISAE, Curitiba"/.test(html));
t('e o Worker guarda o que o papel diz por extenso, para a IA não inflar o grau',
  /MBA em Gestão Empresarial \(pós-graduação lato sensu, nível especialização, 388h\)/.test(worker));
t('com a instituição inteira (a parceria está no papel)', /"FGV \/ ISAE, Curitiba", periodo: "1999-2000"/.test(html));
t('nenhum "MBA em Administração de Empresas" restou no app', !/MBA em Administração de Empresas/.test(html));
t('nem no Worker', !/MBA em Administração de Empresas/.test(worker));
t('nem a versão inglesa dele', !/MBA in Business Administration/.test(html));
t('nem a espanhola', !/MBA en Administración de Empresas/.test(html));
t('e 1998 não sobrou como início', !/FGV.{0,30}1998/.test(html));
t('o Worker traz o nível que o certificado diz', /nível especialização, 388h\) · FGV \/ ISAE, Curitiba \(1999–2000\)/.test(worker));
// Fora do Brasil, "MBA" afirma um grau que este certificado não confere — e o inglês e o espanhol
// são justamente os CVs que atravessam a fronteira. A decisão dele foi explícita sobre o Brasil.
t('o gabarito inglês continua preciso', /Postgraduate Specialisation in Business Management/.test(html));
t('o espanhol também', /Posgrado Lato Sensu en Gestión Empresarial/.test(html));

console.log('\n=== Barcelona: o nome do programa é o que a universidade emite ===');
t('a semente usa o título do diploma', /Máster en Dirección de Marketing and Sales/.test(html));
t('na formação dos três gabaritos', (html.match(/Máster en Dirección de Marketing and Sales\r?\nUniversitat de Barcelona/g) || []).length === GABARITOS);
t('a tradução inventada não sobrou', !/Mestre em Direção de Marketing e Vendas/.test(html) && !/Master's in Marketing and Sales Management/.test(html));
// O resumo executivo dos gabaritos também recita credenciais — e recitava as antigas ("MBA FGV",
// "Mestre ... pela Universitat de Barcelona"). É o mesmo texto indo ao recrutador, pela linha de
// cima do documento.
t('o resumo executivo não chama a FGV de MBA', !/MBA FGV|MBA at FGV|MBA en FGV/.test(html));
t('e cita Barcelona pelo nome do diploma',
  (html.match(/Máster en Dirección de Marketing and Sales (pela|at|en la) Universitat de Barcelona/g) || []).length === GABARITOS);
// A RPC foram 10 anos e 5 meses. Os resumos em inglês e espanhol ainda diziam "quase 12 anos" —
// resto da inflação medida na S48, que só tinha sido corrigida em português.
t('a RPC não é inflada em nenhum idioma', !/Nearly 12 years|Casi 12 años|12 anos de RPC/.test(html));
t('o Worker diz o mesmo', /Máster en Dirección de Marketing and Sales · Universitat de Barcelona/.test(worker));

console.log('\n=== o Worker não promete grau que os papéis não conferem ===');
// Évora é diploma de pós-graduação (parte curricular, art. 10º DL 216/92) e Barcelona é título
// de máster de PROGRAMA PROPIO. São duas pós-graduações feitas na UE — nenhuma é grau oficial de
// mestre, e a IA não pode apresentá-las como equivalência automática de qualificação europeia.
t('a frase de "qualificação da UE" saiu', !/vale como qualificação da UE/.test(worker));
t('no lugar dela, o que é verdade', /Formação de pós-graduação feita na Europa/.test(worker));

console.log('\n=== Évora: a redação escolhida por Marcos, com o documento à vista ===');
t('o app usa a redação dele', /Mestrado em Gestão de Empresas, especialização em Marketing/.test(html));
t('e o Worker também', /Mestrado em Gestão de Empresas, especialização em Marketing/.test(worker));

fim('A formação bate com o diploma');
