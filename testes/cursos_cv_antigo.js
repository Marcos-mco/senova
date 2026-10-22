// CV FEITO ANTES DA ESCOLHA DE CURSOS: O SENOVA ESCOLHE NA HORA DO DOCUMENTO (22/out/2026).
//
// O card do Diretor de Marketing tinha um CV gerado antes de a IA escolher os cursos pela vaga
// (commit d57a206). Sem a escolha, o documento levava todos — jardinagem e marcenaria num CV de
// diretor. Pedir à pessoa que "gere de novo" (com um confirm assustador) não é o Senova fazer o
// trabalho dele. Agora, antes do PDF, uma chamada pequena faz só a escolha que faltou.
//
// Guarda:
//   1. CV sem escolha → uma chamada, a escolha é gravada no card e o documento obedece;
//   2. o CV não é reescrito e as marcas da pessoa mandam (o que ela tirou nem é oferecido);
//   3. escolha já feita (inclusive "nenhum") não chama de novo; sem curso, nem chama;
//   4. dois cliques juntos fazem UMA chamada;
//   5. falha não grava nada, avisa a pessoa, e não se repete a cada clique;
//   6. a escolha é gravada no card relido pelo id (o objeto pode ter sido trocado na espera);
//   7. curso que entrou no Perfil depois da escolha não some calado.
const { carregarApp, exec, assert } = require('./_lib');
const fs = require('fs'), path = require('path');
const { t, fim } = assert();
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let chamadas = [], resposta = () => ({ content: [{ type: 'text', text: '{"cursos_no_cv":["c2"]}' }] }), avisos = [];
const s = carregarApp([
  'function _escolhaCursosVale(',
  'function montarPedidoEscolhaCursos(',
  'async function _escolherCursosAgora(',
  'async function garantirEscolhaCursos(',
], {
  WORKER_URL: 'https://worker', editingVagaId: null,
  fetch: async (url, o) => { chamadas.push({ url, body: JSON.parse(o.body) }); const r = resposta(); if (r instanceof Error) throw r; return { json: async () => r }; },
  showToast: (m) => avisos.push(m),
});
// O critério e o estado da escolha são declarações de uma linha — sem corpo para o extrai() casar.
const crit = html.match(/const CRITERIO_CURSOS_CV = '[^']*';/);
const estado = html.match(/const _escolhaCursosEmCurso=new Map\(\), _escolhaCursosFalhou=new Set\(\);/);
t('o critério da escolha tem um lugar só', !!crit);
t('o estado da escolha existe', !!estado);
exec(s, crit[0].replace('const ', 'var ') + estado[0].replace('const ', 'var '));

const CURSOS = [
  { titulo: 'Jardinagem', instituicao: 'Escola A', periodo: '2007', conteudo: '' },
  { titulo: 'Gestão de Marca', instituicao: 'Escola B', periodo: '2015', conteudo: 'Branding.' },
  { titulo: 'Marcenaria', instituicao: 'Escola C', periodo: '2020', conteudo: '' },
];
exec(s, `guardarCursosSalvos(${JSON.stringify(CURSOS)},true)`);
const K = CURSOS.map(c => exec(s, `_cursoChave(${JSON.stringify(c)})`));
const CV = 'NOME\n\nRESUMO EXECUTIVO\nTexto do CV que não pode mudar.';
const card = (extra) => Object.assign({ id: 7, cargo: 'Diretor de Marketing', empresa: 'Empresa X', jobDescription: 'Diretor de marketing, marca e mídia.', atsCV: CV, atsCVEm: 111, atsPerfilTrad: null }, extra || {});
const reset = (extra) => { chamadas = []; avisos = []; exec(s, `vagas.length=0; vagas.push(${JSON.stringify(card(extra))}); _escolhaCursosFalhou.clear();`); };
const docTitulos = () => exec(s, 'cursosDoDocumento(vagas[0].atsPerfilTrad,vagas[0].cvCursosFora,vagas[0].cvCursosDentro).map(c=>c.titulo).join("|")');

