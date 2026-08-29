-- Troca o pipeline de etapas da alfaiataria pro novo: Molde, Corte,
-- Prova na Tela, Ajuste 1, Prova na Caixa, Ajuste 2, Prova Final,
-- Finalização, Entregue.
alter table pedidos_alfaiataria drop constraint if exists pedidos_alfaiataria_status_check;
alter table pedidos_alfaiataria add constraint pedidos_alfaiataria_status_check
  check (status in (
    'Aguardando Produção', 'Em Produção', 'Prova', 'Corte', '1ª Prova', 'Ajustes', '2ª Prova', 'Acabamento', 'Pronto',
    'Molde', 'Prova na Tela', 'Ajuste 1', 'Prova na Caixa', 'Ajuste 2', 'Prova Final', 'Finalização',
    'Entregue Parcial', 'Entregue', 'Doação'
  ));

update pedidos_alfaiataria set status = 'Prova na Tela' where status = '1ª Prova';
update pedidos_alfaiataria set status = 'Ajuste 1' where status = 'Ajustes';
update pedidos_alfaiataria set status = 'Prova na Caixa' where status = '2ª Prova';
update pedidos_alfaiataria set status = 'Finalização' where status in ('Acabamento', 'Pronto');

select 'deu certo, pode fechar essa aba' as resultado;
