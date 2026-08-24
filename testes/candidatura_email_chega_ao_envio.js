// GUARD — o endereço da candidatura tem de CHEGAR ao envio, não só ser gravado.
//
// Por que este teste existe. 24/ago/2026 (S52). Marcos: "a candidatura por email do card
// parou de funcionar". O guard irmão `candidatura_direta_nao_desaparece.js` estava VERDE —
// suas seis seções cobrem a GRAVAÇÃO dos campos, e nenhuma cobre o CONSUMO. O produto podia
// quebrar inteiro sem uma linha vermelha.
//
// A causa, medida no D1 e não lida no código: a última candidatura que de fato saiu (FGV,
// 21/jul/2026) tinha `canalDiretoDestino = 'alexandre.pereira@fgv.br'` e `emailDest`
// **undefined**. Isso só é possível pela tela Analisar CV, que caía para `canalDiretoDestino`.
// O caminho do CARD lia apenas `saved.emailDest||''` — abria o modal com o campo vazio e
// morria em "Preencha o email do recrutador". Daí o "do card" na frase dele.
//
// A doença de fundo: `emailDest` era um ESPELHO. Três gravadores diferentes o preenchiam, os
// três sob `if(!alvo.emailDest)` e os três só no instante da análise. Quem lia divergia de
// quem lia ao lado. É o mesmo padrão de "N gravadores" que já custou caro na S47 — e a cura
// aqui é a simétrica: um ponto único de LEITURA.
//
// Um segundo defeito compunha o primeiro, e este apagava dado: ao abrir um card cujo endereço
// batia na regra de no-reply, o campo da tela era zerado para exibição — e o "Salvar" gravava
// esse branco por cima da fonte. `candidatarDoModal()` salva e RELÊ no mesmo clique.
const { carregarApp, exec, assert, html } = require('./_lib');
const { t, fim } = assert();

const EXTRAS = [
  'function _ehNoReply(',
  'function destinoCandidatura(',
  'function mvSyncEnvioDireto(',
];

// Botão e campo de mentira, mas de verdade: guardam valor como o DOM guardaria.
function appComPill(vaga, digitado = '') {
  const btn = { textContent: '', dataset: {} };
  const campo = { value: digitado };
  const s = carregarApp(EXTRAS, {
    document: {
      getElementById: id => (id === 'mv-doc-pill-resposta' ? btn : id === 'mv-email-dest' ? campo : null),
    },
    editingVagaId: vaga ? vaga.id : 'new',
    _mvNovoCardAnalise: null,
  });
  if (vaga) s.vagas.push(vaga);
  return { s, btn, campo };
}

console.log('=== o caso do Marcos: análise gravou o destino, mas em canalDiretoDestino ===');
{
  // Exatamente a forma do card FGV medida no D1: canalDireto* preenchido, emailDest ausente.
  const fgv = { id: 1, empresa: 'FGV', cargo: 'Gerente', status: 'lead',
    canalDiretoTipo: 'Email', canalDiretoDestino: 'alexandre.pereira@fgv.br' };
  const { s, btn } = appComPill(fgv);

  exec(s, 'mvSyncEnvioDireto()');
  t('o card entra em modo ENVIO (o pill vira "Enviar candidatura por e-mail")',
    btn.dataset.modoEnvio === '1', btn.textContent);

  const dest = exec(s, 'destinoCandidatura(vagas[0])');
  t('e o endereço CHEGA a quem envia — era aqui que a candidatura morria',
    dest === 'alexandre.pereira@fgv.br', JSON.stringify(dest));
}

console.log('\n=== o pill prometer envio e o destino vir vazio é o bug: os dois andam juntos ===');
{
  // A trava que importa não é "existe destino" nem "existe pill": é a COERÊNCIA entre eles.
  // Prometer "Enviar candidatura por e-mail" e abrir o modal em branco é o defeito relatado.
  const formas = [
    { nome: 'canalDiretoDestino + tipo Email', v: { id: 2, canalDiretoTipo: 'Email', canalDiretoDestino: 'rh@empresa.com' } },
    { nome: 'campo legado canalDiretoEmail', v: { id: 4, canalDiretoEmail: 'rh@empresa.com' } },
    { nome: 'os dois preenchidos e divergentes', v: { id: 5, emailDest: 'rh@empresa.com', canalDiretoTipo: 'Email', canalDiretoDestino: 'outro@empresa.com' } },
  ];
  for (const f of formas) {
    const { s, btn } = appComPill(f.v);
    exec(s, 'mvSyncEnvioDireto()');
    const dest = exec(s, 'destinoCandidatura(vagas[0])');
    t(`${f.nome}: pill em modo envio E destino não-vazio`,
      btn.dataset.modoEnvio === '1' && /@/.test(dest), `pill=${btn.dataset.modoEnvio} dest=${dest}`);
  }
}

