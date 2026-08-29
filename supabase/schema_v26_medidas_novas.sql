-- Botão "Medidas Novas" na recompra: quando o cliente já comprou antes mas
-- mudou de corpo (emagreceu, engordou etc.), o vendedor limpa as medidas
-- pré-preenchidas e marca esse pedido — a ficha impressa pra Fabi/Icaro
-- destaca isso em vermelho, pra não usarem a medida do pedido anterior
-- por engano.
alter table pedidos add column if not exists medidas_novas boolean not null default false;
alter table pedidos_alfaiataria add column if not exists medidas_novas boolean not null default false;
