# skill_engenharia_senova — Engenharia de Software: Front-end, Back-end e Arquitetura

Versão: 1.0 · Criado: 25/jun/2026 · Fundamentado em estado da arte 2023–2025 (web.dev/Google,
OWASP, W3C/WAI, MDN, Cloudflare docs, Philip Walton, Chrome for Developers).
A camada **técnica** — como o software é construído com excelência. Complementa, não substitui:
`skill_security` (OWASP/Worker — segurança), `skill_qa` (processo de QA), `skill_dev_senova`
(mapa operacional da stack). Princípios estáveis aqui; estado volátil (bugs, versões) no VIRGILIO.

> **QUANDO USAR — obrigatório antes de:** escrever/alterar JS no `index.html`, no Worker ou na
> extensão; renderizar listas; criar `fetch`; abrir modal; tocar em estado/localStorage; criar rota.

**Fundamento moral (de `skill_arquitetura_cognitiva` §7):** *santificar o trabalho* = código feito
"sem mácula". Excelência técnica é exigência moral, não vaidade. Cada regra abaixo serve a isso.

---

## OS 5 RISCOS REAIS DO SENOVA (já se materializaram — priorizar)

1. **XSS via `innerHTML` com dado externo** — e-mail/vaga/IA no `localStorage` sensível. (§1.7)
2. **Estado espalhado/dessincronizado** — Home vs Kanban vs storage divergem. (§2.9)
3. **Falha silenciosa em `fetch`** — o "CV que sumiu"; `catch {}` vazio. (§1.5)
4. **`innerHTML` destrói listeners** — "botão parou após o render" (o FAB legado). (§1.3)
5. **Abuso do proxy** — qualquer um chama o Worker → custo na conta de Marcos. (§3.16)

---

## EIXO 1 — Front-end vanilla (sem framework/build)

| # | Princípio (fonte) | Regra Senova |
|---|---|---|
| 1.1 | **INP < 200ms** — substituiu o FID em mar/24 (web.dev) | nenhuma ação (mover card, filtrar, abrir modal) bloqueia a main thread com re-render total síncrono. Quebrar com `requestAnimationFrame`/`requestIdleCallback`; `content-visibility:auto` em listas longas (arquivados, e-mails) |
| 1.2 | **`DocumentFragment`, não `innerHTML +=` em loop** (Frontend Masters) | render de lista monta string única ou fragment e atribui **de uma vez** — nunca concatenar dentro de loop (reflow N×). Ler e escrever DOM em fases separadas |
| 1.3 | **Event delegation** (freeCodeCamp) | um listener no container + `e.target.closest('[data-acao]')`. Ações por `data-*`, nunca handler reanexado a cada render. **Elimina a classe de bug "parou após atualizar a lista"** |
| 1.4 | **Cleanup com `AbortController`** (Auth0/MDN) | ao abrir modal: `const ac=new AbortController()`; passar `{signal:ac.signal}` a TODO listener/timer; ao fechar: `ac.abort()`. Únicos: `{once:true}`. Mata memory leak de modal |
| 1.5 | **`fetch` resiliente — nunca falha silenciosa** (web.dev) | todo `fetch` ao Worker: `signal:AbortSignal.timeout(35000)` + checar `if(!res.ok)` explícito. 3 estados na UI: carregando / sucesso / **erro com mensagem humana + retry**. **Proibido `catch {}` vazio** |
| 1.6 | **WCAG 2.2 AA** (W3C/Deque) | foco visível (outline ≥2px, contraste 3:1) nunca obscurecido por barra fixa; teclado completo (Tab/Enter/ESC) em modais; `aria-label` em ícone-botão; `<button>` real (não `<div onclick>`); texto ≥4.5:1 — **o dourado #C9A84C falha como texto pequeno: só fundo/detalhe** |
| 1.7 | **`innerHTML` com dado externo = XSS** (OWASP) — RISCO Nº1 | dado de fora (e-mail, vaga, IA, Graph, Adzuna, input) **nunca** entra via `innerHTML`. Usar `textContent`, `setAttribute`, `el.append()`. `innerHTML` só com template 100% literal. HTML de 3º (raro) → DOMPurify (CDN com SRI). **QA: grep `innerHTML` tocando variável externa → zero** |
| 1.8 | **CSP via `<meta>` + SRI nos CDNs** (OWASP/MDN) | `<meta http-equiv="CSP">` restringindo `connect-src` (Worker+APIs), `script-src` (CDNs), `object-src 'none'`. Toda lib CDN com `integrity="sha384-…"`. *Defesa em profundidade sobre §1.7.* (Exige inventário de inline antes — pode quebrar; aplicar com cuidado) |

