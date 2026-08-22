// O BACKUP TEM QUE COBRIR O DADO QUE SÓ EXISTE NUM LUGAR.
//
// O defeito (22/ago/2026): desde a S49 os diplomas são guardados de verdade — no IndexedDB, o
// único lugar do app que a exportação de dados não varre (ela lê o localStorage). Resultado:
// "Exportar dados" produzia um arquivo com cara de completo, sem os únicos documentos que não
// existem em nenhum outro lugar do mundo. Limpar o navegador perdia os diplomas para sempre.
//
// É a rede de segurança mentindo que está inteira — a mesma falha que o arquivo morto já tinha
// tido quando mudou de casa (ver o comentário de _exportarDadosAgora no index.html).
//
// Este teste guarda quatro coisas:
//   1. existe um caminho de saída para os documentos, e o pacote é um .zip DE VERDADE
//      (validado pelo `unzip` do sistema, não pela minha própria leitura);
//   2. o documento sai do outro lado byte a byte igual ao que entrou;
//   3. o backup principal NÃO se anuncia completo: lista os documentos e diz onde baixá-los;
//   4. o documento pessoal continua sem subir: nada aqui toca o Worker, o KV ou a IA.
const { carregarApp, exec, assert, html } = require('./_lib');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { t, fim } = assert();

// IndexedDB de mentira, mas de verdade — mesmo banco falso de diplomas_ficam_guardados.js.
function bancoFalso(){
  const lojas={};
  const tarefa=(fn)=>{ const r={}; setTimeout(()=>{ try{ r.result=fn(); r.onsuccess&&r.onsuccess(); }catch(e){ r.error=e; r.onerror&&r.onerror(); } },0); return r; };
  return {
    _lojas:lojas, _quebrado:false,
    open(nome){
      const req={};
      setTimeout(()=>{
        if(this._quebrado){ req.error=new Error('cofre indisponível'); req.onerror&&req.onerror(); return; }
        const novo=!lojas[nome];
        if(novo) lojas[nome]={};
        req.result={
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
          createObjectStore(l){ lojas[nome][l]={}; return {}; },
        };
        if(novo){ req.onupgradeneeded&&req.onupgradeneeded(); }
        req.onsuccess&&req.onsuccess();
      },0);
      return req;
    },
  };
}

// Blob de mentira que guarda os bytes: é deles que sai o arquivo .zip escrito no disco e
// entregue ao `unzip` de verdade. Concatena elemento a elemento de propósito — os Uint8Array
// nascem dentro do sandbox, num realm diferente do Node.
class BlobFalso{
  constructor(partes,opts){ this._partes=partes||[]; this.type=(opts||{}).type||''; }
  bytes(){ return Buffer.concat(this._partes.map(p=>typeof p==='string'?Buffer.from(p,'utf8'):Buffer.from(Array.from(p)))); }
}

const idb=bancoFalso();
const baixados=[];                       // o que o "download" produziu
const toasts=[];
const memoria={};                        // localStorage de verdade, com length/key
const armazem={
  getItem:k=>(k in memoria?memoria[k]:null),
  setItem:(k,v)=>{ memoria[k]=String(v); },
  removeItem:k=>{ delete memoria[k]; },
  get length(){ return Object.keys(memoria).length; },
  key:i=>Object.keys(memoria)[i],
};

const s = carregarApp([
  'const Diplomas={',
  'function _crc32(',
  'function _zipNome(',
  'function _zipStore(',
  'async function baixarDocumentos(',
  'async function _documentosManifesto(',
  'function _naoExportar(',
  'async function _exportarDadosAgora(',
], {
  indexedDB: idb,
  setTimeout: (fn,ms)=>setTimeout(fn,ms||0),
  showToast: (m)=>toasts.push(m),
  localStorage: armazem,
  TextEncoder, Blob: BlobFalso,
  URL: { createObjectURL:(b)=>{ baixados.push({blob:b}); return 'blob:x'+baixados.length; }, revokeObjectURL:()=>{} },
  document: { getElementById:()=>null, createElement:()=>({ set download(n){ baixados[baixados.length-1].nome=n; }, get download(){ return baixados[baixados.length-1].nome; }, click(){} }) },
  Store: { CHAVE:'senova_vagas_v2', CHAVE_ARQUIVADAS:'senova_vagas_frio', _frioNoBanco:false, _frioNaNuvem:false, _frio:null },
  vagas: [],
});

const pasta=fs.mkdtempSync(path.join(os.tmpdir(),'senova-zip-'));
const bytesDoTexto=(txt)=>{ const b=Buffer.from(txt,'utf8'); return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength); };
const espera=()=>new Promise(r=>setTimeout(r,30));

// Dois documentos com o MESMO nome de arquivo: é o caso que faria um sumir dentro do pacote.
const CONTEUDO_EVORA='%PDF-1.4 diploma de Evora — acentuação, ç, e bytes\x00\x01\x02 binários';
const CONTEUDO_FGV='%PDF-1.4 MBA FGV';
const guardar=(id,nome,tipo,txt,quando)=>exec(s,'(it)=>Diplomas.guardar(it)')({
  id, nome, tipo, bytes:Buffer.byteLength(txt,'utf8'), entrou:quando,
  arquivo:{ arrayBuffer: async()=>bytesDoTexto(txt) },
});

