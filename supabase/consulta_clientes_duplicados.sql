-- CONSULTA (não altera nada) para achar clientes possivelmente duplicados
-- por nome parecido. Rode no SQL Editor do Supabase e olhe o resultado.

-- Habilita a extensão de comparação de texto (só roda uma vez, sem risco).
create extension if not exists pg_trgm;

with total_por_cliente as (
  select
    c.id,
    c.nome,
    coalesce((select count(*) from pedidos p where p.cliente_id = c.id), 0)
      + coalesce((select count(*) from pedidos_alfaiataria pa where pa.cliente_id = c.id), 0)
      + coalesce((select count(*) from historico_vendas h where h.cliente_id = c.id), 0)
      as total_registros
  from clientes c
)
select
  a.nome as cliente_1,
  a.total_registros as pedidos_cliente_1,
  b.nome as cliente_2,
  b.total_registros as pedidos_cliente_2,
  round(similarity(a.nome, b.nome)::numeric, 2) as parecido
from total_por_cliente a
join total_por_cliente b
  on a.id < b.id
  and similarity(a.nome, b.nome) > 0.35
where a.total_registros = 0 or b.total_registros = 0
order by parecido desc, cliente_1;
