# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 17/jun/2026 — v3.33*

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

## ESTADO ATUAL — v3.32 (16/jun/2026)

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (Cloudflare Worker v7.8)
- **KV:** SENOVA_KV
- **Cron:** `0 10 * * *` (07:00 BRT) — varredura automática Adzuna + Jobicy
- **Modelo Worker:** `claude-sonnet-4-6` (NUNCA usar 4-5 — obsoleto)
- **Modelo Bruno — análise:** `claude-opus-4-8` | **código:** `claude-sonnet-4-6`
- **Último commit estável:** `efe1088` (17/jun/2026) — fix(modal): header empresa/cargo visíveis + status compacto + Cancelar

### O que foi feito nesta sessão (15/jun/2026 — sessão 2)
- [x] B1: removido "+ Abrir processo" de Novidades no mercado (`_buildAlertasHtml` linhas 6545/6567)
- [x] B2: regra OMIT aplicada — Oportunidades, Retornos e Mercado somem quando vazios
- [x] B3: `proximaSalvar()` chama `renderHomeAcoes()` — "Entrevista sem data" some imediatamente
- [x] Testado por Marcos — confirmado funcionando ✅
- [x] B4: `renderATSResult()` captura `vaga-input.value` antes de limpar → salva como `jobDescription` no card
- [x] Testado por Marcos ✅

### O que foi feito nesta sessão (15/jun/2026 — sessão 3 — design)
- [x] Reunião de equipe: redesign completo do card de Processo — wireframe aprovado
- [x] Pesquisa de mercado: concorrentes (Huntr, Teal, Simplify, Levels.fyi, Career-Ops) — nenhum faz Projeto de Vida
- [x] Framework "Pontuação ao Projeto" desenhado: 6 dimensões, pesos configuráveis, dados 100% gratuitos
- [x] Estratégia de dados multi-país aprovada: IDHM + FIRJAN + IDEB (BR) · Eurostat + OECD (EU) · WorldBank + UN HDI (global)
- [x] Decisões de produto registradas (ver tabela abaixo)

### O que foi feito nesta sessão (16/jun/2026 — sessão 4)
- [x] commit 8828f4c — redesign modal-vaga 9 zonas (feito sem protocolo — reconhecido)
- [x] commit 04a552b — Sofia max_tokens 320→650, fallback notas, textarea resize (feito sem protocolo — reconhecido)
- [x] Protocolo retomado: skill_qa.md + skill_fluxo.md lidos
- [x] Diagnóstico completo do card levantado com Marcos (ver PENDÊNCIAS abaixo)

### O que foi feito nesta sessão (16/jun/2026 — sessão 5 — arquitetura modal)
- [x] Pesquisa de mercado: Huntr, Teal, Simplify, Linear — padrão de tabs para dado complexo
- [x] Mapeamento completo do fluxo por status com Marcos (fluxograma em papel + conversa)
- [x] Decisões de produto tomadas (ver tabela abaixo)
- [x] Arquitetura do modal definida por estado — aprovada parcialmente
- [x] commit 4e5b47b — estado Oportunidade no modal: Compatibilidade, Andamento, Ir para vaga, seções por status

### O que foi feito nesta sessão (17/jun/2026 — sessão 6 — layout Oportunidade)
- [x] 4 bugs corrigidos: scrollbar fino, kanban 5 colunas, modal fixo (não arrastável), hint visível no lead
- [x] Auto-fetch descrição por URL com detecção de garbage (LinkedIn cookie pages)
- [x] Trigger automático de análise após fetch bem-sucedido
- [x] Wireframe aprovado por Marcos para estado Oportunidade (ver tabela PRÓXIMOS PASSOS)
- [x] commit b17dc4d — layout Oportunidade: body reordenado, action bar oculta no lead, botão inline, footer [Excluir][Cancelar][Ir para vaga]
- [x] commit efe1088 — header empresa/cargo sempre visíveis (border-bottom), status compacto, [Cancelar] restaurado
- [ ] **PRÓXIMO: Marcos testa estado Oportunidade → aprovar → desenhar CV Enviado**

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
| Pesquisa de mercado | Salesforce/HubSpot/Pipedrive: barra de progresso no footer/topo do registro. LinkedIn/Indeed: meta-linha Cidade · Modelo · Tipo de contrato |

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

**Regras:**
- Descrição: preview 2-3 linhas sempre visível; "Ver descrição completa ▾" expande inline
- Compatibilidade: fechada, mas barra + número (78%) visíveis mesmo colapsada; ▶ expande breakdown
- Análise holística: Sofia sob demanda — [Perguntar à Sofia] dispara; nunca automático
- [Remover]: destrói sem rastro (lead = sem histórico ainda)
- [Ir para vaga ↗]: abre URL original em nova aba

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
| Fit Técnico ≠ Sofia | São duas inteligências separadas — não misturar em botão único |
| Score | Sempre aberto (visível por padrão) |
| Descrição da vaga | Fechada por padrão — clica para expandir |
| "Candidatar" via Outlook | REMOVIDO — errado. Candidatar = abre URL da vaga no portal |
| Score obrigatório | "Ir para vaga" só habilita após análise técnica |
| "Ir para vaga" | Substitui "Candidatar" no estado Oportunidade |
| Excluir ≠ Declinar | Oportunidade: Excluir (sem rastro). Processos ativos: Declinar/Arquivar |
| "Se preparar p/entrevista" | NÃO é coluna do Kanban — é ação dentro do card Entrevista |
| Sofia na Proposta | Ajuda a precificar e comparar com projeto de vida |
| Captura de Aprendizado | Sempre ao encerrar (Aceito, Arquivado) |
| Construção | Um estado de cada vez — Oportunidade primeiro |

