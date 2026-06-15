# SESSAO.md — Estado Vivo
> Última atualização: 03/jun/2026 — saída para usar iPhone

## VERSÃO ATUAL
Senova **v3.24** — commit `3c37053` — publicado em marcos-mco.github.io/senova

## O QUE FOI FEITO HOJE (03/jun/2026)

### v3.23 — Redesign estrutural da Home
- Prioridades do Dia no TOPO como bloco hero
- Central de Sinais → Novidades (layout limpo)
- BI migrado para nova aba Relatórios (sidebar)
- Google Alerts: in-app com Sofia, não abre nova aba
- Vagas abaixo do limiar: oculto quando vazio
- Limpeza Expressa: arquiva leads inativos 60+ dias (com card inteligente)
- Fix: btn-limpeza-lote sem ID no HTML — corrigido

### v3.24 — Redesign visual (padrão premium do Mercado)
- **Hero banner**: gradient navy → #2E6DA4 com ícone dourado + contador "Ações hoje"
- **Prioridades**: `.card` border-top 3px gold + gold-line + Playfair Display
- **Novidades**: `.card` border-top 3px navy + `.h-sinal-row` (hover azul, borda dourada no ícone)
- **Pipeline**: `.card` navy + `.h-kpi-grid` 2×2 (hover border-gold + shadow)
- **Relatórios / Limpeza**: cards com mesmo padrão visual
- Sistema CSS `.h-*` criado (h-grid, h-right-col, h-card-title, h-sinal-row, h-sinal-ic, h-kpi-grid, h-kpi, h-card-link)

## PRÓXIMAS PRIORIDADES (retomar aqui)

| # | Item | Tipo |
|---|------|------|
| 1 | **Testar home v3.24** — validar visual no app após limpeza do pipeline | Validação |
| 2 | **U12/Relatórios** — metas semanais + evolução mês a mês | Feature |
| 3 | **Extensão** — companion universal (LinkedIn, job boards, Outlook Web) | Feature |
| 4 | **F3** — 5ª fonte de leads: entrada manual melhorada | Feature |
| 5 | **F4** — Carta candidatura: reescrita do fluxo | Feature |

## ESTADO DO WORKER
`senova-worker.js` — sem alteração nesta sessão.

## GIT
Branch `main` sincronizado com origin. commit `3c37053`. Nada pendente de push.
