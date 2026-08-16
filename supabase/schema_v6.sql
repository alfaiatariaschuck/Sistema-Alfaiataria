-- Sistema de Gestão de Pedidos de Alfaiataria — Atualização (v6)
-- ADITIVO: não apaga nem recria tabelas/colunas existentes.
-- Rode este script inteiro no Supabase: SQL Editor > New query > colar > Run

-- ------------------------------------------------------------------
-- PLANOS DE ASSINATURA — valor devido à Fabiana fica guardado aqui
-- enquanto é só plano (não soma no Painel Camisaria, que só lê a
-- tabela pedidos). Quando você clica em "Emitir pedido do mês", esse
-- valor é copiado pro pedido de verdade, e aí sim passa a contar.
-- ------------------------------------------------------------------
alter table planos_assinatura add column if not exists valor_pago_fabiana numeric(10,2);
