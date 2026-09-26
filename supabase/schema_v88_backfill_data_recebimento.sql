-- Preenche data_recebimento pra pedidos/peças que já estavam
-- "Recebido" ANTES desse campo existir (schema_v84) — ficaram pra
-- sempre invisíveis em qualquer relatório de caixa (Contabilidade,
-- Agente Financeiro), mesmo tendo sido pagos de verdade. Usa a data do
-- próprio pedido como aproximação (não temos como saber a data exata
-- que cada um entrou na conta, especialmente o que veio da migração
-- do Excel, que perdeu parte dessa informação no caminho).
--
-- Só toca em quem está "Recebido" e está com data_recebimento em
-- branco — não mexe em nada que já tem data (não sobrescreve
-- reconciliação manual feita depois de setembro/2026) nem em quem
-- ainda está pendente. Rodar mais de uma vez é seguro (idempotente:
-- na segunda vez não sobra ninguém com data em branco pra preencher).
update pedidos
set data_recebimento = data_pedido
where status_pagamento_receber = 'Recebido'
  and data_recebimento is null;

update pedidos_alfaiataria
set data_recebimento = data_pedido
where status_pagamento_venda = 'Recebido'
  and data_recebimento is null;
