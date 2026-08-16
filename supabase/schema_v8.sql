-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v8)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- PEDIDOS ALFAIATARIA — forma de pagamento (faltava, só existia nos
-- pedidos de camisa). Usada no Relatório Alfaiataria pra separar por
-- PIX, cartão etc.
-- ------------------------------------------------------------------
alter table pedidos_alfaiataria add column if not exists forma_pagamento text;
