# Fluxo Definitivo — Card ↔ Copiloto (da vaga à candidatura)

> **Reunião de arquitetura — 25/jun/2026.** Conduzida por Bruno (Tech Lead) com auditoria
> técnica read-only + revisão dos skills (fluxo, CV, UX writing). Motivo: Marcos pediu para
> **parar de remendar** e ter uma solução definitiva. **Aprovar antes de codar.**

---

## 1. A regra de ouro (skill_fluxo, regra 5 + decisão de Marcos)

> **O CARD é a única fonte de verdade. A EXTENSÃO é só braço remoto.**
> Todo CV/carta/resposta é gerado e salvo no card (`vagas[i].atsCV`, `atsCarta`).
> O copiloto **lê, baixa, preenche e avisa** — **nunca** gera por conta própria sem passar
> pela ponte do app. Zero geração duplicada. Se um lado fez, o outro enxerga na hora.

---

## 2. Diagnóstico — por que estávamos remendando

**Causa raiz única:** quando a aba "Analisar" virou painel de leitura, as ações de documento
(gerar CV/carta) foram **removidas sem destino** — deveriam ter ido para o card e não foram.

- No estado **lead** (Oportunidade), `mvAjustarSecoesStatus()` (`index.html:5738-5739`) **oculta
  a `mv-docs-section`**, e o ramo que revela download está no `else` de não-lead (`:6663-6687`).
- Resultado: o lead **gera e salva o CV** (`atsCV` em `:6656`) mas **não tem botão no card**
  para acessá-lo — justo no estado em que o usuário vai se candidatar.

O copiloto foi construído assumindo um card que já era fonte de verdade. Como o card está
incompleto, o copiloto ficou pendurado. **Todos os 5 bugs de hoje saem daí ou de legados não
limpos.** Não são bugs isolados — são sintomas de uma obra inacabada.

---

## 3. Os DOIS caminhos de candidatura (ambos legítimos — não confundir)

```
                          ┌─ vaga por E-MAIL / recrutador ──► CANDIDATURA VIA OUTLOOK
                          │     • botão "Enviar Candidatura →" no card (index.html:6553)
   CARD (Processos) ──────┤     • candidatarDoModal → modal-candidatura (envia CV+carta por email)
                          │
                          └─ vaga em PORTAL externo (Greenhouse/Gupy/Loxo…) ──► CANDIDATURA VIA COPILOTO
                                • copiloto preenche o formulário na página
                                • usuário clica Enviar no portal → copiloto avisa o card
```

O `modal-candidatura` (Outlook) **fica**. O copiloto cobre os portais. São complementares.

---

## 4. O fluxo completo (estado-alvo)

```
┌──────────────────────────────────────────────────────────────────┐
│  CARD (app) — fonte de verdade                                     │
│   • Painel de leitura: Compatibilidade + Sofia (veredicto)         │
│   • AÇÕES DE DOCUMENTO (em TODOS os estados, incl. lead):          │
│       Gerar/Regerar CV · Carta · Resposta → salvam em atsCV/atsCarta│
│   • "Enviar Candidatura →" (Outlook) quando aplicável              │
└───────────────┬──────────────────────────────────────────────────┘
                │  ponte window.__senovaCopiloto* (PULL, sem reprocesso)
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  COPILOTO (extensão) — braço remoto, em qualquer portal            │
│   1. Lê a vaga → passe (jobId, score, cargo, empresa, temCV)       │
│   2. Preenche: dados fixos (Cartão) + perguntas (IA, perfil+notas) │
│   3. CV: baixa o atsCV do card; se não existe, pede ao card gerar  │
│   4. Você revisa e clica Enviar no portal (NUNCA auto-submit)      │
│   5. Avisa o card → CV Enviado (automático + confirmação manual)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Onde cada ação vive (contrato)

| Ação | Vive no | Observação |
|---|---|---|
| Gerar/regerar CV, carta, resposta | **Card** | única porta de geração; salva em `atsCV`/`atsCarta` |
| Mostrar documentos gerados | **Card** | `mv-docs-section` visível em **todos** os estados |
| Candidatura por e-mail | **Card** | `modal-candidatura` (Outlook) — permanece |
| Preencher formulário de portal | **Copiloto** | dados fixos + perguntas |
| Baixar CV já existente no portal | **Copiloto** | lê `atsCV`; se faltar, aciona a geração do card |
| Detectar/confirmar envio no portal | **Copiloto** | automático + rede de segurança manual |

---

## 6. O que REMOVER (legados que causam ruído)

1. **FAB `snv-fab`** (`content.js:501-587`) — o "lixo à direita". Sobrepõe o copiloto em sites
   externos e cria corrida de injeção (a guarda só vale no instante). **Aposentar** — o copiloto cobre.
2. **3 formatos de passe** (LinkedIn `:1042`, externo `:1054`, popup `popup.js:111`) → **unificar**
   num formato só, **incluindo `temCV`** (hoje ele morre no passe e o botão de CV "mente").

---

## 7. Os 6 fixes — em ordem (1 por vez, Marcos testa entre cada)

| # | Fix | Onde | Fecha |
|---|---|---|---|
| **1** | **Card lead ganha as ações de documento** (revelar `mv-docs-section` + botão Gerar CV no estado lead) | `index.html:5739`, `:6663` | a obra inacabada (§2) + "card sem opção" |
| 2 | **Aposentar o FAB** | `content.js:501-587` | o "lixo à direita" + corrida de injeção |
| 3 | **First/Last name**: Cartão expõe `primeiroNome`/`sobrenome`; classificador distingue | `index.html:9133`, `content.js:660` | "Marcos Franco" duplicado |
| 4 | **Feedback honesto do CV**: trocar `return null` por `{erro}` específico; só dizer "✓" após confirmar download + sync | `background.js:324`, `content.js:857` | CV que "some" |
| 5 | **Desambiguar candidatura**: um gatilho por vez; texto claro (manual × confirmação) | `content.js:828` | botão "Já me candidatei" ambíguo |
| 6 | **Unificar passe + `temCV`** | `content.js:1042/1054`, `popup.js:111` | botão de CV "mente" sobre o estado |

---

## 8. UX writing (skill_ux_writing) — labels corretos

- Botão de gerar: **"Gerar CV"** (não "Gerar e baixar CV (.docx)").
- Candidatura por e-mail: **"Enviar Candidatura"** (não "Candidatar").
- Marcar envio no portal: **NÃO** "Já me candidatei" (ambíguo). Usar registro claro de status —
  ex.: aviso automático *"✓ Registrado como CV Enviado"* + ação manual de reserva *"Marcar como enviada"*.
- Status: **"CV Enviado"** (nunca "Aplicado/Applied"). Compatibilidade (nunca Score).

---

## 9. Pendência a confirmar em runtime (não bloqueia o desenho)

`chrome.downloads.download` com `data:` grande e `saveAs:false`: confirmar com o `downloadId`
retornado se o arquivo realmente chega ao disco no Chrome do Marcos (parte do fix 4).

---

*Senova · fluxo definitivo card↔copiloto · 25/jun/2026 · aprovar antes de codar (FASE 1)*
