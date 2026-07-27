// GUARD TEST — invariantes de arquitetura que impedem a classe de bug de voltar.
// Não testa comportamento; testa que o CÓDIGO respeita os portões únicos.
// Se alguém (eu ou o Virgílio) criar um caminho novo que escreve o estado à mão, o commit é barrado.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const linhas = html.split('\n');

// Nome da função que contém cada linha. Antes o guard adivinhava o portão por um trecho da própria
// linha ("o.idioma || cvLang") — bastava o portão crescer uma linha para o guard acusar o portão de
// violar a si mesmo. Agora ele pergunta em QUE função a linha está, que é o que a regra diz.
function funcaoDaLinha(i) {
  for (let j = i; j >= 0; j--) {
    // "async function nome(" também é assinatura — sem o (?:async\s+)? as funções assíncronas
    // eram invisíveis para o guard, e é justamente onde vivem as chamadas de rede.
    const m = linhas[j].match(/^(?:const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|\w+)\s*=>|(?:async\s+)?function\s+(\w+)\s*\()/);
    if (m) return m[1] || m[2];
    if (/^\}/.test(linhas[j]) && j < i) return '';            // saiu do corpo antes de achar a assinatura
  }
  return '';
}

let falhou = false;
function checar(nome, regexEscrita, ehPortao) {
  const viol = [];
  linhas.forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;      // comentário
    if (!regexEscrita.test(l)) return;                        // não é escrita desse estado
    if (ehPortao(l, funcaoDaLinha(i))) return;                // está DENTRO do portão — ok
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
  (l, fn) => fn === 'setCV');

console.log('\n=== GUARD: o status só muda pelo portão setStatus ===');
// escrita de status com literal (o perigoso — sumiço de card). Permitido: a definição de
// setStatus (que escreve status=novo, variável) e pontos legítimos marcados [status-ok]
// (migração one-shot, criação de card, revert). Todo o resto passa por setStatus.
checar('nenhuma escrita direta de status fora de setStatus (ou marcada [status-ok])',
  /\.status\s*=\s*['"]/,
  (l, fn) => /\[status-ok\]/.test(l) || fn === 'setStatus');

console.log('\n=== GUARD: o CV só é GERADO pelo portão montarPedidoCV ===');
// O portão setCV cobria a ESCRITA do CV, não a GERAÇÃO. Por essa fresta passaram quatro prompts
// diferentes para o mesmo documento — a extensão chegou a gerar com max_tokens 2000 e descrição
// cortada, produzindo um CV truncado (sem COMPETÊNCIAS) que foi para um recrutador de verdade.
// Um pedido de CV = um prompt. Único ponto permitido: a definição de montarPedidoCV.
checar('nenhuma chamada a ATS_SYSTEM fora de montarPedidoCV()',
  /ATS_SYSTEM\s*\(/,
  (l, fn) => fn === 'montarPedidoCV' || fn === 'ATS_SYSTEM');

console.log('\n=== GUARD: gerar um documento não é opinar sobre a vaga ===');
// analisarInline() fazia as duas coisas num pedido só: o mesmo prompt devolvia ---ANALISE---
// e ---CV---, e a metade "análise" era gravada em atsAnalise. Isso criava um SEGUNDO produtor
// de veredicto concorrendo com /api/analisar-vaga — nos estados de processo valia a opinião
// que veio de carona com o currículo, na Oportunidade valia a do Worker, e o card exibia as
// duas. Quem escreve a análise é analisarInline (via mvReanalisarCompat). O gerador de CV, não.
checar('gerarCVInline() não escreve atsAnalise',
  /\.atsAnalise\s*=(?!=)/,
  (l, fn) => fn !== 'gerarCVInline');

console.log('\n=== GUARD: a identidade de quem é aconselhado mora no Worker, não no cliente ===');
// A régua de vida (cargo-alvo, faixa salarial, o que ele aceita) é UMA. Ela viveu copiada em dois
// prompts do index.html — ATS_SYSTEM e mvCallSofia — e as cópias envelheceram: continuaram dizendo
// "busca C-Level/Diretor, fecha a partir de R$15k" depois que a S37 zerou cargo como objetivo e
// baixou o piso para R$8k. O resultado chegou ao usuário como dois veredictos sobre a mesma vaga.
// PERFIL_MARCOS + PROJETO_DE_VIDA vivem no senova-worker.js e só de lá saem.
// Não vale para MARKUP: os campos "Cargo-alvo" e "Pretensão salarial mínima" do Perfil são o
// usuário DIZENDO quem é — é para lá que a identidade deve migrar (passo 3), não de lá que ela
// deve sair. A régua proibida é a afirmada por nós dentro de um prompt, que é sempre prosa.
const REGUA_NO_PROMPT = [
  { nome: 'cargo-alvo como objetivo', re: /(busca|cargo-alvo|objetivo)[^\n]{0,60}(c-level|c‑level|cmo|cso|diretor)/i },
  { nome: 'faixa/piso salarial como régua', re: /(pretens[ãa]o|fecha a partir de|m[íi]nimo de sobreviv[êe]ncia|piso de dignidade)/i },
];
{
  const viol = [];
  linhas.forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;                 // comentário explicando a regra
    if (/<[a-z][a-z0-9]*[\s>\/]/i.test(l)) return;                       // markup: campo do Perfil, não prompt
    REGUA_NO_PROMPT.forEach(r => {
      if (r.re.test(l)) viol.push('    ' + (i + 1) + ': [' + r.nome + '] ' + t.slice(0, 90));
    });
  });
  if (viol.length) {
    falhou = true;
    console.log('  FAIL  nenhuma régua de identidade hardcoded no index.html');
    viol.forEach(v => console.log(v));
  } else {
    console.log('  PASS  nenhuma régua de identidade hardcoded no index.html');
  }
}

console.log('\n──────────────────────────────');
if (falhou) {
  console.log('✗ GUARD FALHOU — use o portão certo: montarPedidoCV(o) para PEDIR o CV, setCV(vaga,texto) para GRAVAR o CV, setStatus(vaga,novo,opts) para o status. Pontos legítimos fora do portão levam o marcador [status-ok] com o motivo.');
  process.exit(1);
}
console.log('✓ Invariantes de arquitetura respeitadas.');
process.exit(0);
