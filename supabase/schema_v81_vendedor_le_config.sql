-- Vendedor (Deivid) passa a poder LER a tabela "config" (v81)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Precisa disso pro pedido lançado por ele já vir com o valor de mão de
-- obra padrão da costureira calculado sozinho (mão de obra padrão ×
-- quantidade), igual já acontece quando o Tales lança — sem isso o
-- campo ficava sempre em branco pro vendedor (schema_v9 trancou
-- "config" só pro dono, inclusive pra leitura).
--
-- Só libera LEITURA — gravar continua travado só pro dono, via a
-- policy "dono_acesso_total_config" (for all) já existente.

drop policy if exists "vendedor_le_config" on config;
create policy "vendedor_le_config" on config
  for select to authenticated using (true);
