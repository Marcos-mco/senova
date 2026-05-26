# skill_pwa — Mobile e PWA para o Senova

Versão: 1.0 · Criado: 26/mai/2026
QUANDO USAR: Ao implementar responsividade, PWA ou qualquer feature mobile no Senova.

---

## 1. ESTRATÉGIA MOBILE — 3 FASES

| Fase | Entregável | Quando |
|------|-----------|--------|
| Fase 1 | Responsivo 768px+ (tablet/celular landscape) | jun/2026 |
| Fase 2 | PWA — instalável no celular, notificações push | ago/2026 (junto MVP Comercial) |
| Fase 4 | App nativo iOS + Android | jan/2027 (se validado) |

**Hoje:** Senova exige 1280px mínimo → inacessível no celular.
**Fase 1:** funcionar bem em iPad (768px) e celular landscape (768px).
**Fase 2:** instalar no celular como app (sem app store), notificações push para follow-up.

---

## 2. RESPONSIVIDADE — REGRAS PARA PÚBLICO 35+

```css
/* Breakpoints do Senova */
@media (max-width: 1280px) { /* tablet landscape */ }
@media (max-width: 960px)  { /* tablet portrait / celular landscape */ }
@media (max-width: 768px)  { /* celular portrait — mínimo viável */ }
```

### Touch targets — nunca menos de 44px
```css
.btn, .nav-item, .card-action { min-height: 44px; min-width: 44px; }
```

### Sidebar mobile — collapse para bottom nav ou hamburger
- Em < 960px: sidebar vira bottom navigation (Home, Processo, Sofia, Mais)
- Ícones grandes (24px), labels curtas

### Cards mobile — stack vertical
```css
@media (max-width: 960px) {
  .home-grid { grid-template-columns: 1fr; } /* 2 colunas → 1 */
  .kanban { overflow-x: auto; display: flex; } /* scroll horizontal no kanban */
}
```

### Fonte mínima — NUNCA menor que 15px no mobile (público 35+)
```css
@media (max-width: 768px) {
  body { font-size: 16px; } /* aumentar no mobile, não reduzir */
}
```

---

## 3. PWA — IMPLEMENTAÇÃO (Fase 2)

### Arquivos necessários
```
senova/
├── index.html  (adicionar <link rel="manifest"> e service worker registration)
├── manifest.json  (novo)
└── sw.js  (novo — service worker)
```

### manifest.json mínimo
```json
{
  "name": "Senova Suite",
  "short_name": "Senova",
  "description": "Sua recolocação executiva",
  "start_url": "/senova/",
  "display": "standalone",
  "background_color": "#F7F5F0",
  "theme_color": "#1A3A5C",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker — cache estratégico
```javascript
// sw.js — cache shell do app (fonts, CSS, HTML)
const CACHE = 'senova-v1';
const SHELL = ['/', '/senova/', 'https://fonts.googleapis.com/...'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // nunca cachear chamadas de API
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

### Push notifications — follow-up (Fase 2)
- Notificação quando follow-up vencer (data + 7/14/21 dias)
- Notificação quando varredura encontrar nova vaga acima do limiar
- Implementar via Cloudflare Workers (Push API não precisa de servidor dedicado)

---

## 4. CHECKLIST MOBILE ANTES DE QUALQUER DEPLOY

- [ ] Testar em iPhone SE (375px) e Samsung Galaxy (360px)
- [ ] Todos os botões ≥ 44px de altura
- [ ] Modais não excedem 100vh; fecham com swipe ou toque fora
- [ ] Fontes ≥ 15px em todos os breakpoints
- [ ] Sidebar/navegação acessível sem hover
- [ ] Formulários: `inputmode="numeric"` em campos de número, `autocomplete` correto
- [ ] Nenhum overflow horizontal na página

---

## 5. ATENÇÃO — GITHUB PAGES E PWA

GitHub Pages serve em HTTPS (obrigatório para PWA) e suporta service workers.
O manifest.json e sw.js devem estar na raiz do repositório (junto com index.html).
`start_url` deve ser `/senova/` (não `/`) porque o repositório é em subdiretório.
