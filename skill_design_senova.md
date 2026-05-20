# skill_design_senova — Design System & Brand Guide Senova Suite

Versão: 2.0 · Criado: abr/2026 · Atualizado: 20/mai/2026
Responsável: Marcos Franco · marcos_mco@hotmail.com

QUANDO USAR: Obrigatoriamente antes de qualquer alteração visual no Senova.

## 1. IDENTIDADE DA MARCA

Nome: Senova
Tagline PT: Sua carreira. Renovada.
Tagline EN: Your career. Renewed.
Domínio: senova.com.br · senova.ai

Logo: quadrado bordas arredondadas rx=14, fundo Azul Senova #1A3A5C, letra S branca bold, ponto dourado canto superior direito.

Personalidade: Experiente · Confiante · Humano · Direto
NUNCA: jovial demais · tecnicista · condescendente

## 2. PALETA DE CORES — IMUTÁVEL

Primárias: Azul Senova #1A3A5C (logo, títulos, sidebar, botão primário) · Dourado #C9A84C (acento, destaques, bordas ativas)
Secundárias: Azul Ação #2E6DA4 (botões, links) · Névoa #F0F4F8 (fundos) · Carvão #2C2C2A (texto)
UI: bg-page #F8F8F6 · bg-card #FFFFFF · bg-mist #F0F4F8 · bg-inactive #E8E4DB · border #E4E4E0 · border2 #C8C3B6
Texto: primary #2C2C2A · secondary #4A4A46 · tertiary #9A9A94
Estado: green #1A7A4A / #EAF7EF · amber #B8670A / #FFF8EC · red #C0281E / #FEF0EF

CSS Variables do produto:
--navy:#1A3A5C; --gold:#C9A84C; --action:#2E6DA4; --bg:#F7F5F0; --bg2:#ffffff; --bg3:#F0EDE6; --bg4:#E8E4DB; --border:#DDD9CF; --border2:#C8C3B6; --text:#1A1A16; --text2:#4A4740; --text3:#8A8680; --green:#1A7A4A; --green-bg:#EAF7EF; --amber:#B8670A; --amber-bg:#FFF8EC; --red:#C0281E; --red-bg:#FEF0EF; --radius:10px; --radius-lg:14px; --font-display:'Playfair Display',Georgia,serif; --font:'Inter',-apple-system,sans-serif;

NUNCA alterar sem aprovação explícita do Marcos Franco.

## 3. TIPOGRAFIA — IMUTÁVEL

Títulos hero: Playfair Display 700 / 40-56px
Títulos seção: Playfair Display 600 / 28-36px
Subtítulos: Inter 600 / 18-22px
Corpo: Inter 400 / 15-16px (mínimo 15px — público 30+)
Labels UI: Inter 500 / 12-13px
Labels caps: Inter 600 + letter-spacing 0.1em / 11px
Line-height mínimo: 1.5 em parágrafos
NUNCA usar DM Sans, Roboto, Arial ou qualquer outra fonte.

## 4. PÚBLICO-ALVO

Profissionais Sênior 30+ em recolocação ativa ou preventiva.
- Clareza sobre criatividade
- Alto contraste é prioridade
- Menos opções, fluxo guiado
- Feedback que o sistema trabalha por eles
- Uma ação principal clara por tela

## 5. TOM E LINGUAGEM

Evitar: "Ei, vamos lá!" / "Ferramenta incrível de IA" / "Você vai arrasar!"
Preferir: "Pronto para o próximo passo?" / "Inteligência a serviço da sua carreira" / "Sua experiência merece a posição certa"

Glossário obrigatório:
Lead = Oportunidade
Analisar CV = Analisar Vaga
Score = Compatibilidade
Pipeline = Processo
Limiar = Critério
Abaixo do limiar = Para Considerar
Candidatar = Enviar Candidatura
Deletar = Remover

## 6. ARQUITETURA DE TELAS

Sidebar ordem: Home · Perfil · Processo · Análise de Vaga · Entrevistas · Contatos

Home blocos em ordem:
1. Novas Oportunidades (vagas aprovadas nos critérios do Perfil)
2. Para Considerar (link discreto — vagas abaixo dos critérios)
3. Ações do Dia (follow-ups vencidos, entrevistas agendadas)
4. Funil Resumido KPIs (Oportunidades / CV Enviado / Em Contato / Propostas)
5. Sinais de Mercado
6. Contatos Ativos

Perfil blocos em ordem:
1. Quem sou (dados pessoais)
2. CV Master (texto ou Sofia)
3. O que busco (FONTE ÚNICA de critérios de triagem: cargo, salário, localização, modelo, países, score mínimo por região)
4. Empresas-alvo (Central de Sinais)
5. Ferramentas (LinkedIn, Outlook, configurações)

Processo colunas: Oportunidade → CV Enviado → Em Contato → Entrevista → Proposta → Fechado

Fluxo de entrada único para todas as fontes:
FONTE (Extensão Chrome / Varredura / Email / Manual) → Triagem pelos critérios do Perfil → Passa: entra em Oportunidade → Não passa: vai para Para Considerar
Home avisa: "X novas oportunidades hoje" e "Y para considerar"

## 7. PADRÕES DE COMPONENTE

Card de Vaga — padrão único para TODAS as telas:
1. Empresa (Playfair Display navy 14px bold)
2. Cargo (Inter 500 13px)
3. Localização + Modelo (Inter 400 text3 12px)
4. Badge Compatibilidade (>=75 verde / 50-74 âmbar / <50 cinza)
5. Badge Fonte (Varredura IA / Extensão Chrome / Email / Manual)
6. Data/hora (Inter 400 text3 12px)
7. Ação principal contextual por estágio
Nunca mostrar campos vazios — omitir se não houver dado.

Modal padrão: máx 600px · header fixo · body scroll · footer fixo · NUNCA modal sobre modal · botão destrutivo esquerda vermelho ghost · botão primário direita navy · altura mínima botões 44px

Botões: Primário (navy branco) · Secundário (gold navy) · Ghost (borda border2) · Perigo (borda red texto red)

Filtros: dropdown único "Organizar" agrupando ordenação + prioridade + canal · padrão Mais recente · filtro ativo ponto dourado

## 8. REGRAS DE INTERAÇÃO

Após qualquer CRUD: chamar aplicarFiltros() NUNCA só renderCRM()
NUNCA exigir F5 do usuário
Feedback visual em menos de 200ms
Operações longas: skeleton loader não spinner
Sucesso: toast verde canto inferior direito 3 segundos
Responsividade mínima: 1280px

## 9. NUNCA FAZER

Nunca DM Sans ou fonte fora do brand book
Nunca alterar variáveis CSS de cor sem aprovação do Marcos Franco
Nunca modal sobre modal
Nunca campos vazios visíveis no card
Nunca linguagem CRM exposta ao usuário (Lead, Pipeline, etc.)
Nunca reload após ação do usuário
Nunca erros técnicos — traduzir para linguagem humana

## 10. REFERÊNCIAS

Produto: https://marcos-mco.github.io/senova
Repositório: https://github.com/Marcos-mco/senova
Worker: https://senova-proxy.marcos-mco.workers.dev
Fontes: fonts.google.com/specimen/Playfair+Display + fonts.google.com/specimen/Inter
Brand Guide original: C:\Users\marco\OneDrive\Documentos\Senova\Senova___Brand_Guidelines_v1_0.docx

Skill consolidado em 20/mai/2026 a partir do Brand Guide v1.0 (abr/2026)
Atualizar a cada mudança de padrão aprovada pelo Marcos Franco.
