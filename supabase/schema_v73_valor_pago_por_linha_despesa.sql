-- Baixa discriminada por linha em despesas com tecido dividido (v73)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Despesas de tecido lançadas com o total do fornecedor, discriminadas em
-- "Tecido Camisaria (R$)" e "Tecido Alfaiataria (R$)", só guardavam UM
-- valor pago pra despesa inteira — o quanto disso era de cada linha era
-- estimado proporcionalmente, o que não bate quando o pagamento parcial
-- não segue a mesma proporção da dívida original. Essas duas colunas
-- guardam quanto de cada baixa foi de fato pago em nome de cada linha.

alter table despesas add column if not exists valor_pago_camisaria numeric;
alter table despesas add column if not exists valor_pago_alfaiataria numeric;
