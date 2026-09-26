-- Status de tecido manual (3 etapas) por pedido/peça — substitui o
-- cálculo automático em cima dos itens de tecido, que ficava sem
-- sentido em pedidos importados do Excel sem nenhum item cadastrado.
-- Controlado manualmente pelo Tales/equipe: 'aguardando' (laranja),
-- 'parcial' (amarelo) ou 'completo' (linha em branco).
alter table pedidos
  add column if not exists status_tecido text not null default 'aguardando'
  check (status_tecido in ('aguardando', 'parcial', 'completo'));

alter table pedidos_alfaiataria
  add column if not exists status_tecido text not null default 'aguardando'
  check (status_tecido in ('aguardando', 'parcial', 'completo'));
