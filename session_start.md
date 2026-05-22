# PROTOCOLO DE ABERTURA — VIRGÍLIO
## Executar no início de CADA sessão

### PASSO 1 — Ler obrigatoriamente (nesta ordem):
1. PROJETO.md
2. VERSOES.md
3. VIRGILIO.md
4. session_start.md (este arquivo)

### PASSO 2 — Ler todos os skills:
- skill_sofia.md
- skill_crm.md
- skill_dev_senova.md
- skill_design_senova.md
- skill_produto.md
- skill_concorrentes.md
- skill_linkedin.md
- skill_cv.md
- skill_pesquisa_exec.md
- skill_followup.md
- skill_business_plan.md
- skill_market_intel.md

### PASSO 3 — Reportar ao Virgílio:
1. Versão atual + último deploy + commit hash
2. Última sessão: o que foi entregue
3. Próximas prioridades documentadas
4. Skills carregados: todos OK ou algum problema?
5. Perguntar: "O que quer trabalhar hoje?"

---

## ESTADO ATUAL (22/mai/2026)

### Versões
| Artefato | Versão | Observação |
|---|---|---|
| index.html | **v3.11** | ~290KB, ~4700 linhas — VERSOES.md canonical |
| senova-worker.js | **v7.7** (header diz v7.3 — stale) | Tem `/api/fetch-descricao` — conteúdo é v7.7 |
| Worker deployado | Version ID d4254150 | senova-proxy.marcos-mco.workers.dev |
| Modelo IA (Worker) | claude-sonnet-4-5 | — |
| Modelo IA (Frontend) | claude-sonnet-4-5 | **Pendente atualizar para claude-sonnet-4-6** |

---

## MÓDULOS FUNCIONAIS

| Módulo | Status | Localização |
|---|---|---|
| Análise CV (Anti-ATS) | ✅ Funcional | `#page-ats` — ATS score, CV otimizado, carta |
| LinkedIn Optimizer | ✅ Funcional | `#page-linkedin` — headline/about/bullets 4 idiomas |
| Pipeline CRM (Kanban) | ✅ Funcional | `#page-crm` — 5 cols ativas + Aceito/Negado/Descartado |
| CRM Contatos | ✅ Funcional | `#page-crm` aba Contatos — timeline, Outlook |
| Sofia | ✅ Em produção | `#page-sofia` — 4 tabs (Bem-vinda/Tutorial/CV/Entrevista) |
| Varredura de vagas | ✅ Funcional | Cron 07h BRT — Adzuna + Jobicy, rotação países |
| OAuth Outlook | ✅ Funcional | Mail.Read + Mail.Send + Calendars.ReadWrite |
| Candidatura via Outlook | ✅ Funcional | Modal com carta + CV, envia via Graph API sendMail |
| Central de Sinais | ✅ Funcional | Home — Emails / Google Alerts / Vagas para revisar |
| Extensão Chrome | ✅ Funcional | `senova-extension/` — captura em qualquer site |
| Perfil (5 blocos) | ✅ Funcional | Blocos 1–4 + Bloco 5 Ferramentas salvam em `/api/perfil` |
| Perfil (Blocos A/B/C) | ✅ Funcional | save/load via `/api/perfil` confirmado — código completo |
| Home / Dashboard | ✅ Funcional | KPIs 2×2, funil, próximas ações, sinais |

---

## PENDÊNCIAS E BUGS CONHECIDOS

### Alta prioridade
1. ~~**Blocos A/B/C do Perfil**~~ — ✅ Confirmado: save/load implementado (linhas 2548–2597), rota `/api/perfil` GET+POST ativa no Worker (linhas 306/312).
2. **Lead → Oportunidade** — ✅ UI renomeada (12 labels, labels JS). Valores internos mantidos (`status:'lead'`, `vagas-lead`, localStorage) — breaking change intencional adiado.
3. **Triagem automática** — vagas entrar direto em Oportunidade ou Para Considerar pelos critérios do Bloco 3 do Perfil. Não implementada.
4. ~~**Modelo IA**~~ — ✅ Feito: `claude-sonnet-4-5` → `claude-sonnet-4-6` em 12 chamadas do frontend.
5. **Sofia redesenho** — assistente contextual flutuante em todas as páginas (maior prioridade de produto).

