# skill_design_senova — Design System & Brand Guide Senova Suite

Versão: 2.0 · Criado: abr/2026 · Atualizado: 20/mai/2026
Responsável: Marcos Franco · marcos_mco@hotmail.com

QUANDO USAR: Obrigatoriamente antes de qualquer alteração visual no Senova.

## 1. IDENTIDADE DA MARCA

Nome: Senova
Tagline PT: Sua carreira. Renovada.
Tagline EN: Your career. Renewed.
Domínio: senova.com.br · senova.ai

Logo: quadrado bordas arredondadas rx=14, fundo Azul Senova #1A3A5C, letra S branca bold, ponto dourado canto superior direito.

Personalidade: Experiente · Confiante · Humano · Direto
NUNCA: jovial demais · tecnicista · condescendente

## 2. PALETA DE CORES — IMUTÁVEL

Primárias: Azul Senova #1A3A5C (logo, títulos, sidebar, botão primário) · Dourado #C9A84C (acento, destaques, bordas ativas)
Secundárias: Azul Ação #2E6DA4 (botões, links) · Névoa #F0F4F8 (fundos) · Carvão #2C2C2A (texto)
UI: bg-page #F8F8F6 · bg-card #FFFFFF · bg-mist #F0F4F8 · bg-inactive #E8E4DB · border #E4E4E0 · border2 #C8C3B6
Texto: primary #2C2C2A · secondary #4A4A46 · tertiary #9A9A94
Estado: green #1A7A4A / #EAF7EF · amber #B8670A / #FFF8EC · red #C0281E / #FEF0EF

CSS Variables do produto:
--navy:#1A3A5C; --gold:#C9A84C; --action:#2E6DA4; --bg:#F7F5F0; --bg2:#ffffff; --bg3:#F0EDE6; --bg4:#E8E4DB; --border:#DDD9CF; --border2:#C8C3B6; --text:#1A1A16; --text2:#4A4740; --text3:#8A8680; --green:#1A7A4A; --green-bg:#EAF7EF; --amber:#B8670A; --amber-bg:#FFF8EC; --red:#C0281E; --red-bg:#FEF0EF; --radius:10px; --radius-lg:14px; --font-display:'Playfair Display',Georgia,serif; --font:'Inter',-apple-system,sans-serif;

NUNCA alterar sem aprovação explícita do Marcos Franco.

## 3. TIPOGRAFIA — IMUTÁVEL

Títulos hero: Playfair Display 700 / 40-56px
Títulos seção: Playfair Display 600 / 28-36px
Subtítulos: Inter 600 / 18-22px
Corpo: Inter 400 / 15-16px (mínimo 15px — público 30+)
Labels UI: Inter 500 / 12-13px
Labels caps: Inter 600 + letter-spacing 0.1em / 11px
Line-height mínimo: 1.5 em parágrafos
NUNCA usar DM Sans, Roboto, Arial ou qualquer outra fonte.

## 4. PÚBLICO-ALVO

Profissionais Sênior 30+ em recolocação ativa ou preventiva.
- Clareza sobre criatividade
- Alto contraste é prioridade
- Menos opções, fluxo guiado
- Feedback que o sistema trabalha por eles
- Uma ação principal clara por tela

## 5. TOM E LINGUAGEM

Evitar: "Ei, vamos lá!" / "Ferramenta incrível de IA" / "Você vai arrasar!"
Preferir: "Pronto para o próximo passo?" / "Inteligência a serviço da sua carreira" / "Sua experiência merece a posição certa"

Glossário obrigatório:
Lead = Oportunidade
Analisar CV = Analisar Vaga
Score = Compatibilidade
Pipeline = Processo
Limiar = Critério
Abaixo do limiar = Para Considerar
Candidatar = Enviar Candidatura
Deletar = Remover

## 6. ARQUITETURA DE TELAS

### Sidebar — ordem aprovada
1. Home (cockpit diário)
2. Perfil
3. Processo (Kanban)
4. Análise de Vaga
5. Entrevistas
6. Contatos

### Home — blocos em ordem de prioridade visual
1. Novas Oportunidades — vagas aprovadas nos critérios do Perfil (badge contador)
2. Para Considerar — link discreto (vagas abaixo dos critérios)
3. Ações do Dia — follow-ups vencidos, entrevistas agendadas
4. Funil Resumido — KPIs: Oportunidades / CV Enviado / Em Contato / Propostas
5. Sinais de Mercado — movimentações executivas relevantes
6. Contatos Ativos — próximos follow-ups

