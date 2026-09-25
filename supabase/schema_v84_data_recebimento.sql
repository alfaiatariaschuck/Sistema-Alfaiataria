-- Data de recebimento em pedidos/peças (v84)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Hoje o sistema sabe SE um pedido foi recebido (status_pagamento_receber
-- / status_pagamento_venda = "Recebido"), mas não sabe QUANDO isso
-- aconteceu de verdade — só tem a data do pedido (competência) e a data
-- de vencimento/previsão. Pra montar o módulo de Contabilidade (livro
-- caixa por mês, igual já existe pra despesa com data_pagamento),
-- precisamos do mesmo tipo de carimbo do lado da receita.
--
-- O carimbo é feito automaticamente pelo próprio app (usePedidos.js e
-- usePedidosAlfaiataria.js) sempre que o status de pagamento vira
-- "Recebido" — essa migration só cria a coluna.

alter table pedidos add column if not exists data_recebimento date;
alter table pedidos_alfaiataria add column if not exists data_recebimento date;
