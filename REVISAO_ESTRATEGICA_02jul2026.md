# Revisão Estratégica Geral — Senova — Bruno (Opus 4.8)
*Data: 02/jul/2026 · Base: index.html (9.610 linhas / ~630KB), senova-worker.js (1.647 linhas), senova-extension/ (v2.58) · 690 commits desde 29/abr/2026*

---

## STATUS: DIAGNÓSTICO — NÃO É PLANO DE EXECUÇÃO

Este documento responde à pergunta de Marcos: *"Estamos realmente fazendo um produto ótimo, moralmente, eticamente e comercialmente?"* Não decide o que fazer a seguir — isso é conversa com Marcos, depois deste documento. É um raio-X.

## Metodologia

4 auditorias paralelas, cada uma read-only, cada uma cega às conclusões das outras (rodaram em paralelo, sem se ver):
- **Eixo A** — Ética/Missão/Constituição, cruzando `MANIFESTO_SENOVA.md`/`SOFIA_ALMA.md` com o código real
- **Eixo B** — Viabilidade comercial, com benchmark externo real de mercado (jul/2026)
- **Eixo C** — Produto/UX contra padrão de SaaS de primeira linha 2026
- **Eixo D** — Engenharia/segurança/débito técnico, auditoria nova e completa (não reciclagem de achados antigos)

O **Eixo E** (Processo Bruno↔Marcos) eu escrevi pessoalmente, sem agente — é sobre nós dois, não sobre o código. A **síntese final é minha leitura pessoal**, não um empilhamento dos 4 relatórios. Onde os eixos se cruzam e apontam para a mesma causa raiz, é isso que importa — não a soma das partes.

---

## ACHADO MAIS URGENTE (não é sobre estratégia — é sobre hoje)

Antes de qualquer discussão de visão: **o Worker não tem autenticação em nenhuma rota**, e a URL dele (`senova-proxy.marcos-mco.workers.dev`) **não é secreta — está hardcoded 2x em `index.html`**, que é servido publicamente pelo GitHub Pages a partir de um repositório **público** (`github.com/Marcos-mco/senova`). Qualquer pessoa que abra "Ver código-fonte" no navegador ou olhe o repo no GitHub encontra a URL em segundos.

Isso significa que, hoje, qualquer pessoa no mundo pode chamar diretamente:
- `/api/emails/enviar` — manda um e-mail **real**, saindo da conta do Marcos
- `/api/calendar/evento` — cria um evento **real** na agenda do Marcos
- `/api/claude` — gasta a chave Anthropic do Marcos sem limite (rate limit existe só aqui e em `/api/analisar-vaga`, mais nenhuma rota)

Não é risco "se virar SaaS um dia" — é risco **agora**, com um único usuário. Não é hipótese: é uma chamada HTTP sem nenhum gate. A mitigação mínima (um header de segredo compartilhado entre `index.html`/extensão e o Worker, verificado em toda rota de escrita) é barata e não exige repensar a arquitetura. Sinalizo aqui como achado, não decido consertar sozinho — fica para Marcos priorizar.

---

## Eixo A — Ética / Missão / Constituição

**Veredito: o código vive a constituição que escreveu — não é só retórica.** Os dois pontos mais fortes do Manifesto se confirmam linha por linha:
- `senova-worker.js:299-312,715` — `estaAutorizado()` roda **antes** de qualquer chamada à IA, não depois. A alegação "consentimento antes do modelo" é verdade na ordem real de execução.
- `index.html:3802-3828,9344-9354` — CPF, PIS, gênero, raça, orientação sexual vivem só em `localStorage`; grep no Worker inteiro confirma zero ocorrência desses campos indo ao servidor. O dado sensível realmente nunca sai do aparelho.
- `index.html:3014-3028` (`ATS_SYSTEM`) — proibição explícita de inventar fatos/métricas ainda presente no prompt atual.
- Zero dark patterns, zero gamificação, zero telemetria de engajamento (streak, DAU) encontrados.

