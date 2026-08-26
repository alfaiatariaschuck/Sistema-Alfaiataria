-- Permite que o vendedor (Deivid) cadastre os dados pessoais do cliente
-- (telefone, endereço, nascimento, CPF/CNPJ) ao lançar um pedido novo —
-- mas só uma vez. Depois de salvo, ele não consegue mais ler nem editar
-- (só criar/inserir é liberado pra ele; ver e alterar continua só do
-- dono, via a política "dono_acesso_total_dados_pessoais" já existente).
-- Como cliente_id é chave primária da tabela, uma segunda tentativa de
-- gravar pro mesmo cliente falha sozinha (viola a chave), o que já
-- garante o "trava depois" sem precisar de nenhuma lógica extra.
drop policy if exists "vendedor_cadastra_dados_pessoais_uma_vez" on clientes_dados_pessoais;
create policy "vendedor_cadastra_dados_pessoais_uma_vez" on clientes_dados_pessoais
  for insert to authenticated with check (true);
