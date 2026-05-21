# Sessão 20/mai/2026 — Resumo e continuidade

## Estado atual do produto
- Versão: v4.0 (em construção)
- Branch: main — limpa, sincronizada
- Worker: deployado — Version ID: d4254150
- Frontend: marcos-mco.github.io/senova

## O que foi feito hoje

### Extensão Chrome (senova-extension/)
- Fix: URL de rastreamento limpa em popup.js e verOrigemCard()
- Fix: Descrição da vaga enviada corretamente (não mais vazia)
- Fix: onclick com aspas — modal abre ao clicar no card
- Fix: world MAIN no executeScript — captura DOM do React
- Melhoria: empresa capturada via document.title (não mais domínio)
- Melhoria: suporte Inhire com polling para HtmlParser
- Melhoria: fallback de descrição com cascata de 13 seletores
- Ícones PNG gerados e commitados (icon16/48/128)

### Pipeline (index.html)
- Fix: Notas não duplicam descrição da vaga
- Fix: Remover card atualiza tela imediatamente
- Fix: Limpeza em lote atualiza tela imediatamente
- Fix: Ordenação por createdAt (não mais por string de data)
- Feat: Canal "Extensão Chrome" vs "Varredura IA" detectado automaticamente
- Feat: Localização, Modelo, Regime extraídos automaticamente pela IA
- Feat: Score não bloqueia importação — todas as vagas entram como Oportunidade
- Feat: Botão "Candidatar" aparece em vagas com score
- Feat: Horário HH:MM nos cards
- Feat: aplicarFiltros() chamado após todo CRUD

### Perfil (index.html)
- Reorganizado em 5 blocos iniciais com integração /api/perfil
- Bloco 1: Quem sou
- Bloco 2: CV Master
- Bloco 3: O que busco (critérios de triagem)
- Bloco 4: Empresas que acompanho
- Bloco 5: Ferramentas
- PENDENTE: Blocos novos A/B/C (Onde estou presente, Comunidades, Idiomas) — código gerado mas NÃO confirmado/testado

### Worker (senova-worker.js)
- Feat: /api/perfil GET + POST — salva perfil_usuario no KV
- Feat: analisarVaga() retorna localizacao, modelo, regime, idioma_vaga
- Feat: Truncamento de descrição aumentado para 1500 chars
- Feat: Inferência de regime por contexto

### Documentação
- skill_design_senova.md criado e commitado
- Arquitetura v4.0 documentada (9 blocos do Perfil)
- Idiomas (PT/EN/ES/DE) documentados
- Público atualizado: Profissionais Sênior 30+

## Decisões de produto tomadas hoje
- Lead → Oportunidade (em toda a interface)
- Analisar CV → Analisar Vaga
- Triagem automática pelos critérios do Perfil — sem clique do usuário
- Para Considerar como fila secundária (não bloqueia, não some)
- Perfil como fonte única de critérios de triagem
- Sofia: conversa fluida, 4 idiomas, avatar Anam.ai na Fase 3
- Score não bloqueia importação — é informativo
- Design no final com ferramenta dedicada (Antigravity ou similar)
- Extensão Chrome funciona em qualquer site, qualquer país

## Por onde começar amanhã — NESTA ORDEM

### 1. PRIMEIRO: ler os arquivos reais (REGRA INVIOLÁVEL)
Antes de qualquer proposta, o Claude Code deve ler:
- index.html (aba Perfil — page-linkedin — blocos A/B/C pendentes)
- senova-worker.js (rotas existentes)
- skill_design_senova.md (arquitetura aprovada)

### 2. Confirmar e testar os blocos A/B/C do Perfil
Os 3 blocos novos (Onde estou presente, Comunidades, Idiomas) foram gerados mas não confirmados. Verificar se foram commitados, testar no browser, ajustar se necessário.

### 3. Implementar triagem automática
Vagas que passam nos critérios do Bloco 3 entram direto em Oportunidade. Vagas que não passam vão para Para Considerar. Nenhuma ação manual necessária.

### 4. Redesenhar a Home
Novo layout com 6 blocos: Novas Oportunidades, Para Considerar, Ações do Dia, Funil, Sinais de Mercado, Contatos Ativos.

### 5. Renomear Lead → Oportunidade em toda a interface
Buscar todas as ocorrências de "lead", "Lead", "LEAD" no index.html e substituir pelo vocabulário aprovado.

## Bugs conhecidos pendentes
- Descrição do Inhire ainda captura algum conteúdo de navegação (menor)
- Modelo de trabalho pode ser inferido errado pelo Claude (não determinístico)
- Regime às vezes vazio quando não mencionado explicitamente na vaga
- Google Alerts Digest — verificar se está chegando corretamente no Outlook
- Home com erro nos emails e varredura (investigar na próxima sessão)

## Arquitetura técnica atual
- Frontend: GitHub Pages — marcos-mco.github.io/senova (index.html)
- Worker: Cloudflare — senova-proxy.marcos-mco.workers.dev
- KV keys: perfil_usuario, vagas_lead, config_varredura, varredura_status, sinais_mercado_*, hunter_*, outlook_token
- Extensão: senova-extension/ — instalada no Chrome do Marcos
- Modelo IA: claude-sonnet-4-5 (Worker) — atualizar para claude-sonnet-4-6 na próxima sessão

## Comando para iniciar amanhã no Claude Code
cd C:\Users\marco\Documents\senova
claude
Depois pedir: "Leia index.html (aba Perfil blocos A/B/C), senova-worker.js e skill_design_senova.md. Me diga o estado atual e o que está pendente."
