# SENOVA — Controle de Versões
*Mantém apenas versões recentes (v3.25+). Histórico completo: VERSOES_HISTORICO.md*

## Como restaurar qualquer versão
1. github.com/marcos-mco/senova → Commits → encontrar versão → Browse files
2. index.html → Raw → Ctrl+A → copiar → publicar

---

## Sessão 34 — 21jul/2026 (ATUAL — CV: curadoria nível-aware + skill de QA final)
**Status:** fechado e pushado (`7c28a95`). Fecha as 2 pendências deixadas em aberto na S33.

- `_nivelAlvoPDF(cargoVaga)` novo: classifica o cargo-alvo por regex na taxonomia de `PERFIL_MARCOS`. `_cvParaPDF` aplica a regra já existente em `skill_cv.md` ("1 página até Gerente Sênior, 2 páginas C-Level") — nunca tinha sido implementada. Medido com jsPDF real: 9 experiências = sempre 2 páginas; caber em 1 = 5 experiências, bullets completos só nas 2 mais recentes. Nível ambíguo/vazio nunca corta.
- `skill_qa_cv.md` novo: 5 eixos (veracidade/ATS/ortografia/adequação à vaga/design), uso sob demanda antes de candidatura real.
- 9 testes novos em `testes/cv_estrutura.js` (26/26 · 148 casos na suíte inteira).
- **Pendente de teste:** Marcos abrir `PREVIEW_gerencial_1pag.pdf`/`PREVIEW_diretoria_2pag.pdf` (raiz do projeto, não commitados) e confirmar a versão de 1 página.

---

## Sessão 33 — 21jul/2026 (CV: portão único + diagramação final pelo Brand Book — fechada em `53740ed`)
**Status:** fechado e pushado. Correção pendente da S31 (Editel + data Consigliere) commitada em `328e316`. Arquitetura anti-regressão (`setCV`/`setStatus` + guard + pre-commit hook) fecha o vazamento de análise no PDF que travou 3-4 sessões seguidas. Diagramação final do PDF Executivo pelo Brand Book, aprovada por Marcos comparando com o CV de referência dele.

- `_cvParaPDF` (`8e820b3`): estrutura do CV separa FATOS (`PERFIL_MARCOS` via `filtrarExperienciasRelevantes` — cargos/empresas/datas/bullets, nunca inventados pela IA) de ADAPTAÇÃO (subtítulo/resumo/competências extraídos do CV da IA, com fallback ao perfil).
- `_buildPDFExecDoc` reescrito (`53740ed`): desenha bloco a bloco (não mais texto corrido). Playfair Display 700 embutido só no nome (~54KB, subset latin — TTF completo pesava 300KB, descartado por peso). Corpo/títulos em Helvetica nativa, navy+dourado. Validado com jsPDF real (Node) + extração de texto de volta: prova de ATS (texto vetorial, nunca imagem).
- Fix pós-aprovação (mesmo commit): bloco de experiência (cargo+empresa+período+bullets) mede a própria altura antes de desenhar — nunca deixa um bullet órfão isolado ao quebrar página.
- **Fechado na S34:** QA final do CV (`skill_qa_cv.md`) e curadoria de experiências (`_nivelAlvoPDF`).

---

## Sessão 31 — 16jul/2026 (correção de dados do Virgílio — fechada em `328e316`)
**Status:** check-up confirmou que a migração `PERFIL_MARCOS` (S30) já está commitada (`03b9f14`) e completa — `ATS_SYSTEM` de 2 estágios, `CARTA_SYSTEM`/`EMAIL_ENVIO_SYSTEM` já usando `perfilFormatadoPara`. Corrigidos 2 dados incorretos apontados pelo Virgílio:

- **Editel 1996–2001:** id trocado de `editel-gerente-nacional` para `editel-gerente-producao`, cargo de "Gerente Nacional de Produção" para "Gerente de Produção Gráfica", bullets substituídos pelos 2 fatos confirmados por Marcos (transição analógico→digital em computação gráfica/Macintosh/color management + autogestão -73% mão de obra/+240% produção).
- **Consigliere:** início corrigido de dez/2025 para **nov/2025** — divergência achada em teste (código e docs diziam dez/2025, o pedido do Virgílio dizia nov/2025); Marcos confirmou nov/2025 como correto. Corrigido em `PERFIL_MARCOS` (index.html) + `CV_BASE` (3 idiomas) + `PERFIL_MARCOS.md` + `CONTEXTO_SESSAO.md`, para não ficar dado divergente entre as fontes.
- Testado com `filtrarExperienciasRelevantes` rodando de verdade (Node, fora do browser) numa vaga sintética de Gerente Geral (Bahia, bens de consumo): ordem cronológica reversa correta, Editel e Consigliere com dados certos, Sócio-Fundador presente. `api.anthropic.com` = 0 resultados.

