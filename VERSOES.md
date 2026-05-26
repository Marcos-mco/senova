# SENOVA — Controle de Versões
*Mantém apenas versões recentes (v3.12.3+). Histórico completo: VERSOES_HISTORICO.md*

## Como restaurar qualquer versão
1. github.com/marcos-mco/senova → Commits → encontrar versão → Browse files
2. index.html → Raw → Ctrl+A → copiar → publicar

---

## v3.12.7 — 25/mai/2026 (ATUAL)
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

## Worker v7.7 — Cloudflare (atual)
- URL: senova-proxy.marcos-mco.workers.dev
- Deploy: `007d2dec` (22/mai/2026)
- KV: SENOVA_KV | Cron: `0 10 * * *` (07h BRT)
- OAuth scopes: Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access
- Tenant: `consumers` (Hotmail pessoal marcos_mco@hotmail.com)
- Modelo IA: `claude-sonnet-4-5` ← pendente atualizar para `claude-sonnet-4-6`
