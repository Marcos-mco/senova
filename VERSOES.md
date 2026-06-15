# SENOVA — Controle de Versões
*Mantém apenas versões recentes (v3.25+). Histórico completo: VERSOES_HISTORICO.md*

## Como restaurar qualquer versão
1. github.com/marcos-mco/senova → Commits → encontrar versão → Browse files
2. index.html → Raw → Ctrl+A → copiar → publicar

---

## v3.28 — 12/jun/2026 (ATUAL)
**Status:** Funcional · Deploy GitHub Pages ✅
**Commits:** `2da579b` | **Worker:** v7.8 (sem alteração)

- fix(cv+carta): perfil corrigido — cidade Uberlândia, cargo Comercial/Vendas/Negócios, Master em Vendas e Marketing Estratégico, pretensão R$15k
- CV_BASE PT/EN/ES: títulos, localização, Master e ATS_SYSTEM alinhados ao perfil real
- gerarCartaATS: usa ATS_SYSTEM(lang) como system prompt + contexto expandido 1500 chars
- Sidebar, PDF footer/title, email generators: todas as referências a "Marketing" e "Curitiba" corrigidas
- F3: campo "Quem indicou?" no modal quando Canal=Indicação + botão "+ Indicação" na Home

---

## v3.27 — 09/jun/2026
**Status:** Superada ✅ | **Worker:** v7.8 (deploy 09/jun)

- Modal Entrevista: canal convite + data/hora + Outlook Calendar + dica Sofia
- Fathom: pré-classificação Worker + "📹 Gravação" na Home + vínculo ao card
- Oportunidades: consolidação email + busca automática com sub-seções
- Ações por card varredura: Ignorar individual + Adicionar individual
- Google Alert: artigos individuais com título e link real (worker + app)
- Bing News RSS como primário, Google fallback, cache 4h
- Captura de Aprendizado ao arrastar para Negado/Aceito/Descartado
- KPI strip: Ativos, Taxa retorno, Entrevistas, Propostas
- Para Hoje: Entrevista sem data → urgência roxa "agendar data"

---

## v3.25 — 03/jun/2026
**Status:** Superada ✅

- Home redesign v3.27 — 2 colunas (Para Hoje | O que há de novo)
- Vocabulário: "varredura" → "Oportunidades automáticas" em toda UI
- Para Hoje: seção "Retornos recebidos" (emails positivo/pipeline/hunter)
- Oportunidades automáticas visíveis na Home (73 vagas Adzuna/Jobicy)
- URL de vaga LinkedIn extraída do parâmetro trk
- Worker: fetch HTML individual para emails de vaga — hrefs reais
- Botão ↗ Ver vaga no cabeçalho do modal de processo
- Enriquecimento retroativo de URLs (últimos 7 dias)
- Canal correto por URL: LinkedIn/Indeed/Gupy detectados automaticamente
- Email recrutador: filtra no-reply automaticamente
- extrairDadosDescricao: detecta Modelo e Regime

---

## v3.12.7 — 25/mai/2026
**Status:** Completo e validado ✅
**Commits:** `64f4a86` · `75b07dd` · `6273896` | **Worker:** `007d2dec` (sem alteração)

- DLS obrigatória em todos os idiomas: movida para fora do BLOCO_GRAFICO nos CVs PT/EN/ES
- MBA FGV: `MBA em Administração de Empresas — FGV Curitiba (1998–2000)` — nunca associar a Marketing
- PDF executivo: duplo cabeçalho corrigido — título de `cvLinhas[1]`, corpo de `cvCorpo`
- `c62585a` — bug Kanban: card novo não aparecia com filtro ativo
- `7d1231e` — Analisar Candidatura salva card antes de abrir análise
- `956bd2a` — reset completo do modal Novo Contato
- `4a7ef24` — temperatura padrão vazia no header Novo Contato
- `c01dff1` — placeholder Nome Novo Contato corrigido
- `fa5265a` — botão "+ Novo" com submenu Processo / Contato
- `d6b1424` — botão Salvar independente no modal Novo Processo
- `198e84d` — validação campos obrigatórios modal Novo Processo (asteriscos)
- `059448c` — modal "Nova Vaga" → "Novo Processo"; extração automática IA
- `b21344d` — modal Novo Contato: temperatura "—", validação completa
- `6591432` — PROJETO.md: conceito Atividade + regra botão + Novo

---

## v3.12.6 — 25/mai/2026
**Status:** Superada ✅ | **Commit:** `b902ed1`
- Ghaphical Consult: Posigraf como principal cliente + relocação SP→Curitiba

---

## v3.12.5 — 25/mai/2026
**Status:** Superada ✅ | **Commits:** `5e20713` · `a4d8f07` · `4cc9a72`
- PROJETO.md: Seleção inteligente de blocos de CV por setor (backlog)
- Intec Tecnologia: revenda Apple (LaserWriter, ImageWriter, periféricos)
- Color management e Guia da TVA nos CVs PT/EN/ES; Seções INFORMAÇÕES COMPLEMENTARES

---

## v3.12.4 — 25/mai/2026
**Status:** Superada ✅ | **Commits:** `6d8f578` · `e526447`
- Histórico completo de carreira gráfica no VIRGILIO.md
- CV_BASE PT/EN/ES: Editel 2 cargos separados com datas corrigidas; Certificações; Prêmios; Docência

---

## v3.12.3 — 22/mai/2026
**Status:** Completo e validado ✅
**Commits:** `e4fefdf` · `7a4b35d` · `2a4123d` · `619b131` · `2e754ad` · `58c7a94` | **Worker:** `007d2dec`
- Central de Sinais 3 bugs (emails lista vazia, alertas inline sem onclick, seta vagas)
- Email fetch: janela 7 dias + orderby desc + body limit 2000→5000 + webLink
- Google Alerts: todos os artigos do digest; filtro vistos; race condition; abertura direta Outlook Web

---

## Worker v7.8 — Cloudflare (atual)
- URL: senova-proxy.marcos-mco.workers.dev
- Deploy: 09/jun/2026
- KV: SENOVA_KV | Cron: `0 10 * * *` (07h BRT)
- OAuth scopes: Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access
- Tenant: `consumers` (Hotmail pessoal marcos_mco@hotmail.com)
- Modelo IA: `claude-sonnet-4-6` ✅
