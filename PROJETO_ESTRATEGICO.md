# SENOVA — Projeto Estratégico
**Versão:** 2.0 · **Atualizado:** 26/mai/2026 · **Responsável:** Marcos Franco

---

## OBJETIVO ÚNICO

**Ser o sistema operacional pessoal da recolocação executiva para profissionais 35+.**

Colocar o executivo sênior na posição certa, no menor tempo possível, usando inteligência artificial para acessar o mercado oculto — onde 70–80% das vagas executivas vivem.

---

## POR QUE EXECUTIVOS SÊNIORES PRECISAM DE FERRAMENTA PRÓPRIA

- **ATS discrimina o experiente:** perfis com 20+ anos são filtrados antes do humano ver
- **Mercado oculto é o mercado executivo:** a maioria das vagas C-Level circula entre headhunters
- **Multi-idioma não é opcional:** profissionais 35+ disputam vagas em BR, ES, PT, DE
- **Candidatura executiva exige CV adaptado por vaga, idioma e cultura** — não template único

### O que nenhum concorrente oferece

| Concorrente | O que faz | O que não faz |
|-------------|-----------|---------------|
| Huntr / Teal | Organiza candidaturas públicas | Não acessa mercado oculto |
| Simplify | Preenche formulários (EUA) | Não faz BR/ES/DE/PT |
| LinkedIn Premium | Visibilidade passiva | Não age por você |
| **Senova** | **Tudo acima + Sofia + monitoring headhunters** | — |

---

## PERSONA PRIMÁRIA

**Marco** — Executivo Sênior em Recolocação (45–60 anos)
- Ex-diretor, head ou gerente sênior | Curitiba, SP, RJ, Buenos Aires, Lisboa
- Renda alvo: R$19–25k CLT (piso privado R$15k) — Europa sem valor definido, linha de exploração.
- Tempo médio de recolocação no mercado: 8–18 meses
- Canal prioritário: headhunters + rede pessoal + candidaturas diretas

**Comportamento esperado:** Acessa 3–5x/semana. Quer ver o que importa na Home. Quer agir com 1–2 cliques. Não tolera jargão tech.

---

## ESTADO ATUAL — v3.12.7 (25/mai/2026)

| Módulo | Status |
|--------|--------|
| Análise CV (Anti-ATS) + LinkedIn Optimizer | ✅ |
| Pipeline CRM (Kanban 6 colunas) + CRM Contatos | ✅ |
| Varredura Automática (Adzuna + Jobicy, cron 07h) | ✅ |
| OAuth Outlook (Mail + Calendar) + Candidatura | ✅ |
| Central de Sinais (emails + Google Alerts + RSS) | ✅ |
| Extensão Chrome (captura vagas) | ✅ |
| Sofia — 4 tabs (Bem-vinda, Tutorial, CV, Entrevista) | ✅ |
| PDF / .docx Executivo | ✅ |

**Custo fixo:** < R$100/mês | **Stack:** Vanilla HTML/CSS/JS — arquivo único, sem build

---

## FASES DO PROJETO

---

### FASE 1 — Produto Completo para 1 Usuário
**Janela:** jun–jul/2026
**Objetivo:** Senova é o único sistema operacional dos 3 planos de Marcos — sem planilhas ou apps paralelos.

#### Prioridades em ordem

**P1 — Plano A/B/C direto no Senova** *(alto valor — sistematiza os 3 planos)*
- Plano A = Recolocação CLT | Plano B = Consultoria | Plano C = Senova SaaS
- Pipeline com filtro/view por plano
- Home mostra KPIs separados por plano
- Card de Processo exige campo "Plano" obrigatório
- Perfil tem seção dedicada a cada plano (cargo alvo, pretensão, países)
- Critério: Marcos não usa planilha para nenhum dos 3 planos

**P2 — Responsivo Mobile** *(alto valor — acessibilidade real)*
- Funcionar em 768px+ (tablet/celular landscape)
- Bottom navigation mobile (Home, Processo, Sofia, Mais)
- Touch targets ≥ 44px em todos os botões e cards
- Kanban com scroll horizontal no mobile
- Critério: uso completo no iPhone sem pinch-to-zoom
- Referência: skill_pwa.md

