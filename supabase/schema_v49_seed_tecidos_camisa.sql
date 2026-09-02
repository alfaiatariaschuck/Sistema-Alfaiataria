-- Semente inicial dos tecidos de camisa que você já tinha na Planilha
-- Consolidada (aba Camisaria) — nomenclatura + valor de referência por
-- metro de quem tem preço de tabela fixo. Fica tudo editável depois em
-- Tecidos de Camisa: pode ajustar valor, adicionar código, ativar/
-- desativar ou apagar. Cavalli fica sem valor de referência de propósito
-- (você avisou que varia muito de rolo pra rolo).
insert into modelos_camisa (nome, valor_referencia_metro) values
  ('Tecido Nacional Fio 80 CATA.', 31.00),
  ('Italiana Frotta e Zanone Fio 120', 89.90),
  ('Italiana Frotta e Zanone Fio 140', 140.00),
  ('Italiana Cavalli 120', null),
  ('Italiana Cavalli 160', null),
  ('Linho Belga', 179.00),
  ('Linho Italiano', 89.90)
on conflict (nome) do nothing;
