-- Quando o pagamento do cliente é dividido (entrada + restante), cada
-- parte pode ter sido paga numa forma diferente (ex: metade PIX, metade
-- cartão) — antes só existia uma forma de pagamento pro pedido inteiro.
alter table pedidos add column if not exists forma_pagamento_entrada text;
alter table pedidos add column if not exists forma_pagamento_restante text;
alter table pedidos_alfaiataria add column if not exists forma_pagamento_entrada text;
alter table pedidos_alfaiataria add column if not exists forma_pagamento_restante text;
