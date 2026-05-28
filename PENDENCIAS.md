# PENDENCIAS.md
# Senova Suite — Backlog consolidado
# Atualizado: 28/mai/2026

---

## ✅ CONCLUÍDO (esta semana)

| Item | Quando |
|------|--------|
| Extensão Chrome v2.3 — LinkedIn async retry, score com cache | 27/mai |
| Kanban "Padrão" = updatedAt DESC (vagas novas no topo) | 27/mai |
| Botão "Analisar ↗" com world:MAIN (dados passando para o app) | 27/mai |
| "Ver nos Processos" — fix CSP MV3 (onclick inline bloqueado) | 28/mai |
| LinkedIn collections/busca — captura h1 correto (não pega heading de seção) | 28/mai |
| Score sem descrição — não chama API, elimina "Revisar manualmente" | 28/mai |
| Declinar ATS — fix: _carregarExtData agora define atsEmpresa/atsCargo | 28/mai |
| Import extensão: window.__senovaImportar, _imp tracking, disparo imediato | 28/mai |
| Botão "Importar Vagas" removido do CRM | 28/mai |
| URL ?ext=1 limpa após carregar (refresh não redireciona para Análise) | 28/mai |
| Ordenação A-Z nas colunas do kanban | 28/mai |
| Confirmação de exclusão inline no modal (sem janela nativa do browser) | 28/mai |
| Botão "Limpar duplicatas" no filtro do CRM | 28/mai |
| SOFIA_ALMA.md — alma e princípios éticos da Sofia | 28/mai |
| SOFIA_ONBOARDING.md — roteiro de entrevista com Career Anchors | 28/mai |
| MODELO_COMERCIAL.md — 4 tiers + projeções + base do pitch deck | 28/mai |

---

## 🔴 BUGS CRÍTICOS (corrigir antes de qualquer feature nova)

| # | Bug | Impacto |
|---|-----|---------|
| B1 | Cards não somem do kanban quando excluídos | Confunde o usuário — pensa que não foi excluído |
| B2 | Preenche campo e sai da página — perde tudo | Perda de trabalho |
| B3 | "Abaixo do limiar" zerado no dashboard | Número errado na home |
| B4 | Emails do LinkedIn indo para "Alertas" (deveria ser outro tipo) | Classificação errada |
| B5 | Email de confirmação de candidatura entrando em "Processos" | Confunde sinais reais com confirmações automáticas |
| B6 | CV gerado com cargo errado no nome do arquivo (Diretor vs Gerente) | Documento entregue com nome incorreto |
| B7 | Carta de apresentação: seções não aparecem após análise | Feature quebrada |
| B8 | Falso positivo na busca (ex: "Straumann" aparece ao buscar "omi") | Resultados irrelevantes |
| B9 | "Candidatar" após declinar: botões ficam ativos (deveriam bloquear) | Estado inconsistente |
| B10 | Contador de emails novo mostra número errado | Indicador enganoso |

---

## 🟡 MELHORIAS DE UX (alta prioridade — antes do MVP)

### Extensão Chrome
| # | Melhoria |
|---|----------|
| U1 | Popup: mais coaching — veredicto claro (ex: "Muito fora do perfil — analise antes de se candidatar") |
| U2 | Aba Analisar no app: renomear "CV Otimizado" → "Preparar Candidatura" |
| U3 | Aba Analisar: adicionar botão "Declinar" ao lado de "Análise" |
| U4 | Popup pequeno — mais informações e conselho visíveis sem scroll |

### Pipeline / CRM
| # | Melhoria |
|---|----------|
| U5 | Multi-select de cards para ações em lote (arrastar para lixeira, arquivar, mover coluna) |
| U6 | Análise CV: campo de observação para o usuário adicionar contexto antes de gerar |
| U7 | Salvar arquivos gerados no card (CV, carta, email, PDF executivo) |
| U8 | "Novo Processo" — fluxo simplificado (hoje fecha e já aparece como "Enviado") |
| U9 | Card: identificar automaticamente a forma de candidatura (pegadinhas dos portais) |

