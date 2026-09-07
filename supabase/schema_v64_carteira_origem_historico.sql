-- Sistema de Gestão de Pedidos de Alfaiataria — Carteira, origem e
-- histórico de cliente (v64)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
--
-- 1) "Dono da carteira" (Tales ou Deivid) — de quem é o relacionamento
--    com aquele cliente. Usado pra creditar a venda automaticamente pra
--    quem é dono do cliente (não necessariamente quem lançou o pedido).
--    Só o DONO consegue alterar esse campo: a tabela "clientes" já tem
--    política "dono_acesso_total_clientes" (for all, is_dono()) e o
--    vendedor NUNCA teve política de UPDATE nela (só select/insert) —
--    então esse campo já nasce protegido, sem precisar de política nova.
--
-- 2) Canal de origem do cliente (Indicação, Google, Instagram, Campanha
--    Instagram, Facebook, Prospecção ativa, Outro) + quem indicou,
--    quando for o caso — preenchido na hora que o cliente é criado
--    (pelo dono OU pelo vendedor, já que o INSERT em "clientes" é aberto
--    pra ambos desde o schema_v9).
--
-- 3) Histórico/observações do cliente — timeline (não sobrescreve),
--    usada tanto pra anotações livres ("profissão, preferências, última
--    abordagem") quanto pra marcar as ações de pós-venda do Manual de
--    Vendas (D+1, D+15, D+60-90, 6 meses, 12 meses) como feitas.
--    Qualquer login autenticado (dono ou vendedor) grava/lê — não é
--    dado sensível de LGPD como em "clientes_dados_pessoais", é
--    anotação comercial/CRM.

alter table clientes add column if not exists dono_carteira_id uuid references auth.users(id);
alter table clientes add column if not exists origem text;
alter table clientes add column if not exists indicado_por text;

create table if not exists clientes_historico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  autor_id uuid references auth.users(id),
  texto text not null,
  marco text, -- opcional: 'd1' | 'd15' | 'd60_90' | '6_meses' | '12_meses', quando é ação de pós-venda
  criado_em timestamptz not null default now()
);

alter table clientes_historico enable row level security;

drop policy if exists "dono_acesso_total_clientes_historico" on clientes_historico;
create policy "dono_acesso_total_clientes_historico" on clientes_historico
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "vendedor_le_historico_clientes" on clientes_historico;
create policy "vendedor_le_historico_clientes" on clientes_historico
  for select to authenticated using (true);

drop policy if exists "vendedor_cria_historico_clientes" on clientes_historico;
create policy "vendedor_cria_historico_clientes" on clientes_historico
  for insert to authenticated with check (autor_id = auth.uid());
