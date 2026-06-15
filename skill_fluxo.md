# SKILL — FLUXO E PROCESSO SENOVA
## Referência operacional do processo desenhado
Versão: 1.0 · Criado: 15/jun/2026
Fonte oficial: `docs/fluxo_candidatura.v.1.2.drawio`

---

## REGRA CARDINAL

NUNCA implementar algo que contradiz o fluxo v1.2 sem aprovação explícita de Marcos.
Este documento é a fonte de verdade do processo — qualquer código que desvie dele é um bug de produto.

---

## FLUXO PRINCIPAL (resumo operacional)

```
FONTES DE SINAL
  ├── Email de recrutador (Outlook)          → Oportunidades
  ├── Busca automática (Adzuna / Jobicy)      → Oportunidades
  ├── Google Alerts / RSS / Bing News         → Novidades no mercado (≠ vaga)
  ├── Busca abaixo do critério                → Para Considerar
  └── Indicação pessoal                       → modal Indicação

HOME — "O que há de novo"
  ├── Oportunidades (verde)
  ├── Retornos (navy)
  ├── Novidades no mercado (âmbar) ← NUNCA tem "+ Abrir processo"
  ├── Para Considerar (âmbar) ← só aparece quando há vagas abaixo do critério
  └── Indicações (verde escuro)
  REGRA: categoria vazia → OCULTAR. Nunca "nenhuma nova".

PROCESSOS — abre card
  └── VISÃO COMPLETA (Sofia + análise holística: CV, fit, projeto de vida)
        └── Candidatar?
              ├── SIM → CV Otimizado → Carta → Enviar via Outlook → Aplicado ✓
              └── NÃO → Descartado (+ Captura de Aprendizado)

APLICADO ✓
  └── Retorno?
        ├── Email positivo → Entrevista agendada → Preparar com Sofia (briefing + simulação)
        │     └── Resultado?
        │           ├── Avançou → Proposta recebida → Aceitar?
        │           │     ├── SIM → Aceito 🎉 → Captura de Aprendizado
        │           │     └── NÃO → Descartado (+ Captura de Aprendizado)
        │           └── Não avançou → Negado (+ Captura de Aprendizado)
        ├── Silêncio → Follow-up +7 dias → loop volta para Retorno?
        └── Negativo → Negado (+ Captura de Aprendizado)

CAPTURA DE APRENDIZADO (sempre ao encerrar processo)
  → motivo + observações + condições da oferta (se aceito)
  → salvo no histórico do card
```

---

## REGRAS UX — SPRINT_01 (inviolável)

1. **< 30 segundos**: usuário abre o app e sabe o que fazer sem scroll
2. **Omitir, nunca informar zero**: categoria vazia some. Nunca "nenhuma nova", "nenhum novo", "0 vagas".
3. **Sinal, não fonte**: usuário vê "Oportunidade", não "Adzuna" ou "Email". A fonte é invisível.
4. **Home = ação. Relatórios = análise.** Não misturar métricas e KPIs na Home.
5. **Todo fluxo dentro do card**: Analisar, Candidatar, Sofia — tudo acessível de dentro do card sem sair do contexto.
6. **Novidades de mercado ≠ vagas**: artigos, notícias, alertas Google são informativos. Ação possível = ler. NUNCA = abrir processo.

---

## VOCABULÁRIO OBRIGATÓRIO

| PROIBIDO (nunca em texto visível) | CORRETO |
|----------------------------------|---------|
| Pipeline | Processos |
| CRM | Processos / Contatos |
| Cards | Oportunidades / Processos |
| Varredura | Busca automática |
| Lead | Oportunidade |
| Score / Score ATS | Compatibilidade |
| Limiar | Critério |
| Abaixo do limiar | Para Considerar |
| Candidatar (botão) | Enviar Candidatura |
| Deletar | Remover |
| Analisar CV | Analisar Vaga |
| Pipeline CRM | Processos |

---

## TIPOS DE SINAL E AÇÕES CORRETAS

| Sinal | Origem | Ação do usuário | NUNCA |
|-------|--------|-----------------|-------|
| Oportunidade | Email ou busca automática | Ver vaga, abrir processo, candidatar | — |
| Retorno | Email de resposta a processo | Responder, mover card | — |
| Novidade no mercado | Google Alert, RSS, Bing News | Ler artigo | + Abrir processo |
| Para Considerar | Vaga abaixo do critério | Aceitar ou descartar | Vai direto para Processos |
| Indicação | Contato pessoal | Registrar, acompanhar | — |

---

## MODELO DO CARD DE PROCESSO

Cada card percorre as colunas do Kanban:
```
Oportunidade → CV Enviado → Em Contato → Entrevista → Proposta → [Aceito / Negado / Arquivado]
```

Ao mover para coluna com status especial:
- **Entrevista**: modal pede data + horário + canal convite + cria evento Outlook
- **Negado / Aceito / Descartado**: modal Captura de Aprendizado (motivo + obs)

---

## PARA HOJE — regras de exibição

Seção esquerda da Home. Mostra:
1. **Processos**: cards com data de próxima ação ≤ hoje + entrevistas sem data agendada (urgência roxa)
2. **Contatos**: contatos com próxima ação entre -7 e +3 dias
3. **Atenção**: processos inativos há muito tempo

Regra: "Entrevista — agendar data e horário" some quando:
- `v.entrevistaData` foi preenchida, OU
- `v.status` mudou de 'entrevista'

---

## DECISÕES DE PRODUTO JÁ TOMADAS (não reabrir sem aprovação)

- Senova não é rastreador de vagas — é plataforma de múltiplos projetos de vida
- Vagas da busca automática vão direto para Processos (sem fila de aprovação)
- Sofia: Fase 1 = onboarding em texto. Fase 2 = voz. Fase 3 = avatar (Anam.ai)
- Carta candidatura gerada com CARTA_SYSTEM (não ATS_SYSTEM)
- Worker: claude-sonnet-4-6 (não 4-5)
- Idiomas suportados: PT / EN / ES / DE (4 idiomas — DE obrigatório)

*Atualizar sempre que uma decisão nova for tomada · skill_fluxo.md v1.0*
