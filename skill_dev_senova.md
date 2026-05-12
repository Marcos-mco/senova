# SKILL: Desenvolvedor Sênior — Senova Suite

## Quando usar
Sempre que houver qualquer tarefa de desenvolvimento no Senova:
- Corrigir bugs no index.html
- Implementar novas funcionalidades
- Atualizar o Worker Cloudflare
- Revisar ou expandir o CRM/Kanban
- Integrar novas APIs (Hunter.io, RSS, etc.)

## Arquitetura (memorizar antes de qualquer edição)

```
[Browser] → [GitHub Pages: index.html]
         → [Cloudflare Worker: senova-proxy.marcos-mco.workers.dev]
         → [Anthropic API: claude-sonnet-4-5]
         → [Cloudflare KV: SENOVA_KV]
```

**URL produção:** https://marcos-mco.github.io/senova
**Repositório:** https://github.com/Marcos-mco/senova
**Worker:** senova-proxy.marcos-mco.workers.dev

## Regras INVIOLÁVEIS de design (Brand Book)
- Azul navy: `#1A3A5C`
- Dourado: `#C9A84C`
- Ação/link: `#2E6DA4`
- Névoa/fundo: `#F0F4F8`
- Carvão/texto: `#2C2C2A`
- Fonte títulos: **Playfair Display 700** — NUNCA substituir
- Fonte corpo: **Inter 400/500/600** — NUNCA usar DM Sans
- Público 40+: fontes grandes (mín. 16px corpo), alto contraste
- **JAMAIS tocar em CSS/cores/fontes/layout sem aprovação explícita de Marcos**

## Stack técnica
- Vanilla HTML/CSS/JS — arquivo único, sem build, sem dependências externas
- Cloudflare Workers (JavaScript) — proxy, OAuth, KV
- Cloudflare KV — persistência de dados (vagas, contatos)
- GitHub Pages — hospedagem estática gratuita
- Modelo IA: claude-sonnet-4-5 (único modelo testado e funcional no endpoint atual)

## Variáveis de ambiente no Worker (Cloudflare)
- `ANTHROPIC_API_KEY` — API Anthropic
- `MS_CLIENT_ID` — Azure App Client ID: eaf69797-def3-4f6a-a103-8bcb3ed0f79e
- `MS_CLIENT_SECRET` — Azure App Secret
- `MS_REDIRECT_URI` — URI de redirecionamento OAuth
- `MS_TENANT_ID` — Azure Tenant: b7fdfe9f-441d-4571-90f1-6882e06fb8a7
- `HUNTER_API_KEY` — Hunter.io (configurar)

## Regra de ouro antes de publicar
- `Ctrl+F` por `api.anthropic.com` no index.html → deve retornar ZERO resultados
- Toda chamada à API passa pelo Worker, nunca diretamente do browser

## Processo de deploy
1. Editar index.html (aqui no Claude ou localmente)
2. Acessar github.com/Marcos-mco/senova
3. Clicar em index.html → ícone lápis ✏️
4. Selecionar tudo → colar novo conteúdo
5. Commit changes
6. Aguardar ~30s → recarregar com Ctrl+Shift+R

## Módulos atuais (v3.0 — mai/2026)
| Módulo | Status |
|--------|--------|
| Anti-ATS | ✅ Funcional |
| LinkedIn Optimizer | ✅ Funcional |
| Pipeline CRM (Kanban 5 colunas) | ✅ Funcional |
| Simulador de Entrevista | ✅ Funcional |

## Roadmap prioritário (Fase 1)
- Fix: modal Editar Vaga caber na tela sem rolar
- Fix: botão Enviar CV com email correto do recrutador
- Fix: URL LinkedIn abre vaga correta
- Feature: varredura automática de vagas (RSS + cron trigger 07h)
- Feature: Central de Sinais de mercado
- Feature: integração Hunter.io para busca de email

## Antes de qualquer edição
1. Ler PROJETO.md: https://github.com/Marcos-mco/senova/blob/main/PROJETO.md
2. Ler VERSOES.md: https://github.com/Marcos-mco/senova/blob/main/VERSOES.md
3. Confirmar qual bug/feature está sendo trabalhado
4. Nunca refatorar CSS ou layout junto com correção de bug
