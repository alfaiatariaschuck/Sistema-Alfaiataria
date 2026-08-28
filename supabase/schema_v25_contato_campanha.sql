-- Marca "já mandei mensagem" por cliente, pra campanha de reativação em
-- Clientes.jsx — evita mandar mensagem duas vezes (ou o dono e o Deivid
-- mandarem pro mesmo cliente sem saber). Fica na própria tabela clientes
-- (não é dado sensível, é só um controle operacional), então já usa a
-- policy "authenticated_full_access" que a tabela já tem — não precisa
-- de policy nova.
alter table clientes add column if not exists campanha_contatado_em timestamptz;
