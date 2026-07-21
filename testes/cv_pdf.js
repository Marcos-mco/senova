// Cabeçalho do PDF Executivo: nunca duplica o contato, sempre traz um título profissional.
// Fecha o buraco de QA que deixou passar o cabeçalho duplicado (contato na linha 1 do CV novo).
const { carregarApp, chamar, assert } = require('./_lib');
const { t, fim } = assert();
const s = carregarApp(['function _pdfCabecalhoCorpo(']);

console.log('=== CV NOVO (nome + contato + seções) — o bug que Marcos viu ===');
const cvNovo = `MARCOS FRANCO
Curitiba, PR · (41) 99615-2224 · marcos_mco@hotmail.com
linkedin.com/in/marcos-franco-69153a12

RESUMO PROFISSIONAL
Executivo comercial e de marketing com mais de 25 anos liderando...
COMPETÊNCIAS-CHAVE
Business Development · Parcerias Estratégicas`;
let r = chamar(s, '_pdfCabecalhoCorpo', [cvNovo]);
t('título NÃO é o contato (era a duplicação)', !/@|\(\d{2}\)|linkedin/.test(r.titulo), r.titulo);
t('título é um título profissional', /Executivo/.test(r.titulo));
t('corpo começa no RESUMO (cabeçalho pulado)', r.corpo.startsWith('RESUMO PROFISSIONAL'), r.corpo.slice(0, 25));
t('corpo NÃO repete nome nem contato', !/MARCOS FRANCO|@|linkedin/.test(r.corpo.split('\n')[0]));

console.log('\n=== CV com título profissional explícito (formato antigo) ===');
const cvAntigo = `MARCOS FRANCO
Executivo de Marketing & Crescimento | CMO · CSO · CEO
(41) 99615-2224 · marcos_mco@hotmail.com

RESUMO PROFISSIONAL
Texto do resumo...`;
r = chamar(s, '_pdfCabecalhoCorpo', [cvAntigo]);
t('usa o título profissional do próprio CV', /Executivo de Marketing & Crescimento/.test(r.titulo), r.titulo);
t('título não é contato', !/@/.test(r.titulo));
t('corpo começa no RESUMO', r.corpo.startsWith('RESUMO'));

console.log('\n=== robustez ===');
r = chamar(s, '_pdfCabecalhoCorpo', ['']);
t('CV vazio → título padrão (nunca vazio no cabeçalho)', /Executivo/.test(r.titulo));
// defesa dupla: se ainda vier a análise junto, _extrairSoCV limpa antes
r = chamar(s, '_pdfCabecalhoCorpo', ['MATCH SCORE: 82/100\nKeywords\n---CV---\nMARCOS FRANCO\nCuritiba, PR · (41) 99615-2224\n\nRESUMO PROFISSIONAL\nx']);
t('análise nunca entra no título nem no corpo', !/MATCH SCORE/.test(r.titulo) && !/MATCH SCORE/.test(r.corpo));
t('corpo é o CV real', r.corpo.startsWith('RESUMO PROFISSIONAL'));

fim('CV_PDF');
