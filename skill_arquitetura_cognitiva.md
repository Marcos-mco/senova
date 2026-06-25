# skill_arquitetura_cognitiva — Arquitetura de Informação, Carga Cognitiva, Comunicação Homem-Máquina e Ética do Design

Versão: 2.0 · Criado: 25/jun/2026 · Fundamentado em estado da arte (psicologia cognitiva,
HCI e design ético 2022–2025) + a alma do Senova (`SOFIA_ALMA.md`, espírito do Opus Dei).
A camada **acima** de `skill_design_senova` (pixel) e `skill_ux_writing` (palavra): **como a
informação é estruturada para a mente processar — e como a tecnologia serve a pessoa sem manipulá-la.**

> **QUANDO USAR — obrigatório antes de:** desenhar/refatorar qualquer tela, card, modal ou
> fluxo; decidir ordem de elementos; criar um controle; decidir o que é automático vs sob demanda;
> escrever qualquer prompt de IA voltado ao usuário. Não é estética — é cognição e ética.

---

## 0. A TESE CENTRAL — a convergência

A psicologia cognitiva é neutra: pode **servir** (reduzir carga, dar clareza, devolver controle)
ou **manipular** (dark patterns, explorar vieses, prender atenção). **O que decide qual é a
dignidade da pessoa.** No Senova, sempre servir.

> A moral cristã e a HCI moderna **dizem a mesma coisa por caminhos diferentes**:
> a *verdade* (virtude / `SOFIA_ALMA`) é o *anti-dark-pattern* (DSA Art. 25). A *caridade ao
> vulnerável* é o *design para estresse agudo* (COGA + Bandura). A *subsidiariedade* (DSI) é a
> *regra de corte da automação*. A *liberdade* (agência) é a *autoeficácia* (Bandura).
> Quando moral e técnica convergem, não há licença para violar nenhuma.

---

## 1. A PERSONA PRIMÁRIA — o usuário em estresse agudo

A maioria dos guias de UX assume um usuário neutro, descansado, racional. **O usuário do Senova é
o oposto:** executivo 30+ vindo de demissão — pressão, tempo escasso, ego/identidade ferida, luto.

**Regra-mãe:** trate o estresse da recolocação como uma **deficiência cognitiva temporária**
(ponte W3C-COGA + Bandura). O design que serve quem está sob estresse serve a todos.

Consequências diretas (estado da arte, Eixo 1):
- **Sistema 1 domina** (Kahneman): o usuário chega reativo, com pouca energia para análise. → o
  caminho padrão tem de ser **seguro para quem não está pensando devagar**.
- **Memória de trabalho ≈ 4±1 chunks** (Cowan; o "7±2" de Miller é o teto antigo) — e **cai sob
  estresse**. → nunca mais de ~4 elementos de decisão por tela.
- **Autoeficácia ferida** (Bandura): a demissão é perda aguda de controle. → o design tem o dever
  de **devolver senso de controle e gerar pequenas vitórias reais**.

---

## 2. PRINCÍPIO RAIZ — a tela segue o raciocínio, não o banco de dados

Toda tarefa tem uma **sequência cognitiva natural**. A tela a espelha na ordem em que a mente a
percorre. Para candidatura:

```
   ENTENDER  →  JULGAR  →  AGIR
  (a vaga)    (vale?)   (gerar docs / enviar)
```

Inverter (ex.: Documentos antes da Descrição) força a mente a voltar atrás — **atrito puro**.
A ordem no DOM/flex **é** decisão de arquitetura, não de CSS. Antes de posicionar qualquer seção:
*em que passo do raciocínio ela entra?*

---

## 3. ARQUITETURA DA INFORMAÇÃO

- **Hierarquia:** uma informação primária por bloco. Se tudo é destaque, nada é.
- **Agrupamento (Gestalt/proximidade):** o relacionado fica junto e separado do resto.
- **Sequência = raciocínio** (§2).
- **Rótulo honesto:** o nome do bloco/botão descreve exatamente o que é/faz. Aba "CV" mostra o CV
  — nunca a análise. Botão "Gerar CV" gera o CV.
