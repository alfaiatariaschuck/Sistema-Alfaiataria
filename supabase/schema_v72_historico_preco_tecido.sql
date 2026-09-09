-- Histórico de preço por metro do Estoque de Tecido (v72)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Cada vez que o "valor por metro" de um código muda (cadastro,
-- registrar compra com preço novo, ou edição direta), fica registrado
-- aqui — dá pra ver se um fornecedor está subindo o preço aos poucos.

create table if not exists estoque_precos_historico (
  id uuid primary key default gen_random_uuid(),
  estoque_id uuid not null references estoque_tecidos(id) on delete cascade,
  valor_metro numeric not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_estoque_precos_historico_estoque on estoque_precos_historico(estoque_id);

alter table estoque_precos_historico enable row level security;

drop policy if exists "authenticated_full_access" on estoque_precos_historico;
create policy "authenticated_full_access" on estoque_precos_historico
  for all to authenticated using (true) with check (true);
