-- Campo "Medida" (metragem de tecido a comprar) na aba Compras — fica
-- junto de cada item de tecido, ao lado do botão "Comprar". Texto livre
-- pra aceitar "3,5m", "3.5", etc.
alter table tecidos add column if not exists metragem text;
