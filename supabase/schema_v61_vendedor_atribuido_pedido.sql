-- Reatribuição manual de vendedor num pedido — cobre o caso de o dono
-- lançar um pedido no próprio login (ajudando o vendedor), mas o crédito
-- da venda ser de outro vendedor. Enquanto vazio, a aba Vendedor
-- continua usando quem de fato criou a linha (criado_por); quando
-- preenchido, esse campo manda — só o dono consegue setar (feito pela
-- aba Vendedor, que só o dono acessa).
alter table pedidos add column if not exists vendedor_atribuido_id uuid references perfis(id);