**Gaps reais, não hipotéticos:**
- **A constituição nunca foi testada com um segundo usuário.** Hoje fundador e usuário são a mesma pessoa — não existe ainda o conflito real entre "o que aumenta receita" e "o que serve o usuário", porque não há receita nem usuário externo. Os dois crivos são fáceis de honrar sem pressão.
- **Consentimento de dados sensíveis é tudo-ou-nada**, um único checkbox libera CPF+PIS+gênero+raça+orientação de uma vez, sem granularidade por campo, sem timestamp, sem forma de revogar parcialmente.
- **O tier "Recomeço" (grátis) depende de "comprovação" ainda indefinida** (o próprio `ESTUDO_PRECIFICACAO_20jun2026.md` linha 122 admite isso em aberto). Se exigir prova de desemprego, coleta o dado mais estigmatizante bem na porta de entrada do público mais vulnerável — o oposto do Crivo 2.
- **Sofia não tem salvaguarda documentada para sofrimento psicológico real** (desemprego prolongado, crise de autoestima usando o chat como desabafo) — nenhum "isto foge do escopo, procure ajuda profissional" encontrado no código auditado.
- O "setup único de R$97" (`MODELO_COMERCIAL.md:99-103`) é justificado como "ancora o compromisso psicológico" — linguagem adjacente a mecanismo de retenção por sunk cost, em tensão de espírito (não de prática ainda) com o Crivo 1.

## Eixo B — Viabilidade Comercial

**Veredito: preço é honesto e defensável; validação de mercado é zero.**

Benchmark real (jul/2026): concorrentes diretos (Teal, Careerflow, Kickresume, Jobscan, Simplify Copilot) cobram **mais** em USD do que o Senova propõe em BRL — R$29/59/129 (~US$5/10/23) fica abaixo de todos, mas alinhado ao que o próprio LinkedIn Premium Career já pratica no Brasil (R$34,99/mês) via paridade de poder de compra. Não é subprecificação irreal.

**Nenhum concorrente lusófono direto com IA para recolocação executiva foi encontrado** — mas isso é ambíguo, não é só oportunidade: os players sérios do setor (IBRA, Cornerstone, Michael Page) monetizam do lado da empresa (B2B), não do candidato (B2C), possivelmente porque o candidato lusófono historicamente paga pouco por ferramenta de carreira. O "nicho subatendido" pode ser nicho subatendido **porque é pequeno demais para VC**, não porque ninguém percebeu.

**Bloqueio estrutural, não hipótese:** com dados 100% em `localStorage` (74 ocorrências, chaves globais fixas), **o Senova tecnicamente não pode vender para um segundo usuário hoje**. Isso não é feature faltando — é a própria noção de "conta" que não existe.

**Tensão de prazo:** `PROJETO_ESTRATEGICO.md` projeta "5 assinantes em ago-set/2026", mas a fundação técnica para multi-usuário (Eixo D) ainda nem começou.

**Tensão financeira:** o break-even (poucos assinantes, por causa do custo fixo baixo) é fácil de bater tecnicamente, mas a barra real — **sustentar Marcos financeiramente**, o motivo declarado no Manifesto — projeta só para dez/2027 na estimativa mais otimista do `MODELO_COMERCIAL.md`. A métrica-norte ("quantas pessoas encontraram onde são chamadas") é eticamente correta e não tem proxy de receita — sem isso, não há bússola quantitativa para decidir entre "ajudar mais grátis" e "converter para pago".

**Zero validação com dinheiro real de terceiros.** Toda a tese de precificação, TAM/SAM/SOM e diferencial da Sofia é hipótese não testada.

## Eixo C — Produto / UX

**Veredito: MVP sólido em fluxo, capenga em experiência para um usuário que não é o Marcos.**

