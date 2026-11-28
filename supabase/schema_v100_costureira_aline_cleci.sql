-- BUG: pedidos.costureira ainda tinha o check constraint antigo
-- (schema_v78), de quando só existiam Fabiana/Milena. Quando a Milena
-- saiu e entraram Cleci e Aline (commit "Troca Milena por Cleci e
-- Aline", 31/10/2026), o front-end foi atualizado mas esse constraint
-- do banco não — resultado: trocar a costureira de um pedido pra
-- Aline ou Cleci era SEMPRE rejeitado pelo Postgres (sem aviso visível
-- na tela), a tela mostrava a troca até a próxima recarga, e aí voltava
-- pro valor antigo porque a gravação nunca tinha acontecido de verdade.
-- Mantém 'Milena' na lista só pra não travar a edição de pedidos antigos
-- que ainda tenham esse valor gravado.
--
-- Acha e remove o(s) check constraint(s) existentes na coluna
-- (independente do nome real que o Postgres deu) antes de criar o novo,
-- certo — assim não depende de adivinhar o nome exato.
do $$
declare
  nome_constraint text;
begin
  for nome_constraint in
    select conname from pg_constraint
    where conrelid = 'pedidos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%costureira%'
  loop
    execute format('alter table pedidos drop constraint %I', nome_constraint);
  end loop;
end $$;

alter table pedidos add constraint pedidos_costureira_check
  check (costureira in ('Fabiana', 'Aline', 'Cleci', 'Milena'));