- **Fonte única:** cada informação aparece **uma vez**. Duplicar é carga extrínseca + dúvida.

---

## 4. CARGA COGNITIVA — leis operacionais

**Os três tipos (Sweller/Cowan):** *intrínseca* (dificuldade real da tarefa), *extrínseca*
(imposta pela forma de apresentar) e *germânica* (esforço útil de aprender o próprio processo).
→ **A UI só tem licença de cortar a extrínseca e deve PROTEGER a germânica.** Crivo de cada
elemento: *é tarefa real, aprendizado útil, ou ruído?* O ruído sai.

| Lei | O que diz | Regra Senova |
|---|---|---|
| **Hick** | mais opções = decisão mais lenta | uma ação primária por tela; secundárias subordinadas |
| **Cowan (~4)** | memória de trabalho ≈ 4, cai sob estresse | ≤4 decisões/tela; chunking em blocos de 3–4 |
| **Progressive disclosure** | revele complexidade só quando pedida | "Dados da vaga" sob demanda; documento só ao clicar |
| **Reconhecimento > recordação** | mostrar > fazer lembrar | estado sempre visível, nunca na memória do usuário |
| **Jakob** | espera-se funcionar como apps conhecidos | Kanban/e-mail/calendário em padrões óbvios; não reinventar p/ público 30+ |
| **Peak-End (Kahneman)** | lembra-se do pico e do fim | caprichar no encerramento de cada fluxo e nos momentos emocionais (receber análise, registrar entrevista, declinar) |

**Fadiga de decisão é cumulativa.** O produto decide o operacional *por* ele (pré-preenche,
ordena por relevância, sugere a próxima ação) **marcando o que é sugestão** — reduz o número de
decisões, nunca a qualidade nem a agência. Uma "próxima ação recomendada" por tela, não um leque.

---

## 5. COMUNICAÇÃO HOMEM-MÁQUINA

Base: 10 heurísticas de Nielsen + camadas modernas + dois mandamentos do Senova.

### Os dois mandamentos (inegociáveis)
1. **AGÊNCIA — nada acontece sem o usuário pedir.** Leitura/análise pode ser automática;
   **gerar artefato (CV, carta, e-mail) exige comando explícito.** Gerar sem pedir viola o modelo
   mental ("eu não pedi isso") e queima recurso sem consentimento. *Nunca auto-submit.*
2. **FEEDBACK HONESTO — a interface nunca finge.** Só diz "✓ baixado" se o arquivo chegou ao
   disco; "salvo" só se persistiu. Sucesso de botão que não reflete o efeito real é **mentira ao
   usuário** — proibido. (*"A caridade sem verdade é sentimentalismo"* — SOFIA_ALMA.)

### Affordance correta
O controle *parece* o que faz. **Verbo de ação** ("Gerar CV", "Enviar Candidatura") nunca se
confunde com **rótulo de estado** ("CV Enviado"). Ambiguidade = falha de affordance.

### Calm Technology (Amber Case / Calm Tech Institute)
"A tarefa da pessoa é ser humana, não computar." → notificações só quando **acionáveis e
relevantes**; **zero badges ansiogênicos**, contadores de pressão ou streaks; o produto pode ser
**fechado sem culpa** (sem "você sumiu há 3 dias"). Para o ansioso, calma é função, não estética.

### Calibração de confiança da IA (trust calibration — pesquisa 2024–25)
Explicar **não basta** e pode gerar **excesso de confiança** (automation bias). → a IA (Sofia)
**declara incerteza** ("estimativa baseada em X; confira antes de enviar"), **nunca fala com
autoridade falsa**, e o que é **sugestão da IA** é visualmente distinto do que é **fato/dado
confirmado**. Como o tema é a carreira do usuário, calibrar para a conferência é mais ético que impressionar.

