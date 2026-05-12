# Senova Suite — Documento de Projeto
**Versão:** 2.0 · **Atualizado:** 11/mai/2026 · **Responsável:** Marcos Franco

---

## 1. Visão Geral

**Senova Suite** é uma plataforma pessoal de recolocação executiva construída como aplicação web única (*single-file app*), hospedada no GitHub Pages e integrada à API da Anthropic via proxy Cloudflare Workers.

**URL de produção:** https://marcos-mco.github.io/senova  
**Worker proxy:** https://senova-proxy.marcos-mco.workers.dev  
**Repositório:** https://github.com/marcos-mco/senova  

---

## 2. Arquitetura Técnica

```
[Usuário / Browser]
        │
        ▼
[GitHub Pages — index.html]
        │  fetch POST
        ▼
[Cloudflare Worker — senova-proxy]
        │  x-api-key (secret)
        ▼
[Anthropic API — claude-sonnet-4-5]
        │
        ▼
[Cloudflare KV — SENOVA_KV]
```

### Decisões técnicas registradas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Hospedagem | GitHub Pages | Gratuito, versionado, deploy por commit |
| Proxy | Cloudflare Workers | Elimina CORS, protege API key, gratuito até 100k req/dia |
| Banco de dados | Cloudflare KV | Sem servidor, persiste dados entre sessões |
| Framework | Vanilla HTML/CSS/JS | Arquivo único, sem build, sem dependências |
| Modelo IA | claude-sonnet-4-5 | Único modelo que funciona no endpoint atual |
| Fonte display | Playfair Display 700 | Brand book Senova — NUNCA substituir |
| Fonte corpo | Inter 400/500/600 | Brand book Senova — NUNCA usar DM Sans |

### Regras invioláveis de design (Brand Book)

- Azul: `#1A3A5C` · Dourado: `#C9A84C` · Ação: `#2E6DA4` · Névoa: `#F0F4F8` · Carvão: `#2C2C2A`
- Fontes: Playfair Display (títulos) + Inter (corpo) — jamais DM Sans
- Público 40+: fontes grandes, alto contraste
- Tom: Experiente · Confiante · Humano · Direto
- **Nunca tocar em CSS/cores/fontes/layout sem aprovação explícita**

---

## 3. Módulos Atuais (v3.0 — maio/2026)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Anti-ATS | ✅ Funcional | Analisa vaga, gera CV adaptado, score ATS, keywords |
| LinkedIn | ✅ Funcional | Otimiza headline, about e experiência em PT/EN/ES |
| Pipeline CRM | ✅ Funcional | Kanban 5 colunas + lista de contatos, persistido no KV |
| Simulador de Entrevista | ✅ Funcional | 5 perguntas calibradas + feedback por resposta |

---

## 4. Infraestrutura e Credenciais

| Item | Valor | Onde gerenciar |
|------|-------|----------------|
| GitHub repo | github.com/marcos-mco/senova | github.com |
| Cloudflare login | marcos_mco@hotmail.com | dash.cloudflare.com |
| Worker name | senova-proxy | CF → Workers & Pages |
| KV Namespace | SENOVA_KV | CF → KV |
| API Key Anthropic | Configurada como secret no Worker | CF → Workers → senova-proxy → Settings → Variables |
| Hunter.io API Key | Configurada como secret no Worker | CF → Workers → senova-proxy → Settings → Variables (HUNTER_API_KEY) |
| E-mail profissional | marcos@labordei.com.br | Microsoft 365 |
| DNS | Cloudflare (labordei.com.br) | NS: lilyana + merlin |
| Azure App | Senova Suite — Client ID: eaf69797-def3-4f6a-a103-8bcb3ed0f79e | portal.azure.com |
| Azure Tenant | b7fdfe9f-441d-4571-90f1-6882e06fb8a7 | portal.azure.com |

---

## 5. Ferramentas Externas Instaladas (11/mai/2026)

