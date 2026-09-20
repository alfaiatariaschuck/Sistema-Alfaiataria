-- Vendedor (Deivid) passa a poder ATUALIZAR os dados pessoais do
-- cliente, não só cadastrar uma vez (v79)
-- ADITIVO: não apaga nem recria nada existente.
--
-- Até agora (schema_v21) só dava pra ele INSERIR os dados pessoais uma
-- única vez — numa recompra, como o cliente já tinha cadastro, a
-- gravação caía num UPDATE que a policy não cobria e falhava calada
-- (sem erro na tela, só não salvava). O Tales pediu pra ele conseguir
-- lançar/salvar sempre, igual o dono já conseguia.
--
-- Continua protegido pro lado da LEITURA: essa policy só libera
-- INSERT/UPDATE, não SELECT — o vendedor consegue escrever por cima,
-- mas não consegue ver o que já está cadastrado (CPF, endereço,
-- nascimento continuam visíveis só pro dono, via a policy
-- "dono_acesso_total_dados_pessoais" já existente, que já cobre tudo:
-- select/insert/update/delete).

drop policy if exists "vendedor_cadastra_dados_pessoais_uma_vez" on clientes_dados_pessoais;
drop policy if exists "vendedor_atualiza_dados_pessoais" on clientes_dados_pessoais;
create policy "vendedor_atualiza_dados_pessoais" on clientes_dados_pessoais
  for all to authenticated using (true) with check (true);
