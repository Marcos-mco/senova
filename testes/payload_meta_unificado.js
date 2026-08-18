// GUARD — local/salario/modalidade/jornada, capturados pelos extratores (item 5/7), morriam antes
// de chegar ao Worker: 3 pontos diferentes montavam o payload de "salvar vaga" à mão — popup.js
// (botão da extensão), content.js (botão flutuante na própria página) e background.js
// (salvarVaga, chamado pelos dois, e de novo sozinho no fallback do enriquecimento em lote) — e
// nenhum dos três copiava esses 4 campos. Era o MESMO padrão "N gravadores" da S47: um campo novo
// (aqui, os 4 que o item 5 passou a extrair) só chega a quem foi tocado por último.
//
// A correção não cria um módulo compartilhado (o repo não tem bundler — CLAUDE.md: "sem build,
// sem bundler"): popup.js e content.js passam adiante o que o extrator já devolve (local/
// salario/modalidade/jornada), e a TRADUÇÃO para o vocabulário do Worker (localizacao/modelo/
// regime/jornada/salario) mora só em background.js:salvarVaga — um lugar só, não três.
// Achado pelo senova-auditor, S47, item 4/7.
const fs = require('fs'), vm = require('vm'), path = require('path');

function extrai(src, assinatura, arquivo) {
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei em ' + arquivo + ': ' + assinatura);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

(async () => {

console.log('=== popup.js: o botão "Salvar" repassa os 4 campos que o extrator devolveu ===');
{
  const popup = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'popup.js'), 'utf8');
  const corpo = extrai(popup, 'async function salvarVaga(', 'popup.js');
  t('local: _dadosVaga.local', /local:\s*_dadosVaga\.local,/.test(corpo));
  t('salario: _dadosVaga.salario', /salario:\s*_dadosVaga\.salario,/.test(corpo));
  t('modalidade: _dadosVaga.modalidade', /modalidade:\s*_dadosVaga\.modalidade,/.test(corpo));
  t('jornada: _dadosVaga.jornada', /jornada:\s*_dadosVaga\.jornada,/.test(corpo));
}

console.log('\n=== content.js: o botão flutuante (FAB) repassa os mesmos 4 campos ===');
{
  const ct = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'content.js'), 'utf8');
  const i = ct.indexOf("snv-fab-salvar').addEventListener('click'");
  if (i < 0) throw new Error('não achei o listener do FAB em content.js');
  const corpo = ct.slice(i, ct.indexOf('});', i) + 3);
  t('local: dados.local', /local:\s*dados\.local,/.test(corpo));
  t('salario: dados.salario', /salario:\s*dados\.salario,/.test(corpo));
  t('modalidade: dados.modalidade', /modalidade:\s*dados\.modalidade,/.test(corpo));
  t('jornada: dados.jornada', /jornada:\s*dados\.jornada,/.test(corpo));
}

console.log('\n=== background.js: autoUpdateDesc (fallback sem app aberto) não descarta os 4 campos ===');
{
  // autoUpdateDesc desestrutura os parâmetros ({ url, descricao, ... }) — o { do parâmetro
  // confundiria o extrator de chaves balanceadas usado nas outras funções deste arquivo, então
  // aqui o corpo é isolado pelo próximo "async function"/"function" do arquivo, não por chaves.
  const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
  const i = bg.indexOf('async function autoUpdateDesc(');
  if (i < 0) throw new Error('não achei autoUpdateDesc em background.js');
  const prox = bg.slice(i + 1).search(/\n(async )?function /);
  const corpo = bg.slice(i, prox < 0 ? undefined : i + 1 + prox);
  const fallback = corpo.slice(corpo.indexOf('} else {'));
  t('o fallback passa local/salario/modalidade/jornada para salvarVaga',
    /salvarVaga\(\{[^}]*\blocal\b[^}]*\bsalario\b[^}]*\bmodalidade\b[^}]*\bjornada\b/.test(fallback), fallback.slice(0, 200));
}

console.log('\n=== background.js: salvarVaga é o ÚNICO lugar que traduz para o vocabulário do Worker ===');
{
  const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');
  const corpo = extrai(bg, 'async function salvarVaga(', 'background.js');
  t('local do extrator vira localizacao do Worker', /localizacao:\s*payload\.local \|\| '',/.test(corpo));
  t('modalidade do extrator vira modelo do Worker', /modelo:\s*payload\.modalidade \|\| '',/.test(corpo));
  t('jornada mantém o nome', /jornada:\s*payload\.jornada \|\| '',/.test(corpo));
  t('salario mantém o nome', /salario:\s*payload\.salario \|\| '',/.test(corpo));

  console.log('\n  --- comportamental: o corpo POSTado de fato traduz os nomes certos ---');
  const sandbox = {
    console, JSON,
    chrome: { tabs: { query: async () => [] } },
    WORKER: 'https://x.invalid',
    captured: {},
  };
  sandbox._fetchWorker = async (url, init) => {
    sandbox.captured.url = url;
    sandbox.captured.body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ ok: true, id: 'novo-1' }) };
  };
  vm.createContext(sandbox);
  vm.runInContext(corpo + ';', sandbox);

  const payload = {
    cargo: 'Diretor Comercial', empresa: 'Acme', origemUrl: 'https://x.com/1', descricao: 'desc',
    canal: 'Gupy', local: 'Curitiba, PR', salario: 'R$ 15000/mês', modalidade: 'Híbrido', jornada: 'Tempo integral',
  };
  await vm.runInContext('salvarVaga(' + JSON.stringify(payload) + ')', sandbox);

  const { url, body } = sandbox.captured;
  t('POSTou para /api/vagas-lead', /\/api\/vagas-lead$/.test(url || ''), url);
  t('localizacao chegou traduzida de payload.local', body.localizacao === 'Curitiba, PR', JSON.stringify(body));
  t('modelo chegou traduzido de payload.modalidade', body.modelo === 'Híbrido', JSON.stringify(body));
  t('jornada chegou sem tradução (mesmo nome)', body.jornada === 'Tempo integral');
  t('salario chegou sem tradução (mesmo nome)', body.salario === 'R$ 15000/mês');
}

console.log(`\n──────────────────────────────\nPAYLOAD DE META UNIFICADO (popup/content/background): ${ok}/${ok + fail} ${fail ? '✗' : '✓'}`);
if (fail) process.exit(1);

})();
