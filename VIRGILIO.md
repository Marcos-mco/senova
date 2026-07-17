# VIRGÍLIO — Instruções de Continuidade
*Atualizado: 17/jul/2026 — **Sessão 31 · dois bugs reais no fluxo de candidatura, fechados e confirmados por Marcos**.*

***SESSÃO 31 (16-17/jul):** dois bugs sérios no card/candidatura, achados por Marcos usando o app de verdade — não sprint planejado. **(1)** a nova importação de descrição por imagem (OCR) regrediu silenciosamente a análise automática em card NOVO/não-salvo: "Calculando análise…" ficava travado pra sempre porque não existia onde guardar o resultado antes do card existir. Corrigido com holder temporário `_mvNovoCardAnalise`, absorvido pelo `saveVaga()` no momento de criar o card (commit `7b0384a`). **(2)** mais grave: `candidatarDoModal()` desviava pra tela legada standalone "Avaliar Posição" quando o card ainda não tinha CV — Marcos rejeitou firme ("Não foi este o caminho aprovado… Nós temos um fluxo testado, aprovado e documentado") e mandou reunir a equipe antes de decidir. Escalado pro `senova-auditor`, que confirmou a causa E destravou 2 armadilhas que um fix apressado teria ignorado. Fix: `candidatarDoModal()` vira `async` e gera o CV **dentro do card** (`_mvGarantirCV`/`analisarInline`, o mesmo mecanismo já usado pelos botões de download — nunca mais navega pra outra tela) (commit `bd929c7`). **Confirmado ponta a ponta por Marcos:** e-mail nos Enviados do Outlook + card andou no Kanban. Marcos elevou o método a regra permanente: *"É assim que vc deve agir sempre. Vc é o chefe e sempre quer ter todas as informações para tomada de decisão."* Ver [[feedback_reusar_fluxo_aprovado_nao_inventar]] e [[feedback_reunir_equipe_antes_de_agir]]. **Os pendentes da Sessão 30 (abaixo) seguem intocados — este foi um desvio de bug real, não a continuação planejada.**

***FRENTE BRUNO — o PROCESSO PRINCIPAL foi fechado no código.** Marcos reorientou: "a extensão É o copiloto", dois caminhos (por fora **cria** o card / pelo Senova **atualiza**), e "foque no processo principal, não em telas". Auditoria achou a causa raiz que travava tudo: **o processo inteiro dependia do jobId do LinkedIn** — o Caminho A (vaga achada por fora) NUNCA registrou nada (guardas `if(!an.jobId) return` matando em silêncio), o background **inventava** uma URL fake do LinkedIn (então nenhuma ponte achava card de outro portal → `sem_card` calado), e não existia criar card (sem card não há descrição, sem descrição não há CV nem carta). Corrigido com **ponto único `_acharVagaRef`** (jobId → URL real → empresa+cargo) usado pelo registro, desfazer e as 4 pontes de documento; **`__senovaCopilotoGarantirCard`** novo (ativar o copiloto por fora cria o card com a descrição da página); registro idempotente que cria card e nunca falha calado. **AUTO-RELOAD da extensão** (v2.65+, validado em campo): ela se atualiza sozinha → o Bruno não depende mais de Marcos para deployar extensão. **83 testes automatizados** (`testes/`), o projeto nunca teve. Commits `2ba3b51`, `da4e998`, `61a7211`, `668b238`, `57f922e`, `baef9b2` — tudo pushado. **NÃO fechado:** validação em campo (exige o browser de Marcos), Estação 3 (envio por formulário), e o popup reprovado. **Limite ético mantido:** Marcos pediu candidatura real 100% automática; recusei o auto-submit (irreversível, é a carreira dele, proibido pela constituição) — ele esclareceu que o objetivo era fechar o processo, e que "uma vez funcionando, sou eu que decido".*

