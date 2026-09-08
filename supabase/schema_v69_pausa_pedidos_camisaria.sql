-- Botão de pausa nos pedidos de Camisaria (v69)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
--
-- Mesma lógica que já existe pra Alfaiataria (pedidos_alfaiataria +
-- pedidos_alfaiataria_pausas): quando o cliente some e não dá pra marcar
-- a prova (não responde, viajou etc.), o pedido de camisa fica pausado
-- — os dias parados não contam no prazo médio de produção do Painel
-- Camisaria, que hoje fica distorcido por casos assim (ex: cliente que
-- não responde há semanas).

alter table pedidos add column if not exists pausado boolean not null default false;
alter table pedidos add column if not exists data_pausa_inicio date;
alter table pedidos add column if not exists dias_pausados integer not null default 0;

create table if not exists pedidos_pausas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  motivo text not null default 'outro' check (motivo in ('cliente_prova', 'outro')),
  data_inicio date not null,
  data_fim date,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pedidos_pausas_pedido on pedidos_pausas(pedido_id);

alter table pedidos_pausas enable row level security;

drop policy if exists "dono_gerencia_pedidos_pausas" on pedidos_pausas;
create policy "dono_gerencia_pedidos_pausas" on pedidos_pausas
  for all to authenticated using (is_dono()) with check (is_dono());
