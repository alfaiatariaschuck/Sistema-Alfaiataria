-- Sistema de Gestão de Pedidos de Alfaiataria — Funil simplificado (v65)
-- ADITIVO (sem apagar dado já lançado nas colunas que sobrevivem).
-- SEGURO RODAR DE NOVO (idempotente) — se já rodou antes, não dá erro.
--
-- O funil de vendas passa a ser só: Contatos, Agendamentos (registrados
-- à mão) e Fechamentos + taxa de conversão (calculados automaticamente
-- dos pedidos reais). "Conversas reais" vira "Agendamentos" (mesma
-- coluna, só renomeada — sem perder o que já foi digitado). "Atendimentos"
-- e "Indicações recebidas" saem da tela e das colunas.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'atividades_comerciais' and column_name = 'conversas'
  ) then
    alter table atividades_comerciais rename column conversas to agendamentos;
  end if;
end $$;

alter table atividades_comerciais add column if not exists agendamentos integer not null default 0;
alter table atividades_comerciais drop column if exists atendimentos;
alter table atividades_comerciais drop column if exists indicacoes_recebidas;
