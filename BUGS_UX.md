# SENOVA — Bugs e UX Issues (Diagnóstico de Campo)
**Levantamento:** Marcos Franco · **Data:** 26/mai/2026
**Fonte:** uso real + comparação com Huntr
**Status:** aguardando triagem e priorização por sessão

---

## BUGS CONFIRMADOS (comportamento errado que precisa de fix)

### B4 — Email: abre janela ruim, sem funcionalidade real
**O que acontece:** ao clicar num email da Central de Sinais, abre uma janela que é difícil de ler e não tem as ações necessárias.
**O que deveria ter:** além de Responder, precisa de ações como Aceitar / Declinar / Neutro / Marcar como vaga / Arquivar. O email de um recrutador não é só para responder — é para classificar e agir.
**Impacto:** alto — bloqueia o fluxo principal de candidatura via email.
**Fix:** redesenhar o modal de email com 4–5 ações contextuais + leitura confortável (fonte ≥ 15px, padding, preview completo).

### B5 — Cards não são excluídos quando excluídos
**O que acontece:** ao excluir (ou arquivar?) um card, ele continua aparecendo.
**Impacto:** alto — confunde o usuário e polui o pipeline.
**Fix:** verificar se `saveVagas()` está chamando `aplicarFiltros()` após exclusão. Verificar se o status "descartado" está sendo filtrado corretamente na renderização.

### B6 — Perde tudo ao sair da página com formulário preenchido
**O que acontece:** usuário preenche campos no modal de Novo Processo (ou outro formulário) e navega para outra página — perde tudo ao voltar.
**Impacto:** alto para mobile, médio para desktop.
**Fix:** salvar rascunho no localStorage a cada mudança de campo (`oninput`). Ao abrir modal novo, verificar se há rascunho salvo e oferecer "Continuar de onde parou?"

### B7 — Não consegue gerar card novo (cenário específico a reproduzir)
**O que acontece:** em algum fluxo específico, o botão de criar novo card não funciona.
**Status:** reproduzir o cenário exato antes de corrigir.
**Próximo passo:** Marcos descrever os passos exatos que levam ao problema.

### B8 — "Recarregar emails" vs "Atualizar" — fazem coisas diferentes mas o usuário não distingue
**O que acontece:** dois botões/ações com nomes parecidos que têm comportamentos diferentes (um faz fetch do servidor, outro renderiza o que já está em memória).
**Fix:** unificar em um único botão "Atualizar" que sempre faz o fetch completo. Ou nomear claramente: "Buscar novos emails" vs "Aplicar filtros".

### B9 — Alertas (job alerts + Google Alerts) não aparecem / fluxo quebrado
**O que acontece:** o fluxo de alertas não está chegando corretamente na interface.
**Status:** diagnosticar se é bug do Worker (não está separando alertas de emails) ou da UI (não está renderizando).

---

## PROBLEMAS DE UX (comportamento tecnicamente funcional mas ruim de usar)

### UX1 — Não há atalho para "Novo Processo" na Home
**Problema:** o único caminho para criar um novo processo é ir até a aba Processos e clicar "+ Novo". Na Home, não há esse acesso rápido.
**Impacto:** todo dia o usuário vê oportunidades na Home mas precisa navegar para criá-las.
**Fix:** botão "+ Nova Oportunidade" direto na Home, acima das Próximas Ações.

### UX2 — Emails irrelevantes poluem a Central de Sinais
**Problema:** emails de newsletters, promoções e outros irrelevantes aparecem misturados com vagas e alertas importantes.
**Fix:** filtro "Irrelevante" no Worker já existe parcialmente. Implementar lista de remetentes/domínios bloqueados configurável no Perfil (Bloco 7 — Radar). Emails bloqueados nunca aparecem — não precisam nem ser vistos.

### UX3 — Alertas de emprego e Google Alerts misturados com emails de processo
**Problema:** todos os emails chegam no mesmo lugar. Um email de follow-up de recrutador e um Google Alert de movimentação executiva têm peso diferente mas aparecem igual.
**Fix:** implementar os 3 fluxos (ver seção abaixo).

---

## IDEIA DE PRODUTO — 3 FLUXOS DE EMAIL (ideia de Marcos, 26/mai/2026)

Esta é uma visão de produto que nenhum concorrente tem. Documentada aqui para avaliar no roadmap.

### Os 3 fluxos

