-- Sistema de Gestão de Pedidos de Alfaiataria — Funil simplificado (v65)
-- ADITIVO. SEGURO RODAR QUANTAS VEZES PRECISAR — só usa
-- "add column if not exists" / "drop column if exists", que nunca dão
-- erro independente do estado atual da tabela.
--
-- O funil de vendas passa a ser só: Contatos, Agendamentos (registrados
-- à mão) e Fechamentos + taxa de conversão (calculados automaticamente
-- dos pedidos reais). "Atendimentos" e "Indicações recebidas" saem da
-- tela e das colunas. A coluna antiga "conversas" (poucos ou nenhum
-- registro real, o recurso acabou de sair do ar) é substituída direto
-- por "agendamentos", sem tentar renomear.

alter table atividades_comerciais add column if not exists agendamentos integer not null default 0;
alter table atividades_comerciais drop column if exists conversas;
alter table atividades_comerciais drop column if exists atendimentos;
alter table atividades_comerciais drop column if exists indicacoes_recebidas;
