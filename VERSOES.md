# SENOVA — Controle de Versões

## Como funciona o backup
O repositório GitHub mantém o histórico completo de cada `commit`.
Para restaurar qualquer versão anterior:
1. Acesse github.com/marcos-mco/senova
2. Clique em "Commits" (acima da lista de arquivos)
3. Encontre a versão desejada e clique em "Browse files"
4. Abra o `index.html` → clique em "Raw" → Ctrl+A → copiar → publicar

---

## Versões conhecidas

### v3.12.4 — 25/mai/2026 (ATUAL)
**Status:** Completo e validado ✅  
**Commits:** `6d8f578` · `e526447` | **Worker:** `007d2dec` (sem alteração)

#### Histórico de carreira gráfica — VIRGILIO.md (commit `6d8f578`)
- Seção **Histórico completo** adicionada ao perfil do Marcos Franco
- **Editel | Grupo Carvajal**: 2 cargos separados com datas corrigidas — Gerente Nacional de Produção (abr/1996–2001) + Superintendente Regional de Vendas Nordeste (2001–fev/2005)
- **Ghaphical Consult** (1995–1996), **Editora Abril** (1992–1995), **Intec Tecnologia** (1990–1992), **DLS** (1989–1990) documentados
- Regra de uso registrada: bloco gráfico apenas para vagas editorial/gráfica/ISO/telecom
- GANCHO DLS → Heloisa Garrett (LIDE Paraná) registrado
- Informações complementares: ISO 9000 Auditor Líder, docência ESAMC/ESPM + Uniexp, Troféu Imprensa 2004

#### CV_BASE — atualização PT/EN/ES (commit `e526447`)
- **Editel**: entrada única substituída por 2 cargos com datas corrigidas (mai/1999 era incorreto — corrigido para abr/1996–fev/2005)
- **CERTIFICAÇÕES** / CERTIFICATIONS / CERTIFICACIONES: seção nova — ISO 9000 Auditor Líder e membro do comitê
- **PRÊMIOS** / AWARDS / PREMIOS: seção nova — Troféu Imprensa 2004, campanha RSE reciclagem listas telefônicas
- **DOCÊNCIA** expandida: ESAMC/ESPM Maceió/AL (2002–2004) + Uniexp Curitiba/PR (2006) com matérias e períodos completos
- **BLOCO_GRAFICO**: 4 empresas pré-Editel adicionadas com flag HTML `<!-- BLOCO_GRAFICO -->` — incluir apenas para vagas gráfica/editorial/ISO/telecom
- ES: linha `DOCENCIA` adicionada (estava ausente na versão anterior)

---

### v3.12.3 — 22/mai/2026
**Status:** Completo e validado ✅  
**Commits:** `e4fefdf` · `7a4b35d` · `2a4123d` · `619b131` · `2e754ad` · `58c7a94` | **Worker:** `007d2dec`

#### Central de Sinais — 3 bugs (commits `e4fefdf` · `7a4b35d`)
- **Emails lista vazia**: lista expandia sem conteúdo mesmo com emails importados — `_emailsNovosHoje` (stat cumulativo KV) desconectado de `_emailsAvulsos` (fetch atual); mensagem contextual com contador + botão Recarregar
- **Alertas inline**: onclick do `sinal-alertas` redirecionava para Pipeline — `s2.onclick=toggleAlertasInline` ausente em `atualizarSinais()`; overlay `#painel-alertas` removido; lista expande inline com chevron
- **Seta vagas**: chevron do widget vagas não rotacionava ao expandir — `id="sinal-vagas-chevron"` adicionado; `renderWidgetRevisao()` atualiza `transform` ao toggle

#### Email fetch — janela 7 dias (Worker `007d2dec`)
- `$filter=isRead eq false` → `receivedDateTime ge [hoje-7d]` + `$orderby=receivedDateTime desc`
- Resolve: emails de 20–21/mai não processados (já lidos no Outlook; filtro `isRead` os excluía)
- Body limit aumentado 2000 → 5000 chars; `webLink` adicionado ao `$select` e ao objeto de retorno

#### Google Alerts — pipeline de fixes
- **Todos os artigos do digest**: `_alertLinks` itera todos os links (era `.find()`, parava no primeiro); decodifica redirects `google.com/url?url=`
- **Filtro vistos removido dos alertas**: `todosAlertas` extraído antes do filtro KV `vistos` no Worker — alertas sempre retornam mesmo que já vistos
- **Race condition card+mensagem**: `atualizarSinais()` chama `renderAlertasInline()` quando lista está aberta — elimina "recarregue" quando emails chegam com atraso
- **Abertura direta no Outlook Web**: card abre `e.webLink` (Graph API) em nova aba — sem modal, sem renderização de conteúdo; função `abrirModalAlerta` enxugada de 25 para 3 linhas

