-- Ícaro (papel "producao") consegue ler a tabela equipe_producao
-- inteira via RLS (schema_v32: "producao_ve_equipe", sem restrição de
-- coluna) — inclusive tipo_remuneracao e valor_remuneracao (schema_v39),
-- ou seja, quanto cada colega da equipe ganha. Isso nunca foi escondido
-- de verdade, só não aparecia na tela (a resposta bruta da API já trazia
-- tudo). RLS do Postgres não esconde coluna, só linha — a correção real
-- é uma view sem essas duas colunas, que é o que a tela de produção
-- passa a consultar no lugar da tabela. A tela do dono (Equipe.jsx)
-- continua lendo a tabela cheia direto, sem mudança.
-- ADITIVO. Seguro rodar de novo ("create or replace view").
create or replace view equipe_producao_publica as
select id, nome, ativo, trabalhando_hoje, tipos_peca, horas_por_dia, dias_por_semana
from equipe_producao;

grant select on equipe_producao_publica to authenticated;
