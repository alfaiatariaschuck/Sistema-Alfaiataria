-- Fase 3 do Provador de Tecidos: liga a configuração escolhida pelo
-- cliente (colarinho, punho, tecido, monograma etc.) na ficha de
-- verdade do pedido/peça, em vez de só copiar texto/JSON solto.
--
-- config_visual guarda, como um objeto só: { pedido: {...objeto do
-- provador...}, texto: "...", imagemUrl: "...", criadoEm: "..." } —
-- mesmo padrão já usado pra medidas/caracteristicas/tecidos (jsonb).

alter table pedidos add column if not exists config_visual jsonb;
alter table pedidos_alfaiataria add column if not exists config_visual jsonb;
