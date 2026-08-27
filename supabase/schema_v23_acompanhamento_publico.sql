-- Acompanhamento público do pedido: uma página tipo "rastreio dos
-- correios" que o cliente acessa por um link (sem login), mostrando só o
-- essencial (etapa atual, % concluído, previsão de entrega) — nada de
-- valores, telefone, endereço ou dados de outros clientes. Isso é feito
-- por uma função (RPC) com acesso elevado que devolve só essas colunas
-- pro papel "anon"; as tabelas em si continuam com RLS normal (só dono).

-- Etapas novas da Alfaiataria (mais granulares que a Camisaria — corte,
-- provas, ajustes, acabamento) + corrige a falta de 'Doação' nas duas
-- tabelas (o app já usa esse status, mas a constraint nunca tinha sido
-- atualizada pra aceitar).
alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('Aguardando Produção', 'Em Produção', 'Prova', 'Pronto', 'Entregue Parcial', 'Entregue', 'Doação'));

alter table pedidos_alfaiataria drop constraint if exists pedidos_alfaiataria_status_check;
alter table pedidos_alfaiataria add constraint pedidos_alfaiataria_status_check
  check (status in (
    'Aguardando Produção', 'Corte', '1ª Prova', 'Ajustes', '2ª Prova', 'Acabamento',
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