***FRENTE VIRGÍLIO — migração do gerador de CV: CV_BASE → PERFIL_MARCOS** (commitada em `03b9f14` a pedido de Marcos, SEM QA do Bruno; teste real pendente), com filtro determinístico de relevância ANTES da IA. Construído: `filtrarExperienciasRelevantes` + `formatarExperienciasPerfil` + `perfilFormatadoPara` — JS puro, sem IA, decide QUAIS experiências entram e em que ordem (cronológica reversa, `fim:null` sempre incluída); `ATS_SYSTEM` virou 2 estágios — o filtro decide O QUÊ, a IA só traduz/otimiza redação do que já foi filtrado, proibida de omitir/reordenar (regra explícita no prompt). `CARTA_SYSTEM` e `EMAIL_ENVIO_SYSTEM` migrados também (decisão autônoma, mesma fonte de dados, risco baixo — reportado a Marcos). 8 call sites atualizados. Bug relatado (`\` no lugar de `//`, `<\head>`) investigado e NÃO CONFIRMADO — não existe no código atual nem no HEAD; provável achado equivocado de sessão anterior, não corrigido por não existir. Testado com vaga sintética (JS puro, sem chamada real à IA — Worker não acessível deste ambiente): achado e CORRIGIDO um bug real no teste — tag genérica "gestão de equipe" vazava uma experiência de `incluir_por_padrao:false` (Editora Abril) para vaga não relacionada; `TAGS_GENERICAS` expandida. `CV_BASE` mantido intacto (serve LinkedIn Optimizer + prompts de resposta/habilidades do copiloto + autofill do cartão — fora do escopo). **Código completo e autotestado, NÃO commitado — aguarda Marcos gerar um CV real via Worker e aprovar antes do commit.** Backup `senova_v3.67_14jul2026_pre-perfil-marcos-migracao.html`.)*

## COMO ABRIR A PRÓXIMA SESSÃO (diretriz de Marcos — Sessão 21)
Ao iniciar, **não pergunte "o que fazer".** Rode o protocolo completo de leitura, identifique
com segurança de onde paramos (este arquivo + memória), e **chegue com um plano dos próximos
passos para Marcos APROVAR**. Sem desperdiçar o tempo dele perguntando o óbvio.

## LEITURA OBRIGATÓRIA AO INICIAR QUALQUER SESSÃO
1. Ler este arquivo completo
2. Ler `CLAUDE.md` — protocolo Bruno, regras de desenvolvimento
3. Ler `skill_qa.md` — checklist de qualidade (Fases 1/2/3)
4. Ler `skill_fluxo.md` — fluxo oficial v1.2 e vocabulário
5. Ler `skill_dev_senova.md` — arquitetura, módulos, bugs ativos
6. Para edições de UI: ler `skill_design_senova.md` + `skill_ux_writing.md`
7. Para CV/cartas/pesquisa: ler `PERFIL_MARCOS.md`
8. Nunca propor algo já documentado nesses arquivos

---

## COMO ABRIR O CLAUDE CODE
1. Pressione Windows + R → digite cmd → Enter
2. Digite: cd C:\Users\marco\Documents\senova → Enter
3. Digite: claude → Enter

---

## ESTADO ATUAL — 09/jul/2026 (Sessão 27)

### ⚠️ LEITURA OBRIGATÓRIA ANTES DE QUALQUER SPRINT
- **`REVISAO_OPUS_17jun2026.md`** — revisão completa acatada por Marcos. NÃO ignorar.
- **`VISAO_FUNDACIONAL.md`** — alma do produto. Ler antes de propor qualquer feature. Define o norte de tudo.

### Infraestrutura
- **Frontend:** marcos-mco.github.io/senova (GitHub Pages)
- **Worker:** senova-proxy.marcos-mco.workers.dev (**v7.12** — S28: `/api/emails/enviar` aceita `anexos` → Graph fileAttachment. Antes v7.11: fetch silencioso eliminado)
- **Extensão Chrome:** **v2.59** (arquivos locais — recarregar em `chrome://extensions` a cada deploy)
- **KV:** SENOVA_KV
- **Cron:** `0 10 * * *` (07:00 BRT) — varredura automática Adzuna + Jobicy
- **Modelo Worker:** `claude-sonnet-4-6` (NUNCA usar 4-5 — obsoleto)
- **Modelo Bruno — análise:** `claude-opus-4-8` | **código:** `claude-sonnet-4-6`
- **Último commit:** `53899ff` (10/jul S28 — uma só "Compatibilidade" + idioma p/ Documentos). Antes S28: `3f28ab2` (faixa rota de envio sempre visível, todas pegadinhas) · `0d27399` (fix renderCRM: card anda ao enviar) · `ec01beb` (Visualizar CV + Refazer texto) · `2036fb6` (anexo PDF + e-mail humano, Worker v7.12). Antes: `40145ae` (S27 régua salarial) · `5cbb700` (S27 fetch silencioso, v7.11) · `e71c9e7` (trava de arquivamento). **Working tree MODIFICADO (S30): `index.html` com a migração completa do gerador de CV p/ PERFIL_MARCOS (filtro determinístico + ATS_SYSTEM/CARTA_SYSTEM/EMAIL_ENVIO_SYSTEM em 2 estágios) — NÃO commitado, aguarda Marcos gerar um CV real via Worker e aprovar. Inclui também, ainda não commitado de S29: Passo 1 (afrouxar prompt anti-clichê `EMAIL_ENVIO_SYSTEM`) — segue pendente de validação numa vaga por e-mail. Backup `senova_v3.67_14jul2026_pre-perfil-marcos-migracao.html` (S30) + `senova_v3.64_10jul2026_pre-prompt-anticliche.html` (S29). Último commit segue `53899ff`; Worker (v7.12) e extensão (v2.59) sem mudança.**
- **Novo doc de fundação:** `MANIFESTO_SENOVA.md` — constituição do produto (ler junto com SOFIA_ALMA.md). Editável só com autorização de Marcos.
- **SSOT:** `DOSSIE_SENOVA.md` (arquivo-chefe, Decision Log D-01..D-09) + `DIAGNOSTICO_FUNIL.md` (03/jul).
- **Backups:** `senova_v3.63_10jul2026_pre-anexo-email.html` (S28) · `senova-worker_v7.11_10jul2026_pre-anexo.js` (S28) · `senova_v3.62_09jul2026_pre-salario.html` (S27) · `senova-worker_v7.10_09jul2026_pre-fetch-silencioso.js` (S27) · `senova_v3.57_06jul2026_pre-pegadinha-generica.html` + `senova-worker_v7.8_06jul2026_pre-pegadinha-generica.js` (S25) · `senova_v3.53_04jul2026_pre-trava-arquivamento.html` (S24) · `senova_v3.52_03jul2026_pre-triagem-email.html` (S23). Rollback da pegadinha = reverter `3d39933`+`0ed3165`; da trava = reverter `e71c9e7`; do arco S23 = `bb4f3cc`.
- ✅ **H4+H3** (metadados da análise) CONFIRMADO no ar — grava `atsAnaliseData`/`atsCvIdioma` na análise (`index.html:7028`). Saiu da lista de pendências.
- ✅ **TRAVA DE ARQUIVAMENTO no ar** (`e71c9e7`): processo real (Entrevista/Proposta/Aceito) não vira `arquivado` sem confirmação; TODO arquivamento deixa rastro no histórico; botão "Reativar processo" no card arquivado. **A trava vive no `saveVaga` (index.html:6244) + `declinarVagaATS` — não reintroduzir arquivamento silencioso.** Ainda sem teste explícito de Marcos.
- ✅ **CANDIDATURA DIRETA GENERALIZADA no ar e CONFIRMADA por Marcos** (`3d39933`, Worker v7.9): cobre canal (Email/WhatsApp/Telefone) + destino OU instrução pura (palavra/código/ação) sem canal nenhum. Render (`mvUpdateScoreDisplay`, index.html:~6787) e os 3 gates de gravação (`mvAutoCompatCheck`, `mvReanalisarCompat`, `analisarInline`) disparam com qualquer um dos três campos preenchido — instrução pura é caso próprio, não fallback do canal. Não reintroduzir a exigência de destino/canal para exibir ou salvar.

### 🔎 Agente de auditoria
- **`senova-auditor`** (em `.claude/agents/`) — agente dedicado de diagnóstico de causa raiz, com arquitetura + fluxo de enriquecimento + armadilhas embutidas. Acionar quando um bug persistir ou para auditar um fluxo inteiro: "usa o senova-auditor pra investigar X".

---

## ⚠️ AO RETOMAR (Sessão 32)

> **A S30 teve DUAS frentes em paralelo:** **Bruno** (fechar o PROCESSO PRINCIPAL — abaixo) e **Virgílio** (migração do CV p/ `PERFIL_MARCOS` — mais abaixo). Ambas no mesmo repo. **A S31 (16-17/jul) foi um desvio para 2 bugs reais** (análise travada em card novo + candidatura desviando pra tela legada — ver bloco no topo do arquivo); **nenhum item das frentes abaixo avançou** — seguem exatamente como estavam.

---

### 🔴 FRENTE BRUNO — o PROCESSO PRINCIPAL foi fechado no código e autotestado (83/83). Falta o campo.

**A REORIENTAÇÃO DE MARCOS (S30 — é a régua daqui pra frente):**
> *"A extensão É o copiloto."* Não é captura, não é telinha de botões. **Dois caminhos, mesma espinha:**
> **(A)** acho a vaga por fora → clico na extensão → ela **cria o card** (com histórico e documentos) e me ajuda na candidatura;
> **(B)** a vaga já está no Senova → o copiloto acompanha e **atualiza** o card.
> Única diferença A×B: **criar** × **atualizar**. E: *"viu o quanto ainda estamos longe do processo principal fechado e correto? Foque nisso."*
> → **Parar de desenhar telas soltas.** Ver `project_processo_principal_copiloto`.

**A CAUSA RAIZ (achada e morta): o processo inteiro dependia do jobId do LinkedIn.**
- Passe do Caminho A **sem jobId** + guardas `if(!an.jobId) return` → registro, detecção automática e desfazer morriam **em silêncio**; botões de CV/carta **nem apareciam**. O Caminho A **nunca registrou nada**.
- O background **inventava** `linkedin.com/jobs/view/{id}` → nenhuma ponte achava card de outro portal (Gupy/abler/Sólides/site da empresa) → `sem_card`/`return false` calado.
- **Não existia criar card** → sem card não há descrição → **sem descrição não se gera CV nem carta**.

**FECHADO E NO AR (commits `61a7211`, `668b238`, `57f922e`, `baef9b2`):**
- **`_acharVagaRef` = ponto ÚNICO de casamento** (jobId → URL real → empresa+cargo), usado pelo registro, pelo desfazer e pelas **4 pontes de documento**. **NÃO duplicar essa lógica** — casamento duplicado divergindo foi o que sumiu com o TV Integração (S24).
- **`__senovaCopilotoGarantirCard`**: ativar o copiloto numa vaga por fora **cria o card com a descrição da página** — é o que destrava o Caminho A inteiro.
- Registro **cria card se não existe**, **idempotente**, **nunca falha calado**.
- **AUTO-RELOAD da extensão (v2.65+)**: se recarrega sozinha quando a versão em disco muda → **o Bruno atualiza a extensão sem intervenção de Marcos** (validado em campo 14/jul). **Não remover.**
- **83 testes** (o projeto nunca teve): `node testes/registro.js` (35) · `testes/documentos.js` (23) · `testes/espinha.js` (25, integração dos 2 caminhos). **Rodar ANTES de mexer no fluxo.** Ver `testes/README.md`.

**NÃO FECHADO (honesto):**
1. **Validar em campo** — abrir uma vaga real (score médio) e andar a espinha nos 2 caminhos. **Exige o browser de Marcos** (o Bruno não pilota o Chrome dele). É o passo 1.
2. **Estação 3 — envio por formulário** (autofill/upload): a fronteira.
3. **Popup** (telinha do ícone): Marcos reprovou os 3 botões ("Iniciar copiloto" — já está nele; "Salvar" — salvar o quê?; "Analisar" — já analisado). **Redesenho NÃO feito.** Aprendizado caro: 2 mockups reprovados por eu ter modelado a extensão como *captura* em vez de *copiloto*. Não redesenhar sem o modelo dos 2 caminhos na cabeça. Layout p/ aprovar = **HTML renderizado**, nunca ASCII (`feedback_layouts_em_html`).

**LIMITE ÉTICO REAFIRMADO:** Marcos pediu candidatura real 100% automática, sem revisão dele. **Não fiz** — enviar candidatura a recrutador real é irreversível, é a carreira dele, e é o `auto-submit` que a constituição proíbe (a IA prepara, a pessoa decide). Ele então esclareceu: *"o Senova não funcionará de forma autônoma… uma vez funcionando, sou eu que decido"* — o objetivo era **fechar o processo**, teste é meio. Mantido: **o clique de enviar é do humano.**

---

### 🟡 FRENTE VIRGÍLIO — migração do CV (`PERFIL_MARCOS`)
> ⚠️ **Correção de estado:** já está **commitada** (`03b9f14`) — Marcos autorizou ("é do Virgílio"). O commit declara que **não passou pelo QA do Bruno**. A instrução "só commitar após aprovação" foi substituída pela autorização dele. **A revisão/teste segue pendente** (ver abaixo).

**MÉTODO (S27, vale daqui pra frente):**
- **Papéis:** Bruno = **CTO** (o "como", diz a verdade sobre custo/risco, avisa quando Marcos erra na tarefa). Marcos = **Dono do Produto** (o "quê" e a ordem — não técnico). Sem chefe, dois donos de coisas diferentes.
- **Método:** Lean Startup na cabeça + **uma coisa por vez** (a regra "um de cada vez" virou método) + **a ESPINHA como trilho** + **PARKING LOT** para tudo que estiver fora dela.
- **A ESPINHA** = o fluxo único de candidatura: **0 Entrada → 1 Análise → 2 Preparo (CV+carta) → 3 Envio → 4 Registro (CV Enviado+follow-up) → 5 Retorno → 6 Desfecho.** **✅ FECHOU A 1ª VOLTA INTEIRA por E-MAIL em 10/jul (S28)** com a cobaia Humanizata. **A 2ª volta (S29, Dialog/Sólides, por FORMULÁRIO) NÃO fechou o envio — terminou em declínio consciente por FIT (não é falha da espinha).**

**TESTE PENDENTE (a migração já está commitada, mas nunca gerou um CV real):**
- A migração `CV_BASE` → `PERFIL_MARCOS` no gerador de CV (Estação 2/Preparo) está **autotestada (JS puro), mas nunca gerou um CV real via IA** — este ambiente não acessa o Worker/Anthropic API.
- Pedir a Marcos: **"Por favor teste o seguinte cenário: gerar um CV (Anti-ATS) numa vaga real. O esperado é: experiências em ordem cronológica reversa, nenhum cargo faltando, e nenhuma experiência de início de carreira irrelevante (DLS/Intec/Editora Abril/Ghaphical Consult) aparecendo se a vaga não tiver relação com aquela área."**
- Ver [[project_perfil_marcos_migracao_cv]] (se ainda não existir, criar ao processar a memória desta sessão).

**PENDÊNCIA CARREGADA DE S29 (ainda aberta):** Passo 1 do prompt anti-clichê do e-mail (`EMAIL_ENVIO_SYSTEM`) segue implementado mas não commitado — só se valida gerando um e-mail de envio real numa vaga por e-mail. Ver [[project_cv_autentico_pos_ia]].

**PRÓXIMO PASSO DEPOIS DO COMMIT (ainda provar que a volta REPETE):** escolher uma **vaga de LIDERANÇA real** (do tamanho do Marcos — não operacional) e andar a espinha ponta a ponta de novo até o ENVIO, de preferência por **e-mail** (valida de quebra o Passo 1 acima). Bruno guia. Se algo quebrar numa estação, é bug de espinha; resto no parking lot.

**PARKING LOT DA S29 (achados de produto, ainda válidos):**
- **GAP DO SCORE:** a Compatibilidade (score 72 da Dialog) NÃO destacou que os requisitos ELIMINATÓRIOS eram operacionais (ferramentas) e podiam não bater com o perfil executivo. A análise deveria sinalizar **"requisitos eliminatórios que você pode não atender"** e o eixo **liderança×operação**. Ver [[project_gap_score_lideranca_operacao]].
- **Sólides = portal de PERFIL PERSISTENTE:** autopreenche o cadastro pela conta (login LinkedIn). Regra geral: **onde o portal já preenche, o Copiloto NÃO deve autopreencher** (redundante/arriscado — sobrescreve dado correto). Ver [[project_portais_perfil_persistente]].

---

### PARKING LOT (válido, revisitado só quando a espinha fechar uma volta — NÃO é o foco agora)
- **Achados da cobaia Coca** (descartada por "não aceita mais candidaturas"): (a) Senova trouxe vaga MORTA de 1 mês → filtro de entrada deixa passar vaga fechada; (b) card entrou só com um TRECHO da descrição (snippet), curto demais p/ disparar análise. Raiz comum = **"como a descrição COMPLETA e viva entra no card" é o gargalo da Estação 0.**
- **Perda na entrada por e-mail** (relatado por Marcos): alertas Michael Page & cia. chegam no celular mas o Senova lê/arquiva sem gerar card → também Estação 0.
- **Fila represada S24/S25/S26** (segue de pé, parkeada): iframe SmartRecruiters (v2.59, item -1 abaixo), trava de arquivamento (0), "Para Considerar" legível (0b), validação da triagem (0c). **Detalhes preservados abaixo, intactos.**

Base de decisão: **`MANIFESTO_SENOVA.md`** + **`DIAGNOSTICO_FUNIL.md`** + Decision Log do `DOSSIE_SENOVA.md`.
Ordem (1 fix por vez — commit → Ctrl+Shift+R / recarregar extensão → aprovar → próximo):

**-1. CONFIRMAR + CORRIGIR IFRAME NO SMARTRECRUITERS (Sessão 26, extensão v2.59, PRIORIDADE — bug novo de Marcos)**
   - Causa raiz achada pelo `senova-auditor` (alta confiança): nessa vaga (`jobs.smartrecruiters.com/oneclick-ui/...`) o formulário real (LinkedIn, Website, Resume, Message to the Hiring Team) vive dentro de um `<iframe>` MESMA ORIGEM que a extensão nunca varre. `_acharContainerCandidatura`, `_scanPaginaCampos`, `_coletarCampos` e `_diagnostico` (todas em `content.js`) só consultam o `document` do frame de topo; `manifest.json` não usa `all_frames:true`, então o content script nem é injetado dentro do iframe do formulário. O único campo contado no dump de Marcos era o `input[type=file]` do upload de currículo, que por coincidência fica fora do iframe.
   - **v2.59 (só instrumentação, já no ar):** painel de diagnóstico ganhou a linha "iframes mesma origem" — conta quantos campos existem dentro de cada iframe acessível, sem tocar na lógica de preenchimento.
   - **Próximo passo:** pedir a Marcos para voltar na MESMA vaga (Louis Dreyfus Company / SmartRecruiters), reabrir o Copiloto e copiar o diagnóstico de novo. Se a nova linha mostrar campos ali dentro, confirma a hipótese com dado real → implementar o fix: as 4 funções de varredura passam a olhar `document` + todo `iframe` cujo `contentDocument` seja legível (same-origin), concatenando os resultados. **Manter o painel/UI só no frame de topo** (não usar `all_frames:true` no manifest — injetaria o copiloto em todo iframe de todo site). Iframe cross-origin continua fora de alcance (bridge de mensagens seria outra frente, fora de escopo aqui).

**0. VALIDAR A TRAVA DE ARQUIVAMENTO (Sessão 24, no ar `e71c9e7` — PRIORIDADE)** — falta ver a trava *impedindo* o arquivamento silencioso:
   - a) Processo em Entrevista → seletor de status → Arquivado → Salvar → deve **PERGUNTAR** "Arquivar processo ativo?"; cancelar mantém o card intacto.
   - b) Card arquivado → botão **"Reativar processo"** → volta ao estágio real + linha "Processo reativado" no histórico.
   - c) Confirmar que TODO arquivamento agora deixa **linha no histórico** (era isso que faltava).
   - Contexto: Marcos já recuperou o TV Integração à mão (seletor → Entrevista). O que falta é ver a trava agindo.

**0b. "PARA CONSIDERAR" LEGÍVEL (aberto — pedido de Marcos)** — os cards de e-mail vêm com **cargo ilegível** ("D..", "M..", "G.."). A extração no Worker (`extrairVagasEmail` em `senova-worker.js`) produz título ruim → dar **informação mínima** (cargo/empresa/fonte) para saber do que se trata. Investigar no Worker + fallback no render `renderWidgetRevisao` (`index.html:~4903`).

**0c. TERMINAR A VALIDAÇÃO DA TRIAGEM (S23)** — só o passo principal foi visto ("Para Considerar" apareceu com 57 itens; migração recolheu os cards de e-mail). Falta:
   - **Perfil › O que busco:** seletor humano por região + "Ajuste fino" (75/55). Salvar/reabrir → persistiu?
   - **Multi-select** em Para Considerar → "Enviar selecionadas para Processos".
   - Regressão: enriquecimento/login intocados; triagem NÃO conta como Oportunidade.

Depois — fundação do V1 (H4+H3 já saiu, confirmado no ar):
2. **H5 — convergir motivo:** `vaga.motivo` (modal do card, save em `index.html:6058`) vs `vaga.motivoArquivamento`
   (Kanban, `arquivarSalvar` 5072). Fix PLANEJADO — mexe no save central + migração de dados antigos. NÃO é warm-up.
3. **#6 Retorno recebido (maior valor p/ Sofia):** hoje 100% volátil (e-mail classificado no Worker nunca toca o
   card). Gravar `teveRetorno/tipoRetorno/retornoData` no card.
4. **#5 Transições de estágio** (array `{de,para,ts}`) · **#1 setor** na extração da IA. Tudo em campo, dentro de
   `vaga`/`contato` — sem entidade nova.