console.log('\n=== o card CRIADO À MÃO: era o caso do Marcos, e nunca teve porta ===');
{
  // 24/ago/2026: "estou tentando o card Zonta. Foi um card criado manualmente. ainda não
  // funciona." Não era regressão — o pill era o ÚNICO caminho do card para a candidatura por
  // e-mail, e só abria quando a ANÁLISE tinha detectado `canalDireto*`. Num card feito à mão
  // não há análise: o endereço digitado no campo "Email do recrutador" ficava sem porta.
  const manual = { id: 6, empresa: 'Zonta', cargo: 'Gerente', status: 'lead',
    emailDest: 'rh@zonta.com.br' };   // digitado por ele, sem canalDireto* nenhum
  const { s, btn } = appComPill(manual);
  exec(s, 'mvSyncEnvioDireto()');
  t('card criado à mão com endereço digitado ABRE o envio (era aqui que ele travava)',
    btn.dataset.modoEnvio === '1', btn.textContent);
  t('e o endereço que ele digitou chega a quem envia',
    exec(s, 'destinoCandidatura(vagas[0])') === 'rh@zonta.com.br');
}
{
  // O pill não pode mentir até o "Salvar": enquanto ele digita, o modo já acompanha.
  const { s, btn } = appComPill({ id: 7, empresa: 'Zonta', status: 'lead' }, 'rh@zonta.com.br');
  exec(s, 'mvSyncEnvioDireto()');
  t('endereço ainda só digitado na tela já abre o envio, antes de salvar',
    btn.dataset.modoEnvio === '1', btn.textContent);
}
{
  const { s, btn } = appComPill({ id: 8, empresa: 'Zonta', status: 'lead' }, '');
  exec(s, 'mvSyncEnvioDireto()');
  t('sem endereço nenhum o pill NÃO promete envio', btn.dataset.modoEnvio !== '1', btn.textContent);
}

console.log('\n=== responder quem escreveu ≠ iniciar contato: a distinção não pode se perder ===');
{
  // A pergunta certa não é "a análise detectou?" e sim "existe destino, e fui EU que comecei
  // a conversa?". A marca de que alguém escreveu primeiro é `emailAssunto`/`fonte:email*` —
  // gravados SÓ por quem cria card a partir da caixa de entrada. É o que separa o card do
  // Marcos (ele digitou o destino) do card de um recrutador que escreveu para ele.
  for (const marca of [{ emailAssunto: 'Vaga de Gerente' }, { fonte: 'email' }, { fonte: 'email_alerta' }]) {
    const { s, btn } = appComPill(Object.assign({ id: 9, canal: 'Email', emailDest: 'recrutadora@empresa.com' }, marca));
    exec(s, 'mvSyncEnvioDireto()');
    t(`card nascido de e-mail recebido (${JSON.stringify(marca)}) fica em modo RESPOSTA`,
      btn.dataset.modoEnvio !== '1', btn.textContent);
    t('e o endereço de quem escreveu segue disponível para responder',
      exec(s, 'destinoCandidatura(vagas[0])') === 'recrutadora@empresa.com');
  }
}

console.log('\n=== não se manda currículo para caixa que não lê — e a regra vale para todos ===');
{
  const s = carregarApp(EXTRAS);
  const naoLeem = ['noreply@empresa.com', 'no-reply@vagas.com', 'notifications@portal.com',
    'alerts@portal.com', 'mailer@portal.com', 'bounce@portal.com', 'DoNotReply@Empresa.com'];
  for (const e of naoLeem) {
    const r = exec(s, `destinoCandidatura({emailDest:${JSON.stringify(e)}})`);
    t(`caixa automática recusada como destino: ${e}`, r === '', JSON.stringify(r));
  }
  t('e recusada também quando vem por canalDiretoDestino, não só por emailDest',
    exec(s, `destinoCandidatura({canalDiretoTipo:'Email',canalDiretoDestino:'noreply@x.com'})`) === '');
  t('a caixa automática não bloqueia um endereço real guardado ao lado',
    exec(s, `destinoCandidatura({emailDest:'noreply@x.com',canalDiretoTipo:'Email',canalDiretoDestino:'ana@x.com'})`) === 'ana@x.com');
}

