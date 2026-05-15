# Senova Suite — Documento de Projeto
**Versão:** 3.0 · **Atualizado:** 15/mai/2026 · **Responsável:** Marcos Franco

---

## 1. Visão Geral

**Senova Suite** é uma plataforma pessoal de recolocação executiva construída como aplicação web única (*single-file app*), hospedada no GitHub Pages e integrada à API da Anthropic via proxy Cloudflare Workers.

**URL de produção:** https://marcos-mco.github.io/senova  
**Worker proxy:** https://senova-proxy.marcos-mco.workers.dev  
**Repositório:** https://github.com/marcos-mco/senova  

---

## 2. Arquitetura Técnica

```
[Usuário / Browser]
        │
        ▼
[GitHub Pages — index.html]
        │  fetch POST
        ▼
[Cloudflare Worker — senova-proxy]
        │  x-api-key (secret)
        ▼
[Anthropic API — claude-sonnet-4-5]
        │
        ▼
[Cloudflare KV — SENOVA_KV]
```

### Decisões técnicas registradas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Hospedagem | GitHub Pages | Gratuito, versionado, deploy por commit |
| Proxy | Cloudflare Workers | Elimina CORS, protege API key, gratuito até 100k req/dia |
| Banco de dados | Cloudflare KV | Sem servidor, persiste dados entre sessões |
| Framework | Vanilla HTML/CSS/JS | Arquivo único, sem build, sem dependências |
| Modelo IA | claude-sonnet-4-5 | Único modelo que funciona no endpoint atual |
| Fonte display | Playfair Display 700 | Brand book Senova — NUNCA substituir |
| Fonte corpo | Inter 400/500/600 | Brand book Senova — NUNCA usar DM Sans |

### Regras invioláveis de design (Brand Book)

- Azul: `#1A3A5C` · Dourado: `#C9A84C` · Ação: `#2E6DA4` · Névoa: `#F0F4F8` · Carvão: `#2C2C2A`
- Fontes: Playfair Display (títulos) + Inter (corpo) — jamais DM Sans
- Público 40+: fontes grandes, alto contraste
- Tom: Experiente · Confiante · Humano · Direto
- **Nunca tocar em CSS/cores/fontes/layout sem aprovação explícita**

---

## 3. Módulos Atuais (v3.1 — mai/2026)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Anti-ATS (agora "Análise CV") | ✅ Funcional | Analisa vaga, gera CV adaptado, score ATS, keywords |
| LinkedIn | ✅ Funcional | Otimiza headline, about e experiência em PT/EN/ES |
| Pipeline CRM (Kanban) | ✅ Funcional | Kanban 5 colunas + drag-and-drop + arquivamento |
| Simulador de Entrevista | ✅ Funcional | 5 perguntas calibradas + feedback por resposta |
| CRM Contatos | ✅ Funcional | Módulo completo com modal, canal e vaga vinculada |
| Central de Sinais | ✅ Funcional | Alertas de mercado classificados por IA na Home |
| Carta de Apresentação | ✅ Funcional | Gerada via IA, visível na aba Análise CV após análise |
| Timeline por card | ✅ Funcional | Histórico de movimentações + eventos Outlook por vaga |
| Toggle Outlook | ✅ Funcional | Liga/desliga integração Outlook direto no header da Home |
| Sofia (esboço) | 🔶 Esboçado | Seção de entrada do CV na aba Perfil — implementação pendente |

### Funcionalidades implementadas por sessão (mai/2026)

#### 13/mai/2026 — Kanban e UX
- **Drag-and-drop** funcional no Kanban — arrastar card muda status e salva no KV
- **Modal Editar Vaga corrigido** — cabe na tela sem scroll, campos organizados
- **Geração de CV em .docx real** via html-docx-js (CDN) — substituiu Word 97 quebrado
- **Campo Notas expandido** (rows 2→4) no modal de edição
- **Fluxo Analisar→Candidatar corrigido** — usa ID da vaga, não match por nome
- **Cards com data e hora** — formatação completa

#### 13–14/mai/2026 — Rastreabilidade e filtros
- **createdAt / updatedAt separados** — `createdAt` imutável, `updatedAt` atualizado a cada mudança
- **Retroatividade de datas** — migração automática de vagas sem data
- **Filtros pill** no Pipeline — prioridade, canal, coluna, com contador de resultados
- **Busca em tempo real** no Pipeline — filtra por empresa/cargo sem mostrar arquivados
- **Alerta de inatividade 7 dias** — badge vermelho automático nos cards parados
- **Inatividade configurável** — threshold ajustável por usuário
- **Data completa nos cards** — dia, mês, hora visíveis sem hover