### Perfil — 9 blocos em ordem (arquitetura v4.0)

Bloco 1 — Quem sou
Nome, cargo alvo, email, telefone, LinkedIn URL, foto, idioma preferido (PT-BR / EN / ES / DE). Alimenta preenchimento automático de formulários pela extensão Chrome.

Bloco 2 — Meu CV Master
3 formas de entrada: upload (.docx/.pdf/.txt), importar do LinkedIn (colar URL ou texto), Sofia (conversa guiada). CV salvo no KV. Base para adaptações por vaga e idioma. Sofia fala PT/EN/ES/DE.

Bloco 3 — O que busco (FONTE ÚNICA de critérios de triagem)
Cargos alvo (palavras-chave), salário mínimo, localizações aceitas, modelo de trabalho (Presencial/Híbrido/Remoto), países/mercados (BR/ES/PT/DE/Remoto/EUA), score mínimo por região. Alimenta triagem automática — vagas que passam entram direto em Oportunidade no Pipeline.

Bloco 4 — Onde estou presente
4a. Plataformas de emprego: LinkedIn, Gupy, Indeed, Xing (DE), Wellfound, Catho, InfoJobs, StepStone, Vagas.com — status (cadastrado/atualizado/desatualizado) + data. Senova sugere novas plataformas baseado nos países alvo.
4b. Headhunters ativos: lista com nome, firma, prática, status (conectado/em processo/aguardando), último contato, próxima ação. Monitorados via Central de Sinais — alerta quando publicam vagas ou mudam de firma.
4c. Extensão Chrome: status de instalação. Se não instalada, guia a instalação em 3 cliques.

Bloco 5 — Empresas que acompanho
Lista de empresas-alvo. Alimenta Central de Sinais (Google News RSS) e alertas de movimentação executiva. Quando detecta saída de executivo ou expansão, sugere abordagem proativa — antes da vaga aparecer.

Bloco 6 — Comunidades e rede
Grupos onde o profissional está presente ou deveria estar: LinkedIn Groups, Slack, Discord, WhatsApp, associações setoriais, eventos. Senova sugere comunidades relevantes pelo setor, cargo alvo e países alvo. Porta de acesso ao mercado oculto (70-80% das vagas executivas nunca são publicadas).

Bloco 7 — Radar (parâmetros centralizados)
Configuração de varredura automática (palavras-chave, países, frequência), Google Alerts (termos monitorados), filtro de emails (domínios prioritários), alertas de follow-up (7/14/21 dias). Fonte única — hoje está espalhado em vários lugares.

Bloco 8 — Idiomas e documentos
Idiomas dominados com nível (nativo/avançado/intermediário). CV disponível por idioma (PT/EN/ES/DE). Carta modelo por idioma. Sofia pode gerar versões automaticamente. Detecção automática do idioma da vaga — sugere CV no idioma correto com opção de override manual.

Bloco 9 — Ferramentas
Otimizador LinkedIn (PT/EN/ES/DE), conexão Outlook/Microsoft 365, alerta de inatividade, configurações técnicas.

### Processo (Pipeline) — colunas aprovadas
Oportunidade → CV Enviado → Em Contato → Entrevista → Proposta → Fechado

### Fluxo de entrada único para todas as fontes
FONTE (Extensão Chrome / Varredura Adzuna+Jobicy / Email Outlook / Manual / Comunidades)
→ Triagem automática pelos critérios do Bloco 3 do Perfil
→ Passa: entra direto em Oportunidade no Processo (sem clique do usuário)
→ Não passa: vai para fila Para Considerar
Home avisa: "X novas oportunidades hoje" e "Y para considerar"

### Diferencial Senova vs concorrentes
- Huntr/Teal: organizam candidaturas públicas. Senova acessa o mercado oculto.
- Simplify: preenche formulários nos EUA. Senova faz em BR/ES/DE/PT.
- Nenhum concorrente: CV adaptado em 4 idiomas com detecção automática.
- Nenhum concorrente: Sofia como consultora de carreira pessoal com avatar (Fase 3).
- Nenhum concorrente: monitoramento de headhunters com alertas de movimentação.

## 7. PADRÕES DE COMPONENTE

