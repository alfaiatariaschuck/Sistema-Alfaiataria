-- Cadastro da equipe de produção (Ícaro, freelancers etc.) — substitui a
-- lista fixa que estava só no código. "ativo" é permanente (faz parte do
-- time); "trabalhando_hoje" é um flag do dia a dia que o dono marca/
-- desmarca conforme quem apareceu pra trabalhar, e é isso que entra na
-- conta da previsão de entrega (quantas peças dá pra produzir em
-- paralelo) e no card "Freelancers hoje" do dashboard.
create table if not exists equipe_producao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  trabalhando_hoje boolean not null default true,
  created_at timestamptz not null default now()
);

alter table equipe_producao enable row level security;

drop policy if exists "dono_gerencia_equipe" on equipe_producao;
create policy "dono_gerencia_equipe" on equipe_producao
  for all to authenticated using (is_dono()) with check (is_dono());

insert into equipe_producao (nome) values ('Ícaro'), ('Felipe'), ('Zonzo'), ('Gabriel')
on conflict (nome) do nothing;
