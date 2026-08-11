// Roda TODOS os testes da espinha (testes/*.js) e falha (exit 1) se algum falhar.
// Usado pelo pre-commit hook — se qualquer teste quebra, o commit é barrado.
// Rodar à mão: node testes/run.js
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const arquivos = fs.readdirSync(dir)
  .filter(f => f.endsWith('.js') && f !== 'run.js' && !f.startsWith('_')) // _lib.js etc. são helpers, não testes
  .sort();

// Este vem primeiro e, se falhar, para tudo: se o index.html nem compila, o app
// não abre — e os outros 36 arquivos passariam felizes falando de funções que
// extraem uma a uma de um arquivo que o navegador inteiro recusa. Foi assim que
// um `const` duplicado chegou à produção com a suíte verde (S45).
const PRIMEIRO = 'app_compila.js';
const iP = arquivos.indexOf(PRIMEIRO);
if (iP > 0) arquivos.unshift(arquivos.splice(iP, 1)[0]);

let falharam = [];
for (const f of arquivos) {
  process.stdout.write('\n▶ ' + f + '\n');
  try {
    execFileSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  } catch (_) {
    falharam.push(f);
    if (f === PRIMEIRO) {
      console.log('\n══════════════════════════════');
      console.log('✗ O app não compila. Nada mais faz sentido rodar até isto passar.');
      process.exit(1);
    }
  }
}

console.log('\n══════════════════════════════');
if (falharam.length) {
  console.log('✗ FALHOU: ' + falharam.join(', '));
  process.exit(1);
}
console.log('✓ Todos os testes da espinha passaram (' + arquivos.length + ' arquivos).');
process.exit(0);
