# CONTEXTO_SESSAO.md
*Gerado automaticamente em 18/mai/2026 — leitura obrigatória ao iniciar sessão*

---

# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 18/mai/2026 — v3.10*

## LEITURA OBRIGATÓRIA AO INICIAR QUALQUER SESSÃO
1. Ler este arquivo completo
2. Nunca propor algo já documentado aqui
3. A próxima tarefa é **Sofia — Passo 1** (ver Pendências Fase 1 abaixo)

---

## COMO ABRIR O CLAUDE CODE
1. Pressione Windows + R → digite cmd → Enter
2. Digite: cd C:\Users\marco\Documents\senova → Enter
3. Digite: claude → Enter

---

## ESTADO ATUAL — v3.10 (18/mai/2026)

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (Cloudflare Worker v7.7)
- **KV:** SENOVA_KV
- **Cron:** 0 10 * * * (07:00 BRT) — varredura automática de vagas
- **Último deploy Worker:** fe350991 (18/mai/2026)

### Variáveis de ambiente (Cloudflare)
- ANTHROPIC_API_KEY ✅
- MS_CLIENT_ID ✅
- MS_CLIENT_SECRET ✅
- MS_REDIRECT_URI ✅
- MS_TENANT_ID = consumers ✅
- ADZUNA_APP_ID = 65c2a129 ✅
- ADZUNA_APP_KEY = b9337363bcd00298b081441121257059 ✅
- HUNTER_API_KEY ✅

### Rotas do Worker v7.7
- POST /api/claude — proxy Anthropic
- POST /api/analisar-vaga — score ATS
- POST /api/varredura-manual — dispara varredura agora
- POST /api/varredura-pais — dispara varredura de país específico
- GET /api/vagas-lead — retorna vagas coletadas
- POST /api/vagas-lead — adiciona vaga capturada pela extensão Chrome
- POST /api/vagas-lead/clear — limpa vagas
- POST /api/vagas-lead/score — atualiza score de vaga no KV
- GET/POST /api/config-varredura — configurações do Perfil
- GET /api/varredura-status — status e log da última execução
- GET /api/auth/outlook — inicia OAuth Microsoft
- GET /api/auth/callback — salva token
- DELETE /api/auth/outlook — desconecta
- GET /api/emails — busca e classifica emails
- POST /api/emails/marcar-visto — marca emails como vistos no KV
- DELETE /api/emails/limpar-vistos — limpa histórico de vistos
- POST /api/emails/responder — responde email via Graph API
- POST /api/emails/enviar — envia email novo via Graph API
- POST /api/calendar/evento — cria evento no Outlook Calendar
- GET/POST/DELETE /api/whitelist — domínios prioritários
- GET /api/sinais-mercado — notícias RSS analisadas por IA (cache diário)
- POST /api/fetch-descricao — fetch de URL externa + strip HTML (v7.7)
- GET /health — status do Worker

---

## O QUE FOI ENTREGUE — sessão 18/mai/2026

### v3.10
- **9 bugs corrigidos (Fase 0):** status 'aplicado', descartado visível, saveVaga preserva tags/campos varredura/data, timeout extração emails, dedup emails por remetente+assunto, descrição varredura (jobDescription||descricao), busca threshold 3→4 chars, Declinar cria card negado quando sem card existente
- **Busca automática de descrição por URL:** botão "🔍 Buscar descrição em [domínio]" quando card tem origemUrl + descrição vazia; `buscarDescricaoAuto()` → POST /api/fetch-descricao → popula vaga-input → analisa automaticamente
- **Worker v7.7:** rota POST /api/fetch-descricao (fetch + strip HTML + limite 4000 chars + timeout 8s)
- **Sofia — diagnóstico completo feito:** estrutura existente mapeada, plano de 10 passos aprovado (Opção A)

---

## BUGS CONHECIDOS (todos os anteriores resolvidos)

### Pendente (aguarda cenário específico)
- **Card não atualiza em tempo real no modal aberto** — sem binding reativo por design; aguardar descrição exata do cenário

---

## PENDÊNCIAS — Por ordem de prioridade

### FASE 1 — MVP para 5 usuários reais