#### 14/mai/2026 — Timeline e Outlook
- **Timeline por card** — histórico de eventos: criado, movido, email enviado, candidatura
- **OAuth Calendars.ReadWrite** — acesso ampliado para criar eventos no Outlook Calendar
- **Toggle switch Outlook** no header da Home — conecta/desconecta sem sair da tela
- **Evento Outlook via Graph API** — criar lembrete de follow-up direto do card
- **Timeline simplificada** — só eventos relevantes, sem ruído
- **Mini-modal próxima ação obrigatória** ao mover card no Kanban

#### 14/mai/2026 — Home e sinais
- **Central de Sinais na Home** — alertas RSS classificados por IA (Oportunidade/Sinal/Radar)
- **Cockpit da Home** redesenhado — Próximas Ações como item de ação clicável
- **Arquivar Aceito/Negado** — cards dessas colunas movidos para arquivo, fora da busca
- **Contador no header** do Pipeline — total de vagas ativas

#### 14–15/mai/2026 — CRM Contatos e Comunicação
- **CRM Contatos evoluído** — módulo completo com lista, busca, filtros por canal e vaga
- **Modal de contato** — campos: nome, empresa, cargo, canal, vaga vinculada, notas, LinkedIn
- **Central de Comunicação por contato** — histórico de interações por canal (LinkedIn, Email, WhatsApp)
- **Carta de Apresentação** gerada por IA na aba Análise CV — aparece sempre após análise
- **Responder Email** — botão permanente na aba Análise CV para redigir resposta ao recrutador
- **Carta de Apresentação e Responder Email** sempre visíveis após análise (fix visibility)
- **Renomear menu lateral** — Anti-ATS → "Análise CV", Networking → "Contatos"
- **Seção entrada CV com Sofia** esboçada no Perfil

---

## 4. Pendências Abertas (15/mai/2026)

| Item | Descrição | Prioridade |
|------|-----------|------------|
| Remote Control | Módulo para envio de comandos remotos / automações — ainda não implementado | Alta |
| Falso positivo na busca | Busca do Pipeline às vezes retorna vagas que não deveriam aparecer — investigar filtro | Média |
| Dashboard rico | Home com gráficos reais: funil, taxas de conversão, canal vs resposta | Média |
| Carta de Apresentação — testes | Validar resultado da IA com vagas reais antes de dar como funcional | Média |
| Sofia — implementação | Esboço existe na aba Perfil; lógica de entrada e análise do CV do Marcos ainda ausente | Alta |

---

## 5. Infraestrutura e Credenciais

| Item | Valor | Onde gerenciar |
|------|-------|----------------|
| GitHub repo | github.com/marcos-mco/senova | github.com |
| Cloudflare login | marcos_mco@hotmail.com | dash.cloudflare.com |
| Worker name | senova-proxy | CF → Workers & Pages |
| KV Namespace | SENOVA_KV | CF → KV |
| API Key Anthropic | Configurada como secret no Worker | CF → Workers → senova-proxy → Settings → Variables |
| Hunter.io API Key | Configurada como secret no Worker | CF → Workers → senova-proxy → Settings → Variables (HUNTER_API_KEY) |
| E-mail profissional | marcos@labordei.com.br | Microsoft 365 |
| DNS | Cloudflare (labordei.com.br) | NS: lilyana + merlin |
| Azure App | Senova Suite — Client ID: eaf69797-def3-4f6a-a103-8bcb3ed0f79e | portal.azure.com |
| Azure Tenant | b7fdfe9f-441d-4571-90f1-6882e06fb8a7 | portal.azure.com |

---

## 6. Ferramentas Externas Instaladas (11/mai/2026)

| Ferramenta | Status | Observação |
|---|---|---|
| Google Alerts | ✅ Ativo | 36 alertas — Brasil, Alemanha, Espanha, mídia/TV |
| Pasta "Alertas Senova" Outlook | ✅ Ativo | Regras automáticas: Google Alerts + LinkedIn → pasta |
| Hunter.io | ✅ Cadastrado | API Key salva — integrar ao Worker (HUNTER_API_KEY) |
| Lusha | ❌ Bloqueada | Conta suspensa — substituída pelo Hunter.io |
| Gupy | ✅ Atualizado | Perfil completo: formação, experiências, 30 habilidades |

