# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 18/jun/2026 — v3.35*

## LEITURA OBRIGATÓRIA AO INICIAR QUALQUER SESSÃO
1. Ler este arquivo completo
2. Ler `CLAUDE.md` — protocolo Bruno, regras de desenvolvimento
3. Ler `skill_qa.md` — checklist de qualidade (Fases 1/2/3)
4. Ler `skill_fluxo.md` — fluxo oficial v1.2 e vocabulário
5. Ler `skill_dev_senova.md` — arquitetura, módulos, bugs ativos
6. Para edições de UI: ler `skill_design_senova.md` + `skill_ux_writing.md`
7. Para CV/cartas/pesquisa: ler `PERFIL_MARCOS.md`
8. Nunca propor algo já documentado nesses arquivos

---

## COMO ABRIR O CLAUDE CODE
1. Pressione Windows + R → digite cmd → Enter
2. Digite: cd C:\Users\marco\Documents\senova → Enter
3. Digite: claude → Enter

---

## ESTADO ATUAL — v3.35 (18/jun/2026)

### ⚠️ LEITURA OBRIGATÓRIA ANTES DE QUALQUER SPRINT
- **`REVISAO_OPUS_17jun2026.md`** — revisão completa acatada por Marcos. Contém bugs, segurança, features A+B, economia de tokens, visão comercial e roadmap de 3 sprints. **NÃO ignorar.**

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (Cloudflare Worker v7.9)
- **KV:** SENOVA_KV
- **Cron:** `0 10 * * *` (07:00 BRT) — varredura automática Adzuna + Jobicy
- **Modelo Worker:** `claude-sonnet-4-6` (NUNCA usar 4-5 — obsoleto)
- **Modelo Bruno — análise:** `claude-opus-4-8` | **código:** `claude-sonnet-4-6`
- **Último commit estável:** `58839fc` (18/jun/2026)

---

## O QUE FOI FEITO — SESSÃO 8 (18/jun/2026)

### Bugs corrigidos
- [x] Bug "Entrevista — agendar data e horário" persistindo em Para Hoje — migração one-shot `senova_migration_entrevista_legacy_v1` (commit `12ae2c9`)
- [x] OAuth Outlook: campo `h.outlook_conectado` não existia no `/health` — corrigido para `h.outlook === 'conectado'` (commit `b266306`)
- [x] Callback OAuth: `window.close()` bloqueado pelo Chrome após redirects OAuth — restaurado HTML original com `postMessage` + tentativa de close (commit `b266306`)
- [x] Detecção da extensão Senova: status hardcoded "Não detectada" — content.js agora dispara `senova:ext-ready`, app escuta e atualiza para "✅ Extensão ativa" (commit `61d7a15`)
- [x] LinkedIn notificações de rede social (aceites de convite, curtidas, etc.) classificadas como irrelevante pela IA (commit `58839fc`)

### Sprint A — FECHADO ✅
Todos os 5 itens implementados e aprovados por Marcos + revisão de código por Bruno:
- [x] `urlSegura()` — XSS em URLs de email (commit `b556722`)
- [x] CORS Worker restrito a `marcos-mco.github.io` (commit `d8d0529`)
- [x] Status unificado: `negado`+`descartado`→`arquivado`; `contato`→`aplicado`; sem "Em Contato" no dashboard (commits `4a79987` + `92b1fab`)
- [x] `corDoScore()` + `bgDoScore()` + `classificacaoDoScore()` centralizados (commit `4a79987`)
- [x] `const MODELOS` central — 14 call sites atualizados (commit `4a79987`)

### Sprint B — FECHADO ✅
- [x] Prompt caching (`cache_control: ephemeral`) no Worker para análise de vagas e emails (commit `9ca05d7`)
- [x] CV e avaliador de entrevista: `MODELOS.analise` → `MODELOS.rapido` (Sonnet); análise ATS explícita mantém Opus (commit `9ca05d7`)

