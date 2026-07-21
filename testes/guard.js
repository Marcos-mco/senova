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

console.log('\n=== GUARD: o status só muda pelo portão setStatus ===');
// escrita de status com literal (o perigoso — sumiço de card). Permitido: a definição de
// setStatus (que escreve status=novo, variável) e pontos legítimos marcados [status-ok]
// (migração one-shot, criação de card, revert). Todo o resto passa por setStatus.
checar('nenhuma escrita direta de status fora de setStatus (ou marcada [status-ok])',
  /\.status\s*=\s*['"]/,
  (l) => /\[status-ok\]/.test(l) || /function\s+setStatus/.test(l));

console.log('\n──────────────────────────────');
if (falhou) {
  console.log('✗ GUARD FALHOU — use o portão certo: setCV(vaga,texto) para o CV, setStatus(vaga,novo,opts) para o status. Pontos legítimos fora do portão levam o marcador [status-ok] com o motivo.');
  process.exit(1);
}
console.log('✓ Invariantes de arquitetura respeitadas.');
process.exit(0);
