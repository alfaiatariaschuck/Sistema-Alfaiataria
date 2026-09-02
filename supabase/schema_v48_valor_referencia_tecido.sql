-- Valor de referência por metro de cada tecido cadastrado — a "tabela"
-- que você usa pra saber quanto cobrar (ex: Italiana Frotta e Zanone Fio
-- 120 = R$89,90/m fixo). Fica em branco pra tecidos que variam muito de
-- rolo pra rolo (ex: Cavalli) — nesses casos o valor real continua
-- entrando por pedido, na aba Compras, igual já funciona hoje.
alter table modelos_camisa add column if not exists valor_referencia_metro numeric;
