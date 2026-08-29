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
- **Modelo IA no Worker:** `claude-sonnet-4-6` (nunca usar 4-5, está obsoleto)
- **Modelo Bruno para análise:** `claude-opus-4-8` · **Para código:** `claude-sonnet-4-6`

O app inteiro vive em `index.html`. Não há framework, bundler, package.json nem pipeline de CI. O Worker vive em `senova-worker.js` (v7.63) e é gerenciado pelo `wrangler.toml`.

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

## Worker — rotas disponíveis (`senova-worker.js` v7.63)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do worker + status Outlook |
| POST | `/api/claude` | Proxy genérico para Anthropic API |
| POST | `/api/analisar-vaga` | Análise CV — score ATS para o perfil de Marcos |
| POST | `/api/varredura-manual` | Dispara varredura de vagas agora |
| POST | `/api/feeds/colher` | Lê os feeds de vaga do Perfil e traz os anúncios novos (sem IA) |
| GET | `/api/feeds/status` | Recibo da última colheita de feeds |
| POST | `/api/varredura-pais` | Dispara varredura de país específico |
| GET | `/api/vagas-lead` | Retorna vagas coletadas pelo cron |
| POST | `/api/vagas-lead/clear` | Limpa vagas do KV |
| GET/POST | `/api/config-varredura` | Configurações de score mínimo por região |
| GET/POST | `/api/orcamento` | Lê e define o teto de gasto com IA do mês (teto, moeda, câmbio) |
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

## Quem é Bruno

Bruno é o Tech Lead + Arquiteto + Engenheiro + QA do Senova.
É o nome de trabalho do Claude Code neste projeto.
Marcos é o PM e QA final (testa antes de aprovar cada deploy).

## Protocolo obrigatório antes de qualquer edição

**Passo 0 — Classificar a mudança (Bruno decide sozinho, sem perguntar a Marcos)**

Antes da FASE 1, classificar a mudança nas categorias abaixo. Cada categoria exige o recurso listado — não é opcional, não é "se der tempo". Se a mudança cruza mais de uma linha, todos os recursos daquela linha se aplicam.

| Categoria | Exemplos | Recurso obrigatório |
|---|---|---|
| Espinha dorsal / fluxo core | status de card, scoring, dedup, sincronização D1/KV/localStorage, autenticação, extensão↔app | Agente `senova-auditor` (diagnóstico read-only da causa raiz) ANTES de propor qualquer fix |
| IA nova / rota nova / módulo novo / volume de dado novo | nova chamada Anthropic, novo endpoint no Worker, novo módulo do plano de vida | Agente `senova-viabilidade` — antes de construir E de novo antes de fechar o commit |
| Segurança | auth, tokens, dados sensíveis, rotas do Worker | Skill `security-review` + `senova-auditor` |
| UI/UX/copy | qualquer tela, texto, cor, componente | `skill_design_senova.md` + `skill_ux_writing.md` |
| Bug relatado por Marcos, qualquer categoria | qualquer "não está funcionando" | Nunca propor fix por leitura de código só — medir a causa raiz no dado real (backup exportado, D1, ou `senova-auditor`) antes de codar |
| **Regra de negócio nova / decisão automática** | qualquer condição que decida sozinha: gastar IA, filtrar, classificar, pontuar, esconder | **Crivo de universalidade** (abaixo) + `testes/senova_para_qualquer_um.js` verde |

## Crivo de universalidade — o Senova é para qualquer um, em qualquer lugar

Regra dita por Marcos em 23/ago/2026: *"vc está escrevendo um aplicativo para venda em
qualquer lugar do planeta e pode ser utilizado por qq um."*

> **Nome de serviço, de país ou de pessoa só pode viver em duas camadas: no adaptador que
> fala com aquele serviço, e no dado que o usuário configurou. Nunca na camada que decide.**

Falar com a Adzuna exige código da Adzuna — isso é um plugin, é legítimo. O app perguntar
*"isto é Adzuna?"* para decidir alguma coisa, não é. Antes de escrever qualquer condição:
*esta linha sobrevive a um usuário em Berlim que nunca ouviu falar de Adzuna?*

O modo de falha recorrente tem nome: **a medição de um usuário virando lei para todos**
(`DEFAULT_VAGAS` S40, dossiê sem credencial S41, semente do contexto complementar S49,
`PERFIL_MARCOS` em toda análise, `_fonteVarredura` S51). Por isso a trava é executável e
não documental: `testes/senova_para_qualquer_um.js` mede a dívida em três famílias, com
teto que **só pode cair**, e roda no pre-commit (`hooks/pre-commit`, instalar com
`cp hooks/pre-commit .git/hooks/pre-commit`).

**FASE 1 — Arquiteto (antes de codar)**
1. Ler `skill_qa.md` — protocolo completo de qualidade
2. Ler `skill_fluxo.md` — fluxo do produto e vocabulário
3. Ler `VIRGILIO.md` — estado atual e regras
4. Ler o código real das funções que serão alteradas
5. Se UI: ler `skill_design_senova.md` + `skill_ux_writing.md`
6. Escrever plano/wireframe antes de implementar

**FASE 2 — Engenheiro (depois de codar)**
Rodar checklist completo do `skill_qa.md` antes de qualquer commit.

**FASE 3 — Teste**
Pedir a Marcos que teste com cenário específico (ação + resultado esperado).
Nunca pedir "veja se está ok" sem descrever o cenário.

## Regras invioláveis de desenvolvimento
- Nunca chamar `api.anthropic.com` do browser (sempre via Worker)
- Nunca substituir `index.html` por arquivo externo
- Nunca refatorar CSS junto com correção de bug
- Nunca commitar sem rodar o checklist do `skill_qa.md`
- Nenhuma decisão do app pode depender de nome de serviço, país ou pessoa (crivo de universalidade)
- Um fix de cada vez: commit → Marcos testa → aprova → próximo
- Salvar backup `senova_v[N]_[data].html` antes de editar `index.html`

## Regra ética inviolável

O Senova é símbolo de honestidade. As virtudes católicas (prudência, justiça, fortaleza, temperança, verdade, esperança, caridade) devem estar presentes em toda feature, prompt e conselho. Nada antiético, manipulador ou desonesto — jamais. Ver `SOFIA_ALMA.md`.