### Home
| # | Melhoria |
|---|----------|
| U10 | Home: redesenhar — dashs menores, mostrar só novidades e tarefas do dia |
| U11 | Botão "Novo Processo" na home (não só no CRM) |
| U12 | Dashboard Pipeline: taxa de retorno, tempo médio no estágio, métricas reais |

### Emails / Central de Sinais
| # | Melhoria |
|---|----------|
| U13 | 3 fluxos de email: Processo / Inteligência de Mercado / Irrelevante (bloqueado) |
| U14 | Google Alert: abrir no formato clássico (não web) — opção por usuário |
| U15 | Responder email avulso na Home (sem vaga associada) |
| U16 | "Recarregar emails" vs "Atualizar" — unificar em um botão com nome claro |
| U17 | Adicionar Michael Page noreply@mail.michaelpage.com.br na whitelist automática |

### Contatos
| # | Melhoria |
|---|----------|
| U18 | Filtros de contatos: ordem alfabética, data de inclusão |
| U19 | Card de contato: campo LinkedIn/URL (para quem ainda não tem email ou telefone) |
| U20 | "Informe ao menos um contato" — aceitar LinkedIn como contato válido |

### Perfil
| # | Melhoria |
|---|----------|
| U21 | Perfil: campos para outros países/remoto (ex: filha na Alemanha, posso assumir cargos mais básicos) |
| U22 | Perfil: "Otimize para múltiplos portais" (além do LinkedIn) |

### Outros
| # | Melhoria |
|---|----------|
| U23 | Menu: confirmar ordem "Home → Perfil → Análise CV → Processos → Entrevistas" |
| U24 | Entrevista: avaliar se merece aba própria |
| U25 | Opção de idioma alemão (verificar onde exatamente falta) |
| U26 | Plano A, B, C — revisar e atualizar para a nova estrutura |

---

## 🔵 FEATURES NOVAS (aprovar antes de implementar)

| # | Feature | Fase |
|---|---------|------|
| F1 | **Sofia** — implementar onboarding em texto; voz (Web Speech API) na sequência | 1 |
| F2 | **Aba "Mercado"** — inteligência executiva separada do processo (newsletters, Board Academy, conteúdo 50+) | 1 |
| F3 | 5ª fonte de leads: entrada manual melhorada (dicas, indicações, contatos diretos) | 1 |
| F4 | Carta candidatura — reescrita de fluxo completo | 1 |
| F5 | Preenchimento automático de vagas nos portais de emprego | 2 |
| F6 | varredura: adicionar ciandt.com e empregos.com.br | 2 |
| F7 | Dashboard Pipeline rico (métricas: taxa retorno, tempo médio por estágio) | 2 |
| F8 | Comunidades executivas 50+ — indicação dentro do app | 2 |
| F9 | Cursos via API Claude — customizável no Perfil | 2 |
| F10 | Multi-select de cards — ações em lote (já em U5, implementação complexa) | 2 |
| F11 | Sofia com avatar (Anam.ai) | 3 |
| F12 | Versão mobile | 4 |
| F13 | WhatsApp integration | 4 |

---

## 📋 DECISÕES DE PRODUTO (não implementar sem aprovação)

- **Portais arquivam só um CV** — problema real; avaliar solução (geração dinâmica por vaga? PDF nomeado por vaga?)
- **"Entrada CRM"** — remover; o Senova deve se auto-atualizar via extensão e varredura
- **Plano A/B/C** — revisar o que significa hoje antes de exibir nos cards
- **Sofia** — implementação em texto primeiro; voz depois; avatar (Anam.ai) na Fase 3

---

## 🗓 ROADMAP SIMPLIFICADO

| Fase | Período | Foco |
|------|---------|------|
| **1** | Jun–Jul/2026 | Zerar bugs críticos + Sofia texto + Aba Mercado + UX home |
| **2** | Ago–Set/2026 | MVP Comercial — senova.com.br, 5 usuários reais, R$47–97/mês |
| **3** | Out–Nov/2026 | Sofia com avatar + inteligência preditiva |
| **4** | Jan/2027+ | Escala — mobile, WhatsApp, 200 usuários |

---

*Este arquivo é a fonte única de verdade do backlog. Atualizar a cada sessão.*
