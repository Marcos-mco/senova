// O Store é o único dono do armazenamento — e o código-fonte não guarda a vida
// de ninguém (S40).
//
// Duas regressões diferentes, que este arquivo existe para impedir:
//
// 1. ARQUITETURA. Antes havia seis lugares tocando 'senova_vagas_v2' direto e
//    mais dois tocando 'senova_contatos_v2'. Enquanto for assim, tirar os dados
//    do navegador e pô-los no banco significa reescrever o app inteiro — e todo
//    ponto novo de gravação é uma chance nova de perder dado em silêncio. Com um
//    funil só, a migração é a troca de UM objeto.
//
// 2. DADOS PESSOAIS. O index.html é servido publicamente em
//    marcos-mco.github.io/senova, e trazia cravadas 66 linhas com nome completo,
//    cargo, empresa, telefone, LinkedIn e notas privadas de 19 terceiros que
//    nunca consentiram — além de fazer todo usuário novo abrir o Senova com o
//    CRM de outra pessoa na tela. Nunca mais.

const { extrai, html, assert } = require('./_lib');
const { t, fim } = assert();

console.log('=== 1. arquitetura: só o Store fala com o armazenamento do CRM ===');
{
  // O defeito concreto a barrar: qualquer chamada de armazenamento com a chave
  // do CRM escrita à mão, em qualquer lugar. O Store usa this.CHAVE — nunca o
  // literal —, então o número certo aqui é zero, sem exceção.
  const atalhos = html.match(/localStorage\.\w+Item\(\s*'senova_(vagas|contatos)_v2'|localStorage\.\w+Item\(\s*'senova_vagas_arquivadas/g) || [];
  t('nenhuma leitura/gravação passa por fora do Store', atalhos.length === 0,
    atalhos.length + ' atalho(s): ' + atalhos.join(' | '));

  const store = extrai('const Store = {');
  t('o Store declara a chave dos processos', /CHAVE:\s*'senova_vagas_v2'/.test(store));
  t('o Store declara a chave dos contatos', /CHAVE_CONTATOS:\s*'senova_contatos_v2'/.test(store));
  t('o Store sabe ler as duas listas', /\bler\(\)/.test(store) && /\blerContatos\(\)/.test(store));
  t('o Store sabe gravar as duas listas', /\bgravar\(\)/.test(store) && /\bgravarContatos\(\)/.test(store));

  // Se isto quebrar, é porque alguém voltou a gravar direto: o custo não aparece
  // hoje, aparece no dia da migração.
  t('saveVagas delega ao Store', /Store\.gravar\(\)/.test(extrai('function saveVagas(')));
  t('saveContatos delega ao Store', /Store\.gravarContatos\(\)/.test(extrai('function saveContatos(')));
}

console.log('\n=== 2. um usuário novo começa VAZIO, nunca com o CRM de outra pessoa ===');
{
  t('não existe mais uma lista de processos de exemplo no código',
    !/DEFAULT_VAGAS/.test(html));
  t('não existe mais uma agenda de contatos de exemplo no código',
    !/DEFAULT_CONTATOS/.test(html));
  t('sem nada guardado, os processos começam em lista vazia',
    /const a=quente\?JSON\.parse\(quente\):\[\]/.test(html)
    && /const b=frio\?JSON\.parse\(frio\):\[\]/.test(html));
  t('o loadCRM lê pelo Store, não pelo armazenamento', /vagas=Store\.lerVagas\(\)/.test(html));
  t('sem nada guardado, os contatos começam em lista vazia',
    /contatos=sc\?JSON\.parse\(sc\):\[\]/.test(html));
}

console.log('\n=== 3. nenhum terceiro publicado no código-fonte ===');
{
  // Amostra dos que estavam expostos. Não é a lista toda — é o suficiente para
  // que qualquer volta do bloco antigo derrube o teste. Note que o nome do
  // próprio Marcos NÃO entra aqui: ele ainda aparece no CV base e nos prompts,
  // e sair de lá é o passo da costura de identidade, não deste.
  const expostos = ['Bosquetti', 'Capellato', 'Bergamasco', 'Mallucelli', 'Klevenhusen', 'Lemanski', '981873329'];
  const achados = expostos.filter(nome => html.includes(nome));
  t('nenhum dado de terceiro sobrou no arquivo público', achados.length === 0,
    'ainda presente(s): ' + achados.join(', '));
}

fim('STORE É O DONO ÚNICO · CÓDIGO SEM DADO DE TERCEIRO');