---

### v3.12.2 — 22/mai/2026
**Status:** Superada ✅  
**Commits:** `f9e1eb4` · `6f5a010` · `186cc61` | **Worker:** Version ID `cd021033`

#### Fix res.ok antes de res.json nas chamadas de email e varredura
- `checkOutlookStatus` (l.4362), `carregarEmails` (l.4856) e `carregarStatusVarredura` (l.2860–2861): adicionado `if(!res.ok) throw new Error(...)` antes de `res.json()` — evitava SyntaxError silencioso quando Worker retornava 502 ou HTML de erro

#### Auto-fetch descrição Adzuna quando jobDesc vazio
- `abrirAntiATSModal()`: quando `jobDesc < 50 chars` e `origemUrl` existe, chama `buscarDescricaoAuto(origemUrl)` automaticamente — resolve campo JD vazio nas vagas importadas pela varredura Adzuna (free tier retorna snippet curto)

#### Fix Google Alerts — separar antes da classificação IA
- **Worker**: `isAlertaFn` definida antes de `novosComConteudo`; alertas separados em `alertas[]` antes de `classificarEmails` — evita que sejam classificados como `irrelevante` e descartados; `return json(...)` inclui campo `alertas` separado; stats calculadas corretamente
- **Frontend** `carregarEmails`: `_sinaisAlertas` lê `data.alertas||[]` diretamente; `isAlerta` inline removida; `emailsVaga` simplificado (alertas nunca chegam em `emails`)

---

### v3.12.1 — 22/mai/2026
**Status:** Superada ✅  
**Commit:** `8036403`

#### Fix regressão — cards do Pipeline não abriam ao clicar
- `vagas.find(x=>x.id===id)` usava `===` estrita: IDs numéricos (criados manualmente, DEFAULT_VAGAS, email-import) nunca encontravam match com ID string vindo do `onclick="openVagaModal('${c.id}')"`
- Corrigido em 3 locais: `openVagaModal` (l.3578), `atualizarBotoesModal` (l.3663), `candidatarDoModal` (l.3702) — tudo com `String(x.id)===String(id)`

---

### v3.12 — 22/mai/2026
**Status:** Completo e validado ✅  
**Commit:** `22ba509`

#### UTF-8 charset no Worker
- `json()` helper (senova-worker.js l.60): `Content-Type: application/json` → `application/json; charset=utf-8`
- Worker deployado: Version ID `716274fc`

#### Modelo IA atualizado
- `claude-sonnet-4-5` → `claude-sonnet-4-6` em 12 chamadas do frontend (replace_all)

#### Lead → Oportunidade (interface only)
- 12 labels da UI renomeados: coluna kanban, stat home, filtro, opção do select, textos de ajuda, mapas de status JS
- Valores internos intactos: `status:'lead'`, `vagas-lead`, localStorage, rotas `/api/vagas-lead`

---

### v3.11 — 21/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_18mai2026f.html (pré-edição)

#### Sofia — implementação completa (10 passos)
- `#page-sofia` criado com 4 tabs: Bem-vinda, Tutorial, Construir CV, Simular Entrevista
- Tab 3 (Construir CV): `#sofia-chat-section` migrado do `#page-linkedin`; ID `sofia-start-btn` centralizado
- Tab 4 (Simular Entrevista): conteúdo de `#page-interview` migrado; idioma DE (Deutsch) adicionado
- `PAGES = ['home','ats','linkedin','crm','sofia']` — `interview` removido
- Sidebar: item "Sofia" com ícone de pessoa; substitui "Entrevistas"
- `sofiaTab(n)` — função de alternância de tabs; `showPage('sofia')` ativa Tab 1 por padrão
- Card compacto "→ Construir CV com Sofia" adicionado ao Perfil (Bloco 2, entre upload e Bloco 3)
- `#page-interview` removido do HTML — sem referências órfãs
- `sofiaTransferirPerfil()` redireciona para `showPage('linkedin')` após transferência

