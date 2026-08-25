// UM CV EM INGLÊS NÃO PODE SAIR COM BLOCO EM PORTUGUÊS.
//
// 25/ago/2026 (S52). Marcos gerou o CV para uma vaga da Jobgether (Head of Marketing). O Senova
// decidiu o idioma corretamente — inglês — e entregou um PDF em que o resumo, as competências e
// cinco das oito experiências estavam em inglês, e TRÊS experiências estavam em português, com
// cargo e tudo. As três eram justamente EADCon ("120 mil alunos"), Expoente ("300 mil alunos") e
// RPC ("R$ 500 milhões"). Não foi acaso, e não foi a IA "esquecendo" de traduzir.
//
// A causa: a guarda de veracidade dos bullets (S48) comparava TOKENS DE DÍGITO, não quantidades.
// O inglês escreve milhar com vírgula, então "120 mil alunos" vira "120,000 students" — e o
// `/\d+/g` enxergava ali os pedaços "120" e "000". Como "000" não existia no bullet original, a
// guarda concluía que a IA tinha inventado um número e recusava a reescrita daquela experiência
// INTEIRA, que caía de volta para o texto do perfil (português) em silêncio, bloco a bloco.
// Confundir FORMATAÇÃO com FATO NOVO — o único jeito de errar que produz meio documento.
//
// Um CV meio traduzido é pior que um CV inteiro em português: em português o recrutador entende
// que é um documento em outra língua; misto parece descuido do candidato. Então este teste guarda
// as duas metades do conserto:
//   1. a MESMA quantia escrita de outro jeito passa — e a quantia DIFERENTE continua barrada;
//   2. se ainda assim sobrar bloco sem tradução, o documento não se dá por pronto.
//
// Por que a suíte estava verde com o produto quebrado: `cv_bullets_por_vaga.js` roda só em PT→PT
// (onde a formatação do número nunca muda de língua, então este modo de falha não existe) e
// `cv_idioma.js` traduzia bullets SEM número nenhum ('a','b','c'). A guarda de números nunca era
// exercitada em tradução. Aqui ela é, com os números reais da carreira do dono do perfil.
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _nivelAlvoPDF(',
  'function _secaoDoCV(',
  'function _cvParaPDF(',
]);

const ORIG = id => exec(s, `PERFIL_MARCOS.experiencias.find(e=>e.id===${JSON.stringify(id)})`);
const RESP = (obj) => '---CV---\nMARCOS FRANCO\n\n---PERFIL---\n' + JSON.stringify(obj);
const traduz = (id, cargo, bullets) => chamar(s, '_extrairPerfilTraduzido',
  [RESP({ idioma: 'EN', exp: { [id]: { cargo, bullets } } })]);

console.log('=== o material real: os três blocos que voltaram em português ===');
t('EADCon fala em "120 mil alunos"', /120 mil alunos/.test(ORIG('eadcon').bullets[0]));
t('Expoente fala em "300 mil alunos"', /300 mil alunos/.test(ORIG('expoente').bullets[0]));
t('RPC fala em "R$ 500 milhões"', /500 milhões/.test(ORIG('rpc-diretor').bullets[1]));

console.log('\n=== a MESMA quantia, escrita à moda inglesa, passa (era o defeito) ===');
// Estas são traduções fiéis: mesmos fatos, mesmos valores, só a grafia do milhar mudou.
let p = traduz('eadcon', 'Marketing Director', [
  'Led the national operation with a network of 180 partners and 120,000 students.',
  'Managed R$ 20M in campaigns coordinating 25 agencies simultaneously.',
]);
t('"120 mil" → "120,000" é aceito', p && !!p.exp.eadcon, JSON.stringify(p && p.recusados));
t('e "R$ 20 milhões" → "R$ 20M" junto', p && /20M/.test(p.exp.eadcon.bullets[1]));

p = traduz('expoente', 'Sales Director', [
  'Led a R$ 40 million annual commercial operation serving 300,000 students across 900 partner schools.',
  'Managed 4 regional teams with 40 professionals in nationwide coverage.',
  'Built the sales strategy, targets and channel negotiation across the territory.',
]);
t('"300 mil" → "300,000" e "R$ 40 milhões" → "R$ 40 million" é aceito', p && !!p.exp.expoente, JSON.stringify(p && p.recusados));

