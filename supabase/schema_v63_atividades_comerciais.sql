-- Sistema de Gestão de Pedidos de Alfaiataria — Funil de vendas (v63)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
--
-- Tabela pra registrar, por semana, os números de prospecção do
-- vendedor que ainda não viram pedido/cliente no sistema (contatos,
-- conversas, atendimentos, indicações recebidas) — baseado no Manual de
-- Vendas Schuck ("Os 5 números da semana"). "Clientes novos" não entra
-- aqui: já é calculado a partir dos pedidos reais.
--
-- RLS: cada vendedor só grava/lê as PRÓPRIAS linhas; o dono lê (e
-- escreve, se precisar) as de todo mundo, pra acompanhar.

create table if not exists atividades_comerciais (
  id uuid primary key default gen_random_uuid(),
  vendedor_id uuid not null references auth.users(id) on delete cascade,
  semana date not null, -- segunda-feira da semana em questão
  contatos integer not null default 0,
  conversas integer not null default 0,
  atendimentos integer not null default 0,
  indicacoes_recebidas integer not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (vendedor_id, semana)
);

alter table atividades_comerciais enable row level security;

drop policy if exists "dono_acesso_total_atividades_comerciais" on atividades_comerciais;
create policy "dono_acesso_total_atividades_comerciais" on atividades_comerciais
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "vendedor_ve_suas_atividades" on atividades_comerciais;
create policy "vendedor_ve_suas_atividades" on atividades_comerciais
  for select to authenticated using (vendedor_id = auth.uid());

drop policy if exists "vendedor_cria_suas_atividades" on atividades_comerciais;
create policy "vendedor_cria_suas_atividades" on atividades_comerciais
  for insert to authenticated with check (vendedor_id = auth.uid());

drop policy if exists "vendedor_atualiza_suas_atividades" on atividades_comerciais;
create policy "vendedor_atualiza_suas_atividades" on atividades_comerciais
  for update to authenticated using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());
