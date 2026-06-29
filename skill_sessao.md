# skill_sessao — Protocolo de Abertura e Fechamento

## Quando aplicar
- "abrir sessão" / "bom dia Virgílio" no início → executar ABERTURA
- "fechar sessão" / "vamos encerrar" → executar FECHAMENTO

## Princípio fundamental
Claude.ai e Claude Code são instâncias SEPARADAS sem memória compartilhada.
- Claude Code = fonte de verdade do ESTADO DO CÓDIGO (arquivos locais reais)
- Claude.ai (Virgílio) = fonte de verdade da ESTRATÉGIA e HISTÓRICO
- SESSAO.md no GitHub = ponte de sincronia entre os dois
Virgílio NUNCA registra commit/versão sem confirmação do estado real pelo Claude Code.

## ABERTURA (ordem obrigatoria — Code SEMPRE primeiro)
1. ABRIR CLAUDE CODE PRIMEIRO (padrao unico, toda sessao):
   cmd → cd C:\Users\marco\Documents\senova → claude → permissoes opcao 2
2. Code confirma o estado real LOCAL: ultimo commit (hash+msg), versao no VERSOES.md, working tree limpo ou nao
3. Virgilio le os arquivos do GitHub: PROJETO.md, VERSOES.md, VIRGILIO.md, SESSAO.md
4. Virgilio COMPARA GitHub x local reportado pelo Code:
   - Batem → "mesma pagina em [commit/versao]"
   - Divergem → apontar divergencia e resolver antes de prosseguir
5. Se houver dev: Code le index.html e senova-worker.js antes de qualquer proposta
6. Apresentar FILA DE PRIORIDADES do SESSAO.md e confirmar com Marcos por onde comecar

## FECHAMENTO (ordem obrigatória)
1. Confirmar o estado real pelo Code: último commit (hash+msg), versão da extensão, o que ficou sem commit
2. Redigir o novo SESSAO.md com o estado confirmado
3. **Atualizar VERSOES.md** (entrada da sessão no topo) se houve mudanças não documentadas
4. **Atualizar VIRGILIO.md SEMPRE** (regra de Marcos, 29/jun/2026): cabeçalho (data/sessão/versão), "ESTADO ATUAL"
   (último commit/versão), "AO RETOMAR" (fila nova) e resumo "O QUE FOI FEITO — SESSÃO N". Preservar histórico — adicionar, não apagar.
5. Claude Code grava SESSAO.md + VERSOES.md + VIRGILIO.md e faz **commit + push**
6. Bloco CRESCIMENTO (2 min) — responder:
   - O que aprendi de IA hoje aplicável aos 3 planos?
   - Que alternativa criativa não tentamos e aceleraria o objetivo?
   - Que padrão repetido poderia virar automação/skill?
7. Deixar Claude Code preparado para o dia seguinte

## Regras que nunca mudam
- DLS nunca omitir · MBA FGV = Administração (nunca Marketing)
- RPC e Editel sempre 2 cargos separados
- Brand Senova intocável (#1A3A5C #C9A84C #2E6DA4, Playfair+Inter)
- 1 fix por vez: commit → testar (Ctrl+Shift+R) → aprovar → próximo
- Sem paliativos — solução definitiva sempre
- Email principal: marcos_mco@hotmail.com