**P3 — Perfil 9 Blocos** *(alto valor — fonte única de verdade)*
- Bloco 3: O que busco — critérios de triagem centralizados (alimenta varredura)
- Bloco 4: Plataformas de emprego — status por portal
- Bloco 5: Empresas-alvo — alimenta Central de Sinais
- Bloco 6: Comunidades e rede — mercado oculto
- Bloco 7: Radar — parâmetros centralizados (substituir configurações espalhadas)
- Bloco 8: Idiomas e documentos — CV por idioma (PT/EN/ES/DE)
- Critério: toda configuração vive no Perfil; zero duplicação

**P4 — Fluxo Candidatura End-to-End** *(alto valor — ação mais crítica)*
- 1 clique em "Candidatar" entrega: CV otimizado → .docx → envio Outlook → timeline → follow-up +7d
- Seleção inteligente de bloco de CV por setor da vaga
- Critério: nenhum passo manual entre "quero candidatar" e "enviado com follow-up agendado"

**P5 — Prompt Caching no Worker** *(alto ROI — economia ~85% custo API)*
- Implementar `anthropic-beta: 'prompt-caching-2024-07-31'` em todas as rotas
- Cachear: system prompt ATS, personalidade Sofia, prompt de classificação emails
- Atualizar modelo Worker: claude-sonnet-4-5 → claude-sonnet-4-6
- Referência: skill_api_claude.md

**P6 — Interface 4 Idiomas** *(médio valor)*
- Seletor global PT/EN/ES/DE na Home
- Critério: trocar idioma muda 100% da interface

**P7 — Importação Inteligente de Recrutadoras** *(médio valor)*
- Michael Page, Robert Half, Heidrick & Struggles: importar sem tag "Revisar"
- Lista de remetentes confiáveis configurável no Perfil

**P8 — Fixes críticos**
- B1: `openVagaModal('new')` prioridade `'lead'` → trocar para `'media'`
- B2: Worker modelo claude-sonnet-4-5 → claude-sonnet-4-6
- B3: Remover DM Sans do `<link>` no index.html (viola brand guide)

**P9 — Skills habilitadores (Fase 2)**
- Criar skill_onboarding.md — fluxo de primeira sessão
- Criar skill_ux_writing.md — glossário + microcopy

---

### FASE 2 — MVP Comercial
**Janela:** ago–set/2026
**Objetivo:** 5 assinantes pagantes validam o modelo. Senova está aberto ao público.
**Critério de sucesso:** 5 assinantes ativos em R$47–97/mês; churn < 20% no mês 1.

#### Infraestrutura

- **Domínio:** senova.com.br (R$47/ano)
- **Arquitetura:** landing page pública em senova.com.br + app em app.senova.com.br
- **Auth:** login email + senha ou OAuth Google; JWT por usuário
- **KV multi-usuário:** namespace `usuario:{id}:` por usuário
- **Billing:** Stripe (cartão) + Pagar.me (PIX)
- **PWA:** manifest.json + service worker → instalável no celular + notificações push
- **Segurança:** ver skill_security.md seção 6 (multi-usuário)

#### Tiers de produto

| Plano | Preço | Inclui |
|-------|-------|--------|
| Gratuito | R$0 | Análise CV (3/mês) + Pipeline (10 cards) |
| Pro | R$47/mês | Tudo + varredura automática + Sofia + Outlook |
| Executive | R$97/mês | Pro + sessão mensal com consultor parceiro (Consigliere) |

#### Go-to-market

1. **Rede pessoal de Marcos** — ex-colegas de RPC/Globo, Editel, Popper em recolocação (custo zero)
2. **Parceria Consigliere (Thiago Ayres)** — tier Executive cria receita para Consigliere também
3. **LinkedIn — mídia própria** — posts semanais sobre recolocação executiva (não sobre o produto)
4. **LIDE Paraná** — via Heloisa Garrett (gancho DLS/João Dória); público Executive
5. **Grupos 35+ (LinkedIn/WhatsApp/Slack)** — demonstração real, não pitch

#### Projeção financeira

