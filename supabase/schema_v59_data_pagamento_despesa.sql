-- Sistema de Gestão de Pedidos de Alfaiataria — data real do pagamento (v59)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
--
-- Hoje "despesas" só tem o vencimento (quando a conta VENCE) e o quanto
-- já foi pago (valor_pago), mas não guarda QUANDO o pagamento aconteceu.
-- Pra dar pra bater o "quanto saiu da minha conta esse mês" com o
-- extrato bancário, precisa dessa data separada do vencimento — porque
-- uma conta pode vencer num mês e ser paga só no mês seguinte (ou o
-- contrário).
--
-- A partir de agora, toda vez que você registrar um pagamento (marcar
-- como paga ou lançar um valor pago parcial), o sistema grava a data de
-- hoje aqui automaticamente.

alter table despesas add column if not exists data_pagamento date;
