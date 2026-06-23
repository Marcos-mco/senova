#!/bin/bash
node -e '
let d = "";
process.stdin.on("data", c => d += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const cmd = (j.tool_input || {}).command || "";
    if (/git\s+commit/.test(cmd)) {
      const fs = require("fs");
      try {
        const content = fs.readFileSync(
          "C:/Users/marco/Documents/senova/index.html", "utf8"
        );
        if (content.includes("api.anthropic.com")) {
          process.stdout.write(JSON.stringify({
            continue: false,
            stopReason: "BLOQUEADO: api.anthropic.com encontrado em index.html. Toda chamada Anthropic deve passar pelo Worker. Corrija antes de commitar."
          }));
          return;
        }
      } catch(e) {}
    }
  } catch(e) {}
});
'
