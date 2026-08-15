-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v2)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run
-- (faça isso ANTES do import_dados_antigos.sql)

-- ------------------------------------------------------------------
-- PEDIDOS (camisas) — novos status e campo "plano de assinatura"
-- ------------------------------------------------------------------
alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('Aguardando Produção', 'Em Produção', 'Prova', 'Pronto', 'Entregue Parcial', 'Entregue'));

alter table pedidos add column if not exists plano_assinatura boolean not null default false;

-- ------------------------------------------------------------------
-- PEDIDOS ALFAIATARIA (trajes, calças, casacos etc. — produção: Icaro)
-- Pagamento: valor_total / valor_pago; saldo e status (Pendente/Parcial/
-- Pago) são calculados no app a partir desses dois campos, não guardados
-- aqui, pra nunca ficarem desatualizados.
-- Medidas guardadas agrupadas por seção (corpo/calca/colete) para não
-- colidir campos com o mesmo nome (ex: "Comprimento" existe em corpo e
-- em calça — são coisas diferentes).
-- ------------------------------------------------------------------
create table if not exists pedidos_alfaiataria (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  tipo_peca text not null default 'Traje'
    check (tipo_peca in ('Traje', 'Costume', 'Casaco', 'Bomber', 'Calça', 'Colete', 'Blazer', 'Outro')),
  data_pedido date not null default current_date,
  valor_total numeric(10,2),
  valor_pago numeric(10,2) not null default 0,
  medidas jsonb not null default '{}'::jsonb,
  caracteristicas jsonb not null default '{}'::jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedidos_alfaiataria_cliente_id_idx on pedidos_alfaiataria (cliente_id);

drop trigger if exists pedidos_alfaiataria_set_updated_at on pedidos_alfaiataria;
create trigger pedidos_alfaiataria_set_updated_at
  before update on pedidos_alfaiataria
  for each row execute function set_updated_at();

alter table pedidos_alfaiataria enable row level security;

drop policy if exists "authenticated_full_access" on pedidos_alfaiataria;
create policy "authenticated_full_access" on pedidos_alfaiataria
  for all to authenticated using (true) with check (true);
