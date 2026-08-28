// GUARD — o perfil complementar viaja no cache, e o CONTEÚDO não muda por isso (S53, 28/ago).
//
// O buraco. O perfil complementar é o candidato, não a vaga: é o mesmo texto em todas as
// vagas da mesma esteira. Mesmo assim ia na mensagem do usuário, que muda a cada vaga e por
// isso nunca cacheia — cada análise pagava preço cheio por um texto idêntico ao da análise
// anterior. Como bloco de sistema ele é escrito uma vez por janela e relido a 10% do preço.
//
// O risco que este teste existe para vigiar não é o de perder a economia: é o de a economia
// mexer na NOTA. Se o texto ou a marcação mudarem na mudança de lugar, o modelo passa a ler
// outra coisa, e a pontuação muda por causa de uma otimização de custo. Economia que altera
// a nota não é economia — é outro produto, e ninguém aprovou outro produto.
//
// Também guarda a ORDEM. O cache é por prefixo: do mais estável para o menos. Rubrica (nunca
// muda) → candidato (muda ao editar o Perfil) → complementar (muda ao ligar/desligar um
// complemento, o mais frequente dos três). Emendar o complementar no bloco do candidato faria
// ligar um complemento reescrever o perfil inteiro junto.
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const raiz = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(raiz, 'senova-worker.js'), 'utf8');
const { t, fim } = assert();

const iFn = worker.indexOf('async function analisarVaga(');
const iFim = worker.indexOf('messages:[{ role:', iFn) + 400;
const fn = worker.slice(iFn, iFim);

console.log('=== o complementar saiu da mensagem que muda a cada vaga ===');
const iMsg = worker.indexOf("messages:[{ role:'user'", iFn);
const msg = worker.slice(iMsg, iMsg + 500);
t('a mensagem do usuário não carrega mais o perfil complementar',
  !/PERFIL COMPLEMENTAR/.test(msg),
  'o complementar voltou para a mensagem — volta a pagar preço cheio em toda vaga');
t('e não itera o contexto ali dentro',
  !/contexto\.map/.test(msg),
  'a lista de complementos voltou a ser montada dentro da mensagem');

console.log('\n=== e entrou como bloco de sistema cacheado ===');
t('existe o bloco _blocoContexto', /const _blocoContexto = _ctx\.length/.test(fn),
  'o bloco sumiu');
t('ele entra no system com cache_control',
  /_blocoContexto \? \[\{ type:'text', text:_blocoContexto, cache_control:\{ type:'ephemeral' \} \}\]/.test(fn),
  'o bloco entrou sem cache_control — seria mover o texto sem economizar nada');
t('e some quando não há complemento nenhum',
  /\.\.\.\(_blocoContexto \? \[/.test(fn),
  'bloco vazio passou a ser enviado: prefixo diferente para quem não tem complemento');

console.log('\n=== o CONTEÚDO é o mesmo que ia na mensagem ===');
// A redação vale como contrato: era isto que o modelo lia quando as notas de hoje foram dadas.
t('o rótulo é idêntico ao antigo',
  fn.includes('PERFIL COMPLEMENTAR DO CANDIDATO (considere na avaliação de fit e score):'),
  'o rótulo mudou — o modelo passa a ler outra coisa e a nota se mexe sem ninguém decidir');
t('os itens continuam marcados com o mesmo bullet',
  /_ctx\.map\(t => '• ' \+ t\)/.test(fn),
  'a marcação dos itens mudou');
t('e continuam separados por quebra de linha',
  fn.includes(".join('\\n')"),
  'o separador dos itens mudou');

console.log('\n=== a ordem dos blocos vai do mais estável para o menos ===');
const iSys = worker.indexOf('system:[', iFn);
const sys = worker.slice(iSys, worker.indexOf('],', iSys));
const posRubrica = sys.indexOf('text:systemPrompt');
const posCand = sys.indexOf('CANDIDATO (perfil e projeto de vida');
const posCtx = sys.indexOf('_blocoContexto');
t('rubrica antes do candidato', posRubrica >= 0 && posCand > posRubrica,
  'a rubrica deixou de ser o prefixo — editar o Perfil volta a invalidar o cache inteiro');
t('candidato antes do complementar', posCtx > posCand,
  'o complementar subiu: ligar um complemento passa a derrubar o perfil junto');

console.log('\n=== o teto de 4 pontos de cache da API não foi estourado ===');
const breakpoints = (sys.match(/cache_control/g) || []).length;
t('no máximo 4 cache_control no system (' + breakpoints + ')', breakpoints <= 4,
  'a API recusa mais de 4 pontos de cache — a análise inteira passaria a dar 400');

fim('contexto_no_cache');
