# PROTOCOLO DE ABERTURA — VIRGÍLIO
## Executar no início de CADA sessão

### PASSO 1 — Ler obrigatoriamente (nesta ordem):
1. PROJETO.md
2. VERSOES.md
3. VIRGILIO.md
4. session_start.md (este arquivo)

### PASSO 2 — Ler todos os skills:
- skill_sofia.md
- skill_crm.md
- skill_dev_senova.md
- skill_design_senova.md
- skill_produto.md
- skill_concorrentes.md
- skill_linkedin.md
- skill_cv.md
- skill_pesquisa_exec.md
- skill_followup.md
- skill_business_plan.md
- skill_market_intel.md

### PASSO 3 — Reportar ao Virgílio:
1. Versão atual + último deploy + commit hash
2. Última sessão: o que foi entregue
3. Próximas prioridades documentadas
4. Skills carregados: todos OK ou algum problema?
5. Perguntar: "O que quer trabalhar hoje?"

---

## ESTADO ATUAL (25/mai/2026)

### Versões
| Artefato | Versão | Observação |
|---|---|---|
| index.html | **v3.12.7** | último commit `6273896` — VERSOES.md canonical |
| senova-worker.js | **v7.7** | Worker sem alteração desde 22/mai |
| Worker deployado | `007d2dec` | senova-proxy.marcos-mco.workers.dev |
| Modelo IA (Worker) | claude-sonnet-4-5 | — |
| Modelo IA (Frontend) | claude-sonnet-4-6 | ✅ Atualizado |

---

## MÓDULOS FUNCIONAIS

| Módulo | Status | Localização |
|---|---|---|
| Análise CV (Anti-ATS) | ✅ Funcional | `#page-ats` — ATS score, CV otimizado, carta |
| LinkedIn Optimizer | ✅ Funcional | `#page-linkedin` — headline/about/bullets 4 idiomas |
| Pipeline CRM (Kanban) | ✅ Funcional | `#page-crm` — 5 cols ativas + Aceito/Negado/Descartado |
| CRM Contatos | ✅ Funcional | `#page-crm` aba Contatos — timeline, Outlook |
| Sofia | ✅ Em produção | `#page-sofia` — 4 tabs (Bem-vinda/Tutorial/CV/Entrevista) |
| Varredura de vagas | ✅ Funcional | Cron 07h BRT — Adzuna + Jobicy, rotação países |
| OAuth Outlook | ✅ Funcional | Mail.Read + Mail.Send + Calendars.ReadWrite |
| Candidatura via Outlook | ✅ Funcional | Modal com carta + CV, envia via Graph API sendMail |
| Central de Sinais | ✅ Funcional | Home — Emails / Google Alerts / Vagas para revisar |
| Extensão Chrome | ✅ Funcional | `senova-extension/` — captura em qualquer site |
| Perfil (5 blocos) | ✅ Funcional | Blocos 1–4 + Bloco 5 Ferramentas salvam em `/api/perfil` |
| Perfil (Blocos A/B/C) | ✅ Funcional | save/load via `/api/perfil` confirmado |
| Home / Dashboard | ✅ Funcional | KPIs 2×2, funil, próximas ações, sinais |
| Botão + Novo | ✅ Funcional | Submenu Processo / Contato (sem "Atividade") |
| Modal Novo Processo | ✅ Funcional | Extração IA automática + validação campos obrigatórios |
| Modal Novo Contato | ✅ Funcional | Temperatura "—" padrão + validação Salvar completa |

---

## O QUE FOI ENTREGUE — sessão 25/mai/2026

### UX / Pipeline (12 commits)
- **+ Novo com submenu** — dropdown Processo / Contato substitui "+ Adicionar" (`fa5265a`)
- **Novo Processo** — renomeado de "Nova Vaga"; extração automática IA (Empresa, Cargo, Localização com highlight); botão Salvar independente; validação asteriscos (*) em Empresa e Cargo (`059448c` · `d6b1424` · `198e84d`)
- **Novo Contato** — temperatura padrão "—"; asteriscos em Nome/Email/Telefone/Data; validação Salvar completa; reset completo incluindo `mc-next-err` e `tlForm` (`b21344d` · `956bd2a` · `4a7ef24` · `c01dff1`)
- **Bug Kanban** — card novo não aparecia com filtro ativo; `saveVaga` chama `aplicarFiltros()` quando `filtroAtivo`; botões arquivados e limpeza em lote removidos do header (`c62585a`)
- **Analisar Candidatura** — salva card antes de abrir análise; corrige vínculo `atsOrigemVagaId` para vagas novas (`7d1231e`)