#### Infraestrutura de skills — auditoria e atualização completa (11 skills)
- `session_start.md` criado — protocolo de abertura de sessão com 12 skills obrigatórios
- `skill_sofia.md` criado — personalidade, tom, estágios de relacionamento, testes, entrega de resultados
- `skill_crm.md` reescrito — era duplicata de concorrentes; agora documenta Pipeline (7 colunas) + Contatos + varredura + Outlook
- `skill_dev_senova.md` atualizado — v3.10/Worker v7.7, deploy via git push, MS_TENANT_ID=consumers correto
- `skill_cv.md` — idioma DE/DACH adicionado + pretensão europeia (ES/PT €3.5–5.5k · DE €5–8k)
- `skill_linkedin.md` — mercados ES/PT e DE/DACH (etiqueta Xing) + integração CRM
- `skill_produto.md` + `skill_business_plan.md` — público corrigido para 35+ (era 50+); Sofia nos diferenciais
- `skill_concorrentes.md` — tabela atualizada: Sofia como diferencial exclusivo no simulador
- `skill_pesquisa_exec.md` — territórios DE/ES adicionados + integração CRM ao final
- `skill_followup.md` — Outlook integrado + idiomas ES/DE ao final
- `skill_market_intel.md` — Central de Sinais como destino de sinais processados

---

### v3.10 — 18/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_18mai2026d.html (pré-edição)

#### 9 bugs corrigidos (Fase 0)
- Status não mudava para 'aplicado' ao candidatar pelo Pipeline (`enviarCandidaturaOutlook` res.ok)
- `descartado` invisível no kanban (`colsArq` agora inclui `'descartado'`)
- `saveVaga()` perdia `tags`, campos de varredura (`score`, `classificacao`, `resumo`, `fonte`, `pontos_fortes`) e `data` de follow-up
- `extrairEmpresasCargosBatch` sem timeout → `AbortController` 10s
- Deduplicação de emails checa `emailDest + emailAssunto` (mesmo remetente, vaga diferente = importa)
- Descrição de vagas da varredura não carregava no modal (`jobDescription || descricao`)
- Busca Pipeline com strings curtas gerava falsos positivos (threshold 3 → 4 chars)
- Botão Declinar sem efeito quando sem card: agora cria card `status:'negado'` com timeline

#### Busca automática de descrição por URL
- Quando descrição < 80 chars e card tem `origemUrl`: exibe botão "🔍 Buscar descrição em [domínio]"
- `buscarDescricaoAuto(url)` → `POST /api/fetch-descricao` → Worker faz fetch + strip HTML → popula `vaga-input` → dispara análise
- Worker v7.7: nova rota `POST /api/fetch-descricao` (fetch + strip script/style/nav/header/footer + limite 4000 chars + timeout 8s)
- Fallback: mensagem de erro se URL inacessível ou conteúdo < 200 chars

---

### v3.9 — 17/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_17mai2026b.html (pré-edição)

#### Fluxo Candidatar completo

**Botão "✉ Candidatar" no modal do Pipeline**
- Aparece nos estágios Lead e Aplicado (`data-stages="lead,aplicado"`)
- Card com `atsCV` salvo → salva modal e abre `modal-candidatura` diretamente (sem passar pela tela Análise CV)
- Card sem CV → redireciona para Análise CV (mesmo comportamento do botão "Analisar CV")
- `candidatarDoModal()`: captura `id` antes de `saveVaga()`, reencontra a vaga após save, passa `cv: saved.atsCV || lastCV`

**Fallback `cv` em `abrirModalCandidatura`**
- Novo parâmetro `cv` explícito na assinatura da função
- Usa `cv || lastCV || ''` ao preencher o textarea do CV
- Corrige caso em que `lastCV` zera após reload de página mas `atsCV` já está salvo no card
- Caller `candidatarVagaATS()` atualizado para passar `cv: lastCV`

**Follow-up automático após envio via Outlook**
- Após `enviarCandidaturaOutlook` confirmar `res.ok`:
  - `v.proxima` = `"Follow-up — verificar retorno"`
  - `v.data` = `DD/MM/YYYY` (hoje + 7 dias) → card aparece em Próximas Ações na Home
  - Timeline: `"Follow-up agendado para DD/MM/YYYY"` + `"CV enviado por Outlook para [email]"`

---

### v3.8 — 17/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_17mai2026.html (pré-edição)

