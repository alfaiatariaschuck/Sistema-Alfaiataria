-- Liga cada item de tecido (de um pedido de camisa OU de uma peça de
-- alfaiataria — a tabela "tecidos" é compartilhada pelas duas) à
-- nomenclatura cadastrada em "Tecidos de Camisa" (tabela modelos_camisa).
-- O código já existente na linha de tecido continua sendo o código do
-- rolo/compra (uso interno, ligado ao estoque) — a nomenclatura é um
-- campo à parte, escolhido manualmente do catálogo.
alter table tecidos add column if not exists nomenclatura text;
