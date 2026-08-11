// O primeiro teste de todos: o app ABRE?
//
// POR QUE ISTO EXISTE (11/ago/2026, S45). Publiquei um `const apagaveis`
// duplicado dentro de `renderWidgetRevisao`. Duas declarações do mesmo nome no
// mesmo escopo não são um bug de comportamento: são um SyntaxError. E o
// index.html tem UM único bloco <script> — o navegador não executa nada dele.
// Não "quebrou a lista de Para Considerar": morreu o app inteiro. A tela do
// Marcos ficou com o Início e o Avaliar Posição empilhados, nenhum clique
// respondendo.
//
// A suíte tinha 36 arquivos e 900+ asserções, e passou toda. Porque cada teste
// EXTRAI a função que lhe interessa e roda só ela num sandbox — nenhum deles
// jamais tinha perguntado se o arquivo, inteiro, compila.
//
// É a pergunta mais barata e mais fundamental que existe aqui, e vem antes de
// qualquer outra: um teste de comportamento sobre um app que não abre está
// descrevendo algo que não roda.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { assert } = require('./_lib');
const { t, fim } = assert();

const raiz = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8');

// O index.html roda como script clássico; o Worker é um módulo ES (`export
// default`), e módulo tem regras próprias — checar um com as regras do outro
// inventa erro que não existe. Cada um na sua gramática.
function compila(codigo, nome) {
  try { new vm.Script(codigo, { filename: nome }); return null; }
  catch (e) { return e.message; }
}

function compilaModulo(codigo) {
  try {
    execFileSync(process.execPath, ['--check', '--input-type=module'], { input: codigo, stdio: ['pipe', 'pipe', 'pipe'] });
    return null;
  } catch (e) {
    return String(e.stderr || e.message).split('\n').filter(l => /Error|SyntaxError/.test(l))[0] || 'erro de sintaxe';
  }
}

const ehModulo = c => /^\s*(export|import)\s/m.test(c);

console.log('=== 1. o index.html inteiro compila ===');
{
  const html = ler('index.html');

  // Só os blocos inline: <script src=...> aponta para fora e não tem corpo aqui.
  const blocos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  t('há bloco de script inline para verificar', blocos.length > 0);

  for (const m of blocos) {
    const linha = html.slice(0, m.index).split('\n').length;
    const erro = compila(m[1], 'index.html');
    t('o bloco <script> da linha ' + linha + ' compila', erro === null, erro);
  }

  // Um `const` repetido no mesmo escopo é exatamente o que passou. O sandbox do
  // vm devolve a mensagem do V8 — a mesma que o Chrome mostraria no console, que
  // é onde ninguém olhou porque a regra é não pedir DevTools ao Marcos.
  const duplicadas = compila('function f(){ const x=1; const x=2; return x; }');
  t('a checagem realmente pega declaração duplicada',
    duplicadas !== null && /already been declared/.test(duplicadas));
}

console.log('\n=== 2. o Worker e a extensão também ===');
{
  // Vão para produção sem passar por build nenhum. `npx wrangler deploy` até
  // valida, mas a extensão não valida nada: um erro de sintaxe em content.js
  // simplesmente não injeta, em silêncio.
  const outros = [
    'senova-worker.js',
    'senova-extension/background.js',
    'senova-extension/content.js',
    'senova-extension/popup.js',
  ];

  for (const f of outros) {
    if (!fs.existsSync(path.join(raiz, f))) { t(f + ' existe', false, 'arquivo não encontrado'); continue; }
    const codigo = ler(f);
    const erro = ehModulo(codigo) ? compilaModulo(codigo) : compila(codigo, f);
    t(f + ' compila', erro === null, erro);
  }
}

console.log('\n=== 3. o que este teste NÃO promete ===');
{
  // Compilar não é funcionar. `foo()` sem foo definido compila e explode no
  // primeiro clique; `renderWidgetRevisao` podia ter sido escrita com o nome
  // certo e a lógica errada e este arquivo não veria nada. Ele fecha uma porta
  // só — a porta por onde a classe inteira de erros mais grave passou.
  const erro = compila('function f(){ naoExiste(); }');
  t('código que compila ainda pode quebrar em execução', erro === null);
}

fim('O APP COMPILA · A PERGUNTA QUE VEM ANTES DE TODAS AS OUTRAS');