### Sprint B+ — Feature B Email — IMPLEMENTADO (teste parcial)
- [x] Worker: whitelist force-show — email de domínio prioritário nunca é `irrelevante` (commit `99fcadc`)
- [x] Worker: blacklist de remetentes — KV `blacklist_remetentes` + rotas `/api/blacklist` GET/POST/DELETE (commit `99fcadc`)
- [x] Worker: pré-filtro de emails bloqueados antes da classificação IA (commit `99fcadc`)
- [x] Perfil → Outlook: textarea substituído por chips clicáveis — 15 portais sugeridos pelo Senova + campo custom (commit `99fcadc`)
- [x] Email card: botões `↺ Classificar` e `🚫 Bloquear` em todos os cards (commit `99fcadc`)
- [x] Bloquear email: oferece escolha — tipo (palavras-chave do assunto) ou remetente (commit `58839fc`)
- [x] Extensão: botão `+ Habilitar emails de <dominio>` no popup em qualquer portal (commits `99fcadc`, `61d7a15`)
- [x] Worker: mover TODOS emails processados para "Lidos pelo Senova" (commit `e1e937a`)

### Sprint C — FECHADO ✅
- [x] Análise lazy-batch com cache por `gerarId` no KV (commit `aaac151`)
- [x] Ordenação/filtro por score no Kanban (commit `aaac151`)
- [x] Badge "Não analisada" para vagas sem score (commit `aaac151`)

---

## PENDÊNCIAS DESTA SESSÃO (prioridade para próxima)

### 1. OAuth Outlook — confirmar funcionamento
Marcos não confirmou que o OAuth funciona com o fix final (`b266306`). Na próxima sessão: testar "Conectar Outlook" → popup → login → toast "✅ Outlook conectado!".

### 2. Sprint B/C — testes de Marcos pendentes
- Sprint B: toggle "Lidos pelo Senova" + CV via Sonnet — não testados por Marcos
- Sprint C: badge "Não analisada" + sort por score — não testados por Marcos

### 3. Feature B — emails ainda faltando
Emails de portais como Michael Page não chegavam ao Senova. Com a whitelist force-show implementada, aguardar teste real. Possível que alguns portais ainda estejam faltando por filtros desconhecidos.

### 4. Kanban card indevido
Card "Rogério aceitou seu convite; conheça a rede dessa pessoa" apareceu no kanban — provavelmente importado pela extensão ao visitar a página. Marcos deve excluir manualmente (botão Excluir no footer do card).

---

## PRÓXIMAS FEATURES (backlog aprovado)

### Feature B — itens restantes
- [ ] Reclassificação com "aprendizado" — ao reclassificar, salvar padrão no KV para aplicar automaticamente nas próximas classificações (não só local)
- [ ] Análise linear de processo — mapear cada etapa vaga→resultado (registrada 17/jun/2026)

### Fluxo candidatura (próximo estado a construir)
- [ ] Implementar estado "CV Enviado" no modal — após estado Oportunidade aprovado
- [ ] 3 caminhos de candidatura: portal / email headhunter / indicação

### Futuro
- [ ] Responsivo mobile (768px+)
- [ ] Multi-usuário (bloqueante para versão comercial)
- [ ] Análise Linear de Processo (ver REVISAO_OPUS_17jun2026.md)

---

## BUGS ATIVOS CONFIRMADOS

| # | Descrição | Arquivo / Local | Prioridade |
|---|-----------|-----------------|-----------|
| ~~B1~~ | ~~"+ Abrir processo" em Novidades no mercado~~ | ✅ resolvido 15/jun s2 | — |
| ~~B2~~ | ~~Empty state "nenhuma nova" / "nenhum novo"~~ | ✅ resolvido 15/jun s2 | — |
| ~~B3~~ | ~~"Entrevista sem data" persistia em Para Hoje~~ | ✅ resolvido 18/jun s8 | — |
| ~~B4~~ | ~~Editar Processo: descrição da vaga não carrega~~ | ✅ resolvido 15/jun s3 | — |
| ~~B5~~ | ~~Worker usa `claude-sonnet-4-5` (obsoleto)~~ | ✅ FANTASMA — já usava 4-6 | — |
| ~~B-N1~~ | ~~Dashboard mostra "Em Contato"~~ | ✅ resolvido Sprint A | — |
| ~~B-N2~~ | ~~Status `negado`+`descartado` não unificados~~ | ✅ resolvido Sprint A | — |
| ~~B-N3~~ | ~~XSS via URL de email~~ | ✅ resolvido Sprint A | — |
| ~~B-N4~~ | ~~Worker CORS aberto~~ | ✅ resolvido Sprint A | — |
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | index.html | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | index.html | **Média** |
| B8 | LinkedIn no card de Contatos: URL sem link clicável | index.html | **Baixa** |
| B9 | Idioma DE ausente em todos os seletores PT/EN/ES | index.html | **Média** |

