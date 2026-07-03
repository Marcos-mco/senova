# Diagnóstico do Funil — Senova CRM

**Data do diagnóstico:** 03/jul/2026
**Autor:** Bruno (Claude Code) — leitura direta, nenhuma alteração feita no app.

---

## 0. Nota metodológica — leia antes dos números

Este é o ponto mais importante do relatório: **a fonte de dados não é fresca.**

- Os cards de pipeline (`senova_vagas_v2`) vivem **só no localStorage do navegador** — não há banco de dados nem cópia no Worker/KV. O único jeito de eu ler esse dado de fora do browser é a partir de um backup exportado pelo botão "Exportar dados".
- O backup mais recente disponível em `C:\Users\marco\Downloads` é **`senova_backup_20260623 (2).json`, exportado em 23/jun/2026 às 11h12** — **10 dias antes de hoje**. Qualquer candidatura enviada, resposta recebida ou card criado/editado entre 23/jun e hoje **não está neste relatório**.
- Os "leads" do radar automático (`vagas_lead`, Adzuna/Jobicy) **eu consultei ao vivo hoje** via `GET /api/vagas-lead` — esse dado está atualizado (03/jul).
- **Recomendação:** antes de basear a mudança de estratégia nestes números, exporte um backup novo (Configurações → Exportar dados) e eu refaço a leitura em cima dele. Os números abaixo são direcionalmente confiáveis (o padrão não muda em 10 dias), mas os totais absolutos do item 1 vão estar um pouco defasados.

**Universo analisado:** 172 cards no pipeline (`senova_vagas_v2`), criados entre 15/abr/2026 e 23/jun/2026 (~10 semanas).

---

## 1. Total de cards por status atual

O app hoje usa 6 status canônicos (não 8) — `negado` e `descartado` foram migrados para dentro de `arquivado` em algum momento (ver `index.html:4405`), então essa distinção **não existe mais nos dados**. Fiz uma reconstrução por texto (seção 2) para recuperar parte dela.

| Status no app | Contagem | % |
|---|---:|---:|
| `lead` | 32 | 18,6% |
| `aplicado` | 11 | 6,4% |
| `entrevista` | 1 | 0,6% |
| `proposta` | 0 | 0% |
| `aceito` | 0 | 0% |
| `arquivado` | 128 | 74,4% |
| **Total** | **172** | 100% |

`arquivado` é hoje uma categoria "gaveta única" que mistura leads que nunca foram trabalhados, candidaturas recusadas, candidaturas enviadas sem resposta e falhas de envio. Abri essa gaveta na seção 2.

---

## 2. Candidatura efetivamente enviada vs. lead que nunca virou envio

Reconstruí isso card a card, cruzando `status`, `notas`, texto da `timeline` e linguagem de rejeição (ex.: "posição foi preenchida", "seguimos com outro candidato"). Classificação única e mutuamente exclusiva para os 172 cards:

| Categoria | Cards | % do total |
|---|---:|---:|
| **Candidatura enviada — confirmada** (status avançou, ou e-mail/timeline confirma envio, ou há recusa registrada que pressupõe envio prévio) | **23** | 13,4% |
| Lead aberto, nunca chegou a candidatura (`status=lead`) | 32 | 18,6% |
| Arquivado por limpeza em lote — lead nunca trabalhado | 70 | 40,7% |
| Arquivado — recusado por score no Anti-ATS **antes** de qualquer envio | 5 | 2,9% |
| Arquivado sem motivo registrado (candidaturas de abr/2026 sem resultado anotado + ruído de e-mail) | 39 | 22,7% |
| Falha de envio (bounce — e-mail não entregue) | 1 | 0,6% |
| Ruído — newsletter de portal de vagas importada por engano como card | 2 | 1,2% |
| **Total** | **172** | 100% |

**Resposta direta:** de 172 cards, **23 (13,4%) viraram candidatura de fato enviada.** Os outros 86,6% nunca saíram da fase de lead ou morreram por triagem automática — a maior parte (70 cards, 41% de todo o pipeline) foi lead que simplesmente **nunca foi trabalhado** e acabou arquivado em lote.

⚠️ Ressalva importante: a faixa "arquivado sem motivo registrado" (39 cards) inclui nomes reais de abril/2026 que originalmente tinham `status=aplicado` no código (Payoneer, SKY, Samsung, Ambev, Publicis, CI&T, Marista, GPAC, 99/DiDi, Thomson Reuters, Figma, Adlook, Omie, Keeta, Binance) — ou seja, **candidaturas que provavelmente foram enviadas de verdade**, mas cuja resposta (ou ausência dela) nunca foi anotada antes de irem para o arquivo. Se você souber o desfecho de algum desses, o número de "enviada confirmada" sobe — pode chegar a ~35 (20%). Lista completa no Apêndice A.