---

## DECISÕES DE PRODUTO — SESSÃO 3 (15/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Card redesign | Wireframe aprovado — 7 zonas (header, ações, score, análise, Sofia, descrição, docs, histórico) |
| Sofia no card | Disparo MANUAL — só quando chamada. Prudência no consumo de API e no tom |
| Pontuação ao Projeto | Score 0–100 composto por 6 dimensões com pesos configuráveis pelo usuário |
| Análise — eixos | ATS (fit técnico) + Projeto de Vida (holístico) — dois eixos separados |
| Dados | 100% gratuitos: IDHM, FIRJAN, IDEB, WorldBank, UN HDI, OECD, Eurostat |
| Multi-país | Camada global (WorldBank + UN HDI) + camada local por país + fallback para país |
| Salário Real Ajustado | Salário Nominal × (CoL Cidade Base / CoL Destino) — diferencial Senova |
| Dimensões | Padrão no Perfil (A) + override por card (C) — onboarding Sofia captura o grosso |
| Onboarding Sofia | Perguntas ABERTAS — nunca diretivas. "Me fale sobre sua família" não "Tem filhos?" |
| Perfis psicológicos | Big Five, Âncoras de Carreira, Ikigai, RIASEC, VIA — coletados no onboarding |
| Descrição no card | Padrão de mercado: ~300 chars visíveis + "Ver completo ▾" |

---

## BUGS ATIVOS CONFIRMADOS

| # | Descrição | Arquivo / Local | Prioridade |
|---|-----------|-----------------|-----------|
| ~~B1~~ | ~~"+ Abrir processo" em Novidades no mercado~~ | ✅ resolvido 15/jun s2 | — |
| ~~B2~~ | ~~Empty state "nenhuma nova" / "nenhum novo"~~ | ✅ resolvido 15/jun s2 | — |
| ~~B3~~ | ~~"Entrevista sem data" persistia em Para Hoje~~ | ✅ resolvido 15/jun s2 | — |
| ~~B4~~ | ~~Editar Processo: descrição da vaga não carrega (`mv-job-desc` vazio)~~ | ✅ resolvido 15/jun s3 | — |
| B5 | Worker usa `claude-sonnet-4-5` (obsoleto) | `senova-worker.js` | **Média** |
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | — | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | — | **Média** |
| B8 | LinkedIn no card de Contatos: URL sem link clicável | — | **Baixa** |
| B9 | Idioma DE ausente em todos os seletores PT/EN/ES | — | **Média** |

---

## PRÓXIMOS PASSOS (por prioridade)

### REDESIGN MODAL — ARQUITETURA APROVADA (16/jun/2026)

**Abordagem:** construir um estado de cada vez. Oportunidade primeiro.

**Arquitetura por estado:**

| Estado | Missão | Conteúdo principal | Ações footer |
|--------|--------|-------------------|--------------|
| **Oportunidade** | Vale candidatar? | Score aberto + Descrição fechada + Análise técnica + Sofia opcional | [Excluir] [Ir para vaga ↗] |
| **CV Enviado** | Acompanhar | Score compacto + Próxima ação + Notas + Detalhes + Sofia | [Arquivar] [Salvar] [Marcar entrevista] |
| **Entrevista** | Preparar e registrar | Data/hora destaque + Sofia prepara + Notas + Resultado | [Arquivar] [Salvar] [Registrar resultado] |
| **Proposta** | Negociar e decidir | Campos proposta + Sofia precifica + Notas negociação | [Arquivar] [Aceitar proposta] |
| **Aceito/Arquivado** | Capturar aprendizado | Captura de Aprendizado + Histórico | [Fechar] |

**Fixo em todos os estados:** header (empresa+cargo+status+✕) + meta info + barra progresso + Sofia sempre disponível

**PRÓXIMO PASSO:** Implementar estado Oportunidade no modal (Fase 2 — código)

### Depois — bugs e melhorias
- **B5** — Worker: trocar `claude-sonnet-4-5` por `claude-sonnet-4-6` em `senova-worker.js`
- Fluxo candidatura: 3 caminhos (mailto / portal / headhunter) — após card resolvido
- Retornos: indicador "N processos aguardando resposta"
- Responsivo mobile (768px+)

---

## REGRAS INVIOLÁVEIS

### Desenvolvimento
- Nunca chamar `api.anthropic.com` do browser — sempre via Worker
- Nunca substituir `index.html` por arquivo externo
- Salvar backup `senova_v[N]_[data].html` antes de editar `index.html`
- Nunca refatorar CSS junto com correção de bug
- Um fix de cada vez: commit → Marcos testa → aprova → próximo
- Nunca commitar sem rodar checklist do `skill_qa.md`
- Nunca "nenhuma nova", "nenhum novo", "0 vagas" — categoria vazia SOME (Sprint 01)
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
