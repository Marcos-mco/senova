# skill_api_claude — Boas Práticas Anthropic API no Senova

Versão: 1.0 · Criado: 26/mai/2026
QUANDO USAR: Ao implementar ou revisar qualquer chamada à API Anthropic no Worker ou frontend.

---

## 1. REGRA INVIOLÁVEL — NUNCA chamar api.anthropic.com do browser
Toda chamada IA passa pelo Worker (senova-proxy). `Ctrl+F` por `api.anthropic.com` no index.html antes de qualquer commit — deve retornar ZERO resultados.

---

## 2. MODELOS DISPONÍVEIS (mai/2026)

| Modelo | Uso recomendado | Custo relativo |
|--------|----------------|----------------|
| claude-haiku-4-5 | Classificação, extração rápida, triagem | Mais barato |
| claude-sonnet-4-6 | Análise de CV, geração de texto, coaching | Equilibrado |
| claude-opus-4-7 | Tarefas complexas de raciocínio (evitar no Worker — lento) | Mais caro |

**Senova usa atualmente:**
- Worker: `claude-sonnet-4-5` ← **inconsistência — atualizar para `claude-sonnet-4-6`**
- Frontend: `claude-sonnet-4-6` ✅

---

## 3. PROMPT CACHING — IMPLEMENTAR (não implementado ainda)

Prompt caching reduz custo em até 90% em chamadas repetidas com o mesmo contexto de sistema.

### Padrão para o Worker
```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'prompt-caching-2024-07-31',  // ← habilita caching
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT_LONGO,
        cache_control: { type: 'ephemeral' }  // ← marca para cache (TTL 5 min)
      }
    ],
    messages: [{ role: 'user', content: userMessage }]
  })
});
```

### Onde aplicar no Senova
- `/api/analisar-vaga`: system prompt do ATS é idêntico para todas as chamadas → cachear
- `/api/claude`: system prompt genérico → cachear
- `/api/sofia`: personalidade da Sofia → cachear
- `/api/sinais-mercado`: prompt de classificação → cachear

### Economia estimada
- Custo sem cache: $0.003/chamada (estimado)
- Custo com cache (hit): $0.00045/chamada (-85%)
- Cache hit esperado: >80% das chamadas de análise de CV

---

## 4. STREAMING — quando usar

Use streaming quando a resposta for longa (CV completo, carta, simulador de entrevista):

```javascript
// Worker — streaming para o browser
const stream = await anthropic.messages.stream({ ... });
const response = new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

Não use streaming para: classificações rápidas, extração de campos, score ATS (precisa do JSON completo).

---

## 5. TIMEOUT E RETRY

```javascript
// Padrão atual: AbortController com timeout
const ctrl = new AbortController();
const timeout = setTimeout(() => ctrl.abort(), 25000); // 25s max (Cloudflare Workers: 30s CPU)
try {
  const res = await fetch(WORKER_URL, { signal: ctrl.signal, ... });
  clearTimeout(timeout);
} catch (e) {
  if (e.name === 'AbortError') throw new Error('Análise expirou — tente novamente');
  throw e;
}
```

---

## 6. FORMATO DE RESPOSTA

Sempre pedir JSON estruturado quando precisar parsear:

```javascript
// Prompt: "Responda APENAS com JSON válido, sem texto antes ou depois:"
// Parsing seguro:
let data;
try {
  const text = await res.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
} catch {
  throw new Error('Resposta IA inválida — tente novamente');
}
```

---

## 7. MODELO PARA CHAMADAS HAIKU (rápidas e baratas)

Para classificações, extrações e triagem rápida (não para CV ou carta):

```javascript
model: 'claude-haiku-4-5-20251001',
max_tokens: 512,  // curto — classificação não precisa de mais
```

Usar Haiku em: classificar emails, extrair empresa/cargo de assunto, score rápido de relevância.

---

## 8. BUGS CONHECIDOS DE API

- Worker usa `claude-sonnet-4-5` enquanto frontend usa `claude-sonnet-4-6` → inconsistência a corrigir
- Sem prompt caching implementado → custo evitável
- `/api/claude` não tem limite de rate por usuário → implementar quando multi-usuário
