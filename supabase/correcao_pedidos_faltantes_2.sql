-- Correção final: últimos 4 pedidos que faltavam (conferido linha a linha
-- contra a planilha oficial usando o retorno de uma consulta no banco real).
-- Rode uma vez só.

-- ------------------------------------------------------------------
-- 1) Garante que os clientes existem
-- ------------------------------------------------------------------
insert into clientes (nome) values
  ('Lucas Jacobs'),
  ('Felipe Trois')
on conflict (nome_normalizado) do nothing;

-- ------------------------------------------------------------------
-- 2) Insere as 4 peças que faltavam
-- ------------------------------------------------------------------
insert into pedidos_alfaiataria (cliente_id, tipo_peca, valor_total, valor_pago)
select id, 'Bomber', 500.00, 100.00 from clientes where nome_normalizado = lower(trim('Lucas Jacobs'))
union all
select id, 'Calça', 200.00, 200.00 from clientes where nome_normalizado = lower(trim('Felipe Trois'))
union all
select id, 'Calça', 200.00, 200.00 from clientes where nome_normalizado = lower(trim('Felipe Trois'))
union all
select id, 'Calça', 200.00, 200.00 from clientes where nome_normalizado = lower(trim('Felipe Trois'));
