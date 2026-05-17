# Senova Suite — Documento de Projeto
**Versão:** 3.3 · **Atualizado:** 16/mai/2026 · **Responsável:** Marcos Franco

---

## STATUS 16/mai/2026

### ✅ IMPLEMENTADO

- Bug .docx corrigido
- Drag and drop no kanban
- Modal — Notas visível, botões organizados, rodapé fixo
- Fluxo Analisar CV → Candidatar/Declinar com 3 caminhos (mailto, portal, headhunter)
- Filtros por coluna no Pipeline + filtros pill globais
- Alerta de inatividade configurável (padrão 7 dias, ajustável no Perfil)
- Próxima ação obrigatória ao mover card entre colunas
- Nota LinkedIn + botão Comunicação (responder/follow-up/nota) no CRM Contatos
- Carta de apresentação + Responder Email na aba Análise CV
- Anti-ATS renomeado para Análise CV em toda a interface
- Dashboard Home com funil, taxa por canal e tempo médio por estágio
- KPIs com tooltips descritivos (Leads / Candidaturas / Em processo / Propostas)
- Cores prioridade unificadas: Alta=#CC0000, Média=#0066CC, Baixa=#008800
- Data e horário completos nos cards
- Menu lateral: Home → Perfil → Análise CV → Processos → Entrevistas
- Central de Sinais na Home (emails + Google Alertas + inativos) — sempre visível
- Toggle Outlook liga/desliga no header
- OAuth Outlook restaurado com tenant `consumers` (conta pessoal Hotmail)
- Calendário Outlook integrado (Calendars.ReadWrite)
- Envio de candidatura via Outlook (Mail.Send) com carta e CV no corpo
- Resposta a emails avulsos via Outlook (Graph API reply)
- Timeline por card em vagas e contatos
- CRM Contatos evoluído (empresa, email, tel, LinkedIn, timeline, comunicação IA)
- CRM Contatos — próxima ação obrigatória + data + botão Agendar no Outlook
- Colunas Aceito/Negado arquivadas, visíveis via botão X arquivados
- Busca em tempo real no Pipeline; busca CRM Contatos funcional
- createdAt/updatedAt separados em todos os cards
- Home redesenhada em duas colunas responsivas (CSS Grid 5fr/7fr, colapsa em 960px)
- Próximas Ações: só cards com data concreta definida, ordenados por urgência
- **Varredura automática de vagas** — cron 07h BRT, Adzuna (BR/ES/DE/PT) + Jobicy remoto
- Rotação de países por dia (free tier Cloudflare)
- Score ATS automático na importação com progresso em tempo real
- Score mínimo por região configurável no Perfil
- Modal de revisão de vagas abaixo do limiar + widget na Home
- Deduplicação inteligente na importação (similaridade token título+empresa)
- Sofia — mockup aprovado, implementação pendente

### ⬜ PENDENTE — Próximas prioridades

1. **Alertas follow-up** — lembrete automático em 7, 14 e 21 dias após CV enviado sem retorno
2. **Limpeza de leads antigos** — 298 leads acumulados, maioria desatualizada; fluxo de arquivamento em lote
3. **Fluxo Candidatar completo** — gerar CV otimizado → enviar via Outlook → registrar na timeline → follow-up agendado

### ROADMAP

- Fase 1 — Aprovar pendências acima + lista fechada do MVP
- Fase 2 — Business Plan (modelo de negócio, precificação, go-to-market, projeções)
- Fase 3 — Sofia (Anam.ai, CV Master, adaptação por portal, simulador entrevistas)
- Fase 4 — MVP Comercial (senova.com.br, R$47-97/mês, validação 5 usuários 50+)

### STACK TÉCNICA

- Frontend: index.html hospedado em marcos-mco.github.io/senova
- Worker: senova-proxy.marcos-mco.workers.dev (Cloudflare Workers **v7.3**)
- Auth: OAuth Microsoft (Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access)
- KV: SENOVA_KV
- Cron: `0 10 * * *` (07h BRT) — varredura Adzuna + Jobicy
- Brand: #1A3A5C navy, #C9A84C dourado, #2E6DA4 azul — Playfair Display + Inter
- Email principal: marcos_mco@hotmail.com
