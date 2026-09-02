-- Catálogo de tecidos de alfaiataria — mesmo padrão do catálogo de
-- tecidos de camisa (Tecidos de Camisa), mas separado porque as
-- nomenclaturas usadas na alfaiataria são outras (lãs, linhos etc., não
-- os tecidos de camisaria).
create table if not exists modelos_alfaiataria (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  codigo text,
  valor_referencia_metro numeric,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table modelos_alfaiataria enable row level security;
create policy "modelos_alfaiataria_dono" on modelos_alfaiataria for all using (is_dono()) with check (is_dono());
