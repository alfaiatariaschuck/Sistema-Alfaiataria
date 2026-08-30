-- Amplia o cadastro de equipe pra registrar especialidade (quais tipos
-- de peça cada pessoa produz), carga horária e dias trabalhados por
-- semana — usado pra separar a fila de produção por especialista (ex:
-- calça só conta a capacidade de quem faz calça, não a equipe toda).
alter table equipe_producao add column if not exists tipos_peca text[] not null default '{}';
alter table equipe_producao add column if not exists horas_por_dia numeric(4,1) not null default 8;
alter table equipe_producao add column if not exists dias_por_semana integer not null default 5;

comment on column equipe_producao.tipos_peca is 'Tipos de peça que a pessoa produz (vazio = qualquer tipo)';

-- Ícaro também passa a poder LER a equipe (só leitura, sem editar) —
-- assim a tela dele também consegue mostrar previsões cientes de quem
-- faz o quê e quando.
drop policy if exists "producao_ve_equipe" on equipe_producao;
create policy "producao_ve_equipe" on equipe_producao
  for select to authenticated using (is_producao());
