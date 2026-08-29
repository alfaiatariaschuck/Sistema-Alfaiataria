-- Controle de Produção (Alfaiataria) — v28
-- ADITIVO. Réplica (fase 1: fila + dashboard, sem simulação de fila por
-- capacidade ainda) da planilha "Controle de Produção" dentro do
-- sistema. Três campos novos em pedidos_alfaiataria:
--
-- responsavel  — quem está produzindo (Ícaro, Gabriel, outro freelancer
--                futuro) — texto livre, sem lista fixa, pra não precisar
--                de migração toda vez que entrar alguém novo.
-- prioridade   — Alta / Normal, igual à planilha.
-- situacao     — Aguardando / Em Produção / Pausado — um estado manual,
--                separado da etapa (status). "Atrasado" e "Entregue" não
--                entram aqui porque já são calculados automaticamente
--                (previsão vencida / status = Entregue), não precisam de
--                um campo pra marcar.

alter table pedidos_alfaiataria add column if not exists responsavel text;

alter table pedidos_alfaiataria add column if not exists prioridade text not null default 'Normal';
alter table pedidos_alfaiataria drop constraint if exists pedidos_alfaiataria_prioridade_check;
alter table pedidos_alfaiataria add constraint pedidos_alfaiataria_prioridade_check check (prioridade in ('Alta', 'Normal'));

alter table pedidos_alfaiataria add column if not exists situacao text not null default 'Aguardando';
alter table pedidos_alfaiataria drop constraint if exists pedidos_alfaiataria_situacao_check;
alter table pedidos_alfaiataria add constraint pedidos_alfaiataria_situacao_check check (situacao in ('Aguardando', 'Em Produção', 'Pausado'));

-- Nenhuma política de RLS nova precisa — 'producao' já pode
-- select/update pedidos_alfaiataria (schema_v27); o dono já tem acesso
-- total. A tela do Ícaro só não vai OFERECER edição de responsável e
-- prioridade (isso fica a seu critério), mas como RLS é por linha (não
-- por coluna) — mesmo modelo já usado pro vendedor — vale documentar
-- que ele teoricamente poderia mudar via API direta, só não pela tela.
