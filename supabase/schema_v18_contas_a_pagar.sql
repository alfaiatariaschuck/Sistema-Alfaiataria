-- Contas a Pagar: despesas gerais do negócio (aluguel, contas, material
-- avulso etc.) — separado do que já é pago à Fabiana/Icaro — e previsões
-- de venda futura (ainda não viraram pedido) para montar um receita x
-- despesa dos próximos dias.
create table if not exists despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text,
  valor numeric not null default 0,
  vencimento date not null,
  status text not null default 'Pendente' check (status in ('Pendente', 'Pago')),
  recorrente boolean not null default false,
  criado_em timestamptz not null default now()
);
create index if not exists despesas_vencimento_idx on despesas (vencimento);
alter table despesas enable row level security;
drop policy if exists "authenticated_full_access" on despesas;
create policy "authenticated_full_access" on despesas for all to authenticated using (true) with check (true);

create table if not exists previsoes_venda (
  id uuid primary key default gen_random_uuid(),
  descricao text,
  valor numeric not null default 0,
  data_esperada date not null,
  criado_em timestamptz not null default now()
);
create index if not exists previsoes_venda_data_idx on previsoes_venda (data_esperada);
alter table previsoes_venda enable row level security;
drop policy if exists "authenticated_full_access" on previsoes_venda;
create policy "authenticated_full_access" on previsoes_venda for all to authenticated using (true) with check (true);
