-- Fornecedores (cadastro próprio, substitui a lista fixa em constants.js)
-- e Aviamentos (custo por peça-base — Paletó, Calça, Colete, Casaco,
-- Bomber, Camisa — pra alimentar o custo de produção real de cada peça,
-- igual já existe pro tecido em Compras).
create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  contato text,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists aviamentos (
  id uuid primary key default gen_random_uuid(),
  peca_base text not null,
  item text not null,
  unidade text,
  qtd_por_peca numeric not null default 1,
  valor_unitario numeric not null default 0,
  fornecedor text,
  observacoes text,
  ordem integer not null default 0
);

create index if not exists aviamentos_peca_base_idx on aviamentos (peca_base);

alter table fornecedores enable row level security;
alter table aviamentos enable row level security;

create policy "fornecedores_dono" on fornecedores for all using (is_dono()) with check (is_dono());
create policy "aviamentos_dono" on aviamentos for all using (is_dono()) with check (is_dono());

-- Fornecedores conhecidos (da lista fixa antiga + os que aparecem nos
-- aviamentos que você já tinha fechado).
insert into fornecedores (nome) values
  ('Imperiale'), ('Wtext'), ('LS Tecidos'), ('Markbel'), ('Erlu'), ('Dab Dab'), ('Cataguases'),
  ('Kufner'), ('Centro Poa'), ('China'), ('Andrea Botoes'), ('Incomasa'), ('Wendler Entretelas')
on conflict (nome) do nothing;

-- Aviamentos por peça-base — valores que você já tinha fechado na
-- planilha (Aviamentos por peça-base). Tecido NÃO entra aqui (já é
-- tratado à parte, na aba Compras).
insert into aviamentos (peca_base, item, unidade, qtd_por_peca, valor_unitario, fornecedor, observacoes, ordem) values
  ('Paletó', 'Entretela de Lã (Reforço Peito)', 'par', 1, 34.00, 'LS Tecidos', null, 1),
  ('Paletó', 'Entretela Colante', 'm', 1, 6.75, 'Kufner', null, 2),
  ('Paletó', 'Botões', 'un', 11, 2.50, 'Dab Dab', null, 3),
  ('Paletó', 'Ombreiras', 'par', 1, 12.00, 'Dab Dab', null, 4),
  ('Paletó', 'Tapa Miséria', 'un', 1, 17.00, 'LS Tecidos', null, 5),
  ('Paletó', 'Forro Cetim, jacquard ou acetato', 'm', 1.8, 35.00, 'Dab Dab', 'Poliéster', 6),
  ('Paletó', 'Entretela Feltro', 'm', 1, 28.00, 'LS Tecidos', null, 7),
  ('Paletó', 'Entretela Manta', 'm', 1, 26.00, 'LS Tecidos', null, 8),
  ('Calça', 'Forro Alpaca', 'm', 1, 30.00, 'Centro Poa', null, 1),
  ('Calça', 'Zíper', 'un', 1, 2.00, 'Dab Dab', null, 2),
  ('Calça', 'Borracha de Cinto (Cós)', 'm', 1, 12.00, 'LS Tecidos', null, 3),
  ('Calça', 'Presilha gancho', 'un', 1, 0.75, 'LS Tecidos', 'vendido à dúzia', 4),
  ('Calça', 'Fivela Lateral', 'par', 1, 1.36, 'China', null, 5),
  ('Calça', 'Botões', 'un', 3, 2.50, 'Dab Dab', null, 6),
  ('Colete', 'Forro Cetim, jacquard ou acetato', 'm', 0.7, 35.00, 'Dab Dab', null, 1),
  ('Colete', 'Entretela Colante', 'm', 1, 6.75, 'Kufner', null, 2),
  ('Colete', 'Botões', 'un', 5, 2.50, 'Dab Dab', null, 3),
  ('Casaco', 'Acetato ou Flanela (Forro)', 'm', 1, 41.90, 'Dab Dab', 'Acetato', 1),
  ('Casaco', 'Forro de Bolso', 'm', 0.5, 19.90, 'Centro Poa', null, 2),
  ('Casaco', 'Botões', 'un', 8, 3.50, 'Dab Dab', null, 3),
  ('Casaco', 'Zíper 70cm', 'un', 1, 16.90, 'Dab Dab', null, 4),
  ('Casaco', 'Entretela Colante', 'un', 1, 6.75, 'Kufner', null, 5),
  ('Casaco', 'Ombreiras', 'par', 1, 12.00, 'Dab Dab', null, 6),
  ('Bomber', 'Acetato ou Flanela (Forro)', 'm', 1, 41.90, 'Dab Dab', 'Acetato', 1),
  ('Bomber', 'Forro de Bolso', 'm', 0.5, 19.90, 'Centro Poa', null, 2),
  ('Bomber', 'Botões', 'un', 8, 2.50, 'Dab Dab', null, 3),
  ('Bomber', 'Ribana', 'un', 1, 75.00, 'Centro Poa', '44 ribana restante uber', 4),
  ('Bomber', 'Zíper 70cm', 'un', 1, 16.90, 'Dab Dab', null, 5),
  ('Bomber', 'Entretela Colante', 'un', 1, 6.75, 'Kufner', null, 6),
  ('Camisa', 'Botões', 'un', 1, 1.55, 'Andrea Botoes', null, 1),
  ('Camisa', 'Embalagens e outros', 'un', 1, 5.72, 'Incomasa', null, 2),
  ('Camisa', 'Entretelas', 'm', 1, 10.67, 'Wendler Entretelas', null, 3);
