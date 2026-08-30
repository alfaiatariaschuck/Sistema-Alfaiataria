-- Registro de pausas de produção com motivo — separa "esperando o
-- cliente vir fazer prova" de outros motivos (falta de tecido, viagem,
-- doença etc.), pra medir o gargalo do cliente isolado da produção em
-- si. O campo situacao="Pausado"/dias_pausados em pedidos_alfaiataria
-- continua existindo e sendo atualizado igual antes (é o que já entra
-- em diasProducaoReal) — essa tabela é um log paralelo, só pra
-- categorizar e reportar por motivo, não pra recalcular o total.
create table if not exists pedidos_alfaiataria_pausas (
  id uuid primary key default gen_random_uuid(),
  peca_id uuid not null references pedidos_alfaiataria(id) on delete cascade,
  motivo text not null default 'outro' check (motivo in ('cliente_prova', 'outro')),
  data_inicio date not null,
  data_fim date,
  created_at timestamptz not null default now()
);

create index if not exists idx_pausas_peca on pedidos_alfaiataria_pausas(peca_id);

alter table pedidos_alfaiataria_pausas enable row level security;

drop policy if exists "dono_gerencia_pausas" on pedidos_alfaiataria_pausas;
create policy "dono_gerencia_pausas" on pedidos_alfaiataria_pausas
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "producao_ve_pausas" on pedidos_alfaiataria_pausas;
create policy "producao_ve_pausas" on pedidos_alfaiataria_pausas
  for select to authenticated using (is_producao());
