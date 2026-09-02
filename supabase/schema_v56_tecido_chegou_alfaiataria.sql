-- Mesmo marcador de "tecido chegou" que já existe em pedidos de camisa,
-- agora também pra peças de alfaiataria.
alter table pedidos_alfaiataria add column if not exists tecido_chegou boolean default false;