(async () => {
  console.log('\n=== CV sem escolha: o Senova escolhe antes do documento ===');
  reset();
  t('antes: o documento levaria todos', docTitulos() === 'Jardinagem|Gestão de Marca|Marcenaria');
  await exec(s, 'garantirEscolhaCursos(7)');
  t('uma chamada, pelo Worker', chamadas.length === 1 && chamadas[0].url === 'https://worker/api/claude');
  t('com modelo e teto de saída (a guarda do proxy recusa sem eles)', !!chamadas[0].body.model && chamadas[0].body.max_tokens > 0);
  t('o pedido leva a vaga e os cursos numerados', chamadas[0].body.messages[0].content.includes('Diretor de marketing, marca e mídia.') && chamadas[0].body.messages[0].content.includes('[c2] Gestão de Marca'));
  t('o pedido usa o mesmo critério do CV inteiro', chamadas[0].body.system.includes(exec(s, 'CRITERIO_CURSOS_CV')));
  t('a escolha fica gravada no card', JSON.stringify(exec(s, 'vagas[0].atsPerfilTrad.cursosEscolhidos')) === JSON.stringify([K[1]]));
  t('o documento obedece', docTitulos() === 'Gestão de Marca');
  t('o CV não foi reescrito', exec(s, 'vagas[0].atsCV') === CV && exec(s, 'vagas[0].atsCVEm') === 111);
  t('o card passa a dizer que o Senova escolheu', exec(s, '_escolhaCursosVale(vagas[0])') === true);
  t('nenhum aviso de falha', avisos.length === 0);

  console.log('\n=== escolha feita não se repete ===');
  await exec(s, 'garantirEscolhaCursos(7)');
  t('segundo documento, nenhuma chamada nova', chamadas.length === 1);
  reset({ atsPerfilTrad: { exp: {}, cursosEscolhidos: [], recusados: [] } });
  await exec(s, 'garantirEscolhaCursos(7)');
  t('"nenhum curso" também é escolha: não chama', chamadas.length === 0);
  t('e o documento sai sem cursos', docTitulos() === '');

  console.log('\n=== a marca da pessoa manda ===');
  reset({ cvCursosFora: [K[0]], cvCursosDentro: [K[2]] });
  resposta = () => ({ content: [{ type: 'text', text: '{"cursos_no_cv":["c1"]}' }] });   // c1 = Gestão de Marca (Jardinagem nem é oferecida)
  await exec(s, 'garantirEscolhaCursos(7)');
  const pedido = chamadas[0].body.messages[0].content;
  t('o curso que ela tirou nem é oferecido à IA', !pedido.includes('Jardinagem'));
  t('o que ela pôs vai como obrigatório', /Marcenaria[^\n]*a pessoa escolheu este curso para esta vaga/.test(pedido));
  t('documento: a escolha da IA + a da pessoa, sem o que ela tirou', docTitulos() === 'Gestão de Marca|Marcenaria');

  console.log('\n=== sem curso a escolher, sem chamada ===');
  reset({ cvCursosFora: K.slice() });
  await exec(s, 'garantirEscolhaCursos(7)');
  t('todos tirados pela pessoa: não chama', chamadas.length === 0);
  reset({ atsCV: '' });
  await exec(s, 'garantirEscolhaCursos(7)');
  t('card sem CV: não chama', chamadas.length === 0);

  console.log('\n=== dois cliques juntos, uma chamada ===');
  reset();
  resposta = () => ({ content: [{ type: 'text', text: '{"cursos_no_cv":["c2"]}' }] });
  await exec(s, 'Promise.all([garantirEscolhaCursos(7),garantirEscolhaCursos("7")])');
  t('uma chamada só', chamadas.length === 1);

  console.log('\n=== o card trocado durante a espera ===');
  reset();
  // saveVaga troca o objeto do card por um novo: gravar no objeto velho se perderia.
  await exec(s, 'const _p=garantirEscolhaCursos(7); vagas[0]=Object.assign({},vagas[0],{status:"lead"}); _p');
  t('a escolha cai no card atual', Array.isArray(exec(s, 'vagas[0].atsPerfilTrad&&vagas[0].atsPerfilTrad.cursosEscolhidos')) && exec(s, 'vagas[0].status') === 'lead');
  reset();
  await exec(s, 'const _q=garantirEscolhaCursos(7); vagas[0]=Object.assign({},vagas[0],{atsCVEm:222}); _q');
  t('CV refeito no meio: a escolha do CV antigo não é gravada', exec(s, 'vagas[0].atsPerfilTrad') === null);

  console.log('\n=== falha: nada gravado, a pessoa sabe, e não insiste ===');
  for (const [nome, r] of [['rede', () => new Error('offline')], ['teto do mês', () => ({ error: 'teto_atingido' })], ['resposta ilegível', () => ({ content: [{ type: 'text', text: 'não sei' }] })]]) {
    reset(); resposta = r;
    await exec(s, 'garantirEscolhaCursos(7)');
    t(nome + ': nada gravado, o documento leva todos', exec(s, 'vagas[0].atsPerfilTrad') === null && docTitulos() === 'Jardinagem|Gestão de Marca|Marcenaria');
    t(nome + ': a pessoa é avisada do que fazer', avisos.length === 1 && /leva todos/.test(avisos[0]) && /Desmarque/.test(avisos[0]));
    await exec(s, 'garantirEscolhaCursos(7)');
    t(nome + ': o clique seguinte não chama de novo', chamadas.length === 1);
  }
  resposta = () => ({ content: [{ type: 'text', text: '{"cursos_no_cv":["c9"]}' }] });
  reset();
  await exec(s, 'garantirEscolhaCursos(7)');
  t('número que não existe: a IA não acrescenta curso', JSON.stringify(exec(s, 'vagas[0].atsPerfilTrad.cursosEscolhidos')) === '[]');

  console.log('\n=== curso novo no Perfil depois da escolha não some calado ===');
  reset({ atsPerfilTrad: { exp: {}, cursosEscolhidos: [K[1]], cursosOfertados: [K[0], K[1]], recusados: [] } });
  t('Marcenaria não foi oferecida à IA: entra', docTitulos() === 'Gestão de Marca|Marcenaria');

  console.log('\n=== fiação: todo caminho do PDF do card espera a escolha ===');
  const corpo = (assin) => { const i = html.indexOf(assin); return i < 0 ? '' : html.slice(i, html.indexOf('\n}\n', i)); };
  t('botão PDF do card', /await garantirEscolhaCursos\(editingVagaId\)[\s\S]*_pdfCtxUsar\(/.test(corpo('function downloadPDFExecFromModal(')));
  t('anexo do envio pelo Outlook', /await garantirEscolhaCursos\(_idCand\)[\s\S]*_pdfCtxDoCard\(/.test(corpo('async function enviarCandidaturaOutlook(')));
  t('o modal de envio adianta a escolha (o "ver anexo" é síncrono)', /garantirEscolhaCursos\(vagas\[savedVagaIdx\]\.id\)/.test(corpo('function abrirModalCandidatura(')));
  t('o card diz a verdade sobre quando a escolha acontece', html.includes('const escolheu=_escolhaCursosVale(v);') && !html.includes('Gere o CV de novo para ele escolher pela vaga'));

  fim('CV ANTIGO · o Senova escolhe os cursos na hora do documento');
})();
