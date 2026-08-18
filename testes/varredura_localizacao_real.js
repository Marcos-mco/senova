// GUARD — localização da vaga não pode ser fabricada, nem escrita num campo que o app não lê.
//
// Por que este teste existe. 17/ago/2026 (S47), item 3/7 do senova-auditor. Três esteiras do
// Worker escreviam localização de jeito errado, todas alimentando a MESMA `vagas_lead`:
//   1) POST /api/vagas-lead (extensão) fabricava `local: 'Brasil'` fixo, mesmo sem saber onde
//      a vaga é.
//   2) `montarCard` (Adzuna + Jobicy, a varredura de verdade) tinha a localização REAL vinda da
//      fonte e a jogava fora — escrevia em `local`, e o app (index.html _montarCardVarredura)
//      sempre leu `v.localizacao`. Perdia dado bom por nome de campo errado.
//   3) `alimentarFunilComEmail` (Google Alert) também fabricava `local: 'Brasil'`.
// A correção: nenhuma das três fabrica mais nada, e as três escrevem em `localizacao` — o campo
// que _montarCardVarredura de fato lê.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { assert } = require('./_lib');
const { t, fim } = assert();

const src = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
function extraiFn(assinatura) {
  const i = src.indexOf(assinatura);
  if (i < 0) throw new Error('não achei no senova-worker.js: ' + assinatura);
  const ab = src.indexOf('{', i);
  let d = 0, j = ab;
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) break; } }
  return src.slice(i, j + 1);
}
function extraiConst(nome) {
  const m = src.match(new RegExp('^const ' + nome + ' = [^;\\n]*;', 'm'));
  if (!m) throw new Error('não achei a constante: ' + nome);
  return m[0];
}

(async () => {
  console.log('=== montarCard (Adzuna/Jobicy): localização real vai para o campo que o app lê ===');
  {
    const sandbox = { console, JSON, Array, String, Object, Date, Math };
    vm.createContext(sandbox);
    vm.runInContext([
      extraiFn('function gerarId('), extraiFn('function montarCard('),
    ].join('\n;\n'), sandbox);

    const comLocalReal = vm.runInContext(
      'montarCard(' + JSON.stringify({ titulo: 'Diretor Comercial', empresa: 'Acme', local: 'Curitiba, PR', url: 'https://x.com/1' }) + ', ' + JSON.stringify({ label: 'Brasil' }) + ', "adzuna")',
      sandbox
    );
    t('a localização real da fonte (Adzuna/Jobicy) chega em .localizacao', comLocalReal.localizacao === 'Curitiba, PR', JSON.stringify(comLocalReal));
    t('não sobra mais campo .local (era o que o app nunca lia)', comLocalReal.local === undefined);

    const semLocal = vm.runInContext(
      'montarCard(' + JSON.stringify({ titulo: 'Diretor Comercial', empresa: 'Acme', url: 'https://x.com/2' }) + ', ' + JSON.stringify({ label: 'Brasil' }) + ', "adzuna")',
      sandbox
    );
    t('sem localização da fonte, cai para o rótulo da região da busca (não fica vazio à toa)', semLocal.localizacao === 'Brasil');
  }

  console.log('\n=== alimentarFunilComEmail (Google Alert): não fabrica mais "Brasil" ===');
  {
    const KV = {
      dados: {},
      async get(k) { const v = this.dados[k]; return v ?? null; },
      async put(k, v) { this.dados[k] = v; },
    };
    const sandbox = { console, JSON, Array, String, Object, Date, Math, Set, Promise, env: { SENOVA_KV: KV } };
    vm.createContext(sandbox);
    vm.runInContext([
      extraiConst('TETO_RADAR'), extraiConst('TETO_RADAR_ABSOLUTO'), extraiConst('JANELA_RADAR_DIAS'),
      extraiFn('function gerarId('), extraiFn('function tituloRelevante('),
      extraiFn('function foraDaJanela('), extraiFn('function cortarRadar('),
      extraiFn('async function alimentarFunilComEmail('),
    ].join('\n;\n'), sandbox);

    const emails = [{ vagas_extraidas: [{ titulo: 'Diretor de Marketing Sênior', url: 'https://x.com/vaga-email' }] }];
    const resultado = await vm.runInContext('alimentarFunilComEmail(' + JSON.stringify(emails) + ', env)', sandbox);
    t('extraiu a vaga do e-mail', resultado.novasLead === 1, JSON.stringify(resultado));
    const leadsSalvos = JSON.parse(KV.dados.vagas_lead);
    const nova = leadsSalvos.find(v => v.url === 'https://x.com/vaga-email');
    t('a vaga chegou ao KV', !!nova, JSON.stringify(leadsSalvos));
    t('sem "Brasil" fabricado — não sabemos onde a vaga do alerta é', nova.localizacao === '', JSON.stringify(nova));
    t('escreve no campo que o app lê (.localizacao, não .local)', nova.local === undefined);
  }

  console.log('\n=== POST /api/vagas-lead (extensão): sem fabricação, campos certos no corpo ===');
  t('não hardcoda mais local: \'Brasil\'', !/local:\s*'Brasil'/.test(src));
  t('destrutura localizacao/modelo/regime/jornada/salario do corpo recebido',
    /const \{ titulo, empresa, url, descricao, canal, score, resumo, pontos_fortes, pontos_atencao, forma_candidatura, fonte, localizacao, modelo, regime, jornada, salario \} = body;/.test(src));
  t('grava os 5 campos em novaVaga com o mesmo nome que o app lê',
    /localizacao: localizacao \|\| '', modelo: modelo \|\| '', regime: regime \|\| '', jornada: jornada \|\| '', salario: salario \|\| '',/.test(src));

  console.log('\n=== o nome do campo bate dos dois lados (Worker escreve, app lê) ===');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  t('_montarCardVarredura (index.html) lê v.localizacao — as 3 esteiras acima agora alimentam esse campo',
    /localizacao:v\.localizacao\|\|''/.test(html));

  fim('LOCALIZAÇÃO DA VAGA · sem fabricação, campo certo');
})();