| Ferramenta | Status | Observação |
|---|---|---|
| Google Alerts | ✅ Ativo | 36 alertas — Brasil, Alemanha, Espanha, mídia/TV |
| Pasta "Alertas Senova" Outlook | ✅ Ativo | Regras automáticas: Google Alerts + LinkedIn → pasta |
| Hunter.io | ✅ Cadastrado | API Key salva — integrar ao Worker (HUNTER_API_KEY) |
| Lusha | ❌ Bloqueada | Conta suspensa — substituída pelo Hunter.io |
| Gupy | ✅ Atualizado | Perfil completo: formação, experiências, 30 habilidades |

### Google Alerts — categorias monitoradas
- Movimentações executivas Brasil (Paraná, Sul, C-Level)
- Empresas europeias chegando ao Brasil (DE, ES)
- Mídia, TV, comunicação — afiliadas Globo, grupos regionais
- Fusões, aquisições, expansões no Paraná
- Startups com captação em Curitiba/PR
- Nome próprio: "Marcos Franco" marketing Curitiba

---

## 6. Processo de Atualização (como fazer deploy)

1. Editar o arquivo `index.html` localmente ou via Claude
2. Acessar **github.com/marcos-mco/senova**
3. Clicar em `index.html` → ícone lápis ✏️
4. Selecionar tudo (`Ctrl+A`) → colar novo conteúdo
5. Clicar em **Commit changes**
6. Aguardar ~30 segundos → recarregar com `Ctrl+Shift+R`

**Regra de ouro:** sempre verificar que o arquivo não contém `api.anthropic.com` antes de publicar.  
**Verificação rápida:** `Ctrl+F` por `api.anthropic.com` → deve retornar zero resultados.

---

## 7. Roadmap de Melhorias

### Fase 1 — Imediato (mai/2026)

- [x] **Varredura automática de vagas:** RSS LinkedIn, Indeed BR/DE/ES, Gupy — cron trigger diário às 7h — resolvido 12/mai/2026 (commit 517fc79) — **requer `npx wrangler deploy` para ativar o cron**
- [x] **Varredura de sinais de mercado:** Google News RSS de empresas-alvo — detecta saídas, expansões, fusões — resolvido 12/mai/2026 (commit 28550c0)
- [ ] **Integração Hunter.io:** busca automática de email do contato ao detectar sinal
- [x] **Coluna "Lead" no Kanban:** vagas da varredura entram aqui antes de "Radar" — resolvido 12/mai/2026 (commit 2e6e348)
- [ ] **Aba "Central de Sinais":** classifica alertas em Oportunidade / Sinal / Radar
- [x] **Fix: modal Editar Vaga** caber na tela sem rolar — resolvido 12/mai/2026 (commit fc6dae6)
- [x] **Fix: botão Enviar CV** com email correto do recrutador — resolvido 12/mai/2026 (commit ba6e5d2)
- [x] **Fix: URL LinkedIn** abre vaga correta — resolvido 12/mai/2026: campo origemUrl adicionado, aviso de login exibido no card (commit dd68145)

### Fase 2 — Próximo ciclo (jun/2026)

- [ ] **Campo "Negativados":** coluna ou filtro para vagas com resposta negativa
- [ ] **Filtros de busca no CRM:** por empresa, status, prioridade, data
- [ ] **Próximos passos com datas:** follow-up com prazo, alerta de vencimento
- [ ] **Dashboard estratégico:** visão consolidada — taxa de retorno, funil, tendências
- [ ] **Relatórios consolidados:** exportar PDF com resumo do processo seletivo
- [ ] **Alertas de follow-up:** 7/14/21 dias sem resposta

### Fase 3 — Médio prazo (jul–ago/2026)

- [ ] **Análise de resultados:** IA analisa padrões (quais vagas têm mais retorno, quais headhunters respondem mais)
- [ ] **PMV Senova para outros usuários:** validar R$47/mês com público 50+
- [ ] **Registro domínio senova.com.br** (~R$47/mês)
- [ ] **Avaliar migração para Cowork** quando o app tiver múltiplos usuários
- [ ] **Gmail OAuth** para monitorar emails candidaturas

---

## 8. Arquitetura de Inteligência de Mercado (definida 11/mai/2026)

