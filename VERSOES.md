# SENOVA — Controle de Versões

## Como funciona o backup
O repositório GitHub mantém o histórico completo de cada `commit`.
Para restaurar qualquer versão anterior:
1. Acesse github.com/marcos-mco/senova
2. Clique em "Commits" (acima da lista de arquivos)
3. Encontre a versão desejada e clique em "Browse files"
4. Abra o `index.html` → clique em "Raw" → Ctrl+A → copiar → publicar

---

## Versões conhecidas

### v3.1 — 13/mai/2026 (ATUAL — arquivo: senova_v3_13mai2026.html = backup pré-edição)
**Status:** Completo e validado ✅
**Funcionalidades:**
- Home cockpit com Proximas Acoes
- "Voce tem X emails novos" como item de acao
- Emails relevantes → coluna Lead do Pipeline automaticamente
- Clicar na tarefa → abre card do Pipeline
- Clicar no card → abre Anti-ATS pre-preenchido
- Anti-ATS chama Worker v6 (sem erro CORS)
- Filtros no Pipeline: prioridade, canal, ordenacao
- Cards com data e hora
- Campo email destinatario + botao Enviar CV via Outlook
- Campo URL de origem + botao Ver Origem
- Botoes Candidatar / Declinar no Anti-ATS
- PDF Executivo design navy/dourado
- Coluna Lead no Kanban
- Worker v6 integrado (senova-proxy.marcos-mco.workers.dev)
- **CORREÇÕES 13/mai:**
  - Bug grave: CV agora gerado em .docx real (html-docx-js CDN) em vez de .doc Word 97
  - Campo Notas expandido (rows 2→4) — não corta mais conteúdo no modal
  - Fluxo Analisar→Candidatar corrigido: usa ID da vaga de origem, não match por nome
  - Drag-and-drop no Kanban: arrastar card entre colunas muda status e salva

### v2 — 06/mai/2026 (arquivo: senova_suite_v2.html no projeto)
**Status:** Base funcional sem integrações completas
**Funcionalidades:** Anti-ATS, LinkedIn, Pipeline CRM básico, Entrevista

### v1 — abr/2026
**Status:** Versão inicial
**Funcionalidades:** Landing page + Anti-ATS básico

---

## Worker v6 — Cloudflare
- URL: senova-proxy.marcos-mco.workers.dev
- KV binding: SENOVA_KV
- OAuth: /consumers/ (conta pessoal Hotmail marcos_mco@hotmail.com)
- Vars obrigatorias: ANTHROPIC_API_KEY, MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI, MS_TENANT_ID

## Regra de ouro
**Antes de qualquer sessão de desenvolvimento:**
1. Virgílio deve ler este arquivo e o index.html atual do GitHub
2. Salvar backup com nome senova_v[N]_[data].html ANTES de modificar
3. Ao final da sessão, atualizar este arquivo com as mudancas feitas
