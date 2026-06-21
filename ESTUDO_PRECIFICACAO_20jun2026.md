# ESTUDO — PRECIFICAÇÃO, ARQUITETURA DE ANÁLISE E UNIT ECONOMICS
*Insumo para o Business Plan do Senova · 20/jun/2026 · análise Opus 4.8 (Bruno) acatada por Marcos*

> Este documento consolida a decisão de **como o Senova analisa vagas** (arquitetura técnica),
> **quanto isso custa** (unit economics com preços reais de token) e **como precificar/empacotar**
> (planos, política de preço, tier missão). É a base da modelagem comercial do business plan.

---

## 1. PRINCÍPIO ARQUITETURAL — "processa uma vez, por intenção"

O erro estrutural que originava o bug do score (P1) era **reprocessar ao exibir**: caro E gera
divergência (cada chamada de IA não-determinística dá número diferente). Regra de ouro:

> **Cada análise roda uma vez, no momento certo, é gravada, e NUNCA recalcula só porque o card foi aberto.**

A aba/superfície de "Análise" vira **mural read-only** — só exibe o que está gravado. Processamento
só acontece **no card ou na página, sob intenção do usuário**.

---

## 2. OS TRÊS (NA VERDADE, QUATRO) SISTEMAS DE ANÁLISE — separados

Hoje estavam misturados no mesmo campo (`atsScore`), causando o P1. Devem ser **distintos**:

| # | Análise | O que mede | Endpoint | Quando roda | É número? |
|---|---|---|---|---|---|
| 1 | **Compatibilidade / Fit** | Quão alinhada a vaga está com **quem Marcos é e busca** (perfil, senioridade, momento) | `/api/analisar-vaga` | Na criação do card / on-demand | Sim (%) + bullets |
| 2 | **Análise ATS (do CV)** | O **documento** passa pelo filtro de palavra-chave do robô? Quais faltam? | `/api/claude` (prompt ATS) | Ao **decidir aplicar** | Sim |
| 3 | **Geração de CV** | CV otimizado para a vaga (multi-idioma PT/EN/ES) | `/api/claude` | **Só quando pedido** | Não (documento) |
| 4 | **Sofia (holística)** | A **pessoa inteira**: projeto de vida, valores, âncoras, fit cultural, perfil psicológico | `/api/sofia` | Construção de perfil + retorno de entrevista | **Não** (qualitativo) |