1. **Sofia — PRÓXIMA A EXECUTAR** (iniciar em sessão limpa — contexto estava em 10% ao encerrar)

   **Opção A aprovada:** "Entrevistas" vira "Sofia" no menu, 4 tabs internas.

   **Diagnóstico feito (sessão 18/mai):**
   - Tab 3 (Construir CV): já implementado em `#page-linkedin` — `iniciarSofia()`, 8 perguntas, gera perfil
   - Tab 4 (Simular Entrevista): já implementado em `#page-interview` — PT/EN/ES, 5 perguntas, feedback
   - Onboarding/Tutorial: não existem — tela em branco
   - `PAGES = ['home','ats','linkedin','crm','interview']` — trocar `interview` por `sofia`
   - `sofiaTransferirPerfil()` precisa de `showPage('linkedin')` adicionado ao final
   - IDs existentes (`#sofia-chat`, `#int-chat`, etc.) são preservados — funções não precisam de ajuste

   **10 passos de execução:**
   1. Buscar foto real (Unsplash/Pexels) — mulher brasileira 35–45 anos, profissional, calorosa — validar URL antes de usar
   2. CSS mínimo: `.sofia-tab-nav`, `.sofia-tab-btn`, `.sofia-tab-btn.active`, `.sofia-avatar`
   3. Criar `#page-sofia` com topbar (avatar + "Sofia" + "Assistente de carreira") + tab-nav 4 botões
   4. Tab 1 — Bem-vinda: HTML estático, avatar grande, frase calorosa, 4 cards de capacidades com botão "→ Abrir"
   5. Tab 2 — Tutorial: HTML estático, 6 seções (Home · Análise CV · Pipeline · Perfil · Busca vagas · Fluxo completo)
   6. Tab 3 — Construir CV: mover card "Não tenho CV" + `#sofia-chat-section` do `#page-linkedin` para aqui
   7. Tab 4 — Simular Entrevista: mover conteúdo de `#page-interview` para aqui + `<option value="DE">Deutsch</option>`
   8. Cleanup `#page-linkedin`: remover card "Não tenho CV" + `#sofia-chat-section`; adicionar card compacto "→ Construir CV com Sofia"
   9. `PAGES`: trocar `'interview'` por `'sofia'`; sidebar: `showPage('sofia')`, label "Sofia", ícone atualizado; `sofiaTab(n)` para alternar tabs; `showPage('sofia')` ativa Tab 1 por padrão; `sofiaTransferirPerfil()` + `showPage('linkedin')` ao final
   10. Remover `#page-interview` do HTML; backup `senova_v3_18mai2026f.html`; commit + push

   **Não muda:** Worker, CSS global, cores, fontes, Perfil (upload/otimizador), funções do simulador e Sofia CV

2. **Filtros Plano A/B/C no Pipeline** — verificar se já implementado antes de executar
3. **Aba Perfil — otimização múltiplos portais** — Gupy, Indeed, Catho, Reed, StepStone
4. **Comunidades 50+** — mapear e indicar no Senova
5. **Cursos via Claude** — sugestões por lacuna no perfil
6. **4 idiomas** — interface PT/EN/ES/DE
7. **Michael Page automático** — remetente reconhecido, importação sem tag Revisar
8. **Preenchimento automático nos portais** — autofill
9. **Skill UI/UX-Pro-Max** — instalar no Code

### FASE 2 — MVP Comercial
10. **senova.com.br + multi-usuário** — domínio próprio (R$47/mês) + suporte a múltiplos perfis
11. **Business Plan** — modelo de negócio, precificação, go-to-market, projeções
12. **WhatsApp notificações** — alertas de follow-up, vagas e reuniões via WhatsApp
13. **App mobile (iOS + Android)** — experiência nativa para profissionais 50+ com notificações push, captura de vagas mobile, acesso à Sofia

### Bugs / melhorias menores
- **Dashboard analytics** — métricas avançadas de recolocação
- **Card não atualiza em tempo real no modal aberto** — aguardar cenário específico

---

## REGRAS INVIOLÁVEIS

### CV e Perfil
- RPC/Globo SEMPRE em 2 cargos separados: Gerente (nov/2008–abr/2012) + Diretor (abr/2012–abr/2019)
- Nunca inventar métricas no CV
- Email principal: marcos_mco@hotmail.com — nunca usar marcos@labordei.com.br

### Brand Senova — NUNCA ALTERAR SEM APROVAÇÃO EXPLÍCITA
- Cores: #1A3A5C (navy) · #C9A84C (gold) · #2E6DA4 (action)
- Fontes: Playfair Display + Inter — NUNCA DM Sans
- CSS/cores/layout: não tocar sem aprovação

### Desenvolvimento
- Sempre ler PROJETO.md e VERSOES.md antes de propor qualquer coisa
- Nunca refazer o que já está implementado
- Antes de publicar Worker: confirmar que todas as rotas anteriores estão presentes
- Testar no browser antes de publicar quando possível
- Sempre fazer commit com mensagem descritiva antes de deploy

