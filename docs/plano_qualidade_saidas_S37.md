# Plano — Qualidade das saídas (CV/carta) + Paridade da extensão + Score + Outlook

**Sessão 37 · 25/jul/2026 · responsável: Bruno (Tech Lead) · aprovação fase a fase: Marcos**

Gatilho: na vaga da Kapazi ("Analista de Marketing de Produto Pleno"), o CV do Senova saiu com
subtítulo **"Executivo de Marketing & Crescimento | CMO · CSO · CEO"** — nível de diretoria numa
vaga de analista — enquanto um CV feito à mão saiu calibrado ao nível da vaga, mais direto e
aproveitando informações adicionais. E a extensão mostrou **"18 · fora do perfil"**.

**Critério de pronto (a régua do Marcos):** a Sofia tem que gerar um CV tão bom ou melhor que o
feito à mão, calibrado ao nível real da vaga, aproveitando informação adicional — e melhorar com o
tempo. "Gerou um CV automático" não é pronto; **igualar/superar o feito à mão é o pronto.**

## Raiz única (auditada, com arquivo:linha)

O **nível da vaga nunca entrava na decisão** — nem no CV, nem no score — e o PDF tinha um subtítulo
C-level chumbado como último recurso:

| # | Onde | O quê |
|---|------|-------|
| 1 | `index.html` `montarPedidoCV` | chamava `ATS_SYSTEM(idioma, vagaTexto)` **sem** o 3º parâmetro `nivelVaga` |
| 2 | `index.html` `ATS_SYSTEM` | declarava `CARGO-ALVO: CMO / CSO / CEO / Diretor…` **fixo** — mandava mirar C-level sempre |
| 3 | `index.html` `_cvParaPDF` | fallback do subtítulo **chumbado em C-level** (o "smoking gun" — texto idêntico ao da Kapazi) |
| 4 | `senova-worker.js` prompt do score | trata "nível abaixo do porte" como impedimento e pesa a vida/porte tanto quanto o conteúdo → nota despenca por sobrequalificação |

Score do card e da extensão são a **mesma fonte** (`/api/analisar-vaga`) — não divergem. O "18" foi
o modelo pontuando na origem, não o teto (o teto só rebaixa *para* 45).

---

## FASE 1 — O CV enxerga o nível da vaga  ✅ IMPLEMENTADA (aguardando QA de Marcos)

**O que mudou (`index.html`):**
- `montarPedidoCV` agora deriva `nivelVaga` (do cargo, ou do título no topo da descrição) e passa a
  `ATS_SYSTEM(idioma, vagaTexto, nivelVaga)`. Os callers do card (Análise e regerar documento) e a
  ponte da extensão passam o `cargo`.