---

## EIXO 2 — Arquitetura do app vanilla single-file

| # | Princípio (fonte) | Regra Senova |
|---|---|---|
| 2.9 | **Store único + pub/sub** (CSS-Tricks/patterns.dev) | um `Store` (IIFE) dono do estado. Mutação só via `Store.set()` → persiste localStorage + emite evento; UI **assina** e re-renderiza do estado (render = função pura do estado). **Proibido** A escrever no DOM de B ou no localStorage por fora do Store. Resolve o risco nº2 |
| 2.10 | **Módulos IIFE namespaced + seções** (patterns.dev) | agrupar por feature (`Processos`,`Contatos`,`Emails`,`Sofia`,`Store`,`API`,`UI`); banner pesquisável `// ===== MÓDULO: X =====`; índice no topo; só o mínimo vai a `window.NS`. Encolhe o acoplamento "editei X, quebrei Y" |
| 2.11 | **Funções puras + asserts em runtime** (alexwlchan/Pluralsight) | extrair lógica pura SEM DOM (scoring, dedup, classificação de e-mail, datas) → entrada→saída determinística. `function assert(c,m){if(!c)console.error('ASSERT',m)}` em invariantes ("id único","status∈válido"). Assert antes de sobrescrever localStorage (trava anti-perda) |
| 2.12 | **Smoke test + feature flag** (Amplitude/LaunchDarkly) | roteiro fixo de ~10 passos rodado **antes de todo commit** do index. Mudança arriscada → `const FLAGS={novoX:false}`: merge desligado, liga após validar; rollback = flip de boolean |

---

## EIXO 3 — Back-end (Cloudflare Worker)
*Segurança detalhada em `skill_security` (OWASP, CORS, validação, SSRF, headers). Aqui, resiliência e operação.*

| # | Princípio (fonte) | Regra Senova |
|---|---|---|
| 3.14 | **Validar todo input** (Cloudflare) | cada rota valida método, content-type, shape/tamanho do body antes da lógica; teto de payload; whitelist de campos — não repassar body bruto à Anthropic/Graph |
| 3.15 | **Nunca vazar stack ao cliente** (Cloudflare) | `try/catch` em toda rota → `{error:"msg humana", code:"SLUG"}` + status; detalhe técnico só em `console.error`. Helper `jsonError(status,code,msg)` |
| 3.16 | **Proteger o proxy de abuso** (Cloudflare) — RISCO Nº5 | CORS **só** `https://marcos-mco.github.io` (não `*`); validar `Origin`; rate limiting binding nas rotas de IA; considerar segredo compartilhado leve app↔Worker. (CORS é controle de browser — o forte é rate limit + restringir destinos) |
| 3.17 | **Respeitar limite de CPU ~30s** (Cloudflare) | score ATS no browser (manter); streaming nas respostas longas da Anthropic; `ctx.waitUntil()` p/ trabalho fora do request (log, KV); varredura pesada só no cron |
| 3.18 | **Resiliência c/ APIs externas** (APIScout) | Graph/Adzuna: retry 2–3 **só** p/ transitório (429/5xx/timeout) com backoff+jitter; **nunca** retry em 4xx ou operação não-idempotente; fallback explícito (Bing→Google já é bom); circuit breaker leve via KV |
| 3.19 | **Idempotência em escrita** (BoldSign) | `/api/send-email`, `/api/calendar`: chave de idempotência registrada no KV — **nunca** `sendMail`/`createEvent` em laço de retry sem isso (risco real: e-mail dobrado a recrutador) |
| 3.20 | **Observabilidade** (Cloudflare) | habilitar observability no `wrangler.toml`; log JSON (`{rota,status,ms,provedor}`); `wrangler tail --status error` **após** deploy; **nunca** logar PII (corpo de e-mail, token) |

---

## EIXO 4 — Disciplina e qualidade

