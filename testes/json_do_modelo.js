// GUARD — ler o JSON que o modelo escreveu, e não o estilo que ele usou para escrever (S53).
//
// Por que este teste existe. Em 27/ago/2026 medi dois modelos sobre as mesmas 30 vagas reais
// para responder à pergunta que Marcos autorizou "só com prova": a triagem pode rodar num
// modelo três vezes mais barato? A medição falhou duas vezes seguidas, e nas duas o culpado
// aparente foi o modelo barato — 23 de 30, depois 22 de 30.
//
// Nas duas vezes a culpa era nossa, em camadas:
//   1ª — `max_tokens: 1100` cortava a resposta no meio (corrigido na v7.51).
//   2ª — com a resposta inteira chegando, 20 das 22 falhas restantes foram
//        `Unexpected non-whitespace character after JSON at position ~1800`.
//        O JSON estava lá, completo e VÁLIDO. O modelo escreveu uma frase depois dele.
//        Nós jogávamos os dois fora, cobrávamos a análise e devolvíamos a vaga para a fila.
//
// Três lugares do Worker liam a resposta do mesmo jeito: tirar as cercas de crase e mandar o
// texto inteiro para o JSON.parse. Isso não é um contrato — é uma aposta em que o modelo não
// vai dizer mais nada. A aposta valia enquanto rodávamos um modelo só, o que a torna a oitava
// encarnação de "a medição de um caso virando lei para todos"
// ([[feedback_senova_para_qualquer_um_s51]]): o parser estava calibrado no estilo de UM modelo.
//
// O que este arquivo guarda é o parser rodando de verdade — não o texto dele. Um regex que
// confirme que a função existe não teria pego nenhum dos dois defeitos acima.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');

// Extrai a função REAL do Worker (balanceando chaves) e executa. Testar a função de verdade
// é o ponto: [[feedback_teste_documentava_o_bug_s52]] — suíte verde com produto quebrado
// acontece quando o teste mede o formato do código em vez do comportamento dele.
// Balanceamento de chaves NÃO serve para esta função: ela contém '{' e '}' como literais de
// texto (é disso que ela trata), e o contador pararia no lugar errado. Como toda função do
// Worker é de primeiro nível, o fim é a primeira '}' na coluna zero.
function extraiDoWorker(assinatura) {
  const i = worker.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const f = worker.indexOf('\n}\n', i);
  if (f < 0) throw new Error('função sem fim na coluna zero: ' + assinatura);
  return worker.slice(i, f + 2);
}
const jsonDoModelo = new Function(extraiDoWorker('function jsonDoModelo(') + '; return jsonDoModelo;')();

const CERCA = '`'.repeat(3);
const ok = (texto) => { try { return jsonDoModelo(texto); } catch (e) { return { _erro: e.message }; } };

console.log('=== o caminho feliz continua igual (nada aqui se mete no que já funcionava) ===');
{
  t('objeto puro', ok('{"score":72}').score === 72);
  t('objeto entre cercas de crase', ok(CERCA + 'json\n{"score":72}\n' + CERCA).score === 72);
  t('objeto com espaço em volta', ok('\n\n  {"score":72}  \n').score === 72);
  t('aninhado inteiro sobrevive (dimensões são objeto dentro de objeto)',
    ok('{"dimensoes":{"area":30,"nivel":20},"score":50}').dimensoes.nivel === 20);
}

console.log('\n=== o defeito medido: JSON válido seguido de conversa ===');
{
  // A forma exata das 20 falhas de 27/ago: objeto completo, e depois o modelo continua falando.
  const r = ok('{"score":72,"classificacao":"boa"}\n\nEspero que esta análise ajude! Se quiser, posso detalhar cada dimensão.');
  t('o objeto é lido, e a frase depois dele é ignorada', r.score === 72 && r.classificacao === 'boa');
  t('e não sobra resíduo da frase dentro do objeto', Object.keys(r).length === 2);
  const r2 = ok('Claro! Aqui está a análise:\n' + CERCA + 'json\n{"score":40}\n' + CERCA + '\nQualquer dúvida, é só pedir.');
  t('também quando o modelo fala ANTES e DEPOIS do objeto', r2.score === 40);
}

console.log('\n=== chave dentro de texto não engana a contagem ===');
{
  // Este é o erro clássico de quem conta chaves sem olhar as aspas: a análise tem campos de
  // texto livre (explicacao, impedimentos) onde um "{" pode aparecer citado da vaga.
  const r = ok('{"nota":"o anúncio dizia {sic} isso","score":10} e mais texto');
  t('chave aberta dentro de string não desloca o fim do objeto', r.score === 10);
  const r2 = ok('{"nota":"aspas escapadas \\" e uma chave } aqui","score":11} sobra');
  t('aspas escapadas dentro de string não fecham a string cedo demais', r2.score === 11);
}

console.log('\n=== o que NÃO é objeto continua sendo falha — e diz qual falha ===');
{
  t('resposta vazia é dita como vazia', /vazia/.test(ok('')._erro));
  t('texto sem nenhum objeto é dito como texto sem objeto',
    /não tem objeto JSON/.test(ok('Desculpe, não consigo analisar esta vaga.')._erro));
  // Distinguir "veio pela metade" de "veio com sobra" é o que separou o veredito das duas
  // medições. Um erro que diz só "JSON inválido" faz a próxima pessoa medir de novo à toa.
  t('objeto que nunca fecha é dito como resposta incompleta',
    /não fecha \(resposta incompleta\)/.test(ok('{"score":72,"dimensoes":{"area":30')._erro));
}

console.log('\n=== os três leitores do Worker usam o MESMO parser (senão o defeito volta em um deles) ===');
{
  const antigos = worker.match(/JSON\.parse\([^)]*replace\(\/`{3}json/g) || [];
  t('nenhum JSON.parse cru sobrou lendo texto de modelo',
    antigos.length === 0, 'ainda há leitura frágil: ' + antigos.join(' | '));
  const usos = (worker.match(/jsonDoModelo\(/g) || []).length;
  t('e há pelo menos 3 usos do parser comum (classificação de e-mail, análise de vaga, mercado)',
    usos >= 4, 'usos encontrados: ' + usos);  // 3 chamadas + a própria declaração
}

fim('json_do_modelo');
