# SESSAO.md — Estado Vivo
> Última atualização: 29/jun/2026 — Sessão 19 (FECHADA)

## VERSÃO ATUAL
Senova app — produção em marcos-mco.github.io/senova · **último commit: `6b71678`** · working tree limpo
Extensão **v2.40** (local — Marcos recarrega em chrome://extensions; NÃO publicada na Web Store)
Worker — sem alteração nesta sessão (rate limit da Sessão 18 segue no ar, deploy `a5a11b89`)

## O QUE FOI FEITO — SESSÃO 19 (25→29/jun/2026)

### Card de Oportunidade — refeito sob o crivo cognitivo (produção)
- **Fix 1 (refeito, `f67dd2b`):** análise automática do lead = **só Compatibilidade** (`mvAutoCompatCheck`),
  nunca gera CV sozinho. Zona **Documentos** visível no lead com **"Gerar CV"** sob demanda
  (`mvSyncDocsCV`/`mvGerarCV`). Estado vazio mostra só o botão (sem textarea vazia/download fantasma).
- **"Dados da vaga" sai do lead importado** (`85263e9`) — valor vai aos pills do cabeçalho; mantido
  na criação manual (+ Processo) e nos estados ≥ CV Enviado.
- **Rodapé:** "Ir para vaga" vira navy/principal e **grava antes** de navegar; "Salvar" secundário (ghost).
- **Anti-perda (`582764e`):** `saveVaga`/`saveVagaSilent` agora começam com `...(existing||{})` — nunca
  descartam campos já gravados (compatFortes/atencao/emailAssunto/entrevistaData/descricao). Era perda
  latente, agravada por "Ir para vaga" salvar.
- **Gerar CV nunca de snippet (`582764e`):** piso de 400 chars unificado (compat/reanálise/geração);
  não grava atsCV vazio; fetch parcial libera nova tentativa.
- **Vocabulário (`05e38df`,`451ea0a`):** "Análise"→**Compatibilidade**, "Pontuação ao Projeto"→
  Compatibilidade, aba **CV**, badge "Score" suprimido, **PDF Executivo** (sem 🏆/emojis).
- **Descrição compacta (`2e5b0ee`):** preview ~3 linhas (max-height) → "Documentos" aparece sem scroll.

### Extensão / Copiloto — v2.34 → v2.40 (Marcos recarrega)
- **v2.34:** LinkedIn external-apply não diz mais "Formulário de candidatura" falso → "Candidatura no site da empresa".
- **v2.35:** copiloto **não invade** Google/sites sem candidatura — `_acharContainerCandidatura` exige campo de apply REAL.
- **v2.36:** **first/last name** no autofill (fim do "Marcos Franco" duplicado) — Cartão expõe `primeiroNome`/`sobrenome`; classificador distingue Sobrenome/Primeiro/Completo/ambíguo; resolução de contexto.
- **v2.37:** **auto-detecta envio** mesmo quando o portal redireciona para /thanks (`senova_form_visto` persistido por jobId, janela 45min). Limpa no envio e no "Não enviei".
- **v2.38:** **preenche ATS sem `<form>` (Gupy)** — fallback de coleta com filtro de ruído; **painel arrastável** pela barra do título.
- **v2.39:** **auto-seleciona habilidades** (chips) mais relevantes via IA — só clica chip que coletou E a IA escolheu (igualdade exata); `ehChip` barra submit/ação; NUNCA envia.
- **v2.40:** reconhece **Easy Apply** pelo aria-label (não classifica como externa).
- **Bridges novas no app:** `__senovaCopilotoEscolherHabilidadesPrompt`; Cartão ganhou `primeiroNome`/`sobrenome`.

### Processo desta sessão
- **senova-auditor usado 7×** (verificação independente read-only ANTES de cada deploy de risco — pegou
  perda de dado no `saveVagaSilent`, CV de snippet, over-trigger do Google, cliques errados em chips).
- **Memória nova:** `feedback_auditar_antes_do_teste` — entrega incompleta queima o QA de Marcos; varrer
  todos os estados/edge cases e entregar a lista verificada ANTES de pedir teste.

## PRÓXIMAS PRIORIDADES (retomar aqui)

| # | Item | Status |
|---|------|--------|
| 1 | **Score + Gerar CV indo direto no LinkedIn** — DECIDIDO: copiloto **automático em toda vaga** (/jobs/view/) com botão **"Analisar esta vaga"** → lê descrição, **cria card + pontua Compatibilidade**, mostra score + libera Gerar CV. Hoje só aparece se já há card pontuado (`__senovaAnaliseDoCard` retorna null sem card). | **A CONSTRUIR (próximo)** |
| 2 | **Auto-seleção de habilidades (v2.39) pode não pegar os chips do Gupy** — Marcos viu "0/3" no print da Rodobens. Confirmar se recarregou v2.39 e se o detector acha os chips reais; ajustar com o DOM real se falhar. | Validar/ajustar |
| 3 | **CV arrastável no painel** (ideia do Marcos) — gerar e arrastar do painel pro campo de upload; download como fallback. | A construir |
| 4 | **Consentimento de dados sensíveis NO PERFIL** — declarar raça/gênero/orientação + autorizar, "prefiro não informar" sempre. Até lá o copiloto pula sensíveis. | A construir |
| 5 | Aposentar FAB legado · unificar passe + `temCV` · retry de DOM tardio | Limpeza |

## PENDÊNCIAS DE VALIDAÇÃO (Marcos testar)
- **Card (produção, Ctrl+Shift+R):** Oportunidade — Documentos sem scroll, Compatibilidade automática, "Gerar CV" sob demanda, "Ir para vaga" grava ao sair; "+ Processo" manual com Dados abaixo da descrição.
- **Extensão v2.40 (recarregar):** Easy Apply classificado certo · Gupy preenche a pergunta aberta · habilidades auto-selecionadas (3) · painel arrastável.

## DECISÕES DE PRODUTO DESTA SESSÃO
- Copiloto **automático em toda vaga do LinkedIn** (escolha de Marcos) — com "Analisar esta vaga".
- Habilidades = decisão **profissional** (o copiloto seleciona, Marcos revisa) — DIFERENTE de dado sensível (esse o usuário declara no Perfil).
- "Dados da vaga" não vive na Oportunidade importada — só valor no cabeçalho.

## GIT
Branch `main`. Sessão 19 = commits `f67dd2b` → `6b71678` (card em produção + extensão v2.34–v2.40).
Working tree limpo no fechamento.