---

## ROADMAP DE SPRINTS — STATUS

| Sprint | Status | Observação |
|--------|--------|-----------|
| Sprint A — Segurança + Saneamento | ✅ FECHADO | Aprovado por Marcos + revisado por Bruno |
| Sprint B — Tokens + Outlook | ✅ FECHADO | Implementado; teste Marcos pendente |
| Sprint B+ — Feature B Email | ✅ IMPLEMENTADO | Teste parcial; OAuth a confirmar |
| Sprint C — ATS + Kanban | ✅ FECHADO | Implementado; teste Marcos pendente |

---

## ARQUITETURA DE EMAIL (v1.0 — 18/jun/2026)

### Fluxo atual
1. Worker busca últimos 50 emails (7 dias) via Graph API
2. Blacklist: remetentes bloqueados → removidos antes da IA
3. Alertas Google (job alerts) → separados automaticamente
4. IA classifica em: `positivo | pipeline | hunter | vaga | negativo | mercado | irrelevante`
5. Whitelist override: email de domínio na whitelist → nunca `irrelevante`
6. `irrelevante` → não aparecem no Senova (máx 10 mostrados na aba Limpar)
7. Emails processados → movidos para "Lidos pelo Senova" (se toggle ON)

### KV keys de email
- `whitelist_dominios` — domínios prioritários (force-show)
- `blacklist_remetentes` — remetentes/assuntos bloqueados
- `senova_email_vistos_*` — IDs já vistos (evita duplicatas)
- `outlook_folder_lidos` — ID da pasta "Lidos pelo Senova"

### Regras de classificação IA (críticas)
- LinkedIn notificações de rede (aceites, curtidas, aniversários) → **irrelevante**
- Confirmação de candidatura → **irrelevante**
- LinkedIn job alert / vagas → **vaga**
- Headhunter com contato direto → **hunter**
- RH sobre vaga candidatada → **pipeline**

---

## DECISÕES DE PRODUTO — SESSÃO 8 (18/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Whitelist de portais | Chips clicáveis no Perfil — 15 sugeridos + campo custom. Ativo = emails do domínio nunca somem |
| Blacklist | Por remetente OU por tipo (palavras-chave do assunto) — usuário escolhe ao clicar 🚫 |
| Extensão "Habilitar" | Botão no popup da extensão para qualquer site — adiciona domínio à whitelist com 1 clique |
| Mover emails | TODOS os emails processados vão para "Lidos pelo Senova" (não só baixo valor) |
| LinkedIn notificações | IA deve classificar como `irrelevante` — regra explícita no prompt |

---

## DECISÕES DE PRODUTO — SESSÃO 7 (17/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Ordem do modal | Header fixo → Body (muda por fase) → Barra de fases (footer fixo) → Botões |
| Barra de fases no footer | Âncora no footer fixo — nunca no header, nunca scrollável |
| Meta-linha header | Cidade · Modelo · Regime (CLT/PJ) · Ver vaga ↗ — sem canal, sem data, sem emoji |
| Status dropdown | Oculto no header para estado Oportunidade — mantido como hidden para dados |
| "Compatibilidade" | Accordion colapsado por padrão; barra + score visíveis mesmo fechado |
| "Análise holística" | Seção com botão "Perguntar à Sofia" — sob demanda, nunca automático |
| Processo | Um estado de cada vez na jornada do usuário: Oportunidade → CV Enviado → Entrevista → Proposta |

### Wireframe aprovado — Estado Oportunidade (17/jun/2026)

```
┌──────────────────────────────────────────────────────────────┐
│ [●]  Empresa S.A.                                      [✕]  │
│      Diretor Comercial                                       │
│      São Paulo · Híbrido · CLT · Ver vaga ↗                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Descrição da vaga                                           │
│  "Buscamos um Diretor Comercial com experiência em          │
│   gestão de equipes de alta performance e resultados        │
│   comprovados em vendas B2B..."                             │
│  Ver descrição completa ▾                                   │
│                                                              │
│  ▶  Compatibilidade  [████████████░░░░░░]  78%              │
│     (expandir para ver detalhes)                            │
│                                                              │
│  ▶  Análise holística                                       │
│     [Perguntar à Sofia]                                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ●───────○───────○───────○                                  │
│  Oportunidade  CV Enviado  Entrevista  Proposta             │
├──────────────────────────────────────────────────────────────┤
│  [Remover]       [Cancelar]      [Ir para vaga ↗]           │
└──────────────────────────────────────────────────────────────┘
```

