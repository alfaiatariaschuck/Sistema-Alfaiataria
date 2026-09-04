-- Pontos de melhoria na produção — cada linha é um gargalo real,
-- identificado comparando a Referência de Mercado (horas esperadas por
-- etapa) com o que o Ícaro de fato gastou, na planilha de Controle de
-- Produção dele. Aparecem no Painel (visível tanto pro Tales quanto pro
-- Ícaro, já que é o mesmo componente PainelProducaoResumo nos dois
-- logins) com um botão pra marcar quando o ponto foi resolvido — meta
-- final é voltar das ~32h atuais por Costume/Traje pras 23,5h de
-- referência.
create table if not exists pontos_melhoria_producao (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  horas_referencia numeric,
  horas_real_anterior numeric,
  bateu_meta boolean not null default false,
  data_bateu date,
  nota_icaro text,
  criado_em timestamptz not null default now()
);

alter table pontos_melhoria_producao enable row level security;

drop policy if exists "dono_producao_acesso_pontos_melhoria" on pontos_melhoria_producao;
create policy "dono_producao_acesso_pontos_melhoria" on pontos_melhoria_producao
  for all to authenticated using (is_dono() or is_producao()) with check (is_dono() or is_producao());

insert into pontos_melhoria_producao (titulo, descricao, horas_referencia, horas_real_anterior)
select
  'Construção da Calça',
  'Maior gap identificado: montagem das pernas e ilhargas sozinha já consumiu 4h (referência era 0,75h). Vale olhar se dá pra simplificar o processo de montagem nessa etapa.',
  2.75,
  8.75
where not exists (
  select 1 from pontos_melhoria_producao where titulo = 'Construção da Calça'
);

insert into pontos_melhoria_producao (titulo, descricao, horas_referencia, horas_real_anterior)
select
  'Forro e Acabamentos do Paletó',
  'Maior gap individual: etiqueta da marca e acabamentos finais consumiram 2,5h sozinhos (referência era 0,25h). Vale padronizar esse passo final.',
  4.25,
  9.50
where not exists (
  select 1 from pontos_melhoria_producao where titulo = 'Forro e Acabamentos do Paletó'
);