- `ATS_SYSTEM` troca o CARGO-ALVO fixo por um bloco **NÍVEL-ALVO + CALIBRAÇÃO**: subtítulo e resumo
  espelham o cargo/linguagem DESTA vaga; proíbe rótulo acima do nível ("desqualifica por
  sobrequalificação"); os FATOS não mudam, muda só o destaque. Numa vaga executiva de verdade, o
  nível-alvo continua sendo C-Level/Diretoria.
- `_cvParaPDF`: o fallback do subtítulo **nunca** é mais C-level chumbado — posiciona pela vaga
  (cargo), ou por área neutra e verdadeira quando não há cargo.

**Prova:** `testes/cv_nivel_calibra.js` (16 asserções, comportamentais + fiação), provado por
sabotagem (4 falhas limpas ao remover o 3º argumento). `cv_estrutura.js` atualizado para **guardar**
contra a regressão do C-level. Suíte completa verde (18 arquivos).

**Fora de escopo desta fase (registrado):** `_pdfCabecalhoCorpo` (linha ~10395) ainda tem o texto
C-level como fallback, mas é **código legado** — não está no caminho real do PDF (o render usa
`_cvParaPDF`/`_buildPDFExecDoc`); mexer nele só obrigaria a alterar o teste sem tocar em bug real.
Fica anotado para uma limpeza futura.

**QA que Marcos faz:** regerar o CV da Kapazi → o subtítulo tem que sair no nível da vaga (algo como
"Marketing de Produto | Lançamento, Portfólio e Inteligência de Mercado"), nunca "CMO · CSO · CEO".

---

## FASE 2 — Paridade card↔extensão + informações adicionais  ⏳ especificada

Objetivo: "tudo que o card faz, a extensão faz" — e dá para enriquecer o CV/carta pela extensão.

**Lacunas (com linha):**
1. **Campo de contexto na extensão.** O card injeta contexto ad-hoc (`ats-contexto` / `mv-ctx-ats`)
   como "Contexto desta rodada" no `montarPedidoCV`. A ponte `__senovaCopilotoGerarCV`
   (`index.html:~11028`) **não** recebe nem passa contexto, e o copiloto (`content.js`) **não tem
   campo** para digitar. → Adicionar campo no painel do copiloto + `__senovaCopilotoGerarCV(ref,
   formato, contexto)` + plumbing no `background.js`.
2. **Carta pela extensão — idioma fixo `'PT'`** (`index.html:~11069`) vs card `CARTA_SYSTEM(cvLang…)`.
   → usar `_idiomaDoPedido(desc)` (mesma decisão do CV). Vaga ES/EN passa a ter carta no idioma certo.
3. **Carta pela extensão — descrição cortada em 3000** (`index.html:~11065`) vs card com descrição
   inteira. → remover o `.slice(0,3000)`.
4. **Carta pela extensão — sem análise anterior nem contexto.** O card injeta `ANÁLISE ANTERIOR`
   (`v.atsAnalise`) + contexto (`index.html:8086-8088`); a extensão não. → espelhar.
5. **Calibração de nível na carta.** `CARTA_SYSTEM`/`EMAIL_ENVIO_SYSTEM` aceitam `nivelVaga` mas os
   callers passam `undefined`. → passar `nivelVaga` (como na Fase 1) e adicionar instrução curta de
   calibração (a carta herda o resumo executivo via `perfilFormatadoPara`, então precisa da mesma
   régua do CV).
6. **Aproveitar informação adicional.** O que o CV feito à mão "aproveitou fora do CV" já existe no
   Senova como `CTX_DEFAULT` (ctx_01…ctx_07: editorial, produção gráfica, ISO, ERP, IA/produto) e
   chega via `ctxBuscarRelevantes(desc)`. **Auditar** se `ctxBuscarRelevantes` casa bem numa vaga de
   produto (ex.: ctx_07 IA/SaaS/produto deve entrar) — ajustar a relevância se estiver deixando
   passar. (O filtro de experiências `filtrarExperienciasRelevantes` corta as 'operacionais' de
   portfólio a menos que a tag bata literal — avaliar se é aqui ou no CTX que o ganho do "feito à
   mão" mora.)

**Natureza:** fase mais pesada em código (toca `content.js` UI + `background.js` + `index.html`).
Cross-file. Testes: estender `cv_portao.js` (paridade do pedido inclui contexto e idioma da carta) +
teste novo do idioma da carta na extensão.

---

## FASE 3 — Score coerente ("sobe como viável, com ressalva")  ⏳ especificada · DECISÃO JÁ TOMADA

Decisão do Marcos: uma vaga de **conteúdo forte num nível abaixo** (ex.: Kapazi) deve **subir como
viável, com ressalva** — o score reflete o match de conteúdo, e a sobrequalificação vira alerta em
`pontos_atencao`, não veto.

**Onde (`senova-worker.js`, prompt de `/api/analisar-vaga`):**
- Linha ~2205: hoje "nível do trabalho abaixo do porte SEM nada que compense" é **impedimento**. →
  Reenquadrar: quando a ÁREA/conteúdo é forte match, sobrequalificação é **ressalva**
  (`pontos_atencao`), não impedimento eliminatório. Reservar impedimento para trabalho de fato alheio
  ao perfil (porta-a-porta, operação braçal, "consultor de vendas com carteira própria").
- Linha ~2211 PONTUAÇÃO: um match forte de conteúdo/área deve chegar a **CANDIDATO VIÁVEL** mesmo com
  senioridade abaixo do pico, com o gap de nível registrado em `pontos_atencao` — a senioridade
  abaixo do pico, sozinha, não pode arrasar a nota.

**Invariantes a preservar (S36):** impedimento REAL (idioma que não fala, presença física recusada,
< R$8k) continua com teto 45 em código (`TETO_SCORE_COM_IMPEDIMENTO`); sobrequalificação **não** é
impedimento eliminatório. Idioma DE→EN, piso salarial R$8k, projeto de vida — tudo intacto.

**Antes de codar:** reler `senova-worker.js` 2190-2260 inteiro para não quebrar os outros
invariantes. Deploy separado via `npx wrangler deploy`.
**QA:** re-scorar a Kapazi (e uma vaga que DEVE continuar baixa, ex.: porta-a-porta) e comparar.

---

## FASE 4 — Outlook (por último, como Marcos pediu)  ⏳ a auditar

Sintoma: e-mails estão sendo **arquivados na pasta do Senova no Outlook mesmo os que o Senova não
conseguiu ler**. → Auditar `/api/emails` no `senova-worker.js`: a classificação/movimentação só pode
mover e-mail efetivamente lido e classificado; e-mail ilegível/não classificado **não** é arquivado.
Fix isolado, sem misturar com a reforma do CV.

---

## Ordem e disciplina

Uma fase por vez: mostro o diff → Marcos aprova → push → Marcos testa no ar (Ctrl+Shift+R / recarrega
a extensão) → confirma → próxima. Nada vai ao ar sem o "ok" do Marcos. Backup do `index.html` salvo
antes de editar (`senova_v3_63_25jul2026.html`).
