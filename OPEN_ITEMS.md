# OPEN_ITEMS.md
# Senova Suite — Itens Abertos (gerado em 28/mai/2026)

---

## 🔴 BUG CRÍTICO

| # | Bug | Causa raiz | Solução sugerida |
|---|-----|-----------|-----------------|
| B2 | Preenche campo e sai da página — perde tudo | `_saveDraftVaga` só dispara após 600ms de debounce; se o usuário navegar antes, o rascunho não é salvo | Chamar `_saveDraftVaga()` imediatamente em `closeVagaModal()` para novos cards; usar `beforeunload` para fechar o browser |

---

## 🟡 UX — EXTENSÃO CHROME

| # | Melhoria | Prioridade | Fase |
|---|----------|------------|------|
| U1 | Popup: veredicto claro com coaching ("Muito fora do perfil — analise antes de candidatar") | Alta | 1 |
| U2 | Aba Analisar: renomear "CV Otimizado" → "Preparar Candidatura" | Média | 1 |
| U3 | Aba Analisar: botão "Declinar" ao lado de "Análise" | Média | 1 |
| U4 | Popup pequeno: mais informações visíveis sem scroll | Alta | 1 |

---

## 🟡 UX — PIPELINE / CRM

| # | Melhoria | Prioridade | Fase |
|---|----------|------------|------|
| U5 | Multi-select de cards para ações em lote (lixeira, arquivar, mover coluna) | Alta | 2 |
| U6 | Análise CV: campo de observação antes de gerar (contexto do usuário) | Média | 1 |
| U7 | Salvar arquivos gerados no card (CV, carta, email, PDF executivo) | Média | 2 |
| U8 | "Novo Processo" — fluxo simplificado | Baixa | 2 |
| U9 | Card: identificar automaticamente forma de candidatura | Baixa | 3 |

---

## 🟡 UX — HOME / DASHBOARD

| # | Melhoria | Prioridade | Fase |
|---|----------|------------|------|
| U10 | Home: redesenhar — KPIs menores, mostrar só novidades e tarefas do dia | **Alta** | 1 |
| U11 | Botão "Novo Processo" na home (não só no CRM) | Alta | 1 |
| U12 | Dashboard Pipeline: taxa de retorno, tempo médio no estágio | Média | 2 |

---

## 🟡 UX — EMAILS / CENTRAL DE SINAIS

| # | Melhoria | Prioridade | Fase |
|---|----------|------------|------|
| U13 | 3 fluxos de email: Processo / Inteligência de Mercado / Irrelevante (bloqueado) | Alta | 1 |
| U14 | Google Alert: abrir no formato clássico (não web) — opção por usuário | Baixa | 2 |
| U15 | Responder email avulso na Home (sem vaga associada) | Média | 2 |
| U16 | Unificar "Recarregar emails" e "Atualizar" em um único botão com nome claro | Média | 1 |

---

## 🟡 UX — CONTATOS

| # | Melhoria | Prioridade | Fase |
|---|----------|------------|------|
| U18 | Filtros de contatos: ordem alfabética, data de inclusão | Média | 1 |
| U19 | Card de contato: campo LinkedIn/URL | Média | 1 |
| U20 | "Informe ao menos um contato" — aceitar LinkedIn como contato válido | Alta | 1 |

---

## 🟡 UX — PERFIL / OUTROS

| # | Melhoria | Prioridade | Fase |
|---|----------|------------|------|
| U21 | Perfil: campos para outros países/remoto | Média | 2 |
| U22 | Perfil: "Otimize para múltiplos portais" | Baixa | 3 |
| U23 | Menu: confirmar ordem Home → Perfil → Análise → Processos → Entrevistas | Alta | 1 |
| U24 | Entrevista: avaliar se merece aba própria | Decisão | — |
| U25 | Opção de idioma alemão | Baixa | 2 |
| U26 | Plano A/B/C — revisar significado atual | Decisão | — |

---

## 🔵 FEATURES NOVAS (aprovação antes de implementar)

| # | Feature | Fase | Dependência |
|---|---------|------|-------------|
| F1 | **Sofia** — onboarding em texto; voz depois | 1 | SOFIA_ONBOARDING.md ✅ |
| F2 | **Aba "Mercado"** — newsletters, Board Academy, conteúdo 50+ | 1 | — |
| F3 | 5ª fonte de leads: entrada manual melhorada | 1 | — |
| F4 | Carta candidatura — reescrita de fluxo completo | 1 | — |
| F5 | Preenchimento automático de vagas nos portais | 2 | — |
| F6 | Varredura: adicionar ciandt.com e empregos.com.br | 2 | Worker |
| F7 | Dashboard Pipeline rico (métricas avançadas) | 2 | U12 |
| F8 | Comunidades executivas 50+ dentro do app | 2 | F2 |
| F9 | Cursos via API Claude — customizável no Perfil | 2 | — |
| F10 | Multi-select de cards (implementação complexa) | 2 | U5 |
| F11 | Sofia com avatar (Anam.ai) | 3 | F1 |
| F12 | Versão mobile | 4 | — |
| F13 | WhatsApp integration | 4 | — |

---

## 📋 DECISÕES DE PRODUTO PENDENTES

| Decisão | Contexto | Urgência |
|---------|----------|----------|
| Portais arquivam só um CV | Geração dinâmica por vaga? PDF nomeado por vaga? | Média |
| "Entrada CRM" — remover | Senova deve se auto-atualizar via extensão e varredura | Alta |
| Plano A/B/C | Revisar significado antes de exibir nos cards | Alta |
| Sofia — texto primeiro | Voz depois; avatar (Anam.ai) na Fase 3 | Definido |

---

## 🗓 PRÓXIMOS 30 DIAS (Junho/2026)

1. **B2** — Fix rascunho perdido (último bug crítico)
2. **U10/U11** — Redesenho Home (componentes React propostos em `senova-dashboard-preview.html`)
3. **U23** — Confirmar e ajustar ordem do menu
4. **U20** — Aceitar LinkedIn como contato válido
5. **U16** — Unificar botão de emails
6. **F1** — Sofia onboarding em texto (começo)
7. **F2** — Estrutura da Aba Mercado

---

*Gerado automaticamente a partir do PENDENCIAS.md. Fonte única de verdade: PENDENCIAS.md*
