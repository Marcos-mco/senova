// GUARD — a pegadinha de candidatura direta (e-mail/WhatsApp/telefone/instrução) não pode
// desaparecer de novo numa esteira nova.
//
// Por que este teste existe. Em 17/ago/2026 Marcos abriu um card "Ótima oportunidade —
// 78/100" cuja descrição dizia, sem rodeio: "Enviar currículo... para o e-mail:
// contato@davirh.com.br" — e o app não alertou. A causa raiz (auditada com senova-auditor)
// não foi um `if` quebrado: foi arquitetura. O Worker sempre devolveu
// candidatura_direta_canal/destino/instrucao no JSON de análise, mas cada nova esteira de
// pontuação criada depois da S25 (lote automático, importação do radar) tinha sua própria
// lista de campos copiados do retorno — e nenhuma delas herdou os três campos da pegadinha.
// "Consertar o card de hoje" não fecha o problema: um sexto gravador nasce amanhã do mesmo
// jeito. Por isso este teste não olha um lugar só — ele exercita TODOS os pontos que hoje
// leem a resposta do Worker e escrevem um card, e falha se qualquer um deles ficar mudo.
const fs = require('fs');
const path = require('path');
const { carregarApp, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

const CANAL = 'Email', DESTINO = 'contato@davirh.com.br', INSTRUCAO = 'mencione a vaga 42';

// ── 1. A esteira automática em lote (a que hoje pontua quase tudo) ─────────────
console.log('=== analisarLoteBackground grava a pegadinha na vaga real ===');
{
  const app = carregarApp(['async function analisarLoteBackground('], {
    vagas: [{ id: 'v1', cargo: 'Gerente', empresa: 'Davi e Associados', descricao: 'descrição de teste com tamanho suficiente para ser elegível' }],
    WORKER_URL: 'https://worker.teste',
    fetch: () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
        candidatura_direta_canal: CANAL, candidatura_direta_destino: DESTINO, candidatura_direta_instrucao: INSTRUCAO,
      }),
    }),
    // Dependências que não são o objeto do teste — moldadas para não desviar do caminho.
    _elegivelParaAnalise: () => true,
    _criterioParaVaga: () => 999,      // score 78 < 999: não promove, cai no ramo "abaixo do critério"
    _temTrabalhoReal: () => true,      // ...e esse ramo exige !_temTrabalhoReal — true aqui pula o setStatus
    _gravarNotasNoRadar: () => Promise.resolve(),
    RUBRICA_V: 3, ctxTextoAtivos: () => '', _cacheQuenteAte: 0, _loteEmAnalise: new Set(),
  });

  return exec(app, 'analisarLoteBackground()').then(() => {
    const v = app.vagas[0];
    t('canal foi gravado', v.canalDiretoTipo === CANAL, v.canalDiretoTipo);
    t('destino foi gravado', v.canalDiretoDestino === DESTINO, v.canalDiretoDestino);
    t('instrução foi gravada', v.canalDiretoInstrucao === INSTRUCAO, v.canalDiretoInstrucao);
    t('e-mail direto vira sugestão de envio (emailDest)', v.emailDest === DESTINO, v.emailDest);
    resto();
  });
}

function resto() {

// ── 2. "Analisar de novo" dentro do card (caminho manual, o que Marcos confirmou ao vivo) ──
console.log('\n=== mvReanalisarCompat grava a pegadinha na vaga real ===');
{
  const app = carregarApp(['async function mvReanalisarCompat('], {
    vagas: [{ id: 'v1', cargo: 'Gerente', empresa: 'Davi e Associados', rubricaV: 3, atsScore: '75' }],
    editingVagaId: 'v1',
    CV_DESC_MINIMA: 10,
    WORKER_URL: 'https://worker.teste',
    document: { getElementById: id => id === 'mv-job-desc' ? { value: 'descrição de teste com tamanho suficiente' } : null },
    ctxTextoAtivos: () => '', RUBRICA_V: 3,
    fetch: () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        score: 78, classificacao: 'candidatar', resumo: 'resumo', pontos_fortes: [], pontos_atencao: [],
        candidatura_direta_canal: CANAL, candidatura_direta_destino: DESTINO, candidatura_direta_instrucao: INSTRUCAO,
      }),
    }),
    mvUpdateScoreDisplay() {},
  });

  return exec(app, 'mvReanalisarCompat()').then(() => {
    const v = app.vagas[0];
    t('canal foi gravado', v.canalDiretoTipo === CANAL, v.canalDiretoTipo);
    t('destino foi gravado', v.canalDiretoDestino === DESTINO, v.canalDiretoDestino);
    t('instrução foi gravada', v.canalDiretoInstrucao === INSTRUCAO, v.canalDiretoInstrucao);
    resto2();
  });
}

