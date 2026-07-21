# SESSAO.md — Estado Vivo
> Última atualização: 21/jul/2026 — Sessão 34 · CV: fechadas as 2 pendências da S33 (curadoria nível-aware 1x2 páginas + skill_qa_cv.md) — aprovado por Marcos
> ⚠️ Histórico completo e canônico vive em `VIRGILIO.md`. Este topo reflete o estado REAL.

## VERSÃO ATUAL
Senova app — produção em marcos-mco.github.io/senova · **pushado; aprovado por Marcos**
Extensão **v2.66** (sem alteração nesta sessão). Worker **v7.12** (sem alteração).
Último commit `bf1628d`. Commits da S34: `0daa596` (versiona backup pendente do Worker v7.9) · `7c28a95` (curadoria nível-aware `_nivelAlvoPDF`/`_cvParaPDF` + `skill_qa_cv.md`) · `bf1628d` (docs: fecha S34).

---

## SESSÃO 34 — CV: FECHA AS 2 PENDÊNCIAS DA S33 (21/jul)

Marcos: "Nada pendente. Termine 1 e 2."

- **Curadoria nível-aware:** `_nivelAlvoPDF(cargoVaga)` classifica o cargo-alvo por regex na taxonomia de `PERFIL_MARCOS` (c-level/diretoria/gerencial/...); `_cvParaPDF` usa isso pra aplicar a regra já existente em `skill_cv.md` ("1 página até Gerente Sênior, 2 páginas C-Level") — nunca implementada até agora. Medido com jsPDF real no scratchpad: 9 experiências = sempre 2 páginas; pra caber em 1 mostra as 5 mais recentes, bullets completos só nas 2 mais recentes. Nível ambíguo/vazio nunca corta (default seguro). RPC nos 2 cargos preservado em qualquer cenário.
- **`skill_qa_cv.md`** novo — formaliza os 5 eixos (veracidade, ATS, ortografia, adequação à vaga, design) pra rodar antes de qualquer candidatura real.
- 9 testes novos em `testes/cv_estrutura.js` (26/26 · 148 casos na suíte inteira).
- Aproveitado pra versionar um backup de Worker pendente de sessão anterior.

**Aprovado por Marcos:** revisou os 2 PDFs de preview — formatação muito boa. Confirmou que a lógica já é guiada pela vaga ("o que manda é a vaga"), não um valor fixo — exatamente o que `_nivelAlvoPDF` faz. PDFs de preview apagados da raiz (nunca fizeram parte do app).

Ver `VIRGILIO.md` (Sessão 34) para o detalhamento técnico completo.

---

## SESSÃO 33 — CV: PORTÃO ÚNICO + DIAGRAMAÇÃO FINAL PELO BRAND BOOK (21/jul)

**O bug:** PDF gerado pela extensão mostrava a análise interna (MATCH SCORE, keywords, veredicto) no topo — nunca pode chegar a um recrutador. 3ª/4ª sessão seguida travada em regressão do CV; Marcos pediu algo **preventivo**, não mais corretivo.

**Fechado:**
- `setCV()`/`setStatus()` — portões únicos por onde TODO texto de CV e mudança de status passam (10 + 7 pontos migrados). `testes/guard.js` varre o `index.html` e barra qualquer escrita direta fora do portão. `.githooks/pre-commit` roda a suíte inteira (8 arquivos, 148 casos) antes de qualquer commit.
- Cabeçalho do PDF sem duplicação de contato (`_pdfCabecalhoCorpo`).
- **Diagramação final pelo Brand Book** (`skill_design_senova.md`+`DESIGN_SYSTEM.md`+`skill_cv.md`): mockup aprovado por Marcos, depois construído em 2 fases — `_cvParaPDF` (fatos do `PERFIL_MARCOS` + adaptação da IA por vaga) e `_buildPDFExecDoc` reescrito (Playfair Display 700 embutido só no nome, corpo Helvetica, navy+dourado). Validado com jsPDF real + extração de texto (prova ATS: texto vetorial, nunca imagem). Marcos aprovou o PDF real, pediu 1 ajuste (bloco de experiência nunca quebra deixando bullet órfão) — corrigido e revalidado.
- Pushado para produção (`origin/main`).

**Fechado na S34** — QA final do CV (`skill_qa_cv.md`) e curadoria de experiências (`_nivelAlvoPDF`).

