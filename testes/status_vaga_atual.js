// "JÁ SE CANDIDATOU" NÃO PODE VAZAR DE UMA VAGA PARA OUTRA.
//
// 25/jul/2026: o copiloto afirmou "você já se candidatou a esta vaga" numa vaga (Sicoob) que estava
// em Oportunidade — nunca enviada. Causa raiz medida no código: _copilotoAnalise sobrevive à troca
// de vaga (o painel precisa sobreviver ao re-render do SPA). Quando você navega para uma vaga nova
// cujo PULL do card NÃO casa (app fechado OU vaga sem card — buscarAnaliseDoApp devolve null para os
// dois, indistinguíveis), o status='aplicado' da vaga ANTERIOR (que você de fato enviou) não é
// sobrescrito e o banner acende na vaga errada.
//
// A correção (geral, vale para qualquer portal): amarrar o status à identidade da vaga na tela.
// _statusVagaAtual só devolve o status se _analiseChave === _chaveVaga() — i.e., se a análise foi
// ESTABELECIDA para a vaga que está na tela agora. _analiseChave é carimbado ao injetar análise nova
// e ao casar card no PULL; NUNCA na reinjeção do watchdog (mesmo objeto), senão revalidaria o status
// velho na vaga nova.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');

function extrai(assinatura, txt) {
  const src = txt;
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei: ' + assinatura);
  const abre = src.indexOf('{', i);
  let d = 0, j = abre;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) break; }
  }
  return src.slice(i, j + 1);
}

// Monta um sandbox com as duas funções reais + o estado que elas leem (o "ambiente" da vaga na tela).
const fontes = [
  extrai('function _chaveVaga(', ct),
  extrai('function _statusVagaAtual(', ct),
].join('\n;\n');

const sandbox = { console, _analiseChave: null, _refVaga: () => ({}) };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fontes, sandbox);

let ok = 0, fail = 0;
const t = (nome, cond, det) => { if (cond) { ok++; console.log('  PASS  ' + nome); } else { fail++; console.log('  FAIL  ' + nome + (det ? '  → ' + det : '')); } };
// "Vai para a vaga X": o que _refVaga leria na tela agora.
const naVaga = (ref) => { sandbox._refVaga = () => ref; };
const chaveDe = (ref) => vm.runInContext('_chaveVaga(' + JSON.stringify(ref) + ')', sandbox);
const status = (an) => vm.runInContext('_statusVagaAtual(' + JSON.stringify(an) + ')', sandbox);

const VAGA_A = { jobId: '111', empresa: 'ACME', cargo: 'Diretor' };        // a que você ENVIOU
const VAGA_B = { jobId: '222', empresa: 'Sicoob Sul', cargo: 'Superintendente Comercial' }; // lead

console.log('=== caso correto: análise estabelecida para a vaga na tela → banner acende ===');
naVaga(VAGA_A);
sandbox._analiseChave = chaveDe(VAGA_A);
t('aplicado na PRÓPRIA vaga devolve "aplicado"', status({ status: 'aplicado' }) === 'aplicado', JSON.stringify(status({ status: 'aplicado' })));

console.log('\n=== o bug do Sicoob: status da vaga A sobra ao navegar para a vaga B → suprimido ===');
naVaga(VAGA_B); // navegou; _analiseChave AINDA é da vaga A (PULL de B não casou)
t('aplicado de OUTRA vaga não vaza para a vaga na tela', status({ status: 'aplicado' }) === '', JSON.stringify(status({ status: 'aplicado' })));

console.log('\n=== identidade nunca estabelecida (nenhum PULL/injeção casou) → suprimido ===');
sandbox._analiseChave = null;
t('sem identidade, status não é afirmado', status({ status: 'aplicado' }) === '', JSON.stringify(status({ status: 'aplicado' })));

console.log('\n=== recasou na vaga B (PULL de B trouxe card lead) → status de B, honesto ===');
sandbox._analiseChave = chaveDe(VAGA_B);
t('lead de B aparece como lead (não "aplicado")', status({ status: 'lead' }) === 'lead');
t('sem análise devolve vazio', status(null) === '');

console.log('\n=== _chaveVaga distingue as duas vagas (senão a trava não teria como comparar) ===');
t('chaves de A e B são diferentes', chaveDe(VAGA_A) !== chaveDe(VAGA_B), chaveDe(VAGA_A) + ' vs ' + chaveDe(VAGA_B));
t('_chaveVaga aceita ref explícita (usada pelo PULL p/ carimbar a vaga perguntada)', chaveDe(VAGA_B) === 'job:222');

// ── Sem a fiação nos 3 pontos, a função pura acima nunca é acionada de verdade ──────────────
console.log('\n=== FIAÇÃO no content.js: os 3 pontos que fazem a trava valer ===');
t('o banner "já se candidatou" passa por _statusVagaAtual (não lê an.status cru)',
  /_statusVagaAtual\(an\) === 'aplicado'/.test(ct));
t('o PULL carimba a identidade da vaga perguntada', /_analiseChave = chaveRef/.test(ct));
t('o PULL captura chaveRef ANTES de perguntar (à prova de corrida de navegação)',
  /const chaveRef = _chaveVaga\(ref\)[\s\S]{0,1200}_analiseChave = chaveRef/.test(ct));
// A regra é "carimbar só quando a análise é NOVA" — não a grafia de 24/jun. Em 31/jul o carimbo
// precisou sair de dentro do `if` (a ordem estava errada: carimbava antes de a análise nova
// entrar em vigor, gravando a identidade da vaga ANTERIOR). A condição continua a mesma; o que
// mudou foi onde ela é avaliada. Asseverar a regra, não o texto.
t('injetarCopiloto carimba SÓ em análise nova, não na reinjeção do watchdog',
  /(if \(an !== _copilotoAnalise\) \{[^}]*_analiseChave = _chaveVaga\(\))|(const _analiseNova = an !== _copilotoAnalise;[\s\S]{0,200}if \(_analiseNova\) \{[^}]*_analiseChave = _chaveVaga\(\))/.test(ct));
// E o carimbo vem DEPOIS da troca — senão ele identifica a vaga que acabou de sair de cena.
// Detalhe em testes/identidade_vaga.js, que nasceu dos dois diagnósticos de 31/jul.
{
  const i = ct.indexOf('function injetarCopiloto(');
  const bloco = ct.slice(i, i + 1400);
  t('o carimbo vem depois de _copilotoAnalise = an (a vaga nova, não a anterior)',
    bloco.indexOf('_copilotoAnalise = an;') < bloco.indexOf('_analiseChave = _chaveVaga()'));
}
t('o reinject do watchdog passa o MESMO objeto (por isso an !== _copilotoAnalise o filtra)',
  /injetarCopiloto\(_copilotoAnalise\)/.test(ct));

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `STATUS DA VAGA ATUAL: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
process.exit(fail === 0 ? 0 : 1);