---

## Sessão 30 — 14jul/2026 (commitado em `03b9f14`)
**Status:** migração do gerador de CV do Anti-ATS de `CV_BASE` (texto livre) para `PERFIL_MARCOS` (dado estruturado), com filtro determinístico de experiências relevantes rodando antes de qualquer chamada à IA. Backup pré-migração: `senova_v3.67_14jul2026_pre-perfil-marcos-migracao.html`.

- Novas funções: `filtrarExperienciasRelevantes(textoVaga, nivelVaga)`, `formatarExperienciasPerfil`, `perfilFormatadoPara`.
- `ATS_SYSTEM`, `CARTA_SYSTEM`, `EMAIL_ENVIO_SYSTEM` passam a receber o texto da vaga e usar o perfil já filtrado — a IA nunca mais decide o que é relevante, só traduz/otimiza redação.
- `CV_BASE` mantido (não removido) — segue servindo LinkedIn Optimizer e helpers de autofill do copiloto.

---

## Sessão 26 — 09jul/2026
**Status:** App produção sem alteração · Extensão **v2.59** (instrumentação de diagnóstico) · Worker **v7.9** sem alteração
**Commits-chave:** `e9aedaa` diag(extensão) iframe same-origem · `0184508` chore backup worker v7.8
**⚠️ Sessões 23–25 não têm entrada aqui** (arquivo ficou parado na 22) — ver `VIRGILIO.md` para candidatura direta generalizada, trava de arquivamento e vazamento de e-mail multi-vaga.

Marcos reportou copiloto sem preencher formulário numa vaga do SmartRecruiters (Louis Dreyfus/oneclick-ui).
- **Diagnóstico (senova-auditor):** formulário real vive num `<iframe>` mesma origem nunca varrido pelas funções de detecção de campo do content.js; sem tratamento específico de SmartRecruiters (cai no genérico) — buraco estrutural, não falta de regra por portal.
- **v2.59:** só instrumentação — painel ganha linha "iframes mesma origem" (conta campos lá dentro) para confirmar a hipótese com dado antes do fix real.
- **Próximo:** reteste de Marcos na mesma vaga → confirma → implementa travessia de iframe same-origin nas 4 funções de varredura.

---

## Sessão 22 — 30jun–01jul/2026
**Status:** App produção **sem alteração** · fix **H4+H3 no working tree (não testado/não commitado)** · Extensão **v2.58** · Worker `a5a11b89`
**Commits-chave:** `2e4fc90` MANIFESTO_SENOVA.md (constituição — local, não pushado)

Sessão de **fundação**: manifesto do produto + auditoria do substrato de aprendizado (Passo 1).
- **MANIFESTO_SENOVA.md ratificado:** a quem o Senova serve e como ganha a vida sem se trair (2 crivos, sem contra-indicação, IA do lado da pessoa, métrica-norte). Complementa SOFIA_ALMA.md.
- **Passo 1 (senova-auditor):** happy path sólido (inclui ética); lacunas p/ Sofia = retorno (volátil), transições (prosa), setor (ausente).
- **H4+H3:** grava `atsAnaliseData` + `atsCvIdioma` na análise (backup `senova_v3.47`). Aguarda teste de Marcos.
- **Decisão:** Easy Apply deep-dive fora do V1 (só detecção honesta); universal na arquitetura, um corredor por vez.

---

## Sessão 20 — 29/jun/2026
**Status:** Funcional · App **sem alteração** · Extensão **v2.50** · Worker `a5a11b89` (sem alteração)
**Commits-chave:** extensão `content.js`/`manifest.json` v2.40→v2.50

Sessão de **destravar o copiloto em candidaturas reais (DHL/Lumesse) por DIAGNÓSTICO instrumentado**, não por chute.
- **Método:** a extensão virou o próprio sensor — painel mostra o que enxerga + botão "Copiar para enviar ao Bruno".
  Princípio de Marcos: **anti-gambiarra** (só fix geral, nunca específico de portal).
- **v2.41** diagnóstico · **v2.42** rótulo por posição (+ trava: pergunta só com "?") · **v2.43** diagnóstico turbinado
  (provou container errado) · **v2.44** amplia container quando `<form>` é pequeno · **v2.45** nunca falha calado ·
  **v2.46** mensagem honesta ("Preenchi X, faltam Y") · **v2.47** diagnóstico de upload · **v2.48** anti-pisca (dedup
  de innerHTML) · **v2.49** Baixar CV geral (DHL tem 0 file inputs → só entregar o CV, você sobe) · **v2.50** painel
  com altura máx/rolagem + arrasto vertical.
