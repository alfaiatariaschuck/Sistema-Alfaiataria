-- Valor de frete de uma despesa, separado do valor do produto/serviço —
-- entra na conta do total a pagar, mas fica registrado à parte pra dar
-- pra somar "quanto gasto de frete" por mês depois.
alter table despesas add column if not exists frete numeric default 0;
