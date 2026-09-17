-- Segunda costureira na Camisaria: campo "costureira" no pedido (v78)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Até agora só existia a Fabiana — o cálculo de mão de obra, a despesa
-- automática, a ficha impressa etc. eram todos hardcoded pra ela. Com a
-- Milena entrando na equipe, cada pedido passa a guardar QUEM costurou,
-- pra poder separar o Painel Camisaria de cada uma e comparar as duas
-- (tempo médio de produção, quantidade entregue etc).
--
-- Pedidos existentes (e novos, por padrão) continuam com Fabiana — nada
-- muda na prática até você trocar manualmente o campo "Costureira" de um
-- pedido específico pra Milena, quando ela começar a produzir de fato.

alter table pedidos add column if not exists costureira text not null default 'Fabiana'
  check (costureira in ('Fabiana', 'Milena'));