Ver `VIRGILIO.md` (Sessão 33) para o detalhamento técnico completo.

---

## SESSÃO 31 — VIRGÍLIO: CORREÇÃO DE DADOS DO PERFIL_MARCOS (16/jul)

Check-up confirmou que a migração da S30 (`filtrarExperienciasRelevantes` + `ATS_SYSTEM`/`CARTA_SYSTEM`/`EMAIL_ENVIO_SYSTEM` em 2 estágios) já estava commitada e completa (`03b9f14`) — nada a migrar. Restava 1 correção de dado pedida pelo Virgílio; teste determinístico achou uma segunda:

- **Editel 1996–2001** (`index.html`): id `editel-gerente-nacional`→`editel-gerente-producao`, cargo "Gerente Nacional de Produção"→"Gerente de Produção Gráfica", bullets trocados pelos 2 fatos confirmados por Marcos (transição analógico→digital/Macintosh/color management + autogestão -73%/+240%).
- **Consigliere — data de início** (achado no teste, não no pedido original): código e os 2 docs de referência diziam dez/2025; o pedido do Virgílio presumia nov/2025. Perguntei a Marcos — confirmou **nov/2025**. Corrigido em 6 lugares: `PERFIL_MARCOS` + `CV_BASE` (PT/EN/ES) no `index.html`, e `PERFIL_MARCOS.md` + `CONTEXTO_SESSAO.md`.
- Validado rodando `filtrarExperienciasRelevantes` de verdade (Node, sem browser) numa vaga sintética de Gerente Geral (Bahia, bens de consumo): ordem cronológica reversa correta, Sócio-Fundador presente, Editel e Consigliere com os dados certos. `api.anthropic.com` = 0 resultados no `index.html`.
- **Fechado na S33** — aprovado e commitado em `328e316`.

---

## FRENTE BRUNO — FECHAR O PROCESSO PRINCIPAL (14/jul)

**A reorientação de Marcos (vale daqui pra frente):** *"A extensão É o copiloto"* — não é captura, não é uma telinha de botões. Dois caminhos, **mesma espinha**: **(A)** acho a vaga por fora → clico na extensão → ela **cria o card** e me ajuda na candidatura; **(B)** vaga já no Senova → o copiloto acompanha e **atualiza** o card. Única diferença: criar × atualizar. Marcos: *"viu o quanto ainda estamos longe do processo principal fechado e correto? Foque nisso"* → parar de desenhar telas soltas. Ver `project_processo_principal_copiloto`.

**A causa raiz que travava o processo inteiro: tudo dependia do jobId do LinkedIn.**
- O passe do Caminho A **não tinha jobId** → guardas `if(!an.jobId) return` matavam **em silêncio** o registro, a detecção automática e o desfazer, e **escondiam os botões de CV e carta**. O Caminho A nunca registrou nada — nunca.
- O background **inventava** `linkedin.com/jobs/view/{id}` → as pontes não achavam card de nenhum outro portal (Gupy/abler/Sólides/site da empresa) → `sem_card` / `return false` **calado**.
- **Não existia criar card**: vaga por fora sem card → registro morria. E sem card não há descrição — **sem descrição não se gera CV nem carta**.

**Fechado:**
- **`_acharVagaRef`** — ponto ÚNICO de casamento (jobId → URL real → empresa+cargo), usado pelo registro, pelo desfazer e pelas **4 pontes de documento**. (Casamento duplicado divergindo foi o que sumiu com o TV Integração na S24 — não repetir.)
- **`__senovaCopilotoGarantirCard`** (novo): ativar o copiloto numa vaga por fora **cria o card com a descrição da página**. É a peça que destrava o Caminho A inteiro.
- **Registro**: cria o card se não existe, idempotente, **nunca falha calado**.
- **Auto-reload da extensão**: Bruno atualiza a extensão sem intervenção de Marcos.

**Verificação — 83/83:** `node testes/registro.js` (35) · `testes/documentos.js` (23) · `testes/espinha.js` (25, integração dos 2 caminhos). Extraem as funções REAIS do `index.html`, sem browser. Ver `testes/README.md`.

**NÃO fechado (honesto):** validação em campo (exige o browser de Marcos) · **Estação 3 — envio por formulário** (a fronteira) · o **popup** que Marcos reprovou (3 botões: "Iniciar copiloto"/"Salvar"/"Analisar") segue como está, redesenho no parking lot.

---

