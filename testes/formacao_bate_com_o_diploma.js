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

console.log('\n=== FGV: o certificado é de especialização, não de MBA ===');
t('a semente nomeia o curso do certificado',
  /Pós-Graduação Lato Sensu em Gestão Empresarial \(Especialização\)/.test(html));
t('com a instituição inteira (a parceria está no papel)', /"FGV \/ ISAE, Curitiba", periodo: "1999-2000"/.test(html));
t('nenhum "MBA em Administração de Empresas" restou no app', !/MBA em Administração de Empresas/.test(html));
t('nem no Worker', !/MBA em Administração de Empresas/.test(worker));
t('nem a versão inglesa dele', !/MBA in Business Administration/.test(html));
t('nem a espanhola', !/MBA en Administración de Empresas/.test(html));
t('e 1998 não sobrou como início', !/FGV.{0,30}1998/.test(html));
t('o Worker traz o nível que o certificado diz', /nível especialização · FGV \/ ISAE, Curitiba \(1999–2000\)/.test(worker));

console.log('\n=== Évora: a redação escolhida por Marcos, com o documento à vista ===');
t('o app usa a redação dele', /Mestrado em Gestão de Empresas, especialização em Marketing/.test(html));
t('e o Worker também', /Mestrado em Gestão de Empresas, especialização em Marketing/.test(worker));

fim('A formação bate com o diploma');
