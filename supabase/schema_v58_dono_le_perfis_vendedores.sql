-- Sistema de Gestão de Pedidos de Alfaiataria — dono lê todos os perfis (v58)
-- ADITIVO: não apaga nem recria tabelas/dados existentes.
--
-- Hoje a política de "perfis" só deixa cada login ler o PRÓPRIO perfil
-- (id = auth.uid()) — inclusive você, o dono. Isso trava a nova aba
-- "Vendedor" de identificar quem é vendedor de verdade (ela precisa ler
-- a lista de perfis com papel = 'vendedor' pra separar os pedidos que o
-- Deivid lançou pelo login dele dos pedidos que você mesmo lançou e só
-- deu crédito de comissão no campo "Vendedor" da ficha).
--
-- Essa política nova é ADITIVA (RLS combina políticas permissivas com
-- OU) — a política antiga continua valendo pro vendedor (ele só lê o
-- próprio perfil); só o dono ganha a leitura de todos.

drop policy if exists "dono_le_todos_perfis" on perfis;
create policy "dono_le_todos_perfis" on perfis
  for select to authenticated using (is_dono());