| # | Princípio (fonte) | Regra Senova |
|---|---|---|
| 4.21 | **Conventional Commits + Keep a Changelog + SemVer** | `tipo(escopo): descrição`; `feat`→MINOR, `fix`→PATCH, `BREAKING`→MAJOR; app e Worker versionados separados; `VERSOES.md` em Added/Changed/Fixed, em linguagem para Marcos |
| 4.22 | **Deploy seguro c/ rollback** (Cloudflare) | tag git antes do deploy (`git tag app-v3.x`); rollback = revert/checkout da tag; gradual deployment no Worker p/ mudança arriscada; backup `senova_v[N]_data.html` antes de editar index (já é regra) |
| 4.23 | **Code review por checklist (mesmo solo)** | gates novos no QA: "nenhum `innerHTML` c/ dado externo", "todo `fetch` tem timeout+erro", "todo listener tem cleanup". Um commit = uma mudança coesa |
| 4.24 | **Testabilidade sem framework** (alexwlchan) | `tests.html` (ou `?test=1`) com `it()`/`assertEqual()` caseiros sobre as funções puras de maior risco (scoring, dedup, classificação, migração localStorage). Rede mínima onde a quebra dói mais |
| 4.25 | **Segurança da extensão MV3** (Chrome) | em `onMessage`: validar `sender` e shape antes de agir; tratar content script/página como **não-confiável** e sanitizar; `window.__funcoes` expõe o mínimo (app=cérebro, extensão=braço, fronteira estreita e validada); assumir que dado enviado ao content script pode vazar p/ a página |

---

## A DÍVIDA DA ARQUITETURA SINGLE-FILE — decisão consciente de Marcos

**Riscos reais (já materializados):** acoplamento invisível em ~9.000 linhas (editar uma função
quebra outra distante sem sinal — cards apagados 2×, regressões); `innerHTML` difuso = XSS difuso;
estado espalhado = divergência Home/Kanban/storage; sem rede de regressão além do olho de Marcos.

**Mitigação DENTRO da restrição "sem build" (fazer já):** Store único (§2.9) + IIFE namespaced
(§2.10) + banir `innerHTML` externo (§1.7) + harness de asserts (§2.11/4.24) + smoke test (§2.12).

**O caminho estrutural — para sua decisão (NÃO uma ação que eu tome):**
> ES Modules nativos do browser (`<script type="module">` + import/export, opcionalmente import
> maps) quebram o código em vários `.js` que **o browser carrega sozinho — sem bundler, sem npm,
> sem build**. Suporte ~93%+. Isso **preserva 100% a regra "sem build"**; mexe apenas na regra
> separada "arquivo único". Ganho: escopo isolado por padrão, edição localizada, dívida de
> acoplamento cai na raiz. Custos honestos: precisa servir via HTTP (GitHub Pages serve; `file://`
> local não — usar `python -m http.server`); migração de 9.000 linhas é cirúrgica, feita aos poucos.
>
> **Recomendação:** fazer a mitigação (a) **já**; considerar (b) migração gradual a ES Modules
> **só se** a dor de regressão continuar crescendo. Decisão sua — risco vs. familiaridade.

---

## GATES A ACRESCENTAR AO `skill_qa.md` (Fase 2 — Engenheiro)

- **Segurança:** nenhum `innerHTML` com dado externo; CSP/SRI presentes; (Worker) validação + CORS restrito.
- **Resiliência:** todo `fetch` tem timeout + estados loading/erro; nenhum `catch {}` vazio; envio de e-mail idempotente.
- **Memória:** todo listener/observer/timer novo tem cleanup (`AbortController`/`once`).
- **Regressão:** smoke test de 10 passos rodado; asserts da lógica pura passando.
- **Acessibilidade:** foco visível e não obscurecido; teclado em modais; semântica `<button>`; contraste AA.

---

## FONTES (verificadas)
web.dev/Google (INP, Core Web Vitals, fetch error handling); OWASP (DOM-XSS, XSS, CSP cheat sheets);
W3C/WAI (WCAG 2.2) + Deque University; Auth0/MDN (memory leaks); Frontend Masters & freeCodeCamp
(DOM/event delegation); CSS-Tricks & patterns.dev (state, module pattern); Philip Walton & VIP
JavaScript (ES Modules nativos / import maps); Cloudflare Docs (Workers best practices, limits,
logs, rate limiting, production safety); APIScout & BoldSign (resiliência/idempotência);
Conventional Commits 1.0 & Keep a Changelog; Chrome for Developers (MV3 messaging/security);
alexwlchan & Pluralsight (testes sem framework).

*Notas de rigor:* CSP exige inventário prévio de inline scripts do index (pode quebrar — aplicar com
cuidado). Controle forte contra abuso do proxy = rate limit + restrição de destino, não CORS isolado.
Contraste do #C9A84C precisa ser medido por fundo. Nenhuma regra viola "sem build", "IA só via
Worker" ou "arquivo único" — a única que toca "arquivo único" é decisão explícita de Marcos.

---

*Senova · skill_engenharia_senova v1.0 · 25/jun/2026 · excelência técnica como exigência moral.*
