// O CONTATO DO CV É O QUE A PESSOA ESCREVEU NO PERFIL — NÃO O NOME CHUMBADO NO CÓDIGO.
//
// O defeito (medido em 21/ago/2026, no mapa campo a campo do Perfil): nome, e-mail, telefone e
// LinkedIn eram salvos no Worker, voltavam à tela ao abrir, e NENHUM leitor os consultava. O
// cabeçalho de todo CV — o que o recrutador usa para responder — saía do bloco fixo dentro do
// index.html. Enquanto os dois coincidiam ninguém percebia; no dia em que Marcos trocasse de
// telefone pela tela, o PDF continuaria mandando o antigo, sem avisar ninguém.
//
// São DOIS os leitores (o prompt da IA e o cabeçalho do documento) e ainda um terceiro uso: o
// reconhecedor da linha do nome, que existe em duas rotinas do PDF e tinha "marcos franco"
// escrito no código — o que impedia qualquer segundo usuário de ter um CV correto.
//
// Este teste guarda os dois lados:
//   1. o que se edita no Perfil chega ao documento e ao prompt;
//   2. um contato quebrado NUNCA produz um CV sem cabeçalho — cai na rede, como carreira e formação.
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp([
  'function _pdfCabecalhoCorpo(',
  'function _cvParaPDF(',
  'function perfilFormatadoPara(',
  'function filtrarExperienciasRelevantes(',
  'function formatarExperienciasPerfil(',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _nivelAlvoPDF(',
]);

const VAGA = 'Gerente Comercial em Curitiba, liderança de equipe de vendas e canais indiretos.';
const CV_TEXTO = [
  'MARCOS FRANCO',
  'Executivo Comercial | Vendas e Canais',
  '(41) 99615-2224 · marcos_mco@hotmail.com',
  '',
  'RESUMO EXECUTIVO',
  'Trinta anos de liderança comercial.',
].join('\n');
const doc = () => chamar(s, '_cvParaPDF', [VAGA, CV_TEXTO, 'Gerente Comercial', 'PT', null]);
const semente = exec(s, 'PERFIL_MARCOS.contato');

console.log('=== sem nada salvo, o contato é o de sempre (a rede) ===');
let d = doc();
t('o nome do cabeçalho vem da semente', d.nome === semente.nome, d.nome);
t('e a linha de contato traz telefone, e-mail e LinkedIn', d.contato === `${semente.telefone} · ${semente.email} · ${semente.linkedin}`, d.contato);

console.log('\n=== o que a pessoa edita no Perfil chega ao documento ===');
exec(s, `guardarContatoSalvo({nome:'Marcos Franco',telefone:'(41) 3333-1010',email:'marcos@senova.app',linkedin:'linkedin.com/in/marcos-franco'})`);
let d2 = doc();
t('o telefone novo está no cabeçalho', /\(41\) 3333-1010/.test(d2.contato), d2.contato);
t('o e-mail novo também', /marcos@senova\.app/.test(d2.contato));
t('e o telefone antigo saiu de cena', !/99615-2224/.test(d2.contato));
t('o nome continua correto', d2.nome === 'Marcos Franco', d2.nome);

console.log('\n=== e chega ao prompt que vai à IA ===');
const prompt = () => chamar(s, 'perfilFormatadoPara', [VAGA, 'gerencial', false]);
let p = prompt();
t('o prompt leva o contato editado', /marcos@senova\.app/.test(p) && /\(41\) 3333-1010/.test(p));
t('o prompt não leva mais o contato do bloco fixo', !/99615-2224/.test(p));

console.log('\n=== a localização continua vindo da semente (o Perfil ainda não pergunta) ===');
t('a localização do bloco fixo sobrevive à edição', new RegExp(semente.localizacao).test(p), semente.localizacao);

console.log('\n=== apagar um campo de propósito realmente apaga ===');
// Regra dura: se a pessoa limpa o LinkedIn na tela, o documento não pode ressuscitá-lo da semente
// — senão ela não consegue corrigir o próprio CV. A rede vale para o contato INTEIRO inutilizável,
// nunca para um campo que ela escolheu deixar em branco.
exec(s, `guardarContatoSalvo({nome:'Marcos Franco',telefone:'(41) 3333-1010',email:'marcos@senova.app',linkedin:''})`);
let d3 = doc();
t('o LinkedIn some do cabeçalho', !/linkedin/i.test(d3.contato), d3.contato);
t('e a linha não fica com separador solto', !/·\s*·|·\s*$|^\s*·/.test(d3.contato), JSON.stringify(d3.contato));
t('o que sobrou continua lá', d3.contato === '(41) 3333-1010 · marcos@senova.app', d3.contato);

console.log('\n=== contato quebrado nunca vira documento sem cabeçalho ===');
exec(s, `guardarContatoSalvo({nome:'',telefone:'(41) 3333-1010',email:'x@y.com'})`);
t('sem nome, o contato salvo é descartado', exec(s, 'contatoSalvo()') === null);
t('e o CV volta para o contato de sempre', doc().nome === semente.nome);

exec(s, `guardarContatoSalvo({nome:'Marcos Franco',telefone:'',email:'',linkedin:'linkedin.com/in/x'})`);
t('sem nenhum canal de retorno, também é descartado', exec(s, 'contatoSalvo()') === null);
t('e o CV volta para o contato de sempre', doc().contato === `${semente.telefone} · ${semente.email} · ${semente.linkedin}`);

exec(s, `guardarContatoSalvo(null)`);
t('limpar tudo não deixa o cabeçalho vazio', doc().nome === semente.nome);

console.log('\n=== o nome deixou de estar escrito no código: outra pessoa tem CV correto ===');
// Este é o degrau do segundo usuário. Duas rotinas do PDF precisavam saber qual linha do CV é a
// linha do nome, e as duas tinham "marcos franco" fixo — para qualquer outra pessoa, o próprio
// nome dela seria promovido a título profissional no documento.
exec(s, `guardarContatoSalvo({nome:'Ana Ribeiro Costa',telefone:'(11) 90000-0000',email:'ana@exemplo.com',linkedin:'linkedin.com/in/ana'})`);
t('a linha do nome dela é reconhecida', chamar(s, '_ehLinhaDoNome', ['ANA RIBEIRO COSTA', true]) === true);
t('e não é confundida com um título profissional', chamar(s, '_ehLinhaDoNome', ['Diretora Comercial', true]) === false);
t('o nome antigo deixa de ser reconhecido', chamar(s, '_ehLinhaDoNome', ['MARCOS FRANCO', true]) === false);

const CV_ANA = ['ANA RIBEIRO COSTA', 'Diretora Comercial | Varejo', 'ana@exemplo.com', '', 'RESUMO EXECUTIVO', 'Vinte anos em varejo.'].join('\n');
const dAna = chamar(s, '_cvParaPDF', [VAGA, CV_ANA, 'Gerente Comercial', 'PT', null]);
t('o cabeçalho do PDF traz o nome dela', dAna.nome === 'Ana Ribeiro Costa', dAna.nome);
t('o subtítulo é o cargo dela, não o nome repetido', dAna.subtitulo === 'Diretora Comercial | Varejo', dAna.subtitulo);
const cab = chamar(s, '_pdfCabecalhoCorpo', [CV_ANA]);
t('a separação cabeçalho/corpo também segue o nome dela', cab.titulo === 'Diretora Comercial | Varejo', cab.titulo);
t('e o corpo começa no resumo, sem repetir o nome', /^RESUMO/i.test(cab.corpo.trim()), cab.corpo.slice(0, 40));

console.log('\n=== fiação: os pontos que fazem isto valer no app real ===');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
t('não existe mais nenhum "marcos franco" escrito no código do PDF', !/\/\^marcos\\s\+franco/i.test(html));
t('o prompt da IA lê o ponto único', /const c = contatoDoCV\(\);/.test(html));
t('o cabeçalho do documento lê o ponto único', /const c=contatoDoCV\(\);/.test(html));
t('salvarPerfil espelha o contato no navegador', /guardarContatoSalvo\(\{nome:dados\.nome/.test(html));
t('e só DEPOIS do Worker aceitar (junto de experiências e formação)',
  /guardarExperienciasSalvas\(dados\.experiencias\);[\s\S]{0,120}guardarContatoSalvo\(\{nome:dados\.nome/.test(html));
t('carregarPerfil espelha o contato ao abrir a tela', /guardarContatoSalvo\(\{nome:p\.nome/.test(html));

fim('Contato manda no CV');
