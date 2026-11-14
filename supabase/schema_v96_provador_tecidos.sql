-- "Mostruário" do Provador de Tecidos (ferramenta da Ana — blazer/
-- camisa, foto do tecido na peça — integrada ao sistema em 14/11/2026,
-- fase 2). Antes, os tecidos cadastrados ficavam salvos só no
-- navegador de quem tirou a foto (localStorage) — essa tabela guarda
-- o cadastro (nome, código, peça, tipo, escala do recorte)
-- compartilhado entre todo mundo. A foto em si vai pro Storage
-- (bucket provador-tecidos); só a referência (imagem_path) fica aqui
-- — pra não deixar o banco pesado com imagem em base64 numa coluna de
-- texto.

create table if not exists provador_tecidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  peca text not null check (peca in ('blazer', 'camisa')),
  tipo text,
  cm numeric not null default 10,
  rot boolean not null default false,
  imagem_path text not null,
  criado_em timestamptz not null default now()
);

create index if not exists provador_tecidos_peca_idx on provador_tecidos (peca);

alter table provador_tecidos enable row level security;

drop policy if exists "authenticated_full_access" on provador_tecidos;
create policy "authenticated_full_access" on provador_tecidos
  for all to authenticated using (true) with check (true);

-- Bucket público: é só o mostruário visual da loja (foto de tecido),
-- não é dado sensível — leitura liberada geral (a foto carrega rápido
-- sem precisar de token assinado), escrita/exclusão só pra quem está
-- logado no sistema.
insert into storage.buckets (id, name, public)
values ('provador-tecidos', 'provador-tecidos', true)
on conflict (id) do nothing;

drop policy if exists "provador_tecidos_read" on storage.objects;
create policy "provador_tecidos_read" on storage.objects
  for select using (bucket_id = 'provador-tecidos');

drop policy if exists "provador_tecidos_write" on storage.objects;
create policy "provador_tecidos_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'provador-tecidos');

drop policy if exists "provador_tecidos_delete" on storage.objects;
create policy "provador_tecidos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'provador-tecidos');
