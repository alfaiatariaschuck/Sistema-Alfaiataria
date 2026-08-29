-- Troca o pipeline de etapas da alfaiataria pro novo: Molde, Corte,
-- Prova na Tela, Ajuste 1, Prova na Caixa, Ajuste 2, Prova Final,
-- Finalização, Entregue.
--
-- A trava antiga da coluna "status" pode ter ficado com um nome
-- diferente do esperado (de uma migração anterior), então em vez de
-- confiar num nome fixo, esse script acha e remove QUALQUER trava de
-- validação que exista na coluna "status" antes de criar a nova —
-- assim não sobra nenhuma regra antiga escondida barrando as etapas
-- novas.
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'pedidos_alfaiataria'::regclass
      and c.contype = 'c'
      and a.attname = 'status'
  loop
    execute format('alter table pedidos_alfaiataria drop constraint %I', con.conname);
  end loop;
end $$;

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
