# SESSAO.md — Estado Vivo
> Última atualização: 25/jun/2026 — encerramento (ir para nova sessão)

## VERSÃO ATUAL
Senova app — produção em marcos-mco.github.io/senova · último commit de código: `7dda6e4`
Extensão **v2.33** (local — Marcos recarrega em chrome://extensions; NÃO publicada na Web Store)
Worker **senova-proxy** — deploy `a5a11b89` (rate limit no ar)

## O QUE FOI FEITO HOJE (25/jun/2026 — Sessão 18)

### Copiloto de Candidatura — fluxo completo (extensão v2.18 → v2.33)
- Lê a vaga (LinkedIn) → painel; acompanha o usuário ao site de candidatura via "passe"
  (chrome.storage.local); cobertura **universal** de portais (matches `https://*/*`).
- Preenche **dados fixos** (Cartão: `__senovaCartaoCandidatura`) + **perguntas abertas**
  (IA via `__senovaCopilotoRespostaPrompt`, CV_BASE + notas, honesto). Padrão: app monta
  prompt síncrono / background faz o fetch.
- **CV on-demand** sem reprocessar (`__senovaCopilotoGerarCV/SalvarCV`) — card = fonte de verdade.
- **Candidatura** automática (detecta envio) + manual reversível ("Não enviei"); reusa
  `__senovaCandidaturaEnviada`/`__senovaDesfazerCandidatura`.
- Entrada **"Por fora"** (ativar pelo popup quando se chega direto na vaga).
- Commits index.html em produção: `218acef` (cartão), `027dbec` (status/temCV), `b0d093f` (CV
  on-demand), `fafce1d` (download dataURL), `07f05ef`, `2224e80`, `6d80c15`.

### Reunião de arquitetura + fundação de skills
- **Fluxo definitivo card↔copiloto** (auditoria senova-auditor): `docs/fluxo_definitivo_card_copiloto.md`.
  Causa raiz dos bugs = obra inacabada do card (ações de documento removidas e não recolocadas).
- **2 skills novos** (pesquisa de estado da arte + síntese):
  - `skill_arquitetura_cognitiva.md` v2.0 — cognição + ética (primeiro crivo de qualquer tela).
  - `skill_engenharia_senova.md` v1.0 — front/back/arquitetura (25 regras + 5 riscos reais).

### Estabilização (caminho C — só o essencial)
- **Worker:** rate limit por IP (40/min, fail-open) em `/api/claude` e `/api/analisar-vaga` —
  protege a cota Anthropic (a URL do Worker é pública). Commit `7dda6e4`, deploy `a5a11b89`.

### Revertido (a refazer)
- **Fix 1 do card** (ações de documento no lead) foi feito e **revertido** (`8bd751d`) por ter
  ficado remendo (ordem errada, CV automático, ícone infantil). **Será refeito sob o crivo.**

## PRÓXIMAS PRIORIDADES (retomar aqui)

| # | Item | Tipo |
|---|------|------|
| 1 | **Fix 1 do card — REFAZER sob o crivo cognitivo + gates de engenharia** | Fix definitivo |
| 2 | Fixes 2–6 do fluxo (FAB legado; first/last name; feedback CV; "já me candidatei"; passe+temCV) | Fixes |
| 3 | Testar a v2.33 do copiloto ponta a ponta (Marcos relatou: ok no LinkedIn/Greenhouse) | Validação |
| 4 | Decisão de Marcos: dívida single-file → ES Modules nativos (sem build) ou só mitigar | Arquitetura |

### Handoff do Fix 1 — wireframe APROVADO do card de Oportunidade (lead)
Ordem = raciocínio (ENTENDER → JULGAR → AGIR). **Documentos só sob demanda; análise automática = só score.**
```
DESCRIÇÃO DA VAGA      ← ① ENTENDER (topo; texto formatado; fonte única)
COMPATIBILIDADE        ← ② JULGAR (automática: SÓ score + veredicto Sofia; é leitura)
DOCUMENTOS             ← ③ AGIR (sob demanda: [Gerar CV][Gerar carta][Gerar resposta])
+ Dados da vaga        ← detalhe secundário (progressive disclosure)
[Remover]   [Cancelar] [Ir p/ vaga] [Salvar]
```
6 regras: (1) ordem fixa; (2) automático = só Compatibilidade, nunca gera documento;
(3) documentos = 3 botões de ação, geram só ao clicar, salvam no card; (4) descrição formatada,
"Dados" separado sem duplicar; (5) sem ícones infantis (skill_design/cognitiva); (6) "PDF
Executivo" não "Premium". Pontos técnicos: `mvAjustarSecoesStatus` (~5739) + ramo lead
(~6663) em index.html. **Rodar o CRIVO de 13 perguntas (skill_arquitetura_cognitiva §11) antes de codar.**

## ESTADO DO WORKER
`senova-worker.js` — rate limit adicionado (commit `7dda6e4`, deploy `a5a11b89`). Saudável (/health ok).

## GIT
Branch `main`. Commits de hoje: copiloto `4121adb`, skills/docs (este), worker `7dda6e4`,
index em produção até `8bd751d`. Push pendente no encerramento.
