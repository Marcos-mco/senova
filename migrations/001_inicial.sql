-- Senova · D1 · migração 001 — o primeiro esquema.
--
-- Por que este arquivo existe agora, e não "depois do MVP".
-- Em 10/ago/2026 o armazenamento do navegador de Marcos encheu (10,0 MB, teto do
-- localStorage) e o app parou de gravar. A causa não é um defeito: é o desenho. Um CRM que
-- só cresce nunca vai caber numa caixa de 10 MB, e a mudança para o IndexedDB (S40) apenas
-- adiou o encontro em 11 dias — porque IndexedDB é o MESMO computador.
--
-- A decisão de Marcos, no dia: sem remendo, produto para escala.
--
-- ── As três regras que este esquema serve ─────────────────────────────────────────────
--
-- 1. `user_id` DESDE A PRIMEIRA LINHA. Não existe "depois eu multiplico por usuário": uma
--    tabela sem dono é uma migração dolorosa e um vazamento esperando acontecer. Mesmo com
--    um usuário só, toda leitura é filtrada por dono. Ver a lição de /api/vagas-lead (S41):
--    a rota "de vaga pública" servia o parecer da IA SOBRE a pessoa, sem credencial.
--
-- 2. A DESCRIÇÃO DA VAGA MORA EM COLUNA PRÓPRIA. Medido no app real em 30/jul:
--    `jobDescription` sozinho é 45% do peso de tudo. É texto grande, escrito uma vez e lido
--    só quando a pessoa abre aquele card. Se ele viajasse dentro do JSON do card, TODA lista
--    carregaria megabytes que ninguém vai ler. Separado, a lista pede `dados` e deixa
--    `descricao` no banco até alguém abrir o card.
--
-- 3. CHAVE ROTACIONÁVEL SEM ÓRFÃO. O dono não é o hash da credencial — é uma linha em
--    `usuarios`. Trocar a chave de acesso de alguém (por vazamento, por troca de aparelho)
--    não pode desligar a pessoa dos seus próprios dados.

CREATE TABLE IF NOT EXISTS usuarios (
  user_id     TEXT PRIMARY KEY,          -- estável para sempre; nunca derivado da credencial
  nome        TEXT,
  chave_hash  TEXT NOT NULL UNIQUE,      -- SHA-256 da chave de acesso; a chave crua nunca é gravada
  criado_em   INTEGER NOT NULL,
  ativo       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cards (
  user_id     TEXT    NOT NULL,
  card_id     TEXT    NOT NULL,          -- TEXT de propósito: hoje convivem id numérico e "vaga_..."
  status      TEXT    NOT NULL,
  atualizado  INTEGER NOT NULL,          -- epoch ms, o mesmo `updatedAt` do card
  dados       TEXT    NOT NULL,          -- o card inteiro em JSON, SEM a descrição
  descricao   TEXT,                      -- 45% do peso; buscada só quando o card abre
  PRIMARY KEY (user_id, card_id),
  FOREIGN KEY (user_id) REFERENCES usuarios(user_id)
);

-- A lista do Kanban e a do arquivo são sempre "os cards deste dono, neste estágio, mais
-- recentes primeiro". Sem este índice, cada abertura de tela varre a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_cards_dono_estagio ON cards(user_id, status, atualizado DESC);

-- Marca d'água da mudança de casa. A regra da S40 vale igual aqui, e é a única que não se
-- negocia: o dado só sai do computador depois de ser lido DE VOLTA da nuvem, byte a byte
-- igual. Esta tabela guarda o que já foi conferido, para que uma migração interrompida
-- (aba fechada, rede caída) recomece de onde parou em vez de duplicar ou apagar.
CREATE TABLE IF NOT EXISTS migracoes_dado (
  user_id     TEXT    NOT NULL,
  bloco       TEXT    NOT NULL,          -- 'arquivo_morto', 'processos_vivos'
  conferido   INTEGER NOT NULL DEFAULT 0,
  quantos     INTEGER NOT NULL DEFAULT 0,
  em          INTEGER NOT NULL,
  PRIMARY KEY (user_id, bloco)
);
