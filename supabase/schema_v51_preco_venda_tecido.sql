-- Preço de venda tabelado por tecido (nomenclatura) — junto com o valor
-- de referência/metro já existente, fecha a "tabela de preço de venda"
-- que o usuário mencionou querer fazer: escolhe o tecido, já vê custo
-- estimado (tecido + aviamento + mão de obra) e a margem que aquele
-- preço dá.
alter table modelos_camisa add column if not exists preco_venda numeric;
