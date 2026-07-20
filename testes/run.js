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

let falharam = [];
for (const f of arquivos) {
  process.stdout.write('\n▶ ' + f + '\n');
  try {
    execFileSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  } catch (_) {
    falharam.push(f);
  }
}

console.log('\n══════════════════════════════');
if (falharam.length) {
  console.log('✗ FALHOU: ' + falharam.join(', '));
  process.exit(1);
}
console.log('✓ Todos os testes da espinha passaram (' + arquivos.length + ' arquivos).');
process.exit(0);
