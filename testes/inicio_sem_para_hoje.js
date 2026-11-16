// O Início tem um bloco só: "O que há de novo".
//
// POR QUE ISTO EXISTE (16/nov/2026). Marcos mandou tirar o "Para Hoje" do
// Início. O bloco saiu inteiro — tela, estilo e as duas funções que o montavam
// (`renderHomeAcoes`, `_homeVerMais`) — e "O que há de novo" passou a ocupar a
// largura toda.
//
// Uma remoção deste tamanho tem dois jeitos de dar errado, e nenhum deles
// aparece numa suíte que extrai função por função:
//   1. sobra uma chamada à função que não existe mais — o app compila, e a
//      tela quebra só quando alguém passa por aquele caminho;
//   2. sobra um botão na tela apontando para uma função apagada — o clique
//      não faz nada e ninguém avisa.
// O teste trava as duas, e trava também que o bloco não volte por descuido.

const { html, assert } = require('./_lib');
const { t, fim } = assert();

// ── 1. O bloco saiu, e saiu inteiro ─────────────────────────────────────────
for (const resto of ['renderHomeAcoes', '_homeVerMais', 'home-acoes-list', 'home-acoes-badge',
                     'home-acao-item', 'sh-home-2col', '_abrirAgendaEntrevista']) {
  t(`não sobrou "${resto}" no app`, !html.includes(resto));
}
t('o título "Para Hoje" não aparece mais na tela', !/>\s*Para Hoje\s*</.test(html));

// ── 2. "O que há de novo" continua inteiro ──────────────────────────────────
const iHome = html.indexOf('<div class="sh-home-novo">');
const fHome = html.indexOf('<!-- /sh-home-novo -->');
t('o Início tem o bloco único', iHome > 0 && fHome > iHome);
const bloco = html.slice(iHome, fHome);
t('o bloco único é "O que há de novo"', (bloco.match(/class="sh-head-title"/g) || []).length === 1
  && bloco.includes('>O que há de novo<'));
for (const [id, abre] of [['sinal-oportunidades', 'toggleOportunidades'], ['sinal-retornos', 'toggleRetornos'],
                          ['sinal-alertas', 'toggleAlertasInline'], ['sinal-vagas', 'toggleRevisaoLista'],
                          ['sinal-indicacoes', 'toggleIndicacoesHome']]) {
  t(`a linha ${id} segue no Início`, bloco.includes(`id="${id}"`));
  t(`${abre} existe para abrir a linha`, html.includes(`function ${abre}(`));
}

// ── 3. Nenhum botão da tela aponta para função que não existe ───────────────
// Vale para o app todo, não só para o Início: é a classe de defeito que uma
// remoção deixa para trás.
const definida = nome => new RegExp(
  `function\\s+${nome}\\s*\\(|(?:const|let|var)\\s+${nome}\\s*=|window\\.${nome}\\s*=|\\b${nome}\\s*:\\s*(?:async\\s+)?function`
).test(html);
const nativas = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'alert', 'confirm', 'prompt', 'event',
  'setTimeout', 'clearTimeout', 'encodeURIComponent', 'decodeURIComponent', 'parseInt', 'parseFloat', 'Number',
  'String', 'Boolean', 'Date', 'JSON', 'Math', 'Object', 'Array', 'navigator', 'window', 'document', 'location',
  'history', 'console', 'open', 'print', 'void', 'typeof', 'new', 'this', 'catch', 'requestAnimationFrame',
  'var' /* var(--cor) do CSS dentro de um style inline */]);
// Dívida conhecida, anterior a esta mudança: a janela antiga #modal-revisao nunca é aberta por
// ninguém, e os botões dela chamam uma função que já não existe. Fica listada para que a lista
// só possa encolher — nome novo aqui é defeito novo.
const DIVIDA_ANTIGA = new Set(['fecharRevisao']);
const orfas = new Set();
// Só o HTML estático (antes do <script> do app): ali o atributo é literal.
const estatico = html.slice(0, html.lastIndexOf('<script>'));
for (const m of estatico.matchAll(/\son[a-z]+="([^"]*)"/g)) {
  for (const c of m[1].matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nome = c[1];
    if (!nativas.has(nome) && !DIVIDA_ANTIGA.has(nome) && !definida(nome)) orfas.add(nome);
  }
}
t('todo botão da tela chama uma função que existe', orfas.size === 0, [...orfas].join(', '));

fim('Início sem Para Hoje');
