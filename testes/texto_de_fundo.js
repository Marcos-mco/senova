// GUARD — texto de fundo não pode parecer dado guardado (S54, 29/ago/2026).
//
// O caso que deu origem a este arquivo: o campo novo dos alertas de vaga nasceu com dois
// endereços plausíveis de placeholder, em cinza-claro. Marcos abriu a tela, colou o endereço
// que eu pedi, e escreveu: "apagou os que estavam". Não tinha apagado nada — o campo sempre
// esteve vazio. Mas ele não tinha como saber, e passou a duvidar do que o app guardava. Um
// minuto depois: "talvez fossem exemplos de preenchimento. Não posso dizer."
//
// Esse é o dano de verdade. Não é estética: é uma pessoa desempregada deixando de confiar que
// o app preserva o que ela escreveu. O `skill_ux_writing.md` já mandava o certo desde sempre
// ("Instrução ou exemplo: 'Ex: ...'") — o que faltava era alguém medindo.
//
// A regra, mecânica: a PRIMEIRA linha do texto de fundo tem de se anunciar como instrução ou
// como exemplo. Quem abre com um valor pronto — um endereço, um nome de empresa — está
// imitando conteúdo salvo.
const fs = require('fs');
const path = require('path');
const { assert } = require('./_lib');
const { t, fim } = assert();

const app = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function placeholders(html) {
  const re = /placeholder="([^"]*)"/g;
  const achados = [];
  let m;
  while ((m = re.exec(html))) achados.push(m[1]);
  return achados;
}

// Anuncia-se como instrução ou exemplo? Basta a primeira linha trazer um dos três sinais:
// começar com "Ex", terminar a frase com "..." (reticências de "continua"), ou ter dois-pontos
// introduzindo o que vem depois. O "://" de um endereço não conta como dois-pontos.
function seAnuncia(p) {
  const primeira = p.split('&#10;')[0].replace(/[a-z]+:\/\//gi, '');
  return /^\s*Ex[:.\s]/i.test(p) || primeira.includes('...') || primeira.includes(':');
}
// Só é candidato a se passar por dado o texto de fundo que TEM cara de valor: várias linhas
// (uma lista pronta) ou um endereço. Uma frase única e curta ninguém confunde com conteúdo.
function pareceValor(p) {
  return p.includes('&#10;') || /[a-z]+:\/\//i.test(p);
}

console.log('=== nenhum texto de fundo se passa por dado guardado ===');
const suspeitos = placeholders(app).filter(p => pareceValor(p) && !seAnuncia(p));
t('todo texto de fundo com cara de valor se anuncia como instrução ou exemplo',
  suspeitos.length === 0,
  'texto de fundo imitando conteúdo salvo: ' + JSON.stringify(suspeitos.slice(0, 3)));

console.log('\n=== a trava morde (senão é enfeite) ===');
t('uma lista de nomes crua seria pega',
  placeholders('<textarea placeholder="Amazon&#10;Uber&#10;Nubank"></textarea>')
    .filter(p => pareceValor(p) && !seAnuncia(p)).length === 1);
t('um endereço cru seria pego',
  placeholders('<input placeholder="https://portal.com/vagas/feed.xml">')
    .filter(p => pareceValor(p) && !seAnuncia(p)).length === 1);
t('o mesmo endereço anunciado como exemplo passa',
  placeholders('<input placeholder="Ex: https://portal.com/vagas/feed.xml">')
    .filter(p => pareceValor(p) && !seAnuncia(p)).length === 0);
t('e uma instrução de uma linha só nunca é acusada',
  placeholders('<input placeholder="Cole aqui um endereço por linha">')
    .filter(p => pareceValor(p) && !seAnuncia(p)).length === 0,
  'a trava virou ruído: acusa instrução legítima e ensina a ignorá-la');

fim('texto_de_fundo');
