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
- [ ] Nível do cargo-alvo (`atsCargo`) resultou no número certo de páginas: até
      Gerente Sênior = 1 página (5 experiências, bullets só nas 2 mais recentes);
      Diretoria/C-Level = 2 páginas (histórico completo) — regra em `skill_cv.md`,
      calibrada com jsPDF real na S34 (ver `_nivelAlvoPDF` em index.html)
- [ ] Se o cargo-alvo não bateu em nenhum padrão da heurística de nível (`atsCargo`
      ambíguo ou vazio), o default é NUNCA cortar — confirmar que saiu como 2 páginas
      (histórico completo), não 1 pág truncada por engano

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
