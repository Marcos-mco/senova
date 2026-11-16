// Um aviso da página não é o cargo da vaga.
//
// POR QUE ISTO EXISTE (16/nov/2026). Marcos abriu um processo e, onde devia estar o cargo, leu
// "Use a IA para avaliar a adequação do seu perfil" — o aviso que a página da vaga mostra ao
// candidato. A extensão procurava o título logo acima de "Sobre a vaga", encontrava o aviso, e o
// app o aceitava como cargo. 16 processos ficaram assim, 14 deles já com CV enviado.
//
// Três coisas ficam travadas:
//   1. a pergunta "isto pode ser um cargo?" tem um ponto único (_cargoInaceitavel) — antes eram
//      duas listas escritas à mão, que já tinham divergido;
//   2. o conserto dos processos já gravados relê a página SÓ pelo título: não troca descrição,
//      não apaga nota, não muda coluna nem data, e não dispara análise (processo em andamento
//      não pode perder a nota nem custar IA por causa de um título);
//   3. a releitura não vira laço contra o portal: tem chave própria na lista de tentativas.

const fs = require('fs');
const path = require('path');
const { html, carregarApp, exec, assert } = require('./_lib');
const { t, fim } = assert();
const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');

let analises = 0;
const s = carregarApp(
  ['function _cargoInaceitavel(', 'window.__senovaAtualizarDesc=function(', 'window.__senovaPendentesCargo=function(', 'window.__senovaPendentesDesc=function('],
  { editingVagaId: null, analisarLoteBackground: () => { analises++; }, setTimeout: f => { try { f(); } catch {} return 0; } }
);
const roda = expr => exec(s, expr);

console.log('=== o que não é cargo ===');
for (const aviso of ['Use a IA para avaliar a adequação do seu perfil', 'Use AI to assess how your profile fits',
  'Veja como seu perfil se compara', 'Gerente e vagas semelhantes', 'Diretor e mais outras', '12 novas vagas para você',
  'Jobs you may be interested in', '', 'ab']) {
  t(`"${aviso}" não é aceito como cargo`, roda(`_cargoInaceitavel(${JSON.stringify(aviso)})`) === true);
}
for (const cargo of ['Gerente Comercial', 'Head of Sales', 'Diretor de Operações — LATAM', 'Analista de Perfil de Crédito', 'Profile Manager', 'Vertriebsleiter (m/w/d)']) {
  t(`"${cargo}" continua sendo cargo`, roda(`_cargoInaceitavel(${JSON.stringify(cargo)})`) === false);
}