p = traduz('rpc-diretor', 'Marketing Director', [
  'Ran the commercial and marketing strategy of RPC\'s 8 television stations in Paraná, the Grupo Globo affiliate, leading a 30-person team.',
  'Managed a client portfolio above R$ 500 million.',
  'Led sales support, market intelligence and training in sales technique and consumer behaviour.',
]);
t('a RPC traduzida literalmente é aceita', p && !!p.exp['rpc-diretor'], JSON.stringify(p && p.recusados));

console.log('\n=== e a quantia DIFERENTE continua barrada: a guarda não afrouxou ===');
const recusa = (nome, id, bullets, motivoEsperado) => {
  const r = traduz(id, 'Director', bullets);
  const rec = r && r.recusados.find(x => x.id === id);
  t(nome, !!(r && !r.exp[id] && rec && rec.motivo === motivoEsperado),
    r && r.exp[id] ? 'PASSOU: ' + r.exp[id].bullets[0] : JSON.stringify(rec));
};
recusa('valor inflado (500 → 800 milhões) é recusado', 'rpc-diretor', [
  'Ran the strategy of the 8 television stations with a 30-person team.',
  'Managed a client portfolio above R$ 800 million.',
  'Led sales support and market intelligence.',
], 'numero_novo');
recusa('quantidade inflada (120 mil → 200 mil alunos) é recusada', 'eadcon', [
  'Led the national operation with 180 partners and 200,000 students.',
  'Managed R$ 20M in campaigns coordinating 25 agencies.',
], 'numero_novo');
// Os dois modos de "número novo que é verdade" — e é justamente por serem verdade que a IA os
// escreve sozinha. Tempo de casa e conversão de moeda são CÁLCULO, não tradução: não estão no
// material, e o Senova não deixa a IA fazer conta sobre a vida de ninguém.
recusa('tempo de casa calculado ("7-year tenure") é recusado', 'rpc-diretor', [
  'Ran the strategy of the 8 television stations with a 30-person team across a 7-year tenure.',
  'Managed a client portfolio above R$ 500 million.',
  'Led sales support and market intelligence.',
], 'numero_novo');
recusa('conversão de moeda ("US$ 100 million") é recusada', 'rpc-diretor', [
  'Ran the strategy of the 8 television stations with a 30-person team.',
  'Managed a client portfolio above R$ 500 million (approx. US$ 100 million).',
  'Led sales support and market intelligence.',
], 'numero_novo');

console.log('\n=== o mês do período parou de assinar número fabricado ===');
// O período "2006-08 → 2008-10" entrava na lista de permitidos como "08" e "10", e passava a
// autorizar qualquer "8" ou "10" que a IA inventasse. A guarda ficava frouxa exatamente onde
// parecia rigorosa. Agora do período entra só o ANO.
recusa('"8 countries" não se justifica por a experiência ter começado em agosto', 'eadcon', [
  'Led the national operation across 8 countries with 180 partners and 120,000 students.',
  'Managed R$ 20M in campaigns coordinating 25 agencies.',
], 'numero_novo');
p = traduz('eadcon', 'Marketing Director', [
  'Led the national operation from 2006 with 180 partners and 120,000 students.',
  'Managed R$ 20M in campaigns coordinating 25 agencies.',
]);
t('mas o ANO do período continua citável ("from 2006")', p && !!p.exp.eadcon, JSON.stringify(p && p.recusados));

console.log('\n=== a recusa deixa laudo com sujeito, motivo e o número acusado ===');
// "Instrumentação sem sujeito é mentira": um contador de falhas não teria permitido diagnosticar
// nada. Este bug só foi encontrado por dedução — é isso que o laudo existe para não repetir.
p = traduz('rpc-diretor', 'Director', [
  'Ran the strategy of the 8 television stations with a 30-person team.',
  'Managed a client portfolio above R$ 800 million.',
  'Led sales support.',
]);
const rec = p && p.recusados[0];
t('o laudo nomeia a experiência', rec && rec.id === 'rpc-diretor');
t('e diz o motivo', rec && rec.motivo === 'numero_novo');
t('e mostra QUAL número não existia no material', rec && (rec.novos || []).includes('800'), JSON.stringify(rec));

