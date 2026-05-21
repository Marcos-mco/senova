# SKILL — DEV SENOVA
## Desenvolvedor Sênior — Senova Suite

---

## 1. QUANDO USAR

Sempre que houver qualquer tarefa de desenvolvimento no Senova:
- Corrigir bugs no index.html ou senova-worker.js
- Implementar novas funcionalidades
- Atualizar o Cloudflare Worker
- Integrar novas APIs
- Atualizar documentação técnica

---

## 2. REGRA INVIOLÁVEL — LER ANTES DE QUALQUER EDIÇÃO

1. Ler PROJETO.md
2. Ler VERSOES.md
3. Ler VIRGILIO.md
4. Ler index.html (ou seções relevantes)
5. Ler senova-worker.js (se a tarefa envolve o Worker)

NUNCA propor baseado em memória ou arquivos do projeto Claude.
NUNCA assumir o estado do código — sempre ler primeiro.

---

## 3. ARQUITETURA ATUAL (v3.10 — mai/2026)

```
[Browser: index.html — GitHub Pages]
        ↓
[Cloudflare Worker v7.7 — senova-proxy.marcos-mco.workers.dev]
        ↓
[Anthropic API — claude-sonnet-4-5]
[Cloudflare KV — SENOVA_KV]
[Microsoft Graph API — Outlook + Calendar]
[Adzuna API — vagas BR/ES/DE/PT]
[Jobicy RSS — vagas remotas globais]
```

- URL produção: https://marcos-mco.github.io/senova
- Repositório: https://github.com/Marcos-mco/senova
- Worker: senova-proxy.marcos-mco.workers.dev
- Stack: Vanilla HTML/CSS/JS — arquivo único, sem build, sem dependências

---

## 4. MÓDULOS ATUAIS

| Módulo | Status |
|--------|--------|
| Anti-ATS (Análise CV) | ✅ Funcional |
| LinkedIn Optimizer | ✅ Funcional |
| Pipeline CRM (Kanban) | ✅ Funcional |
| CRM Contatos | ✅ Funcional |
| Varredura Automática | ✅ Funcional (cron 07h BRT) |
| OAuth Outlook (Mail + Calendar) | ✅ Funcional |
| Sofia (4 tabs) | ✅ Funcional |
| Central de Sinais | 🔄 Em desenvolvimento |
| Extensão Chrome | 📋 Roadmap Fase 2 |

---

## 5. WORKER v7.7 — ROTAS PRINCIPAIS

- /api/analyze — análise ATS via Anthropic
- /api/fetch-descricao — busca descrição por URL
- /api/optimize-linkedin — otimização perfil LinkedIn
- /api/interview — simulador de entrevista
- /api/sofia — entrevista guiada Sofia
- /api/import-vagas — varredura Adzuna + Jobicy
- /auth/outlook — OAuth Microsoft início
- /auth/callback — OAuth Microsoft retorno
- /api/emails — leitura emails Outlook
- /api/send-email — envio email candidatura
- /api/calendar — agendamento Outlook

---

## 6. VARIÁVEIS DE AMBIENTE (Cloudflare Secrets)

- ANTHROPIC_API_KEY — API Anthropic
- MS_CLIENT_ID — Azure App: eaf69797-def3-4f6a-a103-8bcb3ed0f79e
- MS_CLIENT_SECRET — Azure App Secret
- MS_REDIRECT_URI — URI OAuth
- MS_TENANT_ID — **consumers** (conta pessoal Hotmail — NUNCA usar UUID)
- ADZUNA_APP_ID — Adzuna
- ADZUNA_API_KEY — Adzuna

Para adicionar/atualizar secrets:
```
npx wrangler secret put NOME_DA_VARIAVEL
```

---

## 7. BRAND BOOK — INVIOLÁVEL

- Navy: #1A3A5C
- Gold: #C9A84C
- Action: #2E6DA4
- Fonte títulos: Playfair Display 700
- Fonte corpo: Inter 400/500/600
- NUNCA usar DM Sans
- NUNCA tocar em CSS/cores/layout sem aprovação explícita de Marcos
- Fontes mínimas: 15px corpo (público executivo 35+)

---

## 8. PROCESSO DE DEPLOY

### Frontend (index.html):
```
git add index.html
git commit -m "descrição clara da mudança"
git push origin main
```
Aguardar ~30s → Ctrl+Shift+R no browser

### Worker (senova-worker.js):
```
npx wrangler deploy
```
Verificar commit hash no retorno

### NUNCA fazer deploy sem testar no browser primeiro.
### NUNCA fazer deploy do Worker com npx wrangler tail ativo.

---

## 9. REGRAS DE OURO

1. Ctrl+F por "api.anthropic.com" no index.html → deve retornar ZERO resultados
2. Toda chamada à API passa pelo Worker — nunca diretamente do browser
3. Score ATS calculado browser-side — não no Worker (limite CPU Cloudflare ~30s)
4. Um fix de cada vez — commit, testar, aprovar antes de avançar
5. Nunca refatorar CSS junto com correção de bug
6. Sempre atualizar VIRGILIO.md, PROJETO.md e VERSOES.md ao final da sessão

---

## 10. PROTOCOLO DE SESSÃO

### Abertura:
1. Ler session_start.md
2. Ler PROJETO.md + VERSOES.md + VIRGILIO.md
3. Ler todos os skills relevantes
4. Reportar estado atual e perguntar o que trabalhar

### Durante:
- Um passo de cada vez
- Descrever antes de executar
- Aguardar aprovação antes de avançar
- Nunca rodar à frente do Virgílio

### Encerramento:
- Atualizar VIRGILIO.md com estado atual + próximos passos
- Atualizar VERSOES.md com changelog
- Commit + push de tudo
- Confirmar deploy

---

## 11. PENDÊNCIAS TÉCNICAS ATIVAS (mai/2026)

- [ ] Modal Editar Vaga — caber na tela sem scroll
- [ ] Botão Candidatar — fluxo completo
- [ ] URL LinkedIn — abrir vaga correta
- [ ] Idioma DE no Anti-ATS
- [ ] Filtros Plano A/B/C no Pipeline
- [ ] Follow-up automático 7/14/21 dias
- [ ] Central de Sinais via Google News RSS
- [ ] Hunter.io integration
- [ ] Gmail OAuth (futuro)
- [ ] senova.com.br (Fase 4)

---

*Atualizado em 21/mai/2026 — v3.10 / Worker v7.7*
*Substitui versão desatualizada (v3.0)*
