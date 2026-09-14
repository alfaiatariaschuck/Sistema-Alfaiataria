-- Ordem manual da fila de produção (Alfaiataria) (v76)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Antes a fila só ordenava por coluna clicada (nome, dias etc, escolha
-- que fica só no navegador de quem clicou, não é compartilhada). Esse
-- campo guarda uma ordem manual definida pelo dono, visível igual pra
-- quem acessa como dono e pro login do Ícaro (view compartilhada) —
-- independente de qualquer ordenação automática por coluna.

alter table pedidos_alfaiataria add column if not exists ordem_producao integer;
