-- Pausa de produção — v29
-- ADITIVO. Quando um cliente viaja (ou qualquer motivo) e a peça fica
-- parada sem ninguém trabalhar nela, esses dias não devem contar como
-- tempo de produção real — senão distorce a média. Dois campos novos:
--
-- data_pausa_inicio — quando a pausa atual começou (null = não está
--                     pausada agora).
-- dias_pausados     — soma de todos os períodos de pausa já FINALIZADOS
--                     dessa peça (uma peça pode pausar e retomar mais
--                     de uma vez).
--
-- O tempo de produção real (início → entrega, descontando pausas) é
-- calculado no app (diasProducaoReal em lib/helpers.js), não precisa de
-- coluna própria pra isso.

alter table pedidos_alfaiataria add column if not exists data_pausa_inicio date;
alter table pedidos_alfaiataria add column if not exists dias_pausados integer not null default 0;
