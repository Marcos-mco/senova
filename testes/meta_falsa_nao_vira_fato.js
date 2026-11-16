// "Não encontrei" não é um lugar.
//
// POR QUE ISTO EXISTE (16/nov/2026). Ao medir os dados reais de Marcos para construir o filtro
// de Cidade, 150 dos 163 processos ativos tinham a palavra "undefined" gravada no lugar da
// cidade (295 no total, mais 20 no arquivo). A origem: quando a extensão lia a página da vaga e
// não achava o local, o app transformava o valor ausente em texto e o gravava como FATO de
// página. O card mostrava "Cargo · undefined", e a IA recebia "localização: undefined" como dado
// inquestionável em toda análise.
//
// A recusa mora no ponto único de gravação (_gravarMetaVaga, via _metaValida), para valer para
// todo campo e toda fonte. E os cards já sujos são limpos uma vez — sem mover card de coluna,
// sem apagar nota e sem tocar em data, porque tirar uma palavra errada não é atividade do
// usuário e não pode custar IA.

const { html, carregarApp, exec, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([]);
const roda = expr => exec(s, expr);

console.log('=== o ponto único recusa o valor ausente disfarçado de texto ===');
for (const falso of ['undefined', 'null', 'NaN', ' Undefined ', 'NULL']) {
  for (const fonte of ['pagina', 'ia']) {
    const r = roda(`_gravarMetaVaga({}, {localizacao:${JSON.stringify(falso)}, modelo:${JSON.stringify(falso)}, regime:${JSON.stringify(falso)}, jornada:${JSON.stringify(falso)}, salario:${JSON.stringify(falso)}}, "${fonte}")`);
    t(`"${falso.trim()}" não é gravado em campo nenhum (fonte ${fonte})`,
      !r.localizacao && !r.modelo && !r.regime && !r.jornada && !r.salario && !r.metaInferida);
  }
}
t('valor ausente de verdade continua não gravando', (() => { const r = roda('_gravarMetaVaga({}, {localizacao:undefined, modelo:null}, "pagina")'); return !('localizacao' in r) && !('modelo' in r); })());
t('o valor falso não apaga uma cidade verdadeira que o card já tinha',
  roda('_gravarMetaVaga({localizacao:"Curitiba, PR"}, {localizacao:"undefined"}, "pagina")').localizacao === 'Curitiba, PR');
t('cidade verdadeira continua sendo gravada', roda('_gravarMetaVaga({}, {localizacao:"Berlim, Alemanha"}, "pagina")').localizacao === 'Berlim, Alemanha');
t('espaço em volta do valor é aparado', roda('_gravarMetaVaga({}, {localizacao:"  Lisboa  "}, "pagina")').localizacao === 'Lisboa');
t('um lugar cujo nome CONTÉM a palavra não é confundido', roda('_gravarMetaVaga({}, {localizacao:"Null Island"}, "pagina")').localizacao === 'Null Island');

console.log('\n=== a origem não fabrica mais o texto ===');
t('nenhum valor da extensão é convertido em texto por concatenação', !/extra\.\w+\s*\+\s*''/.test(html));
t('o local vindo da extensão passa pela mesma recusa', /_metaValida\(extra\.local\)/.test(html));

console.log('\n=== a limpeza dos cards já gravados ===');
{
  const r = roda(`(()=>{ const v={id:7,status:'aplicado',score:82,atsScore:'82',updatedAt:111,cargo:'Gerente',localizacao:'undefined',modelo:'null',regime:'CLT',jornada:'',salario:'undefined',metaInferida:{modelo:true,regime:true}};
    const mexeu=_limparMetaFalsa(v); return {mexeu, v}; })()`);
  t('avisa que mexeu', r.mexeu === true);
  t('a cidade falsa fica em branco', r.v.localizacao === '');
  t('modelo e salário falsos ficam em branco', r.v.modelo === '' && r.v.salario === '');
  t('o que era verdadeiro fica', r.v.regime === 'CLT' && r.v.cargo === 'Gerente');
  t('a marca de chute do campo limpo sai; a do campo verdadeiro fica', !r.v.metaInferida.modelo && r.v.metaInferida.regime === true);
  t('a coluna não muda', r.v.status === 'aplicado');
  t('a nota não muda — limpar não pode custar IA', r.v.score === 82 && r.v.atsScore === '82');
  t('a data de atividade não muda — o card não vira "mexido hoje"', r.v.updatedAt === 111);
}
t('card limpo não é tocado', roda(`(()=>{ const v={localizacao:'São Paulo, SP',modelo:'Remoto'}; const m=_limparMetaFalsa(v); return m===false && v.localizacao==='São Paulo, SP'; })()`));
t('card sem os campos não ganha campo vazio', roda(`(()=>{ const v={cargo:'x'}; _limparMetaFalsa(v); return !('localizacao' in v); })()`));

console.log('\n=== a limpeza roda uma vez, ao abrir, antes de gravar ===');
{
  const i = html.indexOf('function loadCRM(');
  const corpo = html.slice(i, html.indexOf('function saveVagas(', i));
  const iMig = corpo.indexOf("senova_migration_meta_falsa_v1");
  t('a limpeza está na abertura do app', iMig > 0 && /vagas\.forEach\(_limparMetaFalsa\)/.test(corpo));
  t('e vem antes da gravação que fecha as migrações', iMig < corpo.indexOf('Store.gravar();'));
}

fim('valor ausente não vira fato');
