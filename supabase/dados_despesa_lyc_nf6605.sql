-- Carga de dados (não é migração de schema): lança as 4 parcelas da
-- compra de tecido na NF-e 000.006.605 (LYC do Brasil, 11/09/2026) em
-- Contas a Pagar. Total R$ 22.792,80, financiado em 4x de R$ 5.698,20 —
-- vencimentos conforme "Dados Adicionais" da nota (Parc.AI01 a AI04).
-- Linha "Camisaria" porque são todos tafetás usados em camisa; sem
-- pedido vinculado (é reposição de estoque, não fechado com um cliente
-- específico) e sem frete (a nota veio com frete R$ 0,00 — a
-- transportadora deve cobrar isso à parte quando a fatura dela chegar).

insert into despesas (descricao, categoria, fornecedor, valor, vencimento, recorrente, status, linha)
values
  ('Tecidos China NF 6605 (LYC do Brasil) — parcela 1/4', 'Material/Tecido avulso', 'LYC do Brasil', 5698.20, '2026-10-11', false, 'Pendente', 'Camisaria'),
  ('Tecidos China NF 6605 (LYC do Brasil) — parcela 2/4', 'Material/Tecido avulso', 'LYC do Brasil', 5698.20, '2026-11-10', false, 'Pendente', 'Camisaria'),
  ('Tecidos China NF 6605 (LYC do Brasil) — parcela 3/4', 'Material/Tecido avulso', 'LYC do Brasil', 5698.20, '2026-12-10', false, 'Pendente', 'Camisaria'),
  ('Tecidos China NF 6605 (LYC do Brasil) — parcela 4/4', 'Material/Tecido avulso', 'LYC do Brasil', 5698.20, '2027-01-09', false, 'Pendente', 'Camisaria');
