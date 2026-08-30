-- Marca quando uma peça precisou de ajuste extra além do fluxo normal
-- (ex: não caiu bem na prova, precisou refazer alguma parte) — pra
-- medir retrabalho separado do tempo de produção normal.
alter table pedidos_alfaiataria add column if not exists retrabalho boolean not null default false;
alter table pedidos_alfaiataria add column if not exists retrabalho_obs text;
