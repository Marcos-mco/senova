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

### v3.4 — 16/mai/2026 (ATUAL)
**Status:** Completo e validado ✅  
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

## Worker v7.3 — Cloudflare
- URL: senova-proxy.marcos-mco.workers.dev
- KV binding: SENOVA_KV
- OAuth: /consumers/ (conta pessoal Hotmail marcos_mco@hotmail.com)
- Vars obrigatórias: ANTHROPIC_API_KEY, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI, MS_TENANT_ID
- Scopes OAuth ativos: Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access
- Cron: `0 10 * * *` (07h BRT) — varredura automática Adzuna + Jobicy

## Regra de ouro
**Antes de qualquer sessão de desenvolvimento:**
1. Ler este arquivo e o PROJETO.md antes de começar
2. Salvar backup com nome senova_v[N]_[data].html ANTES de modificar
3. Ao final da sessão, atualizar este arquivo com as mudanças feitas
