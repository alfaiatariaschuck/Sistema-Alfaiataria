-- Permite pagamento dividido (parte 1 + parte 2) do valor pago à Fabiana,
-- igual já existe para o valor a receber do cliente. Útil quando um pedido
-- tem mais de uma camisa e você paga a Fabiana aos poucos.
alter table pedidos add column if not exists pagamento_fabiana_dividido boolean not null default false;
alter table pedidos add column if not exists valor_entrada_fabiana numeric;
alter table pedidos add column if not exists status_entrada_fabiana text default 'Pendente';
alter table pedidos add column if not exists valor_restante_fabiana numeric;
alter table pedidos add column if not exists status_restante_fabiana text default 'Pendente';
