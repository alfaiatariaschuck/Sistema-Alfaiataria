-- O Tales confirmou: a peça "Casaco" lançada com valor de venda de
-- R$1,00 foi na verdade uso próprio dele (não foi vendida pra
-- cliente nenhum) — o R$1,00 era só um valor de brincadeira/placeholder
-- que acabou entrando nas médias de margem por tipo de peça, distorcendo
-- o número (dava margem de -11.450% nessa linha).
--
-- Escopo bem específico de propósito (só bate nessa 1 peça): tipo
-- "Casaco", já entregue, com valor de venda exatamente R$1,00.
update pedidos_alfaiataria
set tipo_saida = 'Uso próprio',
    valor_venda = 0
where tipo_peca = 'Casaco'
  and status = 'Entregue'
  and valor_venda = 1;
