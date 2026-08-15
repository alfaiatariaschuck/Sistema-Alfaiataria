-- Atualização de pagamentos e novas peças — planilha oficial do Icaro
-- ADITIVO/pontual: só atualiza 2 pagamentos específicos e insere 2 peças novas.
-- Rode uma vez só no SQL Editor do Supabase.

-- ------------------------------------------------------------------
-- 1) Pagamentos que mudaram (peça já quitada na planilha oficial)
--    Guarda de segurança: só atualiza se o valor pago ainda estiver
--    em 500,00 (evita sobrescrever algo que você já tenha ajustado
--    manualmente para um valor diferente nesse meio tempo).
-- ------------------------------------------------------------------
update pedidos_alfaiataria
set valor_pago = 1000.00
where valor_pago = 500.00
  and valor_total = 1000.00
  and tipo_peca = 'Costume'
  and cliente_id = (select id from clientes where nome_normalizado = lower(trim('Artur Trapp')));

update pedidos_alfaiataria
set valor_pago = 1000.00
where valor_pago = 500.00
  and valor_total = 1000.00
  and tipo_peca = 'Costume'
  and cliente_id = (select id from clientes where nome_normalizado = lower(trim('Rogerio Aime')));

-- ------------------------------------------------------------------
-- 2) Peças novas que ainda não estavam no sistema
-- ------------------------------------------------------------------
with dados (cliente_nome, tipo_peca, valor_total, valor_pago) as (
  values
  ('Luciano Forni', 'Calça', 200.00, 0.00),
  ('Michel Lehugeur', 'Costume', 1000.00, 0.00)
),
clientes_novos as (
  insert into clientes (nome)
  select distinct cliente_nome from dados
  on conflict (nome_normalizado) do nothing
  returning id, nome
)
insert into pedidos_alfaiataria (cliente_id, tipo_peca, valor_total, valor_pago)
select c.id, d.tipo_peca, d.valor_total, d.valor_pago
from dados d
join clientes c on c.nome_normalizado = lower(trim(d.cliente_nome));
