#!/bin/bash
node -e '
const msg = [
  "ENCERRAMENTO DE SESSAO — Senova:",
  "[ ] Atualizou VIRGILIO.md com estado atual e versao?",
  "[ ] Listou proximos passos e bugs abertos?",
  "[ ] Commitou todas as alteracoes?",
  "[ ] Fez git push?"
].join("\n");
process.stdout.write(JSON.stringify({ systemMessage: msg }));
'
