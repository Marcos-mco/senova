-- Senova · D1 · migração 002 — o custo real de IA do Radar, medido sem se atropelar (S45).
--
-- Por que este arquivo existe. A primeira versão desta instrumentação (v7.29, 11/ago/2026)
-- gravava um único JSON em KV, lido → modificado → regravado a cada análise. As 5 chamadas
-- paralelas que `analisarLoteBackground` já dispara por lote disputam a MESMA chave: a
-- última a gravar apaga o que as outras quatro somaram. É o mesmo defeito já documentado
-- como incidente real neste código em index.html:6109-6113 ("de 280 vagas, só 26 ficaram
-- com nota"). Além disso, uma escrita de KV por análise (~1.400/mês, em picos) se aproxima
-- da cota de 1.000 escritas/dia do KV gratuito — e senova-worker.js:590-594 já avisa que
-- estourá-la derruba TODA escrita de KV do Worker em silêncio, inclusive a colheita do cron
-- (`vagas_lead`). O agente `senova-viabilidade` pegou os dois problemas antes de virarem
-- incidente de novo.
--
-- D1 resolve os dois ao mesmo tempo: `UPDATE ... SET x = x + 1` é uma única instrução SQL,
-- executada de forma serializada pelo D1 — sem janela de leitura-modificação-escrita do lado
-- do cliente, logo sem corrida possível entre as 5 chamadas do lote. E o teto de escrita do
-- D1 gratuito é ordens de grandeza maior que o do KV.
CREATE TABLE IF NOT EXISTS radar_custo_ia (
  dia             TEXT PRIMARY KEY,        -- 'YYYY-MM-DD'
  chamadas        INTEGER NOT NULL DEFAULT 0,
  tokens_entrada  INTEGER NOT NULL DEFAULT 0,
  tokens_saida    INTEGER NOT NULL DEFAULT 0,
  cache_escrita   INTEGER NOT NULL DEFAULT 0,
  cache_leitura   INTEGER NOT NULL DEFAULT 0
);