## FRENTE VIRGÍLIO — MIGRAÇÃO DO CV (14/jul)

**Tema:** terminar a migração do gerador de CV do Anti-ATS para `PERFIL_MARCOS`, com um filtro determinístico (sem IA) decidindo QUAIS experiências entram — a IA só reescreve/traduz/otimiza a redação do que já foi filtrado.

- **`filtrarExperienciasRelevantes(textoVaga, nivelVaga)`** (novo, `index.html` antes de `CV_BASE`): sempre inclui as experiências com `incluir_por_padrao:true` e a atual (`fim:null`); as demais (DLS, Intec, Editora Abril, Ghaphical Consult — início de carreira em produção gráfica) só entram se houver correspondência real entre `tags_area` e o texto da vaga. Ordena por `fim` decrescente (cargo atual sempre primeiro) — mesma lógica cobre ordem entre empresas e dentro da mesma empresa (RPC diretor/gerente, Editel superintendente/gerente nacional).
- **`perfilFormatadoPara(textoVaga, nivelVaga)`**: bloco único (contato + resumo + experiências já filtradas + formação + idiomas) usado como fonte por `ATS_SYSTEM`, `CARTA_SYSTEM` e `EMAIL_ENVIO_SYSTEM`.
- **`ATS_SYSTEM`** virou 2 estágios: removida a instrução antiga de "CORTE IMPLACÁVEL" (a IA decidindo relevância) — agora o prompt deixa explícito que a lista já veio filtrada e a IA NUNCA pode omitir, acrescentar ou reordenar, só traduzir/otimizar redação. Atualizados os 4 pontos de chamada (`analyzeJob`, `analisarInline`, `gerarDocModal`, `window.__senovaCopilotoGerarCV`) para passar o texto da vaga.
- **`CARTA_SYSTEM`** e **`EMAIL_ENVIO_SYSTEM`** migrados também (decisão autônoma — risco baixo, ver resumo da sessão): ambos tinham texto de vaga/análise disponível no escopo de todos os call sites. `EMAIL_ENVIO_SYSTEM` deixou de ser uma string fixa e virou função (`EMAIL_ENVIO_SYSTEM(textoVaga)`).
- **Bug encontrado e corrigido durante o teste:** a tag genérica "gestão de equipe" deixava a Editora Abril (início de carreira) vazar em qualquer vaga que mencionasse "gestão de equipes" — ampliada a lista de tags genéricas ignoradas no filtro.
- **Bug relatado de comentários `\` em vez de `//` (linhas ~10046-10103, incl. `<\head>`):** verificado e **não existe** no arquivo atual nem no HEAD commitado — nenhuma correção necessária.
- **`CV_BASE` não foi removido** — continua servindo o LinkedIn Optimizer e os helpers de autofill/resposta de formulário do copiloto (`__senovaCartaoCandidatura`, `__senovaCopilotoRespostaPrompt`, `__senovaCopilotoEscolherHabilidadesPrompt`), fora do escopo desta migração.
- **Teste:** sem o texto real da vaga "Gerente Geral (Bahia, bens de consumo)" (não estava salvo em nenhum arquivo) — validado com Node.js rodando o filtro real extraído do `index.html` contra uma vaga sintética equivalente (Gerente Geral, Bahia, bens de consumo/FMCG). Resultado: 9 experiências principais + cargo atual incluídos em ordem cronológica correta, as 4 de início de carreira corretamente excluídas; teste inverso (vaga editorial/gráfica) confirmou que essas mesmas 4 entram quando genuinamente relevantes.

> ⚠️ Correção de estado: a migração `PERFIL_MARCOS` **já está commitada** (`03b9f14`) — Marcos autorizou o commit ("é do Virgílio"). O commit declara que **não passou pelo QA do Bruno**. A revisão dela segue pendente.

## PRÓXIMAS PRIORIDADES — SESSÃO 31 (retomar aqui)

