# skill_security — Segurança no Senova Suite

Versão: 1.0 · Criado: 26/mai/2026
QUANDO USAR: Ao implementar qualquer rota nova no Worker, aceitar input do usuário, ou lidar com tokens OAuth.

---

## 1. MODELO DE SEGURANÇA DO SENOVA

```
[Browser] → [HTTPS] → [Cloudflare Worker] → [Anthropic API / Microsoft Graph / Adzuna]
```

- Worker é o único ponto que toca a API key da Anthropic — nunca exposta ao browser
- OAuth tokens ficam no KV (server-side) — nunca no localStorage do browser
- O Worker é público (sem auth de usuário) — adequado para 1 usuário; **mudar em Fase 2**

---

## 2. OWASP TOP 10 — APLICABILIDADE NO SENOVA

### A01 — Broken Access Control
**Atual:** Worker público — qualquer pessoa com a URL pode chamar as rotas.
**Fase 2:** Implementar autenticação JWT ou API key por usuário nas rotas do Worker.
**Regra agora:** Não expor dados sensíveis (token Outlook, emails) em rotas sem verificação de origem.

### A02 — Cryptographic Failures
- OAuth token salvo no KV (OK — server-side, não exposto)
- **Nunca** logar o token Outlook em console ou retornar em resposta de erro

### A03 — Injection
Risco principal: o Worker aceita input do usuário (descrição de vaga, URL) e passa para a IA.

```javascript
// Sanitizar qualquer input antes de incluir no prompt
function sanitizarInput(texto, maxLen = 5000) {
  if (typeof texto !== 'string') return '';
  return texto.slice(0, maxLen).replace(/<script[\s\S]*?<\/script>/gi, '');
}
```

### A05 — Security Misconfiguration
- `MS_TENANT_ID = 'consumers'` hardcoded — correto para conta pessoal Hotmail
- **NUNCA** commitar `wrangler.toml` com secrets embutidos
- Secrets do Worker ficam em Cloudflare Dashboard → Workers → Settings

### A07 — Identification and Authentication Failures
- Token OAuth do Outlook expira e é renovado com `refresh_token`
- **Verificar sempre** `res.ok` antes de `res.json()` nas chamadas ao Worker

---

## 3. HEADERS DE SEGURANÇA — ADICIONAR AO WORKER

```javascript
// Em toda resposta do Worker, adicionar:
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// No json() helper do Worker:
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': 'https://marcos-mco.github.io',  // não '*'
      ...securityHeaders
    }
  });
}
```

**Atenção:** Hoje o CORS provavelmente usa `'*'` — restringir para a URL de produção quando possível.

---

## 4. VALIDAÇÃO DE INPUT NO WORKER

```javascript
// Padrão para todas as rotas POST
async function handleAnalisarVaga(req, env) {
  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  const vaga = sanitizarInput(body.vaga_descricao, 8000);
  const cv   = sanitizarInput(body.cv_texto, 12000);

  if (!vaga || vaga.length < 50) return json({ error: 'Descrição muito curta' }, 400);
  if (!cv   || cv.length < 100)  return json({ error: 'CV muito curto' }, 400);

  // prosseguir com a chamada à API
}
```

---

## 5. FETCH EXTERNO — /api/fetch-descricao

Esta rota faz fetch de URLs externas fornecidas pelo usuário — risco de SSRF.

```javascript
// Bloquear URLs internas e privadas
function urlSegura(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(u.hostname)) return false;
    return true;
  } catch { return false; }
}
```

---

## 6. FASE 2 — MULTI-USUÁRIO (preparar)

Quando Senova tiver múltiplos usuários, implementar:
- JWT com expiração de 24h assinado com secret do Worker
- Rate limiting por IP: `env.SENOVA_KV.get('rl:' + ip)` + contador com TTL 1h
- Namespace KV por usuário: `usuario:{id}:vagas_lead`, `usuario:{id}:perfil`
- Log de auditoria: toda ação que modifica dados registra `{userId, action, timestamp}`

---

## 7. NUNCA FAZER

- Nunca logar tokens, API keys ou dados pessoais em `console.log` no Worker
- Nunca retornar stack traces em produção — mensagem genérica ao usuário
- Nunca aceitar `model` como parâmetro do usuário — fixar no Worker
- Nunca fazer `eval()` ou `new Function()` com input do usuário
