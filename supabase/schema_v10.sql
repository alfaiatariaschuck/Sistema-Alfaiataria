-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v10)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- Destaque de "ainda não enviado" — pedidos e peças recém-lançados
-- ficam marcados em destaque na lista até você mandar a ficha pra
-- Fabi/Icaro (ou marcar manualmente). O default "true" garante que os
-- lançamentos já existentes não fiquem todos destacados de uma vez —
-- só os novos (que o app já insere como false) entram na lista.
-- ------------------------------------------------------------------
alter table pedidos add column if not exists enviado_fabi boolean not null default true;
alter table pedidos_alfaiataria add column if not exists enviado_icaro boolean not null default true;