**Fluxo 1 — Processo** (vai para Central de Sinais / Pipeline)
- Recrutadores, headhunters, respostas de candidatura
- Ação: Aceitar / Declinar / Responder / Atualizar card
- Configuração: remetentes confiáveis (Michael Page, Robert Half, Korn Ferry…)

**Fluxo 2 — Mercado** (vai para nova aba "Mercado")
- Board Academy, newsletters executivas, conteúdo 35+, Google Alerts de setor
- Configuração no Perfil: temas de interesse (cursos, tendências, setores)
- Lê quando quer, não polui o processo
- Pode incluir sugestões de cursos/certificações por lacuna no perfil

**Fluxo 3 — Irrelevante** (bloqueado pelo Worker)
- Nunca aparece
- Lista negra de domínios/remetentes configurável no Perfil

### Por que isso é forte como produto
O Senova vira o único lugar onde um executivo 35+ gerencia não só a busca ativa — mas também o desenvolvimento e a inteligência de mercado. Nenhum concorrente chega perto disso.

### Esforço estimado
- Worker: separar classificação em 3 buckets em vez de 2 — médio
- Frontend: nova aba "Mercado" no menu — médio
- Perfil Bloco 7: UI para configurar remetentes por fluxo — médio
- Total: 1 sprint de 2 sessões

### Posição sugerida no roadmap: Fase 1, após Plano A/B/C e Mobile

---

## APRENDIZADOS DO HUNTR — EXTENSÃO CHROME

**Fonte:** screenshot da extensão + email da equipe Huntr (26/mai/2026)

### O que a extensão do Huntr oferece (tela principal)
| Seção | Ação |
|-------|------|
| Save Jobs | Save Job to Board (1 clique) |
| Autofill + Materials | Autofill Application |
| | Build a Resume |
| | Build a Job Tailored Resume |
| | Generate a Cover Letter |
| Other | Home / Settings |

### Filosofia declarada pelo Huntr
> *"Extracting keywords from messy job descriptions, autofilling application forms with tailored materials and saving job details automatically — all without ever switching tabs."*

**Insight crítico: "without ever switching tabs"** — esta é a diferença central. O Huntr não manda você para outro lugar. A ferramenta vem até você, no contexto da vaga que você está vendo.

### O que o Senova deve aprender
1. **"Without switching tabs"** → confirma a direção: Análise CV deve abrir inline no card, não ser uma página separada
2. **"Job Tailored Resume"** → é exatamente o que fazemos com Análise CV — mas o Huntr faz isso diretamente da extensão, sem precisar copiar/colar a descrição
3. **Autofill Application** → para Fase 3 do Senova (preencher formulários nos portais BR/ES/DE/PT)
4. **Save Job to Board** → nosso equivalente já existe. Verificar se é tão fluido quanto o Huntr

### O que o Huntr NÃO tem (nossos diferenciais)
- Análise ATS com score
- Sofia (coaching com IA)
- Integração Outlook (email + calendário)
- Multi-idioma real (PT/EN/ES/DE)
- Varredura automática de vagas
- Foco executivo 35+

### O que o Huntr tem e nós não temos ainda
- Autofill em formulários de candidatura
- "Build a Job Tailored Resume" direto da extensão (sem sair da página)
- Cobertura de mais portais de emprego

---

## FONTES DE VAGAS — ADICIONAR À VARREDURA

Anotado por Marcos para adicionar à lista de fontes da varredura automática:
- `ciandt.com/br/pt-br/carreiras` — CI&T (empresa tech brasileira relevante)
- `empregos.com.br` — portal brasileiro com formulário de currículo

**Ação:** verificar se Adzuna já indexa essas fontes. Se não, avaliar RSS ou scraping direto pela extensão Chrome.

---

## PRÓXIMOS PASSOS (desta análise)

1. **B4** (email sem funcionalidade) — diagnosticar na próxima sessão DevTools: qual o HTML do modal atual, quais ações existem, o que falta
2. **B5** (cards não excluídos) — reproduzir e confirmar o comportamento exato
3. **B6** (perde formulário ao sair) — implementar rascunho em localStorage
4. **B7** — Marcos descreve os passos que levam ao problema
5. **UX1** (+ Nova Oportunidade na Home) — fix simples, alta prioridade
6. **3 fluxos de email** — avaliar posição no roadmap após mobile e Plano A/B/C
7. **Extensão: "Job Tailored Resume" inline** — direção para redesenho da extensão (Fase 3)
