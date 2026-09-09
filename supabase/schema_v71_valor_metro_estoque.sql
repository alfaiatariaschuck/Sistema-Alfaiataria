-- Valor por metro no Estoque de Tecido (v71)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Cadastrando o valor pago por metro junto com o tecido, o valor total
-- em estoque já aparece sozinho (saldo × valor/metro), e ao lançar um
-- pedido usando um código já cadastrado, o "valor por metro" da ficha
-- já vem preenchido sozinho — sem precisar redigitar toda vez.

alter table estoque_tecidos add column if not exists valor_metro numeric;
