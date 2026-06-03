# Senova Design System
> Aprovado em: [aguardando aprovação de Marcos]
> Estas regras são imutáveis. Qualquer desvio requer aprovação explícita.

---

## Filosofia

**Referência:** Apple HIG + Linear Design
**Público:** Executivo 35+, ambiente profissional, uso diário
**Tom visual:** Elegante, digno, sério — como um bom terno.
**Princípio-mestre:** A interface fica em segundo plano. O conteúdo do usuário é o protagonista.

---

## Cores

| Token | Valor | Uso |
|---|---|---|
| `--navy` | `#1A3A5C` | Sidebar, títulos de seção, elemento primário |
| `--gold` | `#C9A84C` | UM acento por tela — o mais importante |
| `--action` | `#2E6DA4` | Links, botões secundários |
| `--bg` | `#F7F5F0` | Fundo geral (warm white) |
| `--bg2` | `#ffffff` | Superfície de cards |
| `--bg3` | `#F0EDE6` | Fundo interno de itens, hover |
| `--text` | `#1A1A16` | Texto principal |
| `--text2` | `#4A4740` | Texto secundário |
| `--text3` | `#8A8680` | Metadados, labels |
| `--red` | `#C0281E` | Urgência, vencido |
| `--amber` | `#B8670A` | Atenção, prazo próximo |
| `--green` | `#1A7A4A` | Positivo, concluído |

**Regra absoluta:** Nunca usar `--gold` em mais de 1 elemento por tela.
**Regra absoluta:** Sem `border-top` colorido em cards — cor é sinal, não decoração.

---

## Tipografia

| Uso | Fonte | Tamanho | Peso | Cor |
|---|---|---|---|---|
| Título de página | Playfair Display | 17px | 700 | `--navy` |
| Título de seção | Playfair Display | 15px | 700 | `--navy` |
| Label de seção | Inter | 10px | 700 | `--text3` |
| Corpo principal | Inter | 14px | 500 | `--text` |
| Metadado / data | Inter | 12px | 400 | `--text3` |
| Número KPI | Playfair Display | 26-28px | 700 | `--navy` |

**Regra absoluta:** Mínimo 14px para qualquer texto interativo.
**Regra absoluta:** Nunca usar Inter para títulos de seção — sempre Playfair.

---

## Espaçamento

| Contexto | Valor |
|---|---|
| Padding interno de card | 20–24px |
| Gap entre cards | 16px |
| Gap entre itens de lista | 0 (usa border-bottom) |
| Padding de item de lista | 12px vertical, 22px horizontal |
| Margin-bottom entre seções | 16–20px |

**Regra:** Respiro é hierarquia. Nunca comprimir para caber mais conteúdo.

---

## Cards

```css
/* Card padrão */
background: #ffffff;
border: 1px solid var(--border);       /* #DDD9CF */
border-radius: 14px;
box-shadow: 0 1px 4px rgba(0,0,0,0.06);
padding: 0;  /* padding interno por seção, não no card */

/* PROIBIDO */
border-top: 3px solid [qualquer cor];  /* não usar */
gold-line decorativa;                   /* não usar */
ícone dentro de caixa bordada;          /* não usar */
```

**Exceção única:** card de alerta/urgência pode usar `border-left: 3px solid --red` ou `--amber`.

---

## Itens de lista (Prioridades, Inteligência)

```
[dot de cor]  [texto principal 14px bold]  [metadado 12px]  [chevron]
              [texto secundário 12px]
```

- Sem ícone em caixinha
- Sem background colorido no item (apenas no hover: `--bg3`)
- Dot de cor: 8px, comunica status (urgente=red, normal=navy, novo=gold)
- Hover: `background: #F0EDE6` — sutil, sem border animation
- `border-bottom: 1px solid var(--border)` entre itens

---

## Hierarquia visual da home

```
NÍVEL 1 — Dominante (1 por tela)
  Prioridades do Dia — título Playfair 15px + borda-esquerda gold 3px

NÍVEL 2 — Secundário (2 elementos)
  Inteligência + Pipeline — título Playfair 14px, card branco simples

NÍVEL 3 — Subordinado
  Labels, metadados, chevrons — Inter 10-12px, --text3
```

**Regra:** Se dois elementos competem pelo mesmo peso visual, um está errado.

---

## Linguagem / Tom (Opus Dei / Labor Dei)

| Evitar | Usar |
|---|---|
| "Você está sem retorno há 21 dias" | "Ronny Essert — bom momento para um follow-up" |
| "0 vagas novas" | *(linha omitida)* |
| "Nenhum email novo" | *(linha omitida)* |
| "Urgente! Atrasado!" | "⚠ 2d — atenção necessária" |
| "Você está desatualizado" | "Oportunidade de fortalecer o perfil" |

**Princípio:** o Senova é um advisor confiante, não um alarme ansioso.
Tom: direto, respeitoso, esperançoso. Nunca alarmista, nunca infantil.

---

## Linguagem — Dicionário Oficial (Apple/Inter style)

| Proibido | Correto |
|---|---|
| Pipeline | Sua Situação |
| Processos (nav) | Sua Busca |
| Análise de Vaga (nav) | Avaliar Posição |
| Relatórios (nav) | Seu Painel |
| Lead | Em vista |
| Candidatura | Aguardando retorno |
| Em Contato | Em conversa |
| Proposta | Com proposta |
| Inteligência | O que chegou |
| Prioridades do Dia | Para Hoje |
| Vagas abaixo do limiar | Oportunidades para revisar |
| Arquivar selecionados | Guardar no histórico |
| Atrasado X dias | Precisa de atenção · há X dias |
| Nenhum resultado | *(linha omitida)* |

Tom: o Senova fala COM Marcos. "Ronny Essert aguarda seu retorno" — não "Follow-up pendente".
Possessivo: "Sua Situação", "Seu Painel", "O que chegou" — tudo pertence ao usuário.
Aprovado em: 03/jun/2026

---

## O que é PROIBIDO (lista definitiva)

- ❌ `border-top: Npx solid [cor]` em cards
- ❌ `gold-line` decorativa (só usada no componente `card` do Mercado por legado)
- ❌ Ícones dentro de caixas com borda
- ❌ Hero banner na home (foi removido — não volta)
- ❌ "Nenhum X novo" / "0 resultados" visíveis — se vazio, omite
- ❌ Dois CTAs primários na mesma tela
- ❌ Emoji como elemento de design principal (apenas como indicador de status inline)
- ❌ Animações de borda no hover
- ❌ Texto abaixo de 12px em qualquer contexto
