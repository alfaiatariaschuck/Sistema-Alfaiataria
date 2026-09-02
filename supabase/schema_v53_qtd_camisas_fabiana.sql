-- Quantidade de camisas que o valor "a pagar à Fabiana" cobre — separado
-- da quantidade total do pedido, porque nem sempre coincidem (ex: cliente
-- novo compra 3 camisas, só 1 vai pra produção agora pra prova; as outras
-- 2 só entram depois que a prova é aprovada). Sem isso, "dar baixa por
-- camisa" no Contas a Pagar dividia o valor errado (usava a quantidade
-- total do pedido, não a que já foi de fato mandada pra Fabiana).
alter table pedidos add column if not exists qtd_camisas_fabiana integer;

-- Espelha, na despesa gerada automaticamente, quantas camisas o valor
-- daquela despesa cobre no momento em que foi criada/atualizada.
alter table despesas add column if not exists quantidade_camisas integer;