| # | Item | Status |
|---|------|--------|
| 1 | **Validar o processo em campo**: abrir uma vaga real (score médio) e andar a espinha nos 2 caminhos. Único passo que exige o browser de Marcos — o resto está autotestado | Pendente |
| 2 | **Estação 3 — envio por formulário** (autofill/upload): a fronteira, não fechada | Aberto |
| 3 | Revisar a migração `PERFIL_MARCOS` (commitada sem QA do Bruno) + gerar um CV real numa vaga | Pendente |
| 4 | **Passo 1** (prompt anti-clichê do e-mail) — foi junto no `03b9f14`, ainda não validado em e-mail real | Pendente teste |
| 5 | **Popup** reprovado por Marcos (3 botões sem sentido de estado) — redesenho não feito | Parking lot |
| 6 | Gap do score (requisitos eliminatórios + eixo liderança×operação) | Parking lot |
| 5 | Sólides/perfil persistente — Copiloto não autopreencher onde o portal já preenche | Parking lot |

---

## O QUE FOI FEITO — SESSÃO 29 (10–11/jul/2026)

**Tema:** provar a REPETIÇÃO da espinha com uma 2ª vaga real → virou declínio consciente por FIT + 2 achados de produto.

- **Passo 1 (dívida da espinha):** afrouxado o prompt anti-clichê do e-mail — termos reais de Marcos (transformação digital, visão estratégica, gestão financeira, liderança) deixam de ser proibidos; regra vira "termo só grudado a um fato, senão corta"; só clichê vazio segue banido. QA OK, backup v3.64. **Não commitado** (só se testa gerando e-mail real; a volta da Dialog foi por formulário).
- **2ª volta — Dialog "Gerente de Marketing e Conteúdo" (LinkedIn → Sólides):** Compatibilidade 72. Portal **Sólides** (novo) exige login e **autopreenche 92%** do cadastro pela conta LinkedIn → autofill do Copiloto redundante/arriscado ali. Parou no filtro **ELIMINATÓRIO** de ferramentas operacionais (HubSpot/GA/RD Station/Power BI). Descrição dizia "focado em execução".
- **Decisão de Marcos: "Liderar".** Descompasso liderança×operação — a vaga quer operador, ele é o executivo que dirige. Declinou com honestidade (Cancelar no Sólides, card `lead` excluído). Sem culpa: o mesmo princípio que impede inflar nível dá o direito de declinar.
- **Achado de produto:** o score 72 não sinalizou que os requisitos eliminatórios eram operacionais/incompatíveis com o perfil → gap da análise. Memórias novas: `project_gap_score_lideranca_operacao`, `project_portais_perfil_persistente`.

## PRÓXIMAS PRIORIDADES — SESSÃO 30 (retomar aqui)

| # | Item | Status |
|---|------|--------|
| 1 | **Provar a REPETIÇÃO** com vaga de LIDERANÇA real (do tamanho do Marcos), até o envio. Preferir e-mail (valida o Passo 1) | Retomar |
| 2 | **Passo 1** — validar prompt anti-clichê gerando um e-mail real → commitar | Pendente teste |
| 3 | **Gap do score** — análise sinalizar requisitos eliminatórios + eixo liderança×operação | Parking lot |
| 4 | **Sólides/perfil persistente** — Copiloto não autopreencher onde o portal já preenche | Parking lot |

---

## O QUE FOI FEITO — SESSÃO 26 (09/jul/2026)

**Tema:** Marcos reportou (screenshot) que o Copiloto não preencheu o formulário de candidatura numa vaga da Louis Dreyfus Company no SmartRecruiters (`oneclick-ui`).

### Diagnóstico (senova-auditor, read-only)
- Causa raiz: o formulário real vive dentro de um `<iframe>` MESMA ORIGEM que a extensão nunca varre — `_acharContainerCandidatura`/`_scanPaginaCampos`/`_coletarCampos`/`_diagnostico` (content.js) só olham o `document` do frame de topo. `manifest.json` não injeta em iframes (`all_frames` ausente). Sem tratamento específico de SmartRecruiters (cai em `extractGenerico`) — buraco é estrutural, não falta de regra por portal.

### Instrumentação v2.59 (sem mudar comportamento de preenchimento)
- Painel de diagnóstico ganhou a linha "iframes mesma origem" (conta campos dentro de cada iframe acessível) para confirmar a hipótese com dado real antes do fix — mesmo método anti-gambiarra da Sessão 20.
- **Próximo passo:** pedir a Marcos para reabrir a mesma vaga e copiar o diagnóstico de novo. Confirmando, implementar a travessia de iframe same-origin nas 4 funções de varredura (painel continua só no frame de topo).

## PRÓXIMAS PRIORIDADES — SESSÃO 27 (retomar aqui)