console.log('\n=== um ponto único, não duas listas ===');
t('quem recebe o título da página pergunta ao ponto único', /if\(!_cargoInaceitavel\(_ct\)\) vagas\[idx\]\.cargo=_ct;/.test(html));
t('quem decide o que buscar de novo pergunta ao ponto único', /_ehDigestTitulo=t=>!!\(t\|\|''\)\.trim\(\)&&_cargoInaceitavel\(t\)/.test(html));
t('a lista de títulos de resumo existe uma vez só no app', (html.match(/vagas\?\\s\+\(semelhantes/g) || []).length === 1);

const AVISO = 'Use a IA para avaliar a adequação do seu perfil';
const DESC_ANTIGA = 'Descrição antiga do anúncio. '.repeat(10);
const DESC_NOVA = 'Texto completamente diferente vindo da página agora. '.repeat(20);
const novo = (extra = {}) => roda(`vagas=[Object.assign({id:1,status:'aplicado',cargo:${JSON.stringify(AVISO)},empresa:'Empresa X',
  origemUrl:'https://www.linkedin.com/jobs/view/4001/?trk=x',jobDescription:${JSON.stringify(DESC_ANTIGA)},
  atsScore:'81',atsCvScore:'77',atsAnalise:'analise',score:81,updatedAt:111}, ${JSON.stringify(extra)})]`);

console.log('\n=== a página não consegue mais gravar o aviso como cargo ===');
novo({ cargo: 'Gerente Comercial', status: 'lead' });
roda(`__senovaAtualizarDesc('https://www.linkedin.com/jobs/view/4001', ${JSON.stringify(DESC_NOVA)}, {cargo:${JSON.stringify(AVISO)}, empresa:'Empresa X'})`);
t('o cargo verdadeiro não é trocado pelo aviso', roda('vagas[0].cargo') === 'Gerente Comercial');

console.log('\n=== o conserto do título não toca em mais nada ===');
novo(); analises = 0;
t('o processo com aviso no cargo entra na lista de releitura', roda('__senovaPendentesCargo()').join() === 'https://www.linkedin.com/jobs/view/4001');
const r = roda(`__senovaAtualizarDesc('https://www.linkedin.com/jobs/view/4001', ${JSON.stringify(DESC_NOVA)}, {cargo:'Gerente de Contas', empresa:'Outra', local:'Lisboa', soCargo:true})`);
t('o conserto avisa que deu certo', r === true);
t('o cargo verdadeiro entra', roda('vagas[0].cargo') === 'Gerente de Contas');
t('a descrição que o processo tinha fica', roda('vagas[0].jobDescription') === DESC_ANTIGA);
t('a nota fica', roda('vagas[0].atsScore') === '81' && roda('vagas[0].atsCvScore') === '77' && roda('vagas[0].score') === 81 && roda('vagas[0].atsAnalise') === 'analise');
t('a coluna fica', roda('vagas[0].status') === 'aplicado');
t('a data de atividade fica', roda('vagas[0].updatedAt') === 111);
t('a empresa que já existia fica', roda('vagas[0].empresa') === 'Empresa X');
t('nenhuma análise é disparada', analises === 0);
t('depois de consertado, sai da lista de releitura', roda('__senovaPendentesCargo()').length === 0);

novo({ empresa: '—' });
roda(`__senovaAtualizarDesc('https://www.linkedin.com/jobs/view/4001', ${JSON.stringify(DESC_NOVA)}, {cargo:'Gerente de Contas', empresa:'Outra', soCargo:true})`);
t('empresa em branco é preenchida junto', roda('vagas[0].empresa') === 'Outra');

novo();
t('se a página também não traz cargo, nada muda e a tentativa falha',
  roda(`__senovaAtualizarDesc('https://www.linkedin.com/jobs/view/4001', ${JSON.stringify(DESC_NOVA)}, {cargo:${JSON.stringify(AVISO)}, soCargo:true})`) === false
  && roda('vagas[0].cargo') === AVISO);

novo({ cargo: 'Gerente Comercial' });
roda(`__senovaAtualizarDesc('https://www.linkedin.com/jobs/view/4001', ${JSON.stringify(DESC_NOVA)}, {cargo:'Outro Título', soCargo:true})`);
t('cargo que já estava certo não é trocado pela releitura', roda('vagas[0].cargo') === 'Gerente Comercial');

console.log('\n=== quem entra na lista de releitura ===');
novo({ status: 'arquivado' });
t('processo arquivado não é relido', roda('__senovaPendentesCargo()').length === 0);
novo({ status: 'lead' });
t('oportunidade ainda não aberta segue pela lista de descrição, não por esta', roda('__senovaPendentesCargo()').length === 0
  && roda('__senovaPendentesDesc()').length === 1);
novo({ origemUrl: 'https://exemplo.com/vaga/1' });
t('sem endereço de vaga relível, não entra', roda('__senovaPendentesCargo()').length === 0);

console.log('\n=== a extensão: releitura sem laço ===');
t('a extensão pede a lista de cargo ao app', /__senovaPendentesCargo/.test(bg));
t('a releitura tem chave própria nas tentativas', /_chaveTentativa = u => soCargo\.has\(u\) \? u \+ '\|cargo' : u/.test(bg));
t('o filtro de alvos consulta a chave própria', /!tentadas\.has\(_chaveTentativa\(u\)\)/.test(bg));
t('sucesso e desistência gravam a chave própria', (bg.match(/_tentadasAdd\(tentadas, _chaveTentativa\(url\)\)/g) || []).length === 2
  && /_falhaContar\(_chaveTentativa\(url\)\)/.test(bg));
t('nenhuma tentativa é gravada fora da chave', !/_tentadasAdd\(tentadas, url\)/.test(bg));
t('a releitura viaja marcada como "só o cargo"', /soCargo: !!soCargo/.test(bg));
t('quem lê a página aberta pula o aviso ao procurar o título', /const _SKIP = \/\([^\n]*avaliar\|seu perfil\|your profile/.test(ct));

fim('Aviso da página não é cargo');
