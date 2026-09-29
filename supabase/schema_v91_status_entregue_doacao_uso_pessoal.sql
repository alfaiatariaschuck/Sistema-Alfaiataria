-- A constraint pedidos_status_check nunca foi atualizada quando os
-- status "Entregue Doação" e "Entregue Uso Pessoal" foram criados no
-- app — o banco continuava só aceitando a lista antiga e recusava a
-- gravação ("new row for relation pedidos violates check constraint
-- pedidos_status_check"). Por isso o pedido do Deivid nunca saía da
-- fila: a tela deixava escolher o status novo, mas o Supabase rejeitava
-- o update e o valor antigo continuava salvo.
alter table pedidos drop constraint if exists pedidos_status_check;
alter table pedidos add constraint pedidos_status_check
  check (status in ('Aguardando Produção', 'Em Produção', 'Prova', 'Pronto', 'Entregue Parcial', 'Entregue', 'Entregue Doação', 'Entregue Uso Pessoal', 'Doação'));
