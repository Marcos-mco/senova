# Design Sprint 01 — Home UX
> Iniciado: 03/jun/2026 | Metodologia: Google Design Sprint (adaptado)

## Problema a resolver
A home do Senova não tem fluxo linear. O usuário abre o app e não sabe onde começar. Elementos visuais competem em igual peso. Conteúdo importante fica abaixo do fold.

## Objetivo do Sprint
Redesenhar a home para que um executivo 35+ abra o app às 7h30 e saiba exatamente o que fazer em menos de 30 segundos — sem scroll, sem dúvida.

---

## DIA 1 — ENTENDER ← em andamento

### Quem é o usuário
**Marcos Franco** — executivo 40+, Curitiba, buscando recolocação em posições C-Level/Diretoria. Usa o app diariamente como ferramenta de gestão da sua busca ativa. Público-alvo futuro: executivos sêniores 35+ em transição de carreira.

### User Journey — Como ele usa o app hoje
```
7h30 — Abre o laptop
  ↓
Abre o Senova
  ↓
VÊ: hero banner + lista longa de prioridades + coisas escondidas abaixo
  ↓
NÃO SABE: qual é a coisa mais importante para fazer agora
  ↓
Rola a página para entender o que há
  ↓
Encontra Novidades e Pipeline só lá embaixo
  ↓
Começa o dia sem clareza
```

### User Journey — Como deveria ser
```
7h30 — Abre o laptop
  ↓
Abre o Senova
  ↓
VÊ: "3 prioridades para hoje" — claro, compacto, sem scroll
  ↓
VÊ logo abaixo: "2 emails de processo · 1 alerta de mercado"
  ↓
VÊ: pipeline em 4 números — 57 / 18 / 2 / 0
  ↓
SABE exatamente o que fazer
  ↓
Fecha o laptop em 2 minutos e vai trabalhar
```

### Problem Statement
> "Como podemos redesenhar a home do Senova para que Marcos saiba o que fazer hoje em menos de 30 segundos, sem scroll, com hierarquia visual clara?"

### Métricas de sucesso
- Usuário encontra a ação mais urgente em < 5 segundos
- Nenhum conteúdo relevante abaixo do fold em tela 1366×768
- Escala visual clara: 1 elemento dominante, 2 secundários, resto subordinado

### Como Might We (HMW) — perguntas geradoras
- HMW mostrar só o que precisa de atenção hoje?
- HMW fazer o pipeline parecer gerenciável, não assustador?
- HMW dar uma "sensação de controle" logo ao abrir?
- HMW esconder complexidade sem perder funcionalidade?

---

## DIA 2 — DIVERGIR ← em andamento

### Direção escolhida por Marcos
Combinação de Solução A (Inbox Zero) + Solução B (Morning Brief).

### Insight crítico de Marcos — "Novidades" deve mostrar VALOR, não status
> "Não acho que deva ser 'Nenhum email novo'. Pensaria em algo mais:
> - Tarefas agendadas para hoje
> - 8 novas oportunidades
> - 3 informações novas de mercado"

**Implicação:** A seção "Novidades" não é um painel de status — é um feed de valor novo. O usuário não quer saber que não tem email. Quer saber o que chegou de relevante.

### Arquitetura de informação revisada

**Bloco 1 — Prioridades do Dia** (ação, linear, compacto)
- Lista de tarefas agendadas com prazo hoje/amanhã
- Máximo visível: 3-4 itens + "ver mais X →"
- Ação primária da tela

**Bloco 2 — Feed Unificado de Sinais** (analogia: TV)
> "Quero ligar a TV e ver o que tem para assistir. Não quero saber se é Netflix, Globo, HBO. Só quero assistir." — Marcos

O usuário não vê a FONTE. Vê o SINAL. Tudo parametrizado no perfil.

Fontes (invisíveis — configuradas no perfil):
- Varredura automática (Adzuna, Jobicy)
- Google Alerts
- Extensão Chrome (capturas externas)
- Emails do Outlook (processos ativos)
- LinkedIn (futuro)
- Entrada manual

O que o usuário vê (tipo de sinal, não origem):
- 🎯 `Vaga nova` — "Dir. Comercial · Ambev · 89pts"
- 💬 `Retorno de processo` — "RH Localfrio respondeu · há 2h"
- 📈 `Movimento de mercado` — "Bosch expande no PR — oportunidade"
- 👤 `Novo contato sugerido` — (futuro)

Regra: se não há sinal novo → categoria OMITIDA. Nunca "0 vagas novas".

**Extensão Chrome — companion permanente**
Deve acompanhar o usuário em QUALQUER site: LinkedIn, job boards,
artigos, emails. Captura sinais e alimenta o feed unificado.
O usuário nunca precisa abrir o Senova para capturar — a extensão faz.

**Valores Opus Dei / Labor Dei que devem permear o produto:**
- Prudência — mostrar só o que importa, sem ruído
- Ordem — hierarquia clara, dignidade visual
- Fortaleza — linguagem que sustenta, nunca causa ansiedade
- Esperança — tom positivo, foco em possibilidades
- Trabalho como vocação — a plataforma eleva o profissional, nunca o diminui
O produto não é de "desempregado procurando emprego". É de executivo
gerindo sua carreira com inteligência e dignidade.

**Bloco 3 — Pipeline** (contexto, não foco)
- 4 números: Oportunidades · Candidaturas · Em processo · Propostas
- Clicável → vai para Pipeline
- Link discreto para Relatórios

### Decisão arquitetural — 03/jun/2026
> "Scores, números, um mini BI devem ter na aba Relatórios." — Marcos

**Home = ação.** Prioridades + Inteligência + Pipeline (só números).
**Relatórios = análise.** IEE Score, funil, taxa por canal, evolução.

Princípio: complexidade disponível, nunca imposta.

## DIA 3 — DECIDIR (pendente)
> Escolher UMA direção + escrever Design System

## DIA 4 — PROTOTIPAR (pendente)
> Implementar em uma sessão limpa

## DIA 5 — VALIDAR (pendente)
> Testar, ajustar, commitar v3.25