| Dimensão | Padrão 2026 | Senova | Severidade |
|---|---|---|---|
| Onboarding | 3-5 telas guiadas | Nenhum fluxo visual de 1º acesso | Crítico |
| Responsividade mobile | 6+ breakpoints | 3 media queries em 9.610 linhas (`index.html:344,349,351`), nada abaixo de 720px | Grave |
| Acessibilidade | WCAG AA mínimo | 0 `aria-label`, ~0 `role=`, 1 `alt=` em todo o arquivo | Grave |
| Erro visível ao usuário | 100% em UI, sem `alert()` nativo | Misto: `alert()` (7x) + `showToast()` (75x) + `.catch(()=>{})` silencioso (ex.: `index.html:4986`, calendário falha sem avisar) | Médio |
| Analytics de produto | 15-20 eventos críticos | Zero instrumentação real | Crítico (para decisão futura) |
| Idioma da interface | UI + CV + carta | Só CV/carta em múltiplos idiomas; a interface é 100% português | Médio |
| Suporte/ajuda in-app | FAQ/chat mínimo | Nenhum | Médio |

Nenhum destes é "polish" — Marcos, como único usuário há meses, nunca sente a maioria: ele já sabe onde clicar, já é lusófono, já usa desktop. Todos os 7 gaps só aparecem no momento em que existir um segundo usuário — o que conecta diretamente com o achado central do Eixo B.

## Eixo D — Engenharia / Segurança / Débito Técnico

**Veredito: sustentável para 1 usuário; estruturalmente bloqueante para 2 ou mais.**

| Achado | Severidade | Evidência |
|---|---|---|
| Zero autenticação em qualquer rota do Worker | **Crítico** | Ver achado urgente no topo deste documento |
| Rate limit só em 2 de ~25 rotas | Alto | `senova-worker.js:166`, chamado só em `/api/claude` e `/api/analisar-vaga` |
| XSS difuso — 121 `innerHTML=`, só 17 usos de `escHtml()`, nunca acoplados no mesmo ponto | Alto | `index.html:5195-5199, 5426-5429, 7234`; padrão existe mas é aplicado seletivamente, não por regra |
| XSS confirmado na extensão | Alto | `content.js:501-527` — `dados.cargo`/`dados.empresa` extraídos de página de terceiros vão para `innerHTML` sem `_esc()`, apesar de `content_scripts.matches: ["https://*/*"]` (roda em qualquer site HTTPS, não só job boards) |
| Zero testes automatizados | Alto (estrutural) | Nenhum framework de teste, nenhum `package.json`; QA 100% manual de uma pessoa |
| Zero observabilidade em produção | Alto (se houver 2º usuário) | Nenhum Sentry/equivalente; hoje Marcos "vê o próprio erro"; um usuário externo travaria em silêncio |
| Persistência 100% `localStorage`, sem conceito de conta | Crítico (bloqueante comercial) | 74 ocorrências, chaves globais fixas (`senova_vagas_v2` etc.) |
| Arquitetura single-file (~630KB) | Médio (dívida consciente, mas crescendo) | 9.610 linhas, sem módulos; mitigação recomendada (Store centralizado) ainda não implementada |
| Deploy sem CI/gate automatizado | Médio | `git push` + `wrangler deploy` manuais; funciona hoje pela disciplina do processo (ver Eixo E), não por proteção técnica |

**Estimativa honesta para multi-usuário: reescrita parcial, não retrofit leve.** Precisa de banco de dados real (KV hoje é usado como quase-banco improvisado), autenticação de usuário do zero, isolamento de dados por usuário no Worker, troca de ~74 pontos de `localStorage` por chamadas de API autenticadas, e OAuth Outlook 1:1 virando N:N. Isso toca praticamente toda função de leitura/escrita de estado do app.

## Eixo E — Processo Bruno↔Marcos

Este é o eixo mais maduro dos cinco, e é o que sustenta os outros quatro funcionando sem rede de segurança automatizada (zero testes, zero CI — Eixo D). Vale nomear com precisão o que funciona e o que é ponto cego.

