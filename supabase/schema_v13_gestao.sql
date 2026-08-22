-- Base pras novas ferramentas de gestão: margem, tempo médio de produção,
-- comissão do vendedor e alerta de cliente sumido.

-- Data em que o pedido/peça virou "Entregue" — o app grava sozinho quando
-- você muda o status, não precisa preencher na mão. Usada pra calcular o
-- tempo médio de produção (só conta pra frente, pedidos já entregues antes
-- dessa coluna existir não têm essa data e ficam de fora da média).
alter table pedidos add column if not exists data_entrega date;
alter table pedidos_alfaiataria add column if not exists data_entrega date;

-- Config geral (mesma tabela chave/valor já usada pros telefones da Fabi/Icaro):
-- % de comissão do vendedor sobre o valor vendido, e quantos meses sem
-- comprar pra um cliente ser marcado como "sumido".
insert into config (chave, valor) values ('comissao_vendedor_pct', '10')
  on conflict (chave) do nothing;
insert into config (chave, valor) values ('cliente_sumido_meses', '6')
  on conflict (chave) do nothing;