| # | Item | Status |
|---|------|--------|
| 1 | **Reteste do diagnóstico v2.59** no SmartRecruiters (Louis Dreyfus) → confirmar iframe → implementar travessia | Aguardando dado de Marcos |
| 2 | Validar TRAVA DE ARQUIVAMENTO (S24, `e71c9e7`) | Pendente teste |
| 3 | "Para Considerar" com cargo ilegível (extração de e-mail no Worker) | Aberto |
| 4 | Terminar validação da TRIAGEM (S23): Perfil seletor humano + multi-select | Pendente teste |

Detalhe completo das Sessões 23–25 (candidatura direta generalizada, trava de arquivamento, vazamento de e-mail multi-vaga): ver `VIRGILIO.md`.

---

## O QUE FOI FEITO — SESSÃO 22 (30/jun–01/jul/2026)

**Tema:** sessão de **FUNDAÇÃO** — definir a quem o Senova serve e como ganha a vida sem se trair, e auditar o substrato de aprendizado do V1. Código de produção intocado.

### Fundação / estratégia
- **`MANIFESTO_SENOVA.md` (ratificado, `2e4fc90`):** constituição do produto — razão de existir (serve o usuário, não o dono), ordem missão↔renda, "sem contra-indicação", IA do lado da pessoa, métrica-norte (pessoas que encontram onde são chamadas, nunca tempo-de-tela), universal-na-arquitetura, os **2 crivos**, veredito visão≠utopia. Complementa `SOFIA_ALMA.md`. Editável só com autorização de Marcos.
- **Definição de "Pronto" do V1 (brief de Virgílio, acatado):** happy path sem erro + fora-de-escopo declarado + substrato de aprendizado capturando dado **ESTRUTURADO** (campos, não prosa), dentro dos cards existentes.
- **Universal × Pareto (decidido):** universal na ARQUITETURA (CV/carta agnóstico, qualquer língua); um corredor humano por vez na EXECUÇÃO. **Easy Apply deep-dive REBAIXADO** (upload/multi-página = a assíntota que prende); sobrevive só o fix de detecção honesta. **Mercado:** arranque lusófono primeiro; Bálcãs→Alemanha como 1ª expansão internacional.

### Passo 1 — auditoria do substrato (senova-auditor, read-only)
- **Happy path central SÓLIDO, incluindo a honestidade ética** (prompts não inventam; copiloto `[PULAR]`).
- **Maiores lacunas p/ a Sofia:** retorno recebido (volátil, nunca no card), transições de estágio (prosa), setor (ausente). Já estruturados: canal, desfecho+motivo, temperatura.
- **Higiene:** H1 (envio por e-mail sem anexo), H5 (dois campos de motivo divergentes), H2/H3/H4 (piso/idioma/data).

### Fix implementado (PENDENTE DE TESTE)
- **H4+H3 — gravar metadados da análise:** `atsAnaliseData` (data) + `atsCvIdioma` (idioma) no save da análise (`index.html:6821`) e preservados no rebuild do card (`index.html:6065-6066`). QA (Fase 2) passou; backup `senova_v3.47_30jun2026_pre-H4H3.html`. **Working tree modificado, NÃO commitado — aguarda o teste de Marcos.**

## PRÓXIMAS PRIORIDADES — SESSÃO 23 (retomar aqui)

| # | Item | Status |
|---|------|--------|
| 1 | **Testar H4+H3** (console: `vagas.filter(v=>v.atsAnaliseData)…`) → aprovar → commit | Pendente teste |
| 2 | **H5 — convergir os dois campos de motivo** (`motivo` vs `motivoArquivamento`) — fix planejado, mexe no save do card + migração | A planejar |
| 3 | **#6 Retorno recebido** — vincular e-mail classificado ao card (`teveRetorno/tipoRetorno/retornoData`) — maior valor p/ Sofia | A construir |
| 4 | **#5 Transições de estágio** (array `{de,para,ts}`) · **#1 setor** na extração da IA | A construir |
| 5 | **Manifesto** — decidir push (publicar) ou manter local | Decisão |

## DECISÕES DE PRODUTO — SESSÃO 22
- **Constituição escrita** (`MANIFESTO_SENOVA.md`) — pedra contra a qual toda decisão futura é medida.
- **Easy Apply deep-dive fora do V1** (só detecção honesta) — universalidade vem da arquitetura agnóstica, não de código por portal.
- **Substrato de aprendizado** vive nos cards existentes (`vaga`/`contato`) — nenhuma entidade nova.