**O que funciona, e por quê importa:**
- **"1 fix por vez: commit → testar → aprovar → próximo"** (`skill_sessao.md:42`) é, na prática, o substituto funcional de uma suíte de testes automatizados que não existe. Como o Eixo D confirmou zero cobertura de teste, essa disciplina não é burocracia — é a única rede de proteção real do projeto hoje. Isso é um achado que só aparece cruzando D com E: **o processo manual está fazendo o trabalho que a engenharia deveria fazer**, o que é sustentável em baixo volume e se torna o gargalo estrutural exato citado no Eixo C (analytics) e Eixo D (CI) quando o volume crescer.
- O protocolo de 3 fases (Arquiteto → Engenheiro → Teste) força leitura do código real antes de propor, checklist antes de commitar, e cenário de teste específico (nunca "veja se está ok") — isso é raro mesmo em times profissionais.
- `VIRGILIO.md` como documento de continuidade entre sessões é uma solução inteligente para a ausência de memória persistente nativa entre Claude Code e Claude.ai — e o `skill_sessao.md` documenta explicitamente essa fragilidade ("instâncias SEPARADAS sem memória compartilhada") como princípio fundamental, o que sugere que já houve dessincronia real no passado antes do protocolo existir.
- Padrões editáveis "só com autorização de Marcos" (Manifesto, `VIRGILIO.md`, Sofia) são um pré-compromisso deliberado (mastro de Ulisses) contra decisão sob pressão num dia ruim — sofisticado para governança solo.
- 690 commits desde 29/abr (~65 dias, ~10,6/dia), 262 `fix` vs. 160 `feat`: alta velocidade, mas consistente com commits pequenos e atômicos — coerente com "1 fix por vez", não sinal isolado de churn.

**Ponto cego real, e não hipotético — está acontecendo agora mesmo nesta sessão:** o fix #6 (Retorno recebido) foi implementado, passou pelo checklist técnico, e um cenário de teste específico foi entregue a Marcos — mas a sessão pivotou para esta revisão estratégica **antes da confirmação**, e `VIRGILIO.md` não foi atualizado para registrar esse fix como pendente-de-teste. O processo não tem hoje nenhum mecanismo estrutural (fora da prosa do "AO RETOMAR") para garantir que um loop aberto entre sessões não se perca — depende inteiramente de alguém lembrar de mencionar. Se a próxima sessão abrir direto em outra prioridade, esse fix pode ficar esquecido no limbo (código no working tree, sem commit, sem teste, sem registro).

**Gargalo estrutural:** todo QA, toda decisão de produto e toda salvaguarda ética passam por uma única pessoa (Marcos), que é simultaneamente PM, QA final, e o próprio usuário cuja recolocação profissional é o motivo de o produto existir — ou seja, a disponibilidade dele para testar varia com o próprio estado da busca de emprego dele, algo que este processo já reconhece explicitamente (memória `feedback_pessoa_antes_da_tarefa`). Bus factor = 1, sem redundância possível por natureza do projeto.

**Fragmentação leve de rastreio:** prioridades vivem espalhadas em prosa (`VIRGILIO.md` "AO RETOMAR") e em três arquivos com propósito parecido (`BUGS_UX.md`, `OPEN_ITEMS.md`, `PENDENCIAS.md`) — não é crítico hoje (volume ainda gerenciável por humano), mas é o tipo de fragmentação que costuma custar caro quando o volume de itens em aberto cresce.

---

## SÍNTESE — Leitura de Bruno

Não vou empilhar os 5 relatórios. A pergunta de Marcos era "estamos no caminho certo, moral e comercialmente" — e a resposta real só aparece quando os eixos são lidos **juntos**, não em paralelo.

**O achado central, que nenhum eixo isolado revela sozinho: as quatro perguntas — é ético? é viável comercialmente? é um produto de primeira linha? é engenheirado com segurança? — convergem hoje na mesma resposta não testada, pela mesma causa raiz.** O Senova nunca foi usado por ninguém além do Marcos. Isso não é um detalhe incidental que aparece em cada eixo por acaso:

