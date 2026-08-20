// OS BULLETS DO CV SE ADAPTAM À VAGA — e nenhum fato novo entra junto.
//
// O defeito (20/ago/2026, CV do Grupo Ric Paraná, uma emissora de TV): o prompt mandava a IA
// otimizar a redação dos bullets para a vaga, a IA fazia isso, e o `_cvParaPDF` jogava tudo fora e
// colava os bullets fixos do PERFIL_MARCOS. O bloco estruturado ---PERFIL---, único caminho pelo
// qual o texto da IA chega aos fatos do documento, só era PEDIDO quando o CV saía em inglês ou
// espanhol. Resultado: TODO CV em português saía com os mesmos bullets, palavra por palavra,
// qualquer que fosse a vaga — 11 anos de emissora de TV afiliada da Globo apareciam numa vaga de
// TV com o mesmo texto genérico de uma vaga de marcenaria. Marcos reprovou dois CVs seguidos.
//
// Agora a IA reescreve, e quem garante a verdade é o código. Este teste guarda os dois lados:
// a adaptação CHEGA ao documento, e nenhum fato novo passa junto com ela.
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _nivelAlvoPDF(',
  'const CV_EXPS_COM_BULLETS =',
  'function _cvParaPDF(',
]);

const ID = 'rpc-diretor';
const ORIG = exec(s, `PERFIL_MARCOS.experiencias.find(e=>e.id==='${ID}')`);
const bloco = (bullets, extra) => '---CV---\nMARCOS FRANCO\n\n---PERFIL---\n' +
  JSON.stringify(Object.assign({ idioma: 'PT', exp: { [ID]: { bullets } } }, extra || {}));

console.log('=== o material bruto existe e é o que o defeito congelava ===');
t('a experiência da RPC tem 3 bullets no perfil', (ORIG.bullets || []).length === 3);
t('e os números que o CV pode citar estão neles', /8 afiliadas/.test(ORIG.bullets[0]) && /500 milhões/.test(ORIG.bullets[1]));

console.log('\n=== a reescrita HONESTA chega ao documento ===');
// Mesmos fatos, mesmos números, ângulo de TV — que é o que a vaga da RIC pedia.
const TV = [
  'Negociou a veiculação publicitária das 8 afiliadas do Paraná junto a agências e ao mercado anunciante, à frente de equipe de 30 profissionais.',
  'Respondeu por carteira de clientes superior a R$ 500 milhões.',
  'Estruturou inteligência de mercado e capacitação comercial das equipes de vendas da emissora.',
];
let trad = chamar(s, '_extrairPerfilTraduzido', [bloco(TV)]);
t('o bloco em português é aceito (era ignorado: só existia para tradução)', !!trad && !!trad.exp[ID]);
let pdf = chamar(s, '_cvParaPDF', ['Gerente de Negócios, mercado nacional, emissora de TV', 'MARCOS FRANCO\n\nRESUMO EXECUTIVO\nx', 'Gerente de Negócios', 'PT', trad]);
let rpc = pdf.experiencias.find(e => /Diretor de Marketing/.test(e.cargo));
t('a RPC está no documento', !!rpc);
t('e os bullets são os REESCRITOS PARA A VAGA, não os fixos do perfil',
  /veiculação publicitária/.test(rpc.bullets[0]) && !/^Responsável pela estratégia/.test(rpc.bullets[0]),
  rpc.bullets[0].slice(0, 70));
t('o cargo continua sendo o fato do perfil (a IA não promove ninguém)', rpc.cargo === ORIG.cargo, rpc.cargo);

console.log('\n=== nenhum fato novo entra junto: a guarda de veracidade ===');
// A IA passou a ter caneta sobre o texto dos fatos. Estas são as travas que sobraram no lugar da
// proibição antiga — e cada uma falha para o lado seguro: cai no texto original, nunca em invenção.
const recusado = (bullets, nome) => {
  const p = chamar(s, '_extrairPerfilTraduzido', [bloco(bullets)]);
  t(nome, !p || !p.exp[ID], p && p.exp[ID] ? 'PASSOU: ' + p.exp[ID].bullets[0] : '');
};
recusado(['Carteira superior a R$ 800 milhões.', TV[1], TV[2]], 'valor inflado (R$ 500 mi → R$ 800 mi) é recusado');
recusado(['Liderou 12 afiliadas do Paraná.', TV[1], TV[2]], 'quantidade inflada (8 → 12 afiliadas) é recusada');
recusado(['Equipe de 300 profissionais.', TV[1], TV[2]], 'equipe inflada (30 → 300) é recusada');
recusado([...TV, 'Quarta entrega que nunca existiu.'], 'bullet a mais (fato inteiro novo) é recusado');
recusado(TV.slice(0, 2), 'bullet a menos (entrega apagada) é recusado');

console.log('\n=== recusar não é apagar: o documento cai no fato original ===');
trad = chamar(s, '_extrairPerfilTraduzido', [bloco(['Carteira superior a R$ 800 milhões.', TV[1], TV[2]])]);
pdf = chamar(s, '_cvParaPDF', ['vaga de TV', 'MARCOS FRANCO\n\nRESUMO EXECUTIVO\nx', 'Gerente de Negócios', 'PT', trad]);
rpc = pdf.experiencias.find(e => /Diretor de Marketing/.test(e.cargo));
t('a experiência recusada continua no CV, com o texto do perfil', rpc.bullets.length === 3 && /^Responsável pela estratégia/.test(rpc.bullets[0]));
t('e o R$ 800 milhões inventado não está em lugar nenhum do documento', !JSON.stringify(pdf).includes('800'));

console.log('\n=== a recusa é por experiência, não do documento inteiro ===');
trad = chamar(s, '_extrairPerfilTraduzido', ['---CV---\nx\n---PERFIL---\n' + JSON.stringify({
  idioma: 'PT',
  exp: {
    [ID]: { bullets: ['Inventou R$ 900 milhões.', TV[1], TV[2]] },
    popper: { bullets: ['Abriu canal indireto de vendas com rede de representantes.', 'Estruturou governança comercial.', 'Conduziu projetos de performance.'] },
  },
})]);
t('a experiência limpa é aproveitada', trad && !!trad.exp.popper);
t('e a suja, no mesmo bloco, é descartada sozinha', trad && !trad.exp[ID]);

console.log('\n=== teste de FONTE: o bloco não pode voltar a ser só de tradução ===');
// Era um ternário `traduzir ? bloco : ''` no fim do ATS_SYSTEM. Enquanto for assim, todo CV em
// português nasce genérico de novo — por isso a proibição é verificada no texto do prompt.
t('o prompt pede o bloco ---PERFIL--- sempre, não só quando traduz',
  !/\$\{traduzir \? `\s*\n\s*---PERFIL---/.test(html));
t('o prompt manda o bloco declarar o idioma (é o que dispensa carregar lang até o extrator)',
  /"idioma":"\$\{lang\}"/.test(html));
t('o prompt avisa que é o bloco que vira o documento',
  /É O QUE VAI PARA O DOCUMENTO/.test(html));
t('o prompt declara os números intocáveis',
  /NÚMEROS SÃO INTOCÁVEIS/.test(html));
t('a seção COMPETÊNCIAS é exigida (saiu vazia no CV do Grupo Ric)',
  /seção de competências é obrigatória/i.test(html));

fim('BULLETS POR VAGA');
