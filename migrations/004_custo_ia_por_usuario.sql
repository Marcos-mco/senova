-- Senova · D1 · migração 004 — o custo de IA passa a saber DE QUEM foi (S52, Passo D0).
--
-- Por que este arquivo existe agora, e não "quando o 2º usuário entrar".
-- A migração 003 deu SUJEITO à medição: cada chamada carimba de qual esteira veio
-- ('esteira_home', 'card_aberto', 'extensao', 'email', 'sofia', 'mercado', 'plano_vida').
-- Isso respondia "o que gastou". Não responde "quem gastou" — e a PK (dia, origem) torna a
-- pergunta impossível de fazer, porque as chamadas de todo mundo caem no mesmo balde.
--
-- Duas consequências práticas, medidas pelo `senova-viabilidade` em 24/ago/2026:
--
--   1. NÃO EXISTE TETO DE GASTO SEM ESTA COLUNA. Marcos decidiu que quer limite ("temos que
--      ter limite sim"). Um teto por pessoa precisa somar o dia DAQUELA pessoa; com o balde
--      compartilhado, o primeiro usuário a gastar fecharia a torneira dos outros dois.
--
--   2. TRÊS USUÁRIOS DE HOMOLOGAÇÃO VIRARIAM UM NÚMERO SÓ. É literalmente o defeito que a
--      003 foi escrita para evitar, um andar acima: um total que ninguém consegue atribuir é
--      pior do que não medir ([[feedback_instrumentacao_precisa_de_sujeito]]). Marcos, o
--      cunhado na Alemanha e a Nailia gastam de formas diferentes, e é justamente essa
--      diferença que decide o preço do plano.
--
-- Feita AGORA porque o Passo D (esquema novo do Perfil) já mexe na fundação: fazer depois
-- seriam duas migrações onde cabia uma.
--
-- Tabela nova em vez de ALTER: o SQLite não muda chave primária no lugar — mesma razão da
-- 003. `custo_ia_v2` nasce com PK (dia, user_id, origem).
--
-- ── Sobre o backfill, e por que ele NÃO adivinha o dono ──────────────────────────────────
-- É fato que tudo o que está gravado hoje é de uma pessoa só: o portão (`segredoOk`) compara
-- contra um único segredo compartilhado, então existe exatamente um `chave_hash` possível e
-- um `user_id` possível. Seria fácil rodar um SELECT em `usuarios` e carimbar esse UUID em
-- tudo.
--
-- Não é o que este arquivo faz, de propósito. O `user_id` de destino não foi conferido linha
-- a linha contra as chamadas que ele representaria, e um backfill que ATRIBUI sem conferir é
-- exatamente a doença que a catraca de universalidade nomeia: a medição de um usuário virando
-- lei escrita no dado. Se amanhã se descobrir uma segunda linha em `usuarios`, o carimbo
-- estaria errado e ninguém teria como saber.
--
-- Então o histórico entra como 'nao_atribuido' — que é a verdade literal sobre essas linhas:
-- foram gravadas antes de a medição saber de quem eram. O painel mostra o rótulo, e quem o
-- lê entende o que ele diz. O mesmo sentinela vale para o futuro: chamada que não conseguir
-- dizer de quem é (D1 fora do ar, `donoSeguro` devolvendo null) cai aqui em vez de ser
-- atribuída a alguém por conveniência.
--
-- Consequência prática, e é por isso que isto não atrapalha nada: o teto de gasto soma o DIA
-- de cada pessoa. As linhas 'nao_atribuido' são de dias passados e nunca entram na conta de
-- hoje de ninguém.
--
-- `custo_ia` NÃO é apagada. Fica congelada como rede, pela regra de
-- [[feedback_verificar_antes_de_apagar]]: dado só sai do lugar antigo depois de ser lido de
-- volta do lugar novo. Quem escreve a partir daqui é só `custo_ia_v2` — um gravador, não dois.
CREATE TABLE IF NOT EXISTS custo_ia_v2 (
  dia             TEXT NOT NULL,           -- 'YYYY-MM-DD'
  user_id         TEXT NOT NULL,           -- user_id de `usuarios`, ou 'nao_atribuido'
  origem          TEXT NOT NULL,           -- 'esteira_home' | 'card_aberto' | 'extensao' | 'email' | 'sofia' | 'mercado' | 'plano_vida' | 'radar' | 'app'
  chamadas        INTEGER NOT NULL DEFAULT 0,
  tokens_entrada  INTEGER NOT NULL DEFAULT 0,
  tokens_saida    INTEGER NOT NULL DEFAULT 0,
  cache_escrita   INTEGER NOT NULL DEFAULT 0,
  cache_leitura   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, user_id, origem)
);

-- Backfill único e não-destrutivo. `INSERT OR IGNORE` deixa a migração poder rodar duas
-- vezes sem duplicar nada — a mesma trava da 003.
INSERT OR IGNORE INTO custo_ia_v2 (dia, user_id, origem, chamadas, tokens_entrada, tokens_saida, cache_escrita, cache_leitura)
SELECT dia, 'nao_atribuido', origem, chamadas, tokens_entrada, tokens_saida, cache_escrita, cache_leitura
FROM custo_ia;

-- A leitura do painel continua sendo "últimos 30 dias, mais recente primeiro".
CREATE INDEX IF NOT EXISTS idx_custo_ia_v2_dia ON custo_ia_v2 (dia DESC);

-- O índice que o TETO DE GASTO vai usar: "quanto esta pessoa já gastou hoje". Sem ele, cada
-- verificação de teto varre a tabela inteira — e ela é consultada antes de CADA chamada de IA.
CREATE INDEX IF NOT EXISTS idx_custo_ia_v2_dono_dia ON custo_ia_v2 (user_id, dia DESC);
