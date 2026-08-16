-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v7)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- PAGAMENTO DIVIDIDO (entrada + restante na entrega) — pedidos (camisas)
-- valor_receber continua sendo o total (à vista OU entrada+restante somados).
-- ------------------------------------------------------------------
alter table pedidos add column if not exists pagamento_dividido boolean not null default false;
alter table pedidos add column if not exists valor_entrada numeric(10,2);
alter table pedidos add column if not exists status_entrada text;
alter table pedidos add column if not exists valor_restante numeric(10,2);
alter table pedidos add column if not exists status_restante text;

-- ------------------------------------------------------------------
-- PEDIDOS ALFAIATARIA — valor de venda pro cliente (hoje só existia
-- valor devido/pago ao Icaro, que é custo de produção, não venda) +
-- o mesmo esquema de pagamento dividido.
-- ------------------------------------------------------------------
alter table pedidos_alfaiataria add column if not exists valor_venda numeric(10,2);
alter table pedidos_alfaiataria add column if not exists status_pagamento_venda text;
alter table pedidos_alfaiataria add column if not exists pagamento_dividido boolean not null default false;
alter table pedidos_alfaiataria add column if not exists valor_entrada numeric(10,2);
alter table pedidos_alfaiataria add column if not exists status_entrada text;
alter table pedidos_alfaiataria add column if not exists valor_restante numeric(10,2);
alter table pedidos_alfaiataria add column if not exists status_restante text;

-- ------------------------------------------------------------------
-- PLANOS DE ASSINATURA — data da venda (competência) + pagamento
-- dividido. valor_receber passa a representar o valor TOTAL da venda
-- fechada com o cliente (não mais "valor por emissão mensal") — as
-- emissões mensais ("Emitir pedido do mês") deixam de gerar receita
-- nova, pois o dinheiro já foi contabilizado na data da venda.
-- ------------------------------------------------------------------
alter table planos_assinatura add column if not exists data_venda date;
alter table planos_assinatura add column if not exists status_pagamento_venda text;
alter table planos_assinatura add column if not exists pagamento_dividido boolean not null default false;
alter table planos_assinatura add column if not exists valor_entrada numeric(10,2);
alter table planos_assinatura add column if not exists status_entrada text;
alter table planos_assinatura add column if not exists valor_restante numeric(10,2);
alter table planos_assinatura add column if not exists status_restante text;
