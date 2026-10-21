// O copiloto preenche o formulário INTEIRO — inclusive o que está recolhido, e o CV.
//
// Por que existe (21/out/2026): numa candidatura com seções em acordeão, o copiloto preencheu só
// a primeira seção, não achou a vaga (a página do formulário é anônima: sem título, sem JobPosting,
// código de vaga diferente do anúncio) e não anexou o CV que já existia no card. Marcos: "Não há
// motivos para não preencher tudo."
const fs = require('fs'), vm = require('vm'), path = require('path');
const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8').replace(/\r\n/g, '\n');
const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8').replace(/\r\n/g, '\n');
function extrai(src, a) { const i = src.indexOf(a); if (i < 0) throw new Error('nao achei: ' + a); const ab = src.indexOf('{', i); let d = 0, j = ab; for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); }
let ok = 0, total = 0;
function t(nome, cond, extra) { total++; if (cond) ok++; console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}${!cond && extra ? ' — ' + extra : ''}`); }

(async () => {
  console.log('=== seções recolhidas abrem antes de ler os campos ===');
  const pre = extrai(ct, 'async function _preencher(');
  t('existe _abrirSecoesRecolhidas', /async function _abrirSecoesRecolhidas\(\)/.test(ct));
  t('_preencher abre as seções ANTES de coletar', pre.indexOf('_abrirSecoesRecolhidas()') > -1 && pre.indexOf('_abrirSecoesRecolhidas()') < pre.indexOf('_coletarCampos()'));
  const abrir = extrai(ct, 'async function _abrirSecoesRecolhidas(');
  t('só abre o que tem campo dentro (não sai clicando em menu)', /temCampo\(t\)/.test(abrir) && /nav,header,footer/.test(abrir));

  console.log('\n=== cargo e empresa vêm do JobPosting, não do banner <h1> ===');
  {
    const ld = { '@type': 'JobPosting', title: 'Gerente Comercial', hiringOrganization: { '@type': 'Organization', name: 'Pabum RH' },
      description: '<p>Responsável pela <b>estratégia</b></p><ul><li>Metas</li><li>Equipe</li></ul>' };
    const sb = { document: { querySelectorAll: () => [{ textContent: JSON.stringify(ld) }] }, _decodeEntidades: s => s, String, JSON, Array };
    vm.createContext(sb);
    vm.runInContext(extrai(ct, 'function _vagaDoJsonLd(') + ';this.f=_vagaDoJsonLd;', sb);
    const r = sb.f();
    t('cargo do JobPosting', r && r.cargo === 'Gerente Comercial', JSON.stringify(r));
    t('empresa = quem contrata (hiringOrganization), não quem hospeda a página', r && r.empresa === 'Pabum RH');
    t('descrição sem HTML', r && /estratégia/.test(r.descricao) && !/</.test(r.descricao), r && r.descricao);
    const g = extrai(ct, 'function extractGenerico(');
    t('o genérico usa o JobPosting primeiro', /\(ld && ld\.cargo\) \|\|/.test(g) && /\(ld && ld\.empresa\) \|\|/.test(g));
  }

  console.log('\n=== formulário anônimo herda a vaga vista no mesmo site ===');
  {
    const g = extrai(ct, 'function extractGenerico(');
    t('herda só se houver formulário de candidatura', /_vagaVistaAqui && _acharContainerCandidatura\(\)/.test(g));
    t('a chave é o site (host), nunca nome de serviço', /mapa\[host\] =/.test(ct));
    t('validade curta', /_VISTA_VALIDADE = 2 \* 3600 \* 1000/.test(ct));
    t('a página do anúncio se registra ao carregar (só com JobPosting)', /if \(_vagaDoJsonLd\(\)\) _lembrarVagaVista\(extract\(\)\)/.test(ct));
  }

  console.log('\n=== o campo do CV: um vencedor só, entre foto, laudo e "importar dados" ===');
  {
    // Os quatro campos de arquivo reais do formulário de 21/out, com o texto em volta de cada um.
    const campo = (id, accept, perto) => ({ id, name: '', disabled: false, labels: [], files: [],
      getAttribute: k => (k === 'accept' ? accept : null),
      parentElement: { innerText: perto, parentElement: null } });
    const CAMPOS = [
      campo('CropitInputFile', '.png, .jpg, .jpeg, .bmp, .gif', '× Salvar'),
      campo('CvInputFile', '.doc,.docx,.pdf,.txt', 'De um arquivo Importar dados'),
      campo('fileIncludeReport', '.doc, .docx, .pdf, .png, .jpg', '+ Anexar Laudo (.pdf, .docx) Tamanho máximo: 5 MB Laudo'),
      campo('fileIncludeCV', '.doc, .docx, .pdf', 'CV em anexo arquivo.pdf Eliminar Arquivo'),
    ];
    const mk = lista => {
      const sb = { document: { querySelectorAll: () => lista }, _daExtensao: () => false };
      vm.createContext(sb);
      vm.runInContext([ct.match(/const _RE_CV_ARQ = .*;/)[0], ct.match(/const _RE_NAO_CV = .*;/)[0],
        extrai(ct, 'function _textoPerto('), extrai(ct, 'function _aceitaPdf('), extrai(ct, 'function _acharInputCV(')].join('\n') + ';this.f=_acharInputCV;', sb);
      return sb.f();
    };
    const a = mk(CAMPOS);
    t('escolhe "CV em anexo"', a && a.id === 'fileIncludeCV', a && a.id);
    t('dois candidatos empatados → não escolhe nenhum', mk([CAMPOS[3], campo('outro', '.pdf', 'Currículo')]) === null);
    t('campo que só aceita imagem nunca é o do CV', mk([campo('x', 'image/*', 'Currículo')]) === null);
  }

  console.log('\n=== o CV é anexado e conferido; preencher nunca gera CV ===');
  {
    const an = extrai(ct, 'async function _anexarCV(');
    t('pede o CV no modo anexar', /anexar: true/.test(an));
    t('coloca o arquivo no campo e avisa a página', /inp\.files = dt\.files/.test(an) && /'change', \{ bubbles: true \}/.test(an));
    t('confere se o arquivo ficou', /const viu =/.test(an));
    t('_preencher anexa o CV (passo 5)', /_cvAnexo = await _anexarCV\(inpCV\)/.test(pre));

    // background: no modo anexar devolve o arquivo; não baixa, não cria card, não chama IA.
    const chamadas = [];
    const sb = {
      Promise, setTimeout,
      _abaSenova: async () => ({ id: 1 }),
      _fetchWorker: async () => { chamadas.push('worker'); return { ok: false }; },
      WORKER: 'x',
      chrome: {
        downloads: { download: async () => { chamadas.push('download'); } },
        scripting: { executeScript: async ({ args }) => { chamadas.push('app'); return [{ result: sb._resp }]; } },
      },
    };
    vm.createContext(sb);
    vm.runInContext(extrai(bg, 'async function copilotoCV(') + ';this.f=copilotoCV;', sb);
    sb._resp = { ok: true, dataUrl: 'data:application/pdf;base64,AA', filename: 'cv.pdf' };
    const r1 = await sb.f({ cargo: 'c', empresa: 'e' }, 'pdf', true);
    t('CV pronto → devolve o arquivo', r1 && r1.ok && r1.dataUrl && r1.filename === 'cv.pdf');
    t('… sem baixar', !chamadas.includes('download'), chamadas.join(','));
    chamadas.length = 0;
    sb._resp = { ok: false, motivo: 'precisa_gerar', prompt: {} };
    const r2 = await sb.f({ cargo: 'c', empresa: 'e' }, 'pdf', true);
    t('sem CV no card → diz, e NÃO gera (nenhuma IA escondida)', r2 && !r2.ok && !chamadas.includes('worker') && chamadas.length === 1, chamadas.join(','));
    chamadas.length = 0;
    sb._resp = { ok: false, motivo: 'sem_card' };
    await sb.f({ cargo: 'c', empresa: 'e' }, 'pdf', true);
    t('sem card → não cria card', chamadas.length === 1, chamadas.join(','));
  }

  console.log('\n──────────────────────────────');
  console.log(`FORMULÁRIO COMPLETO: ${ok}/${total} ${ok === total ? '✓' : '✗'}`);
  if (ok !== total) process.exit(1);
})();
