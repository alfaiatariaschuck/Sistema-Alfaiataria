-- Tipo de saída da peça de Alfaiataria, separado da etapa de produção (v75)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Antes, "Doação" era um valor de status — o que misturava duas coisas
-- diferentes: em que etapa de produção a peça está (Molde, Corte, Provas,
-- Finalização...) e se alguém pagou por ela ou não. Uma peça em permuta,
-- doação ou uso próprio passa pelas MESMAS etapas de produção que uma
-- venda normal; só o desfecho financeiro é diferente. Esse campo novo
-- guarda esse desfecho separado, sem interferir no status.
--
-- Peças que já estavam com status = 'Doação' são migradas: tipo_saida
-- vira 'Doação' e o status volta pra 'Entregue' (assume-se que uma peça
-- marcada como doação já estava finalizada/entregue — ajuste manualmente
-- se algum caso específico não for esse).

alter table pedidos_alfaiataria add column if not exists tipo_saida text not null default 'Venda'
  check (tipo_saida in ('Venda', 'Doação', 'Permuta', 'Uso próprio'));

update pedidos_alfaiataria set tipo_saida = 'Doação', status = 'Entregue' where status = 'Doação';