---

## DECISÕES DE PRODUTO — SESSÃO 5 (16/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Kanban — colunas | Oportunidade → CV Enviado → Entrevista → Proposta → [Aceito \| Arquivado] |
| Coluna "Em Contato" | REMOVIDA — headhunters/indicações entram como Oportunidade |
| "Negado"/"Descartado" | UNIFICADOS em "Arquivado" |
| Modal sensível ao status | Cada estado tem missão e conteúdo próprio — não scroll único |
| Análise técnica | Automática, sempre presente quando há descrição |
| Sofia | Persistente — disponível em qualquer estado como chat contextual |
| "Candidatar" via Outlook | REMOVIDO — candidatar = abre URL da vaga no portal |
| Score obrigatório | "Ir para vaga" só habilita após análise técnica |
| Excluir ≠ Declinar | Oportunidade: Excluir (sem rastro). Processos ativos: Declinar/Arquivar |

---

## BUGS ATIVOS CONFIRMADOS

| # | Descrição | Arquivo / Local | Prioridade |
|---|-----------|-----------------|-----------|
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | index.html | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | index.html | **Média** |
| B8 | LinkedIn no card de Contatos: URL sem link clicável | index.html | **Baixa** |
| B9 | Idioma DE ausente em todos os seletores PT/EN/ES | index.html | **Média** |

---

## REGRAS INVIOLÁVEIS

### Desenvolvimento
- Nunca chamar `api.anthropic.com` do browser — sempre via Worker
- Nunca substituir `index.html` por arquivo externo
- Salvar backup `senova_v[N]_[data].html` antes de editar `index.html`
- Nunca refatorar CSS junto com correção de bug
- Um fix de cada vez: commit → Marcos testa → aprova → próximo
- Nunca commitar sem rodar checklist do `skill_qa.md`
- Nunca "nenhuma nova", "nenhum novo", "0 vagas" — categoria vazia SOME
- Novidades no mercado NUNCA têm "+ Abrir processo" — são informativas

### CV e Perfil (ver PERFIL_MARCOS.md para detalhes)
- RPC/Globo SEMPRE em 2 cargos: Gerente (nov/2008–abr/2012) + Diretor (abr/2012–abr/2019)
- Sales = Vendas = Comercial (sinônimos) — Marcos é de Vendas, não de Marketing
- Master em Vendas (não Marketing)
- Email: marcos_mco@hotmail.com

### Brand Senova
- Navy: `#1A3A5C` | Gold: `#C9A84C` | Action: `#2E6DA4`
- Fontes: Playfair Display + Inter — NUNCA DM Sans
- Mínimo 15px corpo (público 35+)
- NUNCA alterar cores/fontes/layout sem aprovação explícita de Marcos

---

## SKILLS DISPONÍVEIS

### Protocolo Bruno (ler SEMPRE ao iniciar)
- `skill_qa.md` — protocolo 3 fases obrigatório
- `skill_fluxo.md` — fluxo v1.2 + vocabulário + regras Sprint 01
- `skill_dev_senova.md` — arquitetura, módulos, Worker, deploy
- `skill_ux_writing.md` — voz, tom, empty states, botões, Sofia

### Design e UX
- `skill_design_senova.md` — brand, componentes, padrões visuais

### Carreira de Marcos (quando há CV, carta, pesquisa)
- `PERFIL_MARCOS.md` — dados completos, histórico, contatos estratégicos
- `skill_cv.md` · `skill_linkedin.md` · `skill_pesquisa_exec.md`
- `skill_followup.md` · `skill_market_intel.md`

### Produto e negócio
- `skill_produto.md` · `skill_business_plan.md` · `skill_concorrentes.md`

### Sofia e CRM
- `skill_sofia.md` — personalidade, tom, estágios
- `skill_crm.md` — Processos, Contatos, varredura

### Infraestrutura
- `skill_api_claude.md` — Anthropic API, prompt caching, modelos
- `skill_pwa.md` — mobile, responsivo, PWA
- `skill_security.md` — OWASP, validação, multi-usuário

---

*Bruno = Tech Lead + Arquiteto + Engenheiro + QA | Marcos = PM + QA Final*
