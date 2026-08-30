-- Remuneração de cada membro da equipe — mensal (salário fixo, ex:
-- Ícaro/Zonzo) ou diária (freelancer, ex: Felipe R$150/dia, 3x/semana)
-- — usada pra estimar o custo mensal do ateliê e comparar com a
-- receita (ver página "Custos do Ateliê").
alter table equipe_producao add column if not exists tipo_remuneracao text check (tipo_remuneracao in ('mensal', 'diaria'));
alter table equipe_producao add column if not exists valor_remuneracao numeric;
