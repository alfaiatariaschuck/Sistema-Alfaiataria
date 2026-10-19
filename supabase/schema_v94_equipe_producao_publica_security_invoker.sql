-- Resolve o alerta "Security Definer View" do Advisor (Supabase) pra
-- equipe_producao_publica (schema_v86), sem mudar nada no que o Ícaro
-- vê. security_invoker = true faz a view rodar com a permissão de quem
-- consulta, em vez de com a permissão ampliada de quem criou a view —
-- mas isso é seguro aqui porque a política de RLS "producao_ve_equipe"
-- já deixa o papel "producao" ler a tabela equipe_producao inteira,
-- linha por linha, mesmo sem essa view. A view nunca existiu pra
-- restringir LINHA — só pra esconder as colunas de remuneração (RLS não
-- esconde coluna), e isso continua idêntico nos dois modos.
-- ADITIVO. Seguro rodar de novo ("create or replace view").
create or replace view equipe_producao_publica
with (security_invoker = true) as
select id, nome, ativo, trabalhando_hoje, tipos_peca, horas_por_dia, dias_por_semana
from equipe_producao;

grant select on equipe_producao_publica to authenticated;
