// O PAINEL NÃO AFIRMA UMA FASE QUE O CARD NÃO TEM.
//
// 07/ago/2026, Marcos: "o card não está mudando de fase, mesmo que a extensão detectou a
// candidatura". Causa: `_candidatado = true` era ligado ANTES de o app responder ("trava
// otimista") e, no mesmo tick, o observer chamava `_atualizarCorpo()` — o painel pintava
// "✓ Registrei como CV Enviado · O card avançou para CV Enviado no Senova". Se o app recusava
// (Senova fechado, vaga sem card, sem dados), `_candidatado` voltava a false e NINGUÉM
// repintava: numa página de "obrigado" não há mais mutação para desfazer a caixa verde.
// O copiloto afirmava um estado que o Senova nunca teve — e não dizia o que fazer.
//
// Invariantes provados aqui, exercitando as funções REAIS do content.js:
//   1. a afirmação vem da RESPOSTA do app, nunca da intenção de quem clicou/detectou;
//   2. recusa FALA — com o motivo e o caminho de volta, carimbada na página onde aconteceu;
//   3. a trava do repique é outra variável (o registro pode ser tentado de novo);
//   4. o que o app respondeu fica no diagnóstico (é o que me diz a causa sem pedir DevTools).
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
function extrai(a) {
  const i = src.indexOf(a);
  if (i < 0) throw new Error('nao achei no content.js: ' + a);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

const fontes = [
  extrai('const _MOTIVO_REG = ') + ';',
  extrai('function _desfechoRegistro('),
  extrai('async function _marcarCandidatei('),
  extrai('async function _autoMarcarCandidatura('),
].join('\n;\n');

// Monta o mundo mínimo que essas funções tocam. `resposta` é o que o app devolve — é a única
// coisa que pode autorizar o painel a dizer "registrei".
function mundo(resposta, opts = {}) {
  const sb = {
    console,
    _candidatado: false, _registrando: false, _regFalha: null, _ultimoRegistro: null,
    _envios: 0, _pinturas: 0, _candidatadoDuranteVoo: null, _removeuFormVisto: 0,
    _temRefVaga: () => true,
    _refVaga: () => ({ jobId: '4444879003', url: 'https://empresa.com/vaga/1' }),
    _chaveVaga: () => 'job:4444879003',
    _atualizarCorpo() { sb._pinturas++; },
    location: { href: opts.url || 'https://empresa.com/obrigado' },
    Date, setTimeout, clearTimeout, Promise,
    chrome: {
      runtime: {
        sendMessage: async () => {
          sb._envios++;
          // O instante do voo: o painel NÃO pode estar afirmando nada aqui.
          sb._candidatadoDuranteVoo = sb._candidatado;
          if (opts.lanca) throw new Error('sem receptor');
          return resposta;
        },
      },
      storage: { local: { remove: () => { sb._removeuFormVisto++; } } },
    },
  };
  vm.createContext(sb);
  vm.runInContext(fontes, sb);
  return sb;
}
// Roda no sandbox e espera de verdade (as funções são async; nada de sleep nem de relógio).
const rodar = (sb, expr) => vm.runInContext(expr, sb);

(async () => {

console.log('=== o app ACEITA: aí sim o painel afirma ===');
{
  const sb = mundo({ ok: true });
  await rodar(sb, '_marcarCandidatei()');
  t('durante o voo o painel ainda NÃO afirmava', sb._candidatadoDuranteVoo === false, 'estava ' + sb._candidatadoDuranteVoo);
  t('depois do ok, afirma', sb._candidatado === true);
  t('nenhuma falha pendurada', sb._regFalha === null);
  t('o diagnóstico registra o ok', /^ok/.test(sb._ultimoRegistro.resposta), sb._ultimoRegistro.resposta);
  t('o painel foi repintado', sb._pinturas >= 1);
  t('o marcador "vi o formulário" é limpo', sb._removeuFormVisto === 1);
}

console.log('\n=== o app RECUSA (Senova fechado): não afirma, e diz o que fazer ===');
{
  const sb = mundo({ erro: 'app_fechado' });
  await rodar(sb, '_autoMarcarCandidatura()');
  // O defeito de 07/ago mora AQUI: entre o disparo e a resposta, o observer repinta o painel no
  // mesmo tick. Se `_candidatado` já estivesse ligado, a caixa verde ("o card avançou para CV
  // Enviado") apareceria antes de existir resposta — e ficaria, porque a página de "obrigado"
  // não gera mais mutação nenhuma para desfazê-la.
  t('durante o voo da DETECÇÃO AUTOMÁTICA o painel não afirmava', sb._candidatadoDuranteVoo === false, 'estava ' + sb._candidatadoDuranteVoo);
  t('NÃO afirma que registrou', sb._candidatado === false);
  t('a falha existe e fala', !!sb._regFalha && sb._regFalha.texto.length > 20);
  t('o texto diz o caminho de volta (abrir o Senova)', /abra o senova/i.test(sb._regFalha.texto), sb._regFalha.texto);
  t('a falha é carimbada com a página onde aconteceu', sb._regFalha.url === 'https://empresa.com/obrigado');
  t('o painel foi repintado para dizer isso', sb._pinturas >= 1);
  t('o diagnóstico guarda a recusa e o motivo', /recusado: app_fechado/.test(sb._ultimoRegistro.resposta), sb._ultimoRegistro.resposta);
  t('o diagnóstico guarda QUEM tentou', sb._ultimoRegistro.via === 'automático', sb._ultimoRegistro.via);
  t('o diagnóstico guarda QUAL vaga', sb._ultimoRegistro.chave === 'job:4444879003');
  t('não limpou o "vi o formulário" (a candidatura não foi registrada)', sb._removeuFormVisto === 0);
}

console.log('\n=== cada motivo tem seu caminho de volta, nenhum é beco sem saída ===');
for (const [erro, re] of [
  ['sem_funcao', /recarregue o senova/i],
  ['sem_dados', /não reconheci qual vaga/i],
  ['sem_referencia', /não reconheci qual vaga/i],
  ['nao_registrou', /não encontrou o processo/i],
]) {
  const sb = mundo({ erro });
  await rodar(sb, '_marcarCandidatei()');
  t(`${erro} → mensagem própria`, !!sb._regFalha && re.test(sb._regFalha.texto), sb._regFalha && sb._regFalha.texto);
  t(`${erro} → não afirma`, sb._candidatado === false);
}

console.log('\n=== a extensão nem alcança o app (sem resposta): silêncio nunca ===');
{
  const sb = mundo(null, { lanca: true });
  await rodar(sb, '_autoMarcarCandidatura()');
  t('NÃO afirma', sb._candidatado === false);
  t('mesmo assim fala', !!sb._regFalha && sb._regFalha.texto.length > 10, sb._regFalha && sb._regFalha.texto);
  t('o diagnóstico diz que o app não respondeu', /sem resposta do app/.test(sb._ultimoRegistro.resposta), sb._ultimoRegistro.resposta);
}

console.log('\n=== a trava do repique é OUTRA variável — e o registro pode ser tentado de novo ===');
{
  const sb = mundo({ erro: 'app_fechado' });
  await rodar(sb, '_autoMarcarCandidatura()');
  t('1ª tentativa foi enviada', sb._envios === 1);
  t('`_registrando` foi solto no fim do voo', sb._registrando === false);
  // O observer chama isto a cada mutação: sem carência, seria um laço contra o app fechado.
  await rodar(sb, '_autoMarcarCandidatura()');
  t('não repica em laço logo depois da recusa', sb._envios === 1, 'enviou ' + sb._envios);
  // Passados 60s (você abriu o Senova nesse meio-tempo), tenta sozinho de novo.
  rodar(sb, '_regFalha.ts -= 61000');
  await rodar(sb, '_autoMarcarCandidatura()');
  t('passada a carência, tenta de novo', sb._envios === 2, 'enviou ' + sb._envios);
}

console.log('\n=== dois disparos ao mesmo tempo (observer + clique) = um só registro ===');
{
  const sb = mundo({ ok: true });
  await rodar(sb, 'Promise.all([_autoMarcarCandidatura(), _marcarCandidatei()])');
  t('a trava de voo impede o segundo envio', sb._envios === 1, 'enviou ' + sb._envios);
  t('e o desfecho do único envio vale', sb._candidatado === true);
}

console.log('\n=== o diagnóstico nomeia a vaga do PEDIDO, não a que estiver na tela na volta ===');
{
  // SPA troca a vaga da tela entre o pedido e a resposta. Um diagnóstico que nomeia a vaga errada
  // é pior que nenhum: foi adivinhando por nome trocado que a S41 se perdeu.
  const sb = mundo({ erro: 'app_fechado' });
  vm.runInContext('_chaveVaga = () => "job:4444879003"', sb);
  const orig = sb.chrome.runtime.sendMessage;
  sb.chrome.runtime.sendMessage = async (...a) => { vm.runInContext('_chaveVaga = () => "job:9999999999"', sb); return orig(...a); };
  await rodar(sb, '_autoMarcarCandidatura()');
  t('guarda a vaga de quando pediu', sb._ultimoRegistro.chave === 'job:4444879003', sb._ultimoRegistro.chave);
}

console.log('\n=== um ok posterior apaga a falha anterior ===');
{
  const sb = mundo({ ok: true, criou: true });
  rodar(sb, '_regFalha = { texto: "falha velha", url: location.href, ts: Date.now() }');
  await rodar(sb, '_marcarCandidatei()');
  t('a falha velha some quando o registro passa', sb._regFalha === null);
  t('o diagnóstico diz que o card foi criado', /card criado/.test(sb._ultimoRegistro.resposta), sb._ultimoRegistro.resposta);
}

console.log('\n=== o código não pode voltar a afirmar por conta própria ===');
{
  // A regressão de 07/ago nasce de uma linha só: ligar `_candidatado` fora do desfecho. Esta é a
  // fronteira — não é gosto de estilo, é a diferença entre o painel relatar e o painel adivinhar.
  const atribuicoes = (src.match(/_candidatado\s*=\s*true/g) || []).length;
  const dentroDoDesfecho = (extrai('function _desfechoRegistro(').match(/_candidatado\s*=\s*true/g) || []).length;
  t('só o desfecho do app liga o "registrei"', atribuicoes === 1 && dentroDoDesfecho === 1,
    atribuicoes + ' atribuições no arquivo, ' + dentroDoDesfecho + ' dentro do desfecho');
  // A ordem do painel: em voo e falha vêm ANTES do verde, senão o verde ganha o if e volta a mentir.
  const i0 = src.indexOf('const btnCandHTML = _registrando');
  const iFalha = src.indexOf('_falhaAtiva', i0);
  const iVerde = src.indexOf('_candidatado', i0);
  t('no painel, "em voo" e "falhou" vêm antes de "registrei"', i0 > 0 && iFalha > 0 && iFalha < iVerde);
  t('a falha vale só na página onde aconteceu', /_regFalha && _regFalha\.url === location\.href/.test(src));
  t('o diagnóstico leva a linha do registro', /'registro da candidatura: ' \+ d\.registro/.test(src));
  t('a recusa abre o diagnóstico (é o caso que preciso ver)', /const _abrirDiag = _leuNada \|\| !!_falhaAtiva/.test(src));
}

console.log('\n──────────────────────────────');
console.log(`O PAINEL SÓ AFIRMA O QUE O APP CONFIRMOU: ${ok}/${ok + fail} ✓`);
if (fail) process.exit(1);

})().catch(e => { console.error(e); process.exit(1); });
