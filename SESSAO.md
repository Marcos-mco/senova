# SESSAO.md — Estado Vivo
> Última atualização: 09/jul/2026 — Sessão 26 (FECHADA)
> ⚠️ Sessões 23–25 não foram registradas neste arquivo (ficou parado na 22) — histórico completo vive em `VIRGILIO.md`. Este topo reflete o estado REAL confirmado agora pelo Claude Code.

## VERSÃO ATUAL
Senova app — produção em marcos-mco.github.io/senova · sem alteração nesta sessão
Extensão **v2.59** (local — Marcos recarrega em chrome://extensions; NÃO publicada na Web Store) · instrumentação de diagnóstico (iframe same-origem) — Sessão 26
Worker **v7.9** — sem alteração nesta sessão
Working tree LIMPO, sincronizado com origin/main. Último commit: `0184508`.

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
