# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 22/jun/2026 — v3.38 (Sessão 11)*

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

## ESTADO ATUAL — v3.38 (22/jun/2026 — Sessão 11)

### ⚠️ LEITURA OBRIGATÓRIA ANTES DE QUALQUER SPRINT
- **`REVISAO_OPUS_17jun2026.md`** — revisão completa acatada por Marcos. NÃO ignorar.
- **`VISAO_FUNDACIONAL.md`** — alma do produto. Ler antes de propor qualquer feature. Define o norte de tudo.

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (Cloudflare Worker — sem alteração na Sessão 11)
- **Extensão Chrome:** **v2.16** (arquivos locais — recarregar em `chrome://extensions`; +permissão `cookies`)
- **KV:** SENOVA_KV
- **Cron:** `0 10 * * *` (07:00 BRT) — varredura automática Adzuna + Jobicy
- **Modelo Worker:** `claude-sonnet-4-6` (NUNCA usar 4-5 — obsoleto)
- **Modelo Bruno — análise:** `claude-opus-4-8` | **código:** `claude-sonnet-4-6`
- **Último commit estável:** `a6c2c57` (22/jun/2026 — Sessão 11)

### 🔎 Agente de auditoria
- **`senova-auditor`** (em `.claude/agents/`) — agente dedicado de diagnóstico de causa raiz, com arquitetura + fluxo de enriquecimento + armadilhas embutidas. Acionar quando um bug persistir ou para auditar um fluxo inteiro: "usa o senova-auditor pra investigar X".

---

## ⚠️ AO RETOMAR (Sessão 12) — AÇÕES IMEDIATAS
1. **Recarregar a extensão**: `chrome://extensions` → Senova → ↻ recarregar. Confirmar **v2.16**.
2. **Abrir Senova com `Ctrl+Shift+R`** (cache do navegador já enganou testes — sempre forçar). As migrações de dedup/limpeza rodam uma vez no load.
3. **Validar enriquecimento end-to-end** (logado no LinkedIn, ~1-2 min, SEM filtro/busca ativo na coluna): cards de digest sem descrição preenchem **título real + descrição + Compatibilidade** sozinhos, e aparece o indicador "⚙️ Analisando vagas…". Sem duplicatas da mesma vaga.
4. **Próxima frente aprovada:** **arquivo de experiências complementares do CV** — JÁ EXISTE o arquivo (usar o existente, não criar outro); falta o **campo de entrada** no Perfil + o **uso na análise** (injetar nas análises de compatibilidade para a IA não ignorar experiências reais, ex.: IES — Expoente/Eadcon, docência).

---

## O QUE FOI FEITO — SESSÃO 11 (22/jun/2026)

**Tema:** fechar o enriquecimento de vagas vindas de e-mail (digest sem descrição, título feio, sem score, presas em "Aguardando análise"). Trocada a arquitetura e resolvidos vários bugs de raiz. Diagnóstico final feito com o agente `senova-auditor`.

### Enriquecimento — nova arquitetura
- **Aba de fundo NÃO funciona** (LinkedIn congela renderização de aba sem foco) → trocado por **fetch na API pública `jobs-guest`** (`_buscarDescricaoGuest` no background.js): pega descrição + cargo + empresa reais, sem abrir aba, sem foco, `credentials:'omit'` (não envia cookie).
- **Detecção de login** via cookie `li_at` (só existência) → **banner "Faça login no LinkedIn"** (deslogado) e **indicador "⚙️ Analisando vagas…"** (processando). `manifest` +permissão `cookies`, v2.16.

