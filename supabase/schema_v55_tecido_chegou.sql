-- Marca se o tecido do pedido já chegou (foi recebido) — separado de
-- "comprado" (que só diz que a compra foi fechada/paga, não que o rolo
-- já está em mãos). Serve pra sinalizar na lista de Pedidos quais
-- clientes estão travados esperando tecido chegar.
alter table pedidos add column if not exists tecido_chegou boolean default false;
