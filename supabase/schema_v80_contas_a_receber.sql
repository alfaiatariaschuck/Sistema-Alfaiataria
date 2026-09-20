-- Contas a Receber: campo manual "Data para cobrar" (v80)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Pedido/peça não tem uma data de vencimento como despesa tem — quem
-- decide quando cobrar o cliente é você, na hora que quiser (às vezes é
-- a previsão de entrega, às vezes não). Esse campo fica em branco por
-- padrão; a nova aba "Contas a Receber" usa ele pra saber o que está
-- atrasado e pra organizar o calendário do mês.

alter table pedidos add column if not exists data_cobranca date;
alter table pedidos_alfaiataria add column if not exists data_cobranca date;