#### Limpeza em lote de leads antigos
- Botão "🗂 Limpeza em lote" no topbar do Pipeline (aba Vagas, dourado)
- Painel com filtro por inatividade (padrão 30 dias, editável) + checkboxes de estágio
- Lista scrollável com empresa, cargo, estágio e dias sem atualização (vermelho se >60d)
- "Selecionar todos" toggle + contador de selecionados em tempo real
- Arquiva como `descartado`, registra na timeline de cada card
- Bug corrigido: `parseInt` → `Number()` em `toggleTodosLimpeza` — vagas criadas via email tinham `id: Date.now() + Math.random()` (float); `parseInt` truncava o decimal, tornando o ID do Set diferente do `v.id` real → só cards com IDs inteiros puros eram arquivados
- ID de email corrigido: `id:_t+Math.random()` → `id:_t+Math.floor(Math.random()*10000)` (sempre inteiro)

#### Parsing inteligente de emails via Claude
- `extrairEmpresasCargosBatch()`: uma chamada `/api/claude` para todos os emails do lote
- Claude extrai `{ empresa, cargo, revisar }` por email — empresa contratante (não o remetente), cargo limpo (sem prefixos, sem nome da empresa)
- `revisar: true` quando confiança baixa → fallback: usa assunto como cargo, adiciona `tags: ['Revisar']`
- Badge `⚠ Revisar` (dourado) nos cards do Pipeline para indicar que precisam de revisão manual
- Deduplicação corrigida: checa por `emailDest` em vez de `origemUrl + empresa` (evita duplicatas quando empresa muda pela extração)
- Falha silenciosa: se Claude não responder, comportamento degradado graciosamente

---

### v3.7 — 16/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_16mai2026f.html (pré-edição)

#### Alertas follow-up — 3 níveis de urgência
- `nivelInativo(v)`: retorna 0/1/2/3 baseado no threshold configurável do Perfil (`_diasInativo`, padrão 7d)
  - 0 = ativo · 1 = `×1` (ex: 7d) · 2 = `×2` (ex: 14d) · 3 = `×3` (ex: 21d)
  - Arquivados (aceito/negado/descartado) sempre retornam 0
- `isInativo(v)` mantida como `return nivelInativo(v)>0` — todos os callers existentes sem alteração
- CSS: `.badge-inativo-1` (laranja `#FF6600`) · `.badge-inativo-2` (vermelho `#CC0000`) · `.badge-inativo-3` (vermelho pulsante, `@keyframes pulseInativo`)

#### Pipeline cards — badge e borda por nível
- Nível 1: `⚠ 7d` laranja · borda laranja
- Nível 2: `🔴 14d` vermelho · borda vermelha
- Nível 3: `🚨 21d` vermelho pulsante · borda vermelha

#### Home — Próximas Ações flutua nível 3
- Cards nível 3 **sem data agendada** surfacem automaticamente no topo (antes de todos os outros)
- Cards nível 3 **com data** reordenados antes dos cards de níveis inferiores
- Badge pulsante + fundo `#FFF0F0` nos cards nível 3

---

### v3.6 — 16/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_16mai2026f.html (pré-edição)

#### Extensão Chrome — Senova Capture (Manifest V3)
- `senova-extension/` — pasta standalone, sem frameworks, sem build
- `manifest.json`: MV3, permissions `activeTab` + `scripting`
- `popup.html`: UI navy/gold (340px), campos Cargo, Empresa, URL editáveis antes de salvar
- `popup.js`: extração automática por site via `chrome.scripting.executeScript`:
  - LinkedIn Jobs, Gupy, Indeed/Indeed.com.br, Vagas.com.br, Catho — seletores específicos
  - Fallback genérico: `h1` + `document.title` — funciona em qualquer site
