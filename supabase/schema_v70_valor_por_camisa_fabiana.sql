-- Valor por camisa da Fabiana (v70)
-- ADITIVO: não apaga nem recria nada existente.
--
-- "Valor Fabiana" era um total digitado pra mão (todas as camisas do
-- pedido) e a despesa lançada era esse total ÷ quantidade do pedido ×
-- qtd. já em produção. Se a quantidade do pedido mudasse depois de já
-- ter digitado o total (ex: cliente pediu mais uma camisa), o total
-- ficava desatualizado e a despesa saía com valor errado — foi o caso
-- do pedido do César Moreno (3 camisas a R$120 = R$360, saiu R$270
-- porque a quantidade do pedido tinha mudado pra 4 depois do total já
-- digitado pra 3).
--
-- Preenchendo esse novo campo (valor por camisa), o total passa a ser
-- calculado sozinho pelo app (valor_por_camisa × quantidade) sempre que
-- a quantidade mudar — elimina esse jeito de desatualizar de vez.

alter table pedidos add column if not exists valor_por_camisa_fabiana numeric;