### Docs / CV (3 commits)
- **DLS sempre obrigatória** — DLS movida para fora do `BLOCO_GRAFICO` nos CVs PT/EN/ES; regras de uso e gancho estratégico Heloisa Garrett documentados no VIRGILIO.md (`64f4a86`)
- **MBA FGV** — nome completo `MBA em Administração de Empresas — FGV Curitiba (1998–2000)`; nunca associar a Marketing (`75b07dd`)
- **PDF executivo** — duplo cabeçalho corrigido: título extraído de `cvLinhas[1]`, corpo usa `cvCorpo` (`6273896`)

### Decisões de produto (PROJETO.md)
- **Conceito de Atividade**: toda ação vive num card existente (Processo ou Contato); nada flutua solto
- **Botão + Novo**: exatamente duas opções — Processo / Contato; nunca "Atividade"

---

## PENDÊNCIAS — Por ordem de prioridade

### FASE 1 — MVP para 5 usuários reais

1. **Sofia contextual flutuante** ← PRÓXIMA PRIORIDADE DE PRODUTO  
   Redesenho como presença contextual em todas as páginas; comportamento muda por página e estágio de relacionamento (skill_sofia.md seções 5 e 7)
2. **skill_onboarding.md** — criar skill de onboarding para novos usuários (fluxo primeira sessão, perguntas guiadas, configuração do Perfil)
3. **skill_ux_writing.md** — criar skill de UX writing (microcopy, labels, mensagens da Sofia por contexto, glossário de interface)
4. **Filtros Plano A/B/C no Pipeline** — verificar se já implementado antes de executar
5. **Aba Perfil — portais** — otimização múltiplos portais (Gupy, Indeed, Catho, Reed, StepStone)
6. **Comunidades 35+** — mapear e indicar no Senova
7. **Cursos via Claude** — sugestões por lacuna no perfil
8. **4 idiomas** — interface PT/EN/ES/DE
9. **Michael Page automático** — remetente reconhecido, importação sem tag Revisar
10. **Preenchimento automático nos portais** — autofill

### FASE 2 — MVP Comercial

11. **senova.com.br + multi-usuário** — domínio próprio (R$47/mês) + múltiplos perfis
12. **Business Plan** — modelo de negócio, precificação, go-to-market, projeções
13. **WhatsApp notificações** — alertas de follow-up, vagas e reuniões
14. **App mobile (iOS + Android)** — experiência nativa 50+

### Bugs abertos

| # | Bug | Prioridade |
|---|---|---|
| B1 | `openVagaModal('new')` seta `mv-prioridade.value='lead'` — campo aceita apenas `alta`/`media`/`baixa`; nova vaga abre sem prioridade válida. Fix: trocar para `'media'` | Média |
| B2 | Extensão Inhire ainda captura algum conteúdo de navegação | Baixa |

---

## REGRAS INVIOLÁVEIS

### Desenvolvimento
- **Nunca chamar `api.anthropic.com` do browser** — toda chamada IA passa pelo Worker. `Ctrl+F` antes de qualquer commit do `index.html`.
- **Nunca substituir `index.html` por arquivo do Claude.ai** — sempre editar via Claude Code.
- **Salvar backup antes de editar**: `senova_v[N]_[data].html`.
- **Nunca refatorar CSS junto com correção de bug** — mudanças isoladas.

### Deploy
- **Frontend**: `git add index.html && git commit -m "..." && git push origin main` → GitHub Pages em ~30s.
- **Worker**: `npx wrangler deploy` (somente quando `senova-worker.js` mudar).

### Brand (nunca alterar sem aprovação explícita de Marcos)
| Token | Valor |
|---|---|
| Azul navy | `#1A3A5C` |
| Dourado | `#C9A84C` |
| Ação/link | `#2E6DA4` |
| Fundo | `#F0F4F8` |
| Texto | `#2C2C2A` |
| Fonte títulos | **Playfair Display 700** — nunca substituir |
| Fonte corpo | **Inter 400/500/600** — nunca DM Sans |
| Tamanho mínimo corpo | 16px — público 40+ |

### Sessão
- Um passo de cada vez.
- Descrever antes de executar.
- Aguardar aprovação antes de avançar.
- Ler arquivos locais ANTES de qualquer proposta.
- Nunca rodar à frente do Virgílio.

---

## REFERÊNCIAS RÁPIDAS

- **Produção**: https://marcos-mco.github.io/senova
- **Worker**: https://senova-proxy.marcos-mco.workers.dev
- **Repo**: https://github.com/marcos-mco/senova
- **KV keys ativas**: `perfil_usuario`, `vagas_lead`, `config_varredura`, `varredura_status`, `outlook_token`, `emails_vistos`, `whitelist_dominios`, `sinais_mercado_*`, `hunter_*`, `stats_*`
- **Cron Worker**: `0 10 * * *` = 07h BRT — varredura Adzuna + Jobicy
- **OAuth scopes**: Mail.Read + Mail.Send + Calendars.ReadWrite + offline_access
- **Azure Client ID**: `eaf69797-def3-4f6a-a103-8bcb3ed0f79e` (tenant: `consumers` — Hotmail pessoal)
