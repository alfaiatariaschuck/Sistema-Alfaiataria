-- Sistema de Gestão de Pedidos de Alfaiataria — Ranking de Indicação (v66)
-- ADITIVO. Seguro rodar de novo (só usa "add column if not exists").
--
-- "Indicado por" hoje é só texto livre (digitado igual ao campo
-- Cliente, com autocomplete). Pra o Ranking de Indicação somar peças
-- certo — sem depender de bater letra por letra com o nome do cliente
-- indicador — cada cliente novo agora também tenta linkar por ID com
-- quem indicou, quando o nome digitado bate com um cliente já
-- cadastrado (feito em encontrarOuCriarCliente, lib/clientes.js).
alter table clientes add column if not exists indicado_por_cliente_id uuid references clientes(id);
