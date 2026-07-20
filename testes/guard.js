// GUARD TEST — invariantes de arquitetura que impedem a classe de bug de voltar.
// Não testa comportamento; testa que o CÓDIGO respeita os portões únicos.
// Se alguém (eu ou o Virgílio) criar um caminho novo que escreve o estado à mão, o commit é barrado.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const linhas = html.split('\n');

let falhou = false;
function checar(nome, regexEscrita, ehPortao) {
  const viol = [];
  linhas.forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;      // comentário
    if (!regexEscrita.test(l)) return;                        // não é escrita desse estado
    if (ehPortao(l)) return;                                  // é a definição do portão — ok
    viol.push('    ' + (i + 1) + ': ' + t.slice(0, 95));
  });
  if (viol.length) {
    falhou = true;
    console.log('  FAIL  ' + nome);
    viol.forEach(v => console.log(v));
  } else {
    console.log('  PASS  ' + nome);
  }
}

console.log('=== GUARD: o CV só é escrito pelo portão setCV ===');
// escrita = .atsCV = (mas não == / ===); o único ponto permitido é a definição de setCV
checar('nenhuma escrita direta de atsCV fora de setCV()',
  /\.atsCV\s*=(?!=)/,
  (l) => /function\s+setCV/.test(l));

console.log('\n──────────────────────────────');
if (falhou) {
  console.log('✗ GUARD FALHOU — use o portão. setCV(vaga, texto) sempre limpa a análise antes de gravar.');
  process.exit(1);
}
console.log('✓ Invariantes de arquitetura respeitadas.');
process.exit(0);