| Marco | Assinantes | MRR | Custo API |
|-------|-----------|-----|-----------|
| Lançamento | 5 | R$235 | ~R$4 |
| 2 meses | 20 | R$940 | ~R$15 |
| 6 meses | 50 | R$2.350 | ~R$38 |
| 12 meses | 150 | R$7.050 | ~R$115 |

Break-even: 3 assinantes Pro cobrem toda a infraestrutura atual.

---

### FASE 3 — Sofia como Produto
**Janela:** out–nov/2026
**Objetivo:** Sofia cria retenção além da recolocação. Diferencial defensável.
**Critério:** Usuário usa Sofia ≥ 3x/semana sem solicitação ativa.

- **Avatar com voz** — integração Anam.ai
- **Modo coaching** — sessões semanais de 30min com pauta estruturada
- **Memória longa** — Sofia lembra 18 meses de histórico; conselho evolui com o tempo
- **Simulador avançado** — feedback de tom, velocidade, conteúdo (vídeo)
- **Preparação cultural** — DACH, Ibéria, LATAM: soft skills e etiqueta de entrevista

**Por que Sofia é defensável:** dados acumulados de 18 meses de histórico de um usuário são impossíveis de replicar. Cria lock-in por valor, não por contrato.

---

### FASE 4 — Escala
**Janela:** jan–jun/2027
**Objetivo:** 200 usuários pagantes; produto sustentável sem subsídio do fundador.

- **App nativo iOS + Android** — notificações push, captura de vagas mobile, Sofia
- **WhatsApp** — alertas de follow-up, vagas e reuniões
- **API de parceiros** — integração com outplacement e headhunters (B2B)
- **Senova Enterprise** — licenças para consultorias de carreira

---

## EXTENSÃO CHROME — ESTRATÉGIA

**Situação atual:** extensão própria (MV3, vanilla JS, ~300 linhas) — simples e funcional.

**Manutenção principal:** seletores CSS por site (LinkedIn, Gupy, Indeed, Catho) mudam com frequência.

**Estratégia:** manter extensão própria (controle total sobre envio ao Worker), mas adotar padrões open source para:
- Seletores de sites (monitorar projetos como `job-scraper-selectors` no GitHub)
- Autofill patterns (documentação open source de formulários por portal)

**Não substituir** a extensão por produto de terceiro — perderia integração direta com o Worker.

---

## DIFERENCIAIS INVIOLÁVEIS

1. **Mercado oculto primeiro** — headhunters, rede, comunidades antes de portais públicos
2. **Sofia é pessoal** — conhece o perfil completo; nunca dá conselho genérico
3. **Executivo, não júnior** — interface, copy e tom pressupõem 20+ anos de experiência
4. **Multi-idioma real** — adaptação cultural por mercado, não só tradução
5. **Privacidade** — dados no KV pessoal; sem compartilhamento entre usuários

---

## RISCOS E MITIGAÇÕES

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Custo Anthropic escala com usuários | Média | Alto | Prompt caching (P5) + limite de interações por tier |
| Churn alto (recolocação temporária) | Alta | Médio | Plano Executive com pós-recolocação (networking continuado) |
| Concorrente replica funcionalidades | Baixa | Alto | Sofia + dados históricos acumulados = defensável |
| Cloudflare Workers free tier insuficiente | Baixa | Médio | Workers Paid = $5/mês se necessário |
| Aquisição digital difícil para 35+ | Média | Alto | Consigliere + comunidades = canal principal |

---

## MÉTRICAS NORTH STAR

| Nível | Métrica | Meta |
|-------|---------|------|
| Usuário | Tempo médio de recolocação | < 90 dias (vs 8–18 meses no mercado) |
| Negócio | MRR | R$7.050 em 12 meses (150 assinantes) |
| Produto | Retenção semana 4 | > 60% |
| Produto | Sessões por semana | ≥ 3 por usuário ativo |

---

*v2.0 — 26/mai/2026: Sofia movida para Fase 3 (após MVP Comercial); mobile adiantado para Fase 1 (P2); Plano A/B/C elevado para P1; extensão Chrome estratégia definida; arquivos reorganizados (PERFIL_MARCOS.md, VERSOES_HISTORICO.md, skills novos)*
