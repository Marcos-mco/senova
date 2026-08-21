// O DIPLOMA QUE MARCOS SUBIU TEM QUE ESTAR LÁ DEPOIS.
//
// O defeito (21/ago/2026): o card "Certificados e diplomas" do Perfil aceitava fotos e PDFs,
// desenhava o nome de cada arquivo numa linha e pronto. Não abria o arquivo, não gravava nada,
// e o botão "Salvar perfil" nem sabia que aquele card existia. Marcos subiu todos os diplomas
// dele; bastou recarregar a página para não sobrar nenhum. E o card ainda prometia, por escrito,
// que "a Sofia organiza e usa nos documentos".
//
// É a forma mais grave do mesmo defeito da carreira e da formação (ver perfil_manda_no_cv.js):
// recibo de uma coisa que não aconteceu. Aqui era pior — o dado não ia para lugar NENHUM.
//
// Este teste guarda três coisas:
//   1. o arquivo é realmente gravado, e volta inteiro depois de fechar e reabrir a tela;
//   2. remover exige dois toques — um diploma não sai com um clique distraído;
//   3. o documento pessoal NÃO sobe: nada aqui toca o Worker, o KV ou a IA.
const { carregarApp, chamar, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

// IndexedDB de mentira, mas de verdade: guarda, devolve, apaga e sobrevive ao "recarregar a
// página" (o banco é reaberto do zero, os dados ficam). É o que o teste precisa provar.
function bancoFalso(){
  const lojas={};
  const tarefa=(fn)=>{ const r={}; setTimeout(()=>{ try{ r.result=fn(); r.onsuccess&&r.onsuccess(); }catch(e){ r.error=e; r.onerror&&r.onerror(); } },0); return r; };
  return {
    _lojas:lojas,
    open(nome){
      const req={};
      setTimeout(()=>{
        const novo=!lojas[nome];
        if(novo) lojas[nome]={};
        req.result={
          _nome:nome,
          createObjectStore(l){ lojas[nome][l]={}; return {}; },
          transaction(l){
            lojas[nome][l]=lojas[nome][l]||{};
            const tx={ objectStore:()=>({
              getAll:()=>tarefa(()=>Object.values(lojas[nome][l])),
              put:(v)=>{ lojas[nome][l][v.id]=v; setTimeout(()=>tx.oncomplete&&tx.oncomplete(),0); },
              delete:(id)=>{ delete lojas[nome][l][id]; setTimeout(()=>tx.oncomplete&&tx.oncomplete(),0); },
            }) };
            setTimeout(()=>{ if(!tx._fechou){ tx._fechou=true; tx.oncomplete&&tx.oncomplete(); } },1);
            return tx;
          },
        };
        if(novo){ req.onupgradeneeded&&req.onupgradeneeded(); }
        req.onsuccess&&req.onsuccess();
      },0);
      return req;
    },
  };
}

const idb=bancoFalso();
const desenhado={ innerHTML:'' };  // e nele que _certRender escreve
const toasts=[];
const s = carregarApp([
  'const Diplomas={',
  'let _certItens=',
  'function _certTamanho(',
  'function _certGlifo(',
  'function _certRender(',
  'async function _certCarregar(',
  'async function perfilCertUpload(',
  'function certRemover(',
  'function certAbrir(',
  'function _expEsc(',
], {
  indexedDB: idb,
  setTimeout: (fn,ms)=>setTimeout(fn,ms||0),
  showToast: (m)=>toasts.push(m),
  document: { getElementById: (id)=> id==='perfil-cert-lista' ? desenhado : null },
});

const arquivo=(nome,tipo,bytes)=>({name:nome,type:tipo,size:bytes});
const espera=()=>new Promise(r=>setTimeout(r,25));

(async ()=>{
  console.log('=== o arquivo que a pessoa escolhe é gravado, não só desenhado ===');
  await exec(s,'perfilCertUpload')({files:[arquivo('diploma_evora.jpg','image/jpeg',2_400_000), arquivo('mba_fgv.pdf','application/pdf',900_000)]});
  await espera();
  t('os dois documentos entraram', exec(s,'_certItens.length')===2, String(exec(s,'_certItens.length')));
  t('o nome do arquivo é preservado', /diploma_evora\.jpg/.test(desenhado.innerHTML));
  t('o tamanho aparece para a pessoa conferir', /2,3 MB|2,4 MB/.test(desenhado.innerHTML), (desenhado.innerHTML.match(/[\d,]+ MB/)||[''])[0]);
  t('o Senova avisa que guardou', toasts.some(m=>/guardados|guardado/i.test(m)), toasts.join(' | '));

  console.log('\n=== recarregar a página não apaga nada (era exatamente o que acontecia) ===');
  exec(s,'_certItens=[]');           // a tela morre
  desenhado.innerHTML='';
  await exec(s,'_certCarregar')();   // e nasce de novo, lendo do banco
  await espera();
  t('os documentos voltaram do banco', exec(s,'_certItens.length')===2, String(exec(s,'_certItens.length')));
  t('o diploma de Évora continua lá', /diploma_evora\.jpg/.test(desenhado.innerHTML));
  t('e o MBA também', /mba_fgv\.pdf/.test(desenhado.innerHTML));
  t('o arquivo em si voltou, não só o nome', !!exec(s,'_certItens[0].arquivo'));

  console.log('\n=== o que é grande demais é recusado com motivo, não em silêncio ===');
  toasts.length=0;
  await exec(s,'perfilCertUpload')({files:[arquivo('scan_gigante.pdf','application/pdf',40_000_000)]});
  await espera();
  t('o arquivo de 40 MB não entra', exec(s,'_certItens.length')===2, String(exec(s,'_certItens.length')));
  t('e a pessoa é avisada, com o nome do arquivo', toasts.some(m=>/scan_gigante/.test(m)), toasts.join(' | '));

  console.log('\n=== remover pede confirmação: um diploma não sai por um clique distraído ===');
  const alvo=exec(s,'_certItens[0].id');
  chamar(s,'certRemover',[alvo]);
  t('o primeiro toque só pergunta', exec(s,'_certItens.length')===2);
  t('e a pergunta aparece na linha', /Confirmar remoção\?/.test(desenhado.innerHTML));
  chamar(s,'certRemover',[alvo]);
  await espera();
  t('o segundo toque remove', exec(s,'_certItens.length')===1, String(exec(s,'_certItens.length')));
  t('e o removido não volta do banco', await (async()=>{ exec(s,'_certItens=[]'); await exec(s,'_certCarregar')(); await espera(); return exec(s,'_certItens.length')===1; })());
  t('quem ficou foi o outro', /mba_fgv\.pdf/.test(desenhado.innerHTML));

  console.log('\n=== documento pessoal não sobe: fica neste navegador ===');
  const fonte=html.slice(html.indexOf('const Diplomas={'), html.indexOf('function salvarDiasInativo('));
  t('nada no bloco chama o Worker', !/WORKER_URL|fetch\(/.test(fonte));
  t('nada é gravado no KV nem mandado à IA', !/api\/perfil|api\/claude/.test(fonte));
  t('salvarPerfil não carrega diploma no corpo do pedido',
    !/_certItens|Diplomas\./.test(html.slice(html.indexOf('async function salvarPerfil('), html.indexOf('async function salvarPerfil(')+4000)));

  console.log('\n=== a promessa escrita no card é a que o app cumpre ===');
  // A frase antiga sobrevive num comentario do codigo, contando o que aconteceu — o que nao pode
  // sobreviver e a PROMESSA na tela. Por isso a busca e dentro do card, nao no arquivo inteiro.
  const card=html.slice(html.indexOf('<!-- Certificados e diplomas -->'), html.indexOf('</div><!-- /panel-3 -->'));
  t('o card não promete mais que a Sofia usa os diplomas nos documentos',
    !/a Sofia organiza e usa nos documentos/.test(card));
  t('e diz onde os arquivos ficam', /Ficam guardados neste navegador/.test(html));
  t('a lista vazia não anuncia vazio (regra de empty state)',
    !/nenhum certificado|nenhum diploma/i.test(html));

  fim('Diplomas ficam guardados');
})();