### Decisão de escopo (Sessão 22)
- **Easy Apply deep-dive FORA do V1** (upload/multi-página/dropdowns por portal = a assíntota que prende).
  Sobrevive só o **fix de detecção honesta** (hoje rotula errado "Candidatura no site da empresa" num Easy Apply).
- **Universal na ARQUITETURA, um corredor humano por vez na EXECUÇÃO.** Mercado: lusófono primeiro; Bálcãs→Alemanha depois.

### Pendências antigas ainda abertas
- **Manifesto:** decidir push (publicar) ou manter local (`2e4fc90`).
- **Score + Gerar CV direto no LinkedIn** em toda vaga `/jobs/view/` (herdado S19).
- **Dropdowns CUSTOM (div/combobox do Gupy) e RADIO** do casamento de opção (expandir COM dado do Diagnóstico).
- Bugs baixos B6/B7/B8/B9 (ver tabela).

---

## O QUE FOI FEITO — SESSÃO 31 (16-17/jul/2026)

**Tema:** não foi sprint planejado — Marcos usou o app de verdade e achou 2 bugs reais no fluxo de candidatura, um deles grave o bastante pra virar lição de método permanente.

### 1. Importação de descrição por imagem (OCR) + regressões que ela expôs (16/jul, commits `821197a`→`04bae65`)
- `feat(candidatura)`: importar descrição da vaga por imagem (drag/drop ou arquivo), múltiplas imagens de uma vez.
- A feature nova expôs (não causou) uma série de gaps que já existiam no fluxo de candidatura direta e análise automática: card preso em "Calculando análise…" sem aviso; botão "Resposta por e-mail" virando "Enviar candidatura" errado após análise automática; canal de contato direto vazando pra pegadinha de atenção; "Confidencial" mal assumido quando só o cargo é identificado; empresa/cargo extraindo errado quando a descrição vinha do auto-fetch por URL. Todos corrigidos no mesmo arco, um commit por causa.

### 2. Análise automática travava para sempre em card NOVO (commit `7b0384a`)
- **Causa:** a análise automática (`mvUpdateScoreDisplay`/`mvAutoCompatCheck`) só sabia gravar resultado em `vagas[idx]` — um card recém-criado (`editingVagaId==='new'`) ainda não existe nesse array, então o resultado não tinha onde pousar e "Calculando análise…" ficava travado pra sempre.
- **Fix:** holder temporário em memória `_mvNovoCardAnalise` — a análise de um card novo escreve ali; `saveVaga()` absorve o holder no objeto criado (com fallback `existing?.X||_novoA.X||''` pra cada campo) e limpa o holder logo depois, pra não vazar pro próximo card novo. `openVagaModal()` zera o holder ao abrir um card novo do zero.

### 3. Candidatura desviava pra tela legada "Avaliar Posição" (commit `bd929c7`) — o bug sério da sessão
- Marcos: *"O card funcionou. Cliquei em candidatar por email e veio para esta tela [Avaliar Posição]. Não sei o que fazer agora."* Bruno explicou o desvio como se fosse o fluxo aprovado — **estava errado**. Marcos corrigiu firme: *"Não foi este o caminho aprovado. Esta tela não entra neste processo… Vamos seguir a espinha aprovada"* — e, ao ver Bruno decidir sozinho de novo, mandou parar: *"vc tem uma equipe de agentes e skills… não tome decisões sem analisar o contexto todo… não façamos gambiarras."*
- **Reunida a equipe:** relido `docs/fluxo_definitivo_card_copiloto.md` (CARD = única fonte de verdade, geração de CV vive NO CARD) e escalado pro `senova-auditor`, que confirmou a causa raiz (`candidatarDoModal()` chamava `abrirAntiATSModal()` — legado que sobreviveu à reforma de 25/jun) e destravou **2 armadilhas** que um fix apressado teria ignorado: (a) `_mvGarantirCV()` retorna `false` mesmo com sucesso em card novo/lead, porque `mvSyncDocsCV()` zera o buffer de CV logo depois de gerar — a fonte confiável é a global `lastCV`, não o retorno da função nem o buffer; (b) `saveVaga()` nunca persistia `lastCV` no `atsCV` do card recém-criado — sem esse passo o card ficaria salvo sem o CV mesmo após candidatura bem-sucedida.
- **Fix final:** `candidatarDoModal()` vira `async`; sem CV, chama `await _mvGarantirCV(...)` (mesmo mecanismo já usado pelos botões de download — nunca mais navega pra outra tela); checa `lastCV` como sinal de sucesso; persiste `lastCV` em `vagas[idx].atsCV` se o card ainda não tinha. `abrirAntiATSModal()` não foi apagada (segue servindo a navegação legítima da sidebar "Avaliar Posição") — só o call site errado, vindo da candidatura, foi removido.
- **Confirmado por Marcos, ponta a ponta:** e-mail visível nos Enviados do Outlook + card andou no Kanban. *"Agora sim, funcionou… Perfeito. É assim que vc deve agir sempre. Vc é o chefe e sempre quer ter todas as informações para tomada de decisão."*

### Confirmado / decisões
- ✅ QA Fase 2 (golden rule + sintaxe) passou limpo nos 2 commits principais. ✅ Marcos validou em produção real (Outlook + Kanban), não só em teste sintético. 📌 **Lição de método elevada a regra permanente:** nunca decidir sozinho em fluxo crítico sem reunir código real + skills + VIRGILIO + memória primeiro — ver [[feedback_reunir_equipe_antes_de_agir]] e [[feedback_reusar_fluxo_aprovado_nao_inventar]] (memórias novas desta sessão).

---

## O QUE FOI FEITO — SESSÃO 30 (14/jul/2026)

**Tema:** terminar a migração do gerador de CV do Anti-ATS: de `CV_BASE` (texto livre) para `PERFIL_MARCOS` (dado estruturado), com uma filtragem determinística (sem IA) decidindo o que entra e em que ordem, ANTES de qualquer chamada à Anthropic API.

### 1. Filtro determinístico (JS puro, sem IA)
- `filtrarExperienciasRelevantes(textoVaga, nivelVaga)`: inclui por padrão toda experiência com `incluir_por_padrao:true`; as com `incluir_por_padrao:false` (DLS, Intec, Editora Abril, Ghaphical Consult) só entram se `tags_area` bater com o texto/área da vaga; a atual (`fim:null`) entra sempre, sem exceção. Ordena por ordem cronológica reversa — um único sort global por `fim` (tratando `fim:null` como maior/mais recente) e `inicio` como desempate — sem precisar de lógica especial por empresa.
- `formatarExperienciasPerfil` + `perfilFormatadoPara`: montam o texto final (contato/resumo/experiências filtradas/formação/idiomas) que vai pro prompt.
- **Bug real encontrado e corrigido durante o autoteste:** a tag "gestão de equipe" era genérica demais e vazava a Editora Abril (`incluir_por_padrao:false`) pra vagas sem relação, batendo com "gestão de equipes multifuncionais" de qualquer vaga de liderança. Corrigido expandindo `TAGS_GENERICAS`. Reteste confirmou: exclui certo quando não deveria entrar, inclui certo quando deveria (2ª vaga sintética, gráfica/editorial).

### 2. ATS_SYSTEM virou 2 estágios
- Assinatura mudou de `(lang)` pra `(lang, textoVaga, nivelVaga)`. A regra antiga ("corte implacável: omita o que não é relevante" — decisão de relevância deixada pra IA) foi substituída por uma regra explícita: **o filtro decide O QUÊ; a IA NUNCA decide relevância, NUNCA pode omitir/cortar/acrescentar/reordenar uma experiência da lista filtrada — só traduz (se pedido) e otimiza a redação** (verbos de impacto, números, palavras-chave da vaga). 4 call sites atualizados (`analyzeJob`, `analisarInline`, `gerarDocModal` ramo ats, `__senovaCopilotoGerarCV`).

### 3. CARTA_SYSTEM e EMAIL_ENVIO_SYSTEM migrados também (decisão autônoma)
- Mesma fonte de dados (`perfilFormatadoPara`), mesmo princípio (não inventar experiência fora da lista filtrada). Risco avaliado como baixo — mesma estrutura de dado, sem mudança de tom/regras de voz (o bloco anti-clichê do `EMAIL_ENVIO_SYSTEM`, pendente de S29, foi preservado intacto). 4 call sites atualizados (`gerarCartaATS`, `gerarDocModal` ramo carta, `__senovaCopilotoGerarCarta`, `gerarEmailEnvio`).

