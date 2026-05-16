# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arquitetura

```
[Browser]
    │
    ▼
[GitHub Pages — index.html]  (single-file app, vanilla HTML/CSS/JS, sem build)
    │  fetch POST
    ▼
[Cloudflare Worker — senova-proxy.marcos-mco.workers.dev]
    │  x-api-key (secret)
    ▼
[Anthropic API — claude-sonnet-4-5]
    │
    ▼
[Cloudflare KV — SENOVA_KV]
```

- **Produção:** https://marcos-mco.github.io/senova
- **Worker:** https://senova-proxy.marcos-mco.workers.dev
- **Repo:** https://github.com/marcos-mco/senova
- **Modelo IA:** `claude-sonnet-4-5` — único modelo testado e funcional no endpoint atual

O app inteiro vive em `index.html`. Não há framework, bundler, package.json nem pipeline de CI. O Worker vive em `senova-worker.js` (v7.3) e é gerenciado pelo `wrangler.toml`.

## Deploy

Não há comando de build. O deploy do frontend é via git:

```
git add index.html
git commit -m "descrição"
git push origin main
```

GitHub Pages publica automaticamente em ~30s. Recarregar com `Ctrl+Shift+R`.

**Para o Worker** (quando `senova-worker.js` mudar):
```
npx wrangler deploy
```

## Regra de ouro antes de publicar

Toda chamada à Anthropic API deve passar pelo Worker — **nunca diretamente do browser**.

Antes de qualquer commit do `index.html`, verificar:
- `Ctrl+F` por `api.anthropic.com` → deve retornar **zero resultados**

## Brand Book — regras invioláveis

**Jamais alterar CSS, cores, fontes ou layout sem aprovação explícita de Marcos.**

| Token | Valor |
|-------|-------|
| Azul navy | `#1A3A5C` |
| Dourado | `#C9A84C` |
| Ação/link | `#2E6DA4` |
| Névoa/fundo | `#F0F4F8` |
| Carvão/texto | `#2C2C2A` |
| Fonte títulos | **Playfair Display 700** — nunca substituir |
| Fonte corpo | **Inter 400/500/600** — nunca usar DM Sans |

Público-alvo 40+: mínimo 16px no corpo, alto contraste.

## Worker — rotas disponíveis (`senova-worker.js` v7.3)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do worker + status Outlook |
| POST | `/api/claude` | Proxy genérico para Anthropic API |
| POST | `/api/analisar-vaga` | Análise CV — score ATS para o perfil de Marcos |
| POST | `/api/varredura-manual` | Dispara varredura de vagas agora |
| POST | `/api/varredura-pais` | Dispara varredura de país específico |
| GET | `/api/vagas-lead` | Retorna vagas coletadas pelo cron |
| POST | `/api/vagas-lead/clear` | Limpa vagas do KV |
| GET/POST | `/api/config-varredura` | Configurações de score mínimo por região |
| GET | `/api/varredura-status` | Status e log da última execução |
| GET | `/api/auth/outlook` | Inicia OAuth Microsoft |
| GET | `/api/auth/callback` | Callback OAuth, salva token no KV |
| DELETE | `/api/auth/outlook` | Desconecta Outlook |
| GET | `/api/emails` | Busca e-mails novos + classifica via IA |
| POST | `/api/emails/marcar-visto` | Marca e-mails como vistos no KV |
| DELETE | `/api/emails/limpar-vistos` | Limpa histórico de vistos |
| POST | `/api/emails/responder` | Responde e-mail via Graph API (reply) |
| POST | `/api/emails/enviar` | Envia e-mail novo via Graph API (sendMail) |
| POST | `/api/calendar/evento` | Cria evento no Outlook Calendar |
| GET/POST/DELETE | `/api/whitelist` | Gerencia domínios prioritários para classificação |

## Variáveis de ambiente do Worker (Cloudflare → Workers → senova-proxy → Settings)

- `ANTHROPIC_API_KEY` — API Anthropic
- `MS_CLIENT_ID` — Azure App Client ID: `eaf69797-def3-4f6a-a103-8bcb3ed0f79e`
- `MS_CLIENT_SECRET` — Azure App Secret
- `MS_REDIRECT_URI` — URI de redirecionamento OAuth
- `MS_TENANT_ID` — hardcoded `consumers` no código (conta pessoal Hotmail)
- `ADZUNA_APP_ID` — `65c2a129`
- `ADZUNA_APP_KEY` — chave Adzuna para busca de vagas
- `HUNTER_API_KEY` — Hunter.io (a integrar)

KV binding: `SENOVA_KV` (id: `e0f1fc09836b48d1be86fcdf217ef7dd`)

Cron: `0 10 * * *` (07h BRT) — varredura automática Adzuna + Jobicy

## Módulos ativos (v3.3 — 16/mai/2026)

| Módulo | Status |
|--------|--------|
| Análise CV (Anti-ATS) | ✅ Funcional |
| LinkedIn Optimizer | ✅ Funcional |
| Pipeline CRM (Kanban 5 colunas) | ✅ Funcional |
| Simulador de Entrevista | ✅ Funcional |
| Varredura automática de vagas (Adzuna + Jobicy) | ✅ Funcional |
| OAuth Outlook (Mail + Calendar) | ✅ Funcional |
| Candidatura via Outlook | ✅ Funcional |
| CRM Contatos | ✅ Funcional |

## Antes de qualquer edição

1. Ler `VIRGILIO.md` para contexto permanente, regras invioláveis e estado do projeto
2. Ler `PROJETO.md` para contexto de decisões de arquitetura e roadmap
3. Ler `VERSOES.md` para entender o estado da versão atual
4. Salvar backup com nome `senova_v[N]_[data].html` antes de modificar o `index.html`
5. Nunca refatorar CSS/layout junto com correção de bug — mudanças devem ser isoladas
