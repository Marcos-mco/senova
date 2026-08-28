// GUARD — onde se procura vaga tem UM dono, e ele é auditável (S53, 28/ago/2026).
//
// O buraco. Marcos desmarcou Espanha, Portugal, Alemanha e EUA no Perfil, e disse em voz
// alta: "Alemanha e Espanha não são mais focos presenciais". O app continuou varrendo os
// três. Medido no radar: de 46 vagas com local conhecido, 42 eram ES/DE — todas analisadas
// com IA, nota máxima 45 contra um corte de 46. Quarenta e duas análises pagas para produzir
// quarenta e dois descartes.
//
// A causa não era um `if` errado; eram SEIS verdades sobre "onde procurar", e a do Perfil era
// a única sem leitor. Os países do Perfil alimentam apenas o TEXTO da identidade do candidato
// (`montarIdentidadeCandidato`); quem decide a colheita é `CONFIG_PADRAO.locais`, reconciliado
// com um `ativo` guardado no KV.
//
// E esse `ativo` do KV era um FÓSSIL se passando por escolha. Nenhuma tela jamais gravou
// `locais`: o que gravava era um eco. `salvarPerfil` lia a config inteira, trocava a régua de
// nota e devolvia o objeto todo no POST — de modo que salvar o Perfil carimbava no KV um
// retrato congelado do CONFIG_PADRAO da versão do Worker daquele dia. Ele desmarcava numa
// tela e o app, na mesma função, regravava o contrário.
//
// Este teste não guarda quais frentes estão ligadas — isso é decisão dele e muda. Guarda que
// o mecanismo não volte a ter duas bocas: que o app não ecoe a config, que o Worker não aceite
// `locais` de quem não tem tela para editá-los, que a colheita não emudeça quando não sobra
// frente, e que a vaga registre de qual frente veio (sem isso, "desligar frente" é decisão
// sem número — foi exatamente o que faltou em 28/ago).
const path = require('path');
const fs = require('fs');
const { assert } = require('./_lib');
const raiz = path.join(__dirname, '..');
const worker = fs.readFileSync(path.join(raiz, 'senova-worker.js'), 'utf8');
const app = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const { t, fim } = assert();

console.log('=== o app não ecoa mais a configuração inteira de volta ===');
t('salvarPerfil manda SÓ a régua no POST da config',
  /body:JSON\.stringify\(\{score_minimo_por_regiao:smr\}\)/.test(app),
  'o app voltou a devolver o objeto inteiro — o retrato congelado renasce');
t('e não lê a config para reenviá-la',
  !/const config=await resConfig\.json\(\);/.test(app),
  'voltou o read-modify-write que carimbava o CONFIG_PADRAO antigo no KV');
t('a função órfã salvarConfigVarredura não existe mais',
  !app.includes('salvarConfigVarredura'),
  'nasceu de novo uma segunda função que grava a config inteira');

console.log('\n=== o Worker faz merge, e não guarda frente que ninguém pode editar ===');
const iPost = worker.indexOf("path === '/api/config-varredura' && request.method === 'POST'");
t('a rota POST existe', iPost > 0);
const post = worker.slice(iPost, iPost + 1600);
t('o POST descarta `locais` do pedido',
  /delete nova\.locais;/.test(post),
  'a config voltou a aceitar locais de quem não tem tela para editá-los');
t('e do que fica guardado',
  /delete merged\.locais;/.test(post),
  'o fóssil continuaria no KV para sempre');
t('é merge sobre o que já está lá, nunca substituição',
  /\{ \.\.\.atual, \.\.\.nova \}/.test(post),
  'voltou a substituição: um pedido parcial apagaria `ativa` e desligaria a varredura inteira');

console.log('\n=== o código é a autoridade sobre as frentes que ele mesmo define ===');
const iLE = worker.indexOf('function locaisEfetivos');
const le = worker.slice(iLE, iLE + 500);
t('locaisEfetivos não tira mais o `ativo` do KV',
  !/ativo:\s*s\.ativo/.test(le),
  'o `ativo` fóssil do KV voltou a mandar no que é varrido');
t('mas frente que só existe no KV (extras) continua valendo',
  /const extras = salvos\.filter/.test(le) && /\.\.\.base, \.\.\.extras/.test(le),
  'as frentes extras sumiram: o KV deixou de poder acrescentar praça nenhuma');

console.log('\n=== colheita sem frente nenhuma passa a dizer isso ===');
// Era `return` seco: a colheita parava e a tela seguia exibindo a última execução antiga
// como se estivesse tudo bem.
const iVar = worker.indexOf('const locaisAtivos = locaisEfetivos(config)');
const varredura = worker.slice(iVar, iVar + 700);
t('nenhuma frente ativa grava status antes de sair',
  /locaisAtivos\.length === 0\)\s*\{[\s\S]{0,400}?salvarStatus/.test(varredura),
  'a varredura voltou a parar em silêncio');

console.log('\n=== a vaga registra de qual FRENTE veio ===');
// `fonte: 'Adzuna'` era o rótulo de três frentes alemãs diferentes ao mesmo tempo (país
// inteiro, Rüthen/40km, Düsseldorf/60km). Sem separá-las, "quanto me custa esta frente"
// não tem resposta, e desligar uma vira aposta.
t('montarCard grava frenteId',
  /frenteId: local\.id \|\| ''/.test(worker),
  'a vaga voltou a nascer sem dizer de qual frente veio');

console.log('\n=== a frente de estar perto da filha não morre por inferência ===');
// Ele desligou "Alemanha" como mercado de trabalho. `ruthen` nunca foi mercado de trabalho:
// é a única frente sem piso salarial, de propósito, porque ali não se busca remuneração.
// Traduzir "Alemanha desmarcada" em "desligue as frentes alemãs" apagaria isso em silêncio.
const iRuthen = worker.indexOf("{ id:'ruthen'");
t('a frente ruthen existe', iRuthen > 0);
const ruthen = worker.slice(iRuthen, iRuthen + 200);
t('e continua sem piso salarial — o que a define',
  !/salarioMinAnual/.test(ruthen),
  'ruthen ganhou piso salarial: cortaria justamente o trabalho honesto que ele disse aceitar');

fim('onde_se_procura_vaga');
