// CV NOVO NÃO HERDA OS FATOS DO CV ANTERIOR (22/out/2026).
//
// O portão setCV só sabia trocar a tradução (atsPerfilTrad) quando recebia a RESPOSTA bruta da IA.
// Três caminhos gravam no card um CV já LIMPO que acabou de nascer — a aba Análise com o card de
// origem, o registro da candidatura e o envio de card novo. Neles o card mantinha a tradução, os
// cursos escolhidos e o idioma do CV ANTERIOR: o PDF saía com cargos em espanhol num CV em
// português, ou com a escolha de cursos de outra versão. Achado do senova-auditor.
//
// Guarda:
//   1. CV limpo novo com os seus fatos → grava os fatos e o idioma DELE e carimba a data;
//   2. CV limpo novo sem fatos → nenhum fato (nunca os do outro);
//   3. relimpar o MESMO CV conserva o que o card tinha (é conserto, não CV novo);
//   4. apagar o CV apaga os fatos;
//   5. os três caminhos de CV limpo entregam os fatos ao portão.
const { carregarApp, exec, assert } = require('./_lib');
const fs = require('fs'), path = require('path');
const { t, fim } = assert();
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const s = carregarApp([]);

const VELHO = 'MARCOS\n\nRESUMEN EJECUTIVO\nCV antiguo en español.';
const NOVO = 'MARCOS\n\nRESUMO EXECUTIVO\nCV novo em português.';
const TRAD_VELHA = { exp: { a: { cargo: 'Director' } }, cursosEscolhidos: ['x|2020'], recusados: [] };
const TRAD_NOVA = { exp: {}, cursosEscolhidos: [], recusados: [] };
const card = () => exec(s, `vagas.length=0; vagas.push(${JSON.stringify({ id: 1, atsCV: VELHO, atsCVEm: 1, atsCvIdioma: 'ES', atsPerfilTrad: TRAD_VELHA })});`);

console.log('\n=== CV limpo novo, com os fatos dele ===');
card();
exec(s, `setCV(vagas[0], ${JSON.stringify(NOVO)}, {trad:${JSON.stringify(TRAD_NOVA)}, idioma:'PT'})`);
t('o CV é o novo', exec(s, 'vagas[0].atsCV') === NOVO);
t('a tradução é a do CV novo, não a do velho', JSON.stringify(exec(s, 'vagas[0].atsPerfilTrad')) === JSON.stringify(TRAD_NOVA));
t('o idioma é o do CV novo', exec(s, 'vagas[0].atsCvIdioma') === 'PT');
t('a data diz que este CV acabou de nascer', exec(s, 'vagas[0].atsCVEm') > 1);
card();
exec(s, `setCV(vagas[0], ${JSON.stringify(NOVO)}, {trad:null, idioma:'PT'})`);
t('CV novo em português sem tradução: a tradução velha sai', exec(s, 'vagas[0].atsPerfilTrad') === null);

console.log('\n=== CV limpo novo, sem fatos ===');
card();
exec(s, `setCV(vagas[0], ${JSON.stringify(NOVO)})`);
t('nenhum fato do CV velho fica', exec(s, 'vagas[0].atsPerfilTrad') === null);

console.log('\n=== relimpar o mesmo CV é conserto ===');
card();
exec(s, `setCV(vagas[0], vagas[0].atsCV)`);
t('a tradução continua', JSON.stringify(exec(s, 'vagas[0].atsPerfilTrad')) === JSON.stringify(TRAD_VELHA));
t('o idioma continua', exec(s, 'vagas[0].atsCvIdioma') === 'ES');
t('a data não muda', exec(s, 'vagas[0].atsCVEm') === 1);
card();
exec(s, `vagas[0].atsCV = '---ANALISE---\\nMATCH SCORE: 80\\n---CV---\\n' + vagas[0].atsCV; setCV(vagas[0], vagas[0].atsCV)`);
t('CV poluído limpo de novo: tradução continua', !!exec(s, 'vagas[0].atsPerfilTrad'));

console.log('\n=== apagar o CV ===');
card();
exec(s, `setCV(vagas[0], '')`);
t('sem CV, sem fatos', exec(s, 'vagas[0].atsCV') === '' && exec(s, 'vagas[0].atsPerfilTrad') === null);

console.log('\n=== os caminhos de CV limpo entregam os fatos ===');
const n = (re) => (html.match(re) || []).length;
t('aba Análise → card de origem', n(/setCV\(vagas\[_vi\],cv,\{trad:lastCVTrad,idioma:lastCVLang\}\)/g) === 1);
t('registro da candidatura', n(/setCV\(vagas\[savedIdx\],lastCV,\{trad:lastCVTrad,idioma:lastCVLang\}\)/g) === 1);
t('envio de card novo', n(/setCV\(vagas\[vagaIdx\],lastCV,\{trad:lastCVTrad,idioma:lastCVLang\}\)/g) === 1);
t('nenhum outro caminho grava lastCV sem os fatos', n(/setCV\([^,]+,lastCV\)/g) === 0);

fim('CV NOVO · nunca herda tradução, cursos ou idioma do anterior');
