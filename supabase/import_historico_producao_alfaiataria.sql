-- Importa o histórico real de peças entregues da planilha do Ícaro
-- (aba "HISTÓRICO DE PEDIDOS ENTREGUES") pra dentro do sistema, como
-- pedidos_alfaiataria já concluídos. Isso alimenta a média REAL por
-- tipo de peça (mediaDiasProducaoPorTipo, em helpers.js) assim que
-- aquele tipo acumular 3+ entregas — sem isso, a previsão ficava só
-- na estimativa por horas de referência, que é bem mais otimista do
-- que a produção real (a planilha mostra calça levando em média 21
-- dias corridos, não os 1-2 dias de trabalho de máquina).
--
-- data_inicio_producao foi calculada como (Entrega Real - Dias Totais),
-- usando o próprio número de "Dias Totais" já calculado na planilha.

insert into clientes (nome) values ('Daniel Sant') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Douglas Scheiner') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Felipe Franchi') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Felipe Trois') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Lucas Jacobs') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Marcio Pizzato') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Tales Schuck') on conflict (nome_normalizado) do nothing;
insert into clientes (nome) values ('Tiago Cury') on conflict (nome_normalizado) do nothing;

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Costume', '2026-03-01', '2026-04-15', '2026-05-20', '2026-05-20', 'Entregue', 'Ícaro', 'Alta', 'Costume 1 botão, lapela bico.'
from clientes where nome_normalizado = lower(trim('Tiago Cury'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Blazer', '2026-04-06', '2026-05-08', '2026-05-27', '2026-05-27', 'Entregue', 'Ícaro', 'Alta', 'Blazer lã, casea na lapela. Fazer levemente mais folgado.'
from clientes where nome_normalizado = lower(trim('Marcio Pizzato'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Calça', '2026-03-20', '2026-05-23', '2026-05-31', '2026-05-31', 'Entregue', 'Ícaro', 'Alta', 'Falar comigo sobre o modelo'
from clientes where nome_normalizado = lower(trim('Felipe Franchi'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Calça', '2026-03-04', '2026-06-09', '2026-06-12', '2026-06-12', 'Entregue', 'Ícaro', 'Alta', ''
from clientes where nome_normalizado = lower(trim('Lucas Jacobs'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Calça', '2026-03-04', '2026-06-09', '2026-06-12', '2026-06-12', 'Entregue', 'Ícaro', 'Alta', ''
from clientes where nome_normalizado = lower(trim('Lucas Jacobs'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Costume', '2026-04-15', '2026-06-07', '2026-06-15', '2026-06-15', 'Entregue', 'Ícaro', 'Alta', 'Falar comigo sobre o modelo'
from clientes where nome_normalizado = lower(trim('Felipe Trois'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Traje', '2026-03-20', '2026-05-08', '2026-06-18', '2026-06-18', 'Entregue', 'Ícaro', 'Alta', 'Paletó, calça e colete.'
from clientes where nome_normalizado = lower(trim('Tales Schuck'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Casaco', '2026-05-26', '2026-06-30', '2026-07-13', '2026-07-13', 'Entregue', 'Ícaro', 'Normal', 'OK'
from clientes where nome_normalizado = lower(trim('Tales Schuck'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Calça', '2026-06-16', '2026-06-12', '2026-07-20', '2026-07-20', 'Entregue', 'Gabriel', 'Alta', 'Falar comigo sobre o modelo'
from clientes where nome_normalizado = lower(trim('Felipe Trois'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Calça', '2026-06-16', '2026-06-12', '2026-07-20', '2026-07-20', 'Entregue', 'Gabriel', 'Alta', 'Falar comigo sobre o modelo (deixar calças iguais ao terno)'
from clientes where nome_normalizado = lower(trim('Felipe Trois'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Calça', '2026-06-16', '2026-06-12', '2026-07-20', '2026-07-20', 'Entregue', 'Gabriel', 'Alta', 'Uma das calças fazer com fivela'
from clientes where nome_normalizado = lower(trim('Felipe Trois'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Costume', '2026-03-01', '2026-05-20', '2026-07-26', '2026-07-26', 'Entregue', 'Ícaro', 'Alta', 'Costume 1 botão, lapela bico. Comprar tecido para a manga'
from clientes where nome_normalizado = lower(trim('Douglas Scheiner'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Costume', '2026-06-27', '2026-07-31', '2026-08-13', '2026-08-13', 'Entregue', 'Ícaro', 'Alta', 'Lapela de Bico, 1 botão'
from clientes where nome_normalizado = lower(trim('Daniel Sant'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Bomber', '2026-06-15', '2026-07-22', '2026-08-19', '2026-08-19', 'Entregue', 'Zonzo', 'Alta', 'Falar comigo sobre o modelo'
from clientes where nome_normalizado = lower(trim('Lucas Jacobs'));

insert into pedidos_alfaiataria (cliente_id, tipo_peca, data_pedido, data_inicio_producao, data_entrega, previsao_entrega, status, responsavel, prioridade, observacoes)
select id, 'Traje', '2026-06-16', '2026-07-31', '2026-08-24', '2026-08-24', 'Entregue', 'Ícaro', 'Alta', 'Lapela de bico + colete'
from clientes where nome_normalizado = lower(trim('Felipe Trois'));
