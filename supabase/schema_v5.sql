-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v5)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- PLANOS DE ASSINATURA (camisas) — cadastro-modelo de um cliente
-- recorrente: medidas e características ficam salvas aqui uma vez,
-- e todo mês você clica em "Emitir pedido do mês" pra gerar um
-- pedido de verdade (na tabela pedidos) com esses dados já
-- preenchidos, pronto pra mandar pra Fabi.
-- ------------------------------------------------------------------
create table if not exists planos_assinatura (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  vendedor text,
  quantidade integer not null default 12,
  qt_entregue integer not null default 0,
  valor_receber numeric(10,2),
  forma_pagamento text,
  medidas jsonb not null default '{}'::jsonb,
  descricao jsonb not null default '{}'::jsonb,
  tecidos jsonb not null default '[]'::jsonb,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Caso a tabela já exista de uma execução anterior deste script, garante a coluna nova sem apagar nada.
alter table planos_assinatura add column if not exists tecidos jsonb not null default '[]'::jsonb;

drop trigger if exists planos_assinatura_set_updated_at on planos_assinatura;
create trigger planos_assinatura_set_updated_at
  before update on planos_assinatura
  for each row execute function set_updated_at();

alter table planos_assinatura enable row level security;

drop policy if exists "authenticated_full_access" on planos_assinatura;
create policy "authenticated_full_access" on planos_assinatura
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------------
-- PEDIDOS — referência opcional pro plano que gerou aquele pedido
-- (rastreabilidade; não afeta pedidos existentes, fica nulo neles)
-- ------------------------------------------------------------------
alter table pedidos add column if not exists origem_plano_id uuid references planos_assinatura(id) on delete set null;
create index if not exists pedidos_origem_plano_id_idx on pedidos (origem_plano_id);
