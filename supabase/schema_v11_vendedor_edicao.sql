-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v11)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script no Supabase: SQL Editor > New query > colar > Run
--
-- Dá ao vendedor permissão de ALTERAR (não só criar/ver) os próprios
-- pedidos — pra ele poder corrigir algo que digitou errado. Continua
-- só podendo mexer nos pedidos que ele mesmo criou (criado_por =
-- ele), igual já era pra visualizar.

drop policy if exists "vendedor_edita_seus_pedidos" on pedidos;
create policy "vendedor_edita_seus_pedidos" on pedidos
  for update to authenticated using (criado_por = auth.uid()) with check (criado_por = auth.uid());

-- Idem pro tecido lançado dentro desses pedidos (ex: corrigir código/qtd).
drop policy if exists "vendedor_edita_tecidos_proprios" on tecidos;
create policy "vendedor_edita_tecidos_proprios" on tecidos
  for update to authenticated using (
    pedido_id in (select id from pedidos where criado_por = auth.uid())
  ) with check (
    pedido_id in (select id from pedidos where criado_por = auth.uid())
  );
