# ESTADO ATUAL — Senova v3.11
Data: 18/05/2026

## Versão
- index.html: ~290KB, ~4600 linhas
- Worker: v7.7, deploy f493c08d
- REGRA ABSOLUTA: nunca substituir index.html por arquivo do Claude.ai — sempre editar via Claude Code

## Commits hoje (18/mai)
- 54e184e: fix vagas colapsadas + email clicável
- c1a95aa: modal email 3 ações
- d17e2d8: modal email notas + link original
- d285b22: modal email 2 etapas redesign
- 9d1b8a8: Excluir + Bloquear remetente + vagas numa linha
- 89f789a: performance — não limpar KV ao abrir Home
- 93df38b: Worker isRead eq false + marca lido após processar
- 8539b44: remover botão Atualizar do header
- 8bb5ebb: Central de Sinais — padronizar 3 itens
- ae64d00: alertas link real + vagas Ver vaga
- fac8d31: vagas sem ver/ocultar + contadores persistem
- bd9947d: contadores email acumulativo

## Estado funcional
✅ Central de Sinais: 3 itens padronizados (Emails / Alertas / Vagas)
✅ Emails: isRead eq false + marca lido no Outlook após processar
✅ Modal email: 2 etapas (leitura + ação), texto limpo, Bloquear/Excluir/Arquivar
✅ Vagas colapsadas: expande ao clicar
✅ Contadores: persistem no dia via localStorage

## Pendente próxima sessão
- Google Alert: link abre configuração, não conteúdo
- Modal email Etapa 2A: scroll + "Atualizar andamento" não confirma visualmente
- Aba Mercado: emails de conteúdo (Board Academy, newsletters) direcionados para aba separada
- Sofia conversacional: substituir tela estática por IA viva
- Encoding UTF-8 corrompido no Worker (HistÃ³rico)
- Taxa de Retorno: renomear para Origens de Lead com 5 origens fixas
