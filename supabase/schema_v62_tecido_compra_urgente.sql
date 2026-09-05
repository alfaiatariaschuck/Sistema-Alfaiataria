-- Marcador manual "essa compra de tecido é urgente" — pra separar, na
-- projeção de caixa do Contas a Pagar, só o que precisa comprar JÁ
-- (conta o item na soma/saldo projetado/falta faturar) do que já foi
-- vendido mas ainda não é urgente comprar (fica só visível na lista,
-- sem pesar na conta da semana). Antes TODO tecido não comprado somava
-- direto; agora só soma quem estiver marcado aqui.
alter table tecidos add column if not exists compra_urgente boolean default false;
