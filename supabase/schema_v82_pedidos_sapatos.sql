-- Parceria de sapatos com fornecedor externo (v82)
-- ADITIVO: não apaga nem recria nada existente.
--
-- O Tales vai vender sapatos de uma marca parceira: comissão cheia pra
-- ele nos que ele mesmo vender, dividida com o Deivid nos que o Deivid
-- vender. O valor de venda e o percentual da comissão ainda estão em
-- negociação com o fornecedor, então valor_venda fica opcional (pode
-- ficar em branco e ser preenchido depois) — o que já dá pra travar
-- agora é o campo "vendedor" (Tales/Deivid), pra quando o percentual
-- fechar dar pra calcular a divisão em cima do que já estiver salvo.
--
-- Duas tabelas novas, só pro dono (mesmo padrão de RLS de
-- agendamentos_comerciais/v77 — só que aqui nem o vendedor tem tela
-- própria ainda, então só existe a política do dono):
-- 1) pedidos_sapatos — cada pedido de sapato.
-- 2) modelos_sapatos — catálogo (modelo, material, cor, numeração,
--    local do estoque), editável direto no Painel Sapatos, seedado
--    aqui com as 11 combinações que já existem hoje.

create table if not exists pedidos_sapatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  cliente text not null,
  modelo text not null,
  material text not null,
  cor text not null,
  numeracao text not null,
  personalizacao text,
  quantidade int not null default 1,
  vendedor text not null default 'Tales' check (vendedor in ('Tales', 'Deivid')),
  data_pedido date not null default current_date,
  status text not null default 'Pedido registrado'
    check (status in ('Pedido registrado', 'Enviado ao fornecedor', 'A caminho', 'Chegou (retirar)', 'Entregue')),
  previsao_entrega date,
  data_entrega date,
  valor_venda numeric,
  observacoes text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_pedidos_sapatos_status on pedidos_sapatos (status);

alter table pedidos_sapatos enable row level security;

drop policy if exists "dono_acesso_total_pedidos_sapatos" on pedidos_sapatos;
create policy "dono_acesso_total_pedidos_sapatos" on pedidos_sapatos
  for all to authenticated using (is_dono()) with check (is_dono());

create table if not exists modelos_sapatos (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  material text not null,
  cor text not null,
  numeracao text not null,
  local text,
  criado_em timestamptz not null default now()
);

alter table modelos_sapatos enable row level security;

drop policy if exists "dono_acesso_total_modelos_sapatos" on modelos_sapatos;
create policy "dono_acesso_total_modelos_sapatos" on modelos_sapatos
  for all to authenticated using (is_dono()) with check (is_dono());

-- Só semeia na primeira vez que essa migration roda (se já tiver
-- catálogo — porque você editou direto no Painel Sapatos — não duplica).
insert into modelos_sapatos (modelo, material, cor, numeracao, local)
select * from (values
  ('Oxford', 'Box', 'Preto', '42', 'Showroom Schuck'),
  ('Oxford', 'Box', 'Preto', '39', 'Schuck'),
  ('Wholecut', 'Mestiço', 'Pinhão', '42', 'Showroom Schuck'),
  ('Wholecut', 'Mestiço', 'Preto', '42', 'Showroom Schuck'),
  ('Wholecut', 'Mestiço', 'Pinhão', '39', 'Schuck'),
  ('Wholecut', 'Mestiço', 'Preto', '39', 'Schuck'),
  ('Penny loafer', 'Camurça', 'Marrom', '42', 'Showroom Schuck'),
  ('Oxford brogue sola grossa', 'Mestiço', 'Preto', '42', 'Showroom Schuck'),
  ('Loafer tassel', 'Mestiço', 'Café', '42', 'Showroom Schuck'),
  ('Loafer verano', 'Camurça', 'Off white', '39', 'Schuck'),
  ('Loafer verano', 'Camurça', 'Off white', '42', 'Showroom Schuck')
) as seed(modelo, material, cor, numeracao, local)
where not exists (select 1 from modelos_sapatos);
