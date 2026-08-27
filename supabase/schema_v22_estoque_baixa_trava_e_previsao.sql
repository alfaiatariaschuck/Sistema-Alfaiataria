-- Corrige o bug do estoque de tecido ficar negativo: antes, o widget de
-- "dar baixa" não guardava nenhum registro de que aquele item do pedido já
-- tinha sido descontado, então reabrir o pedido depois convidava a dar
-- baixa de novo por engano (dobrando o desconto). Agora cada item de
-- tecido guarda quantos metros já foram baixados — depois da primeira
-- vez, o widget trava e mostra só a informação, sem opção de repetir.
alter table tecidos add column if not exists metros_baixados numeric;
