-- Preço pago por metro de tecido, ao lado da metragem na aba Compras —
-- registrado item a item, vira histórico de preço por fornecedor/código
-- ao longo do tempo (reaproveitando a data do pedido/peça já existente).
alter table tecidos add column if not exists valor_metro numeric;
