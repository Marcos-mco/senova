# SENOVA — Projeto de Navegação e UX
**Versão:** 1.0 · **Criado:** 26/mai/2026 · **Prioridade:** Alta (Fase 1)

---

## DIAGNÓSTICO — O QUE ESTÁ ERRADO

### Problema 1 — Ferramentas como páginas, não como contexto

O Senova tem o conceito certo no papel ("toda ação vive dentro de um card") mas não executa isso na navegação real.

**Hoje:**
```
Usuário vê card no Pipeline → sai para "Análise CV" → cola texto → analisa → volta para Pipeline → candidata
```

**Deveria ser:**
```
Usuário clica no card → painel se abre → analisa dentro do card → candidata — sem sair do pipeline
```

Consequência: o usuário perde contexto, perde o card de vista, e sente que está "usando ferramentas separadas" em vez de um sistema integrado.

### Problema 2 — Sidebar com 5 itens quando deveria ter 3

Sidebar atual: Home | Perfil | Análise CV | Processos | Sofia

"Análise CV" não deveria ser destino de navegação — é uma ferramenta. O menu principal deve ter apenas destinos: lugares onde o usuário vai para ver o estado do mundo, não para executar uma tarefa específica.

Menu ideal: **Home | Processos | Sofia**
- Perfil: acessa pelo avatar no rodapé da sidebar (padrão universal)
- Análise CV: botão dentro do card de Processo

### Problema 3 — Home não é um cockpit de verdade

Home atual: métricas + funil + sinais + próximas ações.
Home ideal: **"O que precisa da minha atenção agora?"** — priorizado, acionável, sem ruído.

Um executivo abre o Senova pela manhã e quer saber:
1. Tem nova oportunidade? → clicar e avaliar
2. Tem follow-up vencendo? → clicar e agir
3. Tem resposta de recrutador? → clicar e responder

Tudo com 1 clique que leva direto à ação. Hoje a Home mostra dados mas não guia a ação.

### Problema 4 — Extensão Chrome com selectors quebrados

LinkedIn muda o DOM com frequência intencional para bloquear scraping. Os selectors atuais provavelmente estão desatualizados.

**Bugs confirmados a diagnosticar:**
- A: extensão não lê título/empresa corretamente em páginas de vagas LinkedIn
- B: emails do Outlook não são lidos (OAuth ativo mas parsing falhando?)

### Problema 5 — Não estudamos o Huntr a fundo

O skill_concorrentes.md tem o resumo mas não documenta como a extensão do Huntr funciona em detalhe. Antes de redesenhar a nossa, precisamos estudar a dele.

---

## ABORDAGEM — DIAGNÓSTICO ANTES DE CÓDIGO

```
FASE 0 — Diagnóstico     → entender o que exatamente está quebrado e por quê
FASE 1 — Arquitetura     → desenhar a nova navegação (wireframes aprovados)
FASE 2 — Implementação   → executar as mudanças, uma por vez
FASE 3 — Extensão Chrome → redesenhar com base no que o Huntr faz bem
FASE 4 — Ajustes         → testar com uso real, corrigir friction points
```

Não pular fases. Não implementar sem wireframe aprovado.

---

## FASE 0 — DIAGNÓSTICO (fazer antes de qualquer código)

### 0A — Mapear o fluxo atual completo
Documentar cada passo que Marcos dá, do abrir o Senova até enviar uma candidatura.
Contar cliques. Identificar onde sai do contexto. Identificar onde sente fricção.

**Tarefa para Marcos:** usar o Senova normalmente por 1 dia e anotar todo momento de frustração ou dúvida.

### 0B — Diagnosticar bug de emails
Verificar em ordem:
1. O OAuth está ativo? (toggle Outlook na Home)
2. A rota `/api/emails` retorna dados? (abrir DevTools → Network → chamar a rota)
3. Os emails chegam mas não são classificados? Ou não chegam?
4. Qual o erro exato no console do browser?

### 0C — Diagnosticar bug da extensão LinkedIn
1. Abrir uma vaga no LinkedIn Jobs
2. Clicar na extensão Senova
3. Ver o que é capturado vs o que deveria ser
4. Abrir DevTools → Console → verificar erros do popup.js
5. Comparar o selector atual com o HTML atual do LinkedIn

