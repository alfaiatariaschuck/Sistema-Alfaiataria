-- Sistema de Gestão de Pedidos de Alfaiataria — Taxa de cartão real (v68)
-- ADITIVO. Seguro rodar de novo ("add column if not exists").
--
-- Em vez de estimar uma taxa de cartão configurada, o valor líquido
-- realmente recebido (do extrato da maquininha) é digitado direto na
-- ficha de cada venda — o sistema calcula sozinho a diferença (taxa de
-- cartão em R$ e em %) comparando com o valor vendido. Fica em branco
-- até o extrato chegar; PIX/dinheiro nem precisa preencher (sem taxa).
alter table pedidos add column if not exists valor_liquido_recebido numeric;
alter table pedidos_alfaiataria add column if not exists valor_liquido_recebido numeric;
