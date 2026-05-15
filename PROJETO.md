# Senova Suite — Documento de Projeto
**Versão:** 3.1 · **Atualizado:** 15/mai/2026 · **Responsável:** Marcos Franco

---

## STATUS 15/mai/2026

### ✅ IMPLEMENTADO

- Bug .docx corrigido
- Drag and drop no kanban
- Modal — Notas visível, botões organizados, rodapé fixo
- Próximas Ações com acento e clique abre card direto
- Fluxo Analisar CV → Candidatar/Declinar com 3 caminhos (mailto, portal, headhunter)
- Filtros por coluna no Pipeline + filtros pill globais
- Alerta de inatividade configurável (padrão 7 dias, ajustável no Perfil)
- Próxima ação obrigatória ao mover card entre colunas
- Nota LinkedIn + botão Comunicação (responder/follow-up/nota) no CRM Contatos
- Carta de apresentação + Responder Email na aba Análise CV
- Anti-ATS renomeado para Análise CV em toda a interface
- Dashboard Home com 4 widgets (Leads, CV Enviado, Em Contato, Propostas)
- Cores prioridade unificadas: Alta=#CC0000, Média=#0066CC, Baixa=#008800
- Data e horário completos nos cards
- Filtros Home (prioridade, canal, ordenar)
- Menu lateral: Home → Perfil → Análise CV → Processos → Entrevistas
- Central de Sinais na Home (emails + Google Alertas + inativos)
- Toggle Outlook liga/desliga
- Calendário Outlook integrado (Calendars.ReadWrite)
- Timeline por card em vagas e contatos
- Campo Lembrar em → cria evento no Outlook
- CRM Contatos evoluído (empresa, email, tel, LinkedIn, timeline, comunicação IA)
- Colunas Aceito/Negado arquivadas, visíveis via botão X arquivados
- Busca em tempo real no Pipeline
- Remote Control ativo
- createdAt/updatedAt separados em todos os cards
- Sofia — mockup aprovado, implementação pendente

### ⬜ PENDENTE — Fase 1

- Testar e corrigir carta de apresentação (seções não aparecem após análise)
- Falso positivo na busca (Straumann aparece ao buscar omi)
- Dashboard Pipeline mais rico (taxa de retorno, tempo médio no funil, métricas por canal)
- Botão Candidatar com fluxo completo funcionando
- Claude in Chrome para capturar vagas — estruturar fluxo
- Cursos via API Claude customizável no Perfil
- Aba Perfil — otimizar para múltiplos portais além do LinkedIn
- Responder email avulso na Home sem vaga associada
- Campo Tipo no CRM Contatos (Headhunter/CEO/Diretor/Pessoal)
- IA sugere momento certo de reativar contato frio

### ROADMAP

- Fase 1 — Aprovar todas as pendências + lista fechada do MVP
- Fase 2 — Business Plan (modelo de negócio, precificação, go-to-market, projeções)
- Fase 3 — Sofia (Anam.ai, CV Master, adaptação por portal, simulador entrevistas)
- Fase 4 — MVP Comercial (senova.com.br, R$47-97/mês, validação 5 usuários 50+)

### STACK TÉCNICA

- Frontend: index.html hospedado em marcos-mco.github.io/senova
- Worker: senova-proxy.marcos-mco.workers.dev (Cloudflare Workers v6)
- Auth: OAuth Microsoft (Mail.Read + Calendars.ReadWrite + offline_access)
- KV: SENOVA_KV
- Brand: #1A3A5C navy, #C9A84C dourado, #2E6DA4 azul — Playfair Display + Inter
- Email principal: marcos_mco@hotmail.com