---

## 3. Distribuição das candidaturas enviadas (as 23 confirmadas) por canal

| Canal | Candidaturas |
|---|---:|
| Email | 11 |
| LinkedIn | 10 |
| Extensão Chrome | 2 |
| Indicação | 0 |
| Headhunter | 0 |

**Ressalva de qualidade de dado:** o campo `canal` reflete **como o card entrou no CRM**, não necessariamente por onde a candidatura foi de fato submetida. Ao ler o conteúdo real dos 11 cards "Email", pelo menos 3 (Concentrix, ASIS Tax Tech, Ricoh Latin America) são na verdade confirmações de candidatura enviada via **LinkedIn Easy Apply** que chegaram por e-mail e foram importadas com `canal=Email`. Ou seja, o canal real de submissão está subestimado para LinkedIn e superestimado para Email. Não há campo estruturado hoje que capture "canal de submissão real" separado de "canal de origem do card" — se isso importa para a estratégia, vale criar esse campo.

Indicação e Headhunter aparecem no funil (ex.: Marista, Renato Berkowitz/C-level, Grupo Boticário via Michael Page) mas nenhum desses casos teve confirmação de envio identificável nos dados — todos ficaram em `lead` ou foram recusados antes.

---

## 4. Distribuição por setor/segmento das empresas

**Não é possível responder com confiança.** Não existe campo estruturado de setor/segmento no card. Tentei extrair de texto livre (`atsAnalise`, gerado pela análise de CV) e:

- Apenas 19 dos 172 cards (11%) têm esse campo preenchido.
- Uma extração por padrão de texto ("setor de X", "indústria de X") encontrou match em só 2 desses 19: *"saúde em expansão"* (Wide Executive Search) e *"entretenimento"*.

Isso não é uma amostra estatisticamente útil. Setor/segmento hoje é um dado **inexistente na prática**, não um dado difícil de agregar. Se isso é relevante para a mudança de estratégia, é preciso instrumentar a captura desse campo daqui para frente (ex.: pedir para a IA classificar setor no momento da análise da vaga e gravar em campo próprio) — não dá para reconstruir retroativamente com confiabilidade.

---

## 5. Taxa de resposta real

Usando a definição literal: cards que saíram de `aplicado` para qualquer estágio seguinte (`entrevista`, `proposta`, `aceito`).

- **1 card em 12** com status ≥ `aplicado` avançou para `entrevista`: **TV Integração — Afiliada Globo** (Gerente de Marketing, Uberlândia).
- Taxa de resposta por avanço de estágio: **8,3%** (1/12), ou **4,3%** (1/23) se usarmos o universo mais amplo de todas as candidaturas confirmadas.
- **Nenhum card** chegou a `proposta` ou `aceito` neste snapshot.
- Adicionalmente, achei **5 candidaturas com recusa explícita registrada** (Grupo Boticário, Michael Page BR, Recrutamento Grupo Potencial, Deloitte, Leroy Merlin) — todas via e-mail, todas arquivadas sem nunca terem virado entrevista.

**Dias até resposta (n=1, único dado disponível):**
TV Integração — criado em 28/mai/2026 (importado via varredura), primeira entrevista agendada em 10/jun/2026 → **13 dias** até a primeira resposta positiva. Entrevista realizada em 16/jun; em 23/jun (último dado do backup) o card seguia em `entrevista`, aguardando novo contato via WhatsApp com o recrutador.

Não dá para calcular "dias médios até resposta" com confiança estatística — a amostra é de 1 candidatura com desfecho positivo conhecido e 5 com desfecho negativo, mas nenhuma delas tem timeline registrando a data do e-mail de recusa (só a `notas`), então não dá para medir o intervalo criação→recusa com precisão.

---

## 6. Os "298 leads antigos" — esclarecimento necessário

O número 298 não aparece em nenhum dado vivo hoje — ele vem de duas anotações antigas (`PROJETO.md:50` e `skill_crm.md:143`), registradas antes de uma limpeza em lote já ter acontecido. **Esse número está desatualizado.**

O que existe hoje, de fato:

**a) No pipeline CRM (`senova_vagas_v2`):** 32 cards ainda em `status=lead`, todos criados entre 20/jun e 23/jun/2026 (leva recente do radar automático, ainda não trabalhada). Usando os limiares padrão do Worker (`score_minimo_br: 70`, ver `senova-worker.js:548`):

| Limiar de score | Leads que passam | Leads abaixo |
|---|---:|---:|
| ≥ 70 (padrão BR) | **2** | 30 |
| ≥ 60 | 4 | 28 |
| ≥ 50 | 6 | 26 |

