# SKILL — UX WRITING SENOVA
## Linguagem, Microcopy e Tom de Voz
Versão: 1.0 · Criado: 15/jun/2026

---

## QUANDO USAR

Antes de escrever qualquer texto visível ao usuário: labels, botões, empty states,
mensagens de erro, toasts, tooltips, headers, sub-headers, placeholders, confirmações.

---

## IDENTIDADE DE VOZ

**Senova fala como um consultor sênior de carreira — experiente, direto, humano.**

| Personalidade | Expressão |
|---------------|-----------|
| Experiente | Sabe do que fala. Não explica o óbvio. |
| Confiante | Afirmações diretas. Sem "talvez", "pode ser", "tente". |
| Humano | Fala com Marcos, não para Marcos. |
| Discreto | Nunca alarma. Nunca elogia em excesso. |

---

## TOM POR CONTEXTO

| Contexto | Tom | Exemplo |
|----------|-----|---------|
| Ação urgente | Direto, claro | "Entrevista sem data — agende agora" |
| Conquista | Breve, genuíno | "CV enviado. Boa sorte." |
| Erro | Humano, sem culpa | "Não foi possível enviar. Tente novamente." |
| Vazio positivo | Encorajador | "Tudo em dia. Sem ações urgentes." |
| Vazio neutro | Silêncio (ocultar) | — (não mostrar nada) |
| Sofia | Próxima, cuidadosa | "Estou aqui. O que você precisa agora?" |

---

## VOCABULÁRIO OBRIGATÓRIO

### Termos de produto
| Usar | Nunca usar |
|------|-----------|
| Processos | Pipeline / CRM |
| Oportunidade | Lead / Vaga (em cards de processo) |
| Busca automática | Varredura |
| Compatibilidade | Score / Score ATS |
| Para Considerar | Abaixo do limiar |
| Enviar Candidatura | Candidatar |
| Remover | Deletar / Excluir |
| Analisar Vaga | Analisar CV |
| Novidades no mercado | Alertas / Google Alerts |
| Critério | Limiar |

### Termos de status
| Usar | Nunca usar |
|------|-----------|
| CV Enviado | Aplicado / Applied |
| Em Contato | Contato / Contact |
| Encerrado | Arquivado / Fechado |

### Termos de tempo
| Usar | Nunca usar |
|------|-----------|
| há 2 dias | 2d atrás |
| Hoje | Today / Hoje à noite |
| Agendado para DD/MM | Data: DD/MM |

---

## EMPTY STATES — REGRA ABSOLUTA

**Se não há conteúdo → a seção desaparece. Ponto.**

Nunca mostrar:
- "Nenhuma oportunidade nova"
- "Retornos — nenhum novo"
- "0 vagas encontradas"
- "Sem novidades"
- "Nenhum processo ativo"

A única exceção é quando o sistema está em estado de carregamento (skeleton) ou erro.

### Empty states permitidos (apenas quando seção SEMPRE aparece)
| Seção | Texto quando vazia |
|-------|-------------------|
| Para Hoje (processos) | "Tudo em dia. Sem ações urgentes." |
| Para Hoje (contatos) | — (ocultar seção Contatos) |
| Processos (kanban) | "Nenhum processo ativo. + Nova oportunidade" |
| Contatos | "Nenhum contato cadastrado. + Adicionar" |

---

## BOTÕES — HIERARQUIA E LABELS

### Primário (navy, direita)
- Ação principal da tela: "Salvar", "Enviar Candidatura", "Gerar CV"
- Sempre uma ação. Nunca duas no mesmo contexto.

### Secundário (ghost, borda)
- Ação alternativa: "Cancelar", "Ver depois", "Voltar"

### Destrutivo (vermelho, esquerda)
- Sempre separado visualmente: "Remover", "Descartado"
- Nunca adjacente ao botão primário sem espaço ou separador

### Labels de botão — regras
- Verbo no infinitivo: "Salvar", "Enviar", "Analisar", "Remover"
- Nunca substantivos: "Salvamento", "Envio"
- Nunca gerúndios: "Salvando" (só durante o loading)
- Máximo 3 palavras: "Enviar Candidatura" ✓ / "Enviar Candidatura por Outlook" ✗

---

## MENSAGENS DE SISTEMA

### Toasts (3 segundos, canto inferior direito)
- Sucesso (verde): "Salvo." / "CV enviado." / "Contato adicionado."
- Aviso (âmbar): "Preencha todos os campos obrigatórios."
- Erro (vermelho): "Erro ao salvar. Tente novamente."
- Máximo 6 palavras quando possível.

### Confirmações destrutivas
- Nunca usar `confirm()` nativo do browser
- Usar inline confirmation: botão muda para "Confirmar remoção?" + "Cancelar"
- Descrever a consequência: "Remover este processo? Não pode ser desfeito."

### Erros de API / rede
- Nunca mostrar stack trace ou código HTTP
- Sempre oferecer ação: "Não foi possível conectar. [Tentar novamente →]"

---

## HEADERS E LABELS — PADRÃO

### Headers de seção (11px, caps, text3)
- "PROCESSOS" / "CONTATOS" / "ATENÇÃO"
- Sempre maiúsculo, sempre Inter 600, sempre text3 (#8A8680)

### Labels de campo
- Substantivo simples: "Nome", "Empresa", "Próxima ação"
- Asterisco para obrigatórios: "Nome *"
- Nunca "Digite o nome" como label — isso é placeholder

### Placeholders
- Instrução ou exemplo: "Ex: Aguardar aceite e enviar CV"
- Tom conversacional: "O que você vai fazer a seguir?"
- Nunca repetir o label: label = "Próxima ação" / placeholder ≠ "Próxima ação"

---

## SOFIA — TOM ESPECÍFICO

Sofia fala em primeira pessoa, próxima, sem ser invasiva.

| Situação | Tom Sofia |
|----------|-----------|
| Saudação | "Olá, Marcos. Pronto para começar?" |
| Conquista | "CV enviado. Estou torcendo por você." |
| Alerta | "Este processo está parado há 14 dias. Quer pensar juntos?" |
| Preparação entrevista | "Vamos preparar. Me conta o que você já sabe sobre a empresa." |
| Silêncio do mercado | "Isso faz parte do processo. O que você quer trabalhar enquanto espera?" |

Sofia NUNCA:
- Elogia em excesso ("Incrível! Você vai arrasar!")
- Usa linguagem de startup jovem ("Bora!", "Top!", "Show!")
- Alarmiza ("URGENTE! Você está perdendo oportunidades!")
- Fala de si mesma como IA ("Como sua IA assistente...")

*Atualizar sempre que nova decisão de linguagem for aprovada · skill_ux_writing.md v1.0*