---

## O QUE FOI FEITO — SESSÃO 20 (29/jun/2026)

**Tema:** o copiloto não preenchia candidaturas reais (caso DHL / plataforma Lumesse). Em vez de chutar, **instrumentamos o diagnóstico DENTRO da extensão** e corrigimos cada causa por DADO. Extensão **v2.40 → v2.50**. App e Worker intocados.

### Método (a virada da sessão)
- **A ferramenta virou o sensor.** Marcos (não-técnico) não precisa traduzir termos: o copiloto mede o que enxerga e mostra um botão **"📋 Copiar para enviar ao Bruno"**. Marcos clica, cola, o Bruno lê o fato.
- **Princípio de Marcos acatado:** não perseguir campo/upload de cada ATS — isso é **gambiarra**. Só entra fix **geral** (vale pra qualquer portal). Instrumentar → ver a verdade → consertar com dado.

### Extensão / Copiloto v2.41 → v2.50
- **v2.41 — Modo Diagnóstico:** painel reporta origem, container, nº de inputs, campos lidos/grupos, iframes, forma + botão copiar; log throttled no console.
- **v2.42 — Lê rótulo por POSIÇÃO:** `_rotuloCampo` acha o rótulo pelo texto ao redor (padrão ATS sem `for`). **Trava:** pergunta aberta só quando termina em "?" — PIS/CPF não viram prosa da IA.
- **v2.43 — Diagnóstico turbinado:** reporta visíveis na página / no container / sem rótulo / amostra de rótulos. **Provou** que o `<form>` da DHL tinha só 2 campos (resto fora dele).
- **v2.44 — Ampliação do container:** `<form>` pequeno demais → varre a página inteira (filtro de ruído reaproveitado). Lê 49→16/18 campos. Modais (Easy Apply) NÃO ampliam (confiáveis).
- **v2.45 — Nunca falha calado:** `_preencher` sempre avisa (app fechado / nada vazio / não consegui) — antes emudecia.
- **v2.46 — Mensagem honesta:** "✓ Preenchi Nome, Sobrenome. Faltam 12 campos que só você informa (CPF, datas, etc.)" — nunca só "✓ Preenchido".
- **v2.47 — Diagnóstico de upload:** conta `<input type=file>` (visíveis/ocultos).
- **v2.48 — Anti-pisca:** dedup de `innerHTML` (não re-renderiza se idêntico) → painel para de piscar em forms que mudam o DOM; diagnóstico fica aberto e copiável.
- **v2.49 — Baixar CV geral:** CV liberado em qualquer site de candidatura externo com card conhecido, **sem caçar campo de upload** (DHL tem **0** file inputs — widget próprio; atachar em input de outro site é proibido pelo navegador → baixar-e-você-sobe é o único caminho).
- **v2.50 — Painel:** `max-height:85vh` + rolagem interna, arrasto **vertical** funciona (clamp corrigido p/ painel alto), diagnóstico **fechado por padrão** (abre só quando não lê nada).

### Validado por Marcos
- ✅ **CV gerado + arrastar** funcionando (caminho principal do dia).
- ✅ **Lê o formulário inteiro** — Nome/Sobrenome/Cidade preenchidos no topo da DHL.
- ✅ **Mensagem honesta** aparecendo ("✓ Preenchi… Faltam 12…").
- 🧪 **Painel v2.50** (altura/rolagem/arrasto) — corrigido; teste final pendente.

## PRÓXIMAS PRIORIDADES (retomar aqui)

| # | Item | Status |
|---|------|--------|
| 1 | **Consentimento de dados sensíveis NO PERFIL** — CPF/PIS/nascimento/gênero: declarar + autorizar, "prefiro não informar". Até lá o copiloto lê e mostra, mas não preenche sensível. | A construir |
| 2 | **Preencher dropdowns/selects** ("Você trabalha na DHL?", "Por onde encontrou?") — feature nova e **delicada** (escolher errado é pior que deixar em branco). Hoje só preenche texto. | A avaliar |
| 3 | **Score + Gerar CV indo direto no LinkedIn** — copiloto automático em toda vaga (/jobs/view/) com "Analisar esta vaga" (herdado da Sessão 19). | A construir |
| 4 | **Modo Diagnóstico** — está embutido na extensão (discreto, fechado por padrão). Decidir: manter como ferramenta de campo ou esconder atrás de um toggle. | Decisão |
| 5 | Suavizar o flash inicial do diagnóstico no load · aposentar FAB legado | Limpeza |