### 4. Bug relatado, investigado, NÃO confirmado
- O relato de comentário corrompido (`\` no lugar de `//`) e `<\head>` nas linhas ~10046-10103 foi checado via grep no working tree e no `HEAD` — **não existe em nenhum dos dois**. `</head>` está correto. Provável achado equivocado de uma análise anterior; nada foi alterado porque não havia o que corrigir.

### 5. Escopo preservado — `CV_BASE` não removido
- Segue servindo o LinkedIn Optimizer, os prompts de resposta de formulário e escolha de habilidades do copiloto, e a extração do cartão de candidatura — fora do escopo pedido, zero risco de regressão por continuar existindo.

### Confirmado / decisões
- ✅ Golden rule verificada 2x: `api.anthropic.com` = 0 resultados no index.html. ✅ Backup `senova_v3.67_14jul2026_pre-perfil-marcos-migracao.html` criado (retroativo, a partir do HEAD). 🧪 **Testado só com JS puro (sem IA real) — falta Marcos gerar um CV de verdade via Worker numa vaga real antes do commit.** Nenhum commit feito nesta sessão, conforme instrução.

---

## O QUE FOI FEITO — SESSÃO 29 (10–11/jul/2026)

**Tema:** provar a REPETIÇÃO da espinha com uma 2ª vaga real. Começou pelo Passo 1 (dívida da espinha) e foi andar a candidatura da Dialog. Terminou num **declínio consciente por FIT** + dois achados fortes de produto.

### 1. Passo 1 — afrouxar o prompt anti-clichê do e-mail (implementado, NÃO commitado)
- `EMAIL_ENVIO_SYSTEM` (index.html ~3171): a lista de proibidos misturava clichê vazio de IA com **competências reais de Marcos** (transformação digital, visão estratégica, gestão financeira, liderança). Trocado por **duas regras**: (a) termo real só é permitido **grudado a um fato** que o comprove — senão corta; (b) só clichês vazios de verdade (sinergia, agregar valor, proatividade, "acelerando crescimento", "resultados mensuráveis"…) seguem banidos. QA Fase 2 OK (`api.anthropic.com`=0; template íntegro). Backup `senova_v3.64`. **Só se valida gerando um e-mail de envio real — a volta da Dialog foi por formulário, não e-mail, então segue não-testado e não-commitado.**

### 2. 2ª volta da espinha — Dialog "Gerente de Marketing e Conteúdo" (LinkedIn → Sólides)
- **Estação 0–1 OK:** vaga do LinkedIn (jobId 4437703325), Compatibilidade **72 · vale ver**, card no Senova. Marcos disse "pela página" — e estava CERTO: era **external apply** (site da empresa), não Easy Apply. (Meu WebFetch inicial errou dizendo "Easy Apply"; a extensão logada é a fonte confiável — lição registrada.)
- **Portal = Sólides** (`dialogci.vagas.solides.com.br`), ATS **novo**. Exige login → **"Entrar com LinkedIn"** → o Sólides **AUTOPREENCHEU 92%** do cadastro (nome/CPF/telefone/nascimento/LinkedIn/diversidade) pela conta. **Orientado NÃO usar "Preencher para revisar"** (autofill do Copiloto seria redundante e sobrescreveria dado correto).
- **Estação-parede:** etapa "Suas habilidades" com filtro **ELIMINATÓRIO** de ferramentas (HubSpot/Google Analytics/RD Station/Power BI, níveis autodeclarados). A descrição já dizia "focado em **execução**". Marcos: *"são conhecimentos técnicos, operacionais. Não sei se esta vaga é pra mim…"* — leitura AGUDA e correta.

### 3. Declínio consciente por FIT (decisão de Marcos: "Liderar")
- Bruno não empurrou nem minimizou: nomeou a tensão **liderança×operação** (vaga quer operador mão-na-massa; Marcos é o executivo que dirige quem opera). Princípio-chave reforçado: **o mesmo que impede inflar um nível dá o direito de declinar sem culpa** — o Senova existe pra achar onde a pessoa é chamada pelo que é, não pra candidatar-se a tudo (Manifesto: sem contra-indicação, IA do lado da pessoa).
- Marcos decidiu **não se candidatar**. Ações: **Cancelar** no Sólides (nada foi enviado) + **Excluir** o card no Senova (era `lead` → sai limpo, sem rastro; trava anti-perda não bloqueia lead).

### 4. Achado de produto (alto valor) — o score não protegeu
- A Compatibilidade 72 **não sinalizou** que os requisitos ELIMINATÓRIOS eram operacionais e podiam não bater com o perfil executivo. O Senova levou Marcos até o filtro pra ele mesmo perceber. Correção proposta: a análise deve destacar **"requisitos eliminatórios que você pode não atender"** + eixo liderança×operação. Parking lot.

### Confirmado / decisões
- ✅ Marcos leu o descompasso sozinho e decidiu com autonomia. ✅ Senova do lado dele no declínio. 🧪 Passo 1 pendente de validação (vaga por e-mail). 📌 2 melhorias novas no parking lot (gap do score; regra "não autopreencher onde o portal já preenche").

---

## O QUE FOI FEITO — SESSÃO 28 (10/jul/2026)

**Tema:** 🏆 ANDAR A ESPINHA com a cobaia Humanizata e **fechar a primeira volta inteira** — a 1ª candidatura ponta a ponta dentro do app. Começou pela Estação 2 e foi até o Registro, com Marcos como QA a cada passo.

### 1. Envio real com PDF anexado + e-mail humano (commits `2036fb6`, Worker v7.12)
- **O gap central da Estação 3, provado pelos olhos de Marcos:** o envio colava o CV como TEXTO no corpo e não anexava arquivo. Marcos cortou a "prova rápida manual" que eu propus ("pra mim é gambiarra; não anexar nem compor o e-mail certo é erro de processo — é espinha"). Decisão dele (Dono do Produto): fazer o Envio funcionar de verdade no app.
- **Worker v7.12:** `/api/emails/enviar` aceita `anexos:[{nome,conteudoBase64,tipo}]` → Graph `sendMail` `fileAttachment`. Retrocompatível.
- **App:** `_buildPDFExecDoc` (refatoração do gerador do PDF Executivo) + `_pdfExecBase64` capturam o **mesmo** PDF em base64 para anexar. `EMAIL_ENVIO_SYSTEM` gera o **corpo curto e humano** (voz calibrada com Marcos: 1ª pessoa no presente, fatos concretos, fecho "Grato e à disposição", sem clichê de IA). Salvo em `vaga.emailEnvio`.

### 2. Ajustes de UX no modal de envio (commit `ec01beb`)
- **"Visualizar CV"** (abre o PDF anexado numa aba nova — Marcos não enviava mais às cegas) + **"Refazer texto"** (regenera o e-mail), separados e claros.

### 3. Fix: o card não andava (commit `0d27399`)
- Após enviar, `saveVagas()` atualizava a Home mas **não redesenhava o Kanban** → status gravava mas o card só se movia após reload. Fix no padrão do app: `if(filtroAtivo) aplicarFiltros(); else renderCRM();`. **Confirmado por Marcos: card moveu p/ CV Enviado.**

### 4. Rota de envio SEMPRE visível — todas as pegadinhas (commit `3f28ab2`)
- A faixa "candidate-se pelo e-mail" ficava dentro da Compatibilidade (que colapsa no lead) → escondida. Agora faixa fixa `mv-canal-direto-banner` no topo, sempre visível. **Diretriz durável de Marcos: "vale para TODAS as pegadinhas"** — canal-agnóstica (Email/WhatsApp/Telefone/instrução pura). Regra: rota de envio é AÇÃO, nunca enterrar em seção que colapsa. Ver [[project_pegadinha_candidatura_direta]].

### 5. Uma só "Compatibilidade" + idioma p/ Documentos (commit `53899ff`)
- Marcos notou duas seções "Compatibilidade" com a Descrição no meio. Diagnóstico honesto: **não era reordenação minha** — a Zona 6 (`mv-analise-section`) era uma 2ª "Compatibilidade" legada que duplicava o veredicto e hospedava o PT/EN/ES. Removida; o seletor de idioma migrou p/ Documentos; `setLang` passa a atualizar o toggle clicado. **Opinião da equipe registrada: ordem Compatibilidade (decisão) → Descrição (evidência) é a correta — o card é ferramenta de decisão, lê-se a conclusão primeiro.**

### Confirmado por Marcos (QA)
- ✅ Envio real com PDF anexado (verificado nos Enviados do Outlook) · ✅ e-mail humano na voz dele · ✅ card andou p/ CV Enviado · ✅ faixa da rota visível · ✅ uma só Compatibilidade + idioma em Documentos.

### Princípio preservado
- **Nunca auto-submit:** o app prepara tudo (gera, escreve, anexa, registra), **Marcos revisa e aperta Enviar**. É "primeira candidatura ponta a ponta dentro do app", não "100% automática" — e é assim que deve ser (a pessoa decide). Ver [[project_metodo_espinha_cobaia]].

---

## O QUE FOI FEITO — SESSÃO 27 (09/jul/2026)

**Tema:** começou como "por que o Senova não analisou a vaga da Uber?" e virou uma **reorientação de método**. Marcos cortou o rumo: parar o whack-a-mole de bugs e ANDAR a espinha (fluxo de candidatura ponta a ponta) com uma vaga real. Ver "AO RETOMAR (Sessão 28)".

### 1. Fetch silencioso eliminado no Worker (commit `5cbb700`, v7.11, pushado+deployado)
- Causa raiz (achada ao investigar a Uber que mostrava "Compatibilidade 50%" FALSA): `analisarVaga` e `classificarEmails` engoliam erro de fetch e devolviam resultado falso (score fixo 50 / e-mail marcado "irrelevante" para sempre — perda permanente). Agora checam `resp.ok`, logam o erro real e devolvem estado honesto (`{erro:true, score:null}`). O front já tinha guardas defensivas → **0 mudança no index.html**. Confirmado no teste de Marcos (card novo da Uber pontuou **52% real**).
- Esclarecido a Marcos: **"Não analisada"** = já tem o texto da vaga, falta rodar a nota; **"Aguardando análise"** = ainda nem tem o texto (só link/origemUrl). (Sugestão de Marcos p/ o parking lot: unificar num rótulo tipo "buscando informações e analisando".)

### 2. Reorientação de método (CTO/PO + espinha + parking lot)
- Papéis aceitos (Bruno=CTO, Marcos=Dono do Produto). Método Lean + uma coisa por vez + espinha como trilho. Detalhado em "AO RETOMAR (Sessão 28)" e na memória `project_metodo_espinha_cobaia`.

### 3. Cobaia da espinha + auditoria da Estação 3
- Coca-Cola testada e **descartada** (vaga morta + snippet → 2 achados no parking lot). Escolhida **Humanizata/abler "Diretor de Executivo" 78%** (viva, R$12k, Curitiba), canal **e-mail**. Auditada a Estação 3: **envio sem suporte a anexo** = o gap real. Próximo = Estação 2 (gerar CV+carta no app).

### 4. Régua salarial atualizada (commit `40145ae`, pushado+deployado)
- R$19k → **fecha a partir de R$15k**, sobrevivência R$8k em Curitiba. Corrigido nos 3 pontos que governam comportamento (PRETENSÃO do prompt ATS + PERFIL da Sofia no index.html; `PERFIL_MARCOS` no worker). Vagas-exemplo seed (4316-4347) mantidas. Backup `senova_v3.62_09jul2026_pre-salario.html`. Memória `user_marcos_salario` gravada.

### Commits desta sessão (pushados)
- `5cbb700` fix(worker): elimina fetch silencioso em analisarVaga e classificarEmails (v7.11)
- `40145ae` chore(perfil): atualiza régua salarial de Marcos

---

## O QUE FOI FEITO — SESSÃO 26 (09/jul/2026)

**Tema:** Marcos reportou (screenshot) que o Copiloto não conseguiu preencher o formulário de candidatura numa vaga da Louis Dreyfus Company no SmartRecruiters (`oneclick-ui`) — painel de diagnóstico mostrou "container do formulário: NÃO ENCONTRADO" e 0 campos visíveis, apesar da tela ter vários campos preenchíveis (LinkedIn, Website, Resume, Message to the Hiring Team).

### Diagnóstico de causa raiz (`senova-auditor`, read-only)
- Causa raiz encontrada com alta confiança: o formulário mora dentro de um `<iframe>` MESMA ORIGEM que a extensão nunca varre. `_acharContainerCandidatura`, `_scanPaginaCampos`, `_coletarCampos` e `_diagnostico` (`content.js`) só consultam `document` do frame de topo — nunca `iframe.contentDocument`. O `manifest.json` também não usa `all_frames:true`, então o content script nem é injetado dentro do iframe do formulário. O único "input" contado no dump era o `input[type=file]` de upload de currículo, que fica fora do iframe por coincidência.
- Não existe tratamento específico de SmartRecruiters no roteador `extract()` (`content.js`) — cai em `extractGenerico`, o que está OK pela filosofia "fix geral"; o buraco é estrutural (falta de travessia de iframe), não falta de regra por portal.

### Instrumentação (v2.59, extensão — sem mudança de comportamento no preenchimento)
- Seguindo o princípio anti-gambiarra (instrumentar antes de corrigir — mesmo método da Sessão 20), adicionei ao painel de diagnóstico uma linha nova "iframes mesma origem": conta quantos campos existem dentro de cada `<iframe>` same-origin acessível, antes de tocar em qualquer lógica de varredura.
- **Próximo passo (ainda não é o fix):** pedir a Marcos para reabrir a MESMA vaga e copiar o diagnóstico de novo. Se a nova linha mostrar campos dentro do iframe, confirma a hipótese com dado real e libera o fix real (ver "AO RETOMAR" acima).

### Commits desta sessão (pushados)
- `e9aedaa` diag(extensão): mede campos dentro de iframe same-origem (v2.59)
- `0184508` chore: versiona backup pré-pegadinha-generica do worker v7.8 (pendente da Sessão 25)

### Aberto / não tocado nesta sessão
- Trava de arquivamento (S24), "Para Considerar" legível (0b), validação da triagem (0c) — ver "AO RETOMAR".

---

## O QUE FOI FEITO — SESSÃO 25 (06/jul/2026)

**Tema:** Marcos autorizou dois ajustes pequenos num único commit (generalizar "Candidatura direta" além de e-mail + parar de sobrescrever análise rica ao gerar CV) — mas o teste dele achou um bug real que virou o foco da sessão inteira: pegadinha de instrução pura (sem canal nenhum) sumia por completo.

### Round 1 — generalização + Fix A (commit `0ed3165`, Worker v7.8→7.9, pushado)
- **Candidatura direta** deixa de ser só e-mail: prompt (`ATS_SYSTEM` em index.html + quick-check no Worker) agora extrai `canal` (Email/WhatsApp/Telefone) + `destino` + `instrução` separados, em vez de só um regex de e-mail. Campos legados (`canalDiretoEmail/Codigo`) continuam lidos por compatibilidade.
- **Fix A:** gerar CV não sobrescreve mais uma análise já rica (Cargo real/Urgência/Red flags/Empresa-Cultura) salva no card — só é refeita de fato pelo fluxo "Acrescentar sobre mim" (`mvReanalisarCompat`).

### Round 2 — bug da instrução pura sem canal (commit `3d39933`, Worker v7.9, pushado)
- Teste de Marcos ("mencionar a palavra morango", sem e-mail/whatsapp) mostrou a caixa "Candidatura direta" sumindo por completo. Causa: tanto o render (`mvUpdateScoreDisplay`) quanto os 3 gates de gravação (`mvAutoCompatCheck`, `mvReanalisarCompat`, `analisarInline`) só disparavam com canal/destino presente — uma instrução pura (sem canal) nunca era salva nem mostrada, mesmo extraída certo pela IA.
- Fix: render mostra a caixa com destino OU instrução; os 3 gates de gravação salvam com qualquer um dos 3 campos preenchido; prompts (index.html + Worker) diferenciam explicitamente canal+destino vs. instrução pura solta na descrição.

### Instrumentação + confirmação (sem commit extra — diagnóstico ao vivo)
- 1º reteste de Marcos ("código 00333 no título") pareceu falhar (info só apareceu como bullet de atenção, sem caixa destacada) — em vez de tentar mais um ajuste de prompt no escuro, liguei `wrangler tail` + log temporário no Worker e pedi o mesmo teste de novo.
- Log ao vivo confirmou: a IA preenche `candidatura_direta_instrucao` corretamente ("Incluir o código 00333 no título da vaga ao se candidatar") e a caixa renderiza. O 1º "erro" foi só timing de cache/propagação do GitHub Pages, não bug residual. Log de diagnóstico removido, Worker redeployado limpo (`6c02cde3`).
- **CONFIRMADO por Marcos** nos dois cenários (instrução pura + canal com código). Ver memória `project_pegadinha_candidatura_direta`.

### Aberto / não tocado nesta sessão
- **Trava de arquivamento (S24, `e71c9e7`)** — ainda sem teste explícito de Marcos.
- **"Para Considerar" com cargo ilegível (0b)** e **validação completa da triagem (0c)** — ainda pendentes, ver AO RETOMAR.

---

## O QUE FOI FEITO — SESSÃO 24 (04–06/jul/2026)

**Tema:** validar a triagem (arco S23) → **emergência**: o TV Integração (melhor processo, Entrevista, 91%) sumiu pela **3ª vez** (S13/S17/S23). Diagnóstico de causa raiz + blindagem definitiva.

### Emergência TV Integração — causa raiz FINALMENTE achada
- O card **não** foi deletado — estava **arquivado** (status mudou), recuperável. **Nada perdido.** Marcos o trouxe de volta para Entrevista pelo seletor de status.
- Diagnóstico read-only guiado pelo próprio app (sem console — Marcos não gosta): a lista de arquivados mostrou o card; o **histórico dele não tinha nenhuma linha de "Arquivado"**, mas status=`arquivado` e "Atualizado 03/jul 22:31". Prova do arquivamento **invisível**.
- **Raiz (nova):** `saveVaga` (`index.html:6244`) e `declinarVagaATS` (Análise CV) mudavam status para `arquivado` **sem escrever no histórico**. A trava da S17 só cobria **DELETE** — o arquivamento silencioso ficou de fora. **Essa era a metade que faltava**: por isso o card voltava do backup e sumia de novo.

### Blindagem (commit `e71c9e7`, no ar — AGUARDANDO TESTE de Marcos)
- **Helpers** `_STATUS_PROTEGIDO` / `_confirmarArquivarProtegido` / `_statusLabel` / `_estagioReativacao` (`index.html:~3298`).
- **`saveVaga`** = coração da trava: bloqueia arquivar Entrevista/Proposta/Aceito sem confirmação (reverte o seletor, não salva) + registra TODA transição de/para arquivado no histórico.
- **`declinarVagaATS`**: confirma antes de arquivar processo real + deixa rastro.
- **Botão "Reativar processo"** visível no card arquivado; `reativarVaga` volta ao estágio real lido do histórico (TV Integração → Entrevista).
- Backup `senova_v3.53_04jul2026_pre-trava-arquivamento.html`. QA Fase 2: sintaxe OK, gold-rule OK (zero `api.anthropic.com`).

### Aberto / interrompido pela emergência
- **"Para Considerar" com cargo ilegível** ("D..", "M.."): a extração de e-mail no Worker produz título ruim. Marcos pediu **"mais informação mínima para saber do que se trata"** — NÃO resolvido (ver AO RETOMAR 0b).
- **Validação da triagem (S23) incompleta:** só o passo principal foi visto; Perfil (seletor humano + ajuste fino) e multi-select **não testados** (ver AO RETOMAR 0c).

---

## O QUE FOI FEITO — SESSÃO 23 (02–04/jul/2026)

**Tema:** parar o vazamento de e-mail multi-vaga (diagnóstico do funil → arquitetura → implementação completa).

### Diagnóstico (raiz)
- **86,6% do pipeline nunca vira candidatura** (`DIAGNOSTICO_FUNIL.md`, commit `ca5bed6`). E-mail com mais de uma vaga dava **ZERO card**: alerta do LinkedIn (maior volume) é excluído do fluxo de artigos; caía como `multi_vagas` → só um toast, nada criado.

### Decisão (Marcos)
- **Card por vaga, perda zero, sem triagem obrigatória** — MAS com **score-gate em linguagem humana** e **ajuste fino** dos pontos dos termos. Substitui o "estreito de mão" (D-01) NESTE fluxo.

### Auditoria anti-regressão (obrigatória antes de codar)
- Reconfirmado: **Worker NÃO busca LinkedIn** (bloqueia IP datacenter) — enriquecimento é só pela **extensão logada** (`jobs-guest`). Retirei minha proposta de enriquecer no Worker. Doc durável: memória `reference_login_enriquecimento_linkedin` + [background.js:465,558].

### Implementação (no ar)
- **Worker v7.8** (`fb3bbe2`): `extrairVagasEmail` → funil `vagas_lead` (dedup jobid/URL). Vazamento medido = **48 vagas**.
- **Frontend triagem** (`a745e0f`): vaga de e-mail nasce **`status:'triagem'`** (fora do Kanban e das contagens, mas enriquece/pontua igual — triagem incluída nos 5 pontos do enriquecimento); **auto-promove** ao atingir o Critério da região; **"Para Considerar"** na Home (Compatibilidade em palavras + multi-select); **Perfil** com seletor humano por região + "Ajuste fino" (`_PONTOS_TERMOS` 75/55, fonte única em `classificacaoDoScore`); migração 1× recolhe os 37; caminho único de criação de card. **Enriquecimento e login intocados.**
- Backup `senova_v3.52_03jul2026_pre-triagem-email.html`. QA: sintaxe OK, gold-rule OK (zero `api.anthropic.com`).

### Também nesta janela (commits anteriores no arco)
- `DOSSIE_SENOVA.md` (SSOT, Decision Log D-01..D-09) · D-01 "largo de visão, estreito de mão" · D-09 corredor do 2º usuário.

---

## O QUE FOI FEITO — SESSÃO 22 (30/jun–01/jul/2026)

**Sessão de FUNDAÇÃO — código de produção intocado.**
- **`MANIFESTO_SENOVA.md` ratificado (`2e4fc90`, local):** constituição do produto — a quem serve (o usuário, não o dono), ordem missão↔renda, "sem contra-indicação", IA do lado da pessoa, métrica-norte (pessoas que encontram onde são chamadas, nunca tempo-de-tela), universal-na-arquitetura, os 2 crivos, visão≠utopia. Complementa SOFIA_ALMA.md. Editável só com autorização de Marcos.
- **Definição de "Pronto" do V1** (brief de Virgílio) acatada; **Easy Apply deep-dive rebaixado** (só detecção honesta); **mercado:** lusófono primeiro / Bálcãs→Alemanha depois.
- **Passo 1 — auditoria do substrato (senova-auditor, read-only):** happy path sólido incl. ética; lacunas p/ Sofia = retorno (volátil), transições (prosa), setor (ausente); higiene H1-H5. Tudo cabe em `vaga`/`contato` — sem entidade nova.
- **H4+H3 implementado (PENDENTE DE TESTE, não commitado):** grava `atsAnaliseData`+`atsCvIdioma` na análise (`index.html:6821` + preservação `6065-6066`). QA Fase 2 ok; backup `senova_v3.47`.

---

## O QUE FOI FEITO — SESSÃO 21 (29/jun/2026)

**🏆 MARCO: a candidatura em site externo passou ponta-a-ponta pela 1ª vez** (Gupy/Cepêra). Marcos:
*"Funcionou tudo… primeira vez que tudo deu certo!!!!"*. App (dados sensíveis) + extensão **v2.50 → v2.58**.

### Dados sensíveis de candidatura (app — aba Perfil) — LGPD by design
- Card "Dados para candidatura": **CPF, PIS, nascimento** (texto) + **gênero, raça/cor (IBGE), orientação**
  (seleção) + toggle de autorização (OFF por padrão). Vivem **só no `localStorage`** — Salvar próprio,
  **NUNCA** vão ao Worker/KV nem à IA (o Cartão é ponte local sem `fetch`; trava da IA impede prosa em CPF).
- **Autoidentificação com variantes aprovadas:** o copiloto só MARCA a opção do portal que corresponde
  EXATAMENTE à escolha (Pardo/Parda, PT/EN); 0 ou ambígua → branco e avisa. Nunca infere. Opt-in explícito
  "Negro(a) ≡ Preta/Parda". Gênero ampliado: cis/trans/não-binário/agênero/fluido/bigênero — trans/NB sem
  opção equivalente NUNCA caem em caixa binária. Motores testados (raça/orientação 14/14, gênero 17/17).

### Extensão / Copiloto v2.51 → v2.58 (Marcos recarrega)
- **v2.51** CPF/PIS/nascimento (texto). **v2.52** autodeclaração por casamento de opção. **v2.53** taxonomia
  de gênero ampliada. **v2.54** anti-rebaixamento do card no popup + esconde botão quando vem do Senova +
  **REMOVIDOS TODOS OS ÍCONES INFANTIS** (🚀✍️📄🔍📋✨⚡💼💡). **v2.55** FAB legado APOSENTADO + persistência
  SPA + popup reconhece o card (mostra score sem reanalisar). **v2.56** **watchdog** (intervalo, independente
  do DOM) — resolve SPA que troca o `<body>` e matava o observer → copiloto "abre e FICA". **v2.57** lê a
  pergunta REAL no Gupy (ignora placeholder genérico "Digite sua resposta aqui") + nunca escreve meta-resposta
  da IA ([PULAR]). **v2.58** reconhece "Candidatura finalizada" (Gupy) → card move p/ CV Enviado + instrução.

### Decisões de produto / processo
- **Honestidade radical:** o copiloto nunca escreve a dúvida da IA no campo; declara o que faltou ("N perguntas
  precisam de você"). **Sem ícones infantis** — regra reforçada por Marcos (sobriedade executiva).
- **Easy Apply é outra frente** (ver AO RETOMAR) — Marcos pediu reunião de equipe; instrumentar antes.
- Painel **v2.50 VALIDADO** por Marcos. Método mantido: instrumentar (Modo Diagnóstico mostra `passe (card)`,
  rótulos, grupos) → ver a causa → fix geral. Anti-gambiarra o tempo todo.

---

## O QUE FOI FEITO — SESSÃO 20 (29/jun/2026)

**Tema:** o copiloto não preenchia candidaturas reais (caso **DHL** / plataforma **Lumesse**). Em vez de chutar,
**instrumentamos o diagnóstico DENTRO da extensão** e corrigimos cada causa **por dado**. Extensão **v2.40 → v2.50**.
App e Worker **intocados**.

### A virada de método
- **A ferramenta virou o sensor.** Marcos (não-técnico) não precisa traduzir termos: o copiloto mede o que enxerga e
  oferece **"📋 Copiar para enviar ao Bruno"**. Marcos clica → cola → o Bruno lê o fato. Foi assim que achamos cada causa.
- **Princípio acatado de Marcos — ANTI-GAMBIARRA:** não perseguir campo/upload de cada ATS. Só entra fix **geral**
  (vale pra qualquer portal). Instrumentar → ver a verdade → consertar com dado. Marcos pegou o Bruno driftando 2×
  (detecção por texto "adicionar arquivo") e corrigiu o rumo — registrado.

### Extensão / Copiloto v2.41 → v2.50
- **v2.41** Modo Diagnóstico (origem, container, inputs, campos/grupos, iframes, forma + botão copiar; log throttled).
- **v2.42** lê rótulo por **POSIÇÃO** (texto ao redor — ATS sem `for`). **Trava:** pergunta aberta só termina em "?"
  (PIS/CPF não viram prosa da IA).
- **v2.43** diagnóstico turbinado (visíveis/no container/sem rótulo/amostra) → **provou** o container errado.
- **v2.44** **amplia o container** quando o `<form>` é pequeno e a página tem mais campos (DHL: 2→16/18 lidos);
  modais (Easy Apply) NÃO ampliam.
- **v2.45** `_preencher` **nunca falha calado** (app fechado / nada vazio / não consegui).
- **v2.46** **mensagem honesta**: "✓ Preenchi Nome, Sobrenome. Faltam 12 campos que só você informa (CPF, datas…)".
- **v2.47** diagnóstico de **upload** (conta `input[type=file]` visíveis/ocultos).
- **v2.48** **anti-pisca**: dedup de `innerHTML` (não re-renderiza se idêntico) → painel para de piscar, diagnóstico copiável.
- **v2.49** **Baixar CV geral**, sem caçar campo de upload — DHL tem **0** file inputs (widget próprio); atachar em
  input de outro site é proibido pelo navegador → **baixar e você sobe** é o único caminho. Vale pra qualquer portal.
- **v2.50** **painel**: `max-height:85vh` + rolagem interna, arrasto **vertical** (clamp corrigido), diagnóstico fechado por padrão.

### Validado por Marcos
- ✅ **CV gerado + arrastar** (objetivo principal do dia) · ✅ **lê o formulário inteiro** (Nome/Sobrenome/Cidade no topo) ·
  ✅ **mensagem honesta** aparecendo · 🧪 **painel v2.50** corrigido, teste final pendente.

### Decisões de produto
- **O copiloto entrega o CV certo; o portal importa dele** (insight de Marcos: "Reutilizar inscrição" / "Importar do currículo").
- **Honestidade inviolável:** nunca dizer "pronto" sem estar; nunca falhar em silêncio.
- **Dados sensíveis** (CPF/PIS/nascimento/gênero): o copiloto **lê e mostra, não preenche** sem consentimento no Perfil.

### Processo
- Diagnóstico instrumentado substituiu o chute — coerente com a Sessão 14 (dado derruba teoria) e com
  [[feedback_auditar_antes_do_teste]]. Marcos reforçou o filtro anti-gambiarra como regra de desenvolvimento.

---

## O QUE FOI FEITO — SESSÃO 19 (25→29/jun/2026)

**Tema:** refazer o card de Oportunidade sob o crivo cognitivo + destravar o copiloto em portais reais.
Cada mudança de risco passou pelo **senova-auditor** (verificação independente) ANTES do deploy.

### Card de Oportunidade (produção, commits `f67dd2b`→`2e5b0ee`)
- Análise automática = **só Compatibilidade** (`mvAutoCompatCheck`); **Documentos sob demanda** ("Gerar CV").
- "Dados da vaga" sai do lead importado (valor nos pills); mantido na criação manual.
- Rodapé: "Ir para vaga" navy/principal e **grava antes** de navegar; "Salvar" secundário.
- **Anti-perda:** `saveVaga`/`saveVagaSilent` mesclam (`...existing`) — nunca descartam análise (era perda latente).
- Gerar CV **nunca de snippet** (piso 400 unificado). Vocabulário: Compatibilidade, **PDF Executivo**, sem "Score".
- Descrição compacta (~3 linhas) → Documentos aparece sem scroll.

### Extensão / Copiloto v2.34 → v2.40 (Marcos recarrega)
- v2.34 LinkedIn não inventa "Formulário" · v2.35 não invade Google · v2.36 first/last name ·
  v2.37 auto-detecta envio em /thanks · v2.38 preenche Gupy (sem `<form>`) + painel arrastável ·
  v2.39 auto-seleciona habilidades (chips) · v2.40 reconhece Easy Apply.
- Bridges novas no app: `__senovaCopilotoEscolherHabilidadesPrompt`; Cartão expõe `primeiroNome`/`sobrenome`.

### Decisões de produto
- Copiloto **automático em toda vaga do LinkedIn** (Marcos).
- Habilidades = decisão **profissional** (copiloto seleciona, Marcos revisa); dado **sensível** = usuário declara no Perfil.
- "Dados da vaga" não vive na Oportunidade importada.

### Processo / memória
- senova-auditor usado **7×** nesta sessão. Memória nova: **`feedback_auditar_antes_do_teste`**
  (varrer todos os estados ANTES de pedir teste a Marcos; entrega incompleta queima o QA dele).

---

## O QUE FOI FEITO — SESSÃO 17 (24/jun/2026)

**Tema:** incidente TV Integração (2ª perda) → trava definitiva de dado + reforma completa do fluxo de criação/edição de Oportunidade.

### Incidente e recuperação
- Card "TV Integração - Afiliada Globo" (id `vaga_179025450`, Entrevista, score 91) sumiu pela **2ª vez** (1ª vez: Sessão 13). Causa confirmada: clique acidental em Remover → `deleteVaga` fazia hard-delete sem distinção de status → id ia para `senova_deleted_ids` (blocklist). Recuperado via console (autobackup).

### Trava anti-perda (commit `a33598f`) — INVIOLÁVEL
- **`deleteVaga()`**: só elimina Oportunidade (status `lead`). Para qualquer outro status, cancela o diálogo e roteia para Declinar/Arquivar. Botão "Excluir" some do rodapé em não-lead.
- Reforça a decisão de Sessão 5: **"Excluir ≠ Declinar | Oportunidade: Excluir (sem rastro). Processos ativos: Declinar/Arquivar."**

### Reforma do fluxo de criar/editar Oportunidade (commits `2b8c02c`, `4b2dd3a`, `03ff48a`, `e495271`) — VALIDADO por Marcos
- **Criar card à mão:** "+ Processo" → preencher Empresa + Cargo → botão **"Criar processo"** (novo: antes não tinha Salvar). Campos Empresa/Cargo têm linha sutil (afordância de campo editável).
- **Editar Oportunidade existente:** ganhou botão **Salvar** no rodapé. "Ir para vaga ↗" só aparece quando há URL.
- **"Dados da vaga"** (URL, canal, e-mail, local, notas) recolhido por padrão na Oportunidade; link **"＋ Dados da vaga"** abre sob demanda (`mvToggleDadosVaga`). Card novo abre expandido; card existente abre recolhido.
- **Descrição da vaga:** aceita texto colado à mão (sem URL). Fix: removido `mvRefreshDescPreview()` do `oninput` (escondia a caixa após 1º caractere).
- **Rascunho automático REMOVIDO** — "continue de onde parou" sumiu. Card novo começa sempre limpo. Listeners e banner removidos.
- **Arquivar:** pelo seletor de status (topo direita → ● Arquivado → Salvar), sem botão no rodapé.

### Decisões de produto tomadas nesta sessão
| Decisão | Detalhe |
|---------|---------|
| Trava de dado | Processo real (não-lead) NUNCA é hard-deletado — apagar = perda irreversível |
| "Dados da vaga" sob demanda | Oportunidade fica limpa por padrão; abre só quando necessário |
| Rascunho removido | Mais simples e previsível; sem estado fantasma |
| Arquivar = seletor | Sem botão de ação destrutiva no rodapé |
| Fluxo de candidatura | NÃO implementado — Marcos encerrou; `candidatarDoModal` (linha ~5638) está completa mas órfã; retomar quando Marcos pedir |

### Backup desta sessão
- `senova_v3.44_24jun2026_pre-criacao-card.html`

---

## O QUE FOI FEITO — SESSÃO 16 (23/jun/2026)

**Tema:** auditoria do redesign do card + enriquecimento do PERFIL_MARCOS base + feature "Acrescentar sobre mim" (reanálise sob demanda).

### Feature "Acrescentar algo sobre mim" (v3.42) — APROVADA por Marcos
- **Problema real:** não havia como reanalisar uma vaga já pontuada. Não era bug — era feature ausente (os guards da Sessão 10 bloqueiam o auto-recálculo corretamente; nunca houve porta manual). Diagnóstico holístico feito pelo `senova-auditor`.
- **Princípio que moldou o design (Marcos):** honestidade — se a informação é verdadeira sobre mim, vale para TODAS as vagas, não só uma. Logo, não há "usar só nesta vaga"; o que se acrescenta entra no perfil global.
- **Onde:** campo discreto "＋ Acrescentar algo sobre mim" na zona Compatibilidade do modal da vaga (fora do corpo que colapsa).
- **Comportamento:** salva no contexto global (mesmo padrão de `ctxAdicionar`, `usar:true`) → vale para próximas análises. **E** reanalisa a vaga aberta NA HORA — mas só no estágio **Oportunidade (lead)** com descrição ≥400 chars (onde a Compatibilidade ainda serve para decidir). Decisão já tomada (CV Enviado+) → só enriquece, sem gastar chamada paga.
- **Funções novas:** `mvEnriquecerPerfil`, `mvReanalisarCompat` (caminho manual paralelo que ignora o guard da Sessão 10 SEM relaxá-lo), `_mvReanaliseAplica`, `mvToggleEnriquecer`, `mvAtualizarEnriquecer`, `_mvAtualizarHintEnriquecer`.
- **Coerência de score:** `mvReanalisarCompat` atualiza `atsScore` E `score` numérico (o card do Kanban prioriza `score`), respeita `filtroAtivo` no re-render.
- **Backup:** `senova_v3.41_23jun2026_pre-acrescentar.html`.

### Redesign do card — concluído (Sessão 16)
- P4: renomeado "Andamento" → "Dados da vaga" (commit `569e93f`).
- P6: **DESCARTADO** por Marcos — coluna "Encerrado" não existe (arquivados ficam em "Seu Painel"). Cards com ação atrasada já têm visual próprio. Nada a fazer.

### Sort padrão Kanban por Compatibilidade (commit `e8faff3`)
- Default do `renderCRM`: score desc, tiebreaker recente. Cards sem score agrupam no final. Menu ⚙ por coluna continua disponível para sobrescrever.

### Enriquecimento do PERFIL_MARCOS base (resolvido)
- **EADCon (ago/2006–out/2008):** adicionado ao Histórico e Experiência-chave — Diretor de Marketing, setor educacional, 180 parceiros, 120k alunos, R$20mi campanhas, 25 agências.
- **Expoente Sistema de Ensino (jan/2004–abr/2006):** adicionado — Diretor de Vendas, R$40mi, 300k alunos, 900 escolas, 40 pessoas.
- **Mestre em Marketing · Universidade de Évora (2002–04):** adicionado à Formação (estava só no CV do app, não no perfil base).
- **Seção Competências (nova):** marketing digital, growth, comercial/vendas, edtech, IA/SaaS — keywords que o scoring ATS precisava.
- **Regra setor educacional:** documentada (quando incluir EADCon/Expoente no CV).

---

## O QUE FOI FEITO — SESSÃO 15 (23/jun/2026)

**Tema:** fix B11 — expor arquivados na UI.

### Diagnóstico
- Causa raiz: JS em `renderCRM` procurava `crm-arquivados-btn` com `getElementById` e fazia guard `if(btnArq)` — elemento nunca existiu no HTML. `toggleArquivados()` e `kanban-arquivados-wrap` estavam 100% prontos mas sem gatilho.

### Fix (commit `3db105d`)
- **Badge sidebar:** `updateBadge()` passa a contar só vagas ativas (exclui `aceito`/`arquivado` e contatos). Badge: 168 → 18.
- **Seu Painel:** "N arquivadas" vira link clicável (azul ação ↗) → chama `verArquivados()` → navega para Processos com `_mostrarArquivados=true` e rola até a seção.
- **Seção Arquivados:** ganha botão "✕ Ocultar" interno para fechar sem sair da página.
- Removido botão reprovado de baixo do Kanban.

### Validado por Marcos
- Badge mostra 18. Link "130 arquivadas ↗" no Painel funciona. Seção fecha com "✕ Ocultar".

---

## O QUE FOI FEITO — SESSÃO 14 (23/jun/2026)

**Tema:** eliminar duplicatas de vaga — diagnóstico de causa raiz guiado por dados reais (console), não por teoria.

### Investigação (várias hipóteses derrubadas pelos dados)
- Sintoma na tela: card "Diretor de vendas e vagas semelhantes" preso em "Aguardando análise" + CrowdStrike duplicado.
- Teste decisivo: `curl` no `jobs-guest/jobPosting/4431155122` → HTTP 200, 2709 chars; o regex da extensão extrai a descrição inteira. Logo, a busca de descrição **funciona** — o problema não era a extensão.
- Console no navegador de Marcos revelou: **dois cards com o MESMO jobId 4431155122** — um `aplicado` ("Gerente de Marketing e Comercial", FPP, desc 2658) e um `lead` (o digest preso).

### Causa raiz (provada)
- A criação de card por e-mail ([index.html:8291]) deduplicava só por **assunto** do e-mail, ignorando o **jobId** no link. O digest recriava vaga já existente.
- O duplicado nunca enriquecia: `__senovaAtualizarDesc` casa por jobId com `findIndex` → a descrição sempre caía no primeiro card (o já enriquecido).

### Fix (commit `b0155c5`)
- **Parte 1 — prevenir:** guard `!_vagaJaExiste({url:linkVaga})` na entrada por e-mail. Vagas sem jobId (Adzuna) intactas — zero regressão.
- **Parte 2 — limpar:** migração `dedup_jobid` → **v2** (re-roda 1×, não-destrutiva, backup automático antes). Mantém o status mais avançado, arquiva a duplicata com timeline.

### Validado por Marcos
- Oportunidade 4→2; FPP (82%) intacta em CV Enviado; 2 duplicatas (digest FPP + CrowdStrike) com `status: arquivado` e timeline "duplicata da mesma vaga do LinkedIn". **Nada deletado.**
- Bug ① (CrowdStrike duplicado) resolvido pelo mesmo fix — fix separado de dedup não-LinkedIn **dispensado**.

### Descoberto no caminho
- **B11:** botão "Ver arquivados" não exposto na UI (ver "AO RETOMAR").

---

## O QUE FOI FEITO — SESSÃO 13 (23/jun/2026)

**Tema:** recuperação de dado perdido + blindagem contra perda futura.

### Incidente e recuperação
- Card "TV Integração - Afiliada Globo" (entrevista, ATS 91) sumiu do Kanban.
- Causa real: **delete acidental** (id em `senova_deleted_ids`), NÃO a migração.
- Recuperado do `senova_backup_20260616.json` (Downloads) — só esse card,
  mesclado ao estado atual, sem perder nada recente.
- Aprendizado: cards vivem só no localStorage; backups .html são código, não dados.

### Fix #1 — Migração não-destrutiva (commit d7f7023)
- `dedup_jobid` nunca funde/apaga entrevista/proposta/aceito; duplicata comum
  vira arquivado com timeline em vez de deletada sem rastro.

### Fix #2 — Backup automático (commit d7f7023)
- Snapshot diário de `senova_vagas_v2` antes das migrações (3 dias), sacrificável
  sob cota. UI "Pontos de restauração automáticos" em Perfil > Preferências.

**✅ Validado por Marcos (23/jun):** Testes 1 (regressão) e 2 (backup visível) OK. No ar.

---

## O QUE FOI FEITO — SESSÃO 11 (22/jun/2026)

**Tema:** fechar o enriquecimento de vagas vindas de e-mail (digest sem descrição, título feio, sem score, presas em "Aguardando análise"). Trocada a arquitetura e resolvidos vários bugs de raiz. Diagnóstico final feito com o agente `senova-auditor`.

### Enriquecimento — nova arquitetura
- **Aba de fundo NÃO funciona** (LinkedIn congela renderização de aba sem foco) → trocado por **fetch na API pública `jobs-guest`** (`_buscarDescricaoGuest` no background.js): pega descrição + cargo + empresa reais, sem abrir aba, sem foco, `credentials:'omit'` (não envia cookie).
- **Detecção de login** via cookie `li_at` (só existência) → **banner "Faça login no LinkedIn"** (deslogado) e **indicador "⚙️ Analisando vagas…"** (processando). `manifest` +permissão `cookies`, v2.16.

### Bugs de raiz corrigidos (a maioria achada pela auditoria)
- **Casamento por ID da vaga** (`/jobs/view/ID`), não URL crua — duas funções de norm divergiam (`#`) e o card não casava. `__senovaAtualizarDesc` agora **retorna se casou**; `_enriquecerUma` só marca "tentado" quando o card muda de fato (falha reprocessa).
- **`saveVagas()` não redesenha o Kanban** → enriquecimento agora redesenha (respeitando `filtroAtivo` — senão card sob filtro/busca ficava preso).
- **3 limiares de descrição em conflito** (>120 pendente / ≥100 grava / ≥400 pontua) prendiam descrições 120–399 em "Aguardando análise" para sempre → **limiar único >120** em tudo (app + extensão).
- **Dedup por ID da vaga** (`_vagaJaExiste` / `_jobIdLinkedIn`) — mesma vaga por fontes diferentes (digest vs candidatura) não duplica mais; migração `senova_migration_dedup_jobid_v1` junta duplicados já existentes (mantém o melhor: status > nota > descrição > recente).
- **Cards-lixo sem link** (e-mail de boas-vindas/notificação viravam "vaga") → `_ehVagaLixo` bloqueia na entrada + migração remove existentes.
- **Cards de título-digest** entram na fila de enriquecimento mesmo já tendo descrição (o texto era do e-mail) → trocam pelo título/descrição/nota reais.

### Ferramenta nova
- **Agente `senova-auditor`** em `.claude/agents/` — diagnóstico de causa raiz com arquitetura/fluxo/armadilhas embutidos. Read-only.

### Pendência / próxima frente
- **Arquivo de experiências complementares do CV** (aprovado): já existe o arquivo; falta campo de entrada no Perfil + uso na análise de compatibilidade. Ver "AO RETOMAR".

---

## O QUE FOI FEITO — SESSÃO 10 (20-21/jun/2026)

### P3 — Emails lidos/movidos ✅ FECHADO E CONFIRMADO
Causa raiz era **limite de subrequests do Worker** (não a lógica). Fixes: `encodeURIComponent` no PATCH (`21e358c`); **Graph $batch** 20 ops/subrequest (`062b1c2`); endpoint `/api/emails/limpar-backlog` para não-lidos antigos (`8a619b1`) + disparo automático no sync forçado (`0cb182f`). Verificado: `autorizados_nao_lidos:0`, 27 emails movidos.

### P1 — Score divergente ✅ RESOLVIDO (raiz)
4 camadas corrigidas + arquitetura nova:
- Score da extensão autoritativo; guards de auto-recálculo (`36ea103`, `b6d5c66`); migração normaliza antigos (`50b8174`); re-captura atualiza card existente (`3a7af5c`).
- **Raiz (`9a19826`):** separar **Compatibilidade (`atsScore`)** do **ATS do CV (`atsCvScore`)** — um sobrescrevia o outro. `temperature:0` no `/api/analisar-vaga` (Sonnet 4.6) → determinístico. **NÃO** dá pra usar temperature no Opus 4.8 (erro 400).
- **Reset eager** (`6fa5211`,`847051d`,`82499f5`): zera scores dos leads e recalcula em lote (`_recalcLeadsReset` → `analisarLoteBackground`), cards já com score (decisão "eager" do estudo).
- **Só calcula com descrição completa (≥400 chars)** em TODOS os gatilhos (Marcos: "não calcular de snippet").

### P2 — Vagas reais de email sem descrição → 🧪 IMPLEMENTADO, FALTA TESTE
**Solução padrão de mercado: extensão enriquece em background** (`825c2d9`). Worker não consegue buscar LinkedIn (bloqueia); a extensão (logada) sim.
- `background.js`: alarm 1min; com Senova aberto, lê pendentes (`window.__senovaPendentesDesc`), abre URL canônica em **aba de fundo** (mesma janela, sem foco), `content.js` auto-extrai → `AUTO_UPDATE_DESC` → atualiza card, fecha aba. Throttle 3/min, 4s, marca tentadas.
- `manifest`: +`alarms`, −`windows`, v2.15 (resolveu o órfão `"windows"`).
- Re-captura também limpa cargo/empresa do título feio de email (`e0ef67d`).

### Estudo de precificação / arquitetura → `ESTUDO_PRECIFICACAO_20jun2026.md`
Insumo do **business plan**. Decisões: arquitetura "processa uma vez, mural read-only"; 4 análises separadas (Compatibilidade/ATS/CV/Sofia); Sonnet+cache+temp0 na decisão (nunca rebaixar o sinal que o usuário age em cima); alavanca de custo = eager vs lazy + funil + cache (~$0,01/vaga); **planos: Recomeço grátis 3m (missão) / Essencial R$29 / Profissional R$59 / Executivo R$129**; diferenciar por ferramentas, não por cota de buscas.

### Pendência conhecida
- Cards antigos com score já gravado mantêm o valor (fix é pra frente). Reset eager (rodou) cobre os leads.
- Descrição via servidor está **fora** (LinkedIn bloqueia) — só pela extensão.

---

## O QUE FOI FEITO — SESSÃO 9 (18/jun/2026)

### Confirmações de Marcos (testes realizados)
- [x] **OAuth Outlook** ✅ — "Conectado" confirmado em screenshot
- [x] **Pasta "Lidos pelo Senova"** ✅ — criada automaticamente no Outlook
- [x] **Emails chegando** ✅ — BRF Talent Acquisition apareceu no Senova
- [x] **Toggle B10** ✅ — funcionando após fix (screenshot confirmou toggle ON)

### Bugs corrigidos
- [x] **B10** — Toggle "Lidos pelo Senova" não respondia: `onclick` no track causava duplo clique (label + onclick se cancelavam). Fix: removido `onclick` redundante, label nativo faz o trabalho. (commit `d7abba7`)
- [x] **Emails pessoais sendo movidos** — Worker movia TODOS os emails processados, incluindo pessoais. Fix: mover apenas emails relevantes (não-irrelevante) + alertas de vagas autorizados. (commit `c3b5712`)

### Feature crítica: Consentimento Explícito de Email — LGPD/GDPR by design (commit `7d34328`)
- [x] **Worker:** `PADROES_DEFINIDOS` — 3 padrões: `linkedin_alertas`, `adzuna`, `google_alerts`
- [x] **Worker:** `estaAutorizado()` — filtro ANTES da IA. A IA nunca vê emails não autorizados
- [x] **Worker:** `getPadroes()` + rota `/api/padroes` GET/POST
- [x] **Worker:** filtro de consentimento aplicado após blacklist, antes de qualquer chamada à IA
- [x] **Perfil:** nova seção "Fontes autorizadas de e-mail" com 3 toggles (todos OFF por padrão)
- [x] **Perfil:** texto atualizado — "O Senova só lê emails das fontes que você autorizar"

### Documentação estratégica criada
- [x] **`VISAO_FUNDACIONAL.md`** — visão filosófica completa: provocação civilizacional, inversão do mercado, papel da Sofia, ética como modelo de negócio, fundamentos em Aristóteles / Buber / João Paulo II / Frankl / Rogers. (commits `6082b7c`, `6666546`)

### Decisões éticas invioláveis — registradas em memória permanente
- Nenhum valor comercial supera os valores morais e legais
- A tecnologia do Senova está a favor do homem, não da empresa
- O dado pertence ao usuário — a IA nunca usa o que não foi autorizado
- Toda vez que o usuário contribui com o Senova, deve ser recompensado

---

## O QUE FOI FEITO — SESSÃO 8 (18/jun/2026)

### Bugs corrigidos
- [x] Bug "Entrevista — agendar data e horário" persistindo em Para Hoje — migração one-shot `senova_migration_entrevista_legacy_v1` (commit `12ae2c9`)
- [x] OAuth Outlook: campo `h.outlook_conectado` não existia no `/health` — corrigido para `h.outlook === 'conectado'` (commit `b266306`)
- [x] Callback OAuth: `window.close()` bloqueado pelo Chrome após redirects OAuth — restaurado HTML original com `postMessage` + tentativa de close (commit `b266306`)
- [x] Detecção da extensão Senova: status hardcoded "Não detectada" — content.js agora dispara `senova:ext-ready`, app escuta e atualiza para "✅ Extensão ativa" (commit `61d7a15`)
- [x] LinkedIn notificações de rede social (aceites de convite, curtidas, etc.) classificadas como irrelevante pela IA (commit `58839fc`)

### Sprint A — FECHADO ✅
Todos os 5 itens implementados e aprovados por Marcos + revisão de código por Bruno:
- [x] `urlSegura()` — XSS em URLs de email (commit `b556722`)
- [x] CORS Worker restrito a `marcos-mco.github.io` (commit `d8d0529`)
- [x] Status unificado: `negado`+`descartado`→`arquivado`; `contato`→`aplicado`; sem "Em Contato" no dashboard (commits `4a79987` + `92b1fab`)
- [x] `corDoScore()` + `bgDoScore()` + `classificacaoDoScore()` centralizados (commit `4a79987`)
- [x] `const MODELOS` central — 14 call sites atualizados (commit `4a79987`)

### Sprint B — FECHADO ✅
- [x] Prompt caching (`cache_control: ephemeral`) no Worker para análise de vagas e emails (commit `9ca05d7`)
- [x] CV e avaliador de entrevista: `MODELOS.analise` → `MODELOS.rapido` (Sonnet); análise ATS explícita mantém Opus (commit `9ca05d7`)

### Sprint B+ — Feature B Email — IMPLEMENTADO (teste parcial)
- [x] Worker: whitelist force-show — email de domínio prioritário nunca é `irrelevante` (commit `99fcadc`)
- [x] Worker: blacklist de remetentes — KV `blacklist_remetentes` + rotas `/api/blacklist` GET/POST/DELETE (commit `99fcadc`)
- [x] Worker: pré-filtro de emails bloqueados antes da classificação IA (commit `99fcadc`)
- [x] Perfil → Outlook: textarea substituído por chips clicáveis — 15 portais sugeridos pelo Senova + campo custom (commit `99fcadc`)
- [x] Email card: botões `↺ Classificar` e `🚫 Bloquear` em todos os cards (commit `99fcadc`)
- [x] Bloquear email: oferece escolha — tipo (palavras-chave do assunto) ou remetente (commit `58839fc`)
- [x] Extensão: botão `+ Habilitar emails de <dominio>` no popup em qualquer portal (commits `99fcadc`, `61d7a15`)
- [x] Worker: mover TODOS emails processados para "Lidos pelo Senova" (commit `e1e937a`)

### Sprint C — FECHADO ✅
- [x] Análise lazy-batch com cache por `gerarId` no KV (commit `aaac151`)
- [x] Ordenação/filtro por score no Kanban (commit `aaac151`)
- [x] Badge "Não analisada" para vagas sem score (commit `aaac151`)

---

## PENDÊNCIAS — PRÓXIMA SESSÃO (prioridade para 19/jun/2026)

### 1. Testar Padrões Automáticos (Marcos ainda não viu a UI)
Fazer `Ctrl+Shift+R` → Perfil → aba de emails → seção "Fontes autorizadas de e-mail".
Ligar: "Alertas de vaga do LinkedIn" e "Alertas Adzuna / Gabi".
**Resultado esperado:** toggles ficam azul navy, toast "✓ 2 padrão(s) ativo(s)".
Depois: aba Emails → Atualizar → confirmar que só chegam emails autorizados.

### 2. Confirmar que emails pessoais pararam de ir para "Lidos pelo Senova"
Aguardar próximo ciclo de emails e verificar se Ronaldo / Moacir / Thiago continuam na caixa de entrada (não na pasta).

### 3. Construir estado "CV Enviado" no modal
Próximo passo da jornada aprovado. Wireframe definido na sessão 7. Só iniciar após Marcos confirmar pendências 1 e 2.

### 4. Discussão estratégica — visão fundacional
Marcos quer continuar a conversa sobre a visão civilizacional do Senova. Ler `VISAO_FUNDACIONAL.md` antes e retomar do ponto onde paramos. Marcos estava exausto ao encerrar — respeitar o ritmo.

---

## PRÓXIMAS FEATURES (backlog aprovado)

### Feature B — itens restantes
- [ ] Reclassificação com "aprendizado" — ao reclassificar, salvar padrão no KV para aplicar automaticamente nas próximas classificações (não só local)
- [ ] Análise linear de processo — mapear cada etapa vaga→resultado (registrada 17/jun/2026)

### Fluxo candidatura (próximo estado a construir)
- [ ] Implementar estado "CV Enviado" no modal — após estado Oportunidade aprovado
- [ ] 3 caminhos de candidatura: portal / email headhunter / indicação

### Futuro
- [ ] Responsivo mobile (768px+)
- [ ] Multi-usuário (bloqueante para versão comercial)
- [ ] Análise Linear de Processo (ver REVISAO_OPUS_17jun2026.md)

---

## BUGS ATIVOS CONFIRMADOS

| # | Descrição | Arquivo / Local | Prioridade |
|---|-----------|-----------------|-----------|
| ~~B1~~ | ~~"+ Abrir processo" em Novidades no mercado~~ | ✅ resolvido 15/jun s2 | — |
| ~~B2~~ | ~~Empty state "nenhuma nova" / "nenhum novo"~~ | ✅ resolvido 15/jun s2 | — |
| ~~B3~~ | ~~"Entrevista sem data" persistia em Para Hoje~~ | ✅ resolvido 18/jun s8 | — |
| ~~B4~~ | ~~Editar Processo: descrição da vaga não carrega~~ | ✅ resolvido 15/jun s3 | — |
| ~~B5~~ | ~~Worker usa `claude-sonnet-4-5` (obsoleto)~~ | ✅ FANTASMA — já usava 4-6 | — |
| ~~B-N1~~ | ~~Dashboard mostra "Em Contato"~~ | ✅ resolvido Sprint A | — |
| ~~B-N2~~ | ~~Status `negado`+`descartado` não unificados~~ | ✅ resolvido Sprint A | — |
| ~~B-N3~~ | ~~XSS via URL de email~~ | ✅ resolvido Sprint A | — |
| ~~B-N4~~ | ~~Worker CORS aberto~~ | ✅ resolvido Sprint A | — |
| ~~B10~~ | ~~Toggle "Lidos pelo Senova" não respondia~~ | ✅ resolvido sessão 9 | — |
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | index.html | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | index.html | **Baixa** (não prioridade agora) |
| B8 | LinkedIn no card de Contatos: URL sem link clicável | index.html | **Baixa** |
| B9 | Idioma DE ausente em todos os seletores PT/EN/ES | index.html | **Média** |
| ~~B11~~ | ~~Botão "Ver arquivados" não exposto na UI~~ | ✅ resolvido sessão 15 | — |

---

## ROADMAP DE SPRINTS — STATUS

| Sprint | Status | Observação |
|--------|--------|-----------|
| Sprint A — Segurança + Saneamento | ✅ FECHADO | Aprovado por Marcos + revisado por Bruno |
| Sprint B — Tokens + Outlook | ✅ FECHADO | Implementado; teste Marcos pendente |
| Sprint B+ — Feature B Email | ✅ IMPLEMENTADO | Teste parcial; OAuth a confirmar |
| Sprint C — ATS + Kanban | ✅ FECHADO | Implementado; teste Marcos pendente |

---

## ARQUITETURA DE EMAIL (v2.0 — 18/jun/2026 — Consentimento Explícito)

### Princípio fundamental
**A IA nunca vê o que o usuário não autorizou.** O filtro de consentimento acontece ANTES de qualquer chamada à Anthropic. Emails não autorizados não são lidos, classificados, movidos nem contados. Isso é LGPD/GDPR by design e princípio ético inviolável do Senova.

### Fluxo atual (v2.0)
1. Worker busca últimos 50 emails (7 dias) via Graph API
2. **Blacklist:** remetentes bloqueados → descartados imediatamente
3. **🔒 FILTRO DE CONSENTIMENTO:** `estaAutorizado()` — só passa email de domínio na whitelist OU padrão automático habilitado pelo usuário. Todo o resto: ignorado completamente.
4. Separar alertas (Adzuna, Google Alerts) dos emails normais
5. IA classifica emails normais: `positivo | pipeline | hunter | vaga | negativo | mercado | irrelevante`
6. Whitelist override: domínio autorizado → nunca `irrelevante`
7. `irrelevante` → não aparece no Senova (máx 10 na aba Limpar)
8. **Mover para "Lidos pelo Senova":** apenas emails relevantes (não-irrelevante) + alertas autorizados

### Fontes de autorização (controladas pelo usuário no Perfil)
| Fonte | Onde configurar |
|-------|----------------|
| Domínios/portais | Perfil → chips clicáveis (15 sugeridos + campo custom) |
| Extensão Chrome | Botão "+ Habilitar emails de <domínio>" em qualquer site |
| LinkedIn job alerts | Perfil → "Padrões automáticos" → toggle (OFF por padrão) |
| Adzuna / Gabi | Perfil → "Padrões automáticos" → toggle (OFF por padrão) |
| Google Alerts | Perfil → "Padrões automáticos" → toggle (OFF por padrão) |

### KV keys de email
- `whitelist_dominios` — domínios autorizados pelo usuário
- `blacklist_remetentes` — remetentes/assuntos bloqueados
- `padroes_automaticos` — padrões habilitados: `["linkedin_alertas","adzuna","google_alerts"]`
- `senova_email_vistos_*` — IDs já vistos (evita duplicatas)
- `outlook_folder_lidos` — ID da pasta "Lidos pelo Senova"

### Regras de classificação IA (críticas)
- LinkedIn notificações de rede (aceites, curtidas, aniversários) → **irrelevante**
- Confirmação de candidatura → **irrelevante**
- LinkedIn job alert / vagas → **vaga**
- Headhunter com contato direto → **hunter**
- RH sobre vaga candidatada → **pipeline**

---

## DECISÕES DE PRODUTO — SESSÃO 9 (18/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Consentimento explícito | Senova só lê emails de fontes autorizadas. A IA nunca vê o que não foi autorizado — princípio técnico, não só político |
| Padrões automáticos OFF | LinkedIn alerts, Adzuna, Google Alerts — todos desligados por padrão. Usuário liga o que quer |
| Mover só relevantes | "Lidos pelo Senova" recebe apenas emails que o Senova mostrou ao usuário + alertas autorizados |
| Visão fundacional | Senova inverte o mercado: empresas buscam pessoas, não ao contrário. Documentado em `VISAO_FUNDACIONAL.md` |
| Ética acima do comercial | Nenhum valor comercial supera o moral e o legal — gravado em memória permanente de Bruno |
| Recompensa por contribuição | Toda vez que o usuário melhora o Senova, deve ser recompensado concretamente (a definir em produto) |

---

## DECISÕES DE PRODUTO — SESSÃO 8 (18/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Whitelist de portais | Chips clicáveis no Perfil — 15 sugeridos + campo custom. Ativo = emails do domínio nunca somem |
| Blacklist | Por remetente OU por tipo (palavras-chave do assunto) — usuário escolhe ao clicar 🚫 |
| Extensão "Habilitar" | Botão no popup da extensão para qualquer site — adiciona domínio à whitelist com 1 clique |
| Mover emails | TODOS os emails processados vão para "Lidos pelo Senova" (não só baixo valor) |
| LinkedIn notificações | IA deve classificar como `irrelevante` — regra explícita no prompt |

---

## DECISÕES DE PRODUTO — SESSÃO 7 (17/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Ordem do modal | Header fixo → Body (muda por fase) → Barra de fases (footer fixo) → Botões |
| Barra de fases no footer | Âncora no footer fixo — nunca no header, nunca scrollável |
| Meta-linha header | Cidade · Modelo · Regime (CLT/PJ) · Ver vaga ↗ — sem canal, sem data, sem emoji |
| Status dropdown | Oculto no header para estado Oportunidade — mantido como hidden para dados |
| "Compatibilidade" | Accordion colapsado por padrão; barra + score visíveis mesmo fechado |
| "Análise holística" | Seção com botão "Perguntar à Sofia" — sob demanda, nunca automático |
| Processo | Um estado de cada vez na jornada do usuário: Oportunidade → CV Enviado → Entrevista → Proposta |

### Wireframe aprovado — Estado Oportunidade (17/jun/2026)

```
┌──────────────────────────────────────────────────────────────┐
│ [●]  Empresa S.A.                                      [✕]  │
│      Diretor Comercial                                       │
│      São Paulo · Híbrido · CLT · Ver vaga ↗                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Descrição da vaga                                           │
│  "Buscamos um Diretor Comercial com experiência em          │
│   gestão de equipes de alta performance e resultados        │
│   comprovados em vendas B2B..."                             │
│  Ver descrição completa ▾                                   │
│                                                              │
│  ▶  Compatibilidade  [████████████░░░░░░]  78%              │
│     (expandir para ver detalhes)                            │
│                                                              │
│  ▶  Análise holística                                       │
│     [Perguntar à Sofia]                                      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ●───────○───────○───────○                                  │
│  Oportunidade  CV Enviado  Entrevista  Proposta             │
├──────────────────────────────────────────────────────────────┤
│  [Remover]       [Cancelar]      [Ir para vaga ↗]           │
└──────────────────────────────────────────────────────────────┘
```

---

## DECISÕES DE PRODUTO — SESSÃO 5 (16/jun/2026)

| Decisão | Detalhe |
|---------|---------|
| Kanban — colunas | Oportunidade → CV Enviado → Entrevista → Proposta → [Aceito \| Arquivado] |
| Coluna "Em Contato" | REMOVIDA — headhunters/indicações entram como Oportunidade |
| "Negado"/"Descartado" | UNIFICADOS em "Arquivado" |
| Modal sensível ao status | Cada estado tem missão e conteúdo próprio — não scroll único |
| Análise técnica | Automática, sempre presente quando há descrição |
| Sofia | Persistente — disponível em qualquer estado como chat contextual |
| "Candidatar" via Outlook | REMOVIDO — candidatar = abre URL da vaga no portal |
| Score obrigatório | "Ir para vaga" só habilita após análise técnica |
| Excluir ≠ Declinar | Oportunidade: Excluir (sem rastro). Processos ativos: Declinar/Arquivar |

---

## BUGS ATIVOS CONFIRMADOS

| # | Descrição | Arquivo / Local | Prioridade |
|---|-----------|-----------------|-----------|
| ~~B10~~ | ~~Toggle "Lidos pelo Senova" não respondia~~ | ✅ resolvido sessão 9 | — |
| B6 | Botão "Verificar" em Busca Automática sem feedback visual | index.html | **Baixa** |
| B7 | Sofia / Preparar entrevista não funcionando | index.html | **Baixa** (não prioridade agora) |
| B8 | LinkedIn no card de Contatos: URL sem link clicável | index.html | **Baixa** |
| B9 | Idioma DE ausente em todos os seletores PT/EN/ES | index.html | **Média** |

---

## REGRAS INVIOLÁVEIS

### Desenvolvimento
- Nunca chamar `api.anthropic.com` do browser — sempre via Worker
- Nunca substituir `index.html` por arquivo externo
- Salvar backup `senova_v[N]_[data].html` antes de editar `index.html`
- Nunca refatorar CSS junto com correção de bug
- Um fix de cada vez: commit → Marcos testa → aprova → próximo
- Nunca commitar sem rodar checklist do `skill_qa.md`
- Nunca "nenhuma nova", "nenhum novo", "0 vagas" — categoria vazia SOME
- Novidades no mercado NUNCA têm "+ Abrir processo" — são informativas

### CV e Perfil (ver PERFIL_MARCOS.md para detalhes)
- RPC/Globo SEMPRE em 2 cargos: Gerente (nov/2008–abr/2012) + Diretor (abr/2012–abr/2019)
- Sales = Vendas = Comercial (sinônimos) — Marcos é de Vendas, não de Marketing
- Master em Vendas (não Marketing)
- Email: marcos_mco@hotmail.com

### Brand Senova
- Navy: `#1A3A5C` | Gold: `#C9A84C` | Action: `#2E6DA4`
- Fontes: Playfair Display + Inter — NUNCA DM Sans
- Mínimo 15px corpo (público 35+)
- NUNCA alterar cores/fontes/layout sem aprovação explícita de Marcos

---

## SKILLS DISPONÍVEIS

### Protocolo Bruno (ler SEMPRE ao iniciar)
- `skill_qa.md` — protocolo 3 fases obrigatório
- `skill_fluxo.md` — fluxo v1.2 + vocabulário + regras Sprint 01
- `skill_dev_senova.md` — arquitetura, módulos, Worker, deploy
- `skill_ux_writing.md` — voz, tom, empty states, botões, Sofia

### Design e UX
- `skill_design_senova.md` — brand, componentes, padrões visuais

### Carreira de Marcos (quando há CV, carta, pesquisa)
- `PERFIL_MARCOS.md` — dados completos, histórico, contatos estratégicos
- `skill_cv.md` · `skill_linkedin.md` · `skill_pesquisa_exec.md`
- `skill_followup.md` · `skill_market_intel.md`

### Produto e negócio
- `skill_produto.md` · `skill_business_plan.md` · `skill_concorrentes.md`

### Sofia e CRM
- `skill_sofia.md` — personalidade, tom, estágios
- `skill_crm.md` — Processos, Contatos, varredura

### Infraestrutura
- `skill_api_claude.md` — Anthropic API, prompt caching, modelos
- `skill_pwa.md` — mobile, responsivo, PWA
- `skill_security.md` — OWASP, validação, multi-usuário

---

*Bruno = Tech Lead + Arquiteto + Engenheiro + QA | Marcos = PM + QA Final*
