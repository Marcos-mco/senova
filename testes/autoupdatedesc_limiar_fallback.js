// GUARD — autoUpdateDesc (background.js) tinha dois problemas achados pelo senova-auditor
// (item 7/7): (1) usava limiar PRÓPRIO (<100 caracteres) diferente do limiar do app,
// __senovaAtualizarDesc (<=120) — uma descrição entre 100 e 120 chars passava aqui e depois
// era rejeitada lá, silenciosamente, sem cair em nenhum fallback; (2) quando o Senova estava
// aberto, chamava executeScript e IGNORAVA o retorno — se __senovaAtualizarDesc devolvesse false
// (ex.: card não achado, como um lead criado por digest de e-mail cuja URL não bate com a da
// página atual), a descrição simplesmente desaparecia, mesmo havendo o fallback salvarVaga logo
// abaixo para o caso "app fechado". Achado e corrigido pelo Bruno, S47, item 7/7.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function extraiPorProximaFuncao(src, assinatura) {
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei: ' + assinatura);
  const prox = src.slice(i + 1).search(/\n(async )?function /);
  return src.slice(i, prox < 0 ? undefined : i + 1 + prox);
}

let ok = 0, fail = 0;
const t = (n, c, d) => { if (c) { ok++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (d ? '  → ' + d : '')); } };

(async () => {

const bg = fs.readFileSync(path.join(__dirname, '..', 'senova-extension', 'background.js'), 'utf8');

console.log('=== estático: o limiar de autoUpdateDesc é o MESMO do app (>120) ===');
{
  const corpo = extraiPorProximaFuncao(bg, 'async function autoUpdateDesc(');
  t('não usa mais o limiar antigo de 100', !/descricao\.length\s*<\s*100/.test(corpo));
  t('usa <=120, igual a __senovaAtualizarDesc', /descricao\.length\s*<=\s*120/.test(corpo));
}

console.log('\n=== estático: a chamada ao app agora checa o retorno de __senovaAtualizarDesc ===');
{
  const corpo = extraiPorProximaFuncao(bg, 'async function autoUpdateDesc(');
  t('captura o retorno do executeScript (out)', /const out = await chrome\.scripting\.executeScript/.test(corpo));
  t('lê out[0].result === true, como _enriquecerUma já fazia', /out && out\[0\] && out\[0\]\.result === true/.test(corpo));
  t('quando não atualizou, cai no fallback salvarVaga (não descarta o dado)', /if \(!updated\) \{[\s\S]{0,200}salvarVaga\(/.test(corpo));
}

console.log('\n=== comportamental: descrição de 121 chars passa; 120 não passa (limiar exato) ===');
{
  function montarSandbox() {
    const calls = { executeScript: [], salvarVaga: [] };
    const sandbox = {
      console,
      APP_URL: 'https://marcos-mco.github.io/senova',
      chrome: {
        tabs: {
          query: async () => [{ id: 1, url: 'https://marcos-mco.github.io/senova/', windowId: 10 }],
          update: async () => {},
        },
        scripting: { executeScript: async (opts) => { calls.executeScript.push(opts); return calls._execResult; } },
        windows: { get: async () => ({ type: 'normal' }), update: async () => {} },
      },
      salvarVaga: async (payload) => { calls.salvarVaga.push(payload); },
      calls,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    return sandbox;
  }

  const corpo = extraiPorProximaFuncao(bg, 'async function autoUpdateDesc(');

  const sb1 = montarSandbox();
  vm.runInContext(corpo + ';', sb1);
  await vm.runInContext('autoUpdateDesc({url:"https://x.com/1", descricao:"d".repeat(120), local:"", salario:"", modalidade:"", jornada:""}, null)', sb1);
  t('120 chars exatos: NÃO chega a chamar o app', sb1.calls.executeScript.length === 0, 'chamadas=' + sb1.calls.executeScript.length);

  const sb2 = montarSandbox();
  sb2.calls._execResult = [{ result: true }];
  vm.runInContext(corpo + ';', sb2);
  await vm.runInContext('autoUpdateDesc({url:"https://x.com/1", descricao:"d".repeat(121), local:"", salario:"", modalidade:"", jornada:""}, null)', sb2);
  t('121 chars: chama o app', sb2.calls.executeScript.length === 1);
  t('121 chars + app atualizou: NÃO duplica via salvarVaga', sb2.calls.salvarVaga.length === 0);
}

console.log('\n=== comportamental: app aberto mas não achou o card → cai no fallback salvarVaga ===');
{
  function montarSandbox(execResult) {
    const calls = { executeScript: [], salvarVaga: [] };
    const sandbox = {
      console,
      APP_URL: 'https://marcos-mco.github.io/senova',
      chrome: {
        tabs: {
          query: async () => [{ id: 1, url: 'https://marcos-mco.github.io/senova/', windowId: 10 }],
          update: async () => {},
        },
        scripting: { executeScript: async (opts) => { calls.executeScript.push(opts); return execResult; } },
        windows: { get: async () => ({ type: 'normal' }), update: async () => {} },
      },
      salvarVaga: async (payload) => { calls.salvarVaga.push(payload); },
      calls,
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    return sandbox;
  }

  const corpo = extraiPorProximaFuncao(bg, 'async function autoUpdateDesc(');
  const sb = montarSandbox([{ result: false }]); // __senovaAtualizarDesc não achou o card
  vm.runInContext(corpo + ';', sb);
  await vm.runInContext(
    'autoUpdateDesc({url:"https://y.com/1", descricao:"d".repeat(300), empresa:"Acme", cargo:"CEO", local:"SP", salario:"R$ 1", modalidade:"Remoto", jornada:"Integral"}, null)',
    sb
  );
  t('chamou o app (senovaTab existe)', sb.calls.executeScript.length === 1);
  t('app não achou o card → caiu no fallback salvarVaga (dado não se perde)', sb.calls.salvarVaga.length === 1, JSON.stringify(sb.calls.salvarVaga));
  const p = sb.calls.salvarVaga[0] || {};
  t('o fallback leva os mesmos campos de meta', p.local === 'SP' && p.salario === 'R$ 1' && p.modalidade === 'Remoto' && p.jornada === 'Integral');
}

console.log('\n──────────────────────────────');
console.log(fail === 0 ? `AUTOUPDATEDESC · LIMIAR ÚNICO + RETORNO CHECADO: ${ok}/${ok} ✓` : `${ok} passaram · ${fail} FALHARAM`);
if (fail) process.exit(1);

})();
