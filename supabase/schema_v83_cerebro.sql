-- Cérebro Schuck — base de anotações do negócio (v83)
-- ADITIVO: não apaga nem recria nada existente. Tabela nova, isolada —
-- não encosta em pedido, cliente nem financeiro.
--
-- Fase 1 (essa aqui): sem IA automática. Você mesmo escolhe a
-- categoria e as tags na hora de anotar (a tela sugere as que já usou
-- ou uma lista inicial, mas aceita qualquer texto novo). O grafo do
-- Painel Cérebro conecta categorias que compartilham pelo menos uma
-- tag em comum — é uma conexão simples, calculada na hora, sem
-- depender de IA nem gastar nada extra.
-- Fase 2 (só se você quiser mais pra frente): IA sugerindo categoria/
-- tag sozinha exigiria uma função à parte (Supabase Edge Function) e
-- uma chave de API paga — combinamos deixar isso pra depois.

create table if not exists notas_cerebro (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  categoria text not null,
  tags text[] not null default '{}',
  criado_em timestamptz not null default now()
);

create index if not exists idx_notas_cerebro_categoria on notas_cerebro (categoria);

alter table notas_cerebro enable row level security;

drop policy if exists "dono_acesso_total_notas_cerebro" on notas_cerebro;
create policy "dono_acesso_total_notas_cerebro" on notas_cerebro
  for all to authenticated using (is_dono()) with check (is_dono());
