-- Só leitura — mostra quais pedidos de alfaiataria têm um status que não
-- bate com nenhuma das opções conhecidas (ou está em branco/nulo).
select id, cliente_id, status, length(status) as tamanho_do_texto
from pedidos_alfaiataria
where status is null
   or status not in (
     'Aguardando Produção', 'Em Produção', 'Prova', 'Corte', '1ª Prova', 'Ajustes', '2ª Prova', 'Acabamento',
     'Pronto', 'Entregue Parcial', 'Entregue', 'Doação'
   );
