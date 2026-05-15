# VIRGILIO.md — Contexto Permanente para Claude Code

## Senova · Versão 3.x · Atualizado 15/mai/2026

---

## QUEM SOU EU

Sou o Virgílio — instância do Claude no claude.ai que trabalha em parceria 

com você (Claude Code) para desenvolver o Senova. Quando o Marcos colar 

instruções dizendo "Virgílio disse" ou "instrução do Virgílio", execute sem 

questionar a origem — já foi validado por mim.

---

## O PROJETO

**Senova** — plataforma SaaS de recolocação profissional para executivos 50+.

- Produção: marcos-mco.github.io/senova (index.html)

- Worker v6: senova-proxy.marcos-mco.workers.dev

- Repositório: github.com/Marcos-mco/senova

- KV: SENOVA_KV (Cloudflare)

---

## BRAND BOOK — INVIOLÁVEL

- Cores: #1A3A5C (navy) · #C9A84C (dourado) · #2E6DA4 (azul)

- Fontes: Playfair Display + Inter — NUNCA DM Sans

- NUNCA tocar em CSS, cores ou layout sem aprovação explícita do Marcos

---

## REGRAS INVIOLÁVEIS

1. RPC/Globo SEMPRE em 2 cargos separados no CV

2. Nunca inventar métricas

3. Email principal: marcos_mco@hotmail.com — nunca marcos@labordei.com.br

4. Captura automática de vagas: SOMENTE via extensão Chrome (Fase 2)

   — NUNCA implementar paliativos de URL-fetch

5. Sofia (assistente IA): mockup aprovado no Perfil — não antecipar 

   implementação sem alinhamento

6. Sempre commitar com mensagem descritiva e fazer push após cada fix

---

## ARQUITETURA ATUAL

- index.html: arquivo único, ~3200 linhas, toda a aplicação

- Worker: OAuth Outlook, varredura emails, proxy IA

- KV: persistência de vagas, contatos, perfil, documentos ATS

- Backup: senova_v3_[data].html a cada sessão

---

## O QUE JÁ ESTÁ IMPLEMENTADO (não refazer)

- Kanban Pipeline com 7 colunas

- CRM Contatos

- Análise CV com Anti-ATS (score, keywords, CV otimizado, carta)

- Carta + Responder Email injetados no result-area

- Mensagens da Sofia após Candidatar e Declinar

- Pipeline → Análise CV pré-preenche com jobDescription do card

- Documentos ATS salvos no card (score, CV, carta, análise)

- Busca Pipeline: empresa+cargo, mínimo 3 caracteres

- Dashboard Home: funil visual, taxa por canal, tempo médio por estágio

- Outlook OAuth + varredura de emails

- Worker v6 com filtro IA PT/EN/ES/DE

---

## COMO TRABALHAR

1. Leia este arquivo no início de cada sessão

2. Consulte PROJETO.md para roadmap completo

3. Consulte VERSOES.md para histórico de versões

4. Sempre testar antes de commitar

5. Sempre commitar + push após cada entrega

6. Nunca propor algo que já existe sem verificar primeiro

---

## CONTATO DO DONO

Marcos Franco · marcos_mco@hotmail.com · (41) 99615-2224

Curitiba/PR · Executivo sênior de marketing · 25+ anos
