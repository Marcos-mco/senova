# Revisão Completa do Senova — Bruno (Opus 4.8)
*Data: 17/jun/2026 · 100% acatada por Marcos · Base: index.html v3.34, worker v7.3, extensão v2.14*

---

## STATUS: APROVADO INTEGRALMENTE — EXECUTAR POR SPRINTS

---

## BUGS NOVOS IDENTIFICADOS

| # | Severidade | Descrição | Arquivo |
|---|-----------|-----------|---------|
| B-NOVO-1 | Alto | B5 do VIRGILIO é fantasma — Worker já usa sonnet-4-6, zero ocorrências de 4-5 | VIRGILIO.md (marcar resolvido) |
| B-NOVO-2 | Médio | Dashboard ainda mostra "Em Contato" (coluna removida Sessão 5). `STAGE_LABEL` e `atualizarStatsHome` ainda agrupam `status==='contato'` | index.html |
| B-NOVO-3 | Médio | Duas taxonomias coexistem: código usa `negado`+`descartado` separados; decisão diz "unificados em Arquivado" | index.html |
| B-NOVO-4 | Baixo | Auto-check e Analisar podem disparar simultaneamente no mesmo card — sem flag de "análise em curso" | index.html |
| B-NOVO-5 | Baixo | `gerarId` usa hash 32-bit (`h\|=0`) — risco baixo de colisão silenciosa no KV | senova-worker.js |

---

## SEGURANÇA

### VULNERABILIDADE 1 — XSS via URL de email (ALTA — corrigir antes de deploy público)
- `<a href="${url}">` e `window.open('${e.webLink}','_blank')` injectam URLs cruas de emails sem validação
- Um email malicioso com `javascript:alert(...)` executa script com acesso a todo o localStorage (CV, processos, perfil)
- **Fix:** função `urlSegura(u)` que valida `u.startsWith('http')`; para `onclick` com webLink usar `data-` attribute + listener

### VULNERABILIDADE 2 — Worker proxy aberto (MÉDIA)
- `/api/claude` com `Access-Control-Allow-Origin: *` aceita qualquer origem
- Quem descobrir o URL usa a chave Anthropic do Marcos
- **Fix:** restringir CORS a `marcos-mco.github.io`

### VULNERABILIDADE 3 — Token Outlook único no KV (BAIXA / bloqueante para multi-user)
- Mono-utilizador hardcoded — bloqueante para qualquer versão comercial

---

## QUALIDADE DE CÓDIGO

- **Lógica de cor duplicada em 4 sítios** — `score>=75?'#1A7A4A':score>=55?'#B8670A'...'` repetido. Criar `corDoScore(score)` e `classificacaoDoScore(score)`
- **Configuração de modelo espalhada por 14 chamadas** — criar `const MODELOS={analise:'claude-opus-4-8', rapido:'claude-sonnet-4-6'}`
- **localStorage a aproximar-se do limite** — `atsCV`/`atsCarta` são regeneráveis, não precisam de ser persistidos (100 cards ≈ ~5 MB)
- **`saveVagas()` dispara re-render em cascata** (home + stats + sinais) a cada gravação — redundante em fluxos com múltiplas gravações

---

## UX / REDACÇÃO

**Positivo:** "Ótima oportunidade / Pode valer a pena / Fora do seu perfil" é o registo certo para 40+. Empty states claros. Regra OMIT bem aplicada.

**A corrigir:**
- "MATCH SCORE" aparece cru no output da análise ATS — inconsistente com "ANÁLISE" no resto
- "Fit Técnico" pode vazar no texto de saída da Sofia (está no prompt interno)
- "Candidatar" via Outlook ainda existe na tela ATS standalone (decisão Sessão 5: REMOVIDO)
- Painel "Como quer prosseguir?" tem 8 checkboxes — sobrecarga de escolha para executivo 40+
- Dois scores para a mesma vaga (extensão sonnet vs. card opus) pode confundir — utilizador vê 62% e depois 78%

---

## FEATURE A — ATS ao importar + ordenar Kanban por score

**Decisão: fazer em modo HÍBRIDO LAZY-BATCH, nunca eager-total**

Custo eager-total: ~30 vagas/dia × 5500 tokens × 30 dias ≈ 5M tokens/mês, maioria nunca aberta. Viola "prudência no consumo de API".

**Implementação aprovada:**
1. Só auto-analisar vagas que passam no pré-filtro de título + país prioritário (já existe `tituloRelevante`)
2. Resto: badge "Não analisada" + análise em lote sob demanda ao entrar em Oportunidades
3. Ordenação: `vagas.sort((a,b)=>(b.atsScore||0)-(a.atsScore||0))` — trivial no frontend
4. Cache por `gerarId` no KV — nunca re-analisar a mesma vaga

