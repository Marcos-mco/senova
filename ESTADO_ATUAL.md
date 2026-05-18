# ESTADO ATUAL — Senova v3.11
Data: 18/05/2026 — fim de dia

## Versão
- index.html: ~290KB, ~4700 linhas
- Worker: v7.7, deploy 80735d38
- REGRA ABSOLUTA: nunca substituir index.html por arquivo do Claude.ai — sempre editar via Claude Code

## Commits do dia (18/mai)

### Sessão manhã
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

### Sessão tarde
- 195991a: alertas persistem no localStorage igual emails
- 57101fb: emails — só novos hoje, sem duplicar contador
- 71fd68a: contadores definitivo — Math.max, sem somar
- bc27d8b: contadores simples sem localStorage
- 55ee673: stats do dia no KV — contadores carregam ao abrir
- 2af096f: modal Editar Vaga — layout reorganizado, botão Abrir URL, Próxima ação + data
- e046b4a: modal vaga — localização, modelo, regime
- b401117: modal vaga — Candidatar condicional + renomear Analisar Candidatura
- 54a9f5b: Candidatar só aparece com v.atsCV da vaga
- 5e5c994: modal vaga — mais largo, scroll interno, footer fixo
- 1032148: modal vaga — ações contextuais por estágio
- c7911bc: fluxo candidatura — atsCV salvo após análise, preview email unificado
- 9b8f8af: análise CV — remover botões duplicados, candidatar só na barra

## Fluxo operacional funcionando
Lead → Analisar Candidatura → Análise CV com JD → Score ATS → CV Otimizado → Candidatar → Modal envio com preview → Enviar pelo Outlook

## Estado funcional
✅ Central de Sinais: 3 itens padronizados (Emails / Alertas / Vagas)
✅ Emails: isRead eq false + marca lido no Outlook após processar
✅ Modal email: 2 etapas (leitura + ação), Bloquear/Excluir/Arquivar
✅ Contadores: simples, sem localStorage — honesto por sessão
✅ Stats do dia no KV: /health retorna statsHoje, carrega ao abrir
✅ Modal Editar Vaga: layout reorganizado — Empresa·Cargo / Status·Canal / Localização / Modelo·Regime / URL+Abrir / Descrição / Email / Notas / Próxima ação+Data
✅ Modal Editar Vaga: largura 720px, scroll interno, footer fixo
✅ Footer contextual por estágio: Lead sem CV → Analisar Candidatura; Lead com CV → + Candidatar; Aplicado+ → Salvar; Declinar com motivo
✅ Fluxo candidatura: atsCV salvo imediatamente após análise (não só no candidatar)
✅ Modal candidatura: preview unificado (carta + CV no mesmo corpo)
✅ Barra de decisão ATS: botões únicos (sem duplicação no card de score)

## Pendente amanhã
- Testar botão Candidatar da barra superior (estava duplicado — fix commitado)
- Vagas da Adzuna: campo JD vem vazio — investigar se Worker passa jobDescription
- Extensão Chrome: roadmap Fase 2
- Sofia conversacional: substituir tela estática por IA viva
- Aba Mercado: emails de conteúdo (Board Academy, newsletters) em aba separada
- Encoding UTF-8 corrompido no Worker (HistÃ³rico → Histórico)
