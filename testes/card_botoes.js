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
// Aninhamento de verdade: ordem no fonte não prova que um elemento está DENTRO de outro. Esta
// varre as tags <div>/</div> a partir da abertura do container e responde se o alvo aparece
// antes de ele fechar.
const dentroDe = (idContainer, alvo) => {
  const ini = html.indexOf('<div id="' + idContainer + '"');
  const iAlvo = html.indexOf(alvo);
  if (ini < 0 || iAlvo < ini) return false;
  const re = /<div\b|<\/div>/g; re.lastIndex = ini;
  let d = 0, m;
  while ((m = re.exec(html))) {
    d += m[0] === '</div>' ? -1 : 1;
    if (d === 0) return re.lastIndex > iAlvo;   // aqui o container fechou
  }
  return false;
};

console.log('=== a barra de ações fixa não existe mais ===');
t('sem o elemento mv-action-bar', !/id="mv-action-bar"/.test(html));
t('sem a classe .mv-action-bar no CSS (não fica regra órfã)', !/\.mv-action-bar\s*\{/.test(html));
t('sem leitura de mv-action-bar no JS', !/getElementById\('mv-action-bar'\)/.test(html));

console.log('\n=== "Analisar" mora depois do que lhe dá motivo (28/jul) ===');
// Dentro da moldura do veredicto ele era o maior e mais escuro elemento do card, logo abaixo de
// uma conclusão já dada: o ponto de maior peso da tela oferecendo REFAZER o que acabou de ser
// feito. Marcos: "deveria estar depois da '＋ Acrescentar algo sobre mim'" — que é justamente o
// que muda a resposta. O botão fica junto do que muda, não do que já foi respondido.
t('o botão NÃO está mais dentro da caixa do veredicto', !entre('id="mv-analyze-btn"', 'id="mv-verdicto"', 'id="mv-score-signals"'));
t('está depois do "Acrescentar algo sobre mim"', html.indexOf('id="mv-analyze-btn"') > html.indexOf('id="mv-enriquecer-toggle"'));
t('e antes da Descrição da vaga (não desceu para o fim do card)', html.indexOf('id="mv-analyze-btn"') < html.indexOf('id="mv-desc-section"'));
t('fica FORA do #mv-enriquecer-wrap — que só existe em card salvo, e no card novo a 1ª análise é o ato principal',
  !entre('id="mv-analyze-btn"', 'id="mv-enriquecer-wrap"', 'id="mv-enriquecer-status"'));
t('continua chamando analisarInline', /id="mv-analyze-btn"[\s\S]{0,200}analisarInline\(\)/.test(html));
t('e continua trocando o rótulo para "Analisar de novo" quando já há análise', /_jaAnalisou\?'Analisar de novo':'Analisar'/.test(html));

console.log('\n=== e as duas ações moram DENTRO da dobra ("ver o porquê e as evidências") ===');
// Marcos: "isto tem que estar dentro de 'ver evidências'". Do lado de fora, "Acrescentar algo
// sobre mim" e "Analisar de novo" ficavam abertos ao lado de um veredicto que já respondeu —
// dois convites a MEXER competindo com a conclusão. Dentro, quem foi rever o raciocínio encontra
// no mesmo lugar o que fazer com ele.
t('"Analisar" está dentro de #mv-verd-fold', dentroDe('mv-verd-fold', 'id="mv-analyze-btn"'));
t('"Acrescentar algo sobre mim" também', dentroDe('mv-verd-fold', 'id="mv-enriquecer-toggle"'));
t('as duas dividem um bloco só, depois das evidências',
  html.indexOf('id="mv-score-signals"') < html.indexOf('id="mv-verd-acoes"')
  && dentroDe('mv-verd-acoes', 'id="mv-analyze-btn"') && dentroDe('mv-verd-acoes', 'id="mv-enriquecer-wrap"'));
t('sem análise não há raciocínio a esconder: a dobra fica aberta e sem botão de abrir — senão a PRIMEIRA análise ficaria atrás de um controle invisível',
  /fold\.style\.display=\(!tem\|\|_mvVerdAberto\)\?'':'none';/.test(html));

console.log('\n=== "Adicionar ao perfil" diz que o CV vai ser refeito — e refaz ===');
// O rótulo escondia metade do efeito: o texto acrescentado derrubava o CV já gerado desta vaga, e
// a tela devolvia a tarefa à pessoa ("clique num formato para gerar o CV atualizado").
t('o rótulo muda quando há CV para refazer', /_mvEnriquecerRefazCV\(\)\?'Adicionar ao perfil e gerar novo CV':'Adicionar ao perfil'/.test(html));
t('e só promete isso quando há CV nesta vaga', /function _mvEnriquecerRefazCV\(\)\{[\s\S]{0,300}return !!\(v&&v\.atsCV\)/.test(html));
t('o CV é REFEITO ali mesmo, não deixado para um clique futuro', /if\(_tinhaCV\)\{\s*\n?\s*await gerarCVInline\(\)/.test(html));
t('e o estado final diz o que aconteceu com o CV', /CV refeito com o que você acrescentou/.test(html));
t('falha na geração é dita, não escondida', /O CV não pôde ser refeito agora/.test(html));

console.log('\n=== não se pede o mesmo ato duas vezes: "Gerar CV" some ===');
// Os botões de formato JÁ geram o CV sob demanda quando não há nenhum (_mvGarantirCV). Um
// botão "Gerar CV" ao lado deles era o mesmo ato oferecido duas vezes, e a linha de estado
// logo acima ("Ainda sem CV…") repetia pela terceira vez o que o botão já dizia.
t('não existe mais um botão "Gerar CV" à parte', !/id="mv-gerar-cv-btn"/.test(html));
t('e ninguém no JS ainda procura por ele', !/getElementById\('mv-gerar-cv-btn'\)/.test(html));
t('os formatos continuam gerando sob demanda', /async function _mvGarantirCV[\s\S]{0,500}await gerarCVInline\(\)/.test(html));

console.log('\n=== o estado do CV é dito em palavras, com a data ===');
t('o card diz se existe CV para ESTA vaga', /id="mv-cv-estado"/.test(html));
t('vazio, diz o que o primeiro clique vai fazer', /Ainda sem CV para esta vaga — o primeiro download gera/.test(html));
t('cheio, diz de quando é', /CV adaptado a esta vaga'\+\(v\.atsCVEm\?' em '\+_dataCurta\(v\.atsCVEm\)/.test(html));
t('o carimbo da data mora no portão único de escrita do CV', /function setCV\(vaga,texto\)\{[\s\S]{0,600}vaga\.atsCVEm=Date\.now\(\)/.test(html));
t('CV sem carimbo (card antigo) não inventa data', /\(v\.atsCVEm\?' em '\+_dataCurta\(v\.atsCVEm\):''\)/.test(html));

console.log('\n=== refazer o CV não apaga o anterior sem perguntar ===');
t('"Refazer CV" está dentro da seção Documentos', entre('id="mv-refazer-cv-btn"', 'id="mv-docs-section"', 'id="mv-ats-cv-txt"'));
t('e só aparece quando há CV para refazer', /btnCV\.style\.display=\(_v&&_v\.atsCV\)\?'':'none';/.test(html));
t('gerarCVInline confirma ANTES de substituir um CV existente', /async function gerarCVInline\(\)\{[\s\S]{0,900}_cvAtual&&!confirm\(/.test(html));
t('e a pergunta avisa que ajustes à mão se perdem', /esses ajustes se perdem/.test(html));

console.log('\n=== o idioma se afirma, não se pergunta ===');
t('a frase diz o idioma que vai sair', /id="mv-idioma-frase"/.test(html) && /Documentos em '\+\(\(IDIOMAS\[d\.lang\]/.test(html));
t('e diz em nome de quê — motivo e decisão saem juntos', /function mvSyncIdiomaDocs\(\)\{[\s\S]{0,500}_idiomaDecidido\(desc,_mvVagaDoCard\(\)\)/.test(html)
  && /frase\.textContent=[^;]*d\.motivo/.test(html));
t('as opções nascem fechadas, atrás de "mudar"', /id="mv-idioma-opcoes"[^>]*display:none/.test(html));
t('sem bandeiras/emoji no seletor do card', !/id="mv-idioma-opcoes"[\s\S]{0,600}🇧🇷/.test(html));
t('a frase se refaz quando a descrição muda', /function mvAtualizarBtnAnalise\(\)\{[\s\S]{0,2200}mvSyncIdiomaDocs\(\);/.test(html)
  && /oninput="[^"]*mvAtualizarBtnAnalise\(\)"/.test(html));

console.log('\n=== a escolha de idioma é DAQUELA vaga — não é um Caps Lock ===');
// Era global (cvLangManual): clicar "espanhol" numa vaga deixava todos os CVs seguintes em
// espanhol, sem nada na tela dizendo isso. Agora a exceção mora no card e viaja com ele.
t('escolher grava no card, não numa variável global', /function mvIdiomaEscolher\(lang\)\{[\s\S]{0,300}v\.cvIdioma=lang\|\|''/.test(html));
t('e o card não chama mais setLang (o toggle global ficou só na aba Análise CV)', !/function mvIdiomaEscolher\([\s\S]{0,300}setLang\(/.test(html));
t('a exceção sobrevive ao salvar o card', /cvIdioma:existing\?\.cvIdioma\|\|_novoA\.cvIdioma\|\|''/.test(html));
t('e ao salvamento silencioso que precede gerar o CV', /cvIdioma:existing\?\.cvIdioma\|\|\(isNew\?\(\(_mvNovoCardAnalise&&_mvNovoCardAnalise\.cvIdioma\)\|\|''\):''\)/.test(html));
t('o pedido de CV recebe a vaga (é dela que sai a exceção)', /const idioma = _idiomaDoPedido\(desc, o\.idioma, o\.vaga\)/.test(html));
t('gerarCVInline passa a vaga do card', /montarPedidoCV\(\{descricao:jobDesc[^}]*vaga:_mvVagaDoCard\(\)\}\)/.test(html));

console.log('\n=== as opções são as línguas DESTA pessoa, não três botões fixos ===');
t('nascem do Perfil (idiomasDoUsuario), desenhadas em JS', /function mvRenderIdiomaOpcoes\(\)\{[\s\S]{0,900}idiomasDoUsuario\(\)\.map/.test(html));
t('não há mais PT/EN/ES escritos à mão no HTML do seletor', !/data-lang="PT" onclick="mvIdiomaEscolher/.test(html));
t('"voltar ao padrão" só existe quando há exceção para desfazer', /if\(v&&v\.cvIdioma\) btns\.push\([\s\S]{0,200}Voltar ao padrão/.test(html));
t('o padrão do Perfil oferece toda língua declarada — qualquer nível', /function _perfilRenderIdiomaPadrao\(daTela\)\{[\s\S]{0,1100}filter\(c=>nivel\(c\)!=='nao'\)/.test(html));
t('e o select do Perfil deixou de trazer opções fixas no HTML', /<select id="perfil-idioma-candidatura"[^>]*><\/select>/.test(html));

console.log('\n=== o limite do SENOVA é do Senova: a língua dela não some em silêncio ===');
// Correção de Marcos (28/jul): a trava ética (só língua declarada) é por USUÁRIO; a de montagem
// do PDF é NOSSA. Somadas, apagavam do Perfil de quem fala alemão a opção de alemão, sem uma
// palavra — a falta parecia dela. Agora a língua aparece, desativada, e o motivo diz de quem é.
t('no card, a língua que não sabemos montar aparece marcada "em breve"', /function mvRenderIdiomaOpcoes\(\)\{[\s\S]{0,900}!posso\.includes\(c\)[\s\S]{0,300}em breve/.test(html));
t('e não é clicável (o PDF sairia meio traduzido)', /!posso\.includes\(c\)[\s\S]{0,200}disabled/.test(html));
t('no Perfil, ela também fica visível e desativada', /nivel\(c\)!=='nao'\)[\s\S]{0,600}idiomaEntregavel\(c\)[\s\S]{0,400}disabled>[\s\S]{0,120}em breve/.test(html));
t('a dívida é dita como do Senova, não como limite da pessoa', /o Senova ainda não monta o documento em /.test(html));

console.log('\n=== o CV guardado noutra língua não é baixado em silêncio ===');
t('a linha de estado avisa quando o CV está em língua diferente da decidida', /v\.atsCvIdioma&&_lang&&v\.atsCvIdioma!==_lang/.test(html));
t('e diz o que fazer a respeito', /refazer para sair em /.test(html));

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
