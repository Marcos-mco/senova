# SKILL — CRM
## Gestão do Pipeline e Contatos no Senova

---

## 1. O QUE É O MÓDULO CRM

O CRM do Senova tem dois componentes integrados:

1. **Pipeline** — kanban de candidaturas com 7 colunas
2. **Contatos** — rede de relacionamentos estratégicos

Ambos vivem na página #page-crm (sidebar: "Processos").

---

## 2. PIPELINE — ESTRUTURA DO KANBAN

### 7 colunas em ordem:
1. **Lead** — vaga identificada, ainda não candidatou
2. **Aplicado** — candidatura enviada
3. **Triagem** — processo iniciado
4. **Entrevista** — entrevista agendada ou realizada
5. **Proposta** — oferta recebida
6. **Aceito** — proposta aceita
7. **Arquivo** — encerrado (recusado, desistência, expirado)

### Campos de cada card de vaga:
- Empresa, cargo, fonte, URL de origem
- Data de aplicação
- Score ATS (calculado browser-side)
- Plano (A / B / C)
- Status / coluna atual
- Próxima ação + data
- Notas
- Timeline de eventos

### Regras de uso:
- Todo lead importado da varredura entra na coluna Lead
- Movimento entre colunas via drag-and-drop
- Card arquivado não some — vai para coluna Arquivo
- Deduplicação automática por título+empresa (similaridade ≥60%)
- Vagas abaixo do score mínimo vão para fila de revisão antes de entrar no pipeline

---

## 3. CONTATOS — ESTRUTURA

### Campos de cada contato:
- Nome, cargo, empresa
- Tipo (headhunter / executivo / recrutador / aliado)
- Temperatura (Quente / Morno / Frio)
- Plano relacionado (A / B / C)
- LinkedIn URL
- Email, telefone
- Notas
- Timeline de interações
- Próxima ação + data

### Regras de uso:
- Contatos são pessoas, não empresas
- Temperatura atualizada manualmente a cada interação
- Follow-up alertado automaticamente em 7/14/21 dias (roadmap)
- Agendamento direto via Outlook integrado

---

## 4. FLUXO COMPLETO DE UMA CANDIDATURA

```
Varredura automática (07h BRT)
        ↓
Vaga importada → Score ATS calculado browser-side
        ↓
Score ≥ mínimo → entra em Lead automaticamente
Score < mínimo → vai para "Vagas para revisar" na Home
        ↓
Lead → Analisar CV (Anti-ATS) → ajustar CV para a vaga
        ↓
Candidatar → status muda para Aplicado + email enviado via Outlook
        ↓
Aguarda resposta → avança colunas manualmente
        ↓
Sem resposta → follow-up em 7/14/21 dias (roadmap)
        ↓
Encerrado → arquivar (nunca deletar)
```

---

## 5. VARREDURA AUTOMÁTICA

- **Horário:** 07h BRT via Cloudflare cron trigger
- **Fontes:** Adzuna API (BR, ES, DE, PT) + Jobicy RSS (global remote)
- **Rotação:** BR → ES → DE → PT → Remoto (uma por cron)
- **Score mínimo por região:** BR=70, ES/PT=55, DE=50, Remote=60, USA=65 (configurável no Perfil)
- **Deduplicação:** título+empresa, similaridade ≥60%

---

## 6. INTEGRAÇÃO OUTLOOK

- Envio de candidaturas via email autenticado
- Agendamento de entrevistas direto no calendário
- OAuth configurado com tenant "consumers" (conta Hotmail pessoal)
- Pasta "Alertas Senova" com regras automáticas de roteamento

---

## 7. LIMPEZA EM LOTE

Funcionalidade para arquivar múltiplos cards de uma vez:
- Filtro por coluna, plano, score, data
- Seleção múltipla
- Arquivamento em lote com confirmação
- Não deleta — apenas move para Arquivo

---

## 8. WIDGET HOME — VAGAS PARA REVISAR

Cards abaixo do score mínimo ficam em fila de revisão.
Widget na Home mostra quantidade pendente.
Usuário revisa um a um: importar ou descartar.

---

## 9. REGRAS INVIOLÁVEIS DO MÓDULO

- Nunca deletar vaga — sempre arquivar
- Score ATS calculado browser-side (não no Worker — limite CPU Cloudflare)
- Deduplicação sempre antes de importar
- Plano A/B/C obrigatório em todo card
- Timeline de eventos imutável — registro cronológico de tudo

---

## 10. PENDÊNCIAS ATIVAS (mai/2026)

- [ ] Filtros por Plano A/B/C no kanban (verificar se já implementado)
- [ ] Follow-up automático 7/14/21 dias
- [ ] Campo "Negativados" no Pipeline
- [ ] Cleanup dos ~298 cards desatualizados
- [ ] 8 contatos estratégicos pendentes de adição

---

*Criado em 21/mai/2026 — sessão skills*
*Substitui versão anterior (duplicata de skill_concorrentes.md)*
