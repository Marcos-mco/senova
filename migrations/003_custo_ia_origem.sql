-- Senova · D1 · migração 003 — o custo de IA passa a saber DE ONDE veio (S48, Fix 0).
--
-- Por que este arquivo existe. A migração 002 criou `radar_custo_ia` com `dia` como chave
-- primária: um único balde por data, somando tudo. Enquanto só `analisarVaga` era medido,
-- o balde único bastava — o número tinha um sujeito só. A partir do momento em que o Plano
-- de Vida ganha portas que chamam IA (arquivo, foto, áudio, colagem), esse mesmo balde
-- passaria a somar Radar + Plano de Vida no mesmo número, e o resultado seria pior do que
-- não medir: um total que ninguém consegue atribuir a nada.
--
-- É exatamente o defeito registrado em [[feedback_instrumentacao_precisa_de_sujeito]]:
-- número sem dizer QUAL bloco é mentira. O parecer do `senova-viabilidade` fixou o Radar em
-- ~R$ 467/mês/usuário e as portas do Plano de Vida em ~0,4% disso; se as duas coisas caírem
-- na mesma linha, nenhuma decisão de margem futura poderá se apoiar nesta tabela.
--
-- Tabela nova em vez de ALTER: o SQLite não muda chave primária no lugar. `custo_ia` nasce
-- com PK composta (dia, origem) e recebe, de uma vez, tudo o que `radar_custo_ia` já
-- acumulou — carimbado como 'radar', que é literalmente o que aquelas linhas eram.
--
-- `radar_custo_ia` NÃO é apagada. Fica congelada como rede, pela regra de
-- [[feedback_verificar_antes_de_apagar]]: dado só sai do lugar antigo depois de ser lido de
-- volta do lugar novo. Quem escreve a partir daqui é só `custo_ia` — um gravador, não dois.
CREATE TABLE IF NOT EXISTS custo_ia (
  dia             TEXT NOT NULL,           -- 'YYYY-MM-DD'
  origem          TEXT NOT NULL,           -- 'radar' | 'plano_vida' | 'sofia' | 'email' | 'mercado' | 'app'
  chamadas        INTEGER NOT NULL DEFAULT 0,
  tokens_entrada  INTEGER NOT NULL DEFAULT 0,
  tokens_saida    INTEGER NOT NULL DEFAULT 0,
  cache_escrita   INTEGER NOT NULL DEFAULT 0,
  cache_leitura   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, origem)
);

-- Backfill único e não-destrutivo. Tudo o que existe hoje veio de `analisarVaga`, que é o
-- Radar. `INSERT OR IGNORE` deixa a migração poder rodar duas vezes sem duplicar nada.
INSERT OR IGNORE INTO custo_ia (dia, origem, chamadas, tokens_entrada, tokens_saida, cache_escrita, cache_leitura)
SELECT dia, 'radar', chamadas, tokens_entrada, tokens_saida, cache_escrita, cache_leitura
FROM radar_custo_ia;

-- A leitura do painel é sempre "últimos 30 dias, mais recente primeiro".
CREATE INDEX IF NOT EXISTS idx_custo_ia_dia ON custo_ia (dia DESC);
