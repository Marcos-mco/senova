// HIGIENE DO RADAR — o que já morreu sai da frente, o que não deu para verificar FICA.
//
// 27/jul/2026: dos 444 leads do radar, 86 já estavam mortos e 24 apenas bloqueados; uma vaga de
// 22/mai com nota 85 liderava a lista em 27/jul porque `cortarRadar` cortava só por volume.
// Duas remoções entram aqui, com critérios diferentes e um limite ético em comum:
//
//   • JANELA (7 dias) — relevância, regra de Marcos. Nota alta não salva vaga velha.
//   • MORTE PROVADA — 404/410 ou a própria página dizendo que encerrou.
//   • INCONCLUSIVO NUNCA SAI — bloqueio de portal não é prova de morte. É esta regra que
//     impede o Senova de apagar 24 leads bons por excesso de confiança.
//
// E nada some em silêncio: toda rodada grava o rastro em `radar_higiene`, visível no /health.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { assert } = require('./_lib');
const { t, fim } = assert();

const src = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
function extraiFn(assinatura) {
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}
function extraiConst(nome) {
  const m = src.match(new RegExp('^const ' + nome + ' = [^;\\n]*;', 'm'));   // pode ter comentário depois
  if (!m) throw new Error('não achei a constante: ' + nome);
  return m[0];
}

// Sandbox: as funções REAIS do Worker, com o verificador de link e o KV falsificados —
// aqui se testa a decisão da higiene, não o detector (esse é o testes/link_vivo.js).
let _veredictos = {}, _pedidos = [];
const KV = {
  dados: {},
  async get(k, tipo) { const v = this.dados[k]; return (tipo === 'json' && typeof v === 'string') ? JSON.parse(v) : (v ?? null); },
  async put(k, v) { this.dados[k] = v; },
};
const sandbox = {
  console,
  verificarLinkVaga: async (url) => { _pedidos.push(url); return _veredictos[url] || { estado: 'vivo' }; },
};
vm.createContext(sandbox);
vm.runInContext([
  extraiConst('TETO_RADAR'), extraiConst('TETO_RADAR_ABSOLUTO'), extraiConst('JANELA_RADAR_DIAS'),
  extraiFn('function foraDaJanela('), extraiFn('function cortarRadar('),
  extraiConst('LINKS_POR_HIGIENE'), extraiConst('REVERIFICAR_APOS_H'),
  extraiFn('async function higienizarRadar('),
].join('\n;\n'), sandbox);

const cortar = arr => vm.runInContext('cortarRadar', sandbox)(arr);
const higienizar = () => vm.runInContext('higienizarRadar', sandbox)({ SENOVA_KV: KV });
const TETO = vm.runInContext('LINKS_POR_HIGIENE', sandbox);
const diasAtras = n => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();
const horasAtras = n => Date.now() - n * 3600 * 1000;
const radar = arr => { KV.dados = { vagas_lead: JSON.stringify(arr) }; _pedidos = []; };
const leads = async () => await KV.get('vagas_lead', 'json');
const trilha = async () => await KV.get('radar_higiene', 'json');

