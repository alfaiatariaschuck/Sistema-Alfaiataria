-- Plano de Assinatura ainda não tinha "data para cobrar" nem "data de
-- recebimento" — pedido do Tales (24/11/2026): o cliente paga o plano
-- inteiro de uma vez (ex.: dia 30), mas a entrega é diluída 1 camisa/mês.
-- Sem essas duas colunas, o valor do plano nunca aparecia em Contas a
-- Receber (que só lia pedidos/peças) nem ficava com rastro de quando foi
-- efetivamente pago — mesmo padrão já usado em pedidos/pedidos_alfaiataria.
alter table planos_assinatura add column if not exists data_cobranca date;
alter table planos_assinatura add column if not exists data_recebimento date;
