# Manual do Sistema — Sistema Alfaiataria (Schuck)

Este é o manual de referência do sistema de gestão da Schuck: um mapa de todos
os dados (o que existe no banco, o que cada campo quer dizer) e de todas as
telas (o que cada uma mostra, de onde vêm os números, que regra de negócio
está embutida em cada cálculo).

Ele serve para dois públicos ao mesmo tempo:

- **O Tales**, dono do negócio, que não programa mas conhece o negócio de
  cabo a rabo — para entender "de onde vem esse número" e "o que essa tela
  faz" sem precisar abrir código.
- **Uma IA (ou desenvolvedor) que vai continuar mantendo o sistema** em
  sessões futuras, sem memória do que foi decidido antes — para saber os
  nomes reais de tabelas e campos no Supabase/Postgres, e as regras de
  negócio que já foram implementadas (para não reinventar, duplicar ou
  quebrar algo sem perceber).

> **Fonte da verdade real do banco:** os arquivos `supabase/schema_v1.sql`
> (chamado `schema.sql`) até `schema_v49...sql`, na ordem numérica. Cada um
> é uma migração aditiva (raramente remove algo) com comentários explicando
> o motivo da mudança. Este manual resume o estado **final** de cada tabela
> depois de todas as migrações — mas se algo parecer desatualizado, os
> arquivos `schema_v*.sql` sempre têm a palavra final.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Mapa de Dados — tabela por tabela](#2-mapa-de-dados--tabela-por-tabela)
3. [Módulos e Páginas](#3-módulos-e-páginas)
   - [3.1 Camisaria](#31-camisaria)
   - [3.2 Alfaiataria](#32-alfaiataria)
   - [3.3 Geral / Financeiro](#33-geral--financeiro)
   - [3.4 Sistema](#34-sistema)
4. [Fluxos de ponta a ponta](#4-fluxos-de-ponta-a-ponta)
5. [Glossário](#5-glossário)
6. [Notas técnicas para manutenção futura](#6-notas-técnicas-para-manutenção-futura)

---

## 1. Visão Geral

### As duas linhas de negócio

O sistema controla **duas operações distintas** da Schuck, tratadas quase
sempre em telas espelhadas (uma para cada linha):

| | **Camisaria** | **Alfaiataria** |
|---|---|---|
| O que é | Camisas sob medida | Trajes, costumes, casacos, bombers, calças, coletes, blazers — peças sob medida mais complexas |
| Quem produz | Fabiana (costureira externa) | Ícaro, Zonzo e freelancers (equipe do ateliê) |
| Onde é vendida | Na loja | Também na loja / diretamente pelo Tales |
| Tabela principal | `pedidos` | `pedidos_alfaiataria` (chamada de "peça" no código e neste manual) |
| Etapas de produção | Aguardando Produção → Em Produção → Prova → Pronto → Entregue | Fluxo mais granular: Molde → Corte → Prova na Tela → Ajuste 1 → Prova na Caixa → Ajuste 2 → Prova Final → Finalização → Entregue |

As duas linhas têm páginas de custo, relatório e dashboard **separadas**
(ex.: *Custos da Camisaria* vs. *Custos do Ateliê*), mas os custos que são
da empresa como um todo (pró-labore, contador, plano de saúde, sistemas)
são **rateados** entre elas — ver [seção 3.3](#33-geral--financeiro) e o
glossário de "rateio".

### Os três perfis de acesso (login)

O sistema tem um único código-fonte, mas `src/App.jsx` decide qual "Shell"
(app completo) mostrar de acordo com `perfil.papel` (tabela `perfis`,
carregada pelo `AuthContext`):

| Papel | Shell (componente) | O que a pessoa vê |
|---|---|---|
| **`dono`** (padrão) | `src/Shell.jsx` | Sistema completo: todas as abas, financeiro, os dois painéis, configurações. Quem não tem linha em `perfis` também cai aqui — assim o login original do Tales sempre tem acesso total, sem precisar de cadastro manual. |
| **`vendedor`** | `src/ShellVendedor.jsx` | App enxuto de 3 abas: **Novo Pedido** (só camisa), **Meus Pedidos** (só os que ele mesmo lançou) e **Campanha** (reativação de clientes). Sem painéis, financeiro, alfaiataria, planos ou configurações — nem pela tela nem pelo banco (ver RLS abaixo). |
| **`producao`** | `src/ShellProducao.jsx` | App enxuto do Ícaro: só as peças de **alfaiataria** em produção (fila, cards com medidas, avançar etapa, marcar início/pausa, escrever observação de produção). Nunca vê valor, forma de pagamento nem dados pessoais de cliente — essas colunas nem são pedidas na consulta que a tela dele faz. |

A restrição de acesso é reforçada em **duas camadas**: a tela (React) só
oferece o que cada perfil pode fazer, e o banco (Postgres RLS — Row Level
Security) bloqueia por trás mesmo que alguém tentasse acessar a API
diretamente. As políticas de RLS ficam nos arquivos `schema_v9_vendedor.sql`
e `schema_v27_producao_alfaiataria.sql`.

Existe ainda uma **quarta "porta"**, sem login nenhum: a página pública de
acompanhamento de pedido (`/acompanhar/camisaria/<id>` ou
`/acompanhar/alfaiataria/<id>`), que o cliente final recebe por link — ver
[seção 3.3](#33-geral--financeiro) e o fluxo 4.5.

### Como o código está organizado

- `src/App.jsx` — decide qual Shell mostrar (ver acima) ou renderiza a
  página pública de acompanhamento.
- `src/Shell.jsx` — o app do dono: define o array `NAV` (todas as abas do
  menu, agrupadas em "Camisaria" / "Alfaiataria" / "Geral" / "Sistema"),
  carrega **todos** os hooks de dados de uma vez e passa como props para a
  página ativa.
- `src/hooks/*.js` — um hook por tabela principal do Supabase (ex.:
  `usePedidos.js` ↔ `pedidos`). Cada hook busca os dados, converte
  linha-do-banco → objeto JS (nomes em `snake_case` → `camelCase`) e expõe
  funções de criar/editar/remover que já gravam no Supabase.
- `src/pages/*.jsx` — uma página por aba do menu.
- `src/components/*.jsx` — pedaços de tela reaproveitados entre páginas
  (tabelas, gráficos, calculadora de markup etc.).
- `src/lib/constants.js` — valores fixos do domínio: status possíveis,
  cores, categorias de despesa, composição de aviamentos por tipo de peça,
  parâmetros de tempo de produção.
- `src/lib/helpers.js` — funções puras de cálculo (datas, médias de
  produção, projeção de fila, tradução de status para % de progresso).
- `supabase/schema_v*.sql` — todas as migrações do banco, em ordem.

---

## 2. Mapa de Dados — tabela por tabela

Convenção: nomes de coluna estão como aparecem no Postgres
(`snake_case`); entre parênteses, o nome do campo equivalente no objeto JS
que os hooks devolvem (`camelCase`), quando é diferente.

### `clientes`

Cadastro central de clientes — cada pessoa existe **uma vez só** aqui, e
pedidos/peças/planos/histórico apontam para essa mesma linha.

| Campo | O que é |
|---|---|
| `id` | UUID, chave primária |
| `nome` | Nome completo |
| `nome_normalizado` | Coluna **gerada automaticamente** pelo Postgres (`lower(trim(nome))`) — garante que "João Silva" e "joão silva " não viram dois cadastros. É o que `encontrarOuCriarCliente()` (`src/lib/clientes.js`) usa para decidir se cria um cliente novo ou reaproveita um existente, toda vez que um pedido/peça/plano é salvo com um nome de cliente. |
| `campanha_contatado_em` | Timestamp de quando alguém marcou "já mandei mensagem de reativação" para esse cliente (aba Clientes → Campanha) |
| `created_at` | Data de cadastro |

Lido/escrito por: praticamente todos os hooks de pedido/peça/plano (via
`encontrarOuCriarCliente`), `useNomesClientes`, página **Clientes**.

### `clientes_dados_pessoais`

Dados sensíveis (LGPD), em tabela **separada** de propósito — só o dono lê
(RLS restrito a `is_dono()`); o vendedor só pode **inserir uma vez** (não
lê nem edita depois, para não expor dado de cliente que ele mesmo não
cadastrou).

| Campo | O que é |
|---|---|
| `cliente_id` | Chave primária = FK para `clientes` (1 linha por cliente) |
| `tipo_pessoa` | `PF` ou `PJ` |
| `cpf`, `cnpj`, `razao_social` | Para nota fiscal em nome de empresa |
| `endereco`, `data_nascimento`, `telefone`, `email`, `observacoes` | |
| `consentimento`, `consentimento_em` | Consentimento LGPD |
| `atualizado_em` | |

Escrito por: `salvarDadosPessoaisCliente()` (`src/lib/clientes.js`), chamado
ao salvar um pedido/peça novo com a seção "Dados Pessoais" preenchida.
Lido por: página **Clientes** (detalhe do cliente), `AniversariantesDoMes`.

### `pedidos` (Camisaria)

A tabela mais usada do sistema — um pedido de camisa (pode ter mais de uma
unidade, campo `quantidade`).

| Campo | Objeto JS | O que é |
|---|---|---|
| `id`, `cliente_id`, `created_at`, `updated_at` | — | |
| `vendedor` | `vendedor` | Texto livre — quem vendeu |
| `modelo` | `modelo` | Texto livre com sugestão do catálogo `modelos_camisa` |
| `data_pedido` | `dataPedido` | Data da venda — é a **data de competência de receita** usada em quase todo relatório mensal |
| `previsao_entrega` | `previsaoEntrega` | Data prevista de entrega (editada manualmente pelo dono/vendedor — não há projeção automática de fila para camisaria como existe na alfaiataria) |
| `data_entrega` | `dataEntrega` | Gravada **sozinha** pelo app quando o status muda para "Entregue" (se ainda não tinha data) — alimenta o cálculo de tempo médio de produção |
| `quantidade` | `quantidade` | Nº de camisas do pedido |
| `qt_entregue` | `qtEntregue` | Quantas já foram entregues (para entregas parciais) |
| `status` | `status` | `Aguardando Produção` \| `Em Produção` \| `Prova` \| `Pronto` \| `Entregue Parcial` \| `Entregue` \| `Doação` |
| `valor_receber` / `status_pagamento_receber` | `aReceber.valor` / `aReceber.statusPagamento` | Valor a receber do cliente e status (`Pendente`/`Recebido`) |
| `pagamento_dividido`, `valor_entrada`, `status_entrada`, `valor_restante`, `status_restante` | idem em camelCase | Pagamento em duas partes (entrada + restante na entrega) — `valor_receber` continua sendo o **total** |
| `forma_pagamento`, `forma_pagamento_entrada`, `forma_pagamento_restante` | idem | Cada parcela pode ter forma de pagamento diferente (ex.: metade PIX, metade cartão) |
| `valor_pago_fabiana` / `status_pagamento_fabiana` | `pagoFabiana.valor` / `pagoFabiana.statusPagamento` | Quanto se paga à Fabiana por esse pedido — é o **custo de mão de obra da camisaria** (`Pendente`/`Pago`) |
| `pagamento_fabiana_dividido`, `valor_entrada_fabiana`, `status_entrada_fabiana`, `valor_restante_fabiana`, `status_restante_fabiana` | idem | Mesmo esquema de parcelamento, só que para o pagamento à Fabiana |
| `recompra` | `recompra` | Cliente já tinha comprado antes |
| `plano_assinatura` | `assinatura` | Marca se esse pedido nasceu como parte de um plano de assinatura (ver `planos_assinatura`) |
| `origem_plano_id` | `origemPlanoId` | FK para o plano que gerou esse pedido (via "Emitir pedido do mês") |
| `medidas` (jsonb) | `medidas` | Medidas de colarinho/manga/tórax etc. (ver `MEDIDA_REGRAS`/`MEDIDA_LABELS` em `constants.js`) |
| `descricao` (jsonb) | `descricao` | Características do modelo (pesponto, colarinho, punho, monograma...) |
| `observacoes` | `observacoes` | Nota do Tales |
| `enviado_fabi` | `enviadoFabi` | Marca "ficha já enviada pra Fabiana" — controla o destaque de "não enviado" na lista |
| `medidas_novas` | `medidasNovas` | Marca que as medidas foram atualizadas (cliente mudou de corpo) — ficha impressa destaca em vermelho |
| `criado_por` | — | FK para `auth.users` — quem criou o pedido; é o que restringe o vendedor a ver só o que ele mesmo lançou (RLS) |

Junto de cada pedido vêm os **tecidos** (tabela `tecidos`, ver abaixo,
`pedido_id` apontando para esse pedido).

Hook: `usePedidos.js`. Lido/escrito por quase todas as páginas de Camisaria
e Geral.

### `pedidos_alfaiataria` (chamada de "peça" no app e neste manual)

Uma peça de alfaiataria (traje, calça, casaco...). Estruturalmente parecida
com `pedidos`, mas com bem mais campos por ser uma produção mais longa e
acompanhada de perto.

| Campo | Objeto JS | O que é |
|---|---|---|
| `id`, `cliente_id`, `created_at`, `updated_at` | — | |
| `tipo_peca` | `tipoPeca` | `Traje` \| `Costume` \| `Casaco` \| `Bomber` \| `Calça` \| `Colete` \| `Blazer` \| `Outro` |
| `data_pedido` | `dataPedido` | Data da venda (competência de receita) |
| `status` | `status` | Etapa de produção — ver `STATUS_ALFAIATARIA` em `constants.js` (fluxo novo: Molde → Corte → Prova na Tela → Ajuste 1 → Prova na Caixa → Ajuste 2 → Prova Final → Finalização; mais `Aguardando Produção`, `Entregue Parcial`, `Entregue`, `Doação`, e alguns status antigos ainda válidos para peças legadas: `Em Produção`, `Prova`, `1ª Prova`, `Ajustes`, `2ª Prova`, `Acabamento`, `Pronto`) |
| `previsao_entrega` | `previsaoEntrega` | Data de entrega — pode ser **sugestão automática** ou **manual travada**, ver `previsao_manual` |
| `previsao_manual` | `previsaoManual` | `true` = o Tales digitou essa previsão de propósito e ela **fica travada** (não recalcula sozinha); `false` = é só sugestão automática, acompanha a fila/equipe sempre que elas mudam |
| `data_limite_evento` | `dataLimiteEvento` | Compromisso **rígido** do cliente (casamento, formatura) — diferente da previsão, nunca entra em cálculo de produção, só dispara alerta visual quando está perto (`DIAS_ALERTA_EVENTO` = 20 dias) |
| `data_entrega` | `dataEntrega` | Gravada sozinha ao marcar "Entregue" |
| `valor_total` / `valor_pago` | `valorTotal` / `pago` | **Custo de produção**: quanto se deve/já se pagou ao Ícaro/equipe por essa peça (não é o preço de venda!) |
| `valor_venda` / `status_pagamento_venda` | `valorVenda` / `statusPagamentoVenda` | **Preço de venda ao cliente** |
| `pagamento_dividido`, `valor_entrada`, `status_entrada`, `valor_restante`, `status_restante` | idem | Parcelamento do valor de venda (entrada + restante) |
| `forma_pagamento`, `forma_pagamento_entrada`, `forma_pagamento_restante` | idem | |
| `medidas` (jsonb) | `medidas` | Agrupadas por seção: `{ corpo: {...}, calca: {...}, colete: {...} }` — evita colisão de nomes iguais em seções diferentes (ex.: "Comprimento" existe em corpo e em calça) |
| `caracteristicas` (jsonb) | `caracteristicas` | Botões, lapela, pesponto, construção etc. (só para peças com seção "corpo") |
| `observacoes` / `observacoes_producao` | `observacoes` / `observacoesProducao` | Nota do Tales / nota do Ícaro — campos **separados de propósito** (mesma lógica da planilha antiga, que tinha "Obs. Tales" e "Obs. Icaro" em colunas distintas) |
| `enviado_icaro` | `enviadoIcaro` | Ficha já enviada ao Ícaro |
| `data_inicio_producao` | `dataInicioProducao` | Quando a produção **de verdade** começou (diferente de `data_pedido`) — base do cálculo de tempo real de produção |
| `data_pausa_inicio` / `dias_pausados` | `dataPausaInicio` / `diasPausados` | Controle de pausa (cliente viajou etc.) — dias pausados **não contam** no tempo de produção real |
| `retrabalho` / `retrabalho_obs` | `retrabalho` / `retrabalhoObs` | Marca ajuste extra além do fluxo normal (não caiu bem na prova etc.) |
| `responsavel` | `responsavel` | Quem está produzindo (texto livre) — usado quando a peça tem uma única seção |
| `responsaveis_secoes` (jsonb) | `responsaveisSecoes` | Responsável **por seção** (`{ corpo: "Ícaro", calca: "Zonzo" }`) — para peça composta (ex.: Traje = paletó + calça + colete) com pessoas diferentes em cada parte |
| `prioridade` | `prioridade` | `Alta` \| `Normal` |
| `situacao` | `situacao` | `Aguardando` \| `Em Produção` \| `Pausado` — estado manual/operacional, **diferente** de `status` (que é a etapa do fluxo de costura) |
| `medidas_novas` | `medidasNovas` | Igual ao de `pedidos` |

Hook: `usePedidosAlfaiataria.js` (visão completa, dono). Existe também
`usePecasProducao.js`, com uma consulta **enxuta** (sem nenhuma coluna de
valor/pagamento) usada só pela tela do Ícaro.

### `pedidos_alfaiataria_pausas`

Log paralelo de cada pausa de produção — não substitui `dias_pausados`
(que continua sendo a soma usada no cálculo de tempo real), serve só para
**categorizar por motivo** e permitir relatório de gargalo.

| Campo | O que é |
|---|---|
| `id`, `peca_id` (FK para `pedidos_alfaiataria`) | |
| `motivo` | `cliente_prova` (esperando o cliente vir fazer prova) ou `outro` (falta de tecido, viagem, doença...) |
| `data_inicio`, `data_fim` | `data_fim` nulo = pausa ainda aberta |
| `observacao` | Nota livre sobre o motivo real |

### `tecidos`

Item de tecido de **um** pedido de camisa OU **uma** peça de alfaiataria
(nunca os dois — há uma constraint garantindo isso). Um pedido/peça pode
ter vários itens de tecido.

| Campo | Objeto JS | O que é |
|---|---|---|
| `id` | — | |
| `pedido_id` / `pedido_alfaiataria_id` | — | Exatamente um dos dois é preenchido |
| `codigo`, `numero`, `fornecedor`, `qtd` | idem | Identificação do tecido e quantidade de rolos/itens |
| `ordem` | — | Ordem de exibição |
| `comprado` | `comprado` | Marca "já comprado" (aba Compras) |
| `metragem` | `metragem` | Texto livre (ex.: "3,5m") — metros a comprar |
| `valor_metro` | `valorMetro` | Preço pago por metro — vira **histórico de preço** por fornecedor/código ao longo do tempo, e é a base do cálculo de custo de tecido em Custos do Ateliê/Camisaria/Resultado do Mês |
| `metros_baixados` | `metrosBaixados` | Só em `tecidos` de pedidos de camisa: quantos metros já foram **debitados** do estoque de tecido (ver `estoque_tecidos`) — trava a baixa depois da primeira vez, para não descontar duas vezes se o pedido for reaberto |

### `estoque_tecidos` / `estoque_movimentos`

Estoque de tecido comprado em rolo fechado (pensado originalmente para o
fornecedor Cataguases, que só vende rolos de 30m, mas serve para qualquer
fornecedor com estoque em vez de compra sob encomenda).

**`estoque_tecidos`**: `id`, `codigo` (+ `codigo_normalizado` gerado),
`fornecedor`, `saldo_metros` (saldo atual), `metros_por_rolo` (padrão 30),
`atualizado_em`.

**`estoque_movimentos`**: `id`, `estoque_id`, `tipo` (`entrada`/`saida`),
`metros`, `motivo`, `criado_em` — histórico de toda entrada (compra de
rolo) e saída (uso em um pedido). Uma saída pode deixar `saldo_metros`
negativo — isso é só um **alerta visual**, não bloqueia o lançamento.

Hook: `useEstoqueTecidos.js`. Página: **Estoque Camisaria**.

### `equipe_producao`

Cadastro da equipe do ateliê (substitui a lista fixa que existia antes só
no código).

| Campo | Objeto JS | O que é |
|---|---|---|
| `id`, `nome` | | |
| `ativo` | `ativo` | Faz parte permanente do time (diferente de `trabalhando_hoje`) |
| `trabalhando_hoje` | `trabalhandoHoje` | Flag do dia a dia — quem apareceu para trabalhar **hoje**; entra na conta de quantas peças dá para produzir em paralelo (previsão de entrega) e no card "Profissionais atuando hoje" |
| `tipos_peca` (text[]) | `tiposPeca` | Quais tipos de peça essa pessoa produz (vazio = qualquer tipo) — usado para separar a fila de produção por especialista |
| `horas_por_dia`, `dias_por_semana` | idem | Carga horária — usado no simulador de fila (freelancer 3x/semana conta como fração de uma vaga cheia) |
| `tipo_remuneracao` | `tipoRemuneracao` | `mensal` (salário fixo) ou `diaria` (freelancer) |
| `valor_remuneracao` | `valorRemuneracao` | Valor do salário mensal, ou valor por diária |

Hook: `useEquipeProducao.js`. Página: **Equipe**. Também lido por
**Custos do Ateliê** (custo mensal da mão de obra) e pelos simuladores de
fila de produção (`helpers.js`).

### `fornecedores`

Cadastro simples: `id`, `nome`, `contato`, `observacoes`. Alimenta os
dropdowns de fornecedor em **Compras** e **Aviamentos** (substitui a lista
fixa `FORNECEDORES_TECIDO` que ainda existe em `constants.js` só como
sugestão inicial/legado).

### `aviamentos`

Custo de aviamentos (botão, forro, zíper, entretela...) **por peça-base** —
diferente do tecido, o custo de aviamento não varia por pedido, é fixo por
tipo de peça produzida.

| Campo | Objeto JS | O que é |
|---|---|---|
| `id` | | |
| `peca_base` | `pecaBase` | `Paletó`, `Calça`, `Colete`, `Casaco`, `Bomber` ou `Camisa` — **não** é o mesmo conjunto de `tipo_peca` de `pedidos_alfaiataria`: uma peça vendida pode ser composta de mais de uma peça-base (ver `COMPOSICAO_AVIAMENTOS` no glossário) |
| `item` | `item` | Nome do aviamento (ex.: "Entretela de Lã") |
| `unidade`, `qtd_por_peca`, `valor_unitario` | idem | Custo do item = `qtd_por_peca × valor_unitario` |
| `fornecedor`, `observacoes`, `ordem` | idem | |

O hook `useAviamentos.js` já expõe `custoPorPecaBase` calculado (soma de
todos os itens daquela peça-base) — é isso que os cálculos de custo usam,
nunca a tabela crua.

### `modelos_camisa`

Catálogo de modelos/tecidos de camisa (nomenclatura interna, ex.: "Social
Slim", "Italiana Frotta e Zanone Fio 120").

| Campo | Objeto JS | O que é |
|---|---|---|
| `id`, `nome`, `ativo`, `criado_em` | | |
| `codigo` | `codigo` | Código interno (ex.: "M58 - 1001"), mesmo padrão da Planilha Consolidada — nunca aparece para a Fabi nem no que vai ao contador |
| `valor_referencia_metro` | `valorReferenciaMetro` | Preço de tabela por metro, para tecidos com preço fixo (fica em branco para os que variam muito de rolo a rolo, ex.: Cavalli) |

Alimenta o campo "Modelo" do pedido de camisa (sugestão, texto livre — não
é FK rígida) e a página **Tecidos de Camisa**.

### `planos_assinatura`

Cadastro-modelo de um cliente recorrente (assinatura): medidas e
características ficam salvas **uma vez**, e todo mês o Tales clica em
"Emitir pedido do mês" para gerar um `pedido` de verdade com esses dados já
preenchidos.

| Campo | Objeto JS | O que é |
|---|---|---|
| `id`, `cliente_id`, `vendedor` | | |
| `quantidade` | `quantidade` | Quantas emissões o plano prevê (ex.: 12 = mensal por um ano) |
| `qt_entregue` | `qtEntregue` | Quantas emissões já foram feitas |
| `data_venda` | `dataVenda` | Data em que o plano foi **vendido/fechado** — é aqui que a receita é contabilizada, **não** a cada emissão mensal |
| `valor_receber` / `status_pagamento_venda` + campos de parcelamento | idem | Valor **total** do plano fechado com o cliente |
| `valor_pago_fabiana` | `valorFabiana` | Valor devido à Fabiana **enquanto ainda é só plano** — fica fora do Painel Camisaria (que só lê `pedidos`); quando uma emissão mensal é gerada, esse valor é copiado para o pedido de verdade |
| `medidas`, `descricao`, `tecidos` (jsonb), `observacoes` | idem | Mesmo formato de `pedidos`, mas `tecidos` aqui é um **array jsonb embutido**, não uma FK para a tabela `tecidos` |
| `ativo` | `ativo` | Plano ainda em vigor |

Hook: `usePlanosAssinatura.js`. Página: **Planos de Assinatura**. Ver
também o fluxo 4.4.

### `despesas`

Contas a pagar do negócio — aluguel, contas, material avulso, fornecedores,
salários, pró-labore etc.

| Campo | Objeto JS | O que é |
|---|---|---|
| `id`, `descricao`, `categoria` | | Categoria vem de `CATEGORIAS_DESPESA` (constants.js) |
| `fornecedor` | `fornecedor` | Separado de categoria, para dar visão "quanto devo a cada fornecedor" |
| `valor` | `valor` | Valor do produto/serviço (sem frete) |
| `frete` | `frete` | Valor de frete, separado — para dar "quanto gasto de frete por mês" |
| `valor_pago` | `valorPago` | Quanto já foi pago (pagamento parcial suportado) |
| `vencimento` | `vencimento` | Data de vencimento |
| `status` | `status` | `Pendente` \| `Parcial` \| `Pago` — recalculado automaticamente a partir de `valor_pago` vs. (`valor` + `frete`) |
| `recorrente` | `recorrente` | Quando marcada como `Pago` **e** recorrente, o sistema já lança sozinho a próxima ocorrência (mesmo dia, um mês depois — `somarUmMes()` trata meses mais curtos corretamente) |
| `linha` | `linha` | `Camisaria` \| `Alfaiataria` \| vazio (= compartilhada entre as duas) |
| `valor_camisaria`, `valor_alfaiataria` | `valorCamisaria`, `valorAlfaiataria` | Quando a **mesma** despesa mistura tecido/gasto das duas linhas (mesma nota, mesmo boleto), guarda o valor de cada linha aqui em vez de duas despesas separadas — `valor_camisaria + valor_alfaiataria = valor` (sem frete). Fica nulo quando a despesa não é dividida (usa só `linha`) |

Hook: `useDespesas.js`. Página principal: **Contas a Pagar**. Também lida
por **Configurações** (lança os custos fixos do mês com um clique) e
**Resultado do Mês** (mostra status de caixa dos custos fixos, sem somar de
novo no resultado).

### `previsoes_venda`

Vendas futuras **ainda não viraram pedido** — entram na projeção de
receita x despesa de Contas a Pagar.

`id`, `descricao`, `valor`, `data_esperada`, `criado_em`.

### `notas_venda_futura`

Puro lembrete — **nunca entra em nenhum cálculo**. Separado de
`previsoes_venda` de propósito.

`id`, `descricao`, `valor`, `data_esperada`, `criado_em`.

### `historico_vendas`

Importação única da planilha pessoal antiga do Tales (vendas desde o
início do negócio, antes do sistema existir). Alimenta filtros/campanha de
reativação em **Clientes**, mas **não** entra em nenhum cálculo de
produção/pagamento — não tem medidas, status nem valor de venda, só
"nome + quantidade + ano".

`id`, `cliente_id`, `cliente_nome`, `quantidade`, `ano`, `recompra`,
`criado_em`.

### `config`

Tabela chave/valor genérica — cada linha é uma configuração isolada. Não é
uma tabela "de negócio" no sentido normal, mas é usada por muitas telas
para guardar parâmetros. Chaves conhecidas:

| Chave | Onde é editada | Para que serve |
|---|---|---|
| `telefone_fabi`, `telefone_icaro` | Configurações | WhatsApp usado nas fichas impressas de produção |
| `cliente_sumido_meses` | Configurações | Quantos meses sem comprar para um cliente aparecer como "sumido" em Clientes |
| `meta_vendas_camisaria`, `meta_vendas_alfaiataria` | Configurações | Meta de vendas do mês de cada linha (barra de progresso nos painéis) |
| `custo_aluguel_mensal`, `custo_luz_mensal` | Configurações | Aluguel/luz do **ateliê** (produção, alfaiataria) |
| `custo_aluguel_loja_mensal`, `custo_luz_loja_mensal` | Configurações | Aluguel/luz da **loja** (camisaria) |
| `custo_prolabore_mensal` | Configurações | Retirada pessoal do dono — custo **compartilhado**, dividido 50/50 entre as linhas |
| `custos_fixos_pj_mensal` | Configurações | Outros custos fixos PJ (contador, sistemas, marketing, impostos, combustível, internet...) — compartilhado, rateado por receita |
| `custo_plano_saude_pj_mensal` | Configurações | Plano de saúde empresarial — compartilhado, rateado por receita |
| `caixa_atual` | Contas a Pagar | Saldo de caixa informado manualmente pelo Tales — base do "saldo projetado" |
| `comissao_vendedor_pct` | (seed inicial, `schema_v13`) | % de comissão do vendedor — parâmetro criado cedo no projeto, verificar uso atual antes de assumir que está ligado a algum cálculo ativo |

### `perfis`

Controla o tipo de acesso de cada login (ver [seção 1](#os-três-perfis-de-acesso-login)).

`id` (= mesmo UUID de `auth.users`, o usuário de autenticação do Supabase),
`papel` (`dono` \| `vendedor` \| `producao`), `nome`, `created_at`.

---

## 3. Módulos e Páginas

Agrupado como o menu do dono (`NAV` em `Shell.jsx`) organiza as abas.

### 3.1 Camisaria

**Painel Camisaria** (`Dashboard.jsx`) — visão geral do dia a dia: pedidos
abertos por status, próximas entregas (ordenadas por `previsaoEntrega`),
atrasados (pedido aberto há **45+ dias** desde `dataPedido`, independente
de ter previsão preenchida), quanto já foi pago à Fabiana x quanto falta,
aniversariantes do mês, doações do ano, barra de meta (`meta_vendas_camisaria`).
Doação **nunca** entra em quantidade/faturamento do cliente.

**Pedido Camisas** (`NovoPedido.jsx`) — formulário de lançamento. Ao
salvar, cria/reaproveita o cliente (`encontrarOuCriarCliente`), grava
dados pessoais se preenchidos, e pode alternativamente virar um **plano de
assinatura** em vez de um pedido avulso (`onSalvarPlano`).

**Pedidos** (`Pedidos.jsx`) — lista completa com filtros, abre o detalhe
(`DetalhePedido.jsx`) onde se edita status, pagamento, tecido, medidas etc.
Também é onde um pedido pode ser **convertido** em plano de assinatura
(`converterPedidoEmPlano`).

**Estoque Camisaria** (`EstoqueCamisaria.jsx`) — saldo de tecido em rolo
por código, histórico de movimentações, cadastro de novo código, registro
de compra (entrada) e consumo por código (ranking de saídas acumuladas).

**Tecidos de Camisa** (`ModelosCamisa.jsx`) — catálogo (`modelos_camisa`):
nome, código interno, valor de referência por metro. Alimenta o campo
"Modelo" do pedido.

**Planos de Assinatura** (`PlanosAssinatura.jsx`) — lista de planos
ativos/inativos; botão "Emitir pedido do mês" gera um `pedido` novo com os
dados do plano (ver fluxo 4.4).

**Custos da Camisaria** (`CustosCamisaria.jsx`) — ver seção 3.3 (é o
espelho de Custos do Ateliê, descrito em detalhe lá).

**Relatório** (`Relatorio.jsx`) — relatório de vendas/pedidos de camisaria,
incluindo planos.

### 3.2 Alfaiataria

**Painel Alfaiataria** (`DashboardAlfaiataria.jsx`) — espelho do Painel
Camisaria: peças abertas por status, próximas/atrasadas por `previsaoEntrega`,
margem (venda − custo de produção), tempo médio de produção, doações,
barra de meta (`meta_vendas_alfaiataria`), contato do Ícaro.

**Pedido Alfaiataria** (`PedidoAlfaiataria.jsx`) — formulário de
lançamento de peça nova, com seções de medida dependendo do `tipoPeca`
(`PECA_SECOES` em `constants.js`) e sugestão de custo de aviamentos
(`custoAviamentosPorPecaBase`).

**Pedidos Alfaiataria** (`PedidosAlfaiataria.jsx`) — lista + detalhe
(`DetalhePeca.jsx`): edição de status, pagamento, tecido, medidas,
responsável por seção.

**Controle de Produção** (`ControleProducao.jsx`) — réplica da antiga
planilha de controle: fila de peças em aberto (`TabelaControleProducao`)
mais um painel de indicadores (`PainelProducaoResumo`), incluindo a
**previsão de entrega estimada automaticamente** para quem ainda não tem
previsão manual (ver o algoritmo de fila no glossário/seção 6). É aqui que
o dono atribui responsável, prioridade e acompanha atraso/retrabalho.

**Histórico de Produção** (`HistoricoProducao.jsx`) — peças já entregues,
com tempo real de produção (`diasProducaoReal`) e, opcionalmente, margem.
Reaproveitado também dentro do `ShellProducao` (o Ícaro vê seu próprio
histórico, sem valores).

**Custos do Ateliê** (`CustosAtelie.jsx`) — o financeiro específico da
linha de alfaiataria. Ver detalhamento completo abaixo (3.3), pois a lógica
de rateio é compartilhada com Custos da Camisaria.

**Relatório Alfaiataria** (`RelatorioAlfaiataria.jsx`) — espelho do
Relatório de camisaria.

### 3.3 Geral / Financeiro

**Compras** (`Compras.jsx`) — lista **todos** os itens de tecido (de
pedidos de camisa e peças de alfaiataria juntos) que ainda não foram
marcados como comprados, agrupados por fornecedor, com texto pronto para
copiar e mandar por WhatsApp ao fornecedor. Também mostra histórico do que
já foi comprado.

**Entregues** (`Entregues.jsx`) — lista somente pedidos/peças com status
"Entregue" (ou "Entregue Parcial"), das duas linhas juntas.

**Clientes** (`Clientes.jsx`) — cadastro central, histórico de compras (une
`pedidos` + `pedidos_alfaiataria` + `historico_vendas` legado), marcação de
"sumido" (sem comprar há mais de `cliente_sumido_meses`), campanha de
reativação (mensagem de WhatsApp, marca `campanha_contatado_em`), edição de
dados pessoais.

**Consolidado** (`Consolidado.jsx`) — tabela única que junta **pedidos de
camisa + planos de assinatura vendidos + peças de alfaiataria**, cada linha
com seu valor, custo, status de pagamento pendente e origem (`linha`:
Camisaria/Alfaiataria) — visão "tudo numa lista só" para exportar/conferir.

**Comparativo Mensal** (`ComparativoMensal.jsx`) — compara indicadores
(faturamento, quantidade etc.) mês a mês, das duas linhas.

**Resultado do Mês** (`ResultadoMensal.jsx`) — o **DRE consolidado**
(Camisaria + Alfaiataria juntas). Usa a **mesma base de custo de produção**
das páginas de Custos (tecido pelo `valor_metro` cadastrado em Compras,
aviamentos, mão de obra da equipe + Fabiana) — **não soma de novo** as
despesas de fornecedor lançadas em Contas a Pagar em cima disso, para não
contar o mesmo gasto de tecido duas vezes. A seção "situação de caixa dos
custos fixos" é só informativa (mostra quanto de pró-labore/aluguel/luz/
plano de saúde já foi pago via `despesas`), não altera o resultado.

**Metas** (`Metas.jsx`) — meta de vendas por mês, por linha e por tipo de
peça, navegável mês a mês. Doação sempre fica de fora.

**Fluxo de Caixa** (`FluxoDeCaixa.jsx`) — visão simples de "a receber"
(pedidos/peças com saldo pendente) e "a pagar" (Fabiana/Ícaro), por status
(`Pendente`/`Parcial`/`Recebido`/`Pago`), calculado com `valorRecebidoEfetivo`.

**Contas a Pagar** (`ContasAPagar.jsx`) — a página financeira mais rica do
sistema:
- Lista de `despesas` pendentes numa janela de dias (padrão: hoje até +14
  dias, sem passar do fim do mês atual a menos que já esteja na última
  semana), com calendário mensal, aging de atrasadas (1–7 / 8–15 / 16–30 /
  31+ dias) e alerta de "vence em até 3 dias".
- **A receber**: pedidos/peças com saldo pendente que **têm previsão de
  entrega** entram no total da janela; os sem previsão ficam listados à
  parte, fora do total (para não distorcer "quanto falta faturar" com algo
  sem data para acontecer).
- **Tecido pendente de compra**: itens de `tecidos` ainda não `comprado`,
  com `metragem` e `valor_metro` preenchidos, tratados como uma despesa
  futura mesmo sem estar em `despesas`.
- **Saldo projetado** = `caixa_atual` (config) + a receber na janela −
  despesas da janela − tecido pendente de compra.
- Quanto se deve **por fornecedor** (despesas em aberto + tecido pendente
  com preço).
- Quanto se deve **por linha** (`Camisaria`/`Alfaiataria`/`Compartilhado`),
  ratando despesas com `valor_camisaria`/`valor_alfaiataria` divididas na
  mesma proporção.
- Histórico de frete e de despesas pagas por mês/categoria.

**Fornecedores** (`Fornecedores.jsx`) — cadastro simples (tabela
`fornecedores`).

**Aviamentos** (`Aviamentos.jsx`) — cadastro de itens de aviamento por
peça-base (tabela `aviamentos`).

**Backup** (`Backup.jsx`) — exporta **só os pedidos de camisaria**
(`pedidos`, não `pedidos_alfaiataria`) como um arquivo `.json` para baixar
ou copiar; permite reimportar. É um backup manual leve, não substitui
backup do próprio Supabase.

**Configurações** (`Configuracoes.jsx`) — edita as chaves da tabela
`config` (telefones, metas, custos fixos) e tem o botão "Lançar custos
fixos deste mês", que cria uma `despesa` recorrente para cada custo fixo
preenchido (pró-labore, aluguel/luz do ateliê e da loja, plano de saúde,
outros PJ) — só na primeira vez do mês (evita duplicar se clicar de novo).

#### O padrão de rateio de custos compartilhados (Custos do Ateliê / Custos da Camisaria)

`CustosAtelie.jsx` e `CustosCamisaria.jsx` são duas páginas espelhadas com
a mesma lógica de negócio, cada uma calculando o resultado da sua própria
linha:

1. **Custo próprio da linha** = mão de obra (equipe do ateliê, ou valor
   pago à Fabiana no mês) + estrutura (aluguel + luz **daquela** operação)
   + tecido do mês (soma `metragem × valor_metro` dos itens de `tecidos`
   dos pedidos/peças daquele mês) + aviamentos do mês (composição por
   `tipo_peca`, ou aviamento fixo "Camisa" × quantidade vendida).
2. **Custo compartilhado da empresa** (pró-labore + custos fixos PJ + plano
   de saúde) é **rateado** entre as duas linhas:
   - **Pró-labore: sempre 50/50** — é retirada pessoal do dono, não tem a
     ver com quem vendeu mais no mês.
   - **Resto (PJ + plano de saúde): proporcional à receita do mês** de cada
     linha (`receita da linha / (receita da linha + receita da outra
     linha)`); sem receita nenhuma das duas, cai para 50/50 também.
3. **Resultado da linha** = receita do mês − custo próprio − fatia rateada
   do compartilhado.

Ambas as páginas também têm uma **Calculadora de Markup** (componente
`CalculadoraMarkup`) e um gráfico "receita real x custo no patamar de
hoje" dos últimos 6 meses (o custo usado é uma régua fixa do custo
**atual**, não o custo histórico real de cada mês — serve para responder
"quantos dos últimos meses teriam coberto o patamar de gasto de agora").

Em `CustosCamisaria.jsx` existe ainda uma peculiaridade: como o pagamento à
Fabiana é feito ao longo do mês (não é salário fixo fechado), cedo no mês o
valor real pago ainda está incompleto — por isso há a opção de **projetar**
esse custo usando o total pago no **mês anterior inteiro**, até que o valor
real do mês corrente ultrapasse aquele patamar.

### 3.4 Sistema

**Equipe** (`Equipe.jsx`) — cadastro da equipe de produção (tabela
`equipe_producao`).

Estas duas últimas ("Fornecedores", "Aviamentos") já foram descritas em
3.3, mas aparecem no grupo "Sistema" do menu por serem cadastros de apoio
usados nas duas linhas.

---

## 4. Fluxos de ponta a ponta

### 4.1 Como um pedido de camisa nasce e morre

1. **NovoPedido.jsx** → cliente é criado/reaproveitado
   (`encontrarOuCriarCliente`), dados pessoais salvos se preenchidos,
   `pedido` inserido com `status = "Aguardando Produção"` e itens de
   `tecidos` vinculados.
2. Aparece em **Pedidos** e no **Painel Camisaria**; o dono avança o
   `status` conforme a produção anda (Fabiana produz externamente — não há
   tela de produção dela no sistema, ao contrário da alfaiataria).
3. Tecido lançado no pedido aparece em **Compras** até ser marcado
   `comprado`; se vier do estoque próprio, "dar baixa" grava um movimento
   de saída em `estoque_movimentos` e trava (`metros_baixados`) para não
   descontar duas vezes.
4. Enquanto há saldo a receber do cliente ou a pagar à Fabiana, o pedido
   aparece em **Fluxo de Caixa** e (se tiver previsão de entrega) em
   **Contas a Pagar** como "a receber".
5. Ao marcar `status = "Entregue"`, `data_entrega` é gravada
   automaticamente — isso alimenta o tempo médio de produção
   (`temposMediosProducao`) e faz o pedido aparecer em **Entregues**.
6. O valor de venda do mês (`data_pedido` cai naquele mês) entra em
   **Custos da Camisaria**, **Resultado do Mês**, **Consolidado**,
   **Comparativo Mensal** e **Metas** — sempre com Doação excluída da
   receita.

### 4.2 Como uma peça de alfaiataria entra em produção

1. **PedidoAlfaiataria.jsx** → mesma lógica de criação de cliente/peça de
   `pedidos`, mas com seções de medida por `tipoPeca` e sugestão de custo
   de aviamentos.
2. Aparece em **Pedidos Alfaiataria**, no **Painel Alfaiataria** e na fila
   de **Controle de Produção** (dono) / na tela do Ícaro
   (`ShellProducao`).
3. Quando a produção **de verdade** começa, alguém marca "início" —
   `data_inicio_producao` é gravada e `situacao` vira automaticamente
   `"Em Produção"` (se ainda estava "Aguardando"). É esse campo, não
   `data_pedido`, que conta para o tempo real de produção.
4. O Ícaro (ou o dono) avança o `status` (etapa de costura) conforme a
   peça anda; pode pausar (`situacao = "Pausado"`, com motivo registrado em
   `pedidos_alfaiataria_pausas`) quando o cliente sumiu ou falta insumo —
   esses dias não contam no tempo de produção real.
5. A previsão de entrega mostrada é **automática** (algoritmo de fila por
   equipe, ver seção 6) a menos que o Tales tenha digitado uma data de
   propósito (`previsao_manual = true`, que trava o valor).
6. Ao marcar `status = "Entregue"`, `data_entrega` é gravada e a peça
   passa a contar na média real de produção **por tipo** — que depois de 3+
   entregas do mesmo tipo passa a ser usada como referência em vez dos
   parâmetros fixos de `constants.js`.
7. Mesma cadeia de Compras/Contas a Pagar/Custos do Ateliê/Resultado do
   Mês que a camisaria, espelhada para a linha de alfaiataria.

### 4.3 Como uma despesa é lançada e paga

1. Lançada manualmente em **Contas a Pagar** (ou gerada em lote a partir
   de **Configurações** → "Lançar custos fixos deste mês", para
   pró-labore/aluguel/luz/plano de saúde), com `status = "Pendente"`.
2. Aparece na janela de vencimentos, no calendário e no aging de atraso se
   passar do prazo.
3. Ao marcar como paga (total ou parcial), `valor_pago` e `status` são
   recalculados (`Pendente` → `Parcial` → `Pago` conforme `valor_pago` vs.
   `valor + frete`).
4. Se a despesa é `recorrente` **e** ficou `Pago`, uma nova ocorrência é
   criada automaticamente para o mesmo dia, um mês depois.
5. Despesas pagas entram no histórico mensal de Contas a Pagar (frete e
   total por categoria) — mas **não** entram de novo no "custo de
   produção" de Custos do Ateliê/Camisaria/Resultado do Mês (essas páginas
   usam a base própria de mão de obra + tecido + aviamentos + estrutura,
   para não contar o mesmo gasto duas vezes). A única ponte é informativa:
   Resultado do Mês mostra "quanto dos custos fixos configurados já foi
   pago" olhando para `despesas` com categoria Pró-labore/Aluguel/Água-Luz-
   Internet/Plano de Saúde.

### 4.4 Plano de Assinatura → pedido mensal

1. **Pedido Camisas** (ou **Pedidos** → converter) cria uma linha em
   `planos_assinatura` com `data_venda` = quando o plano foi fechado —
   é **nessa data** que a receita do plano é contabilizada, de uma vez só
   (o valor total do plano).
2. Todo mês, em **Planos de Assinatura**, o Tales clica "Emitir pedido do
   mês": isso cria um `pedido` novo de verdade (aparece em Pedidos, entra
   na produção normal da Fabiana) com `aReceber.valor = ""` (**vazio de
   propósito** — a venda já foi contabilizada na data do plano, a emissão
   mensal só controla produção/entrega, não gera receita nova) e incrementa
   `qt_entregue` do plano.
3. O valor devido à Fabiana por aquela emissão (`valorFabiana` do plano) é
   copiado para o pedido novo, e a partir daí segue o fluxo normal de
   pagamento/custo de mão de obra.

### 4.5 Acompanhamento público do pedido (link para o cliente)

1. O dono manda ao cliente um link `/acompanhar/camisaria/<id>` ou
   `/acompanhar/alfaiataria/<id>` (sem necessidade de login).
2. `App.jsx` detecta essa rota antes mesmo de checar sessão e renderiza
   `AcompanharPedido.jsx`, que chama a função do banco `acompanhar_pedido`
   (RPC com `security definer`, liberada para o papel `anon`) — ela devolve
   **só** nome do cliente, status e previsão de entrega, nunca valores,
   telefone ou dados de outros clientes.
3. `statusParaEtapa()` traduz o status bruto (incluindo status antigos, já
   fora de uso, de peças legadas) numa etapa e percentual de progresso
   (`ETAPAS_ACOMPANHAMENTO_CAMISARIA`/`_ALFAIATARIA` em `constants.js`).

---

## 5. Glossário

- **Linha** — Camisaria ou Alfaiataria; as duas operações do negócio,
  tratadas separadamente na maior parte do financeiro e ratando os custos
  compartilhados entre si.
- **Peça** — como o código/este manual chamam um registro de
  `pedidos_alfaiataria` (para diferenciar de "pedido", que normalmente se
  refere a `pedidos` de camisaria).
- **Peça-base** — categoria usada só em **Aviamentos** (`Paletó`, `Calça`,
  `Colete`, `Casaco`, `Bomber`, `Camisa`). Diferente de `tipo_peca`: um
  `tipo_peca` vendido pode ser **composto** de mais de uma peça-base — ex.:
  um `Traje` vendido = `Paletó` + `Calça` + `Colete` (ver
  `COMPOSICAO_AVIAMENTOS` em `constants.js`), então o custo de aviamento de
  um Traje soma o de três peças-base.
- **Status vs. Situação** (só em `pedidos_alfaiataria`) — `status` é a
  **etapa do fluxo de costura** (Molde, Corte, Prova...); `situacao` é um
  estado **operacional manual** (Aguardando / Em Produção / Pausado),
  independente da etapa. Uma peça pode estar no status "Ajuste 1" e ao
  mesmo tempo com situação "Pausado" porque o cliente viajou.
- **Previsão manual vs. Previsão estimada** — a previsão de entrega de uma
  peça de alfaiataria é, por padrão, **calculada automaticamente**
  (simulador de fila por equipe/tipo de peça) e muda sozinha conforme a
  fila muda. Quando o Tales digita uma data de propósito
  (`previsao_manual = true`), ela **trava** naquele valor até ele limpar o
  campo. Diferente de **data limite de evento** (`data_limite_evento`),
  que é um compromisso do cliente (casamento, formatura), nunca calculada
  e sem efeito sobre a fila.
- **Rateio** — divisão de um custo compartilhado da empresa (pró-labore,
  contador, sistemas, plano de saúde) entre Camisaria e Alfaiataria: 50/50
  para pró-labore, proporcional à receita do mês para o resto (ver seção
  3.3).
- **Mista** (em despesas) — quando `valor_camisaria` e `valor_alfaiataria`
  estão preenchidos numa mesma despesa (a mesma nota fiscal/boleto cobre
  tecido das duas linhas) em vez de usar só o campo `linha`.
- **Doação** — um status especial em `pedidos`/`pedidos_alfaiataria`:
  a peça foi entregue de graça, não vendida. Sai de toda conta de
  faturamento/quantidade vendida, mas o **custo de produção continua
  contando normal** (a peça foi produzida do mesmo jeito).
- **Custo de produção vs. despesa de fornecedor** — o "custo de produção"
  usado em Custos do Ateliê/Camisaria/Resultado do Mês é calculado
  diretamente de `tecidos.valor_metro`, `aviamentos` e mão de
  obra/estrutura — **não** é a mesma coisa que uma `despesa` lançada em
  Contas a Pagar, mesmo que seja o mesmo fornecedor de tecido. As duas
  telas não se somam uma na outra, de propósito, para não duplicar o
  gasto.
- **Enviado (Fabi/Ícaro)** (`enviado_fabi`/`enviado_icaro`) — controla só
  um destaque visual de "ainda não mandei a ficha pra produção" na lista,
  não afeta nenhum cálculo.
- **Plano de assinatura** — cliente recorrente com medidas cadastradas uma
  vez; cada "Emitir pedido do mês" gera um `pedido` real sem gerar receita
  nova (a receita já foi contada na venda do plano).

---

## 6. Notas técnicas para manutenção futura

Esta seção é voltada para quem (humano ou IA) for alterar o sistema depois.

- **Stack**: React + Vite + Tailwind no front-end; Supabase (Postgres +
  Auth + RLS + Storage não usado) no back-end. Sem framework de estado
  global — cada hook em `src/hooks` gerencia seu próprio `useState`, e
  `Shell.jsx` centraliza todos os hooks e distribui via props.
- **Padrão de hook**: todo hook de tabela segue o mesmo esqueleto —
  `rowParaX()` (conversão linha do banco → objeto camelCase),
  `CAMPO_PARA_COLUNA` (mapa reverso para updates parciais), `recarregar()`
  (busca tudo de novo após qualquer escrita — não há atualização
  otimista consistente em todo lugar, mas o `setPedidos`/`setPecas` local
  já aplica a mudança na UI antes da resposta do servidor, e o
  `recarregar()` no final garante consistência). Ao adicionar um campo
  novo numa tabela existente, **replicar esse padrão** (linha em
  `rowParaX`, campo vazio no "objeto vazio" — `pedidoVazio()`/`pecaVazia()`
  — e entrada em `CAMPO_PARA_COLUNA` se for editável campo a campo).
- **Migrações são só aditivas**: nenhum `schema_v*.sql` deve apagar coluna
  ou tabela existente sem uma migração de dados explícita antes — o padrão
  do projeto é sempre `alter table ... add column if not exists ...` e
  `create table if not exists`. Ao criar uma migração nova, seguir esse
  padrão e nomear o arquivo `schema_v<N+1>_<resumo>.sql`, com comentário
  no topo explicando o motivo (é isso que torna este manual mantível sem
  reler o código inteiro).
- **RLS por papel**: qualquer tabela nova acessível por `vendedor` ou
  `producao` precisa de política própria (usar as funções auxiliares
  `is_dono()` e `is_producao()` já existentes, criadas em `schema_v9` e
  `schema_v27`) — por padrão, uma tabela sem política para um papel fica
  **totalmente bloqueada** para ele (nunca aberta por engano).
- **Algoritmo de projeção de fila** (`projetarPrevisoesFilaPorEquipe` em
  `helpers.js`) — o coração da previsão automática de entrega da
  alfaiataria: agrupa tipos de peça por quem da equipe realmente produz
  cada um (`agruparTiposPorEquipe`), calcula uma capacidade de "vagas"
  por grupo (baseada em `horas_por_dia`/`dias_por_semana` de cada membro
  ativo e trabalhando hoje) e simula peças entrando na vaga que libera mais
  cedo (`projetarPrevisoesFila`). A média de dias por tipo de peça
  (`mediaDiasProducaoPorTipo`) prioriza dado real do próprio sistema (3+
  entregas) sobre os parâmetros fixos de `constants.js`
  (`DIAS_REFERENCIA_TIPO_PECA`/`HORAS_REFERENCIA_TIPO_PECA`) — ao longo do
  tempo, os números fixos deixam de ser usados sozinhos.
- **Sem verificação de tipos** (JS puro, sem TypeScript) — os nomes de
  campo em `rowParaX()`/`CAMPO_PARA_COLUNA` são a única "fonte da verdade"
  de que um campo existe e como se chama; um erro de digitação aí falha
  silenciosamente (o Supabase simplesmente ignora uma coluna inexistente
  em alguns casos, ou lança erro capturado por `setErro`). Ao adicionar
  campo, testar manualmente salvando e recarregando a página.
