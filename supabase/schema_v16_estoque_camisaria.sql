-- Estoque de tecido — pensado pro caso do Cataguases (só vende em rolos
-- de 30m), mas serve pra qualquer fornecedor que você queira manter
-- estoque em vez de comprar sob encomenda a cada pedido.
--
-- estoque_tecidos: saldo atual (em metros) de cada código de tecido.
-- estoque_movimentos: histórico de entradas (compra de rolos) e saídas
-- (uso em algum pedido) — é o que te dá visibilidade de "o que aconteceu".

create table if not exists estoque_tecidos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  codigo_normalizado text generated always as (lower(trim(codigo))) stored,
  fornecedor text,
  saldo_metros numeric not null default 0,
  metros_por_rolo numeric not null default 30,
  atualizado_em timestamptz not null default now()
);

create unique index if not exists estoque_tecidos_codigo_idx on estoque_tecidos (codigo_normalizado);

create table if not exists estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  estoque_id uuid not null references estoque_tecidos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  metros numeric not null,
  motivo text,
  criado_em timestamptz not null default now()
);

create index if not exists estoque_movimentos_estoque_id_idx on estoque_movimentos (estoque_id);

alter table estoque_tecidos enable row level security;
alter table estoque_movimentos enable row level security;

drop policy if exists "authenticated_full_access" on estoque_tecidos;
create policy "authenticated_full_access" on estoque_tecidos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_full_access" on estoque_movimentos;
create policy "authenticated_full_access" on estoque_movimentos
  for all to authenticated using (true) with check (true);
