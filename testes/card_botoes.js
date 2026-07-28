// CADA BOTÃO DENTRO DO BLOCO QUE ELE PRODUZ (S38).
//
// O card abria com uma barra fixa de ações — "Analisar" e "Gerar CV" — logo abaixo do
// cabeçalho, no lugar de maior peso da tela. Ela oferecia AGIR antes de a pessoa ter
// ENTENDIDO e JULGADO (skill_arquitetura_cognitiva §2), e prometia coisas que nasciam em
// blocos distantes dali: o veredicto ficava adiante, os documentos lá embaixo.
//
// E havia dois caminhos para o mesmo ato: o link "Ver vaga" do cabeçalho, que abria SEM
// salvar, e um botão no rodapé, que salvava antes. Quem usasse o de cima perdia o que
// tinha acabado de escrever no card.
//
// Este teste guarda o arranjo, não a estética: onde cada verbo mora, e que só existe um
// caminho para o anúncio. É estrutura de HTML — por isso se mede no fonte, não no browser.
const { html, assert } = require('./_lib');
const { t, fim } = assert();

const entre = (alvo, de, ate) => {
  const i = html.indexOf(de), f = html.indexOf(ate), a = html.indexOf(alvo);
  return i >= 0 && f > i && a > i && a < f;
};

console.log('=== a barra de ações fixa não existe mais ===');
t('sem o elemento mv-action-bar', !/id="mv-action-bar"/.test(html));
t('sem a classe .mv-action-bar no CSS (não fica regra órfã)', !/\.mv-action-bar\s*\{/.test(html));
t('sem leitura de mv-action-bar no JS', !/getElementById\('mv-action-bar'\)/.test(html));

console.log('\n=== "Analisar" mora no veredicto — é o bloco que ele produz ===');
t('o botão está dentro da caixa do veredicto', entre('id="mv-analyze-btn"', 'id="mv-verdicto"', 'id="mv-verd-fold-btn"'));
t('e acima da dobra (a conclusão e sua ação ficam à vista)', html.indexOf('id="mv-analyze-btn"') < html.indexOf('id="mv-verd-fold"'));
t('continua chamando analisarInline', /id="mv-analyze-btn"[\s\S]{0,200}analisarInline\(\)/.test(html));

console.log('\n=== "Gerar CV" mora em Documentos — junto dos arquivos que ele produz ===');
t('o botão está dentro da seção Documentos', entre('id="mv-gerar-cv-btn"', 'id="mv-docs-section"', 'id="mv-ats-cv-txt"'));
t('e vem acima dos formatos (primeiro se gera, depois se baixa)', html.indexOf('id="mv-gerar-cv-btn"') < html.indexOf('id="mv-cvbtn-exec"'));
t('o card diz se existe CV para ESTA vaga', /id="mv-cv-estado"/.test(html) && /Ainda sem CV para esta vaga/.test(html));

console.log('\n=== Documentos não se esconde de quem ainda não tem CV ===');
// Era o efeito colateral de mudar o botão de lugar: a seção só aparecia quando JÁ existia
// um CV — quem não tivesse ficaria sem o botão que o cria (e sem carta e sem resposta).
t('mvAjustarSecoesStatus exibe a seção em todos os estágios', /_docsSec\.style\.display='';/.test(html));
t('não há mais um "esconde Documentos" quando falta CV', !/docsSec\.style\.display='none';/.test(html));

console.log('\n=== UM só caminho para o anúncio, e ele salva antes de abrir ===');
t('o link do cabeçalho chama irParaVaga', /id="mv-link-vaga"[\s\S]{0,400}irParaVaga\(\)/.test(html));
t('não abre mais direto por window.open sem salvar', !/id="mv-link-vaga"[\s\S]{0,400}dataset\.url;if\(u\)window\.open/.test(html));
t('o botão duplicado do rodapé saiu', !/id="mv-btn-ir-vaga"/.test(html));
t('irParaVaga salva ANTES de abrir', /function irParaVaga\(\)\{[\s\S]{0,400}saveVagaSilent\(\);[\s\S]{0,80}window\.open/.test(html));
t('sem link salvo, avisa em vez de não fazer nada', /function irParaVaga\(\)\{[\s\S]{0,300}showToast\(/.test(html));

console.log('\n=== a régua da descrição é uma só ===');
t('_mvReanaliseAplica usa CV_DESC_MINIMA, não um 400 solto', /_mvReanaliseAplica\(\)\{[\s\S]{0,400}desc\.length>=CV_DESC_MINIMA/.test(html));

fim('BOTÕES NO LUGAR CERTO');
