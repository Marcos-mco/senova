# Mapa Mental + Fluxograma — Senova Suite
# Atualizado: 09/jun/2026

---

## 1. Mapa Mental — Estrutura do Produto

```mermaid
mindmap
  root((Senova Suite))
    Início / Home
      Para Hoje
        Entrevistas sem data agendada
        Ações agendadas com data
        Processos inativos urgentes
        Contatos com ação vencendo
      O que há de novo
        Oportunidades
          Vagas por email recrutador
          Busca automática Adzuna/Jobicy
        Retornos
          Emails positivos / pipeline
          Gravações Fathom
        Novidades no mercado
          Alertas Google artigo por artigo
          Bing News RSS
        Para revisar
          Vagas abaixo do limiar de score
    Perfil
      Dados pessoais e cargo-alvo
      Busca automatizada
        Cargo-alvo / Região / Salário
        Frequência da busca
        Domínios prioritários
      Documentos
        Upload de CV
        Carta base
        Certificações
      Integrações
        Outlook Mail + Calendar
        LinkedIn futuro
      Preferências
        Idioma e notificações
      Sofia Onboarding
        14 perguntas Career Anchors
        Preenchimento automático do perfil
    Avaliar Posição
      Score ATS 0-100
      Veredicto coaching 3 estados
        Ótima fit
        Pode valer
        Fora do perfil
      Preparar Candidatura
        CV adaptado à vaga
        Carta de apresentação
        Email de candidatura
      Declinar vaga
    Processos / Kanban
      Colunas ativas
        Oportunidade
        CV Enviado
        Em Contato
        Entrevista
          Modal canal de convite
          Data e horário
          Evento Outlook Calendar
          Dica Sofia inline
        Proposta
      Arquivados
        Aceito
        Negado
        Descartado
      Por card
        Timeline de atividades
        Histórico de emails
        URL da vaga
        Notas
        Canal de entrada
        Prioridade Alta/Média/Baixa
      KPI Strip
        Processos ativos
        Taxa de retorno
        Entrevistas ativas
        Propostas ativas
    Mercado
      Comunidades executivas
      Newsletters recomendadas
      Firmas de Executive Search
      Sinais de mercado RSS
    Seu Painel / Relatórios
      Funil visual por estágio
      Taxa de retorno por canal
      Tempo médio por estágio
    Sofia
      Onboarding por texto
      Simulador de Entrevista
        Perguntas por cargo/empresa
        Feedback por resposta
      Coaching inline nos cards
    Extensão Chrome
      Captura vaga do LinkedIn
      Score rápido no popup
      Veredicto coaching 3 estados
      Importar para Processos
      Análise profunda no app
```

---

## 2. Fluxograma — Jornada do Executivo (Funil Completo)

```mermaid
flowchart TD
    subgraph DESCOBERTA["🔍 DESCOBERTA"]
        A1[Alerta Google\nnova menção à empresa]
        A2[Email de recrutador\nou headhunter]
        A3[Busca automática\nAdzuna / Jobicy]
        A4[LinkedIn via\nextensão Chrome]
        A5[Indicação\nde contato]
    end

    subgraph QUALIFICAÇÃO["📊 QUALIFICAÇÃO"]
        B1[Avaliar Posição\nScore ATS 0-100]
        B2{Veredicto}
        B3[Ótima fit\n≥ 70]
        B4[Pode valer\n40-69]
        B5[Fora do perfil\n< 40]
    end

    subgraph PROCESSO["📋 PROCESSOS — Kanban"]
        C1[Oportunidade]
        C2[CV Enviado\n+ Carta + Email]
        C3[Em Contato\nresposta recebida]
        C4[Entrevista\ndata + canal + Calendar]
        C5[Proposta\nnegociação]
    end

    subgraph PREPARAÇÃO["🎤 PREPARAÇÃO"]
        D1[Sofia: pesquisar empresa]
        D2[Simulador de Entrevista]
        D3[Perguntas + feedback IA]
        D4[Ajustar CV/carta\npara a vaga]
    end

    subgraph RESULTADO["✅ RESULTADO"]
        E1[Aceito 🎉]
        E2[Negado]
        E3[Descartado\npelo candidato]
        E4[Aprendizado\nmotivo da perda]
    end

    A1 --> B1
    A2 --> C3
    A3 --> B1
    A4 --> B1
    A5 --> C1

    B1 --> B2
    B2 --> B3
    B2 --> B4
    B2 --> B5

    B3 --> C1
    B4 --> C1
    B5 --> E3

    C1 -->|candidatar| C2
    C2 -->|resposta positiva| C3
    C3 -->|convite entrevista| C4
    C4 -->|oferta recebida| C5
    C5 --> E1
    C5 --> E2
    C2 -->|silêncio total| E3
    C3 -->|processo encerrado| E2

    C4 --> D1
    C4 --> D2
    D2 --> D3
    D1 --> D4

    E2 --> E4
    E4 -.->|retroalimentação futura| B1

    style DESCOBERTA fill:#EFF6FF,stroke:#2563EB
    style QUALIFICAÇÃO fill:#FFF7ED,stroke:#D97706
    style PROCESSO fill:#F0FDF4,stroke:#059669
    style PREPARAÇÃO fill:#FAF5FF,stroke:#7C3AED
    style RESULTADO fill:#F0FDF4,stroke:#059669
```

---

## 3. Mapa de Sinais — Como o email vira ação

```mermaid
flowchart LR
    EM[Email recebido\nno Outlook] --> WK[Worker\nCloudflare]
    WK --> SR{SENDERS_RULES\npré-classificação}
    SR -->|Fathom| FAT[Gravação disponível\n📹 no Retornos]
    SR -->|Desconhecido| IA[Claude IA\nClassificação]
    IA --> POS[Positivo / Pipeline\n→ Retornos na Home]
    IA --> VAG[Vaga por email\n→ Oportunidades]
    IA --> ALR[Google Alert\n→ Artigos individuais]
    IA --> IRR[Irrelevante\n→ Descartado silencioso]
    IA --> BLQ[Bloqueado\nna whitelist]
```

---

## 4. Legenda de Status — Vocabulário Aprovado

| Status no sistema | Nome visível ao usuário | Cor |
|---|---|---|
| `lead` | Oportunidade | Cinza |
| `aplicado` | CV Enviado | Âmbar |
| `contato` | Em Contato | Azul |
| `entrevista` | Entrevista | Roxo |
| `proposta` | Proposta | Verde |
| `aceito` | Aceito | Verde escuro |
| `negado` | Não avançou | Vermelho suave |
| `descartado` | Descartado | Cinza |

---

## 5. Gaps conhecidos (visão × implementação)

| Seção | Existe | Falta |
|---|---|---|
| IEE — Índice de Empregabilidade | ❌ | Diferencial central — 5 dimensões, score holístico |
| Modo Radar (executivo empregado) | ❌ | TAM 9x — monitoramento passivo sem modo ativo |
| Aprendizado pós-resultado | ❌ | Motivo da perda, retroalimentação para o IEE |
| Simulador ligado ao card | ⚠ Órfão | Botão "Preparar" no modal de Entrevista |
| Handoff busca automática → qualificação | ❌ | "Avaliar antes de adicionar" |
| Vocabulário aprovado 100% | ⚠ Parcial | Pipeline/Varredura/CRM ainda visíveis em 6 pontos |

---

*Este arquivo é o mapa de referência do produto. Atualizar quando houver mudança estrutural.*
