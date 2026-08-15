-- Sistema de Gestão de Pedidos de Alfaiataria
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_normalizado text generated always as (lower(trim(nome))) stored,
  created_at timestamptz not null default now()
);

create unique index if not exists clientes_nome_normalizado_idx
  on clientes (nome_normalizado);

-- ------------------------------------------------------------------
-- PEDIDOS
-- ------------------------------------------------------------------
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  vendedor text,
  data_pedido date not null default current_date,
  previsao_entrega date,
  quantidade integer not null default 1,
  status text not null default 'Aguardando Produção'
    check (status in ('Aguardando Produção', 'Em Produção', 'Pronto', 'Entregue')),
  qt_entregue integer not null default 0,

  valor_receber numeric(10,2),
  status_pagamento_receber text not null default 'Pendente'
    check (status_pagamento_receber in ('Pendente', 'Recebido')),
  forma_pagamento text,

  recompra boolean not null default false,

  valor_pago_fabiana numeric(10,2),
  status_pagamento_fabiana text not null default 'Pendente'
    check (status_pagamento_fabiana in ('Pendente', 'Pago')),

  medidas jsonb not null default '{}'::jsonb,
  descricao jsonb not null default '{}'::jsonb,
  observacoes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedidos_cliente_id_idx on pedidos (cliente_id);
create index if not exists pedidos_status_idx on pedidos (status);
create index if not exists pedidos_data_pedido_idx on pedidos (data_pedido);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pedidos_set_updated_at on pedidos;
create trigger pedidos_set_updated_at
  before update on pedidos
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------
-- TECIDOS (itens de tecido de cada pedido — 1 pedido pode ter vários)
-- ------------------------------------------------------------------
create table if not exists tecidos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  codigo text,
  qtd integer default 1,
  numero text,
  fornecedor text,
  comprado boolean not null default false,
  ordem integer not null default 0
);

create index if not exists tecidos_pedido_id_idx on tecidos (pedido_id);

-- ------------------------------------------------------------------
-- CONFIG (chave/valor genérico — ex: telefone da costureira p/ ficha)
-- ------------------------------------------------------------------
create table if not exists config (
  chave text primary key,
  valor text
);

-- ------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Só usuários autenticados (login e-mail/senha) podem ler/gravar.
-- Todo mundo que faz login enxerga e edita os mesmos dados
-- (é uma ferramenta interna de uma equipe pequena, não multi-tenant).
-- ------------------------------------------------------------------
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table tecidos enable row level security;
alter table config enable row level security;

drop policy if exists "authenticated_full_access" on clientes;
create policy "authenticated_full_access" on clientes
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_full_access" on pedidos;
create policy "authenticated_full_access" on pedidos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_full_access" on tecidos;
create policy "authenticated_full_access" on tecidos
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_full_access" on config;
create policy "authenticated_full_access" on config
  for all to authenticated using (true) with check (true);