Card de Vaga — padrão único para TODAS as telas:
1. Empresa (Playfair Display navy 14px bold)
2. Cargo (Inter 500 13px)
3. Localização + Modelo (Inter 400 text3 12px)
4. Badge Compatibilidade (>=75 verde / 50-74 âmbar / <50 cinza)
5. Badge Fonte (Varredura IA / Extensão Chrome / Email / Manual)
6. Data/hora (Inter 400 text3 12px)
7. Ação principal contextual por estágio
Nunca mostrar campos vazios — omitir se não houver dado.

Modal padrão: máx 600px · header fixo · body scroll · footer fixo · NUNCA modal sobre modal · botão destrutivo esquerda vermelho ghost · botão primário direita navy · altura mínima botões 44px

Botões: Primário (navy branco) · Secundário (gold navy) · Ghost (borda border2) · Perigo (borda red texto red)

Filtros: dropdown único "Organizar" agrupando ordenação + prioridade + canal · padrão Mais recente · filtro ativo ponto dourado

## 8. REGRAS DE INTERAÇÃO

Após qualquer CRUD: chamar aplicarFiltros() NUNCA só renderCRM()
NUNCA exigir F5 do usuário
Feedback visual em menos de 200ms
Operações longas: skeleton loader não spinner
Sucesso: toast verde canto inferior direito 3 segundos
Responsividade mínima: 1280px

## 9. NUNCA FAZER

Nunca DM Sans ou fonte fora do brand book
Nunca alterar variáveis CSS de cor sem aprovação do Marcos Franco
Nunca modal sobre modal
Nunca campos vazios visíveis no card
Nunca linguagem CRM exposta ao usuário (Lead, Pipeline, etc.)
Nunca reload após ação do usuário
Nunca erros técnicos — traduzir para linguagem humana

## 10. REFERÊNCIAS

Produto: https://marcos-mco.github.io/senova
Repositório: https://github.com/Marcos-mco/senova
Worker: https://senova-proxy.marcos-mco.workers.dev
Fontes: fonts.google.com/specimen/Playfair+Display + fonts.google.com/specimen/Inter
Brand Guide original: C:\Users\marco\OneDrive\Documentos\Senova\Senova___Brand_Guidelines_v1_0.docx

Skill consolidado em 20/mai/2026 · Atualizado 26/mai/2026
Atualizar a cada mudança de padrão aprovada pelo Marcos Franco.

## 12. WIREFRAMES — COMO DESENHAR ANTES DE IMPLEMENTAR

Antes de implementar qualquer tela nova ou refatoração de navegação, desenhar um wireframe em texto.
Isso evita retrabalho de CSS e alinha expectativa antes de tocar no código.

### Formato padrão de wireframe (ASCII)

```
┌─────────────────────────────────────────────────────┐
│ NOME DA TELA                          [ações header] │
├──────────┬──────────────────────────────────────────┤
│          │  ÁREA PRINCIPAL                          │
│ SIDEBAR  │  ┌─────────────┐  ┌─────────────┐       │
│          │  │ Card        │  │ Card        │       │
│ • Home   │  │ Empresa     │  │ Empresa     │       │
│ • Proc.  │  │ Cargo       │  │ Cargo       │       │
│ • Sofia  │  │ [Badge]     │  │ [Badge]     │       │
│          │  └─────────────┘  └─────────────┘       │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Regras de wireframe
- Usar ASCII simples: `┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼`
- Anotar dimensões em % ou px quando críticas
- Indicar estados: `[vazio]`, `[loading]`, `[erro]`, `[dado]`
- Indicar interações: `→ abre modal`, `→ navega para`, `→ expande`
- Nunca implementar sem wireframe aprovado por Marcos

---

## 13. ESTADOS DE COMPONENTE — PADRÃO OBRIGATÓRIO

Todo componente que busca dados ou recebe input deve ter 4 estados definidos:

| Estado | Visual | Comportamento |
|--------|--------|---------------|
| **Vazio** | Mensagem contextual + ação sugerida | Ex: "Nenhum processo ainda. + Novo" |
| **Loading** | Skeleton loader (não spinner) | Barras cinza animadas no lugar do conteúdo |
| **Erro** | Mensagem humana + botão retry | NUNCA mostrar código de erro técnico |
| **Dado** | Conteúdo real | |

### Skeleton loader — padrão
```css
.skeleton { background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%);
            background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
