# SESSAO.md — Estado Vivo
> Última atualização: 25/mai/2026 — 19h30 | Atualizar a cada fechamento

## VERSÃO ATUAL
Senova v3.12.7 — último commit: c01dff1

## ONDE PARAMOS
12 commits entregues nesta sessão:
- Bug Kanban corrigido (card não aparecia com filtro ativo)
- Header Processos limpo: removidos "arquivados" e "limpeza em lote"
- Botão + Novo com submenu Processo / Contato
- Modal "Nova Vaga" → "Novo Processo": asteriscos obrigatórios, extração IA da descrição, botão Salvar independente
- Analisar Candidatura agora salva o card antes de abrir análise
- Modal Novo Contato: temperatura padrão vazia, asteriscos obrigatórios, validação Email ou Telefone
- Decisões de produto documentadas no PROJETO.md (conceito Atividade + botão + Novo)
- Huntr instalado e testado — fluxo: captura vaga LinkedIn → Senova gerencia processo

## FILA DE PRIORIDADES (próxima sessão)
A) PLANO A — Registrar Ricoh no Pipeline (Aplicado, 25/mai, score 72, contato Andrea Klevenhusen)
B) PLANO A — Redigir follow-up LinkedIn para Andrea Klevenhusen (aguardando aceite)
C) PLANO A — Giuliano Sarzana (NEO AdTech) — confirmar reunião
D) SENOVA — Revisão geral do frontend (botões inconsistentes, estilos misturados) — roadmap
E) SENOVA — Aviso visual melhorado quando campos obrigatórios faltam ao salvar

## PLANO A — PENDÊNCIAS
- Priscilla Capellato (Korn Ferry) + Aldo Bergamasco (Spencer Stuart) — aguardando aceite LinkedIn
- Follow-ups: Wise, BSI, Gaudium, GPAC, FIEP, 99DiDi, Thomson, Figma
- Reativar Dr. Charles London (Plano A/B)
- Eduardo Bosquetti — café (~2 semanas)

## DECISÕES DE PRODUTO TOMADAS HOJE
- Conceito Atividade: toda ação vive dentro de um card (Processo ou Contato) — nada flutua solto
- Botão + Novo: apenas duas opções — Processo / Contato. Nunca "Atividade" independente
- Campos obrigatórios: sempre asterisco vermelho (*) no label — nunca banner/caixa de aviso
- Extensão Chrome própria: Fase 2 — por ora usar Huntr para captura + Senova para gestão
- Huntr + Senova: fluxo validado e funcional

## APRENDIZADO DA SESSÃO
- Sempre commit + push ANTES de testar no browser — sem push não há como ver no GitHub Pages
- Claude Code resume em vez de mostrar código bruto — usar "type" ou "sed -n" para forçar output real
- Huntr já estava instalado e funcional — captura vaga LinkedIn com 1 clique, salva board automaticamente
