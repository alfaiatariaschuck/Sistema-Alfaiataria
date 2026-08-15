-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v4)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- PEDIDOS ALFAIATARIA — status de produção (mesmo conjunto das camisas)
-- e previsão de entrega, pra dar pra acompanhar "entregue ou não" e
-- ter um painel de próximas entregas igual ao das camisas.
-- ------------------------------------------------------------------
alter table pedidos_alfaiataria add column if not exists status text not null default 'Aguardando Produção'
  check (status in ('Aguardando Produção', 'Em Produção', 'Prova', 'Pronto', 'Entregue Parcial', 'Entregue'));

alter table pedidos_alfaiataria add column if not exists previsao_entrega date;

create index if not exists pedidos_alfaiataria_status_idx on pedidos_alfaiataria (status);
