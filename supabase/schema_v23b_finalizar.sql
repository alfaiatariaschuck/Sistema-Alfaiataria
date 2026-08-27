-- Os dados já estão certinhos (confirmado pelo diagnóstico) — essa parte
-- só falta travar as regras novas e criar a função pública de acompanhamento.
alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('Aguardando Produção', 'Em Produção', 'Prova', 'Pronto', 'Entregue Parcial', 'Entregue', 'Doação'));

alter table pedidos_alfaiataria drop constraint if exists pedidos_alfaiataria_status_check;
alter table pedidos_alfaiataria add constraint pedidos_alfaiataria_status_check
  check (status in (
    'Aguardando Produção', 'Em Produção', 'Prova', 'Corte', '1ª Prova', 'Ajustes', '2ª Prova', 'Acabamento',
    'Pronto', 'Entregue Parcial', 'Entregue', 'Doação'
  ));

create or replace function acompanhar_pedido(p_tipo text, p_id uuid)
returns table (
  cliente text,
  status text,
  previsao_entrega date,
  tipo_peca text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo = 'camisaria' then
    return query
      select c.nome, p.status, p.previsao_entrega, null::text
      from pedidos p
      join clientes c on c.id = p.cliente_id
      where p.id = p_id;
  elsif p_tipo = 'alfaiataria' then
    return query
      select c.nome, pa.status, pa.previsao_entrega, pa.tipo_peca
      from pedidos_alfaiataria pa
      join clientes c on c.id = pa.cliente_id
      where pa.id = p_id;
  end if;
end;
$$;

grant execute on function acompanhar_pedido(text, uuid) to anon;
