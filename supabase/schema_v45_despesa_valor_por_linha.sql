-- Quando uma despesa é de um fornecedor só, mas mistura tecido de
-- camisaria e de alfaiataria (mesma nota, mesmo boleto), guarda o valor
-- de cada linha dentro da MESMA despesa (não duas despesas separadas) —
-- valor_camisaria + valor_alfaiataria = valor (o total do tecido, sem
-- frete). Fica null quando a despesa não é dividida (comportamento
-- atual, usa só a coluna "linha").
alter table despesas add column if not exists valor_camisaria numeric;
alter table despesas add column if not exists valor_alfaiataria numeric;
