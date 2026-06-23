#!/bin/bash
node -e '
let d = "";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const fp = (j.tool_input || {}).file_path || "";
    if (fp.includes("index.html")) {
      const msg = [
        "CHECKLIST QA — index.html:",
        "[ ] Leu skill_qa.md antes de editar?",
        "[ ] Vocabulario verificado (sem Pipeline/CRM/Cards/Varredura/Lead/Score)?",
        "[ ] Empty states verificados (ocultar secao vazia, nunca mostrar zero)?",
        "[ ] Novidades no mercado sem botao + Abrir processo?",
        "[ ] Regressoes verificadas (fluxos afetados testados mentalmente)?"
      ].join("\n");
      process.stdout.write(JSON.stringify({ systemMessage: msg }));
    }
  } catch(e) {}
});
'