Os 2 acima de 70: **Faculdades Pequeno Príncipe – FPP (score 82)** e **INDI Staffing Services (score 72)** — nenhum dos dois avançou de status até 23/jun.

**b) No radar automático (`vagas_lead`, KV — consultado ao vivo hoje 03/jul):** o KV guarda só as **top 100** por score (o Worker recorta em `senova-worker.js:1277-1279` a cada varredura), então não há mais 298 lá — nunca vai haver, é um teto de design. Hoje: 100 leads, dos quais só 26 têm `score` numérico preenchido, e apenas **2 têm `classificacao=candidatar` com score ≥ 70**: uma vaga de CMO na Espanha (score 85) e uma de Gerente de Marketing (score 85), ambas de 21-22/mai/2026 — **mais de 40 dias paradas sem virar card no pipeline**.

**Resumo direto:** o "acúmulo de leads antigos" é real, mas o número certo hoje é bem menor que 298: **32 leads abertos no CRM + 2 leads de alto score parados no radar há 40+ dias**, não centenas represadas.

---

## 7. Faixa salarial das vagas aplicadas (quando o dado existe no card)

Apenas **20 de 172 cards (11,6%)** têm o campo `salário` preenchido — a grande maioria fica em branco. Os valores existentes:

| Empresa | Status | Salário registrado |
|---|---|---|
| Payoneer, SKY, Samsung, Ambev, CI&T, BSI, GPAC, 99/DiDi, Thomson Reuters, Figma | arquivado | R$ 19–25k |
| Indústria Saúde (Wide Executive Search) ×2, Ipsen, SaaS B2B (Evermonte), Neodent, Concentrix, Amazon | arquivado | R$ 19–25k CLT |
| Marista | arquivado | R$ 15–20k |
| Grupo Rodoxisto | aplicado | R$ 6.000 |
| Faculdades Pequeno Príncipe – FPP | lead | R$ 240K |

A faixa dominante e consistente é **R$ 19.000–25.000/mês**, o que bate com o nível de cargo (Diretor/C-level) buscado. Os dois outliers (R$ 6.000 e R$ 240K) merecem checagem manual — o primeiro parece baixo demais para o perfil, o segundo parece estar em escala anual, não mensal, e pode ter sido digitado errado.

Nenhuma das 23 candidaturas "enviadas confirmadas" com salário registrado teve resposta positiva além do próprio TV Integração (sem salário anotado).

---

## Achados críticos para a decisão de estratégia

1. **86,6% do pipeline nunca virou candidatura real.** O gargalo não é "poucas vagas boas aparecem" — é execução: leads chegam (radar automático funciona, 172 em 10 semanas) e morrem parados até serem arquivados em lote (41% de todo o histórico).
2. **De 23 candidaturas confirmadas, só 1 virou entrevista (4,3%).** Amostra pequena para tirar conclusão de mercado, mas é a única entrevista em ~2,5 meses de atividade.
3. **Setor da vaga é dado inexistente hoje** (11% de cobertura, quase nenhuma extraível de forma confiável). Se a nova estratégia depende de segmentar por setor, isso precisa ser instrumentado antes, não vai sair do histórico.
4. **O número "298 leads antigos" que motivou parte da conversa está desatualizado** — a real limpeza pendente hoje é bem menor (32 + 2), o que muda o dimensionamento de qualquer ação de "arrumar a casa" antes da virada de estratégia.
5. **Faixa salarial é consistente (R$19-25k) nos poucos cards que têm o dado**, mas 88% dos cards não têm salário registrado — não dá para usar isso como sinal de mercado com confiança.

---

## Apêndice A — os 39 cards "arquivado sem motivo registrado"

Empresas que originalmente entraram com `status=aplicado` (candidatura provavelmente enviada) e hoje estão arquivadas sem nenhuma nota de desfecho: Payoneer, PinkMed, SKY, Adlook, Omie, Keeta, Samsung, Binance, Ambev, Publicis, Marista, CI&T, GPAC, FIEP, 99/DiDi, Thomson Reuters, Figma.

Ruído provável (notificação/portal, não candidatura real): "Bem-vindo(a) à LEROY MERLIN", "Acessar LEROY MERLIN BR", "stays@ses-mail.inhire.app", "Novas oportunidades para: Vendas : São Paulo".

Demais (Apple Brazil, Omnicom, monday.com, Ipsen, Ipsen Biopharmaceuticals, Grupo Tigre, Amazon Serviços de Varejo, Espanha, Vaga Gerente de Marketing, CI&T, Jobbol, ABF Developments, Neodent, D Prime, Simera, Cruzeiro do Sul Educacional, Locarmais, Indústria Saúde via Wide Executive Search) — status original era `lead`, então provavelmente nunca chegaram a candidatura; entraram nessa categoria por não terem o texto "limpeza em lote" na última entrada da timeline.