```

### Mensagens de estado vazio — por tela
- Processos: "Nenhum processo ativo. Adicione uma oportunidade ou importe vagas da varredura."
- Contatos: "Nenhum contato cadastrado. Adicione headhunters e recrutadores para acompanhar."
- Central de Sinais: "Conecte o Outlook para receber alertas de vagas e movimentações."
- Próximas Ações: "Tudo em dia. Sem ações urgentes no momento."

---

## 14. FLUXOS DE NAVEGAÇÃO

### Princípio cardinal (definido 25/mai/2026)
**Toda ação vive dentro de um card (Processo ou Contato). Nada flutua solto.**

Isso significa: ferramentas como Análise CV, Candidatura e Sofia devem ser acessíveis
DENTRO do card, não como destinos separados que exigem sair do pipeline.

### Fluxo principal — Oportunidade → Candidatura

```
[Home] → ver nova oportunidade no widget
    ↓
[Processos] → abrir card (clique)
    ↓
[Modal do card] → botão "Analisar"
    ↓
[Painel lateral ou modal] → análise ATS inline
    ↓
[Mesmo card] → botão "Candidatar" → enviar via Outlook
    ↓
[Card atualizado] → status "CV Enviado" + follow-up +7d agendado
```

### Fluxo captura via extensão

```
[Site de vaga] → clicar extensão Senova
    ↓
[Popup extensão] → dados pré-preenchidos
    ↓
[Confirmar] → vaga vai para "Vagas para revisar" no Worker
    ↓
[Home Senova] → widget mostra nova vaga
    ↓
[1 clique "Importar"] → card criado em Oportunidade com score ATS
```

### Fluxo follow-up (crítico para executivos)

```
[Home] → Próximas Ações mostra card vencendo hoje
    ↓
[1 clique] → abre card diretamente
    ↓
[Modal] → botão "Follow-up" → gera mensagem via IA
    ↓
[Enviar pelo Outlook] → timeline atualizada → próxima ação +14d
```

### Navegação sidebar — ordem por frequência de uso

```
1. Home (cockpit diário — sempre o ponto de partida)
2. Processos (kanban + contatos — onde o trabalho acontece)
3. Sofia (coaching + CV — ferramenta de suporte)
[ferramentas secundárias acessíveis de dentro dos cards, não no menu principal]
```

### Anti-padrões a evitar

- NUNCA exigir que o usuário navegue para outra página para agir sobre um card
- NUNCA ter "Análise CV" como destino principal — deve ser botão dentro do card
- NUNCA ter mais de 3 itens fixos no menu principal
- NUNCA perder o contexto (voltar para o topo da lista após ação num card)

---

## 15. RESPONSIVIDADE — BREAKPOINTS E COMPORTAMENTO MOBILE

Ver skill_pwa.md para regras completas de implementação.

| Largura | Layout | Sidebar | Cards |
|---------|--------|---------|-------|
| ≥ 1280px | Completo | 238px fixa | Grid normal |
| 960–1279px | Comprimido | 180px fixa | Grid comprimido |
| 768–959px | Tablet | Colapsada (ícones) | 1 coluna |
| < 768px | Mobile | Bottom nav (4 ícones) | 1 coluna, full-width |

### Bottom navigation mobile (< 768px)
```
┌──────────────────────────────────┐
│          [conteúdo]              │
├────────┬────────┬────────┬───────┤
│  🏠    │  📋    │  ✨    │  ···  │
│  Home  │ Proc.  │ Sofia  │  Mais │
└────────┴────────┴────────┴───────┘
```

Touch targets mínimos: 44×44px. Fonte mínima mobile: 15px (nunca reduzir para mobile).

## 11. IDIOMAS

Senova suporta 4 idiomas: Português (PT-BR), Inglês (EN), Espanhol (ES), Alemão (DE).

Seletor global na Home — afeta toda a interface do produto.

Regras de idioma por vaga:
- O sistema detecta automaticamente o idioma da vaga (pelo texto da descrição)
- Sugere o idioma do CV e carta no mesmo idioma da vaga
- Usuário pode fazer override manual — ex: vaga em inglês, CV em português
- CV e carta sempre gerados no idioma escolhido — nunca misturar idiomas

Detecção automática: analisarVaga() deve retornar campo "idioma_vaga" ("pt","en","es","de")
O campo idioma_cv no modal permite override — padrão = idioma_vaga detectado

Países e idiomas padrão:
- Brasil (BR): PT-BR
- Espanha / Portugal (ES/PT): ES ou PT
- Alemanha (DE): DE
- Remoto / EUA: EN
