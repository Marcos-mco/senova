# Copiloto de Candidatura — Desenho v1.0

> **Aprovado por Marcos em 24/jun/2026.** Continuação do `docs/fluxo_candidatura.v1.3.html`
> (etapa "da vaga à candidatura"). Este documento detalha **o copiloto na página da vaga** —
> a caixa que o fluxograma deixou abstrata ("o copiloto acorda / cria o que a página pede").

---

## 1. O que o copiloto É (e o que NÃO é)

**NÃO é** uma vitrine que repete a análise/score. A decisão de candidatar já foi tomada antes.

**É** uma caixa de **ferramentas de ação** que **lê a página e determina sozinho o que fazer**.
O usuário não escolhe "carta vs CV" num menu fixo — **o Senova detecta o que a página pede** e age.

```
┌─────────────────────────────────────────────┐
│  1. LÊ A PÁGINA   (o Senova determina)       │
│     ↓                                         │
│  2. DETECTA o que a vaga pede:               │
│     • campos (nome/e-mail/fone) → PREENCHE    │ ← autofill
│     • pergunta aberta → GERA resposta         │ ← IA, no tom do Marcos
│     • pede CV         → oferece o .docx        │
│     • campo de carta  → gera o resumo/carta    │
│     ↓                                         │
│  3. VOCÊ revisa e clica Enviar               │ ← linha ética inviolável
│     O Senova NUNCA envia por você.            │
└─────────────────────────────────────────────┘
```

Resumo numa frase: **um autofill inteligente** — preenche os dados fixos como o Google,
**e mais**: gera respostas para perguntas abertas e entrega o CV/carta certos da vaga.

---

## 2. Autofill — "como o Google faz", porém superior

| Campo na página | Autofill do Chrome | Copiloto Senova |
|---|---|---|
| Nome, e-mail, telefone, cidade | ✅ preenche | ✅ preenche |
| LinkedIn, pretensão, disponibilidade | ⚠️ às vezes | ✅ preenche |
| "Por que você quer esta vaga?" | ❌ não sabe | ✅ **gera no seu tom** |
| Upload de CV | ❌ | ✅ oferece o `.docx` da vaga |

Mecânica: o content script identifica cada campo pelo rótulo/placeholder/aria-label, escreve
o valor e **dispara o evento `input`/`change`** que o site espera (React/Angular só reconhecem
assim). Destaca os campos preenchidos para revisão. **Preencher ≠ enviar** — você clica Enviar.

---

## 3. Arquitetura — copiloto = braço, app = cérebro

O copiloto **não pode gerar nada sozinho**. Tudo que torna um CV/carta/resposta *do Marcos*
mora no **app**, não na extensão:

| Recurso | Onde vive | Referência |
|---|---|---|
| Perfil + contexto adicional | app (localStorage) | `CV_BASE`, `CTX_KEY` (`senova_contexto_extra`) |
| Prompt de CV | app | `ATS_SYSTEM` — `index.html:2934` |
| Prompt de carta | app | `CARTA_SYSTEM` — `index.html:2985` |
| Gerar carta | app | `gerarCartaATS()` — `index.html:3302` |
| Sugerir resposta | app | `sugerirRespostaATS()` — `index.html:3327` |
| Conversão `.docx` | app (`htmlDocx`) | `downloadDoc()` — `index.html:3353` |

Logo a regra é **não duplicar prompt/perfil na extensão**. O copiloto oferece os botões;
ao clicar, pede ao app — pelo **mesmo trilho PULL que já move `__senovaAnaliseDoCard`** — que
gere reusando o que existe e devolva o resultado para a página.

**Trilho:** `copiloto (content.js)` → `background.js (executeScript world:MAIN)` →
`window.__senovaCopiloto*(jobId)` no app → reusa lógica + Worker → devolve texto / baixa `.docx`.

Ganchos PULL já no ar: `__senovaAnaliseDoCard` (`index.html:9065`),
`__senovaCandidaturaEnviada` (`index.html:9043`), `buscarAnaliseDoApp` (`background.js:220`).

---

## 4. Peça nova exigida: "Cartão de candidatura"

Para o autofill dos **dados fixos**, o copiloto precisa de: nome, e-mail, telefone, cidade,
LinkedIn, pretensão, disponibilidade. Hoje vivem espalhados no Perfil.
**Decisão de fonte pendente** (a confirmar com Marcos): puxar do Perfil no app vs. lugar
próprio na extensão preenchido uma vez. Campos **abertos** e **CV/carta** continuam vindo do app.

---

## 5. Sequência de construção (fatias testáveis)

| # | Entrega | Risco | Depende |
|---|---|---|---|
| **1** | Copiloto **lê a página e mostra o que detectou** ("achei: nome, e-mail, 2 perguntas, upload de CV") — o cérebro que determina | baixo (puro DOM) | — |
| 2 | **Autofill dos campos fixos** (nome/e-mail/fone/cidade) | médio | Cartão de candidatura |
| 3 | **Gera resposta** para perguntas abertas (trilho app/IA) | médio | `sugerirRespostaATS` |
| 4 | **CV `.docx` + carta** entregues na página | baixo (reusa app) | `downloadDoc`, `gerarCartaATS` |

Prioridade base do fluxograma v1.3: LinkedIn Easy Apply primeiro; candidatura externa também
coberta (oferecer CV/carta para levar ao portal).

---

## 6. Linha ética inviolável

A extensão **prepara, preenche, gera e sugere para revisão** — mas **quem clica "Enviar" é
sempre o usuário**. Nada de auto-submit: violaria os ToS do LinkedIn e o princípio de
honestidade do Senova. Ver `SOFIA_ALMA.md` e `VISAO_FUNDACIONAL.md`.

---

*Senova · desenho do copiloto v1.0 · 24/jun/2026 · revisar antes de codar (FASE 1 — Arquiteto)*
