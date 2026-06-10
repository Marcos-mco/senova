# PENDENCIAS.md
# Senova Suite — Backlog consolidado
# Atualizado: 09/jun/2026 (sessão 2)

---

## ✅ CONCLUÍDO (sessão 09/jun/2026 — sessão 4)

| Item | Quando |
|------|--------|
| Captura de Aprendizado: modal-arquivar ao arrastar para Negado/Aceito/Descartado — motivo, obs, condições da oferta | 09/jun s4 |

---

## ✅ CONCLUÍDO (sessão 09/jun/2026 — sessão 3)

| Item | Quando |
|------|--------|
| KPI strip nos Processos: Ativos, Taxa retorno, Entrevistas, Propostas | 09/jun s3 |
| Para Hoje: Entrevista sem data → topo da lista com urgência roxa "Entrevista — agendar data e horário" | 09/jun s3 |
| proximaSalvar: salva v.entrevistaData para rastrear se data foi agendada | 09/jun s3 |

---

## ✅ CONCLUÍDO (sessão 09/jun/2026 — sessão 2)

| Item | Quando |
|------|--------|
| Modal Entrevista: canal convite (WhatsApp/Email/Ligação/LinkedIn) + data/hora + Outlook Calendar + dica Sofia | 09/jun s2 |
| Fathom (gravação de reunião): pré-classificação no Worker + exibição "📹 Gravação" na Home + vínculo ao card | 09/jun s2 |
| F14 registrado: extensão Chrome no WhatsApp Web (fase 4) | 09/jun s2 |
| Prob. B (Opus): consolidar sinais de vagas em "Oportunidades" único com sub-seções email + busca automática | 09/jun s2 |
| Ações por card na busca automática: Ignorar individual + Adicionar individual sem importar todas | 09/jun s2 |
| Prob. C (Opus): Google Alert HTML → artigos individuais com título e link real (worker + app) | 09/jun s2 |
| fix(sinais-mercado): Bing News RSS como primário, Google fallback, cache 4h, não serve cache de erro | 09/jun s2 |

---

## ✅ CONCLUÍDO (sessão 09/jun/2026)

| Item | Quando |
|------|--------|
| Home redesign v3.27 — 2 colunas (Para Hoje + O que há de novo) | 09/jun |
| Vocabulário: "varredura" → "Oportunidades automáticas" em toda UI | 09/jun |
| Para Hoje: seção "Retornos recebidos" com emails positivo/pipeline/hunter | 09/jun |
| Oportunidades automáticas visíveis na Home (73 vagas Adzuna/Jobicy) | 09/jun |
| URL de vaga LinkedIn extraída do parâmetro `trk` (jobid_NUMBER) | 09/jun |
| Worker: fetch HTML individual para emails de vaga — hrefs reais | 09/jun |
| Botão ↗ Ver vaga no cabeçalho do modal de processo | 09/jun |
| ATS: descrição nunca some + botão Abrir vaga na barra de decisão | 09/jun |
| Enriquecimento retroativo de URLs (últimos 7 dias) | 09/jun |
| Limpeza automática de cards email sem URL após enriquecimento | 09/jun |
| Notas de email: strip HTML/URLs ao criar e ao abrir modal | 09/jun |
| Canal correto por URL: LinkedIn/Indeed/Gupy detectados automaticamente | 09/jun |
| Email recrutador: filtra no-reply automaticamente | 09/jun |
| Modal processo: campo Plano removido, descrição 9 linhas | 09/jun |
| extrairDadosDescricao: detecta Modelo e Regime (novo) | 09/jun |
| fix(worker): apenasNovos bug + isAlertaFn antes de Promise.allSettled | 09/jun |
| Centralização home-wrap: margin:0 auto (fix monitor grande) | 09/jun |
| Contraste "ver mais": cor action + bold (WCAG AA) | 09/jun |
| Aviso emails lidos no Outlook + corrigir categoria por email | 09/jun |
| Novidades no mercado: títulos como hiperlinks ↗ | 09/jun |

---