(async () => {

  console.log('=== a janela de 7 dias (relevância, não prova de morte) ===');
  let r = cortar([
    { id: 'a', criadoEm: diasAtras(10), score: 95 },
    { id: 'b', criadoEm: diasAtras(2), score: 40 },
  ]);
  t('vaga de 10 dias sai do radar', !r.some(v => v.id === 'a'), JSON.stringify(r));
  t('nota 95 não salva vaga velha (era assim que 22/mai liderava em 27/jul)', r.length === 1);
  t('vaga de 2 dias fica', r[0].id === 'b');

  r = cortar([{ id: 'sem-data', score: 70 }, { id: 'data-quebrada', criadoEm: 'ontem' }]);
  t('lead SEM carimbo de data não é lead velho — fica', r.length === 2, JSON.stringify(r));

  r = cortar([{ id: 'nova', criadoEm: new Date().toISOString() }]);
  t('vaga de hoje continua passando pelo corte', r.length === 1);

  console.log('\n=== morte provada sai; bloqueio FICA ===');
  radar([
    { id: 'viva', criadoEm: diasAtras(1), url: 'https://x.com/viva' },
    { id: 'morta', criadoEm: diasAtras(1), url: 'https://x.com/morta' },
    { id: 'bloqueada', criadoEm: diasAtras(1), url: 'https://x.com/bloq' },
  ]);
  _veredictos = {
    'https://x.com/morta': { estado: 'morto', motivo: 'anuncio_encerrado' },
    'https://x.com/bloq': { estado: 'inconclusivo', motivo: 'portal_bloqueou' },
  };
  await higienizar();
  let ls = await leads();
  t('a vaga com anúncio encerrado sai', !ls.some(v => v.id === 'morta'), JSON.stringify(ls.map(v => v.id)));
  t('A REGRA QUE PROTEGE: a bloqueada FICA (403 não é prova de morte)', ls.some(v => v.id === 'bloqueada'));
  t('a viva fica', ls.some(v => v.id === 'viva'));
  t('e cada uma guarda o que se descobriu dela', ls.find(v => v.id === 'bloqueada').linkEstado === 'inconclusivo');
  t('com a hora da verificação (para a fila da próxima rodada)', !!ls.find(v => v.id === 'viva').linkVerificadoEm);

  console.log('\n=== o rastro: nada some em silêncio ===');
  let log = await trilha();
  t('grava a rodada em radar_higiene', log && log.status === 'ok', JSON.stringify(log));
  t('diz quantos verificou e quantos removeu', log.verificados === 3 && log.mortos_removidos === 1, JSON.stringify(log));
  t('e NOMEIA o que removeu (auditável)', log.removidos.length === 1 && log.removidos[0].url === 'https://x.com/morta');
  t('mostra o antes → depois do radar', /^3 → 2$/.test(log.radar), log.radar);

  console.log('\n=== a fila: quem nunca foi verificado passa na frente ===');
  radar([
    { id: 'recente', criadoEm: diasAtras(1), url: 'https://x.com/1', linkEstado: 'vivo', linkVerificadoEm: horasAtras(1) },
    { id: 'nunca', criadoEm: diasAtras(1), url: 'https://x.com/2' },
    { id: 'antiga', criadoEm: diasAtras(1), url: 'https://x.com/3', linkEstado: 'vivo', linkVerificadoEm: horasAtras(40) },
  ]);
  _veredictos = {};
  await higienizar();
  t('verificada há 1h não é reverificada (não se gasta fetch à toa)', !_pedidos.includes('https://x.com/1'), _pedidos.join(' '));
  t('a que nunca foi verificada entra', _pedidos.includes('https://x.com/2'));
  t('a verificada há 40h volta para a fila', _pedidos.includes('https://x.com/3'));
  t('e a nunca-verificada vem ANTES da antiga', _pedidos.indexOf('https://x.com/2') < _pedidos.indexOf('https://x.com/3'), _pedidos.join(' '));

  console.log('\n=== o teto por rodada (cron tem tempo e subrequests contados) ===');
  radar(Array.from({ length: TETO + 25 }, (_, i) => ({ id: 'v' + i, criadoEm: diasAtras(1), url: 'https://x.com/n' + i })));
  await higienizar();
  t('nunca passa de LINKS_POR_HIGIENE verificações por rodada', _pedidos.length === TETO, _pedidos.length + ' pedidos');
  t('e quem não coube continua no radar, intacto', (await leads()).length === TETO + 25);

  console.log('\n=== a rede de segurança do primeiro corte ===');
  radar([{ id: 'velha', criadoEm: diasAtras(30) }, { id: 'nova', criadoEm: diasAtras(1) }]);
  await higienizar();
  let copia = await KV.get('radar_antes_da_janela', 'json');
  t('guarda o radar inteiro ANTES do primeiro corte', copia.length === 2, JSON.stringify(copia));
  t('e o corte acontece mesmo assim', (await leads()).length === 1);
  radar([{ id: 'outra', criadoEm: diasAtras(1) }]);
  KV.dados.radar_antes_da_janela = JSON.stringify(copia);
  await higienizar();
  t('rodada seguinte NÃO sobrescreve a cópia (senão a rede some em 3h)', (await KV.get('radar_antes_da_janela', 'json')).length === 2);

  console.log('\n=== casos de borda ===');
  radar([{ id: 'sem-url', criadoEm: diasAtras(1) }, { id: 'url-vazia', criadoEm: diasAtras(1), url: '' }]);
  await higienizar();
  t('lead sem url não é verificado nem removido', _pedidos.length === 0 && (await leads()).length === 2);

  radar([]);
  await higienizar();
  t('radar vazio não quebra', (await leads()).length === 0 && (await trilha()).status === 'ok');

  KV.dados = { vagas_lead: '{isso não é json' };
  const antes = KV.dados.vagas_lead;
  await higienizar();
  t('KV corrompido: grava o erro e NÃO destrói o radar', (await trilha()).status === 'erro' && KV.dados.vagas_lead === antes);

  fim('HIGIENE DO RADAR');
})();
