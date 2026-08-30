-- Peça composta (ex: Traje = paletó + calça + colete) pode ter uma
-- pessoa diferente em cada parte — sem criar sub-linhas com etapa/status
-- próprios, só um responsável por seção. O campo "responsavel" já
-- existente continua valendo como responsável geral/simples pra peças
-- de uma seção só (Calça, Colete, Blazer avulso etc).
alter table pedidos_alfaiataria add column if not exists responsaveis_secoes jsonb not null default '{}';
