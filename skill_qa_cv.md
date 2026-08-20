# SKILL — QA FINAL DO CV
## Protocolo de qualidade do documento antes de uma candidatura REAL
Versão: 1.0 · Criado: 21/jul/2026 (Sessão 34)

---

## QUANDO USAR

Antes de Marcos enviar um CV/carta gerado pelo Senova para uma vaga REAL — não é o
checklist de todo commit (isso é o `skill_qa.md`). Este roda sob demanda, uma vez por
documento final, porque nenhum teste automatizado enxerga o PDF renderizado de fato
(gap identificado na S33: "cv_pdf.js testa lógica do cabeçalho, cv_estrutura.js testa a
estrutura de dados; nenhum vê o PDF renderizado").

Cobre 5 eixos: **veracidade, eficácia ATS, ortografia, adequação à vaga, design.**

---

## EIXO 1 — VERACIDADE (automatizável, roda em todo commit)

A IA nunca decide fatos — só adapta redação. `filtrarExperienciasRelevantes` e
`_cvParaPDF` (index.html) constroem a parte factual (cargo/empresa/período/bullets)
direto de `PERFIL_MARCOS`, nunca do texto livre da IA. Coberto por
`testes/cv_estrutura.js` (roda no pre-commit, `.githooks/pre-commit`).

Verificação manual complementar (o teste não lê semântica):
- [ ] Nenhum número/métrica no resumo ou nas competências que não exista em
      `PERFIL_MARCOS` ou nos bullets das experiências mostradas
- [ ] Nenhuma experiência, cargo ou empresa inventada — todas rastreiam a um `id` real
      em `PERFIL_MARCOS.experiencias`

## EIXO 2 — EFICÁCIA ATS (texto vetorial real, não imagem)

O `index.html` NÃO tem `package.json`/`node_modules` de propósito (app single-file,
sem build — ver CLAUDE.md). Então o round-trip jsPDF→pdf-parse não entra no
`testes/` versionado; roda no **scratchpad**, à mão, antes de uma entrega real:

1. Instalar as libs de validação no scratchpad (não no repo):
   `npm i jspdf pdf-parse` dentro do diretório de scratchpad da sessão
2. Extrair as funções reais do `index.html` por balanceamento de chaves (padrão em
   `scratchpad/smoke_pdf.js` da S33 — reaproveitar o script)
3. Gerar o PDF com o jsPDF de verdade, extrair o texto de volta com `pdf-parse`
4. Checklist sobre o texto extraído:
   - [ ] Nome, contato e todas as seções aparecem como texto (não sumiram)
   - [ ] Nenhuma palavra com espaçamento literal entre letras (ex.: "R E S U M O") —
         sintoma do bug de `charSpace` já corrigido uma vez na S33, pode voltar se
         alguém reintroduzir letter-spacing via opção do jsPDF
   - [ ] Análise/MATCH SCORE/CRM NUNCA vazam pro texto extraído
   - [ ] Keywords da vaga (as que a IA disse ter inserido) aparecem de fato no texto

## EIXO 3 — ORTOGRAFIA (leitura humana/IA, não automatizável)

Aplica-se só ao texto ADAPTADO pela IA (subtítulo, resumo, competências) — os fatos
(cargo/empresa/bullets) vêm literalmente de `PERFIL_MARCOS`, já revisados uma vez.
- [ ] Ler resumo + subtítulo + competências por inteiro, procurando erro de
      concordância, acentuação, crase, repetição de palavra
- [ ] Nenhuma mistura de idioma dentro do mesmo bloco (a menos que a vaga seja EN/ES/DE)

## EIXO 4 — ADEQUAÇÃO À VAGA

- [ ] Subtítulo e resumo realmente espelham a linguagem do anúncio da vaga (não é o
      texto genérico de fallback — comparar com `subtitulo` padrão em `_cvParaPDF`,
      que só aparece quando a IA não gerou nada aproveitável)
- [ ] **A trajetória sai inteira, e nenhum cargo mostrado sai mudo.** O nível do cargo-alvo
      (`atsCargo`) NÃO decide mais quantas experiências o documento mostra — decide só a
      altura de cargo que o pedido à IA descreve. O único corte é o teto `CV_MAX_EXPS`
      (index.html), que existe para o rabo de início de carreira não empurrar uma 3ª página.
      Esta régua errou duas vezes em 20/ago/2026 e cada correção viu metade do problema:
      primeiro o CV do Grupo Zonta saiu com 3 de 5 cargos sem uma linha de entrega
      (reprovado); depois todos os 5 ganharam bullets e o CV do Grupo Ric foi reprovado de
      novo. A segunda reprovação é a que tinha razão — **o problema era o CORTE, não o
      silêncio**: as 5 mais recentes de uma carreira são as 5 mais recentes, não as 5
      melhores, e o corte escondia a operação de R$ 40 milhões com 900 escolas, os 180
      parceiros com 120 mil alunos e o Troféu Imprensa.
      Medido com jsPDF real: 5 exps = 2 páginas, 9 = 2, 11 = 2, 12 = 3. **O corte em 5 nunca
      comprou página nenhuma** — era perda pura de credencial. Duas páginas para 25 anos de
      carreira é padrão; cargo mudo e carreira truncada não.
      A tabela medida está no comentário de `CV_MAX_EXPS` (index.html).
      **Se alguém for mexer nessa régua de novo, MEÇA de novo** — é a terceira vez que um
      palpite sobre ela produz documento reprovado. Script no scratchpad da S48
      (`pior_caso.js`), receita no EIXO 2 acima.
- [ ] **As experiências que sobraram são as que a VAGA pede**, não as que o CV já citava.
      `_cvParaPDF(textoVaga, cvTexto, …)`: o 1º argumento tem de ser a descrição da vaga
      (`lastCVVaga`). Passar `lastCV` nas duas pontas — o defeito corrigido em 20/ago/2026 —
      faz o filtro comparar o CV contra ele mesmo e sai um PDF bonito com a trajetória errada
- [ ] Com cargo-alvo ambíguo ou vazio (`atsCargo`), o documento sai igual ao dos demais
      níveis — histórico completo, 2 páginas — nunca 1 página truncada por engano

## EIXO 5 — DESIGN (Brand Book)

- [ ] Nome em Playfair Display 700, navy (`#1A3A5C`); nenhum outro peso da fonte usado
- [ ] Linha dourada (`#C9A84C`) presente uma única vez, como acento
- [ ] Nenhum bullet órfão — bloco de experiência nunca quebra entre páginas deixando
      cargo/empresa numa página e uma bullet solta na outra (fix da S33: altura do
      bloco inteiro é medida ANTES de desenhar, ver `_buildPDFExecDoc`)
- [ ] Rodapé ("Marcos Franco · Curitiba, PR" + "Página N de M") presente em toda página
- [ ] Papel branco, sem faixa navy — diagramação aprovada é texto direto no branco

---

## CHECKLIST RÁPIDO (copiar antes de liberar um CV para envio real)

```
[ ] EIXO 1 — testes/cv_estrutura.js passou (automático) + leitura manual de números/fatos
[ ] EIXO 2 — round-trip jsPDF+pdf-parse no scratchpad: texto vetorial, sem vazamento, sem charSpace
[ ] EIXO 3 — resumo/subtítulo/competências lidos por inteiro, sem erro
[ ] EIXO 4 — linguagem adaptada à vaga real (não é o fallback genérico) + página certa p/ o nível
[ ] EIXO 5 — Brand Book ok, sem bullet órfão, rodapé em todas as páginas
```

Só depois desse checklist pedir a Marcos que teste — e pedir com cenário específico
(ação + resultado esperado), nunca "veja se está ok" (regra geral em `skill_qa.md`).

*skill_qa_cv.md v1.0 — criado na S34 para fechar a pendência "QA final do CV" aberta
na S33.*