### Varredura 1 — Oportunidades de emprego
```
RSS: LinkedIn Jobs + Indeed BR/DE/ES + Infojobs ES + Stepstone DE
        ↓
Cloudflare Worker (cron 07:00 diário)
        ↓
Filtra por keywords: marketing, CMO, diretor, head, comercial, expansão
        ↓
Score ATS automático via Claude API
        ↓
Coluna "Lead" no CRM com badge "Nova hoje"
```

### Varredura 2 — Sinais de mercado
```
Google News RSS (empresas-alvo cadastradas)
        ↓
Detecta: "saiu", "deixa cargo", "novo CEO", "expansão", "fusão", "contratou"
        ↓
Claude analisa: empresa, cargo vago, contato do Marcos lá
        ↓
Hunter.io API busca email do decisor
        ↓
"Central de Sinais" no Senova com mensagem sugerida pronta
```

### Variável a adicionar no Cloudflare Worker
- `HUNTER_API_KEY` → obter em hunter.io → Settings → API

---

## 9. Headhunters Contatados (mai/2026)

| Nome | Firma | Status | Próximo passo |
|---|---|---|---|
| Priscilla Capellato | Korn Ferry | Convite LinkedIn enviado 11/mai | Aguardar aceite → enviar mensagem |
| Aldo Bergamasco | Spencer Stuart | Convite com nota enviado 11/mai | Aguardar aceite → enviar mensagem |
| Guilherme Maciel | Heidrick & Struggles | Mensagem enviada 11/mai | Aguardar resposta |
| Ângela Pêgas | Egon Zehnder | Convite enviado 11/mai | Aguardar aceite |
| Ezequiel Silva | Egon Zehnder | Convite enviado 11/mai | Aguardar aceite |
| Robert Half | — | Cadastrado | Follow-up semana 12/mai |
| Hays | — | Cadastrado | Follow-up semana 12/mai |
| PageExecutive | — | Cadastrado portal | Follow-up semana 12/mai |
| Michael Page | — | A contatar | Buscar consultor Sul no LinkedIn |
| Evermonte | — | Cadastrado portal | — |
| deBernt | — | A contatar | — |
| Odgers Berndtson | — | A contatar | — |

---

## 10. Arquivos no Repositório

| Arquivo | Status | Ação |
|---------|--------|------|
| `index.html` | ✅ Ativo — versão de produção | Nunca excluir |
| `PROJETO.md` | ✅ Ativo | Manter atualizado a cada sessão |
| `README.md` | ✅ Ativo | Manter atualizado |
| `senova-worker.js` | ✅ Referência | Versão de produção está no Cloudflare |

---

## 11. Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| API key expirar/vazar | Baixa | Alto | Configurada como secret no Worker — nunca exposta no código |
| GitHub Pages fora do ar | Muito baixa | Médio | Backup do index.html neste projeto Claude |
| KV perder dados | Muito baixa | Alto | Exportar backup mensal dos dados via `/api/vagas` |
| Limite Cloudflare gratuito (100k req/dia) | Baixa | Médio | Uso pessoal — estimativa de ~50 req/dia |
| Lusha bloqueada | ✅ Resolvido | — | Substituída pelo Hunter.io |

---

## 12. Glossário

| Termo | Significado |
|-------|-------------|
| ATS | *Applicant Tracking System* (sistema de triagem automática de currículos) |
| Worker | Script Cloudflare que roda na borda da rede, sem servidor |
| KV | *Key-Value store* — banco de dados simples do Cloudflare |
| PMV | Produto Mínimo Viável |
| Brand Book | Guia de identidade visual — cores, fontes, tom de voz |
| Cron trigger | Tarefa agendada — executa automaticamente em horário definido |
| RSS | Feed de conteúdo estruturado — permite leitura automática de notícias e vagas |
| Social listening | Monitoramento de sinais públicos (notícias, LinkedIn) para detectar oportunidades |

---

*Documento mantido no repositório GitHub e no Projeto Claude de Marcos Franco.*  
*Versão 1.0: 04/mai/2026 · Versão 2.0: 11/mai/2026*
