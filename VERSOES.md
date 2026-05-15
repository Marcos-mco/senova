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

### v3.4 — 15/mai/2026 (ATUAL)
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

## Worker v6 — Cloudflare
- URL: senova-proxy.marcos-mco.workers.dev
- KV binding: SENOVA_KV
- OAuth: /consumers/ (conta pessoal Hotmail marcos_mco@hotmail.com)
- Vars obrigatórias: ANTHROPIC_API_KEY, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI, MS_TENANT_ID
- Scopes OAuth ativos: Mail.Read + Calendars.ReadWrite + offline_access

## Regra de ouro
**Antes de qualquer sessão de desenvolvimento:**
1. Ler este arquivo e o PROJETO.md antes de começar
2. Salvar backup com nome senova_v[N]_[data].html ANTES de modificar
3. Ao final da sessão, atualizar este arquivo com as mudanças feitas
