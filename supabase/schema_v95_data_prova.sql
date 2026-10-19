-- Data/hora da próxima prova agendada com o cliente (traje/costume/etc
-- em produção) — hoje só existia a ETAPA ("Prova na Tela", "Prova na
-- Caixa", "Prova Final" em STATUS_ALFAIATARIA), nunca um "quando". Um
-- campo só, não um por etapa: representa a PRÓXIMA prova agendada da
-- peça, seja qual for a etapa atual — ao marcar que ela aconteceu (ou
-- remarcar), o Ícaro/Tales atualiza pra próxima data, ou limpa se não
-- tiver mais prova agendada. Alimenta o Calendário de Provas.
-- ADITIVO. Seguro rodar de novo.
alter table pedidos_alfaiataria
  add column if not exists data_prova date,
  add column if not exists hora_prova text;
