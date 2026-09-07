-- Sistema de Gestão de Pedidos de Alfaiataria — Ranking de Indicação
-- visível pro vendedor também (v67)
-- ADITIVO. Seguro rodar de novo ("create or replace view").
--
-- O Ranking de Indicação precisa somar peças de TODOS os pedidos/peças
-- de cada cliente indicado — mas o login do vendedor só enxerga, por
-- RLS, os pedidos que ELE MESMO criou (schema_v9: "vendedor_ve_seus_pedidos").
-- Se a tela calculasse a soma a partir dos pedidos que o navegador do
-- vendedor consegue ler, o número ficaria ERRADO (menor que o real) toda
-- vez que um cliente indicado tiver comprado por outro caminho (o dono
-- atendendo, outro vendedor etc) — e como isso decide prêmio de verdade
-- (voucher, camisa de cortesia), o número tem que estar sempre certo,
-- pra qualquer login que abrir a tela.
--
-- Esta view resolve isso: ela só expõe o TOTAL de peças por cliente (um
-- número agregado, nenhum dado de pedido individual — sem cliente,
-- valor, data, quem criou etc.), e como é uma view comum (sem
-- "security_invoker"), ela roda com o dono da view (quem rodou essa
-- migração), que enxerga TODOS os pedidos — não com as permissões
-- restritas de quem está consultando. Ou seja: todo mundo autenticado
-- (dono ou vendedor) vê o MESMO total certo, sem o vendedor ganhar
-- acesso a nenhum pedido/peça individual de outra pessoa.
create or replace view pecas_fechadas_por_cliente as
select cliente_id, sum(pecas)::int as pecas
from (
  select cliente_id, coalesce(quantidade, 0)::int as pecas
  from pedidos
  where status <> 'Doação' and cliente_id is not null
  union all
  select cliente_id, 1 as pecas
  from pedidos_alfaiataria
  where status <> 'Doação' and cliente_id is not null
) t
group by cliente_id;

grant select on pecas_fechadas_por_cliente to authenticated;
