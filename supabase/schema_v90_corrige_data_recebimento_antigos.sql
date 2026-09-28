-- Corrige data_recebimento de pedidos antigos (anteriores a
-- agosto/2026) que o dono acabou de marcar como Recebido na tela —
-- o carimbo automático usa a data de HOJE, não a data real do
-- recebimento, então pedidos de meses passados estavam entrando como
-- "receita recebida" do mês corrente e distorcendo o caixa atual.
--
-- Mesmo critério do schema_v88: aproxima data_recebimento pela
-- própria data_pedido. Só mexe em quem tem o pedido antigo (antes de
-- agosto) mas o recebimento carimbado como recente (agosto em
-- diante) — não toca em nenhum pedido/pagamento recente de verdade,
-- onde pedido e recebimento próximos são esperados. Idempotente:
-- depois de corrigido, a linha não bate mais nesse filtro.
update pedidos
set data_recebimento = data_pedido
where status_pagamento_receber = 'Recebido'
  and data_pedido < '2026-08-01'
  and data_recebimento >= '2026-08-01';

update pedidos_alfaiataria
set data_recebimento = data_pedido
where status_pagamento_venda = 'Recebido'
  and data_pedido < '2026-08-01'
  and data_recebimento >= '2026-08-01';
