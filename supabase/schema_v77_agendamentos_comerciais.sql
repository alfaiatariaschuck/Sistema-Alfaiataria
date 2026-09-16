-- Agenda comercial do vendedor (v77)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
--
-- O Funil de Vendas já soma "Agendamentos" por semana (um número só),
-- mas não guarda QUAIS agendamentos são — cliente, dia, hora. Essa
-- tabela guarda cada agendamento individual, pra virar um calendário de
-- verdade: o vendedor lança conforme agenda, e o dono acompanha em
-- tempo real (mesmo padrão de RLS de atividades_comerciais/v63 — cada
-- vendedor só grava/lê as próprias linhas, o dono vê/mexe em todas).

create table if not exists agendamentos_comerciais (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references auth.users(id) on delete cascade,
  cliente text not null,
  data date not null,
  hora text,
  observacao text,
  status text not null default 'Agendado' check (status in ('Agendado', 'Realizado', 'Cancelado')),
  criado_em timestamptz not null default now()
);

create index if not exists idx_agendamentos_comerciais_vendedor_data on agendamentos_comerciais (vendedor_id, data);

alter table agendamentos_comerciais enable row level security;

drop policy if exists "dono_acesso_total_agendamentos_comerciais" on agendamentos_comerciais;
create policy "dono_acesso_total_agendamentos_comerciais" on agendamentos_comerciais
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "vendedor_ve_seus_agendamentos" on agendamentos_comerciais;
create policy "vendedor_ve_seus_agendamentos" on agendamentos_comerciais
  for select to authenticated using (vendedor_id = auth.uid());

drop policy if exists "vendedor_cria_seus_agendamentos" on agendamentos_comerciais;
create policy "vendedor_cria_seus_agendamentos" on agendamentos_comerciais
  for insert to authenticated with check (vendedor_id = auth.uid());

drop policy if exists "vendedor_atualiza_seus_agendamentos" on agendamentos_comerciais;
create policy "vendedor_atualiza_seus_agendamentos" on agendamentos_comerciais
  for update to authenticated using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());

drop policy if exists "vendedor_remove_seus_agendamentos" on agendamentos_comerciais;
create policy "vendedor_remove_seus_agendamentos" on agendamentos_comerciais
  for delete to authenticated using (vendedor_id = auth.uid());
