-- Atualiza as peças que já estão com status antigo para as novas etapas
-- (Molde, Corte, Prova na Tela, Ajuste 1, Prova na Caixa, Ajuste 2,
-- Prova Final, Finalização, Entregue). Rode uma vez, depois do deploy.

update pedidos_alfaiataria set status = 'Prova na Tela' where status = '1ª Prova';
update pedidos_alfaiataria set status = 'Ajuste 1' where status = 'Ajustes';
update pedidos_alfaiataria set status = 'Prova na Caixa' where status = '2ª Prova';
update pedidos_alfaiataria set status = 'Finalização' where status in ('Acabamento', 'Pronto');