## ✅ CONCLUÍDO (sessões anteriores)

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
| Perfil Hub — 5 abas (Perfil, Busca, Documentos, Integrações, Preferências) + Sofia banner | 28/mai |
| Menu lateral: Início, Perfil, Análise de Vaga, Processos (Sofia removida do menu) | 28/mai |
| Freq. varredura (radio), whitelist domínios, upload certificados no Perfil | 28/mai |
| F1: Sofia onboarding — roteiro estruturado 14 perguntas, preenchimento automático do Perfil | 28/mai |
| U2: "CV Otimizado" → "Preparar Candidatura" | 28/mai |
| U3: Botão Declinar dentro da aba Análise (ao lado de Candidatar) | 28/mai |
| U6: Campo "Contexto adicional" na Análise de Vaga (antes de gerar) | 28/mai |
| Extensão v2.4→v2.12: LinkedIn split-view título (currentJobId + âncora "Sobre a vaga") | 29/mai |
| U1: Popup veredicto coaching — 3 estados (✨ Ótima / 🔍 Pode valer / ⚡ Fora do perfil) | 29/mai |
| Fix race condition Analisar ↗ — storage.session.set antes de tabs.update | 29/mai |
| Fix TypeError candidatura-wrap — removido código JS sem correspondência no HTML | 29/mai |
| Extensão: espera até 3.6s por título E descrição (SPA lazy load) | 29/mai |
| esconderScore: mostra mensagem amigável em vez de ocultar silenciosamente | 29/mai |
| Toast "Salvo no Pipeline" (remove "Importar Vagas") | 29/mai |
| Remove bloco "Como candidatar" do popup | 29/mai |
| MODELO_COMERCIAL.md — 4 tiers + projeções + base do pitch deck | 28/mai |
| B2: Rascunho perdido ao fechar modal — flush síncrono em closeVagaModal + beforeunload | 28/mai |
| B1: Cards não sumiam ao excluir — ID type mismatch (number vs string) corrigido em 9 funções | 28/mai |
| B3: "Abaixo do limiar" zerado — filtro de score restaurado em dispararVarreduraManual | 28/mai |
| B4: LinkedIn emails indo para Alertas — isAlertaFn corrigida, LinkedIn passa pela IA agora | 28/mai |
| B5: Confirmação candidatura em Processos — prompt IA atualizado + cards só para vaga/hunter | 28/mai |
| B6: Cargo errado no nome do arquivo CV — filename gerado de atsEmpresa/atsCargo | 28/mai |
| B7: Carta não aparecia no modal — findIndex com String() corrigido | 28/mai |
| B8: Busca falso positivo — threshold de 4 chars reduzido para 2 | 28/mai |
| B9: Botões ativos após declinar — mesma correção de ID type mismatch | 28/mai |
| B10: Contador emails acumulava — trocado += por Math.max | 28/mai |
| U16: Botão "↺ Recarregar e-mails" — label unificado em toda a Home | 28/mai |
| U17: Michael Page adicionado à whitelist automática do Worker | 28/mai |
| U19: Campo LinkedIn já existia no card de contato (confirmado) | 28/mai |
| U20: validarContatoForm aceita LinkedIn como contato válido | 28/mai |
| U23: Ordem do menu confirmada — Home → Perfil → Análise CV → Processos → Sofia | 28/mai |

---

## 🔴 BUGS CRÍTICOS (corrigir antes de qualquer feature nova)

Nenhum bug crítico aberto. ✅

---

## 🟡 MELHORIAS DE UX (alta prioridade — antes do MVP)

### Extensão Chrome
| # | Melhoria |
|---|----------|
| ~~U1~~ | ~~Popup: veredicto coaching 3 estados + motivos~~ ✅ |
| ~~U2~~ | ~~Aba Analisar no app: renomear "CV Otimizado" → "Preparar Candidatura"~~ ✅ |
| ~~U3~~ | ~~Aba Analisar: adicionar botão "Declinar" ao lado de "Análise"~~ ✅ |
| ~~U4~~ | ~~Popup pequeno — mais informações e conselho visíveis sem scroll~~ ✅ |

### Pipeline / CRM
| # | Melhoria |
|---|----------|
| U5 | Multi-select de cards para ações em lote (arrastar para lixeira, arquivar, mover coluna) |
| ~~U6~~ | ~~Análise CV: campo de observação para o usuário adicionar contexto antes de gerar~~ ✅ |
| U7 | Salvar arquivos gerados no card (CV, carta, email, PDF executivo) |
| ~~U8~~ | ~~"Novo Processo" → navega ao CRM e mostra toast com o card criado~~ ✅ |
| U9 | Card: identificar automaticamente a forma de candidatura (pegadinhas dos portais) |

### Home
| # | Melhoria |
|---|----------|
| ~~U10~~ | ~~Processos: KPI strip 4 colunas (Ativos, Taxa retorno, Entrevistas, Propostas)~~ ✅ |
| ~~U11~~ | ~~Botão "Novo Processo" na home~~ ✅ |
| U12 | Dashboard Pipeline: taxa de retorno, tempo médio no estágio, métricas reais |

### Emails / Central de Sinais
| # | Melhoria |
|---|----------|
| ~~U13~~ | ~~3 fluxos de email: Processo / Inteligência de Mercado / Irrelevante (bloqueado)~~ ✅ |
| U14 | Google Alert: abrir no formato clássico (não web) — opção por usuário |
| U15 | Responder email avulso na Home (sem vaga associada) |

### Contatos
| # | Melhoria |
|---|----------|
| ~~U18~~ | ~~Filtros de contatos: A→Z, mais recente, mais antigo~~ ✅ |

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
| ~~F2~~ | ~~**Aba "Mercado"** — comunidades, newsletters, executive search, sinais recentes~~ ✅ | 1 |
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
| F14 | **Extensão Chrome no WhatsApp Web** — capturar convite de entrevista, ajudar a responder, preparar para a entrevista; requer nova host_permission no manifest + parsing DOM WhatsApp Web | 4 |

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