console.log('\n=== e a rede final: o documento não se dá por pronto ===');
const VAGA_EN = 'Head of Marketing. We are looking for a senior leader to run our brand, demand generation and the commercial marketing agenda across markets.';
const CV_EN = 'MARCOS FRANCO\nMarketing Executive\n\nEXECUTIVE SUMMARY\nSenior executive with 25 years in marketing and sales.\n\nSKILLS\nBrand · Demand Generation';
const soUma = chamar(s, '_extrairPerfilTraduzido', [RESP({
  idioma: 'EN', exp: { eadcon: { cargo: 'Marketing Director', bullets: [
    'Led the national operation with 180 partners and 120,000 students.',
    'Managed R$ 20M in campaigns coordinating 25 agencies.',
  ] } },
})]);
let r = exec(s, '_cvParaPDF(' + JSON.stringify(VAGA_EN) + ',' + JSON.stringify(CV_EN) + ',"Head of Marketing","EN",' + JSON.stringify(soUma) + ')');
t('com uma só experiência traduzida, o documento acusa todas as outras',
  r._emPortugues.length >= r.experiencias.length - 1, JSON.stringify(r._emPortugues));
t('e a que foi traduzida NÃO é acusada',
  !r._emPortugues.some(x => /EADCon/.test(x)), JSON.stringify(r._emPortugues));
t('o laudo nomeia cargo e empresa, não um índice',
  r._emPortugues.some(x => / · /.test(x)), JSON.stringify(r._emPortugues));

console.log('\n=== em português nada disso muda (o fallback ali é correto, e continua mudo) ===');
r = exec(s, '_cvParaPDF("Gerente de Marketing","MARCOS FRANCO\\nExecutivo\\n\\nRESUMO EXECUTIVO\\nx","Gerente de Marketing","PT",null)');
t('CV em português não acusa nada', r._emPortugues.length === 0, JSON.stringify(r._emPortugues));
t('e continua montando o documento inteiro', r.experiencias.length > 3 && !!r.formacao.length);

