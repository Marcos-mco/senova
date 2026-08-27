-- Senova · D1 · migração 006 — o modelo sai de etiqueta e vira CHAVE (S53, 27/ago/2026).
--
-- ── O defeito, e o fato de ele já estar escrito aqui ────────────────────────────────────
-- A 005 acrescentou `modelo` a `custo_ia_v2` e disse, com todas as letras, no seu último
-- parágrafo: "Um mesmo dia/origem pode misturar modelos; nesse caso `modelo` guarda o último
-- que rodou e `custo_usd` a soma correta de todos. O dinheiro continua exato — só a etiqueta
-- fica sendo a da última chamada."
--
-- Isso estava certo e era suficiente enquanto ninguém somasse POR modelo. Em 26/ago eu
-- acrescentei `por_modelo` a /api/radar-custo somando exatamente por essa etiqueta, sem
-- reler o aviso que eu mesmo tinha escrito no dia anterior. O resultado é um número com
-- sujeito errado: o gasto de TODOS os modelos daquele dia/origem, creditado ao ÚLTIMO que
-- rodou. Deu para ver acontecendo nos arquivos da medição de 27/ago — o mesmo bloco de
-- dinheiro aparece sob 'claude-haiku-4-5' numa leitura e sob 'claude-opus-4-8' na seguinte.
--
-- É [[feedback_instrumentacao_precisa_de_sujeito]] na forma mais pura: um número que não diz
-- de QUEM é não é uma medição, é um enfeite — e este ia decidir uma troca de modelo.
--
-- ── Por que tabela nova ─────────────────────────────────────────────────────────────────
-- `modelo` precisa entrar na chave primária, e SQLite não altera PK no lugar. Mesmo caminho
-- da 004, que criou `custo_ia_v2` para dar dono às linhas: cria-se a tabela certa, copia-se,
-- e a antiga fica intacta até alguém conferir a nova ([[feedback_verificar_antes_de_apagar]]).
--
-- ── O que o backfill NÃO finge saber ────────────────────────────────────────────────────
-- O histórico entra inteiro como `modelo = 'nao_registrado'`. Não porque se perdeu alguma
-- coisa — o DINHEIRO vem exato, linha por linha, e o teto continua contando o mesmo total —,
-- mas porque a etiqueta antiga é comprovadamente a da última chamada, e não a do gasto.
--
-- Haveria linhas cuja etiqueta está certa (as origens que só chamam um modelo). Não há como
-- distinguir essas das outras olhando o dado, e uma etiqueta que às vezes está certa é pior
-- que "não sei": ela convida a somar. É a mesma recusa da 004 no backfill de dono e da 005
-- no backfill de preço — declarar a estimativa, nunca fingir a atribuição.
--
-- A janela do painel é de 30 dias. Ou seja: este 'nao_registrado' se dissolve sozinho em um
-- mês, e a partir da primeira chamada nova a pergunta "quanto custou cada modelo" passa a
-- ter resposta conferível.
CREATE TABLE IF NOT EXISTS custo_ia_v3 (
  dia             TEXT NOT NULL,           -- 'YYYY-MM-DD'
  user_id         TEXT NOT NULL,           -- user_id de `usuarios`, ou 'nao_atribuido'
  origem          TEXT NOT NULL,           -- 'esteira_home' | 'card_aberto' | 'extensao' | 'email' | 'sofia' | 'mercado' | 'plano_vida' | 'radar' | 'app'
  modelo          TEXT NOT NULL,           -- id do modelo que rodou, ou 'nao_registrado'
  chamadas        INTEGER NOT NULL DEFAULT 0,
  tokens_entrada  INTEGER NOT NULL DEFAULT 0,
  tokens_saida    INTEGER NOT NULL DEFAULT 0,
  cache_escrita   INTEGER NOT NULL DEFAULT 0,
  cache_leitura   INTEGER NOT NULL DEFAULT 0,
  custo_usd       REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, user_id, origem, modelo)
);

-- Backfill único e não-destrutivo, como o da 004: `INSERT OR IGNORE` deixa a migração rodar
-- duas vezes sem duplicar nada. Nenhuma linha se funde com outra (o rótulo é constante), então
-- a soma de dinheiro sai idêntica à da v2 — que é o que o teto lê.
INSERT OR IGNORE INTO custo_ia_v3 (dia, user_id, origem, modelo, chamadas, tokens_entrada, tokens_saida, cache_escrita, cache_leitura, custo_usd)
SELECT dia, user_id, origem, 'nao_registrado', chamadas, tokens_entrada, tokens_saida, cache_escrita, cache_leitura, custo_usd
FROM custo_ia_v2;

-- Os mesmos três índices da v2, pelas mesmas três razões: o painel lê por dia, o teto soma
-- por dono dentro do ciclo, e a herança do legado varre por dono.
CREATE INDEX IF NOT EXISTS idx_custo_ia_v3_dia      ON custo_ia_v3 (dia DESC);
CREATE INDEX IF NOT EXISTS idx_custo_ia_v3_dono_dia ON custo_ia_v3 (user_id, dia DESC);
CREATE INDEX IF NOT EXISTS idx_custo_ia_v3_teto     ON custo_ia_v3 (user_id, dia, custo_usd);