---

## FEATURE B — Emails lidos → pasta "Lidos pelo Senova" no Outlook

**Decisão: fazer, opt-in, default OFF, só categorias de baixo valor**

- Graph API: `POST /me/messages/{id}/move` com `{"destinationId":"<folderId>"}` — suportado nativamente
- Zero novas permissões: `Mail.ReadWrite` já está pedido
- Criar pasta lazy + guardar `folderId` no KV
- **NÃO mover** categorias `positivo`/`pipeline` — risco de esconder convites de entrevista
- Implementar dentro do `ctx.waitUntil` que já existe em `/api/emails`

---

## ECONOMIA DE TOKENS

**Maior poupança, menor esforço: Prompt Caching**
- `PERFIL_MARCOS` (~400 tokens) e system prompts são reenviados em CADA chamada sem `cache_control`
- `cache_control:{type:'ephemeral'}` corta ~90% do custo desses tokens repetidos
- Estimativa combinada (caching + opus→sonnet por defeito + Feature A lazy): **50-70% de redução mensal**

**Mover CV de opus→sonnet por defeito** — reservar opus só para "análise completa" / PDF Premium explícito

---

## VISÃO COMERCIAL

**Diferenciadores únicos (nenhum concorrente faz):**
1. Análise contra "Projeto de Vida" — Huntr/Teal/Simplify fazem tracking; nenhum avalia vaga contra valores e vida desejada
2. Sofia como conselheira honesta — tom sem eufemismos, genuinamente diferenciador
3. **O ângulo anti-etarismo é activo de produto** — executivo 50+ quer ferramenta que entende que experiência é valor, não passivo. Diferencial de confiança que nenhuma startup VC consegue copiar autenticamente

**Modelo de pricing sugerido:**
- **Grátis:** tracking ilimitado + 3 análises completas/mês
- **Pago (~R$39-59/mês):** análises ilimitadas, Sofia ilimitada, CV/carta ilimitados, sinais, contactos
- Evitar pricing "por candidatura" — penaliza o comportamento que se quer incentivar

**Pré-requisito absoluto para monetizar:** resolver mono-utilizador (token Outlook único, perfil único no KV)

---

## AVALIAÇÃO GERAL

**Nota: 7,0 / 10**
- Como produto pessoal para Marcos: 8,5
- Como base comercial: 5,5
- Produto sólido com débito identificável e resolúvel — não protótipo frágil

**3 pontos mais fortes:**
1. Diferenciação real — Projeto de Vida + Sofia + anti-etarismo. Ninguém faz isto.
2. Arquitectura pragmática e correcta — proxy obrigatório, fallbacks, lazy analysis. Decisões maduras.
3. UX writing acima da média para o público-alvo

**3 riscos mais críticos:**
1. XSS via URL de email — acesso a todo o localStorage
2. Mono-utilizador hardcoded — bloqueador absoluto de versão comercial
3. Divergência código vs. documentação (bugs fantasma, status residuais)

---

## ROADMAP DE SPRINTS — APROVADO

### Sprint A — Segurança + Saneamento
- [ ] Função `urlSegura(u)` — corrigir XSS em URLs de email (artigos + webLink)
- [ ] Restringir CORS do Worker a `marcos-mco.github.io`
- [ ] Unificar taxonomia: `negado`+`descartado`→`arquivado`, remover `contato` do dashboard
- [ ] Marcar B5 como resolvido no VIRGILIO
- [ ] Criar `corDoScore(score)` + `classificacaoDoScore(score)` — eliminar duplicação
- [ ] Criar `const MODELOS` central

### Sprint B — Economia de Tokens + Feature B (Outlook)
- [ ] Prompt caching no Worker (`cache_control: ephemeral`) para PERFIL_MARCOS e system prompts
- [ ] CV opus→sonnet por defeito; opus só para análise explícita/Premium
- [ ] Feature B: mover emails para "Lidos pelo Senova" — opt-in, default OFF, só baixo valor

### Sprint C — Feature A + Ordenação Kanban
- [ ] Análise lazy-batch com cache por `gerarId` no KV
- [ ] Ordenação/filtro por score no Kanban
- [ ] Badge "Não analisada" para vagas sem score

---

## PENDÊNCIA FUTURA — Análise Linear de Processo
*Registada por Marcos em 17/jun/2026:*
Marcos quer uma análise linear do processo completo do Senova (do primeiro contato com uma vaga até ao resultado final), mapeando cada etapa, decisão, intervenção da IA e acção do utilizador. A fazer quando o estado Oportunidade estiver totalmente aprovado e antes de construir CV Enviado.

---

*Documento gerado por Bruno (Claude Opus 4.8) em 17/jun/2026*
*Acatado integralmente por Marcos em 17/jun/2026*