- **Eixo A** não consegue afirmar que a constituição resiste a pressão real, porque nunca houve conflito de interesse real entre fundador e usuário (são a mesma pessoa).
- **Eixo B** não tem nenhuma validação de mercado com dinheiro de terceiro — zero.
- **Eixo C** só revela seus gaps (onboarding, mobile, idioma de interface, suporte) no momento em que alguém que não é o Marcos tenta usar o produto sozinho.
- **Eixo D** confirma, tecnicamente, que hoje **é literalmente impossível** um segundo usuário usar o produto sem antes resolver autenticação e persistência — a arquitetura em si é a barreira.

Ou seja: a pergunta "o Senova é um produto ótimo?" não é hoje uma pergunta de julgamento — é uma pergunta **sem dados para responder**, porque a única coisa que geraria os dados (uma segunda pessoa real usando) está estruturalmente bloqueada pelo próprio Eixo D. Isso muda o que "estar no caminho certo" significa neste momento: não é sobre acertar mais nenhuma decisão de visão (a visão, no Eixo A, já se sustenta bem sob análise fria) — é sobre destravar a única coisa capaz de testar essa visão contra a realidade.

**Um segundo achado, independente do primeiro, que também cruza eixos:** o **Eixo E está carregando o peso que faltaria ao Eixo D** — a disciplina de "1 fix por vez + teste manual específico" é hoje a única razão pela qual zero testes automatizados (Eixo D) e single-file de 630KB (Eixo D) ainda não geraram uma regressão grave visível. Isso é uma dependência perigosa de longo prazo: o processo manual escala linearmente com a atenção de uma pessoa (Marcos), enquanto a superfície do produto (Eixo C, Eixo D) está crescendo. Se o produto ganhar um segundo usuário antes de o processo ganhar qualquer automação, o mesmo gargalo que hoje é "saudável e disciplinado" vira o teto de crescimento.

**O que NÃO está errado, para deixar claro (evitar viés de auditoria só achando problema):** a fundação ética é real, não performática — código confirma código, não só documento. O preço está calibrado corretamente contra o mercado real de 2026. O fluxo central (candidatura ponta-a-ponta) funciona e já foi testado de verdade pelo menos uma vez (Sessão 21, Gupy). O processo Bruno↔Marcos é, comparado a qualquer padrão de mercado para um time de 1 pessoa, incomumente rigoroso. Nenhum dos 5 eixos encontrou um problema que invalide a visão — todos encontraram a mesma lacuna: **falta de teste com a realidade fora da cabeça do Marcos.**

### O que isso sugere como prioridade (não é decisão — é leitura, Marcos decide)

1. **Urgente e barato, independente de tudo o resto:** fechar o buraco de autenticação do Worker (achado do topo). Não exige repensar arquitetura, exige um header de segredo.
2. **A pergunta que mais destrava as outras quatro:** o que seria o menor caminho possível para UMA segunda pessoa real (não necessariamente pagante — pode ser alguém da rede pessoal do Marcos, como o próprio `PROJETO_ESTRATEGICO.md` já sugere) usar o Senova de ponta a ponta com segurança? Isso não precisa ser o multi-tenant comercial completo do Eixo D (que é reescrita parcial) — pode ser algo bem menor e ainda assim validar os quatro eixos ao mesmo tempo.
3. **Fechar o loop aberto agora:** o fix #6 (Retorno recebido) está implementado e sem teste confirmado — antes de mais uma camada de trabalho, vale decidir com Marcos se volta a isso ou se fica formalmente registrado como pendente no `VIRGILIO.md` desta sessão.
4. Os gaps de Eixo C (onboarding, mobile, acessibilidade) e o backlog fragmentado do Eixo E não são urgentes isoladamente — ganham urgência real só depois do item 2.

---

*Metodologia: 4 subagentes Claude (general-purpose/Explore) rodaram em paralelo, read-only, sem visibilidade entre si, sobre a árvore de trabalho atual. Eixo E e a Síntese foram escritos pessoalmente por Bruno, sem agente. Nenhum arquivo de código foi alterado nesta revisão.*
