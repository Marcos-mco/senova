# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 26/mai/2026 — v3.12.7*

## LEITURA OBRIGATÓRIA AO INICIAR QUALQUER SESSÃO
1. Ler este arquivo completo
2. Ler session_start.md (estado atual, módulos, pendências, regras de deploy)
3. Ler PROJETO_ESTRATEGICO.md (visão, fases, prioridades)
4. Para CV/cartas/pesquisa: ler PERFIL_MARCOS.md
5. Para decisões técnicas: ler PROJETO.md
6. Nunca propor algo já documentado nesses arquivos

---

## COMO ABRIR O CLAUDE CODE
1. Pressione Windows + R → digite cmd → Enter
2. Digite: cd C:\Users\marco\Documents\senova → Enter
3. Digite: claude → Enter

---

## ESTADO ATUAL — v3.12.7 (25/mai/2026)

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (Cloudflare Worker v7.7)
- **KV:** SENOVA_KV
- **Cron:** 0 10 * * * (07:00 BRT) — varredura automática de vagas
- **Último commit estável:** `6273896` (25/mai/2026) — PDF executivo duplo cabeçalho corrigido

### Bugs conhecidos ativos
| # | Bug | Prioridade |
|---|-----|-----------|
| B1 | `openVagaModal('new')` seta `mv-prioridade.value='lead'` — aceita só `alta/media/baixa`; fix: trocar para `'media'` | Média |
| B2 | Worker usa `claude-sonnet-4-5` enquanto frontend usa `claude-sonnet-4-6` — inconsistência | Média |
| B3 | index.html carrega DM Sans na linha 8 (`@import` no `<link>`) — viola brand guide | Baixa |

---

## VARREDURA AUTOMÁTICA — Como funciona

### Fontes ativas
- Adzuna API (BR, ES, DE, PT, US) — App ID: 65c2a129
- Jobicy RSS (remoto global) — sem chave necessária

### Rotação de países
BR → ES → DE → PT → Remoto → BR → ... (índice em KV: rotacao_idx)

### Score por região (configurável no Perfil)
- Brasil: 70 | Espanha/Portugal: 55 | Alemanha: 50 | Remoto: 60 | EUA: 65

---

## HOME — Estrutura atual

### Coluna esquerda (5/12)
- KPIs 2×2: Leads / Candidaturas / Em Processo / Propostas
- Funil do Pipeline | Taxa de Retorno por Canal | Tempo Médio por Estágio

### Coluna direita (7/12)
- Central de Sinais (topo) — emails + alertas Google
- Vagas para revisar (quando há pendentes)
- Próximas Ações — só cards com data definida e ação concreta
- CRM — Contatos com próxima ação agendada

---

## PENDÊNCIAS — Por ordem de prioridade

### FASE 1 — MVP para 5 usuários reais

1. **Plano A/B/C no Pipeline** — filtros e views por plano; Plano A = CLT, B = Consultoria, C = Senova SaaS; Senova deve ser o único sistema operacional dos 3 planos
2. **Responsivo mobile** — 768px+ (tablet/celular); bottom nav mobile; touch targets 44px (ver skill_pwa.md)
3. **Perfil 9 blocos completo** — Bloco 3 (O que busco) como fonte única de critérios de triagem
4. **Fluxo candidatura end-to-end** — 1 clique: gerar CV → exportar → enviar → timeline → follow-up
5. **Interface 4 idiomas** — seletor global PT/EN/ES/DE
6. **Importação inteligente recrutadoras** — Michael Page, Robert Half sem tag "Revisar"
7. **skill_onboarding.md** — fluxo de primeira sessão para novos usuários
8. **skill_ux_writing.md** — glossário + microcopy padrão
9. **Prompt caching** — implementar no Worker (ver skill_api_claude.md) — economia ~85% custo IA

### FASE 2 — MVP Comercial
- senova.com.br + multi-usuário + billing (Stripe/Pagar.me)
- Landing page pública separada do app (senova.com.br vs app.senova.com.br)
- PWA: instalável no celular + notificações push (ver skill_pwa.md)
- Auth por usuário + rate limiting (ver skill_security.md)

### Sofia — APENAS A PARTIR DA FASE 2
- A Sofia existente (4 tabs) é suficiente para Fase 1
- Zero investimento novo em Sofia até ter assinantes pagantes
- Fase 3: avatar Anam.ai, coaching, memória longa

---

## REGRAS INVIOLÁVEIS

### CV e Perfil (ver PERFIL_MARCOS.md para detalhes)
- RPC/Globo SEMPRE em 2 cargos separados: Gerente (nov/2008–abr/2012) + Diretor (abr/2012–abr/2019)
- Nunca inventar métricas no CV
- Email principal: marcos_mco@hotmail.com — nunca marcos@labordei.com.br
- DLS nunca omitir do CV_BASE
- MBA FGV = Administração de Empresas — NUNCA associar a Marketing

### Brand Senova — NUNCA ALTERAR SEM APROVAÇÃO EXPLÍCITA
- Cores: #1A3A5C (navy) · #C9A84C (gold) · #2E6DA4 (action)
- Fontes: Playfair Display + Inter — NUNCA DM Sans
- Fontes mínimas: 15px corpo (público 35+)

### Desenvolvimento
- Nunca chamar api.anthropic.com do browser
- Nunca substituir index.html por arquivo do Claude.ai
- Salvar backup antes de editar
- Nunca refatorar CSS junto com correção de bug
- Um fix de cada vez: commit → testar → aprovar → próximo

---

## CONTATOS ESTRATÉGICOS ATIVOS
Ver PERFIL_MARCOS.md seção "Contatos estratégicos ativos" — separado para economizar tokens.

---

## SKILLS DISPONÍVEIS

### Core (ler quando há desenvolvimento)
- skill_dev_senova.md — arquitetura, deploy, Worker, rotas
- skill_design_senova.md — brand, componentes, padrões visuais
- skill_sessao.md — protocolo de abertura e fechamento

### Novos — Melhores práticas (ler conforme necessidade)
- skill_api_claude.md — Anthropic API, prompt caching, modelos
- skill_pwa.md — mobile, responsivo, PWA, service worker
- skill_security.md — OWASP, validação, headers, multi-usuário

### Produto e negócio (ler quando relevante)
- skill_produto.md · skill_business_plan.md · skill_concorrentes.md

### Carreira de Marcos (ler quando há CV, carta ou pesquisa)
- skill_cv.md · skill_linkedin.md · skill_pesquisa_exec.md
- skill_followup.md · skill_market_intel.md
- PERFIL_MARCOS.md — dados completos, histórico, contatos

### Sofia
- skill_sofia.md — personalidade, tom, estágios
- skill_crm.md — Pipeline, Contatos, varredura
