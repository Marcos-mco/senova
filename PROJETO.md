# Senova Suite — Documento de Projeto
**Versão:** 1.0 · **Atualizado:** 04/mai/2026 · **Responsável:** Marcos Franco

---

## 1. Visão Geral

**Senova Suite** é uma plataforma pessoal de recolocação executiva construída como aplicação web única (*single-file app*), hospedada no GitHub Pages e integrada à API da Anthropic via proxy Cloudflare Workers.

**URL de produção:** https://marcos-mco.github.io/senova  
**Worker proxy:** https://senova-proxy.marcos-mco.workers.dev  
**Repositório:** https://github.com/marcos-mco/senova  

---

## 2. Arquitetura Técnica

```
[Usuário / Browser]
        │
        ▼
[GitHub Pages — index.html]
        │  fetch POST
        ▼
[Cloudflare Worker — senova-proxy]
        │  x-api-key (secret)
        ▼
[Anthropic API — claude-sonnet-4-5]
        │
        ▼
[Cloudflare KV — vagas_lista / contatos_lista]
```

### Decisões técnicas registradas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Hospedagem | GitHub Pages | Gratuito, versionado, deploy por commit |
| Proxy | Cloudflare Workers | Elimina CORS, protege API key, gratuito até 100k req/dia |
| Banco de dados | Cloudflare KV | Sem servidor, persiste dados entre sessões |
| Framework | Vanilla HTML/CSS/JS | Arquivo único, sem build, sem dependências |
| Modelo IA | claude-sonnet-4-5 | Único modelo que funciona no endpoint atual |
| Fonte display | Playfair Display 700 | Brand book Senova — NUNCA substituir |
| Fonte corpo | Inter 400/500/600 | Brand book Senova — NUNCA usar DM Sans |

### Regras invioláveis de design (Brand Book)

- Azul: `#1A3A5C` · Dourado: `#C9A84C` · Ação: `#2E6DA4` · Névoa: `#F0F4F8` · Carvão: `#2C2C2A`
- Fontes: Playfair Display (títulos) + Inter (corpo) — jamais DM Sans
- Público 40+: fontes grandes, alto contraste
- Tom: Experiente · Confiante · Humano · Direto
- **Nunca tocar em CSS/cores/fontes/layout sem aprovação explícita**

---

## 3. Módulos Atuais (v3.0 — maio/2026)

| Módulo | Status | Descrição |
|--------|--------|-----------|
| Anti-ATS | ✅ Funcional | Analisa vaga, gera CV adaptado, score ATS, keywords |
| LinkedIn | ✅ Funcional | Otimiza headline, about e experiência em PT/EN/ES |
| Pipeline CRM | ✅ Funcional | Kanban 5 colunas + lista de contatos, persistido no KV |
| Simulador de Entrevista | ✅ Funcional | 5 perguntas calibradas + feedback por resposta |

---

## 4. Infraestrutura e Credenciais

| Item | Valor | Onde gerenciar |
|------|-------|----------------|
| GitHub repo | github.com/marcos-mco/senova | github.com |
| Cloudflare login | marcos_mco@hotmail.com | dash.cloudflare.com |
| Worker name | senova-proxy | CF → Workers & Pages |
| KV Namespace | VAGAS_KV | CF → KV |
| API Key Anthropic | Configurada como secret no Worker | CF → Workers → senova-proxy → Settings → Variables |
| E-mail profissional | marcos@labordei.com.br | Microsoft 365 |
| DNS | Cloudflare (labordei.com.br) | NS: lilyana + merlin |

---

## 5. Processo de Atualização (como fazer deploy)

1. Editar o arquivo `index.html` localmente ou via Claude
2. Acessar **github.com/marcos-mco/senova**
3. Clicar em `index.html` → ícone lápis ✏️
4. Selecionar tudo (`Ctrl+A`) → colar novo conteúdo
5. Clicar em **Commit changes**
6. Aguardar ~30 segundos → recarregar com `Ctrl+Shift+R`

**Regra de ouro:** sempre verificar que o arquivo não contém `api.anthropic.com` antes de publicar.  
**Verificação rápida:** `Ctrl+F` por `api.anthropic.com` → deve retornar zero resultados.

---

## 6. Roadmap de Melhorias

### Fase 1 — Agora (maio/2026)

- [ ] **Outlook → CRM automático:** vagas recebidas por e-mail entram automaticamente no pipeline
- [ ] **Busca de vagas na web:** pesquisar LinkedIn/Gupy e trazer direto para o Anti-ATS
- [ ] **CRM automático:** botão "Salvar no CRM" popula o Kanban direto — sem copiar texto
- [ ] **Remover aba "Entrada CRM"** do Anti-ATS (substituída pela automação)

### Fase 2 — Próximo ciclo (jun/2026)

- [ ] **Campo "Negativados":** coluna ou filtro para vagas com resposta negativa
- [ ] **Filtros de busca no CRM:** por empresa, status, prioridade, data
- [ ] **Próximos passos com datas:** follow-up com prazo, alerta de vencimento
- [ ] **Dashboard estratégico:** visão consolidada — taxa de retorno, funil, tendências
- [ ] **Relatórios consolidados:** exportar PDF com resumo do processo seletivo

### Fase 3 — Médio prazo (jul–ago/2026)

- [ ] **Análise de resultados:** IA analisa padrões (quais vagas têm mais retorno, quais headhunters respondem mais)
- [ ] **PMV Senova para outros usuários:** validar R$47/mês com público 40+
- [ ] **Registro domínio senova.com.br**
- [ ] **Avaliar migração para Cowork** quando o app tiver múltiplos usuários

---

## 7. Melhorias Anotadas pelo Usuário (04/mai/2026)

Lista original preservada para referência:

> - Emissão de relatórios consolidados
> - Campo negativados
> - Colocar filtros para busca
> - Criar processo de próximos passos com datas, prazos e demais variáveis comum em CRMs de mercado
> - Análise de resultados
> - Criação de dashboard para análise estratégica
> - Criar plano para PMV
> - Verificar se temos um projeto com processos e metodologia corretos

**Status:** todas incorporadas no roadmap acima.

---

## 8. Arquivos no Repositório

| Arquivo | Status | Ação |
|---------|--------|------|
| `index.html` | ✅ Ativo — versão de produção | Nunca excluir |
| `README.md` | ✅ Ativo | Manter atualizado |
| ~~`app.js`~~ | ❌ Excluído | Resíduo de versão antiga |
| ~~`style.css`~~ | ❌ Excluído | Resíduo de versão antiga |
| ~~`senova_suite_v2.html`~~ | ❌ Excluído | Resíduo de versão antiga |

---

## 9. Análise de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| API key expirar/vazar | Baixa | Alto | Configurada como secret no Worker — nunca exposta no código |
| GitHub Pages fora do ar | Muito baixa | Médio | Backup do index.html neste projeto Claude |
| KV perder dados | Muito baixa | Alto | Exportar backup mensal dos dados via `/api/vagas` |
| Limite Cloudflare gratuito (100k req/dia) | Baixa | Médio | Uso pessoal — estimativa de ~50 req/dia |

---

## 10. Glossário

| Termo | Significado |
|-------|-------------|
| ATS | *Applicant Tracking System* (sistema de triagem automática de currículos) |
| Worker | Script Cloudflare que roda na borda da rede, sem servidor |
| KV | *Key-Value store* — banco de dados simples do Cloudflare |
| PMV | Produto Mínimo Viável |
| Brand Book | Guia de identidade visual — cores, fontes, tom de voz |

---

*Documento mantido no repositório GitHub e no Projeto Claude de Marcos Franco.*
