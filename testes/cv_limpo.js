// Reproduz o bug do CV poluído (análise no topo) e prova que agora sai só o CV.
const fs=require('fs'), vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
function extrai(a){const i=html.indexOf(a);if(i<0)throw new Error('nao achei: '+a);const ab=html.indexOf('{',i);let d=0,j=ab;for(;j<html.length;j++){const c=html[j];if(c==='{')d++;else if(c==='}'){d--;if(d===0)break;}}return html.slice(i,j+1);}
const fontes=['function _jobIdLinkedIn(','function _acharVagaRef(','function _extrairSoCV(','function setCV(','window.__senovaCopilotoSalvarCV=function(','window.__senovaCopilotoGerarCV=function('].map(extrai).join('\n;\n');
const sandbox={vagas:[],saveVagas:()=>{},document:{getElementById:()=>null},MODELOS:{analise:'m'},ATS_SYSTEM:()=>'SYS',lastCV:'',lastCVFilename:'',atsCargo:'',cvLang:'PT',_pdfExecBase64:()=>'FAKEB64',btoa:s=>Buffer.from(s,'binary').toString('base64'),unescape:global.unescape||(s=>decodeURIComponent(s)),encodeURIComponent,console};
sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(fontes,sandbox);
let ok=0,fail=0;const t=(n,c,d)=>{if(c){ok++;console.log('  PASS  '+n);}else{fail++;console.log('  FAIL  '+n+(d?'  → '+d:''));}};

// A resposta REAL do Worker/ATS_SYSTEM (como no PDF que Marcos recebeu)
const RESP_SUJA=`MARCOS FRANCO
## Análise da Vaga
## Match Score
MATCH SCORE: 82/100
Keywords 32/40 · Experiência 28/30
VEREDICTO: FORTE CANDIDATO
## Keywords
**A inserir no CV:** Parcerias estratégicas · Business Development
---CV---
MARCOS FRANCO
Curitiba, PR · (41) 99615-2224
RESUMO PROFISSIONAL
Executivo comercial e de marketing com mais de 25 anos...
---CRM---
VAGA: Alelo | Gerente Comercial`;

const CV_LIMPO_ESPERADO=`MARCOS FRANCO
Curitiba, PR · (41) 99615-2224
RESUMO PROFISSIONAL
Executivo comercial e de marketing com mais de 25 anos...`;

console.log('\n=== _extrairSoCV ===');
t('remove análise, keywords e CRM', vm.runInContext('_extrairSoCV('+JSON.stringify(RESP_SUJA)+')',sandbox)===CV_LIMPO_ESPERADO);
t('NÃO contém MATCH SCORE', !vm.runInContext('_extrairSoCV('+JSON.stringify(RESP_SUJA)+')',sandbox).includes('MATCH SCORE'));
t('NÃO contém "A inserir no CV"', !vm.runInContext('_extrairSoCV('+JSON.stringify(RESP_SUJA)+')',sandbox).includes('A inserir'));
t('NÃO contém "## Análise"', !vm.runInContext('_extrairSoCV('+JSON.stringify(RESP_SUJA)+')',sandbox).includes('## Análise'));
t('CV já limpo passa intacto', vm.runInContext('_extrairSoCV('+JSON.stringify(CV_LIMPO_ESPERADO)+')',sandbox)===CV_LIMPO_ESPERADO);

console.log('\n=== __senovaCopilotoSalvarCV — a extensão salva só o CV ===');
sandbox.vagas=[{id:1,empresa:'Alelo',cargo:'Gerente Comercial',status:'lead',origemUrl:'https://alelo.com/v/1',timeline:[]}];
const salvou=vm.runInContext('window.__senovaCopilotoSalvarCV({url:"https://alelo.com/v/1"},'+JSON.stringify(RESP_SUJA)+')',sandbox);
t('salvou', salvou===true);
t('atsCV NÃO tem a análise', !sandbox.vagas[0].atsCV.includes('MATCH SCORE'));
t('atsCV é o CV limpo', sandbox.vagas[0].atsCV===CV_LIMPO_ESPERADO);

console.log('\n=== __senovaCopilotoGerarCV — LIMPA card já poluído (o teu caso da Alelo) ===');
sandbox.vagas=[{id:2,empresa:'Alelo',cargo:'Gerente Comercial',status:'lead',origemUrl:'https://alelo.com/v/2',atsCV:RESP_SUJA,timeline:[]}];
const r=vm.runInContext('window.__senovaCopilotoGerarCV({url:"https://alelo.com/v/2"},"docx")',sandbox);
t('gerou o .docx', r&&r.ok===true, JSON.stringify(r&&r.motivo));
t('CORRIGIU o card poluído', !sandbox.vagas[0].atsCV.includes('MATCH SCORE'));
// decodifica o .docx gerado e confere que não tem a análise
const b64=r.dataUrl.split('base64,').pop();
const doc=Buffer.from(b64,'base64').toString('utf8');
t('.docx NÃO contém MATCH SCORE', !doc.includes('MATCH SCORE'));
t('.docx NÃO contém "A inserir no CV"', !doc.includes('A inserir'));
t('.docx contém o CV real', doc.includes('RESUMO PROFISSIONAL'));

console.log('\n=== PDF idem (limpa o card antes de gerar) ===');
sandbox.vagas=[{id:3,empresa:'Alelo',cargo:'GC',status:'lead',origemUrl:'https://alelo.com/v/3',atsCV:RESP_SUJA,timeline:[]}];
const rp=vm.runInContext('window.__senovaCopilotoGerarCV({url:"https://alelo.com/v/3"},"pdf")',sandbox);
t('gerou o PDF', rp&&rp.ok===true, JSON.stringify(rp));
t('o card foi limpo p/ o PDF Executivo', sandbox.vagas[0].atsCV===CV_LIMPO_ESPERADO);

console.log('\n──────────────────────────────');
console.log(fail===0?`TODOS OS ${ok} TESTES PASSARAM`:`${ok} passaram · ${fail} FALHARAM`);
process.exit(fail===0?0:1);
