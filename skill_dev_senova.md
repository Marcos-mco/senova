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

## 2. PROTOCOLO BRUNO — LER ANTES DE QUALQUER EDIÇÃO

Bruno = Tech Lead + Arquiteto + Engenheiro + QA do Senova.

**Antes de qualquer edição:**
1. Ler `skill_qa.md` — protocolo completo de qualidade
2. Ler `skill_fluxo.md` — fluxo e vocabulário do produto
3. Ler `VIRGILIO.md` — estado atual e regras invioláveis
4. Ler o código das funções que serão alteradas (nunca assumir)
5. Se envolve UI: ler `skill_design_senova.md` e `skill_ux_writing.md`
6. Se envolve Worker: ler `senova-worker.js` seções relevantes

NUNCA propor baseado em memória ou arquivos desatualizados.
NUNCA assumir o estado do código — sempre ler primeiro.
NUNCA commitar sem rodar o checklist do skill_qa.md.

---

## 3. ARQUITETURA ATUAL (v3.28 — jun/2026)

```
[Browser: index.html — GitHub Pages]
        ↓
[Cloudflare Worker v7.8 — senova-proxy.marcos-mco.workers.dev]
        ↓
[Anthropic API — claude-sonnet-4-6]   ← NUNCA claude-sonnet-4-5 (obsoleto)
[Cloudflare KV — SENOVA_KV]
[Microsoft Graph API — Outlook Mail + Calendar]
[Adzuna API — vagas BR/ES/DE/PT]
[Jobicy RSS — vagas remotas globais]
[Bing News RSS — sinais de mercado (primário)]
[Google News RSS — sinais de mercado (fallback)]
```

- URL produção: https://marcos-mco.github.io/senova
- Repositório: https://github.com/Marcos-mco/senova
- Worker: senova-proxy.marcos-mco.workers.dev
- Stack: Vanilla HTML/CSS/JS — arquivo único, sem build, sem dependências

---

## 4. MÓDULOS ATUAIS (jun/2026)

| Módulo | Status | Observação |
|--------|--------|------------|
| Análise de Vaga (Anti-ATS) | ✅ Funcional | CARTA_SYSTEM separado do ATS_SYSTEM |
| Processos (Kanban) | ✅ Funcional | 5 colunas + arquivados |
| Contatos (CRM) | ✅ Funcional | |
| Home 2 colunas | ✅ Funcional | Para Hoje + O que há de novo |
| Busca automática (Adzuna+Jobicy) | ✅ Funcional | cron 07h BRT, vagas direto para Processos |
| OAuth Outlook (Mail + Calendar) | ✅ Funcional | tenant=consumers (Hotmail) |
| Sinais de mercado (Bing/Google RSS) | ✅ Funcional | Cache 4h |
| Google Alerts (artigos individuais) | ✅ Funcional | |
| Fathom (gravação reunião) | ✅ Funcional | badge 📹 na Home |
| Modal Entrevista + Outlook Calendar | ✅ Funcional | |
| Captura de Aprendizado | ✅ Funcional | ao arquivar processo |
| Sofia onboarding (texto) | ✅ Funcional | 14 perguntas + TTS/STT |
| Indicações (5ª fonte de leads) | ✅ Funcional | |
| Extensão Chrome | 🔄 v2.12 | companion LinkedIn + job boards |
| LinkedIn Optimizer | ✅ Funcional | |
| KPI strip Processos | ✅ Funcional | 4 KPIs |

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

## 11. BUGS E PENDÊNCIAS ATIVAS (15/jun/2026)

### Bugs confirmados (ver prints de Marcos)
- [ ] "Entrevista — agendar data e horário" persiste após atualizar card
- [ ] "+ Abrir processo" aparece em Novidades no mercado (ERRADO pelo fluxo)
- [ ] "Oportunidades — nenhuma nova" e "Retornos — nenhum novo" violam regra empty state
- [ ] Editar Processo: descrição da vaga não carrega (campo mv-job-desc vazio)
- [ ] Editar Processo: DE falta nas línguas; idioma deveria ser detectado automaticamente
- [ ] Botão "Verificar" em Busca Automática sem feedback visível
- [ ] Sofia / Preparar entrevista não funcionando

### Pendências de produto (Ciclo 1)
- [ ] VISÃO COMPLETA no card (Sofia analisa holístico antes de candidatar)
- [ ] Fluxo Analisar dentro do card (sem sair do contexto)
- [ ] Retornos: mostrar "N processos aguardando resposta" (não só recebidos)
- [ ] Idioma DE em todos os lugares que têm PT/EN/ES
- [ ] LinkedIn no contato: link direto clicável
- [ ] Responsivo mobile (768px+)

---

*Atualizado em 15/jun/2026 — v3.28 / Worker v7.8*
*Bruno = Tech Lead + Arquiteto + Engenheiro + QA*