### Bugs de raiz corrigidos (a maioria achada pela auditoria)
- **Casamento por ID da vaga** (`/jobs/view/ID`), não URL crua — duas funções de norm divergiam (`#`) e o card não casava. `__senovaAtualizarDesc` agora **retorna se casou**; `_enriquecerUma` só marca "tentado" quando o card muda de fato (falha reprocessa).
- **`saveVagas()` não redesenha o Kanban** → enriquecimento agora redesenha (respeitando `filtroAtivo` — senão card sob filtro/busca ficava preso).
- **3 limiares de descrição em conflito** (>120 pendente / ≥100 grava / ≥400 pontua) prendiam descrições 120–399 em "Aguardando análise" para sempre → **limiar único >120** em tudo (app + extensão).
- **Dedup por ID da vaga** (`_vagaJaExiste` / `_jobIdLinkedIn`) — mesma vaga por fontes diferentes (digest vs candidatura) não duplica mais; migração `senova_migration_dedup_jobid_v1` junta duplicados já existentes (mantém o melhor: status > nota > descrição > recente).
- **Cards-lixo sem link** (e-mail de boas-vindas/notificação viravam "vaga") → `_ehVagaLixo` bloqueia na entrada + migração remove existentes.
- **Cards de título-digest** entram na fila de enriquecimento mesmo já tendo descrição (o texto era do e-mail) → trocam pelo título/descrição/nota reais.

### Ferramenta nova
- **Agente `senova-auditor`** em `.claude/agents/` — diagnóstico de causa raiz com arquitetura/fluxo/armadilhas embutidos. Read-only.

### Pendência / próxima frente
- **Arquivo de experiências complementares do CV** (aprovado): já existe o arquivo; falta campo de entrada no Perfil + uso na análise de compatibilidade. Ver "AO RETOMAR".

---

## O QUE FOI FEITO — SESSÃO 10 (20-21/jun/2026)

### P3 — Emails lidos/movidos ✅ FECHADO E CONFIRMADO
Causa raiz era **limite de subrequests do Worker** (não a lógica). Fixes: `encodeURIComponent` no PATCH (`21e358c`); **Graph $batch** 20 ops/subrequest (`062b1c2`); endpoint `/api/emails/limpar-backlog` para não-lidos antigos (`8a619b1`) + disparo automático no sync forçado (`0cb182f`). Verificado: `autorizados_nao_lidos:0`, 27 emails movidos.

### P1 — Score divergente ✅ RESOLVIDO (raiz)
4 camadas corrigidas + arquitetura nova:
- Score da extensão autoritativo; guards de auto-recálculo (`36ea103`, `b6d5c66`); migração normaliza antigos (`50b8174`); re-captura atualiza card existente (`3a7af5c`).
- **Raiz (`9a19826`):** separar **Compatibilidade (`atsScore`)** do **ATS do CV (`atsCvScore`)** — um sobrescrevia o outro. `temperature:0` no `/api/analisar-vaga` (Sonnet 4.6) → determinístico. **NÃO** dá pra usar temperature no Opus 4.8 (erro 400).
- **Reset eager** (`6fa5211`,`847051d`,`82499f5`): zera scores dos leads e recalcula em lote (`_recalcLeadsReset` → `analisarLoteBackground`), cards já com score (decisão "eager" do estudo).
- **Só calcula com descrição completa (≥400 chars)** em TODOS os gatilhos (Marcos: "não calcular de snippet").

### P2 — Vagas reais de email sem descrição → 🧪 IMPLEMENTADO, FALTA TESTE
**Solução padrão de mercado: extensão enriquece em background** (`825c2d9`). Worker não consegue buscar LinkedIn (bloqueia); a extensão (logada) sim.
- `background.js`: alarm 1min; com Senova aberto, lê pendentes (`window.__senovaPendentesDesc`), abre URL canônica em **aba de fundo** (mesma janela, sem foco), `content.js` auto-extrai → `AUTO_UPDATE_DESC` → atualiza card, fecha aba. Throttle 3/min, 4s, marca tentadas.
- `manifest`: +`alarms`, −`windows`, v2.15 (resolveu o órfão `"windows"`).
- Re-captura também limpa cargo/empresa do título feio de email (`e0ef67d`).

### Estudo de precificação / arquitetura → `ESTUDO_PRECIFICACAO_20jun2026.md`
Insumo do **business plan**. Decisões: arquitetura "processa uma vez, mural read-only"; 4 análises separadas (Compatibilidade/ATS/CV/Sofia); Sonnet+cache+temp0 na decisão (nunca rebaixar o sinal que o usuário age em cima); alavanca de custo = eager vs lazy + funil + cache (~$0,01/vaga); **planos: Recomeço grátis 3m (missão) / Essencial R$29 / Profissional R$59 / Executivo R$129**; diferenciar por ferramentas, não por cota de buscas.

