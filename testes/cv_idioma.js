// IDIOMA DO CV — a vaga manda no idioma do documento.
//
// 22/jul/2026: vaga espanhola de verdade (Mur&Partners, "Jefe de Ventas Nacional") gerou um CV em
// português. Duas causas independentes: (1) o parâmetro `lang` do ATS_SYSTEM não era usado em lugar
// nenhum do prompt — o toggle PT/EN/ES não fazia nada pelo CV; (2) o PDF Executivo é montado por
// CÓDIGO a partir do PERFIL_MARCOS (cargos, bullets, formação, idiomas, títulos de seção, meses,
// rodapé), tudo em português, sem passar pela IA. Consertar só o prompt entregaria um documento
// AINDA mais visivelmente misturado.
//
// Este teste cobre as três peças novas: detecção do idioma da vaga, os fatos traduzidos que voltam
// da IA (---PERFIL---) e a montagem do PDF nesse idioma.
const { carregarApp, chamar, exec, assert } = require('./_lib');
const { t, fim } = assert();

const s = carregarApp([
  'const PERFIL_MARCOS = {',
  'function filtrarExperienciasRelevantes(',
  'const _PDF_LABELS={',
  'function _pdfLabels(',
  'function _mesLabelPDF(',
  'function _secaoDoCV(',
  'function _nivelAlvoPDF(',
  'function _cvParaPDF(',
]);

// Textos reais de anúncio (encurtados), não frases inventadas de laboratório.
const VAGA_ES = `Jefe de Ventas Nacional. Buscamos un profesional con experiencia demostrable en la gestión
de equipos comerciales. El puesto reporta a la dirección general y tiene responsabilidad sobre el
desarrollo del canal y de las cuentas clave. Imprescindible más de 10 años en posiciones similares.
Se valorará conocimientos del sector industrial. Ofrecemos incorporación inmediata, salario fijo más
variable y jornada completa.`;

const VAGA_PT = `Vaga: Head de Vendas. Buscamos profissional com experiência em gestão de equipe comercial
e atuação em contratação de canais. Conhecimentos em desenvolvimento de negócios são desejáveis.
Atividades: gestão do pipeline, negociação com clientes-chave e acompanhamento de indicadores.
Benefícios: salário compatível com o mercado, plano de saúde e vale-refeição. Superior completo.`;

const VAGA_DE = `Vertriebsleiter (m/w/d). Wir sind ein wachsendes Unternehmen und suchen eine erfahrene
Persönlichkeit für die Leitung des Vertriebs. Ihre Aufgaben: Führung des Teams, Ausbau der Kunden
sowie die Entwicklung neuer Märkte. Anforderungen: abgeschlossenes Studium, mehrjährige Erfahrung
und sehr gute Kenntnisse im technischen Vertrieb. Wir bieten ein attraktives Gehalt.`;

const VAGA_EN = `Head of Sales. We are looking for an experienced leader to build and run our commercial
team. You will be responsible for the pipeline, for key account relationships and for the go to market
plan. Requirements: proven track record in B2B sales, strong analytical skills and the ability to work
with our marketing and product teams. Benefits: competitive salary and equity.`;

console.log('=== _idiomaDaVaga: determinístico, sem chamada de IA ===');
t('vaga espanhola → ES (o caso real que quebrou)', chamar(s, '_idiomaDaVaga', [VAGA_ES]) === 'ES', chamar(s, '_idiomaDaVaga', [VAGA_ES]));
t('vaga brasileira → PT', chamar(s, '_idiomaDaVaga', [VAGA_PT]) === 'PT', chamar(s, '_idiomaDaVaga', [VAGA_PT]));
t('vaga alemã → DE', chamar(s, '_idiomaDaVaga', [VAGA_DE]) === 'DE', chamar(s, '_idiomaDaVaga', [VAGA_DE]));
t('vaga inglesa → EN', chamar(s, '_idiomaDaVaga', [VAGA_EN]) === 'EN', chamar(s, '_idiomaDaVaga', [VAGA_EN]));
t('descrição curta não decide idioma (devolve vazio)', chamar(s, '_idiomaDaVaga', ['Jefe de Ventas']) === '');
t('texto sem sinal (só siglas e números) não decide', chamar(s, '_idiomaDaVaga', ['CRM ERP KPI B2B SaaS. '.repeat(20)]) === '');

