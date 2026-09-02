-- Catálogo de modelos de camisa (ex: Social Slim, Casual, Oxford) — pra
-- você enxergar quais modelos mais vende. O pedido de camisa ganha um
-- campo "modelo" (texto livre, com sugestão do catálogo — mesmo padrão
-- do fornecedor em Compras/Aviamentos, não é uma FK rígida).
create table if not exists modelos_camisa (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table modelos_camisa enable row level security;
create policy "modelos_camisa_dono" on modelos_camisa for all using (is_dono()) with check (is_dono());

alter table pedidos add column if not exists modelo text;
