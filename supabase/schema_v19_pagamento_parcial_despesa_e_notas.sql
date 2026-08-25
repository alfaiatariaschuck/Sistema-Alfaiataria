-- Contas a Pagar: despesas passam a aceitar pagamento parcial (fornecedor
-- que você paga aos poucos) e ganha uma lista separada de "notas de venda
-- futura" — puramente um lembrete, que nunca entra em nenhum cálculo.
alter table despesas add column if not exists valor_pago numeric not null default 0;

-- Amplia a constraint de status pra aceitar "Parcial" (antes só Pendente/Pago).
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'despesas'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table despesas drop constraint %I', c.conname);
  end loop;
end $$;
alter table despesas add constraint despesas_status_check check (status in ('Pendente', 'Parcial', 'Pago'));

create table if not exists notas_venda_futura (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric,
  data_esperada date,
  criado_em timestamptz not null default now()
);
alter table notas_venda_futura enable row level security;
drop policy if exists "authenticated_full_access" on notas_venda_futura;
create policy "authenticated_full_access" on notas_venda_futura for all to authenticated using (true) with check (true);
