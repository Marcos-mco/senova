# SENOVA — Histórico de Versões (Arquivo)
*Versões v1 a v3.12.2 — arquivadas em 26/mai/2026*
*Para versões recentes: ver VERSOES.md*

---

### v3.12.2 — 22/mai/2026
**Status:** Superada ✅ | **Commits:** `f9e1eb4` · `6f5a010` · `186cc61` | **Worker:** `cd021033`
- Fix res.ok antes de res.json nas chamadas de email e varredura
- Auto-fetch descrição Adzuna quando jobDesc vazio
- Fix Google Alerts — separar antes da classificação IA

### v3.12.1 — 22/mai/2026
**Status:** Superada ✅ | **Commit:** `8036403`
- Fix regressão: cards do Pipeline não abriam (`===` estrita em IDs mistos string/number)

### v3.12 — 22/mai/2026
**Status:** Superada ✅ | **Commit:** `22ba509`
- UTF-8 charset no Worker; modelo atualizado claude-sonnet-4-5 → 4-6; Lead → Oportunidade (interface only)

### v3.11 — 21/mai/2026
**Status:** Superada ✅
- Sofia implementação completa (4 tabs); 11 skills auditados e atualizados; session_start.md criado

### v3.10 — 18/mai/2026
**Status:** Superada ✅
- 9 bugs corrigidos (Fase 0); busca automática de descrição por URL; Worker v7.7

### v3.9 — 17/mai/2026
**Status:** Superada ✅
- Botão Candidatar no modal; fallback cv; follow-up automático +7d após envio Outlook

### v3.8 — 17/mai/2026
**Status:** Superada ✅
- Limpeza em lote; parsing inteligente de emails via Claude; badge Revisar

### v3.7 — 16/mai/2026
- Alertas follow-up 3 níveis de urgência (7/14/21d); badges e bordas por nível

### v3.6 — 16/mai/2026
- Extensão Chrome Senova Capture (MV3); Worker v7.6 POST /api/vagas-lead

### v3.5 — 16/mai/2026
- Worker v7.5 Hunter.io: email do decisor nos sinais de mercado; card email decisor no frontend

### v3.4 — 16/mai/2026
- Worker v7.4 Sinais de mercado (Google News RSS + IA); Painel Alertas 2 blocos

### v3.3 — 16/mai/2026
- Worker v7.3 Varredura automática (Adzuna + Jobicy, cron 07h BRT); Home 2 colunas responsivas

### v3.2 — 15/mai/2026
- Modal Editar Vaga definitivo; Fluxo Análise CV → Candidatura; Pipeline completo; Timeline + Outlook

### v3.1 — 13/mai/2026
- Home cockpit; Pipeline Lead; Worker v6; PDF Executivo; drag-and-drop inicial

### v2 — 06/mai/2026
- Anti-ATS, LinkedIn, Pipeline CRM básico, Entrevista

### v1 — abr/2026
- Landing page + Anti-ATS básico