function resto2() {

// ── 3. O card montado pela importação do radar carrega o que a análise achou ───────
console.log('\n=== _montarCardVarredura não descarta a pegadinha ao virar card ===');
{
  const app = carregarApp(['function _montarCardVarredura(']);
  const card = exec(app, `_montarCardVarredura(${JSON.stringify({
    id: 'v2', empresa: 'Davi e Associados', titulo: 'Gerente', fonte: 'varredura',
    score: 78, classificacao: 'candidatar', resumo: 'r', pontos_fortes: [], pontos_atencao: [],
    canalDiretoTipo: CANAL, canalDiretoDestino: DESTINO, canalDiretoInstrucao: INSTRUCAO,
  })}, ${Date.now()})`);
  t('canal chegou ao card', card.canalDiretoTipo === CANAL, card.canalDiretoTipo);
  t('destino chegou ao card', card.canalDiretoDestino === DESTINO, card.canalDiretoDestino);
  t('instrução chegou ao card', card.canalDiretoInstrucao === INSTRUCAO, card.canalDiretoInstrucao);
  t('e-mail direto vira sugestão de envio (emailDest)', card.emailDest === DESTINO, card.emailDest);
}

// ── 4. Dentro da importação, o resultado da IA carrega os 3 campos até o card ──────
// analisarUma vive DENTRO de importarVagasLead (fecha sobre `lead`/`btn`/`analisadas`) —
// extrair por balanceamento de chaves quebraria por variável de fora do escopo. Aqui a
// prova é textual: se a linha que remonta o objeto parar de citar os 3 campos, falha.
console.log('\n=== a importação do radar não perde os 3 campos ao remontar o resultado ===');
t('o mapeamento de analisarUma inclui canalDiretoTipo/Destino/Instrucao a partir de analise.candidatura_direta_*',
  html.includes('canalDiretoTipo:analise.candidatura_direta_canal') &&
  html.includes('canalDiretoDestino:analise.candidatura_direta_destino') &&
  html.includes('canalDiretoInstrucao:analise.candidatura_direta_instrucao'));

// ── 5. O round-trip com o KV do radar não apaga a marca ao devolver a nota ─────────
// _gravarNotasNoRadar existe pra evitar pagar de novo a análise a cada rodada — mas se ele
// não manda os 3 campos ao Worker, a próxima leitura "reaproveitada" (index.html, ramo
// `_reaproveitada`) volta muda mesmo com o resto do fix no lugar.
console.log('\n=== _gravarNotasNoRadar manda os 3 campos ao Worker ===');
t('o corpo enviado a /api/vagas-lead/score inclui canalDiretoTipo/Destino/Instrucao',
  /canalDiretoTipo:\s*v\.canalDiretoTipo/.test(html) &&
  /canalDiretoDestino:\s*v\.canalDiretoDestino/.test(html) &&
  /canalDiretoInstrucao:\s*v\.canalDiretoInstrucao/.test(html));

// ── 6. O Worker persiste os 3 campos no KV, não só recebe ──────────────────────────
console.log('\n=== o Worker grava canalDireto* no KV do radar, não só os campos antigos ===');
{
  const worker = fs.readFileSync(path.join(__dirname, '..', 'senova-worker.js'), 'utf8');
  const rota = worker.slice(worker.indexOf("'/api/vagas-lead/score'"), worker.indexOf("'/api/vagas-lead/score'") + 1200);
  t('a rota /api/vagas-lead/score desestrutura os 3 campos do corpo recebido',
    /canalDiretoTipo/.test(rota) && /canalDiretoDestino/.test(rota) && /canalDiretoInstrucao/.test(rota));
  t('e regrava o item do KV com os 3 campos (não só score/classificação/resumo)',
    /vagasKV\[idx\]\s*=\s*\{[^}]*canalDiretoTipo/.test(rota));
}

fim('CANDIDATURA DIRETA · A PEGADINHA NÃO SOME NUMA ESTEIRA NOVA');
}
}
