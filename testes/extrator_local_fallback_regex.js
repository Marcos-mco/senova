// GUARD — extractLinkedIn (content.js): salario/modalidade/jornada já tinham fallback por regex
// no bodyText quando os seletores DOM e o JSON-LD falhavam; "local" não tinha nenhum — se o
// LinkedIn não expunha JSON-LD e as classes CSS mudavam (o que já aconteceu antes, motivo dos
// vários seletores em cascata), local ficava '' mesmo com a cidade escrita na tela. Achado pelo
// senova-auditor (backlog P3, S47) e confirmado direto no código: só local ficou de fora do bloco
// "Fallback: scan do bodyText para campos ainda ausentes".
//
// A correção usa vocabulário FECHADO (as 27 siglas de UF), igual ao que já dá segurança ao
// fallback de modalidade/jornada (presencial/remoto/híbrido, tempo integral/parcial) — não um
// regex solto que casaria qualquer "Palavra, Outra" como se fosse localização.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei no content.js: ' + a); const ab = src.indexOf('{', i); let d = 0, j = ab; for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); }
let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

const corpoLinkedIn = extrai('function extractLinkedIn(');

console.log('=== estático: local entra no mesmo bloco de fallback, com vocabulário fechado de UF ===');
t('a condição do bloco de fallback agora inclui !local', /if \(!salario \|\| !modalidade \|\| !jornada \|\| !local\)/.test(corpoLinkedIn));
t('o fallback de local usa a lista fechada de 27 UF (não regex solto)', /\(AC\|AL\|AP\|AM\|BA\|CE\|DF\|ES\|GO\|MA\|MT\|MS\|MG\|PA\|PB\|PR\|PE\|PI\|RJ\|RN\|RS\|RO\|RR\|SC\|SP\|SE\|TO\)/.test(corpoLinkedIn));
t('local usa let (precisa ser reatribuído dentro do fallback)', /let local = _jl\.local \|\|/.test(corpoLinkedIn));

console.log('\n=== comportamental: o próprio trecho "if (!local) {...}" extraído do arquivo real ===');
{
  // Extrai só o bloco if(!local){...} de dentro do corpo real de extractLinkedIn — não recria a
  // lógica à mão, roda exatamente o texto que está no arquivo.
  const ancora = 'if (!local) {';
  const i = corpoLinkedIn.indexOf(ancora);
  if (i < 0) throw new Error('bloco "if (!local)" não encontrado em extractLinkedIn');
  let d = 0, j = i + ancora.length - 1;
  for (; j < corpoLinkedIn.length; j++) { const c = corpoLinkedIn[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  const blocoLocal = corpoLinkedIn.slice(i, j + 1);

  function roda(bTxt) {
    const sb = { bTxt, local: '' };
    vm.createContext(sb);
    vm.runInContext(blocoLocal, sb);
    return sb.local;
  }

  t('reconhece "Cidade, UF" composta (2 palavras) solta no texto', roda('Analista de Operações — São Paulo, SP · Presencial · Tempo integral') === 'São Paulo, SP',
    JSON.stringify(roda('Analista de Operações — São Paulo, SP · Presencial · Tempo integral')));
  t('reconhece cidade composta sem capturar a palavra minúscula anterior ("em")', roda('Vaga em Belo Horizonte, MG para atuação híbrida') === 'Belo Horizonte, MG',
    JSON.stringify(roda('Vaga em Belo Horizonte, MG para atuação híbrida')));
  t('reconhece cidade com conector minúsculo "de" (Rio de Janeiro)', roda('Escritório em Rio de Janeiro, RJ, com vista para a baía') === 'Rio de Janeiro, RJ',
    JSON.stringify(roda('Escritório em Rio de Janeiro, RJ, com vista para a baía')));
  t('sem "Cidade, UF" reconhecível, local continua vazio (não inventa)', roda('Vaga totalmente remota, sem cidade nenhuma mencionada aqui.') === '');
  t('sigla que não é UF válida não casa (ex.: "Time, ID" de time de futebol/produto)', roda('Faz parte do Time, ID de produto novo') === '');
}

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `LOCAL · FALLBACK REGEX (P3): ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
if (fail) process.exit(1);
