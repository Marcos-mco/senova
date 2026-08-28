// GUARD — a versão que o Worker responde é a versão que está no ar (S53, 28/ago/2026).
//
// O buraco. A versão vivia em DOIS gravadores: o cabeçalho do arquivo e um literal solto
// dentro do /health. Dois bumps seguidos (v7.56 e v7.57) mexeram só no cabeçalho, e o
// /health passou a responder "7.55" com a v7.57 rodando. Ninguém notou, porque nada quebra:
// a rota devolve 200, o JSON está bem formado, o número é plausível.
//
// Por que isso importa mais do que parece. O /health é a única resposta barata para "isto
// que está rodando é o que eu acabei de publicar?". Uma versão errada ali não é um detalhe
// cosmético — é a instrumentação mentindo sobre o próprio sujeito, o modo de falha
// recorrente deste projeto. Um deploy que falha em silêncio passa a ser indistinguível de
// um deploy que pegou.
//
// A correção não foi trocar o número: foi acabar com o segundo gravador. Este teste trava
// os dois juntos, para que o cabeçalho e o /health nunca mais possam discordar.
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const raiz = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(raiz, 'senova-worker.js'), 'utf8');
const { t, fim } = assert();

console.log('=== a versão tem UM gravador só ===');
const mConst = worker.match(/const VERSAO_WORKER = '([0-9]+\.[0-9]+)';/);
t('existe a constante VERSAO_WORKER', !!mConst,
  'a constante sumiu — a versão voltou a ser literal solto em algum lugar');

const mCabec = worker.match(/\/\/\s+SENOVA PROXY .* Worker v([0-9]+\.[0-9]+)/);
t('o cabeçalho do arquivo declara uma versão', !!mCabec,
  'o cabeçalho perdeu o número da versão');

t('cabeçalho e constante dizem o MESMO número',
  !!mConst && !!mCabec && mConst[1] === mCabec[1],
  'cabeçalho v' + (mCabec ? mCabec[1] : '?') + ' contra constante ' + (mConst ? mConst[1] : '?') +
  ' — foi exatamente assim que o /health passou dois releases mentindo');

console.log('\n=== o /health lê a constante, nunca um literal ===');
const iH = worker.indexOf("worker: 'senova-proxy'");
t('a resposta do /health existe', iH > 0);
const health = worker.slice(iH, iH + 120);
t('o /health responde a constante',
  /versao: VERSAO_WORKER/.test(health),
  'voltou o número escrito à mão dentro do /health — o segundo gravador renasceu');
t('e não um número literal',
  !/versao: *'[0-9]/.test(health),
  'há um literal de versão no /health de novo');

fim('versao_worker');
