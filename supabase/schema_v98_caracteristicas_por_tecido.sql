-- Característica por camisa, não mais um bloco único pro pedido inteiro
-- (pedido do Tales, 14/11/2026): um pedido de 3 camisas pode ter
-- colarinho/punho/vista diferente em cada uma — então essas colunas
-- vão na própria linha de tecido (cada linha já representa "essa
-- quantidade de camisas, desse tecido"), igual código/qtd/medida.
--
-- Nomenclatura de Colarinho e Punho alinhada com o Provador de Tecidos
-- da Ana. "Vista" substitui o conceito antigo de "Frente".

alter table tecidos add column if not exists pesponto text;
alter table tecidos add column if not exists colarinho text;
alter table tecidos add column if not exists colarinho_obs text;
alter table tecidos add column if not exists punho text;
alter table tecidos add column if not exists monograma text;
alter table tecidos add column if not exists manga text;
alter table tecidos add column if not exists vista text;
