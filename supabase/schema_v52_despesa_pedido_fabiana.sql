-- Liga uma despesa ao pedido de camisa que a originou — usado pra criar
-- automaticamente a conta a pagar da Fabiana quando o pedido entra em
-- produção, sem duplicar se o status mudar de novo. on delete set null
-- (nunca apaga a despesa junto se o pedido for removido).
alter table despesas add column if not exists pedido_id uuid references pedidos(id) on delete set null;
create index if not exists despesas_pedido_id_idx on despesas (pedido_id);
