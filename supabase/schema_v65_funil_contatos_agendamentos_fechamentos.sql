-- Sistema de Gestão de Pedidos de Alfaiataria — Funil simplificado (v65)
-- ADITIVO (sem apagar dado já lançado nas colunas que sobrevivem).
--
-- O funil de vendas passa a ser só: Contatos, Agendamentos (registrados
-- à mão) e Fechamentos + taxa de conversão (calculados automaticamente
-- dos pedidos reais). "Conversas reais" vira "Agendamentos" (mesma
-- coluna, só renomeada — sem perder o que já foi digitado). "Atendimentos"
-- e "Indicações recebidas" saem da tela e das colunas.

alter table atividades_comerciais rename column conversas to agendamentos;
alter table atividades_comerciais drop column if exists atendimentos;
alter table atividades_comerciais drop column if exists indicacoes_recebidas;
