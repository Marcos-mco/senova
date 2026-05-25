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

## ABERTURA (ordem obrigatória)
1. Virgílio lê: PROJETO.md, VERSOES.md, VIRGILIO.md, SESSAO.md
2. Se houver desenvolvimento: abrir Claude Code (cmd → cd senova → claude → permissões opção 2)
   e pedir ao Code para ler index.html e senova-worker.js locais
3. Claude Code reporta: último commit real, versão atual, divergências
4. Virgílio confirma "mesma página em [commit/versão]" ou aponta divergência
5. Apresentar FILA DE PRIORIDADES do SESSAO.md e confirmar com Marcos por onde começar

## FECHAMENTO (ordem obrigatória)
1. Virgílio pergunta ao Code o estado real: último commit (hash+msg), versão, o que ficou sem commit
2. Virgílio redige o novo SESSAO.md com o estado confirmado
3. Claude Code grava SESSAO.md e faz commit + push
4. Fechar VERSOES.md se houve mudanças não documentadas
5. Bloco CRESCIMENTO (2 min) — Virgílio responde:
   - O que aprendi de IA hoje aplicável aos 3 planos?
   - Que alternativa criativa não tentamos e aceleraria o objetivo?
   - Que padrão repetido poderia virar automação/skill?
6. Deixar Claude Code preparado para o dia seguinte

## Regras que nunca mudam
- DLS nunca omitir · MBA FGV = Administração (nunca Marketing)
- RPC e Editel sempre 2 cargos separados
- Brand Senova intocável (#1A3A5C #C9A84C #2E6DA4, Playfair+Inter)
- 1 fix por vez: commit → testar (Ctrl+Shift+R) → aprovar → próximo
- Sem paliativos — solução definitiva sempre
- Email principal: marcos_mco@hotmail.com