### Google Alerts — categorias monitoradas
- Movimentações executivas Brasil (Paraná, Sul, C-Level)
- Empresas europeias chegando ao Brasil (DE, ES)
- Mídia, TV, comunicação — afiliadas Globo, grupos regionais
- Fusões, aquisições, expansões no Paraná
- Startups com captação em Curitiba/PR
- Nome próprio: "Marcos Franco" marketing Curitiba

---

## 7. Processo de Atualização (como fazer deploy)

1. Editar o arquivo `index.html` localmente ou via Claude
2. Acessar **github.com/marcos-mco/senova**
3. Clicar em `index.html` → ícone lápis ✏️
4. Selecionar tudo (`Ctrl+A`) → colar novo conteúdo
5. Clicar em **Commit changes**
6. Aguardar ~30 segundos → recarregar com `Ctrl+Shift+R`

**Regra de ouro:** sempre verificar que o arquivo não contém `api.anthropic.com` antes de publicar.  
**Verificação rápida:** `Ctrl+F` por `api.anthropic.com` → deve retornar zero resultados.

---

## 8. Roadmap (atualizado 15/mai/2026)

### Fase 1 — Validar e aprovar tudo o que foi implementado (mai/2026)

- [ ] Testar Carta de Apresentação com vagas reais — validar qualidade do output da IA
- [ ] Testar drag-and-drop em mobile e Safari — confirmar compatibilidade
- [ ] Corrigir falso positivo na busca do Pipeline
- [ ] Validar Timeline — eventos aparecem corretamente ao mover cards
- [ ] Confirmar toggle Outlook estável — conectar/desconectar sem bugs
- [ ] Revisar CRM Contatos — fluxo completo de adicionar contato + registrar interação
- [ ] Testar Central de Sinais com dados RSS reais
- [ ] Avaliar e aprovar módulo Remote Control antes de implementar

#### Itens concluídos (referência)
- [x] Drag-and-drop Kanban (13/mai)
- [x] Modal Editar Vaga corrigido (13/mai)
- [x] Timeline por card (14/mai)
- [x] Central de Sinais na Home (14/mai)
- [x] CRM Contatos evoluído — modal, canal, vaga vinculada (14–15/mai)
- [x] Carta de Apresentação na aba Análise CV (15/mai)
- [x] Toggle Outlook no header da Home (14/mai)
- [x] Filtros pill no Pipeline (14/mai)
- [x] Busca em tempo real no Pipeline (14/mai)
- [x] Colunas Aceito/Negado arquivadas (14/mai)
- [x] Sofia esboçada na aba Perfil (14/mai)
- [x] Varredura automática de vagas via RSS (12/mai)
- [x] Varredura de sinais de mercado (12/mai)
- [x] Integração Hunter.io (12/mai)
- [x] Dashboard estratégico (12/mai)
- [x] Alertas de follow-up 7/14/21 dias (12/mai)

### Fase 2 — Business Plan Senova (jun/2026)

- [ ] **Definir modelo de negócio:** assinatura mensal, freemium, ou licença anual
- [ ] **Precificação:** referência atual R$47/mês — validar com público 50+
- [ ] **Landing page Senova** separada do app pessoal
- [ ] **Registro do domínio senova.com.br** (~R$47/ano)
- [ ] **Estrutura multi-usuário:** KV por usuário, autenticação, isolamento de dados
- [ ] **Definir MVP para terceiros:** quais módulos incluir na versão paga

### Fase 3 — Sofia (jul/2026)

Sofia é a assistente IA integrada ao Senova que analisa o CV do Marcos e personaliza todo o fluxo.

- [ ] **Entrada do CV:** upload ou cole o CV na aba Perfil (seção já esboçada)
- [ ] **Análise inicial:** Sofia lê o CV e extrai perfil executivo — cargo-alvo, diferenciais, setores
- [ ] **Personalização automática:** Anti-ATS, LinkedIn Optimizer e Carta de Apresentação usam o perfil do CV como contexto
- [ ] **Sugestões proativas:** Sofia identifica gaps entre o CV e as vagas em pipeline
- [ ] **Memória de sessão:** Sofia lembra o contexto entre módulos sem repedir perguntas

### Fase 4 — MVP Multi-usuário (ago/2026)

- [ ] Migrar de GitHub Pages para infraestrutura com autenticação real
- [ ] Avaliar migração para Cowork ou Vercel para suportar múltiplos usuários
- [ ] Gmail OAuth para monitorar e-mails de candidaturas
- [ ] Análise de padrões por IA: quais vagas têm mais retorno, quais headhunters respondem

