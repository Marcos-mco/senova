-- Senova · D1 · migração 005 — o custo de IA passa a ser guardado EM DINHEIRO (S53).
--
-- Por que agora. Em 26/ago/2026 Marcos abriu a fatura do cartão e se assustou: está
-- desempregado e o app que existe para devolver a renda dele estava consumindo parte dela.
-- Decisão dele, no mesmo dia: "colocar como regra não poder passar dos 200 reais mensais".
--
-- Uma regra de teto precisa de uma coisa que a 004 não guarda: DINHEIRO. `custo_ia_v2` grava
-- tokens, e token só vira dinheiro quando se sabe QUAL MODELO rodou — entrada de Haiku custa
-- 1/3 da de Sonnet, saída de Opus custa 5x. Sem a coluna, o teto teria de adivinhar o modelo
-- de cada linha do histórico e chamaria "R$ 200" a um número que ninguém pode conferir. É o
-- mesmo defeito que a 003 e a 004 existiram para evitar, um andar acima: número sem sujeito.
--
-- Duas colunas, não uma:
--
--   `custo_usd`  — a conta em si, somada na hora do registro, quando o modelo é conhecido.
--                  É o que o teto lê. Somar dinheiro já convertido também torna a leitura
--                  do porteiro barata: um SUM(), sem tabela de preço no caminho quente.
--
--   `modelo`     — de qual modelo veio o gasto. Sem isto, "trocar de modelo economiza?" volta
--                  a ser opinião: dá para medir o antes e não o depois. Também é o que
--                  permite recalcular o histórico se um preço mudar.
--
-- ── Sobre o backfill, e o que ele NÃO finge saber ────────────────────────────────────────
-- O histórico anterior a esta migração não sabe seu modelo. Não vou carimbá-lo de 'sonnet'
-- porque "quase tudo era sonnet": é a mesma doença que a 004 recusou no backfill de dono —
-- ATRIBUIR sem conferir. O histórico entra com `modelo = 'nao_registrado'` e `custo_usd`
-- calculado pela tabela do Sonnet 4.6, que é o preço mais alto entre os modelos que as rotas
-- medidas podiam usar. Ou seja: o histórico é uma ESTIMATIVA POR CIMA, declarada como tal no
-- rótulo. Um teto que erra para o lado de gastar menos é o erro certo aqui.
--
-- A partir desta migração cada linha nova guarda o preço do modelo que realmente rodou.
--
-- ALTER em vez de tabela nova: SQLite muda chave primária no lugar? Não — mas nenhuma das
-- duas colunas é chave. A PK (dia, user_id, origem) continua idêntica, então ADD COLUMN
-- basta e nada precisa ser copiado. (Um mesmo dia/origem pode misturar modelos; nesse caso
-- `modelo` guarda o último que rodou e `custo_usd` a soma correta de todos. O dinheiro,
-- que é o que o teto lê, continua exato — só a etiqueta fica sendo a da última chamada.)
ALTER TABLE custo_ia_v2 ADD COLUMN custo_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE custo_ia_v2 ADD COLUMN modelo    TEXT NOT NULL DEFAULT 'nao_registrado';

-- Backfill único. Preço do Sonnet 4.6 em USD por milhão de tokens, vigente em 26/ago/2026:
-- entrada 3,00 · saída 15,00 · escrita de cache 3,75 (1,25x entrada) · leitura de cache 0,30.
-- `WHERE custo_usd = 0` deixa a migração poder rodar duas vezes sem dobrar nada — mesma
-- trava da 003 e da 004.
UPDATE custo_ia_v2
   SET custo_usd = (tokens_entrada  * 3.00
                  + tokens_saida    * 15.00
                  + cache_escrita   * 3.75
                  + cache_leitura   * 0.30) / 1000000.0
 WHERE custo_usd = 0;

-- O índice que o TETO usa a cada chamada: "quanto esta pessoa gastou nos dias deste mês".
-- O índice da 004 (user_id, dia DESC) já serve à varredura por intervalo de dia; este
-- acrescenta o valor ao próprio índice, para o SUM() não precisar tocar na tabela.
CREATE INDEX IF NOT EXISTS idx_custo_ia_v2_teto ON custo_ia_v2 (user_id, dia, custo_usd);