- `generate-icons.html`: Canvas desenha "S" dourado (#C9A84C) em fundo navy (#1A3A5C), auto-download icon16/48/128.png
- Instalação local: `chrome://extensions` → Modo dev → "Carregar sem compactação" → `senova-extension/`

#### Worker v7.6 — POST /api/vagas-lead
- Nova rota `POST /api/vagas-lead`: recebe `{ titulo, empresa, url, descricao }`, cria vaga com `fonte: 'extensao_chrome'` e `badge: 'Extensão Chrome'`, append no array `vagas_lead` do KV
- Vaga capturada aparece no widget "Vagas para revisar" → 1 clique "Importar vagas" → Lead no Pipeline com ATS scoring automático
- Sem autenticação extra — Worker já é público para uso pessoal

---

### v3.5 — 16/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_16mai2026f.html (pré-edição)

#### Worker v7.5 — Hunter.io: email do decisor nos sinais de mercado
- `analisarSinaisMercado()`: prompt atualizado — Claude infere e retorna `"dominio": "empresa.com.br"` junto com a análise; retorna `null` se não souber com certeza
- `buscarEmailHunter(dominio, env)`: chama `GET /v2/domain-search` do Hunter.io, filtra `type === 'personal'`, ordena por prioridade de cargo (Marketing/CMO → CEO/Presidente → Diretor/Head → RH/People → qualquer pessoal)
- Cache KV `hunter_DOMINIO` com TTL 7 dias — evita repetir buscas e protege o free tier (25 buscas/mês)
- `buscarSinaisMercado()`: enriquece sinais com `relevancia >= 4` e `dominio` presente; anexa `email_decisor: { email, nome, cargo }` ao objeto do sinal antes de salvar no KV diário
- Falha silenciosa: se domínio errado ou empresa ausente no Hunter.io, `email_decisor` fica `null` e o card aparece normalmente

#### Frontend — card de email do decisor
- `abrirPainelAlertas()` Bloco A: quando `s.email_decisor` presente, exibe card verde com `📧 email` + nome + cargo + botão "Copiar email"
- Aparece abaixo da caixa azul de sugestão de mensagem — fluxo natural: ver contexto → copiar mensagem → copiar email

---

### v3.4 — 16/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_16mai2026f.html (pré-edição)

#### Worker v7.4 — Sinais de mercado
- Nova rota `GET /api/sinais-mercado` com cache diário no KV (`sinais_mercado_YYYY-MM-DD`, TTL 86400s)
- `buscarGoogleNewsRSS()`: 4 queries temáticas (diretores nomeados, CEO/CMO contratado, expansão mídia, fusão/M&A), timeout 6s, falha silenciosa
- `buscarSinaisMercado()`: deduplicação por título (primeiros 60 chars), filtro por keywords relevantes (`saiu`, `novo ceo`, `nomeou`, `contratou`, `expansão`, `fusão`, `reestruturação`…), limite 5 itens
- `analisarSinaisMercado()`: Claude classifica tipo (movimento_exec / expansao / fusao / outro), relevância 1–5, resumo 1 frase e **sugestão de mensagem** executiva pronta para copiar

#### Central de Sinais — Sinal 2 atualizado
- Sinal 2 combina `_sinaisAlertas` (emails Google Alerts, primário) + `_sinaisMercado` (RSS, complemento)
- Texto dinâmico: "X Google Alerts + Y notícias" ou só emails se RSS vazio
- Se RSS falhar ou retornar vazio: sistema funciona normalmente com emails (Plano B como primário)

#### Painel Alertas redesenhado em 2 blocos
- **Bloco A — Notícias do mercado**: card por notícia com tipo, relevância colorida, empresa, resumo IA, caixa azul com sugestão de mensagem e botão "📋 Copiar mensagem"
- **Bloco B — Google Alerts emails**: lista de alertas recebidos por email (comportamento anterior preservado)

---

### v3.3 — 16/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_16mai2026d.html (pré-edição)

#### Worker v7.3 — Varredura automática de vagas
- Cron diário às 07h BRT (`0 10 * * *`) — busca passiva sem intervenção manual
- **Adzuna API** integrada: BR, ES, DE, PT — vagas formais com salário e empresa
- **Jobicy RSS** integrado: oportunidades remotas globais sem cadastro
- Rotação de países: 1 país por dia (índice salvo no KV) para respeitar free tier Cloudflare Workers
- Score ATS automático na importação: paralelo para todas as vagas, barra de progresso em tempo real
- Score mínimo por região configurável no Perfil (BR: 70 · ES/PT: 55 · DE: 50 · Remoto: 60 · EUA: 65)
- Modal de revisão de vagas abaixo do limiar com botão `+ Adicionar` individual
- Widget **Vagas para revisar** na Home — exibe contagem e lista das vagas pendentes de revisão

#### Deduplicação inteligente na importação
- Ao importar vaga ao Pipeline, compara empresa + título com cards existentes via similaridade de tokens
- Limiar ≥ 60%: exibe modal "Vaga possivelmente duplicada" com botões Sim (ignorar) / Não (adicionar mesmo assim)
- Fila de duplicatas processada sequencialmente — não bloqueia importação das demais vagas

#### OAuth Outlook restaurado (tenant consumers)
- Worker v7.3 restaura todas as rotas OAuth: `/api/auth/outlook`, `/api/auth/callback`, `/api/emails`
- Tenant hardcoded para `consumers` — compatível com conta pessoal Hotmail/Outlook.com
- Auto-refresh de token com `refresh_token` salvo no KV

#### Home redesenhada em duas colunas responsivas
- Coluna esquerda: KPIs (2×2) + Funil + Taxa por canal + Tempo médio por estágio
- Coluna direita: Central de Sinais (topo) → Vagas para revisar → Próximas Ações
- Layout CSS Grid `5fr 7fr`, colapsa para 1 coluna em `< 960px`

#### Próximas Ações — filtro por data concreta
- Exibe apenas cards com data específica definida no modal de drag (formato dd/mm/yyyy)
- Timestamps de criação e datas mês/ano ignorados — evitam falsos positivos
- Ordenação fixa por urgência: ⚠ Vencido (vermelho) → Hoje (azul) → Futuros próximos (âmbar)
- Cards CV Enviado sem prazo não aparecem: já contabilizados no KPI Candidaturas

#### KPIs com tooltips descritivos
- Leads: "vagas identificadas" · Candidaturas: "CV enviado aguardando" · Em processo: "entrevista/contato ativo" · Propostas: "oferta recebida"

---

### v3.10 — 16/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_15mai2026g.html (pré-edição)

#### Fluxo completo Candidatar — envio via Outlook
- `candidatarVagaATS()` agora é `async`: se `lastCV` vazio e `vaga-input` tem ≥80 chars, gera CV automaticamente antes de prosseguir
- Salva card como "CV Enviado" com score ATS, CV e carta antes de abrir modal
- Novo `modal-candidatura`: Para (email recrutador pré-preenchido do card), Assunto pré-preenchido ("Candidatura — [Cargo] — Marcos Franco"), Carta editável (usa carta gerada ou texto padrão), CV otimizado editável (monospace)
- Botão "Enviar pelo Outlook" → `POST /api/emails/enviar` → Graph API `POST /v1.0/me/sendMail` (email novo, não reply; salva em Enviados)
- Após envio: registra "CV enviado por Outlook para [email]" na timeline do card + mensagem da Sofia
- 401/reauth: botão muda para "🔑 Conectar Outlook" + `confirm()` abre OAuth; erro genérico: retry ativo
- Worker: novo endpoint `POST /api/emails/enviar`

#### Fixes Pipeline (v3.10 junto)
- Modal Editar Vaga: `padding-bottom: 140px → 24px` no `.modal-body` — elimina scroll desnecessário
- Botão Candidatar: email lido de `vagas[idx].emailDest` (valor salvo) em vez de `atsEmailDest` stale
- URL LinkedIn/vaga: `verOrigem()` e `verOrigemCard()` normalizam para `https://` se protocolo ausente — fix "abre página de login"

---

### v3.9 — 15/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_15mai2026f.html (pré-edição)

#### Fix: Central de Sinais sempre visível na Home
- Causa raiz: `sinal-emails` ficava oculto quando `_sinaisEmails.classificados === 0`, mesmo após fetch concluído
- Adicionada flag `_emailsCarregados`: falsa até o primeiro `carregarEmails` completar — enquanto isso o item fica oculto (sem Outlook conectado = sem sinal)
- Após primeiro fetch: exibe "Nenhum email novo" (0 emails), "N emails aguardando resposta" (avulsos sem novos leads) ou contagem normal
- `_emailsAvulsos[]` preservado entre navegações: só sobrescreve se chegarem novos emails (evita lista sumir ao voltar à Home)
- Título "Central de Sinais" fixo no header da seção, independente do estado

---

### v3.8 — 15/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_15mai2026f.html (pré-edição)

#### Resposta a emails avulsos via Outlook
- Worker: novo endpoint `POST /api/emails/responder` — chama Graph API `POST /v1.0/me/messages/{id}/reply` com `{ comment }` para envio direto (sem rascunho)
- `sinal-emails` na Central de Sinais agora expande/colapsa lista inline (toggle com chevron) em vez de navegar para o CRM
- `_emailsAvulsos[]` armazena emails relevantes após `carregarEmails()` para exibição persistente
- Cada email card exibe: categoria com emoji IA, data/hora, assunto, remetente, prévia do resumo
- Botão ↩ Responder abre modal com corpo do email pré-preenchido, geração de resposta via IA (mesmo padrão Análise CV) e envio direto pelo Outlook
- Em sucesso: "✓ Enviado!" fecha modal após 1,2s; em erro: botão ativo para retry

---

### v3.7 — 15/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_15mai2026e.html (pré-edição)

#### Fix: busca Pipeline quebrada ao navegar entre páginas e voltar ao CRM
- Causa raiz: `showPage('crm')` forçava `crm-filter-bar` para `display:flex` sem verificar `crmCurrentTab`
- Se o usuário estava na aba Contatos, saía para outra página e voltava ao CRM, o Pipeline filter bar ficava visível mas o kanban permanecia oculto (`display:none` do `setCrmTab` anterior)
- Digitar no campo de busca filtrava vagas internamente mas o kanban não aparecia → aparência de busca quebrada
- Fix: `showPage('crm')` agora restaura `crm-filter-bar`, `crm-vagas` e `crm-contatos` de acordo com `crmCurrentTab`

---

### v3.6 — 15/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_15mai2026e.html (pré-edição)

#### Fix: Busca CRM Contatos
- Causa raiz: `crm-filter-bar` (campo "Buscar empresa, cargo…" do Pipeline) permanecia visível ao alternar para a aba Contatos, fazendo o usuário digitar no campo errado sem efeito na lista
- `setCrmTab('contatos')` agora esconde `crm-filter-bar`; `setCrmTab('vagas')` a restaura
- Mínimo de caracteres para busca de contatos reduzido de 3 para 2

---

### v3.5 — 15/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_15mai2026e.html (pré-edição)

#### Agendar no Outlook — chamada real à Microsoft Graph API
- Worker: `/api/calendar/evento` retorna `reauth: true` + `url_auth` no 401 (sem token ou token expirado)
- Frontend: lê JSON da resposta; em sucesso mostra "✓ Agendado!" e fecha modal após 1,2s
- Em 401/reauth: botão muda para "🔑 Conectar Outlook" + `confirm()` abre fluxo OAuth
- Em erro genérico: "Erro — tentar novamente" — modal permanece aberto para retry

#### Home — Próximas Ações inclui contatos CRM
- Contatos com `nextData` ≤ 3 dias aparecem abaixo das vagas com separador "CRM — Contatos"
- Badge **⚠ Atrasado** (vermelho) se data passou, **Hoje** (azul) se é hoje, **⏰ Urgente** (âmbar) se ≤3 dias
- Exibe nome do contato, texto da próxima ação, data DD/MM/YYYY
- Clicar abre modal do contato diretamente

---

### v3.4 — 15/mai/2026
**Status:** Completo e validado ✅  
**Backup:** senova_v3_15mai2026d.html (pré-edição)

#### CRM Contatos — Próxima Ação obrigatória + Outlook
- Campo Próxima Ação obrigatório: impede salvar sem preencher, exibe erro inline e foca o campo
- Campo de data ao lado da próxima ação (input type=date, 148px)
- Botão 📅 Agendar no Outlook aparece dinamicamente quando ambos os campos estão preenchidos
- `salvarEAgendarOutlook()`: salva contato silenciosamente e cria evento de 30min no Outlook Calendar via `/api/calendar/evento`
- Badges de urgência no card da lista: ⚠ Atrasado (vermelho #CC0000) se data ultrapassada, ⏰ Urgente (âmbar #B8670A) se ≤3 dias
- Data formatada DD/MM/YYYY exibida ao lado do texto da próxima ação no card

---

### v3.3 — 15/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_15mai2026.html (pré-edição)

#### Dashboard Pipeline — Home
- Funil visual: Lead → CV Enviado → Em Contato → Entrevista → Proposta com barras proporcionais, contagem e %
- Total ativas vs arquivadas no header do funil
- Taxa de retorno por canal (retorno = chegou a contato/entrevista/proposta/aceito): mostra X/Y e taxa%, exige ≥2 vagas por canal, "—" se insuficiente
- Tempo médio por estágio: dias desde última movimentação por estágio ativo, código de cores (verde ≤7d, âmbar ≤14d, vermelho >14d)
- Seção renderizada por `renderDashboardPipeline()`, chamada automaticamente em `atualizarStatsHome()`

---

### v3.2 — 15/mai/2026
**Status:** Superada ✅  
**Backup:** senova_v3_14mai2026g.html (pré-edição)

#### Modal Editar Vaga
- Estrutura flex definitiva: body com scroll, rodapé fixo sempre visível
- Campo Notas acessível (não cortado pelo rodapé)
- Botões organizados em linha única no rodapé, altura mínima 44px
- Botões contextuais por estágio no modal

#### Fluxo Análise CV → Candidatura
- Fluxo Analisar CV usa ID da vaga como fonte primária (não nome)
- Candidatar/Declinar com 3 caminhos: mailto, portal, headhunter
- Carta de Apresentação gerada por IA — visível na aba Análise CV após análise
- Responder Email — sempre visível após análise, abre modal de resposta ao recrutador

#### Pipeline CRM
- Drag-and-drop funcional entre colunas — muda status e salva no KV
- Mini-modal de próxima ação obrigatória ao mover card entre colunas
- Busca em tempo real — filtra empresa/cargo, não exibe arquivados
- Filtros pill globais: prioridade, canal, coluna — com contador de resultados
- Filtros por coluna individuais no Pipeline
- Colunas Aceito/Negado arquivadas — visíveis via botão "X arquivados"
- Contador de vagas ativas no header do Pipeline
- Anti-ATS renomeado para "Análise CV" em toda a interface

#### Cards e datas
- createdAt (imutável) e updatedAt separados em todos os cards
- Retroatividade: migração automática de vagas sem data
- Data e horário completos nos cards (dia, mês, hora visíveis)
- Alerta de inatividade configurável (padrão 7 dias, ajustável no Perfil)
- Badge vermelho automático nos cards parados além do threshold
- Botão Avançar estágio no campo Próxima Ação do modal

#### Timeline e Outlook
- Timeline por card: histórico de eventos — criado, movido, email enviado, candidatura
- OAuth ampliado para Calendars.ReadWrite (prompt=consent para forçar re-consentimento)
- Toggle switch Outlook no header da Home — conecta/desconecta sem trocar de tela
- Campo "Lembrar em" → cria evento de follow-up no Outlook Calendar via Graph API
- Timeline simplificada — só eventos relevantes, sem ruído

#### Home — Cockpit
- Dashboard com 4 widgets: Leads, CV Enviado, Em Contato, Propostas
- Filtros da Home: prioridade, canal, ordenar
- Próximas Ações com acento correto — clique abre card direto no Pipeline
- Central de Sinais: emails + Google Alertas + inativos, classificados por IA
- Cores de prioridade unificadas e de alto contraste: Alta=#CC0000, Média=#0066CC, Baixa=#008800
- Menu lateral reordenado: Home → Perfil → Análise CV → Processos → Entrevistas

#### CRM Contatos
- Módulo evoluído: empresa, email, telefone, LinkedIn, canal, vaga vinculada
- Nota LinkedIn + botão Comunicação (responder / follow-up / nota interna)
- Central de Comunicação por contato: histórico de interações por canal
- Timeline por contato — espelha o mesmo modelo de timeline das vagas

#### Sofia
- Seção de entrada do CV esboçada na aba Perfil
- Mockup aprovado — implementação da lógica pendente para Fase 3

---

### v3.1 — 13/mai/2026
**Status:** Base para v3.2 — superada ✅  
**Backup:** senova_v3_13mai2026.html

- Home cockpit com Próximas Ações
- "Você tem X emails novos" como item de ação
- Emails relevantes → coluna Lead do Pipeline automaticamente
- Clicar na tarefa → abre card do Pipeline
- Clicar no card → abre Análise CV pré-preenchida
- Análise CV chama Worker v6 (sem erro CORS)
- Filtros no Pipeline: prioridade, canal, ordenação
- Cards com data e hora
- Campo email destinatário + botão Enviar CV via Outlook
- Campo URL de origem + botão Ver Origem
- Botões Candidatar / Declinar no Anti-ATS
- PDF Executivo design navy/dourado
- Coluna Lead no Kanban
- Worker v6 integrado (senova-proxy.marcos-mco.workers.dev)
- Bug grave corrigido: CV gerado em .docx real (html-docx-js CDN)
- Drag-and-drop inicial no Kanban

---

### v2 — 06/mai/2026
**Status:** Base funcional sem integrações completas  
**Funcionalidades:** Anti-ATS, LinkedIn, Pipeline CRM básico, Entrevista

---

### v1 — abr/2026
**Status:** Versão inicial  
**Funcionalidades:** Landing page + Anti-ATS básico

---

## Worker v7.7 — Cloudflare
- URL: senova-proxy.marcos-mco.workers.dev
- KV binding: SENOVA_KV
- OAuth: /consumers/ (conta pessoal Hotmail marcos_mco@hotmail.com)
- Vars obrigatórias: ANTHROPIC_API_KEY, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI, MS_TENANT_ID
- Scopes OAuth ativos: Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access
- Cron: `0 10 * * *` (07h BRT) — varredura automática Adzuna + Jobicy
- Deploy atual: `007d2dec` (22/mai/2026)

## Regra de ouro
**Antes de qualquer sessão de desenvolvimento:**
1. Ler este arquivo e o PROJETO.md antes de começar
2. Salvar backup com nome senova_v[N]_[data].html ANTES de modificar
3. Ao final da sessão, atualizar este arquivo com as mudanças feitas
