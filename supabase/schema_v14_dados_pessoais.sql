-- CRM: dados pessoais do cliente (endereço, nascimento, contato) — em
-- tabela SEPARADA de "clientes" de propósito, com RLS só pro dono.
-- O vendedor continua enxergando só o nome do cliente (precisa disso
-- pra lançar pedido e detectar recompra) e nunca esses dados sensíveis
-- — minimização de dados exigida pela LGPD: cada um só vê o que precisa
-- pro seu trabalho.
create table if not exists clientes_dados_pessoais (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  endereco text,
  data_nascimento date,
  telefone text,
  email text,
  observacoes text,
  consentimento boolean not null default false,
  consentimento_em timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table clientes_dados_pessoais enable row level security;

drop policy if exists "dono_acesso_total_dados_pessoais" on clientes_dados_pessoais;
create policy "dono_acesso_total_dados_pessoais" on clientes_dados_pessoais
  for all to authenticated using (is_dono()) with check (is_dono());
