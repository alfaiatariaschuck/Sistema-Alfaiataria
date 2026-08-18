-- Sistema de Gestão de Pedidos de Alfaiataria — Acesso restrito de Vendedor (v9)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
-- NÃO RODE ISSO AINDA — este script só deve ser executado quando você
-- decidir ativar o acesso do vendedor de verdade. Enquanto não rodar,
-- o sistema continua exatamente como está hoje pra você.
--
-- O que ele faz:
-- 1) Cria a tabela "perfis", que diz se um login é "dono" (acesso total,
--    como é hoje) ou "vendedor" (acesso restrito).
-- 2) Troca as políticas de acesso (RLS) de cada tabela: quem não tiver
--    perfil cadastrado continua com acesso total (você, sem precisar
--    fazer nada) — só quem for marcado como "vendedor" fica restrito.
-- 3) O vendedor só consegue: criar pedidos de camisa, ver os pedidos
--    que ele mesmo criou, e ler/cadastrar clientes (pra não duplicar
--    nome). Nada de painéis, financeiro, alfaiataria, planos ou
--    configurações — nem pela tela, nem tentando acessar o banco direto.

-- ------------------------------------------------------------------
-- 1) Tabela de perfis
-- ------------------------------------------------------------------
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  papel text not null default 'dono' check (papel in ('dono', 'vendedor')),
  nome text,
  created_at timestamptz not null default now()
);

alter table perfis enable row level security;

drop policy if exists "cada_um_le_seu_perfil" on perfis;
create policy "cada_um_le_seu_perfil" on perfis
  for select to authenticated using (id = auth.uid());

-- Função auxiliar: true se o usuário logado é "dono" — inclusive se
-- ele ainda não tem linha em "perfis" (assim seu login continua com
-- acesso total sem precisar de nenhum cadastro manual).
create or replace function is_dono() returns boolean
  language sql stable
  security definer
  set search_path = public
as $$
  select coalesce(
    (select papel = 'dono' from perfis where id = auth.uid()),
    true
  );
$$;

-- ------------------------------------------------------------------
-- 2) Rastreamento de quem criou o pedido (pra restringir o que o
--    vendedor enxerga só ao que ele mesmo lançou)
-- ------------------------------------------------------------------
alter table pedidos add column if not exists criado_por uuid references auth.users(id) default auth.uid();

-- ------------------------------------------------------------------
-- 3) Políticas — pedidos (camisas)
-- ------------------------------------------------------------------
drop policy if exists "authenticated_full_access" on pedidos;
drop policy if exists "dono_acesso_total_pedidos" on pedidos;
create policy "dono_acesso_total_pedidos" on pedidos
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "vendedor_ve_seus_pedidos" on pedidos;
create policy "vendedor_ve_seus_pedidos" on pedidos
  for select to authenticated using (criado_por = auth.uid());

drop policy if exists "vendedor_cria_pedidos" on pedidos;
create policy "vendedor_cria_pedidos" on pedidos
  for insert to authenticated with check (criado_por = auth.uid());

-- ------------------------------------------------------------------
-- 4) Políticas — clientes (vendedor precisa buscar/cadastrar cliente)
-- ------------------------------------------------------------------
drop policy if exists "authenticated_full_access" on clientes;
drop policy if exists "dono_acesso_total_clientes" on clientes;
create policy "dono_acesso_total_clientes" on clientes
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "vendedor_le_clientes" on clientes;
create policy "vendedor_le_clientes" on clientes
  for select to authenticated using (true);

drop policy if exists "vendedor_cria_clientes" on clientes;
create policy "vendedor_cria_clientes" on clientes
  for insert to authenticated with check (true);

-- ------------------------------------------------------------------
-- 5) Políticas — tecidos (só os tecidos dos pedidos que ele mesmo criou)
-- ------------------------------------------------------------------
drop policy if exists "authenticated_full_access" on tecidos;
drop policy if exists "dono_acesso_total_tecidos" on tecidos;
create policy "dono_acesso_total_tecidos" on tecidos
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "vendedor_ve_tecidos_proprios" on tecidos;
create policy "vendedor_ve_tecidos_proprios" on tecidos
  for select to authenticated using (
    pedido_id in (select id from pedidos where criado_por = auth.uid())
  );

drop policy if exists "vendedor_cria_tecidos_proprios" on tecidos;
create policy "vendedor_cria_tecidos_proprios" on tecidos
  for insert to authenticated with check (
    pedido_id in (select id from pedidos where criado_por = auth.uid())
  );

-- ------------------------------------------------------------------
-- 6) Demais tabelas — só o dono acessa (vendedor não tem política
--    nenhuma aqui, então o RLS nega tudo pra ele automaticamente)
-- ------------------------------------------------------------------
drop policy if exists "authenticated_full_access" on pedidos_alfaiataria;
drop policy if exists "dono_acesso_total_pedidos_alfaiataria" on pedidos_alfaiataria;
create policy "dono_acesso_total_pedidos_alfaiataria" on pedidos_alfaiataria
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "authenticated_full_access" on planos_assinatura;
drop policy if exists "dono_acesso_total_planos_assinatura" on planos_assinatura;
create policy "dono_acesso_total_planos_assinatura" on planos_assinatura
  for all to authenticated using (is_dono()) with check (is_dono());

drop policy if exists "authenticated_full_access" on config;
drop policy if exists "dono_acesso_total_config" on config;
create policy "dono_acesso_total_config" on config
  for all to authenticated using (is_dono()) with check (is_dono());

-- ------------------------------------------------------------------
-- 7) Quando for ativar de verdade, depois de criar o login do
--    vendedor no Supabase (Authentication > Users > Add user), rode
--    isso trocando o e-mail e o nome:
--
-- insert into perfis (id, papel, nome)
-- select id, 'vendedor', 'Nome do Vendedor'
-- from auth.users
-- where email = 'email-do-vendedor@exemplo.com'
-- on conflict (id) do update set papel = 'vendedor', nome = excluded.nome;
-- ------------------------------------------------------------------