### Pendência conhecida
- Cards antigos com score já gravado mantêm o valor (fix é pra frente). Reset eager (rodou) cobre os leads.
- Descrição via servidor está **fora** (LinkedIn bloqueia) — só pela extensão.

---

## O QUE FOI FEITO — SESSÃO 9 (18/jun/2026)

### Confirmações de Marcos (testes realizados)
- [x] **OAuth Outlook** ✅ — "Conectado" confirmado em screenshot
- [x] **Pasta "Lidos pelo Senova"** ✅ — criada automaticamente no Outlook
- [x] **Emails chegando** ✅ — BRF Talent Acquisition apareceu no Senova
- [x] **Toggle B10** ✅ — funcionando após fix (screenshot confirmou toggle ON)

### Bugs corrigidos
- [x] **B10** — Toggle "Lidos pelo Senova" não respondia: `onclick` no track causava duplo clique (label + onclick se cancelavam). Fix: removido `onclick` redundante, label nativo faz o trabalho. (commit `d7abba7`)
- [x] **Emails pessoais sendo movidos** — Worker movia TODOS os emails processados, incluindo pessoais. Fix: mover apenas emails relevantes (não-irrelevante) + alertas de vagas autorizados. (commit `c3b5712`)

### Feature crítica: Consentimento Explícito de Email — LGPD/GDPR by design (commit `7d34328`)
- [x] **Worker:** `PADROES_DEFINIDOS` — 3 padrões: `linkedin_alertas`, `adzuna`, `google_alerts`
- [x] **Worker:** `estaAutorizado()` — filtro ANTES da IA. A IA nunca vê emails não autorizados
- [x] **Worker:** `getPadroes()` + rota `/api/padroes` GET/POST
- [x] **Worker:** filtro de consentimento aplicado após blacklist, antes de qualquer chamada à IA
- [x] **Perfil:** nova seção "Fontes autorizadas de e-mail" com 3 toggles (todos OFF por padrão)
- [x] **Perfil:** texto atualizado — "O Senova só lê emails das fontes que você autorizar"

### Documentação estratégica criada
- [x] **`VISAO_FUNDACIONAL.md`** — visão filosófica completa: provocação civilizacional, inversão do mercado, papel da Sofia, ética como modelo de negócio, fundamentos em Aristóteles / Buber / João Paulo II / Frankl / Rogers. (commits `6082b7c`, `6666546`)

### Decisões éticas invioláveis — registradas em memória permanente
- Nenhum valor comercial supera os valores morais e legais
- A tecnologia do Senova está a favor do homem, não da empresa
- O dado pertence ao usuário — a IA nunca usa o que não foi autorizado
- Toda vez que o usuário contribui com o Senova, deve ser recompensado

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

## PENDÊNCIAS — PRÓXIMA SESSÃO (prioridade para 19/jun/2026)

### 1. Testar Padrões Automáticos (Marcos ainda não viu a UI)
Fazer `Ctrl+Shift+R` → Perfil → aba de emails → seção "Fontes autorizadas de e-mail".
Ligar: "Alertas de vaga do LinkedIn" e "Alertas Adzuna / Gabi".
**Resultado esperado:** toggles ficam azul navy, toast "✓ 2 padrão(s) ativo(s)".
Depois: aba Emails → Atualizar → confirmar que só chegam emails autorizados.

### 2. Confirmar que emails pessoais pararam de ir para "Lidos pelo Senova"
Aguardar próximo ciclo de emails e verificar se Ronaldo / Moacir / Thiago continuam na caixa de entrada (não na pasta).

### 3. Construir estado "CV Enviado" no modal
Próximo passo da jornada aprovado. Wireframe definido na sessão 7. Só iniciar após Marcos confirmar pendências 1 e 2.

