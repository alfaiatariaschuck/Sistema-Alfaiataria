-- Correção: 4 pedidos que ficaram de fora da importação original por causa
-- de um bug no script (clientes novos e peça inseridos no mesmo comando,
-- em ordem não garantida). Cada bloco roda como comando separado, garantindo
-- que o cliente já exista antes de inserir a peça — sem esse risco.
-- Valores vindos da planilha oficial; rode uma vez só.

-- ------------------------------------------------------------------
-- 1) Garante que os clientes existem (não duplica quem já está cadastrado)
-- ------------------------------------------------------------------
insert into clientes (nome) values
  ('Felipe Trois'),
  ('Assis Idemar'),
  ('Andre Trindade'),
  ('Eduardo Lopes Mostardeiro')
on conflict (nome_normalizado) do nothing;

-- ------------------------------------------------------------------
-- 2) Insere os 4 pedidos que faltavam (sem medidas — a ideia é você
--    abrir cada um em Pedidos Alfaiataria e preencher manualmente)
-- ------------------------------------------------------------------
insert into pedidos_alfaiataria (cliente_id, tipo_peca, valor_total, valor_pago)
select id, 'Traje', 1000.00, 500.00 from clientes where nome_normalizado = lower(trim('Felipe Trois'))
union all
select id, 'Costume', 1000.00, 0.00 from clientes where nome_normalizado = lower(trim('Assis Idemar'))
union all
select id, 'Costume', 1000.00, 500.00 from clientes where nome_normalizado = lower(trim('Andre Trindade'))
union all
select id, 'Traje', 1000.00, 500.00 from clientes where nome_normalizado = lower(trim('Eduardo Lopes Mostardeiro'));