console.log('\n=== canal que não é e-mail nunca vira destino de e-mail ===');
{
  const s = carregarApp(EXTRAS);
  t('WhatsApp não é lido como endereço de e-mail',
    exec(s, `destinoCandidatura({canalDiretoTipo:'WhatsApp',canalDiretoDestino:'+5541999999999'})`) === '');
  t('instrução em texto puro não vira destino',
    exec(s, `destinoCandidatura({canalDiretoTipo:'Email',canalDiretoDestino:'enviar pelo site da empresa'})`) === '');
  t('vaga sem canal nenhum devolve vazio, sem inventar endereço',
    exec(s, `destinoCandidatura({})`) === '' && exec(s, `destinoCandidatura(null)`) === '');
}

console.log('\n=== um leitor só: nenhum caminho de envio volta a ler o espelho cru ===');
{
  // O defeito não foi "faltou um `||`": foi haver leituras divergentes. Se um caminho novo
  // voltar a ler `emailDest` direto para enviar, ele reintroduz o bug inteiro.
  const linhas = html.split('\n');
  const chamadas = linhas
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(o => /abrirModalCandidatura\(\{/.test(o.l));
  t(`existem call sites de abrirModalCandidatura para conferir (${chamadas.length})`, chamadas.length >= 2);
  const cruas = chamadas.filter(o => /emailDest\s*:\s*[a-zA-Z_$][\w$]*\.emailDest/.test(o.l));
  t('nenhum deles passa o espelho cru — todos passam pelo ponto único de leitura',
    cruas.length === 0, cruas.map(o => 'linha ' + o.n).join(', '));

  const iDest = html.indexOf('function destinoCandidatura(');
  const iModal = html.indexOf('function abrirModalCandidatura(');
  t('o ponto único de leitura é declarado antes de quem o consome no modal',
    iDest > 0 && iDest < iModal);
}

console.log('\n=== o campo em branco não apaga mais o endereço guardado ===');
{
  // Abrir o card escondia a caixa automática zerando o campo; o "Salvar" gravava o zero por
  // cima. candidatarDoModal() chama saveVaga() e relê a vaga no MESMO clique — a leitura
  // acontecia depois do apagamento.
  const gravacoes = [...html.matchAll(/emailDest:\([^\n]*mv-email-dest[^\n]*\n?/g)].map(m => m[0]);
  t(`toda gravação de emailDest a partir da tela foi encontrada (${gravacoes.length})`, gravacoes.length >= 2);
  t('e nenhuma delas grava vazio por cima do que já existia',
    gravacoes.every(g => /existing\?\.emailDest/.test(g)),
    gravacoes.filter(g => !/existing\?\.emailDest/.test(g)).join(' | '));

  const soltas = [...html.matchAll(/^\s*emailDest:document\.getElementById\('mv-email-dest'\)\??\.value[^\n]*$/gm)];
  t('não sobrou nenhuma gravação direta do campo, sem rede',
    soltas.length === 0, soltas.map(m => m[0].trim()).join(' | '));
}

console.log('\n=== clique morto: montar o PDF não pode escapar sem uma palavra na tela ===');
{
  // O anexo era montado FORA do try. Se _pdfExecBase64() lançasse, a exceção saía da função
  // com o botão ainda escrito "Enviar pelo Outlook": nada acontecia e nada era dito.
  const i = html.indexOf('async function enviarCandidaturaOutlook(');
  const fn = html.slice(i, html.indexOf('\nfunction irParaInativos(', i));
  t('a rotina de envio foi encontrada', i > 0 && fn.length > 0);
  t('a montagem do anexo está protegida (não escapa da função em silêncio)',
    fn.indexOf('try{') < fn.indexOf('_pdfExecBase64()'));
  t('e o contexto do PDF é restaurado mesmo se a geração falhar',
    /finally \{ _restaurar\(\); \}/.test(fn));
  t('falhar ao montar o PDF devolve o botão ao estado clicável, com pergunta explícita',
    /Não consegui montar o PDF/.test(fn) && /btn\.textContent='Enviar pelo Outlook';btn\.disabled=false;return;/.test(fn));
}

console.log('\n=== nada disto depende de nome de portal (crivo de universalidade) ===');
{
  const i = html.indexOf('function _ehNoReply(');
  const bloco = html.slice(i, html.indexOf('function abrirModalCandidatura(', i));
  t('o ponto único de leitura não cita nenhum serviço, país ou pessoa',
    !/linkedin|gupy|catho|indeed|infojobs|adzuna|Marcos|Curitiba/i.test(bloco), bloco.slice(0, 0));
}

fim('candidatura_email_chega_ao_envio');
