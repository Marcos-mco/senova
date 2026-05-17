# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 16/mai/2026 — v3.4*

## LEITURA OBRIGATÓRIA AO INICIAR QUALQUER SESSÃO
1. Ler este arquivo completo
2. Ler PROJETO.md
3. Ler VERSOES.md
4. Nunca propor algo já documentado nesses arquivos

---

## COMO ABRIR O CLAUDE CODE
1. Pressione Windows + R → digite cmd → Enter
2. Digite: cd C:\Users\marco\Documents\senova → Enter
3. Digite: claude → Enter

---

## ESTADO ATUAL — v3.4 (16/mai/2026)

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (Cloudflare Worker v7.4)
- **KV:** SENOVA_KV
- **Cron:** 0 10 * * * (07:00 BRT) — varredura automática de vagas
- **Último commit estável:** ver git log

### Variáveis de ambiente (Cloudflare)
- ANTHROPIC_API_KEY ✅
- MS_CLIENT_ID ✅
- MS_CLIENT_SECRET ✅
- MS_REDIRECT_URI ✅
- MS_TENANT_ID = consumers ✅
- ADZUNA_APP_ID = 65c2a129 ✅
- ADZUNA_APP_KEY = b9337363bcd00298b081441121257059 ✅

### Rotas do Worker v7.4
- POST /api/claude — proxy Anthropic
- POST /api/analisar-vaga — score ATS
- POST /api/varredura-manual — dispara varredura agora
- POST /api/varredura-pais — dispara varredura de país específico
- GET /api/vagas-lead — retorna vagas coletadas
- POST /api/vagas-lead/clear — limpa vagas
- GET/POST /api/config-varredura — configurações do Perfil
- GET /api/varredura-status — status e log da última execução
- GET /api/auth/outlook — inicia OAuth Microsoft
- GET /api/auth/callback — salva token
- DELETE /api/auth/outlook — desconecta
- GET /api/emails — busca e classifica emails
- POST /api/emails/responder — responde email
- POST /api/emails/enviar — envia email
- POST /api/calendar/evento — cria evento Outlook
- GET/POST/DELETE /api/whitelist — domínios prioritários
- GET /api/sinais-mercado — notícias RSS analisadas por IA (cache diário)
- GET /health — status do Worker

---

## VARREDURA AUTOMÁTICA — Como funciona

### Fontes ativas
- Adzuna API (BR, ES, DE, PT, US) — App ID: 65c2a129
- Jobicy RSS (remoto global) — sem chave necessária

### Rotação de países
Cada execução do cron varre 1 país por vez:
BR → ES → DE → PT → Remoto → BR → ...
Índice salvo em KV: rotacao_idx

### Score por região (configurável no Perfil)
- Brasil: 70
- Espanha/Portugal: 55
- Alemanha: 50
- Remoto: 60
- EUA: 65

### Fluxo de importação
1. Cron coleta vagas brutas (sem score) → salva em KV vagas_lead
2. Usuário clica "Importar vagas" no Pipeline
3. Frontend analisa em paralelo via /api/analisar-vaga
4. Vagas ≥ limiar → Pipeline direto
5. Vagas < limiar → modal de revisão com botão + Adicionar individual
6. Deduplicação por similaridade título+empresa (≥60%)

---

## HOME — Estrutura atual

### Coluna esquerda (5/12)
- KPIs 2×2: Leads / Candidaturas / Em Processo / Propostas
- Funil do Pipeline
- Taxa de Retorno por Canal
- Tempo Médio por Estágio

### Coluna direita (7/12)
- Central de Sinais (topo) — emails + alertas Google
- Vagas para revisar (aparece quando há pendentes)
- Próximas Ações — só cards com data definida e ação concreta
- CRM — Contatos com próxima ação agendada

### Regras das Próximas Ações
- Só aparecem cards com data específica definida no modal de drag
- Cards "Aguardar retorno" sem prazo NÃO aparecem
- Ordenação: Vencidos (vermelho) → Hoje (azul) → Futuros (laranja)
- KPIs tooltips: Leads=vagas identificadas, Candidaturas=CV enviado aguardando, Em Processo=entrevista/contato ativo, Propostas=oferta recebida

---

## PENDÊNCIAS — Por ordem de prioridade

### Alta prioridade
1. **Integração Hunter.io** — achar email do decisor por empresa+nome
2. **Campo Negativados** — coluna ou filtro no Pipeline para vagas recusadas
3. **Alertas follow-up** — 7/14/21 dias sem resposta → notificação na Home

### Média prioridade
5. **Limpeza leads antigos** — 298 leads, maioria desatualizada; criar fluxo de arquivamento em lote
6. **Fluxo Candidatar completo** — gerar CV → enviar via Outlook → registrar status no Pipeline automaticamente

### Baixa prioridade
7. **Extensão Chrome** — captura de vaga direto do LinkedIn/site (diferencial vs concorrentes)
8. **senova.com.br** — domínio próprio (R$47/mês)
9. **Dashboard analytics** — métricas avançadas de recolocação

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
- Consigliere: Consultor Sênior (dez/2025–atual)

### Formação
- Master's Barcelona (2014–15)
- MBA FGV (1998–2000)
- FAAP Publicidade (1989–93)

### Idiomas
- Português: nativo
- Inglês: avançado (nunca usar "fluente")
- Espanhol: avançado (nunca usar "fluente")
- Alemão: NÃO fala

---

## CONTATOS ESTRATÉGICOS ATIVOS

### Reuniões confirmadas
- **Giuliano Sarzana** (NEO AdTech) — seg 18/mai manhã ou ter 19/mai tarde — QUENTE
- **Ronny Essert** (GERAR) — enviar material societal marketing até 18/mai — URGENTE

### Aguardando desdobramento
- **Alan Ceppini** (RICTV) — reunião feita 13/mai — aguardar antes de contatar Petrelli/Ney Braga
- **CEO Boschetti** (GRPCom) — café ~fim de maio — NÃO contatar ainda

### Pipeline de vagas prioritárias (vencidas — agir amanhã)
- **Ipsen — Head of Alliances Exports Markets LATAM** — vencido 6d — gerar .doc e candidatar
- **Concentrix — Operations Manager Bilingual** — vencido 4d — gerar .doc e candidatar

---

## SKILLS DISPONÍVEIS — LER ANTES DE EXECUTAR

- skill_linkedin: github.com/Marcos-mco/senova/blob/main/skill_linkedin.md
- skill_cv: github.com/Marcos-mco/senova/blob/main/skill_cv.md
- skill_pesquisa_exec: github.com/Marcos-mco/senova/blob/main/skill_pesquisa_exec.md
- skill_followup: github.com/Marcos-mco/senova/blob/main/skill_followup.md
- skill_dev_senova: github.com/Marcos-mco/senova/blob/main/skill_dev_senova.md
- skill_produto: github.com/Marcos-mco/senova/blob/main/skill_produto.md
- skill_business_plan: github.com/Marcos-mco/senova/blob/main/skill_business_plan.md
- skill_market_intel: github.com/Marcos-mco/senova/blob/main/skill_market_intel.md
- skill_concorrentes: github.com/Marcos-mco/senova/blob/main/skill_concorrentes.md

---

## TOM E COMUNICAÇÃO
- Caloroso, elegante, baixa pressão — nunca incisivo
- Assina sempre: Marcos Franco
- Reserva financeira: 3–4 meses — prioridade é estabilidade, não título
- Sem ego de cargo
- Frequenta Recolhimento Opus Dei mensalmente
- Rotina: trabalho 6h+/dia a partir das 8h–9h, com 2h de almoço