**Regra:** a Compatibilidade (#1) é o número autoritativo exibido no modal. O ATS (#2) **nunca** sobrescreve
o campo de Compatibilidade — guarda no campo próprio. Sofia (#4) não entrega número (skill_sofia.md).

Fundamento (VISAO_FUNDACIONAL): o ATS é a lógica *Eu-Isso* (pessoa reduzida a keyword) — usamos
pragmaticamente só quando o usuário decide enfrentar o filtro. A Compatibilidade e a Sofia são o
*Eu-Tu*, o coração do produto.

---

## 3. ALAVANCA DE CUSTO — *eager* vs *lazy* (resolve volume-vs-ferramentas)

O verdadeiro botão de custo NÃO é o modelo — é **quando/quanto se processa**:

- **Eager** — pré-scoreia todo o pipeline filtrado; permite **filtrar/ordenar por score na hora** (o "máximo"). Custo alto.
- **Lazy** — scoreia só quando o usuário **abre o card**. Custo baixíssimo.
- **Funil apertado** — só scorear o que passa região + senioridade. Controle de custo invisível.
- **Cache de perfil** (prompt caching) — perfil/CV/system são iguais em toda análise → entram como *cache read* (0,1×). Derruba o marginal ~45–90%.
- **`temperature: 0`** na Compatibilidade — consistência (acaba a divergência do P1) e de graça.

→ O "pipeline todo pré-scoreado e filtrável" é, ele mesmo, um **recurso premium** (eager), porque mapeia direto no custo.

---

## 4. PREÇOS REAIS DE TOKEN (fonte: skill claude-api, jun/2026)

Por 1M de tokens:

| Modelo | Input | Output | Cache write (1,25×) | Cache read (0,1×) |
|---|---|---|---|---|
| **Sonnet 4.6** | $3,00 | $15,00 | $3,75 | **$0,30** |
| Haiku 4.5 | $1,00 | $5,00 | $1,25 | $0,10 |
| Opus 4.8 | $5,00 | $25,00 | $6,25 | $0,50 |

**Estratégia de modelo:** Sonnet 4.6 + cache + temp0 na análise de decisão (Compatibilidade/ATS).
Haiku só em tier grátis/missão (triagem "boa o suficiente"). Opus reservado a Sofia aprofundada.
**Não rebaixar o modelo no sinal que o usuário age em cima** (ressalva do Bruno) — a economia vem de
volume (lazy/funil) e cache, nunca da qualidade da decisão.

---

## 5. UNIT ECONOMICS — custo por vaga (Sonnet 4.6 + cache + temp0)

Premissas (CV real de Marcos ≈ 1.500 tokens; perfil+CV+system cacheado ≈ 3.500–4.000 tokens):

| Componente | Tokens | Preço | Custo |
|---|---|---|---|
| Perfil/CV/system (cache read) | ~4.000 | $0,30/M | $0,0012 |
| Descrição da vaga (input fresco) | ~1.500 | $3,00/M | $0,0045 |
| Saída (score + bullets) | ~300 | $15,00/M | $0,0045 |
| **Total / vaga (cache quente)** | | | **≈ $0,01 (~R$0,05)** |

- **Eager** (pipeline filtrado, ~8–20 vagas/dia): ~R$13–33/mês/usuário.
- **Lazy** (scoreia só ao abrir, ~50–100 cards/mês): ~**R$3–6/mês/usuário**.

(USD→BRL ~5.)

---

## 6. PLANOS RECOMENDADOS

| Plano | Preço/mês | O que entrega | COGS IA | Margem IA |
|---|---|---|---|---|
| **Recomeço** (missão) | **Grátis 3 meses** p/ desempregado | Radar + score **on-demand** (lazy), CV 1×/mês | ~R$3–5 | investimento social + funil |
| **Essencial** | **R$ 29** | Radar completo, pipeline, score on-demand, ATS+CV 3×/mês, onboarding Sofia | ~R$8–12 | ~60% |
| **Profissional** | **R$ 59** | Tudo **eager** (pré-scoreado, filtrar/ordenar), ATS+CV **ilimitado multi-idioma**, Sofia coaching + entrevista | ~R$30 | ~50% |
| **Executivo** | **R$ 129** | Tudo + Sofia aprofundada (testes, projeto de vida), prioridade | ~R$40 | ~70% |

(Margens só de IA, antes de infra/pagamento/imposto.)

---

## 7. POLÍTICA DE PREÇO (decisões)

- **Diferenciar por FERRAMENTAS + eager/lazy, não por "número de buscas".** Cota de volume é mesquinha para executivo ("por que não vejo todos os meus matches?"). Ver todas as oportunidades é núcleo de todos os planos.
- **Âncora R$29–59 abaixo do LinkedIn Premium (~R$50–60 BR) e Catho.** Acessível sem vulgarizar.
- **Não vulgariza** porque há premium acima (ancora valor) e o grátis é **temporário e merecido** (desempregado), não free-for-all.
- **Tier Missão "Recomeço"** = VISAO_FUNDACIONAL na prática (tecnologia a favor da pessoa) **E** o melhor funil de escala: o desempregado é o usuário de maior intenção; recolocado, vira advogado e pagante. Custo baixo (lazy) permite ser generoso sem sangrar.

### Comparáveis de mercado (BR, referência)
- LinkedIn Premium Career: ~R$50–60/mês · Catho candidato: ~R$30–50/mês
- Coaching de carreira: R$300–500/hora · Outplacement corporativo: milhares (pago pela empresa)

---

## 8. PENDÊNCIAS / A DEFINIR NO BUSINESS PLAN
- Números reais do funil: quantas vagas/dia/usuário a varredura traz **após filtro**.
- Tamanho médio do perfil pós-onboarding Sofia (afeta o tamanho do bloco cacheado).
- Definir limites exatos de cada tier (ex.: CVs/mês no Essencial).
- Custo de infra (Worker, KV, Graph/Outlook) por usuário — somar ao COGS de IA.
- Modelo de comprovação do tier Missão (honra vs. comprovação leve).
- Multi-usuário (bloqueante para versão comercial — ver REVISAO_OPUS_17jun2026.md).

---

*Decisões deste estudo alimentam o Business Plan. Atualizar conforme números reais do funil e da operação.*