### 4. Discussão estratégica — visão fundacional
Marcos quer continuar a conversa sobre a visão civilizacional do Senova. Ler `VISAO_FUNDACIONAL.md` antes e retomar do ponto onde paramos. Marcos estava exausto ao encerrar — respeitar o ritmo.

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
| ~~B10~~ | ~~Toggle "Lidos pelo Senova" não respondia~~ | ✅ resolvido sessão 9 | — |
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | index.html | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | index.html | **Baixa** (não prioridade agora) |
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

## ARQUITETURA DE EMAIL (v2.0 — 18/jun/2026 — Consentimento Explícito)

### Princípio fundamental
**A IA nunca vê o que o usuário não autorizou.** O filtro de consentimento acontece ANTES de qualquer chamada à Anthropic. Emails não autorizados não são lidos, classificados, movidos nem contados. Isso é LGPD/GDPR by design e princípio ético inviolável do Senova.

### Fluxo atual (v2.0)
1. Worker busca últimos 50 emails (7 dias) via Graph API
2. **Blacklist:** remetentes bloqueados → descartados imediatamente
3. **🔒 FILTRO DE CONSENTIMENTO:** `estaAutorizado()` — só passa email de domínio na whitelist OU padrão automático habilitado pelo usuário. Todo o resto: ignorado completamente.
4. Separar alertas (Adzuna, Google Alerts) dos emails normais
5. IA classifica emails normais: `positivo | pipeline | hunter | vaga | negativo | mercado | irrelevante`
6. Whitelist override: domínio autorizado → nunca `irrelevante`
7. `irrelevante` → não aparece no Senova (máx 10 na aba Limpar)
8. **Mover para "Lidos pelo Senova":** apenas emails relevantes (não-irrelevante) + alertas autorizados

### Fontes de autorização (controladas pelo usuário no Perfil)
| Fonte | Onde configurar |
|-------|----------------|
| Domínios/portais | Perfil → chips clicáveis (15 sugeridos + campo custom) |
| Extensão Chrome | Botão "+ Habilitar emails de <domínio>" em qualquer site |
| LinkedIn job alerts | Perfil → "Padrões automáticos" → toggle (OFF por padrão) |
| Adzuna / Gabi | Perfil → "Padrões automáticos" → toggle (OFF por padrão) |
| Google Alerts | Perfil → "Padrões automáticos" → toggle (OFF por padrão) |

### KV keys de email
- `whitelist_dominios` — domínios autorizados pelo usuário
- `blacklist_remetentes` — remetentes/assuntos bloqueados
- `padroes_automaticos` — padrões habilitados: `["linkedin_alertas","adzuna","google_alerts"]`
- `senova_email_vistos_*` — IDs já vistos (evita duplicatas)
- `outlook_folder_lidos` — ID da pasta "Lidos pelo Senova"

### Regras de classificação IA (críticas)
- LinkedIn notificações de rede (aceites, curtidas, aniversários) → **irrelevante**
- Confirmação de candidatura → **irrelevante**
- LinkedIn job alert / vagas → **vaga**
- Headhunter com contato direto → **hunter**
- RH sobre vaga candidatada → **pipeline**

---

## DECISÕES DE PRODUTO — SESSÃO 9 (18/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Consentimento explícito | Senova só lê emails de fontes autorizadas. A IA nunca vê o que não foi autorizado — princípio técnico, não só político |
| Padrões automáticos OFF | LinkedIn alerts, Adzuna, Google Alerts — todos desligados por padrão. Usuário liga o que quer |
| Mover só relevantes | "Lidos pelo Senova" recebe apenas emails que o Senova mostrou ao usuário + alertas autorizados |
| Visão fundacional | Senova inverte o mercado: empresas buscam pessoas, não ao contrário. Documentado em `VISAO_FUNDACIONAL.md` |
| Ética acima do comercial | Nenhum valor comercial supera o moral e o legal — gravado em memória permanente de Bruno |
| Recompensa por contribuição | Toda vez que o usuário melhora o Senova, deve ser recompensado concretamente (a definir em produto) |

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
| ~~B10~~ | ~~Toggle "Lidos pelo Senova" não respondia~~ | ✅ resolvido sessão 9 | — |
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | index.html | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | index.html | **Baixa** (não prioridade agora) |
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