---

## 6. DARK PATTERNS — proibidos por norma E por moral

A *verdade* (SOFIA_ALMA) e a regulação (UE DSA Art. 25; FTC) convergem. As **5 estratégias a
PROIBIR explicitamente** (ontologia Gray, Santos & Bielova, CHI 2024):

| Padrão proibido | No Senova significa |
|---|---|
| **Nagging** (insistência repetida) | Sofia não repete pedido recusado; "talvez depois" é definitivo |
| **Obstruction** (dificultar saída) | cancelar conta / exportar dados / declinar vaga têm os **mesmos cliques** que entrar/aceitar |
| **Sneaking** (esconder custo/ação) | nenhum envio, compartilhamento ou cobrança sem revelação prévia explícita |
| **Interface Interference** (empurrar p/ opção do negócio) | "Não, obrigado" tem o **mesmo peso visual** que "Sim"; nunca confirmshaming |
| **Forced Action** (forçar p/ liberar função) | nada de "convide 3 amigos" ou perfil 100% obrigatório p/ usar o essencial |

**TESTE DE MANIPULAÇÃO — gate de QA (DSA Art. 25):** toda tela nova responde a três perguntas.
Qualquer **"sim"** reprova o design:
> **1. Isto engana?  2. Isto manipula?  3. Isto distorce a escolha livre?**

---

## 7. FUNDAMENTO MORAL — dignidade, vocação, liberdade, verdade, caridade

Ancorado em `SOFIA_ALMA.md` e no magistério recente (*Antiqua et Nova*, DDF/Vaticano, jan/2025).

- **Dignidade da pessoa** (*Antiqua et Nova*: a IA serve "o valor supremo da dignidade humana", não
  a substitui). → o usuário **nunca** é "lead", "dado" ou "conversão" — nem na UI, nem na linguagem
  interna. Scoring avalia a **adequação a uma vaga** (reversível, explicável), nunca rotula a pessoa.
- **Santificar o trabalho ordinário** (São Josemaría, *É Cristo que Passa*, "Na oficina de José").
  Dupla aplicação: **(a)** o produto ajuda o usuário a apresentar seu trabalho com **excelência e
  retidão** — CV honesto e excelente, jamais inflado; **(b)** o **próprio código/UI do Senova** é
  feito com o mesmo zelo — sem bug negligenciado, sem "depois eu arrumo", microcópia revisada.
  *Excelência técnica é exigência moral, não vaidade* (vincula `skill_qa`).
- **Liberdade / agência** (a IA não deve "deskill" nem reduzir o discernimento — *Antiqua et Nova*).
  → automação **amplia** a capacidade (rascunha o que ele edita), **nunca substitui** a vontade.
  *app = cérebro, extensão = braço, mas a vontade é sempre do humano.*