console.log('\n=== _idiomaDoCV: o CV só sai em idioma que Marcos fala ===');
t('DE → CV em inglês (ele não fala alemão; mandar em alemão seria mentira)', chamar(s, '_idiomaDoCV', ['DE']) === 'EN');
t('ES → ES', chamar(s, '_idiomaDoCV', ['ES']) === 'ES');
t('PT → PT', chamar(s, '_idiomaDoCV', ['PT']) === 'PT');
t('sem idioma detectado → vazio (quem chama decide)', chamar(s, '_idiomaDoCV', ['']) === '');

console.log('\n=== _idiomaDoPedido: manda a vaga; o toggle só depois de clicado ===');
s.cvLang = 'PT'; s.cvLangManual = false;
t('vaga ES com toggle intocado → CV em ES', chamar(s, '_idiomaDoPedido', [VAGA_ES]) === 'ES', chamar(s, '_idiomaDoPedido', [VAGA_ES]));
t('vaga DE com toggle intocado → CV em EN', chamar(s, '_idiomaDoPedido', [VAGA_DE]) === 'EN');
t('sem sinal → cai no toggle (PT)', chamar(s, '_idiomaDoPedido', ['']) === 'PT');
s.cvLangManual = true;
t('Marcos clicou o toggle: a escolha dele passa na frente da vaga', chamar(s, '_idiomaDoPedido', [VAGA_ES]) === 'PT');
s.cvLang = 'EN';
t('toggle em EN vale mesmo em vaga espanhola', chamar(s, '_idiomaDoPedido', [VAGA_ES]) === 'EN');
t('pedido explícito manda sempre', chamar(s, '_idiomaDoPedido', [VAGA_ES, 'ES']) === 'ES');
s.cvLang = 'PT'; s.cvLangManual = false;

console.log('\n=== _extrairPerfilTraduzido: fato traduzido só entra se for confiável ===');
const RESP = (perfil) => `MARCOS FRANCO\n---CV---\nMARCOS FRANCO\nJefe de Ventas\n\nRESUMEN EJECUTIVO\nDirectivo comercial.\n\nCOMPETENCIAS E IDIOMAS\nVentas · Canal\n---PERFIL---\n${perfil}`;
const PERFIL_OK = JSON.stringify({
  exp: {
    consigliere: { cargo: 'Consultor Sénior', bullets: ['Asesoría a la dirección comercial.'] },
    popper: { cargo: 'Director de Expansión', bullets: ['a', 'b', 'c'] },
  },
  formacao: ['Máster en Dirección de Marketing y Ventas', 'f2', 'f3', 'f4'],
  idiomas: ['Portugués (nativo)', 'Inglés (avanzado)', 'Español (avanzado)'],
});

let p = chamar(s, '_extrairPerfilTraduzido', [RESP(PERFIL_OK)]);
t('traduz o cargo por id da experiência', p && p.exp.consigliere.cargo === 'Consultor Sénior', JSON.stringify(p && p.exp.consigliere));
t('traz os bullets traduzidos', p && p.exp.popper.bullets.length === 3);
t('formação com o número exato de itens é aceita', p && p.formacao && p.formacao.length === 4);
t('idiomas com o número exato de itens é aceito', p && p.idiomas && p.idiomas.length === 3);

t('sem bloco ---PERFIL--- → null (CV em português, sem tradução)', chamar(s, '_extrairPerfilTraduzido', ['MARCOS FRANCO\n---CV---\nx']) === null);
t('JSON quebrado → null (nunca meio traduzido)', chamar(s, '_extrairPerfilTraduzido', [RESP('{exp:{')]) === null);

