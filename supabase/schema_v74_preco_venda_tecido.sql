-- Preço de venda por camisa, por tecido cadastrado no estoque (v74)
-- ADITIVO: não apaga nem recria nada existente.
--
-- O "Potencial de faturamento" do Estoque de Tecido usava sempre a margem
-- padrão configurada (custo × margem) pra sugerir o preço de venda — mas
-- tecido importado e nacional custam diferente e vendem por preços fixos
-- diferentes na prática (ex: R$790 numa camisa de tecido chinês, R$690
-- numa de tecido nacional). Esse campo deixa informar o preço de venda
-- real por tecido, que passa a valer no lugar da margem padrão pra esse
-- código específico.

alter table estoque_tecidos add column if not exists preco_venda_camisa numeric;
