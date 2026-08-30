-- Observação livre por pausa — pra registrar o motivo de verdade (ex:
-- "cliente viajou até dia 20", "confirmou prova pra semana que vem"),
-- criando um histórico consultável por cliente/pedido de cada vez que
-- a peça parou.
alter table pedidos_alfaiataria_pausas add column if not exists observacao text;