- **Validado:** CV gerado + arrastar ✅ · lê formulário inteiro ✅ · mensagem honesta ✅. Painel v2.50 teste final pendente.
- **Backlog:** consentimento de sensíveis no Perfil · preencher dropdowns (delicado) · esconder/decidir o Modo Diagnóstico.

---

## Sessão 19 — 29/jun/2026
**Status:** Funcional · Deploy GitHub Pages ✅ · Extensão **v2.40** · Worker `a5a11b89` (sem alteração)
**Commits-chave:** card `f67dd2b`→`2e5b0ee` · extensão `203f892`→`6b71678` (v2.34→v2.40)

Sessão de **refazer o card de Oportunidade sob o crivo cognitivo** + **destravar o copiloto** em portais reais.
- **Card (produção):** análise automática = só Compatibilidade; Documentos sob demanda ("Gerar CV"); "Dados da vaga"
  fora do lead importado; rodapé com "Ir para vaga" navy gravando ao sair; **anti-perda** (salvar mescla, nunca descarta
  análise); Gerar CV nunca de snippet (piso 400); vocabulário (Compatibilidade, PDF Executivo, sem "Score"); descrição
  compacta sem scroll.
- **Extensão v2.34→v2.40:** LinkedIn não inventa formulário; não invade Google; first/last name; auto-detecta envio
  em /thanks; preenche Gupy (sem `<form>`); painel arrastável; auto-seleciona habilidades; reconhece Easy Apply.
- **Processo:** senova-auditor 7× (verificação independente antes de cada deploy de risco). Memória nova
  `feedback_auditar_antes_do_teste`.
- **Próximo:** score + Gerar CV indo direto no LinkedIn (copiloto automático em toda vaga).

---

## Sessão 18 — 25/jun/2026
**Status:** Funcional · Deploy GitHub Pages ✅ · Extensão **v2.33** · Worker deploy `a5a11b89`
**Commits-chave:** copiloto `4121adb` · worker `7dda6e4` · index até `8bd751d`

Sessão de **Copiloto de Candidatura + fundação de skills + estabilização**.
- **Copiloto (extensão v2.33):** lê a vaga, acompanha ao site, preenche dados+perguntas, CV
  on-demand (card=fonte de verdade), candidatura auto/manual, entrada "Por fora", cobertura
  universal de portais. Funções de ponte no app: `__senovaCartaoCandidatura`,
  `__senovaCopilotoRespostaPrompt`, `__senovaCopilotoGerarCV/SalvarCV`, `__senovaDesfazerCandidatura`.
- **Fundação:** 2 skills novos — `skill_arquitetura_cognitiva` v2.0 (cognição+ética) e
  `skill_engenharia_senova` (técnica). Doc `docs/fluxo_definitivo_card_copiloto.md`.
- **Estabilização (caminho C):** rate limit por IP no Worker (`/api/claude`, `/api/analisar-vaga`).
- **Revertido:** fix 1 do card (ações no lead) — será refeito sob o crivo cognitivo (ver SESSAO.md).

---

## v3.40 — 23/jun/2026 — Sessão 14
**Status:** Funcional · Deploy GitHub Pages ✅ · Extensão v2.16 (sem alteração)
**Commit estável:** `b0155c5` | **Worker:** sem alteração nesta sessão

Sessão de **eliminação de duplicatas de vaga** — diagnóstico de causa raiz guiado por dados reais do card (console).

- **Sintoma:** card "Diretor de vendas e vagas semelhantes" preso em "Aguardando análise" + CrowdStrike duplicado na coluna Oportunidade.
- **Causa raiz (provada):** a criação de card por e-mail deduplicava só por **assunto** do e-mail, ignorando o **jobId do LinkedIn** no link → digest "X e vagas semelhantes" recriava vaga já existente. O duplicado nunca enriquecia porque `__senovaAtualizarDesc` casa por jobId com `findIndex` (a descrição sempre caía no primeiro card).
- **Fix Parte 1 (prevenir):** guard `!_vagaJaExiste({url:linkVaga})` na entrada por e-mail ([index.html:8295]). Vagas sem jobId (Adzuna etc.) não são afetadas — zero regressão.
- **Fix Parte 2 (limpar):** migração `dedup_jobid` → **v2** (re-roda 1×). Mantém o card de status mais avançado, arquiva a duplicata com timeline — não deleta. Backup automático (Sessão 13) dispara antes.
- **Validado por Marcos:** Oportunidade 4→2; FPP "Gerente de Marketing e Comercial" (82%) intacta; 2 duplicatas (digest FPP + CrowdStrike) arquivadas e recuperáveis. Bug do CrowdStrike resolvido pelo mesmo fix (era LinkedIn, tinha jobId) — fix separado de dedup não-LinkedIn dispensado.
- **Descoberto no caminho:** botão "Ver arquivados" não está exposto na UI (função `toggleArquivados` e seção `kanban-arquivados-wrap` existem, nada aciona) → novo bug B11.

