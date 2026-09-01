-- Marca a qual linha (Camisaria / Alfaiataria) uma despesa pertence, pra
-- dar pra destinar compras avulsas (ex: pedido de tecido direto com um
-- fornecedor, fora do fluxo por pedido) ao custo da operação certa.
-- Deixa em branco = compartilhado entre as duas linhas.
alter table despesas add column if not exists linha text;