- **Veracidade** (*Antiqua et Nova* condena usar IA para enganar; "apresentar IA como pessoa erode a
  confiança social"). → Sofia **sempre se identifica como IA**, nunca finge ser humana; zero métrica
  inflada, elogio falso ou urgência fabricada ("3 pessoas vendo esta vaga"). Mesmo princípio do §6.
- **Caridade ao vulnerável** (caridade teologal; *Antiqua et Nova*: não simular conexão humana para
  substituí-la). → Sofia **acompanha mas reconhece limites**: diante de sofrimento agudo, aponta
  apoio humano real (rede, mentor, profissional) — não se faz de terapeuta nem cria dependência.

### Virtudes traduzidas em UI (cardeais + teologais)
| Virtude | Decisão de interface |
|---|---|
| **Prudência** | defaults conservadores; confirmar o irreversível; expressar incerteza (§5) |
| **Justiça** | sair custa o mesmo que entrar; sem letra miúda (§6) |
| **Fortaleza** | desenhar p/ resiliência: pequenas vitórias; encorajar sem mentir (§9) |
| **Temperança** | calm tech: não explorar atenção; sem mecânica viciante (§5, §10) |
| **Esperança** | mostrar progresso e caminho realista — nem otimismo falso, nem desespero |
| **Caridade** | prioridade ao vulnerável; Sofia serve, não captura |
| **Fé / Verdade** | transparência radical sobre o que é IA, dado e estimativa |

---

## 8. SUBSIDIARIEDADE — o que NUNCA automatizar (regra de corte)

A maioria dos guias diz "automatize para reduzir carga". O Senova precisa da regra **inversa e
explícita** (Doutrina Social; *Antiqua et Nova*: "a responsabilidade pelo bem-estar nunca deve ser
delegada à IA"):

> **Automatizar:** o operacional — organizar, lembrar, ordenar, rascunhar.
> **NUNCA automatizar:** o deliberativo e pessoal — aceitar uma proposta, definir como se
> apresentar, escolher um caminho de carreira.
> **Corte:** se a decisão diz respeito à **identidade ou ao futuro** da pessoa → a IA *prepara*,
> o humano *decide*.

Fundamento duplo: moral (DSI) + funcional (preserva a autoeficácia, §9).

---

## 9. AUTOEFICÁCIA — desenhar para pequenas vitórias

As 4 fontes de autoeficácia (Bandura); a mais forte é a **experiência de domínio** (vitórias
reais). Em luto, a *coping self-efficacy* prediz recuperação.

→ **Regra:** o onboarding e a Home abrem com a primeira tarefa que **termina em ~2 min e mostra
resultado concreto** ("seu CV passou de X para Y"), não com "perfil 0% completo" (que sinaliza
falta e desanima). Progresso real **>** barra de completude/gamificação. A persuasão (2ª fonte)
deve ser **verdadeira** — elogio inflado destrói confiança e viola §6/§7.

---

## 10. MÉTRICA-NORTE — anti-engajamento (Humane Design)

Center for Humane Technology: projetar para o **florescimento**, não para a atenção.

> **Sucesso do Senova = usuário recolocado e FORA do produto.** Métrica-norte: tempo até a primeira
> entrevista / recolocação — **nunca** tempo de tela ou engajamento diário.

Isto **bloqueia por design** qualquer pressão futura para inserir dark patterns de retenção: se a
métrica é o sucesso do usuário, prender atenção é contraproducente, não tentação.

---

## 11. O CRIVO — checklist de validação de qualquer tela

Antes de aprovar um desenho, responda **sim** a todas:
1. A **sequência** segue o raciocínio (entender → julgar → agir)?
2. Cada elemento é necessário **agora**? (senão → progressive disclosure ou remover)
3. Há **duplicação** de informação? (eliminar)
4. Cada controle comunica **sem ambiguidade** o que faz e o estado atual?
5. Algo é **executado sem o usuário pedir**? (só leitura/análise pode; geração não)
6. O **feedback é honesto** — reflete o efeito real?
7. Quantas **decisões** a tela exige de uma vez? (≤4 — Hick/Cowan)
8. O usuário consegue **desfazer/corrigir**?
9. O **tom** (ícones, palavras) condiz com competência sóbria? (zero jovialidade)
10. **Teste de manipulação (§6):** engana? manipula? distorce a escolha? (qualquer "sim" reprova)
11. A IA **declara incerteza** e separa **sugestão de fato**? (§5)
12. Funciona para o usuário em **estresse agudo / Sistema 1**? (§1)
13. Esta automação respeita a **subsidiariedade** (§8)?

---

## 12. ANTI-PADRÕES (todos foram erros reais — não repetir)

| Anti-padrão | Por que dói | Correto |
|---|---|---|
| Ordem fora do raciocínio (docs antes da vaga) | obriga a mente a voltar atrás | entender → julgar → agir |
| Ação sem solicitação (CV gerado sozinho) | quebra agência (§5, §7) | geração só por comando |
| Controle ambíguo ("Já me candidatei") | falha de affordance | verbo de ação OU rótulo de estado |
| Informação duplicada (vaga repetida) | carga extrínseca + dúvida | fonte única |
| Feedback desonesto ("✓ baixado" sem baixar) | destrói confiança; viola verdade | estado real verificado |
| Tom infantil (🏆) para executivo | quebra registro/credibilidade | sobriedade |
| Rótulo que mente (aba "CV" exibe análise) | viola modelo mental | rótulo = conteúdo |
| Barra "0% completo" no onboarding | sinaliza falta; fere autoeficácia | pequena vitória real primeiro |
| IA com autoridade falsa | over-reliance; risco na carreira | declarar incerteza |

---

## 13. HIERARQUIA ENTRE SKILLS

```
skill_arquitetura_cognitiva  ← cognição + ética (ESTE — primeiro crivo)
        ↓ informa
skill_fluxo / skill_produto  ← processo e regras de negócio
        ↓ informa
skill_ux_writing             ← a palavra (microcopy, labels)
        ↓ informa
skill_design_senova          ← o pixel (cor, fonte, componente)
```
Conflito entre camadas → **a de cima vence.** Um botão lindo (design) e bem escrito (writing) ainda
está **errado** se viola a arquitetura cognitiva (ambíguo, fora de ordem, executa sem pedir, manipula).

---

## 14. EXEMPLO CANÔNICO — card de Oportunidade (candidatura)

```
DESCRIÇÃO DA VAGA      ← ENTENDER (topo; texto formatado; fonte única)
COMPATIBILIDADE        ← JULGAR (automática: SÓ score + veredicto; é leitura, não artefato)
DOCUMENTOS             ← AGIR (sob demanda: [Gerar CV][Gerar carta][Gerar resposta])
+ Dados da vaga        ← detalhe secundário (progressive disclosure)
```
- Automático = só o JULGAR (análise/score). AGIR (gerar documento) = só por comando (§5 mand. 1).
- "PDF Executivo", não "Premium"; sem ícones infantis (§1, §12).
- Card = fonte de verdade; o que gera fica salvo e visível, sem duplicar nem reprocessar.
- Sofia, ao analisar, declara incerteza e nunca infla o score (§5, §7 — SOFIA_ALMA).

---

## FONTES (verificadas; rigor sinalizado onde há dúvida)

**Cognição:** Cognitive Load Theory (Sweller/Cowan); Laws of UX (J. Yablonski, O'Reilly 2020/2024);
Kahneman Sistema 1/2 (Design Science, Cambridge); Self-efficacy (Bandura — APA); coping self-efficacy
em luto (PMC9123547); W3C-COGA *Making Content Usable* (2024–25).
**HCI/ética:** Calm Technology (A. Case; Calm Tech Institute); Center for Humane Technology
(*Foundations of Humane Technology*); ontologia de dark patterns (Gray, Santos & Bielova, CHI 2024);
UE Digital Services Act Art. 25; FTC deceptive design; trust calibration / automation bias (AI&Society
2025; arXiv 2503.15511).
**Moral:** *Antiqua et Nova* (DDF, Vaticano, 28/jan/2025 — verificado); São Josemaría Escrivá,
*É Cristo que Passa* ("Na oficina de José"); Doutrina Social (subsidiariedade); `SOFIA_ALMA.md`.

*Notas de rigor:* "~4 chunks" (Cowan) substitui o clássico "7±2" (Miller). *Antiqua et Nova* é
documento real e verificado. Não citar *Caminho* por número de máxima (numeração não confirmada).
Mensagens papais de 2025 sobre IA: tratar como secundárias (não confirmadas além das páginas citadas).

---

*Senova · skill_arquitetura_cognitiva v2.0 · 25/jun/2026 · primeiro crivo de qualquer tela.
Atualizar a cada decisão de design/ética aprovada por Marcos.*
