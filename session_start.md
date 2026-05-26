# PROTOCOLO DE ABERTURA — SENOVA
*Atualizado: 26/mai/2026 — otimizado para menor consumo de tokens*

## REGRA: Claude Code vs Virgílio (Claude.ai)

| Tarefa | Onde fazer |
|--------|-----------|
| Bugs, features, deploy, git | **Claude Code** (aqui) — tem acesso a arquivos |
| CV, cartas, estratégia pura | **Virgílio** (Claude.ai) — sem precisar do estado do código |
| Atualizar docs do projeto | **Claude Code** — edita e commita direto |

---

## PASSO 1 — Ler obrigatoriamente (nesta ordem):
1. VIRGILIO.md — estado atual, pendências, regras
2. VERSOES.md — versão atual e últimas mudanças
3. PROJETO_ESTRATEGICO.md — fases e prioridades (se trabalho estratégico)

## PASSO 2 — Ler skills APENAS quando necessário:

**Desenvolvimento:**
- skill_dev_senova.md — antes de qualquer edição de código
- skill_design_senova.md — antes de qualquer alteração visual
- skill_api_claude.md — antes de mexer em chamadas à API
- skill_pwa.md — ao implementar mobile/responsivo
- skill_security.md — ao implementar nova rota ou auth

**Carreira (CV, cartas, pesquisa):**
- PERFIL_MARCOS.md — dados completos do Marcos
- skill_cv.md · skill_linkedin.md · skill_pesquisa_exec.md
- skill_followup.md · skill_market_intel.md

**Produto / Sofia / CRM:**
- skill_sofia.md · skill_crm.md · skill_produto.md
- skill_business_plan.md · skill_concorrentes.md

**Não ler todos os skills de uma vez — carregar só o relevante para a sessão.**

---

## ESTADO ATUAL (26/mai/2026)

### Versões
| Artefato | Versão | Commit |
|---|---|---|
| index.html | **v3.12.7** | `6273896` |
| senova-worker.js | **v7.7** | Worker sem alteração desde 22/mai |
| Worker deployado | `007d2dec` | senova-proxy.marcos-mco.workers.dev |
| Modelo IA (Worker) | claude-sonnet-4-5 | ⚠ pendente atualizar para 4-6 |
| Modelo IA (Frontend) | claude-sonnet-4-6 | ✅ |

---

## MÓDULOS FUNCIONAIS

| Módulo | Status |
|---|---|
| Análise CV (Anti-ATS) | ✅ Funcional |
| LinkedIn Optimizer | ✅ Funcional |
| Pipeline CRM (Kanban) | ✅ Funcional |
| CRM Contatos | ✅ Funcional |
| Sofia (4 tabs) | ✅ Em produção |
| Varredura de vagas | ✅ Funcional |
| OAuth Outlook | ✅ Funcional |
| Candidatura via Outlook | ✅ Funcional |
| Central de Sinais | ✅ Funcional |
| Extensão Chrome | ✅ Funcional |
| Home / Dashboard | ✅ Funcional |
| Botão + Novo | ✅ Funcional (Processo / Contato) |

---

## PRÓXIMAS PRIORIDADES (Fase 1 — jun/2026)

1. **Plano A/B/C no Pipeline** — Senova como sistema único dos 3 planos
2. **Responsivo mobile** — 768px+ com bottom nav e touch targets 44px
3. **Perfil 9 blocos** — Bloco 3 (O que busco) como fonte única de triagem
4. **Fluxo candidatura end-to-end** — 1 clique, 5 passos
5. **Prompt caching** — economizar ~85% no custo Anthropic API

---

## BUGS ATIVOS
| # | Bug | Fix |
|---|-----|-----|
| B1 | `openVagaModal('new')` seta prioridade como `'lead'` | Trocar para `'media'` |
| B2 | Worker usa claude-sonnet-4-5, frontend usa 4-6 | Atualizar Worker |
| B3 | DM Sans carregada no index.html linha 8 | Remover do `<link>` |

---

## REGRAS ESSENCIAIS DE DEPLOY

```
# Frontend
git add index.html && git commit -m "descrição" && git push origin main
# Aguardar ~30s → Ctrl+Shift+R

# Worker (só quando senova-worker.js mudar)
npx wrangler deploy
```

**Antes de qualquer commit:** Ctrl+F por `api.anthropic.com` no index.html → ZERO resultados.

---

## REFERÊNCIAS RÁPIDAS
- Produção: https://marcos-mco.github.io/senova
- Worker: https://senova-proxy.marcos-mco.workers.dev
- Repo: https://github.com/marcos-mco/senova
- KV keys: `perfil_usuario` · `vagas_lead` · `config_varredura` · `outlook_token` · `sinais_mercado_*`
- Azure Client ID: `eaf69797-def3-4f6a-a103-8bcb3ed0f79e` (tenant: `consumers`)