### 0D — Estudar a extensão do Huntr
1. Instalar o Huntr (gratuito — 40 vagas)
2. Testar na mesma página LinkedIn onde o Senova falha
3. Documentar: o que o Huntr captura, como estrutura os dados, como lida com LinkedIn dinâmico
4. Registrar aqui o aprendizado antes de qualquer implementação

---

## FASE 1 — NOVA ARQUITETURA DE NAVEGAÇÃO

### 1A — Novo menu principal (3 itens)

```
SENOVA
────────
🏠 Home
📋 Processos
✨ Sofia
────────
[avatar] Marcos   ← abre Perfil ao clicar
```

"Análise CV" sai do menu. Torna-se painel dentro do card de Processo.

### 1B — Nova Home (cockpit de decisão)

Wireframe:
```
┌────────────────────────────────────────────────────────┐
│ Bom dia, Marcos.         [data]              [Outlook] │
├────────────────────────────────────────────────────────┤
│ PRECISA DE ATENÇÃO AGORA                               │
│ ┌──────────────────────┐ ┌──────────────────────┐     │
│ │ 🔴 Follow-up venceu  │ │ 📧 Resposta recebida │     │
│ │ Korn Ferry           │ │ Michael Page          │     │
│ │ [Agir agora →]       │ │ [Ver email →]        │     │
│ └──────────────────────┘ └──────────────────────┘     │
├────────────────────────────────────────────────────────┤
│ NOVAS OPORTUNIDADES (3 hoje)         [Ver todas →]     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│ │ Empresa  │ │ Empresa  │ │ Empresa  │               │
│ │ Cargo    │ │ Cargo    │ │ Cargo    │               │
│ │ 84% ✅   │ │ 71% 🟡   │ │ 68% 🟡   │               │
│ │[Avaliar] │ │[Avaliar] │ │[Avaliar] │               │
│ └──────────┘ └──────────┘ └──────────┘               │
├────────────────────────────────────────────────────────┤
│ SEU FUNIL                  SINAIS DE MERCADO           │
│ Oportunidades  12          [notícia 1]                 │
│ CV Enviado      5          [notícia 2]                 │
│ Em Contato      3          [Google Alert]              │
│ Propostas       0                                      │
└────────────────────────────────────────────────────────┘
```

Regra: cada item na seção "Precisa de Atenção" tem 1 ação clara. Não é lista — é prioridade.

### 1C — Card de Processo com painel lateral de análise

Wireframe do modal do card (versão desktop):
```
┌─────────────────────────────────────────────────────────────┐
│ [←] Korn Ferry — Practice Leader LATAM         [Fechar ✕]  │
├──────────────────────┬──────────────────────────────────────┤
│ DADOS DO PROCESSO    │ ANÁLISE CV                           │
│                      │                                      │
│ Estágio:             │ [Analisar esta vaga]                 │
│ ● Oportunidade       │                                      │
│                      │ ──── ou resultado ────               │
│ Próxima ação:        │                                      │
│ Follow-up 02/jun     │ Compatibilidade: 84%                 │
│                      │ ✅ Marketing digital                  │
│ Plano: A             │ ✅ Gestão de equipes                  │
│                      │ ⚠ Idioma: inglês avançado            │
│ Timeline:            │                                      │
│ • criado 26/mai      │ [Candidatar →]  [Declinar]           │
│ • CV enviado ...     │                                      │
│                      │ CV gerado: [ver] [baixar .docx]      │
├──────────────────────┴──────────────────────────────────────┤
│ Notas:                              [Salvar] [Arquivar]     │
└─────────────────────────────────────────────────────────────┘
```

### 1D — Processos sem "Análise CV" no menu

O kanban permanece igual. A diferença é que o botão "Analisar CV" (que hoje abre outra página) passa a abrir um painel lateral dentro do próprio modal do card.

### 1E — Wireframe mobile (< 768px)

```
┌────────────────────────────┐
│ Bom dia, Marcos.      [⚙] │
├────────────────────────────┤
│ ⚠ 2 ações urgentes         │
│ ┌────────────────────────┐ │
│ │ Follow-up venceu       │ │
│ │ Korn Ferry  [Agir →]   │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 3 novas oportunidades  │ │
│ │ [Ver →]                │ │
│ └────────────────────────┘ │
│ Funil: 12/5/3/0            │
├────────────────────────────┤
│ 🏠 Home │ 📋 │ ✨ │ ···   │
└────────────────────────────┘
```

---

## FASE 2 — IMPLEMENTAÇÃO (ordem obrigatória)

Executar apenas após wireframes aprovados por Marcos.

