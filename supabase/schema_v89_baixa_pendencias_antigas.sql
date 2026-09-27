-- Baixa das pendências de recebimento anteriores a agosto/2026 — o
-- dono perdeu o histórico de acompanhamento desses pedidos antigos e
-- confirmou que só o que é de agosto/2026 em diante vale a pena
-- rastrear daqui pra frente. Isso só limpa a poeira antiga que fica
-- aparecendo como "a receber" sem nunca se resolver; não mexe em
-- nada de agosto/2026 pra cá.
--
-- Não existe hoje um status neutro de "cancelado/perdido" no
-- sistema (só Pendente/Recebido) — a decisão foi tratar como
-- Recebido, aproximando a data de recebimento pela própria data do
-- pedido (mesmo critério do schema_v88). Isso encerra a pendência
-- sem inflar nenhum relatório atual, já que tudo aqui é de antes de
-- agosto/2026.
--
-- Roda em camisaria (pedidos) e alfaiataria (pedidos_alfaiataria).
-- Idempotente: só toca em quem ainda está Pendente com data antiga;
-- rodar de novo não muda nada que já foi baixado.
update pedidos
set status_pagamento_receber = 'Recebido',
    data_recebimento = data_pedido
where status_pagamento_receber = 'Pendente'
  and data_pedido < '2026-08-01';

update pedidos_alfaiataria
set status_pagamento_venda = 'Recebido',
    data_recebimento = data_pedido
where status_pagamento_venda = 'Pendente'
  and data_pedido < '2026-08-01';
