# SKILL: Perfil Público — Auditoria de Configuração e Discoverabilidade

## Quando usar
Sempre que for auditar um perfil profissional de Marcos num portal (LinkedIn, Xing, Indeed
ou outro) para a estratégia inbound — "ser encontrado" em vez de "procurar vaga" (decisão de
31/ago, ver [[project_linkedin_inbound_s54]]). Reusar em qualquer portal novo, não só LinkedIn.

## Por que existe
Um checklist, não um agente de código: essa auditoria é feita ao vivo, navegando no portal
via Claude in Chrome — não há código do Senova para ler. Os agentes `senova-auditor` e
`senova-viabilidade` auditam o codebase (index.html/Worker); isto audita uma conta externa.

## Checklist de configuração (rodar em cada portal)

1. **Indexação pública** — o perfil aparece em busca (Google/Bing) fora do portal? Toda
   seção relevante (experiência, formação, resumo, recomendações) está liberada para
   visitante não-logado? Foto pública ou só para conexões?
2. **Dado de contato exposto** — e-mail/telefone aparecem em texto público? É decisão
   consciente (reduz fricção para quem quer falar) ou vazamento acidental? Sempre perguntar,
   nunca decidir sozinho — é uma escolha de exposição x risco de spam que é dele.
3. **Sinal de disponibilidade** — existe um equivalente a "Open to Work"? Está visível para
   todo mundo, só recrutadores, ou oculto? Ponderar contra o posicionamento atual dele (hoje:
   consultor ativo na Consigliere — sinal aberto demais pode destoar do papel atual).
4. **Consistência de dados** — formação, datas, nomes de cargo batem com a fonte de verdade
   (diploma > Perfil do Senova > CV > perfil do portal, nessa ordem — ver
   [[project_formacao_bate_com_diploma_s49]])? Nunca aceitar o que o portal mostra como
   verdade — cruzar com o diploma real.
5. **URL personalizada** — existe, é legível, bate com a usada em CV/assinatura de e-mail?
6. **Prova social** — recomendações, certificados, projetos, prêmios: presentes e visíveis
   publicamente?
7. **Destaques / conteúdo fixado** — há algo fixado no topo que resuma a proposta de valor
   atual (não vazio, não desatualizado)?
8. **Idioma e adequação regional** — se o portal é de outro mercado (ex.: Xing para DACH),
   o tom e o idioma seguem a regra específica daquele mercado (ver `skill_linkedin.md` —
   seção Mercado Europeu)?

## Output esperado
Para cada item: valor atual → recomendação → porquê. Nunca mudar configuração de conta sem
aprovação explícita dele (regra padrão de permissão para "Changing account settings").

## Portais cobertos até agora
- LinkedIn — auditado em 07/set/2026, ver [[project_linkedin_execucao_07set]]. Resultado:
  perfil público já 100% aberto para indexação; e-mail exposto no Sobre (mantido, decisão
  dele); Open to Work em "Apenas recrutadores" (mantido, recomendado); nenhuma mudança feita.
- Catho — auditado em 08/set/2026 (item 4, consistência de dados). Achado: as correções de
  data da RPC/EADCon de [[project_rpc_quase_onze_anos_07set]] tinham ido só ao Resumo e à
  Formação UFSC, não à seção de Experiência — mais o título de Barcelona ainda traduzido e
  uma entrada de MBA/FGV duplicada (Formação acadêmica + Cursos e especializações). 4
  correções aprovadas por Marcos e aplicadas: Gerente de Marketing RPC 11/2008→08/2008;
  EADCon saída 10/2008→07/2008; título de Barcelona → "Máster en Dirección de Marketing and
  Sales" (redação do diploma); MBA/FGV duplicado excluído de "Cursos e especializações".
  Demais itens do checklist (indexação, contato, disponibilidade, URL, prova social,
  destaques, idioma) não auditados nesta passada — só o item 4 foi disparado pela correção
  de data pendente.
- Gupy — auditado em 08/set/2026 (item 4, consistência de dados). 13 correções aprovadas por
  Marcos e aplicadas na seção "Experiência" (Formação acadêmica + Experiência profissional
  combinadas num único bloco, um só botão "Salvar e continuar" no final): título de Barcelona
  → "Máster en Dirección de Marketing and Sales"; Évora → "Mestrado em Gestão de Empresas,
  especialização em Marketing"; FAAP fim → dezembro/1995; FGV/ISAE início e fim; RPC Gerente
  de Marketing início → agosto/2008 ([[project_rpc_quase_onze_anos_07set]]); RPC Diretor de
  Marketing fim → abril/2019; EADCon nome e fim → julho/2008; Expoente cargo → "Diretor de
  Vendas"; split da Editel em duas entradas (Superintendente Regional de Vendas 2001–2004 /
  Gerente de Produção Gráfica 1996–2001). **Achado de método:** a primeira "Salvar e
  continuar" reportou sucesso (checkmark verde), mas a verificação campo-a-campo pós-save
  encontrou o título de Évora ainda com o valor antigo — só a edição feita via o modal
  "Adicionar curso" (usado para cursos sem sugestão no typeahead) não tinha sido sincronizada
  ao estado do formulário antes do save disparar; Barcelona e FAAP, editados pelo mesmo modal,
  persistiram normalmente. Corrigido reaplicando a edição e salvando de novo; segunda
  verificação confirmou os 13 itens corretos. Lição: depois de qualquer save em formulário
  com campos via modal, reabrir e conferir campo-a-campo antes de dar por encerrado — o
  checkmark verde não é garantia de persistência real.
- Vagas.com — auditado em 09/set/2026 (item 4, consistência de dados + Resumo Profissional
  reescrito). **Formação Acadêmica**: 4/4 conferidas, sem correção necessária. **Histórico
  profissional**: 11/11 — faltavam as duas empresas do início de carreira (Intec Tecnologia
  1990-1992, DLS – Dória, Lara e Stalimir Associados 1989-1990), adicionadas via "ADICIONAR
  EMPRESA". **Resumo Profissional**: reescrito de "Síntese das Qualificações" (texto antigo,
  pré-RPC) para o texto fiel a `PERFIL_MARCOS.resumo_geral` (`index.html:3116`). Endereço, CPF
  e Pretensão salarial conferidos intactos, mantidos como estavam.
  **Achado de UI**: ao criar empresa nova via "ADICIONAR EMPRESA" (não ao editar uma já
  existente), Nacionalidade/País(es)/Segmento/Porte são **obrigatórios** e `PERFIL_MARCOS` não
  guarda esse dado — resolver por julgamento coerente com a era/natureza da empresa. O campo
  de Resumo Profissional tem limite de 1000 caracteres (o texto padrão, 529 caracteres, cabe
  sem cortar).
- Próximos portais: InfoJobs é o próximo da fila (aba `infojobs.com.br/Candidate/CV/insert2.aspx`
  já aberta, ainda não tocado). Depois, a definir com Marcos entre os demais candidatos (Robert
  Half, Page Personnel, LHH — ver fila em VIRGILIO.md).
