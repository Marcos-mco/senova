# SKILL — QA SENOVA
## Protocolo de Qualidade — Bruno (Tech Lead + QA)
Versão: 1.0 · Criado: 15/jun/2026

---

## QUANDO USAR

OBRIGATÓRIO antes de qualquer commit ou pedido de teste a Marcos.
Este é o protocolo da "reunião de equipe" interna — Bruno valida tudo antes de pedir aprovação.
NUNCA pular este protocolo, independente do tamanho da mudança.

---

## FASE 1 — CHAPÉU DE ARQUITETO (antes de escrever qualquer código)

Perguntas que Bruno responde POR ESCRITO antes de tocar no código:

1. **O que estou mudando exatamente?**
   - Que função(ões) serão alteradas?
   - Que HTML, CSS ou JS será adicionado/removido?

2. **Por que estou mudando isso?**
   - Qual é o problema real (causa raiz, não sintoma)?
   - Li o código da função antes de propor a mudança?

3. **O fluxo v1.2 autoriza essa mudança?**
   - Consultar `docs/fluxo_candidatura.v.1.2.drawio`
   - Consultar `skill_fluxo.md`
   - A mudança está alinhada com o processo desenhado?

4. **O que pode quebrar?**
   - Liste explicitamente todas as funções que chamam ou dependem do que será alterado
   - Liste todos os fluxos do usuário que passam por essa área

5. **Existe wireframe ou plano escrito?**
   - Para qualquer mudança de UI: desenhar wireframe ASCII antes de implementar
   - Para mudança de lógica: descrever o novo fluxo em texto antes de codar

6. **Qual modelo de IA usar?**
   - `claude-opus-4-8`: análise holística, arquitetura, planejamento complexo, diagnósticos
   - `claude-sonnet-4-6`: geração de código, correção de bugs, implementação
   - `claude-haiku-4-5`: buscas rápidas, tarefas simples, lookups

---

## FASE 2 — CHAPÉU DE ENGENHEIRO (depois de escrever o código)

Verificações técnicas antes de qualquer commit:

### Segurança
- [ ] `Ctrl+F` por `api.anthropic.com` no index.html → ZERO resultados

### Vocabulário (verificar em TODO texto visível ao usuário)
- [ ] "Pipeline" → usar "Processos"
- [ ] "CRM" → usar "Processos" ou "Contatos"
- [ ] "Cards" → usar "Oportunidades" ou "Processos"
- [ ] "Varredura" → usar "Busca automática"
- [ ] "Lead" → usar "Oportunidade"
- [ ] "Score" → usar "Compatibilidade"
- [ ] "Limiar" → usar "Critério"

### Regras de Empty State (SPRINT_01 — inviolável)
- [ ] Categoria vazia está OCULTA (display:none), nunca mostrando "nenhum X"
- [ ] "Nenhuma nova" / "nenhum novo" / "0 vagas" NÃO aparecem em lugar nenhum
- [ ] Quando há dado: aparece com contagem positiva
- [ ] Quando não há dado: sumiu

### Design System
- [ ] Cores dentro das variáveis CSS (`--navy`, `--gold`, `--action`, etc.)
- [ ] Fonte títulos: Playfair Display · Fonte corpo: Inter
- [ ] Tamanho mínimo de corpo: 15px
- [ ] Botões destrutivos: vermelho, esquerda · Botão primário: navy, direita
- [ ] Altura mínima de botões: 44px

### Fluxo
- [ ] A mudança segue o fluxo desenhado no v1.2?
- [ ] "Novidades no mercado" não tem "+ Abrir processo"?
- [ ] Todo fluxo vive dentro do card (sem navegação que tira do contexto)?

### Regressões
- [ ] Listei os fluxos afetados?
- [ ] Testei mentalmente cada fluxo afetado passo a passo?
- [ ] Mudança isolada (CSS não misturado com bug fix, etc.)?

---

## FASE 3 — PEDIDO DE TESTE A MARCOS

Só após passar Fases 1 e 2:

**Formato obrigatório do pedido de teste:**
> "Por favor teste o seguinte cenário: [ação específica]. O esperado é [resultado específico]. Se aparecer [X], está correto."

**Nunca pedir:** "Veja se está ok" ou "Pode testar?" sem descrição.

---

## CHECKLIST RÁPIDO (copiar e marcar antes de cada commit)

```
FASE 1 — ARQUITETO
[ ] Li o código das funções que vou alterar
[ ] Consultei fluxo v1.2 e skill_fluxo.md
[ ] Documentei o que pode quebrar
[ ] Escrevi wireframe/plano antes do código

FASE 2 — ENGENHEIRO
[ ] api.anthropic.com = 0 resultados
[ ] Vocabulário proibido verificado
[ ] Empty states verificados (ocultar, nunca "nenhum")
[ ] Design system verificado
[ ] Regressões verificadas
[ ] "Novidades no mercado" sem "+ Abrir processo"

FASE 3 — TESTE
[ ] Cenário de teste escrito com ação + resultado esperado
```

---

## MODELO DE SELEÇÃO POR TIPO DE TAREFA

| Tarefa | Modelo | Motivo |
|--------|--------|--------|
| Diagnóstico completo de bugs | opus-4-8 | Raciocínio longo, contexto amplo |
| Planejamento arquitetural | opus-4-8 | Precisa ver o sistema inteiro |
| Análise holística de fluxo | opus-4-8 | Múltiplas implicações |
| Geração de código novo | sonnet-4-6 | Rápido, preciso, eficiente |
| Correção de bug isolado | sonnet-4-6 | Mudança cirúrgica |
| Busca em arquivo / grep | haiku-4-5 | Lookup simples |
| Prompt de IA no app (ATS, Sofia) | sonnet-4-6 | Equilíbrio custo/qualidade |

*Atualizar a cada mudança no protocolo · skill_qa.md v1.0*