(async ()=>{
  await guardar('d1','diploma.pdf','application/pdf',CONTEUDO_EVORA,Date.UTC(2026,4,10,12,0,0));
  await guardar('d2','diploma.pdf','application/pdf',CONTEUDO_FGV,Date.UTC(2026,4,11,12,0,0));
  await espera();

  console.log('=== existe um caminho de saída para os documentos ===');
  await exec(s,'baixarDocumentos')();
  await espera();
  t('a cópia dos documentos foi gerada', baixados.length===1, String(baixados.length));
  const pacote=baixados[0];
  t('sai como pacote .zip', /\.zip$/.test(pacote.nome||''), String(pacote.nome));
  t('o nome do arquivo já diz que é documento pessoal', /documentos_pessoais/.test(pacote.nome||''), String(pacote.nome));
  t('e o Senova diz quantos documentos foram', toasts.some(m=>/2 documentos/.test(m)), toasts.join(' | '));

  console.log('\n=== é um .zip de verdade: quem valida é o unzip do sistema ===');
  const arq=path.join(pasta,'copia.zip');
  fs.writeFileSync(arq,pacote.blob.bytes());
  let integro=false, saida='';
  try{ saida=execFileSync('unzip',['-t',arq],{encoding:'utf8'}); integro=/No errors detected/.test(saida); }
  catch(e){ saida=String((e.stdout||'')+(e.stderr||e.message)); }
  t('o unzip abre o pacote e não acha erro de CRC', integro, saida.trim().split('\n').slice(-2).join(' '));

  const dentro=execFileSync('unzip',['-Z1',arq],{encoding:'utf8'}).trim().split('\n');
  t('os dois documentos estão lá dentro, nenhum sobrescreveu o outro', dentro.filter(n=>/\.pdf$/.test(n)).length===2, dentro.join(' | '));
  t('o segundo foi renomeado, não perdido', dentro.some(n=>/diploma \(2\)\.pdf/.test(n)), dentro.join(' | '));
  t('o pacote se explica sozinho, para quem abrir sem o Senova', dentro.includes('LEIA-ME.txt'), dentro.join(' | '));

  console.log('\n=== o documento sai do outro lado igual ao que entrou ===');
  const volta=execFileSync('unzip',['-p',arq,'diploma.pdf'],{encoding:'buffer'});
  t('o conteúdo do diploma volta byte a byte', Buffer.compare(volta,Buffer.from(CONTEUDO_EVORA,'utf8'))===0, volta.length+' bytes');
  const leiaMe=execFileSync('unzip',['-p',arq,'LEIA-ME.txt'],{encoding:'utf8'});
  t('o LEIA-ME diz como restaurar', /Certificados/.test(leiaMe) && /adicione estes arquivos/.test(leiaMe));
  t('e avisa que é documento pessoal', /documentos pessoais/i.test(leiaMe));

  console.log('\n=== o backup principal para de se anunciar completo ===');
  armazem.setItem('senova_dados_sensiveis','{"cpf":"000"}');
  armazem.setItem('senova_app_key','SEGREDO');
  await exec(s,'_exportarDadosAgora')();
  await espera();
  t('o backup saiu', baixados.length===2, String(baixados.length));
  const backup=JSON.parse(baixados[1].blob.bytes().toString('utf8'));
  t('os diplomas estão listados no arquivo', (backup.documentos||[]).length===2, JSON.stringify(backup.documentos||[]));
  t('com nome e tamanho, para conferir o que falta', backup.documentos.every(d=>d.nome&&d.bytes>0));
  t('mas SEM os bytes do documento dentro do JSON', !backup.documentos.some(d=>'arquivo' in d));
  t('e o arquivo diz, por escrito, que os documentos não vêm nele', /NÃO estão dentro deste arquivo/.test(backup.documentos_nota||''), String(backup.documentos_nota));
  t('e diz onde baixá-los', /Baixar meus documentos/.test(backup.documentos_nota||''));
  t('a cópia avisa que carrega dado pessoal (CPF)', /CPF/.test(backup.nota||''), String(backup.nota));
  t('a chave de acesso continua fora da cópia', !JSON.stringify(backup.dados).includes('SEGREDO'));
  t('o cofre sensível continua dentro, que é trabalho dela', !!backup.dados.senova_dados_sensiveis);

  console.log('\n=== se o cofre não puder ser lido, a cópia sai assim mesmo, dizendo que não sabe ===');
  idb._quebrado=true;
  await exec(s,'_exportarDadosAgora')();
  await espera();
  t('o backup principal não fica refém do cofre', baixados.length===3, String(baixados.length));
  const cego=JSON.parse(baixados[2].blob.bytes().toString('utf8'));
  t('e admite que não conseguiu ler os documentos', /não sei dizer o que há lá dentro/.test(cego.documentos_nota||''), String(cego.documentos_nota));
  idb._quebrado=false;

  console.log('\n=== documento pessoal continua sem subir: vai do navegador para o disco ===');
  const fonte=html.slice(html.indexOf('// ── A CÓPIA DOS DOCUMENTOS'), html.indexOf('function salvarDiasInativo('));
  t('nada no bloco da cópia chama o Worker', !/WORKER_URL|fetch\(/.test(fonte));
  t('nada é mandado ao KV nem à IA', !/api\/perfil|api\/claude/.test(fonte));

  fs.rmSync(pasta,{recursive:true,force:true});
  fim('Backup leva os diplomas');
})();