---

## PERFIL — MARCOS FRANCO

Executivo sênior de marketing, 57 anos, Curitiba/PR
Tel: (41) 99615-2224 | marcos_mco@hotmail.com
LinkedIn: linkedin.com/in/marcos-ribeiro-franco-69153a12
Endereço: Rua José Casagrande, 180 — Vista Alegre — CEP 80820-580

### 3 Planos ativos
- **Plano A:** Recolocação C-Level (CEO/CMO/CSO/Diretor/Head/Gerente Sênior) — R$19–25k CLT — aceita PJ via LaborDei
- **Plano B:** Consultoria via Consigliere (Thiago Ayres)
- **Plano C:** Senova SaaS 50+ (médio prazo)

### Experiência-chave
- RPC/Globo: Gerente (nov/2008–abr/2012) + Diretor (abr/2012–abr/2019) — 30 pessoas, 8 afiliadas, R$500mi
- Popper: Head Expansão (2024–25)
- Consigliere: Consultor Sênior (nov/2025–atual)

### Formação
- Master's Barcelona (2014–15) · MBA FGV (1998–2000) · FAAP Publicidade (1989–93)

### Idiomas
- Português: nativo · Inglês: avançado · Espanhol: avançado · Alemão: NÃO fala

---

## SKILLS DISPONÍVEIS
- skill_linkedin · skill_cv · skill_pesquisa_exec · skill_followup
- skill_dev_senova · skill_produto · skill_business_plan
- skill_market_intel · skill_concorrentes

---

## TOM E COMUNICAÇÃO
- Caloroso, elegante, baixa pressão — nunca incisivo
- Assina sempre: Marcos Franco
- Reserva financeira: 3–4 meses — prioridade é estabilidade, não título

---

# VERSOES.md — Resumo

## Versão atual: v3.10 — 18/mai/2026
**Worker:** v7.7 · **Deploy:** fe350991

### Histórico resumido
| Versão | Data | Destaque |
|--------|------|----------|
| **v3.10** | 18/mai | 9 bugs Fase 0 + busca descrição por URL + Worker v7.7 — **ATUAL** |
| v3.9 | 17/mai | Fluxo Candidatar completo (botão Candidatar + follow-up automático) |
| v3.8 | 17/mai | Limpeza em lote + parsing emails via Claude + badge Revisar |
| v3.7 | 16/mai | Alertas follow-up 3 níveis (7d/14d/21d) |
| v3.6 | 16/mai | Extensão Chrome Senova Capture + Worker v7.6 |
| v3.5 | 16/mai | Hunter.io — email do decisor nos sinais de mercado |
| v3.4 | 16/mai | Sinais de mercado (RSS + IA) |
| v3.3 | 16/mai | Varredura automática Adzuna + Jobicy + OAuth Outlook |
| v3.2 | 15/mai | Modal Editar Vaga + Pipeline drag-and-drop + CRM Contatos |
| v3.1 | 13/mai | Home cockpit + Pipeline base + Worker v6 |

---

# PROJETO.md — Pendências e Stack

## Stack técnica
- **Frontend:** index.html em GitHub Pages (vanilla HTML/CSS/JS, sem build)
- **Worker:** Cloudflare Workers v7.7 (`senova-worker.js`)
- **Auth:** OAuth Microsoft (Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access)
- **KV:** SENOVA_KV (id: e0f1fc09836b48d1be86fcdf217ef7dd)
- **Brand:** #1A3A5C navy · #C9A84C dourado · #2E6DA4 azul · Playfair Display + Inter

## Módulos implementados (✅)
- Análise CV (Anti-ATS) · LinkedIn Optimizer · Pipeline CRM (Kanban 5 colunas)
- Simulador de Entrevista · Varredura automática (Adzuna + Jobicy)
- OAuth Outlook (Mail + Calendar) · Candidatura via Outlook · CRM Contatos
- Extensão Chrome Senova Capture · Sinais de mercado · Busca automática por URL

## Roadmap
- **Fase 1:** Sofia (próxima) → Filtros Plano A/B/C → Otimização portais → 4 idiomas → ...
- **Fase 2:** Business Plan → senova.com.br → Multi-usuário → WhatsApp → App mobile
- **Fase 3:** Sofia completa (Anam.ai, CV Master, simulador avançado)
- **Fase 4:** MVP Comercial (senova.com.br, R$47–97/mês, 5 usuários beta)