### Média prioridade
6. **Bug `mv-prioridade` com valor inválido** — `openVagaModal('new')` na linha ~3636 faz `document.getElementById('mv-prioridade').value='lead'`, mas o campo só aceita `'alta'`/`'media'`/`'baixa'`. Nova vaga criada manualmente abre com prioridade sem seleção válida. Fix: trocar para `'media'`.
7. **Adzuna jobDescription vazio** — campo JD vem vazio na importação. Investigar se Worker passa `descricao` corretamente no card.
8. ~~**Encoding UTF-8 no Worker**~~ — ✅ Corrigido: `Content-Type: application/json; charset=utf-8` adicionado à função `json()`, Worker deployado (v716274fc).
9. **Home — erro nos emails e varredura** — reportado na sessão 20/mai, não investigado.
10. **Descrição Inhire** — extensão ainda captura algum conteúdo de navegação (menor, workaround ok).
11. **Google Alerts Digest** — verificar se está chegando corretamente no Outlook e sendo classificado.

### Backlog de produto
12. Home redesenho — 6 blocos: Novas Oportunidades, Para Considerar, Ações do Dia, Funil, Sinais, Contatos Ativos.
13. `skill_onboarding.md` — criar do zero.
14. `skill_ux_writing.md` — criar do zero.
15. Filtros Plano A/B/C no Pipeline — verificar se implementado.
16. Sofia conversacional — substituir tela estática por IA viva.
17. Aba Mercado — emails de conteúdo (Board Academy, newsletters) em aba separada.
18. Modal Editar Vaga — caber na tela sem scroll (revisão de layout).
19. Header Worker `senova-worker.js` — atualizar de v7.3 para v7.7 para evitar confusão.

---

## REGRAS INVIOLÁVEIS

### Desenvolvimento
- **Nunca chamar `api.anthropic.com` do browser** — toda chamada IA passa pelo Worker. Checar com `Ctrl+F` antes de qualquer commit do `index.html`.
- **Nunca substituir `index.html` por arquivo do Claude.ai** — sempre editar via Claude Code.
- **Salvar backup antes de editar**: `senova_v[N]_[data].html`.
- **Nunca refatorar CSS junto com correção de bug** — mudanças isoladas.

### Deploy
- **Frontend**: `git add index.html && git commit -m "..." && git push origin main` → GitHub Pages publica em ~30s.
- **Worker**: `npx wrangler deploy` (quando `senova-worker.js` mudar).

### Brand (nunca alterar sem aprovação explícita de Marcos)
| Token | Valor |
|---|---|
| Azul navy | `#1A3A5C` |
| Dourado | `#C9A84C` |
| Ação/link | `#2E6DA4` |
| Fundo | `#F7F5F0` |
| Texto | `#2C2C2A` |
| Fonte títulos | **Playfair Display 700** — nunca substituir |
| Fonte corpo | **DM Sans** (index.html usa DM Sans — CLAUDE.md menciona Inter mas código usa DM Sans) |
| Tamanho mínimo corpo | 16px — público 40+ |

### Sessão
- Um passo de cada vez.
- Descrever antes de executar.
- Aguardar aprovação antes de avançar.
- Ler arquivos locais ANTES de qualquer proposta.
- Nunca rodar à frente do Virgílio.

---

## PRÓXIMAS PRIORIDADES (em ordem)

1. Confirmar e testar Blocos A/B/C do Perfil
2. Sofia redesenho — assistente contextual flutuante
3. Triagem automática por critérios do Perfil
4. Renomear Lead → Oportunidade em toda a interface
5. Home redesenho — 6 blocos novos
6. Atualizar modelo para `claude-sonnet-4-6`

---

## REFERÊNCIAS RÁPIDAS

- **Produção**: https://marcos-mco.github.io/senova
- **Worker**: https://senova-proxy.marcos-mco.workers.dev
- **Repo**: https://github.com/marcos-mco/senova
- **KV keys ativas**: `perfil_usuario`, `vagas_lead`, `config_varredura`, `varredura_status`, `outlook_token`, `emails_vistos`, `whitelist_dominios`, `sinais_mercado_*`, `hunter_*`, `stats_*`
- **Cron Worker**: `0 10 * * *` = 07h BRT — varredura Adzuna + Jobicy
- **OAuth scopes**: Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access
- **Azure Client ID**: `eaf69797-def3-4f6a-a103-8bcb3ed0f79e` (tenant: `consumers` — Hotmail pessoal)
