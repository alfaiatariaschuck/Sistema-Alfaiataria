-- Login restrito de Produção (Ícaro) — v27
-- ADITIVO. Só rode isso quando decidir ativar o acesso do Ícaro de
-- verdade (mesmo espírito do schema_v9, que fez isso pro Deivid).
--
-- O que faz:
-- 1) Permite o papel 'producao' na tabela perfis (que já existe, criada
--    no schema_v9).
-- 2) Duas colunas novas em pedidos_alfaiataria: data_inicio_producao
--    (quando a peça começou a ser produzida de verdade — hoje só existe
--    data do pedido e data de entrega) e observacoes_producao (nota do
--    Ícaro, separada da sua nota em "observacoes" — mesma ideia da
--    planilha, que tem "Obs. Tales" e "Obs. Ícaro" como colunas distintas).
-- 3) RLS: o papel 'producao' só enxerga e só atualiza pedidos_alfaiataria
--    (nada de camisaria, planos, config, clientes_dados_pessoais —
--    essas tabelas não têm política nenhuma pra esse papel, então o RLS
--    nega tudo automaticamente). Mesmo assim, a tela dele (ShellProducao)
--    busca só as colunas que não são sensíveis (sem valor/pagamento) —
--    a política do banco garante que ele não acessa OUTRAS tabelas, e a
--    consulta específica da tela garante que nem os valores dessa
--    tabela chegam até o navegador dele.

alter table perfis drop constraint if exists perfis_papel_check;
alter table perfis add constraint perfis_papel_check check (papel in ('dono', 'vendedor', 'producao'));

alter table pedidos_alfaiataria add column if not exists data_inicio_producao date;
alter table pedidos_alfaiataria add column if not exists observacoes_producao text;

create or replace function is_producao() returns boolean
  language sql stable
  security definer
  set search_path = public
as $$
  select coalesce((select papel = 'producao' from perfis where id = auth.uid()), false);
$$;

drop policy if exists "producao_ve_pecas" on pedidos_alfaiataria;
create policy "producao_ve_pecas" on pedidos_alfaiataria
  for select to authenticated using (is_producao());

drop policy if exists "producao_atualiza_pecas" on pedidos_alfaiataria;
create policy "producao_atualiza_pecas" on pedidos_alfaiataria
  for update to authenticated using (is_producao()) with check (is_producao());

drop policy if exists "producao_ve_tecidos_alfaiataria" on tecidos;
create policy "producao_ve_tecidos_alfaiataria" on tecidos
  for select to authenticated using (is_producao() and pedido_alfaiataria_id is not null);

-- ------------------------------------------------------------------
-- Marca o Ícaro como 'producao' — SÓ RODE ISSO DEPOIS de já ter criado
-- o login dele no Supabase (Authentication > Users > Add user).
-- Troque o e-mail abaixo se não for esse (peguei do seu Drive, confirme
-- antes de rodar). Se rodar antes de criar o login, não acha o e-mail e
-- não faz nada — pode rodar de novo depois sem problema.
-- ------------------------------------------------------------------
insert into perfis (id, papel, nome)
select id, 'producao', 'Ícaro'
from auth.users
where email = 'icaro.fadrique@gmail.com'
on conflict (id) do update set papel = 'producao', nome = excluded.nome;
