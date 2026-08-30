-- Data limite de um evento do cliente (casamento, formatura etc.) —
-- diferente da previsão de entrega: é um compromisso rígido do cliente,
-- não uma estimativa de produção. Usada só pra alertar (selo + linha
-- amarela/vermelha em Controle de Produção), não entra em nenhum
-- cálculo de previsão.
alter table pedidos_alfaiataria add column if not exists data_limite_evento date;
