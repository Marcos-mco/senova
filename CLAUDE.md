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

O app inteiro vive em `index.html`. Não há framework, bundler, package.json nem pipeline de CI. O Worker vive em `senova-worker-v6.js` e é gerenciado pelo `wrangler.toml`.

## Deploy

Não há comando de build. O deploy é manual:

1. Editar `index.html` localmente
2. Acessar github.com/marcos-mco/senova → clicar em `index.html` → ícone lápis ✏️
3. Selecionar tudo → colar novo conteúdo → **Commit changes**
4. Aguardar ~30s → recarregar com `Ctrl+Shift+R`

**Para o Worker** (quando `senova-worker-v6.js` mudar):
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

## Worker — rotas disponíveis (`senova-worker-v6.js`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do worker + status Outlook |
| POST | `/api/claude` | Proxy genérico para Anthropic API |
| POST | `/api/analisar-vaga` | Anti-ATS — análise de vaga para o perfil de Marcos |
| GET | `/api/auth/outlook` | Inicia OAuth Microsoft |
| GET | `/api/auth/callback` | Callback OAuth, salva token no KV |
| DELETE | `/api/auth/outlook` | Desconecta Outlook |
| GET | `/api/emails` | Busca e-mails novos + classifica via IA |
| POST | `/api/emails/marcar-visto` | Marca e-mails como vistos no KV |
| DELETE | `/api/emails/limpar-vistos` | Limpa histórico de vistos |
| GET/POST/DELETE | `/api/whitelist` | Gerencia domínios prioritários para classificação |

## Variáveis de ambiente do Worker (Cloudflare → Workers → senova-proxy → Settings)

- `ANTHROPIC_API_KEY` — API Anthropic
- `MS_CLIENT_ID` — Azure App Client ID: `eaf69797-def3-4f6a-a103-8bcb3ed0f79e`
- `MS_CLIENT_SECRET` — Azure App Secret
- `MS_REDIRECT_URI` — URI de redirecionamento OAuth
- `MS_TENANT_ID` — Azure Tenant: `b7fdfe9f-441d-4571-90f1-6882e06fb8a7`
- `HUNTER_API_KEY` — Hunter.io (a integrar)

KV binding: `SENOVA_KV` (id: `e0f1fc09836b48d1be86fcdf217ef7dd`)

## Módulos ativos (v3.0 — mai/2026)

| Módulo | Status |
|--------|--------|
| Anti-ATS | ✅ Funcional |
| LinkedIn Optimizer | ✅ Funcional |
| Pipeline CRM (Kanban 5 colunas) | ✅ Funcional |
| Simulador de Entrevista | ✅ Funcional |

## Antes de qualquer edição

1. Ler `VIRGILIO.md` para contexto permanente, regras invioláveis e estado do projeto
2. Ler `PROJETO.md` para contexto de decisões de arquitetura e roadmap
3. Ler `VERSOES.md` para entender o estado da versão atual
4. Salvar backup com nome `senova_v[N]_[data].html` antes de modificar o `index.html`
5. Nunca refatorar CSS/layout junto com correção de bug — mudanças devem ser isoladas