p = chamar(s, '_extrairPerfilTraduzido', [RESP(JSON.stringify({
  exp: { consigliere: { cargo: 'Consultor Sénior', bullets: ['x'] }, inventada: { cargo: 'Nada', bullets: [] } },
}))]);
t('id que não existe no perfil é ignorado (IA não inventa experiência)', p && !p.exp.inventada && !!p.exp.consigliere);

p = chamar(s, '_extrairPerfilTraduzido', [RESP(JSON.stringify({
  exp: { consigliere: { cargo: 'Consultor Sénior', bullets: ['x'] }, popper: { cargo: 'Director', bullets: ['só um'] } },
}))]);
t('bullets em número diferente → cai só naquele item', p && !p.exp.popper && !!p.exp.consigliere);

p = chamar(s, '_extrairPerfilTraduzido', [RESP(JSON.stringify({
  exp: { consigliere: { cargo: '', bullets: ['x'] } },
}))]);
t('cargo vazio derruba a tradução inteira (não sobrou item bom)', p === null);

p = chamar(s, '_extrairPerfilTraduzido', [RESP(JSON.stringify({
  exp: { consigliere: { cargo: 'Consultor Sénior', bullets: ['x'] } }, formacao: ['só uma'], idiomas: [],
}))]);
t('formação em número diferente → nenhuma formação traduzida (o PDF usa o fato PT)', p && p.formacao === null);
t('idiomas em número diferente → idiomas ficam os do perfil', p && p.idiomas === null);

console.log('\n=== setCV guarda (e limpa) os fatos traduzidos junto com o CV ===');
const v = { id: 1, timeline: [] };
exec(s, 'setCV(vagas[0]=' + JSON.stringify(v) + ', ' + JSON.stringify(RESP(PERFIL_OK)) + ')');
t('resposta com ---PERFIL--- grava atsPerfilTrad', !!exec(s, 'vagas[0].atsPerfilTrad'));
t('e o atsCV continua limpo (sem o bloco de perfil)', !exec(s, 'vagas[0].atsCV').includes('---PERFIL---') && !exec(s, 'vagas[0].atsCV').includes('Consultor Sénior'));
exec(s, 'setCV(vagas[0], vagas[0].atsCV)');
t('regravar o CV já limpo NÃO apaga a tradução', !!exec(s, 'vagas[0].atsPerfilTrad'));
exec(s, 'setCV(vagas[0], "MARCOS FRANCO\\n---CV---\\nMARCOS FRANCO\\nHead de Vendas\\n\\nRESUMO EXECUTIVO\\nx")');
t('CV novo em português apaga a tradução (senão o PDF mistura idiomas)', exec(s, 'vagas[0].atsPerfilTrad') === null);

console.log('\n=== rótulos e datas do PDF acompanham o idioma ===');
t('PT: Resumo Executivo', chamar(s, '_pdfLabels', ['PT']).resumo === 'Resumo Executivo');
t('ES: Resumen Ejecutivo / Experiencia Profesional', chamar(s, '_pdfLabels', ['ES']).resumo === 'Resumen Ejecutivo' && chamar(s, '_pdfLabels', ['ES']).exp === 'Experiencia Profesional');
t('EN: Executive Summary / Education', chamar(s, '_pdfLabels', ['EN']).resumo === 'Executive Summary' && chamar(s, '_pdfLabels', ['EN']).form === 'Education');
t('idioma desconhecido cai em PT (nunca fica sem rótulo)', chamar(s, '_pdfLabels', ['ZZ']).resumo === 'Resumo Executivo');
t('mês em ES', chamar(s, '_mesLabelPDF', ['2025-11', 'ES']) === 'Noviembre 2025', chamar(s, '_mesLabelPDF', ['2025-11', 'ES']));
t('mês em EN', chamar(s, '_mesLabelPDF', ['2025-11', 'EN']) === 'November 2025');
t('cargo atual em ES', chamar(s, '_mesLabelPDF', [null, 'ES']) === 'actualidad');
t('cargo atual em EN', chamar(s, '_mesLabelPDF', [null, 'EN']) === 'Present');