---

## v3.39 — 23/jun/2026 — Sessão 13
**Status:** Funcional · Deploy GitHub Pages ✅ · Extensão v2.16 (sem alteração)
**Commit estável:** `5964639` | **Worker:** sem alteração nesta sessão

Sessão de **segurança de dados** — recuperação de card perdido + blindagem contra perda futura.

- **Incidente:** card "TV Integração" (entrevista, ATS 91) sumiu por **delete acidental** (id em `senova_deleted_ids`), não pela migração. Recuperado do `senova_backup_20260616.json` (só o card, mesclado ao estado atual — nada recente perdido).
- **Fix #1 — Migração não-destrutiva:** `dedup_jobid` nunca funde/apaga entrevista/proposta/aceito; duplicata comum vira arquivado com timeline, em vez de deletada sem rastro.
- **Fix #2 — Backup automático:** snapshot diário de `senova_vagas_v2` antes das migrações (3 dias), sacrificável sob cota (`saveVagas` descarta para nunca perder o vivo). Nova UI "Pontos de restauração automáticos" em Perfil > Preferências.
- **Validado por Marcos:** Testes 1 (regressão) e 2 (backup visível) OK.

---

## v3.38 — 22/jun/2026 — Sessão 11
**Status:** Funcional · Deploy GitHub Pages ✅ · Extensão **v2.16** (recarregar local — +permissão `cookies`)
**Commit estável:** `a6c2c57` | **Worker:** sem alteração nesta sessão

Sessão dedicada ao **enriquecimento de vagas de e-mail** (causa: vagas de digest sem descrição/score, com títulos feios). Arquitetura trocada e vários bugs de raiz resolvidos:

- **Enriquecimento via API pública `jobs-guest`** do LinkedIn (`_buscarDescricaoGuest`) — substitui a aba de fundo (que o LinkedIn congelava sem foco). Sem abrir aba, sem foco, sem enviar cookie. Traz cargo/empresa reais → limpa título de digest.
- **Detecção de login** via cookie `li_at` (só existência, nunca o valor) → **banner "Faça login no LinkedIn"** quando deslogado; **indicador "⚙️ Analisando vagas…"** quando processando.
- **Casamento por ID da vaga** (`/jobs/view/ID`) em vez de URL crua — à prova de `?`, `#`, `/comm/`. `__senovaAtualizarDesc` retorna se casou; só "queima" a tentativa quando o card muda de fato (falha reprocessa).
- **Limiar único (>120 chars)** entre pendente/gravar/pontuar — fim do limbo "Aguardando análise" das descrições 120–399.
- **Render respeita `filtroAtivo`** (card sob filtro não ficava mais preso).
- **Dedup por ID da vaga** (`_vagaJaExiste`) — mesma vaga por fontes diferentes não duplica + migração que junta duplicados já existentes.
- **Remoção de cards-lixo** sem link (boas-vindas/notificações de e-mail) — `_ehVagaLixo` + migração.
- **Agente `senova-auditor`** criado em `.claude/agents/` (auditoria de causa raiz com arquitetura embutida).

---

## v3.37 — 21/jun/2026 — Sessão 10
**Status:** Funcional · Deploy GitHub Pages ✅ · Extensão v2.15 (recarregar local)
**Commit estável:** `825c2d9` | **Worker:** $batch + limpar-backlog + temperature:0

- **P3 ✅** emails marcar-lido/mover: causa raiz = limite de subrequests; Graph $batch + endpoint limpar-backlog (auto no sync). Confirmado.
- **P1 ✅** score: separar Compatibilidade (`atsScore`) do ATS do CV (`atsCvScore`); `temperature:0` no /api/analisar-vaga (determinístico); reset eager recalcula leads; **só calcula com descrição ≥400 chars**.
- **P2 🧪** vagas de email sem descrição: **extensão enriquece em background** (aba de fundo, content.js extrai, throttle); re-captura limpa cargo/empresa. Falta teste (recarregar extensão).
- **Estudo de precificação** criado (`ESTUDO_PRECIFICACAO_20jun2026.md`) — insumo do business plan.
- **Pendente:** P4 (logos), P5 (validar fixes).

---

## v3.28 — 12/jun/2026 — Sessão 7
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