console.log('\n=== teste de FONTE: a trava mora no ponto único de geração do PDF ===');
// Todos os caminhos de PDF — baixar, anexar no e-mail, visualizar antes de enviar, extensão —
// passam por _buildPDFExecDoc, e todos já tratam `null`. A trava em qualquer outro lugar seria
// mais um lugar para esquecer.
const build = html.slice(html.indexOf('function _buildPDFExecDoc('), html.indexOf('function _buildPDFExecDoc(') + 3000);
t('_buildPDFExecDoc lê o laudo do documento', /cv\._emPortugues/.test(build));
t('e se recusa a devolver o documento (return null)', /_emPortugues[\s\S]{0,600}?return null;/.test(build));
t('a mensagem diz que o defeito é nosso, não do usuário', /o defeito é nosso, não seu/.test(build));
t('e não deixa código de erro na cara de ninguém', !/HTTP|undefined|\[object/.test(build.split('alert(')[1] || ''));
t('o prompt proíbe CALCULAR número, mesmo verdadeiro (tempo de casa, conversão de moeda)',
  /NÃO CALCULE nenhum número novo/.test(html));
t('e avisa a IA de que a mesma quantia pode mudar de formato entre línguas',
  /A MESMA quantia pode mudar de formato/.test(html));

console.log('\n=== crivo de universalidade: a tabela de escalas é de IDIOMA, não de país ===');
// Um usuário em Berlim escreve "120.000" e um em Nova York escreve "120,000". A regra é a mesma
// para os dois; o que muda é a linha da tabela. Nenhum nome de país, serviço ou pessoa decide.
const tabela = html.slice(html.indexOf('const _ESCALAS_NUM = {'), html.indexOf('};', html.indexOf('const _ESCALAS_NUM = {')));
t('a tabela cobre mais de uma língua (não é uma lista "porque o usuário é brasileiro")',
  /milhoes/.test(tabela) && /million/.test(tabela) && /millones/.test(tabela));
t('e não carrega nome de país, serviço ou pessoa',
  !/brasil|marcos|adzuna|linkedin|jobicy/i.test(tabela), tabela.slice(0, 120));
t('"120.000" (grafia europeia) e "120,000" (grafia inglesa) são a mesma quantidade',
  [...chamar(s, '_numerosDe', ['120.000 Studenten'])].includes('120000') &&
  [...chamar(s, '_numerosDe', ['120,000 students'])].includes('120000'));
t('e "1,5 milhão" e "1.5 million" também',
  [...chamar(s, '_numerosDe', ['R$ 1,5 milhão'])].includes('1500000') &&
  [...chamar(s, '_numerosDe', ['R$ 1.5 million'])].includes('1500000'));
t('mas "8 500 clientes" continua sendo DOIS números, não oito mil e quinhentos',
  [...chamar(s, '_numerosDe', ['8 500 clientes'])].includes('8') && ![...chamar(s, '_numerosDe', ['8 500 clientes'])].includes('8500'));

console.log('\n=== "1.500" é ambíguo ENTRE línguas — e a guarda não pode inverter o erro ===');
// Mil e quinhentos em português e alemão; um vírgula cinco em inglês. A função de comparação não
// sabe em que língua o perfil foi escrito nem em qual o documento sai — então vale a leitura que
// bater. Errar para o lado de reconhecer a mesma quantia; nunca para o de aceitar outra.
t('"1.500" vale como 1500 (leitura de milhar)', [...chamar(s, '_numerosDe', ['1.500 alunos'])].includes('1500'));
t('e vale como 1.5 (leitura decimal)', [...chamar(s, '_numerosDe', ['1.500 alunos'])].includes('1.5'));
t('mas "1.500.000" não é ambíguo: dois grupos de três só podem ser milhar',
  [...chamar(s, '_numerosDe', ['1.500.000'])].includes('1500000') && ![...chamar(s, '_numerosDe', ['1.500.000'])].includes('1.5'));

console.log('\n=== nome de credencial não se traduz (S49, "vale o que está nas fotos") ===');
const sobrevive = (a, b) => chamar(s, '_nomeProprioSobrevive', [a, b]);
t('trocar só o país passa: "…, Espanha" → "…, Spain"',
  sobrevive('Universitat de Barcelona, Espanha', 'Universitat de Barcelona, Spain'));
t('mas traduzir o nome da universidade NÃO passa',
  !sobrevive('Universitat de Barcelona, Espanha', 'University of Barcelona, Spain'));
t('e "Universidade de Évora" também não vira "University of Évora"',
  !sobrevive('Universidade de Évora, Portugal', 'University of Évora, Portugal'));
t('o qualificador entre parênteses é livre: "(Grupo Globo)" → "(Globo Group)"',
  sobrevive('RPC – Rede Paranaense de Comunicação (Grupo Globo)', 'RPC – Rede Paranaense de Comunicação (Globo Group)'));
t('mas o nome da empresa antes do parêntese, não',
  !sobrevive('RPC – Rede Paranaense de Comunicação (Grupo Globo)', 'Paraná Broadcasting Network (Globo Group)'));
t('sigla curta sobrevive inteira: "FGV / ISAE, Curitiba"',
  sobrevive('FGV / ISAE, Curitiba', 'FGV / ISAE, Curitiba, Brazil'));
t('a guarda está ligada na linha da instituição (uma linha ruim descarta a lista)',
  /instituicoes[\s\S]{0,400}?_nomeProprioSobrevive/.test(html));
t('e na linha da empresa da experiência', /v\.empresa[\s\S]{0,120}?_nomeProprioSobrevive/.test(html));

console.log('\n=== a extensão não manda recarregar um app que está certo ===');
t('a razão da recusa viaja para quem pediu de longe', /_pdfRecusa=\{motivo:'traducao_incompleta'/.test(html));
t('e a ponte do copiloto repassa a razão no lugar de "pdf_falhou"',
  /erro:\(_pdfRecusa&&_pdfRecusa\.motivo\)\|\|'pdf_falhou'/.test(html));

fim('CV — a tradução não sai pela metade');
