-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v3)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- TECIDOS — passa a poder pertencer a um pedido de camisa OU a uma
-- peça de alfaiataria (traje/calça/casaco...), nunca os dois ao mesmo
-- tempo. Isso reaproveita a mesma estrutura de compras (fornecedor,
-- código, qtd, observação, comprado) para as duas áreas.
-- ------------------------------------------------------------------
alter table tecidos alter column pedido_id drop not null;

alter table tecidos add column if not exists pedido_alfaiataria_id uuid references pedidos_alfaiataria(id) on delete cascade;

alter table tecidos drop constraint if exists tecidos_pedido_ref_check;
alter table tecidos add constraint tecidos_pedido_ref_check check (
  (pedido_id is not null and pedido_alfaiataria_id is null) or
  (pedido_id is null and pedido_alfaiataria_id is not null)
);

create index if not exists tecidos_pedido_alfaiataria_id_idx on tecidos (pedido_alfaiataria_id);
