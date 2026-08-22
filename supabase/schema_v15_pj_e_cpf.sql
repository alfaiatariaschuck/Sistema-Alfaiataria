-- Completa a tabela de dados pessoais (schema_v14) com CPF/CNPJ e o tipo
-- de pessoa (Física ou Jurídica) — cliente pode comprar como PF ou como
-- empresa (nota fiscal em nome da PJ). Também dá pra preencher os dados
-- pessoais direto na ficha de Pedido Camisas / Pedido Alfaiataria, sem
-- precisar ir em Clientes depois.
--
-- Este script é seguro rodar mesmo que você ainda NÃO tenha rodado o
-- schema_v14 — ele cria a tabela do zero se precisar. Se você já rodou o
-- v14, ele só adiciona as colunas novas.

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

alter table clientes_dados_pessoais add column if not exists tipo_pessoa text not null default 'PF';
alter table clientes_dados_pessoais add column if not exists cpf text;
alter table clientes_dados_pessoais add column if not exists cnpj text;
alter table clientes_dados_pessoais add column if not exists razao_social text;

alter table clientes_dados_pessoais enable row level security;

drop policy if exists "dono_acesso_total_dados_pessoais" on clientes_dados_pessoais;
create policy "dono_acesso_total_dados_pessoais" on clientes_dados_pessoais
  for all to authenticated using (is_dono()) with check (is_dono());