**2.1** Remover "Análise CV" da sidebar — substituir por botão dentro do card
**2.2** Adicionar painel de análise inline no modal de Processo
**2.3** Redesenhar Home (seção "Precisa de Atenção" no topo)
**2.4** Mover "Perfil" para o avatar no rodapé da sidebar
**2.5** Responsivo mobile: bottom nav + layout 1 coluna

Regra: 1 item por vez, commit, testar no browser, aprovar antes do próximo.

---

## FASE 3 — EXTENSÃO CHROME

**Estratégia base:**
- A extensão própria é necessária (controle total sobre o envio ao Worker)
- Mas os selectors de cada site precisam ser mantidos como uma lista separada e versionada
- Huntr usa uma abordagem diferente: em vez de selectors frágeis, usa a API do LinkedIn quando possível

**3A — Após estudar o Huntr (Fase 0D):**
- Documentar como o Huntr lê vagas do LinkedIn
- Verificar se usa a API pública do LinkedIn Jobs ou scraping
- Adaptar a melhor abordagem para o Senova

**3B — Alternativas ao scraping frágil:**
- **Clipboard paste:** usuário copia texto da vaga, extensão detecta e estrutura
- **Share URL:** extensão recebe a URL da vaga, Worker faz o fetch e parse (já temos `/api/fetch-descricao`)
- **Combinação:** selectors quando funcionam, fallback para clipboard/URL quando não

**3C — Selectors — manutenção como produto**
Criar arquivo `selectors.json` no repositório:
```json
{
  "linkedin.com/jobs": {
    "titulo": "h1.job-title",
    "empresa": ".job-details-jobs-unified-top-card__company-name",
    "descricao": ".jobs-description-content__text",
    "atualizado": "2026-05-26"
  }
}
```
Versionar e atualizar quando o LinkedIn muda o DOM. Data de atualização visível.

---

## FASE 4 — AJUSTES E VALIDAÇÃO

Após implementar Fase 2 e 3:

**4A — Teste de uso real**
Marcos usa o Senova por 1 semana normalmente. Anotar:
- Quantos cliques para completar um fluxo
- Onde hesitou ou se perdeu
- O que ficou mais rápido vs antes

**4B — Métricas de sucesso**
- Fluxo completo (ver vaga → candidatar) em ≤ 5 cliques (hoje: estimado 12+)
- Email lidos sem erro: 100% quando OAuth ativo
- Extensão captura LinkedIn corretamente: > 90% das páginas de vaga

**4C — Iteração**
Cada friction point identificado vira um item documentado com:
- Comportamento atual
- Comportamento desejado
- Esforço estimado (P/M/G)
- Prioridade

---

## CRONOGRAMA ESTIMADO

| Fase | Atividade | Esforço | Quando |
|------|-----------|---------|--------|
| 0A | Mapear fluxo atual | Marcos (1 dia de uso) | Esta semana |
| 0B | Diagnosticar bug emails | 1 sessão Claude Code | Esta semana |
| 0C | Diagnosticar bug extensão LinkedIn | 1 sessão Claude Code | Esta semana |
| 0D | Estudar extensão Huntr | Marcos testa + documenta | Esta semana |
| 1 | Wireframes nova navegação | 1 sessão Claude Code | Próxima semana |
| **Aprovação Marcos** | Revisar wireframes | — | Antes de 2.x |
| 2.1–2.2 | Análise CV inline no card | 2 sessões | jun/2026 |
| 2.3 | Nova Home cockpit | 1 sessão | jun/2026 |
| 2.4–2.5 | Sidebar + mobile | 1 sessão | jun/2026 |
| 3 | Extensão Chrome redesenhada | 2–3 sessões | jul/2026 |
| 4 | Ajustes pós-uso real | Contínuo | jul–ago/2026 |

---

## O QUE FAZER AGORA (próxima sessão)

1. **Marcos:** usar o Senova hoje normalmente e anotar qualquer momento de fricção
2. **Marcos:** instalar Huntr e testar a extensão dele no LinkedIn
3. **Próxima sessão Claude Code:** diagnóstico técnico dos bugs 0B e 0C (abre DevTools, testa as rotas, verifica o console)
4. Com o diagnóstico em mãos: desenhar wireframes da nova navegação e aprovar antes de implementar

---

*Projeto criado 26/mai/2026 — substitui abordagem ad-hoc de navegação*
*Revisar ao final de cada fase*
