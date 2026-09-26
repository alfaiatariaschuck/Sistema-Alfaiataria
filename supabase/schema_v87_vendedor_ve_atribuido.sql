-- O vendedor só enxergava (RLS) os pedidos que ELE MESMO cadastrou
-- (schema_v9: "vendedor_ve_seus_pedidos", criado_por = auth.uid()).
-- Quando o dono lança um pedido em seu próprio login mas credita a
-- comissão a um vendedor (campo vendedor_atribuido_id, schema_v61),
-- esse pedido nunca aparecia pro vendedor — a comissão/desempenho dele
-- ficava sub-contada dentro do próprio login. Isso não é falha de
-- segurança (o vendedor via de menos, não de mais), é o oposto: falta
-- de leitura sobre o que já é dele por regra de negócio. Adiciona só
-- leitura (sem editar) pra esse caso, complementando a policy de v9.
-- ADITIVO. Seguro rodar de novo (drop + create).
drop policy if exists "vendedor_ve_pedidos_atribuidos" on pedidos;
create policy "vendedor_ve_pedidos_atribuidos" on pedidos
  for select to authenticated using (vendedor_atribuido_id = auth.uid());

-- Mesmo motivo, pro detalhe de tecido não ficar em branco quando o
-- vendedor abre um desses pedidos atribuídos a ele.
drop policy if exists "vendedor_ve_tecidos_atribuidos" on tecidos;
create policy "vendedor_ve_tecidos_atribuidos" on tecidos
  for select to authenticated using (
    pedido_id in (select id from pedidos where vendedor_atribuido_id = auth.uid())
  );