---

## 9. Arquitetura de Inteligência de Mercado (definida 11/mai/2026)

### Varredura 1 — Oportunidades de emprego
```
RSS: LinkedIn Jobs + Indeed BR/DE/ES + Infojobs ES + Stepstone DE
        ↓
Cloudflare Worker (cron 07:00 diário)
        ↓
Filtra por keywords: marketing, CMO, diretor, head, comercial, expansão
        ↓
Score ATS automático via Claude API
        ↓
Coluna "Lead" no CRM com badge "Nova hoje"
```

### Varredura 2 — Sinais de mercado
```
Google News RSS (empresas-alvo cadastradas)
        ↓
Detecta: "saiu", "deixa cargo", "novo CEO", "expansão", "fusão", "contratou"
        ↓
Claude analisa: empresa, cargo vago, contato do Marcos lá
        ↓
Hunter.io API busca email do decisor
        ↓
"Central de Sinais" no Senova com mensagem sugerida pronta
```

---

## 10. Headhunters Contatados (mai/2026)

| Nome | Firma | Status | Próximo passo |
|---|---|---|---|
| Priscilla Capellato | Korn Ferry | Convite LinkedIn enviado 11/mai | Aguardar aceite → enviar mensagem |
| Aldo Bergamasco | Spencer Stuart | Convite com nota enviado 11/mai | Aguardar aceite → enviar mensagem |
| Guilherme Maciel | Heidrick & Struggles | Mensagem enviada 11/mai | Aguardar resposta |
| Ângela Pêgas | Egon Zehnder | Convite enviado 11/mai | Aguardar aceite |
| Ezequiel Silva | Egon Zehnder | Convite enviado 11/mai | Aguardar aceite |
| Robert Half | — | Cadastrado | Follow-up semana 12/mai |
| Hays | — | Cadastrado | Follow-up semana 12/mai |
| PageExecutive | — | Cadastrado portal | Follow-up semana 12/mai |
| Michael Page | — | A contatar | Buscar consultor Sul no LinkedIn |
| Evermonte | — | Cadastrado portal | — |
| deBernt | — | A contatar | — |
| Odgers Berndtson | — | A contatar | — |

---

## 11. Arquivos no Repositório

| Arquivo | Status | Ação |
|---------|--------|------|
| `index.html` | ✅ Ativo — versão de produção | Nunca excluir |
| `PROJETO.md` | ✅ Ativo | Manter atualizado a cada sessão |
| `VERSOES.md` | ✅ Ativo | Manter atualizado a cada sessão |
| `README.md` | ✅ Ativo | Manter atualizado |
| `senova-worker-v6.js` | ✅ Referência | Versão de produção está no Cloudflare |

---

## 12. Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| API key expirar/vazar | Baixa | Alto | Configurada como secret no Worker — nunca exposta no código |
| GitHub Pages fora do ar | Muito baixa | Médio | Backup do index.html neste projeto Claude |
| KV perder dados | Muito baixa | Alto | Exportar backup mensal dos dados via `/api/vagas` |
| Limite Cloudflare gratuito (100k req/dia) | Baixa | Médio | Uso pessoal — estimativa de ~50 req/dia |
| Lusha bloqueada | ✅ Resolvido | — | Substituída pelo Hunter.io |

---

## 13. Glossário

| Termo | Significado |
|-------|-------------|
| ATS | *Applicant Tracking System* (sistema de triagem automática de currículos) |
| Worker | Script Cloudflare que roda na borda da rede, sem servidor |
| KV | *Key-Value store* — banco de dados simples do Cloudflare |
| PMV | Produto Mínimo Viável |
| Brand Book | Guia de identidade visual — cores, fontes, tom de voz |
| Cron trigger | Tarefa agendada — executa automaticamente em horário definido |
| RSS | Feed de conteúdo estruturado — permite leitura automática de notícias e vagas |
| Social listening | Monitoramento de sinais públicos (notícias, LinkedIn) para detectar oportunidades |
| Sofia | Assistente IA integrada ao Senova — lê o CV do Marcos e personaliza o fluxo |
| Remote Control | Módulo planejado para automações e comandos remotos no Senova |

---

*Documento mantido no repositório GitHub e no Projeto Claude de Marcos Franco.*  
*Versão 1.0: 04/mai/2026 · Versão 2.0: 11/mai/2026 · Versão 3.0: 15/mai/2026*
