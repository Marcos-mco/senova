# Testes da espinha (candidatura)

Testes automatizados do **processo principal**: a candidatura assistida pelo copiloto.
Não precisam de browser nem de rede — extraem as funções **reais** do `index.html`
(por balanceamento de chaves) e as exercitam num sandbox `vm` com mocks mínimos.
Se o código do app mudar e quebrar o processo, estes testes acusam.

## Rodar

```
node testes/registro.js      # Estação 4 — registro do envio (35 testes)
node testes/documentos.js    # Estação 2 — CV, carta e criação de card (23 testes)
node testes/espinha.js       # Integração — o processo inteiro, nos 2 caminhos (25 passos)
```

Saem com código 1 se algo falhar.

## Os dois caminhos cobertos

- **Caminho A** — vaga achada por fora, que o Senova nunca viu: clicar na extensão cria o
  card com a descrição da página, gera CV/carta e registra o envio.
- **Caminho B** — vaga que veio do Senova: o copiloto reconhece o card (sem duplicar),
  prepara os documentos e registra o envio mesmo estando noutro domínio.

## O que estes testes protegem (bugs reais que já existiram)

- Registro **morto** no Caminho A (guardas `if(!an.jobId) return` desistindo em silêncio).
- Pontes casando o card **só por jobId do LinkedIn** → `sem_card` em qualquer outro portal.
- **Falha silenciosa**: `return false` sem avisar ninguém.
- Card **duplicado** ou **rebaixado** (processo em Entrevista protegido).
- Documento revisado sendo **sobrescrito**.
- Timeline **duplicada** quando detecção automática e botão manual disparam juntos.

## Convenção

O casamento de vaga tem **um ponto único** no app: `_acharVagaRef(d)` — jobId → URL real →
empresa+cargo. Registro, desfazer e as 4 pontes de documento passam por ele. Lógica de
casamento duplicada divergindo foi o que sumiu com o TV Integração (Sessão 24) — não repetir.
