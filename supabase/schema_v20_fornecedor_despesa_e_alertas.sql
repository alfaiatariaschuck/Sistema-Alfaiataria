-- Contas a Pagar: campo de fornecedor próprio na despesa (separado de
-- categoria), pra depois conseguir ver quanto se deve por fornecedor.
alter table despesas add column if not exists fornecedor text;