## DECISÕES DE PRODUTO DESTA SESSÃO
- **O copiloto entrega o CV certo; o portal importa dele** (insight de Marcos). Não persegue campo/upload de cada ATS.
- **Anti-gambiarra:** só entra fix geral (qualquer portal). Fix portal-específico não entra.
- **Honestidade inviolável:** o copiloto nunca diz "pronto" quando não está, nem falha em silêncio.
- **Dados sensíveis** (CPF/PIS/nascimento/gênero) o copiloto **lê e mostra, mas não preenche** sem consentimento no Perfil.

---

## O QUE FOI FEITO — SESSÃO 19 (25→29/jun/2026)

### Card de Oportunidade — refeito sob o crivo cognitivo (produção)
- **Fix 1 (refeito, `f67dd2b`):** análise automática do lead = **só Compatibilidade** (`mvAutoCompatCheck`),
  nunca gera CV sozinho. Zona **Documentos** visível no lead com **"Gerar CV"** sob demanda
  (`mvSyncDocsCV`/`mvGerarCV`). Estado vazio mostra só o botão (sem textarea vazia/download fantasma).
- **"Dados da vaga" sai do lead importado** (`85263e9`) — valor vai aos pills do cabeçalho; mantido
  na criação manual (+ Processo) e nos estados ≥ CV Enviado.
- **Rodapé:** "Ir para vaga" vira navy/principal e **grava antes** de navegar; "Salvar" secundário (ghost).
- **Anti-perda (`582764e`):** `saveVaga`/`saveVagaSilent` agora começam com `...(existing||{})` — nunca
  descartam campos já gravados (compatFortes/atencao/emailAssunto/entrevistaData/descricao). Era perda
  latente, agravada por "Ir para vaga" salvar.
- **Gerar CV nunca de snippet (`582764e`):** piso de 400 chars unificado (compat/reanálise/geração);
  não grava atsCV vazio; fetch parcial libera nova tentativa.
- **Vocabulário (`05e38df`,`451ea0a`):** "Análise"→**Compatibilidade**, "Pontuação ao Projeto"→
  Compatibilidade, aba **CV**, badge "Score" suprimido, **PDF Executivo** (sem 🏆/emojis).
- **Descrição compacta (`2e5b0ee`):** preview ~3 linhas (max-height) → "Documentos" aparece sem scroll.

### Extensão / Copiloto — v2.34 → v2.40 (Marcos recarrega)
- **v2.34:** LinkedIn external-apply não diz mais "Formulário de candidatura" falso → "Candidatura no site da empresa".
- **v2.35:** copiloto **não invade** Google/sites sem candidatura — `_acharContainerCandidatura` exige campo de apply REAL.
- **v2.36:** **first/last name** no autofill (fim do "Marcos Franco" duplicado) — Cartão expõe `primeiroNome`/`sobrenome`; classificador distingue Sobrenome/Primeiro/Completo/ambíguo; resolução de contexto.
- **v2.37:** **auto-detecta envio** mesmo quando o portal redireciona para /thanks (`senova_form_visto` persistido por jobId, janela 45min). Limpa no envio e no "Não enviei".
- **v2.38:** **preenche ATS sem `<form>` (Gupy)** — fallback de coleta com filtro de ruído; **painel arrastável** pela barra do título.
- **v2.39:** **auto-seleciona habilidades** (chips) mais relevantes via IA — só clica chip que coletou E a IA escolheu (igualdade exata); `ehChip` barra submit/ação; NUNCA envia.
- **v2.40:** reconhece **Easy Apply** pelo aria-label (não classifica como externa).
- **Bridges novas no app:** `__senovaCopilotoEscolherHabilidadesPrompt`; Cartão ganhou `primeiroNome`/`sobrenome`.

### Processo da Sessão 19
- **senova-auditor usado 7×** (verificação independente read-only ANTES de cada deploy de risco).
- **Memória:** `feedback_auditar_antes_do_teste` — varrer todos os estados/edge cases e entregar a lista verificada ANTES de pedir teste.

## GIT
Branch `main`. Sessão 20 = extensão `content.js`/`manifest.json` (v2.40→v2.50) + docs de fechamento.
Sessão 19 = commits `f67dd2b` → `6b71678`.