console.log('\n=== _cvParaPDF em espanhol: fatos traduzidos entram, o resto não vira mentira ===');
const CV_ES = `MARCOS FRANCO
Directivo Comercial · Ventas y Desarrollo de Negocio · Curitiba, PR (Brasil)

RESUMEN EJECUTIVO
Directivo con más de 25 años en desarrollo de negocio y alianzas estratégicas.

COMPETENCIAS E IDIOMAS
Desarrollo de Negocio · Canal Indirecto · Gestión de Pipeline`;
const trad = chamar(s, '_extrairPerfilTraduzido', [RESP(PERFIL_OK)]);
let r = exec(s, '_cvParaPDF(' + JSON.stringify(VAGA_ES) + ',' + JSON.stringify(CV_ES) + ',"Jefe de Ventas","ES",' + JSON.stringify(trad) + ')');
t('resumo em espanhol (veio do CV da IA)', /Directivo con más/.test(r.resumo), r.resumo.slice(0, 40));
t('competências em espanhol', /Desarrollo de Negocio/.test(r.competencias));
t('período em espanhol (mês + "actualidad")', /actualidad/.test(r.experiencias[0].periodo), r.experiencias[0].periodo);
t('cargo traduzido pelo id', r.experiencias[0].cargo === 'Consultor Sénior', r.experiencias[0].cargo);
t('formação traduzida', /Máster/.test(r.formacao[0].titulo), r.formacao[0].titulo);
t('instituição NÃO se traduz (nome próprio)', /Universitat de Barcelona/.test(r.formacao[0].instituicao));
t('idiomas traduzidos', /Portugués/.test(r.idiomas), r.idiomas);
t('empresa continua igual (nome próprio)', /Consigliere/.test(r.experiencias[0].empresa));

console.log('\n=== fallback: sem tradução, o PDF não sai quebrado ===');
r = exec(s, '_cvParaPDF(' + JSON.stringify(VAGA_ES) + ',' + JSON.stringify(CV_ES) + ',"Jefe de Ventas","ES",null)');
t('sem trad, cargo cai no fato em português (documento coerente, não vazio)', !!r.experiencias[0].cargo);
t('sem trad, idiomas caem no perfil em português', /Português/.test(r.idiomas));
t('mas os rótulos de data seguem em espanhol', /actualidad/.test(r.experiencias[0].periodo));

const tradParcial = chamar(s, '_extrairPerfilTraduzido', [RESP(JSON.stringify({ exp: { consigliere: { cargo: 'Consultor Sénior', bullets: ['Asesoría.'] } } }))]);
r = exec(s, '_cvParaPDF(' + JSON.stringify(VAGA_ES) + ',' + JSON.stringify(CV_ES) + ',"Jefe de Ventas","ES",' + JSON.stringify(tradParcial) + ')');
t('tradução parcial: item traduzido usa o espanhol', r.experiencias[0].cargo === 'Consultor Sénior');
t('tradução parcial: os outros itens não somem do PDF', r.experiencias.length > 1 && !!r.experiencias[1].cargo);

console.log('\n=== o PDF em português continua igual ao aprovado (nada regrediu) ===');
r = exec(s, '_cvParaPDF("Gerente Comercial","MARCOS FRANCO\\nExecutivo Comercial\\n\\nRESUMO EXECUTIVO\\nx","Gerente Comercial","PT",null)');
t('mês em português', /Novembro 2025 – presente/.test(r.experiencias[0].periodo), r.experiencias[0].periodo);
t('idiomas em português', /Português.*Inglês.*Espanhol/.test(r.idiomas));

fim('CV_IDIOMA');
