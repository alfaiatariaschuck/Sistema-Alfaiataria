-- Carga de dados (não é migração de schema): cadastro dos 7 tecidos
-- recebidos na NF-e 000.006.605 (LYC do Brasil, emitida 11/09/2026).
--
-- Faz de uma vez só o que o app faria em duas etapas (Cadastrar tecido no
-- estoque + Registrar compra): cria o código já com o saldo recebido,
-- grava a movimentação de entrada e o primeiro ponto no histórico de
-- preço por metro. Seguro rodar duas vezes por engano — se os códigos já
-- existirem, a segunda vez não insere nada de novo (o SELECT final mostra
-- 0/0/0 nesse caso).
--
-- Confira o resultado no final: deve mostrar tecidos_cadastrados = 7,
-- movimentos_criados = 7, precos_criados = 7.

with novos as (
  insert into estoque_tecidos (codigo, fornecedor, metros_por_rolo, saldo_metros, valor_metro)
  values
    ('02LBU', 'LYC do Brasil', 27.10, 27.10, 42.56),
    ('02WHT', 'LYC do Brasil', 89.50, 89.50, 39.46),
    ('97BBU', 'LYC do Brasil', 84.90, 84.90, 54.19),
    ('01WHT', 'LYC do Brasil', 100.00, 100.00, 18.80),
    ('20SBU', 'LYC do Brasil', 92.30, 92.30, 48.99),
    ('62LBU', 'LYC do Brasil', 98.70, 98.70, 60.62),
    ('23WHT', 'LYC do Brasil', 58.90, 58.90, 19.05)
  on conflict (codigo_normalizado) do nothing
  returning id, saldo_metros, valor_metro
),
mov as (
  insert into estoque_movimentos (estoque_id, tipo, metros, motivo)
  select id, 'entrada', saldo_metros, 'Compra NF 000.006.605 - LYC do Brasil (11/09/2026)'
  from novos
  returning estoque_id
),
precos as (
  insert into estoque_precos_historico (estoque_id, valor_metro)
  select id, valor_metro from novos
  returning estoque_id
)
select
  (select count(*) from novos) as tecidos_cadastrados,
  (select count(*) from mov) as movimentos_criados,
  (select count(*) from precos) as precos_criados;
