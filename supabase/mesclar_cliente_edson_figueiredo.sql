-- Mescla o cliente duplicado "Edosn Figueiredo" (nome digitado errado no
-- pedido que o Deivid lançou) com o cadastro certo "Edson Figueiredo".
-- Rode no SQL Editor do Supabase. Não precisa editar nada, já está com
-- os dois nomes certos.
--
-- O que faz: transfere pedidos, peças de alfaiataria, plano de
-- assinatura, histórico de vendas e anotações do registro errado pro
-- registro certo, completa os dados pessoais que estiverem faltando no
-- certo com os do errado, e por fim apaga o cadastro duplicado. Não
-- perde nenhum pedido nem histórico.

do $$
declare
  id_manter uuid;
  id_apagar uuid;
begin
  select id into id_manter from clientes where nome_normalizado = lower(trim('Edson Figueiredo'));
  select id into id_apagar from clientes where nome_normalizado = lower(trim('Edosn Figueiredo'));

  if id_manter is null then
    raise exception 'Cliente "Edson Figueiredo" não encontrado — confira a grafia.';
  end if;
  if id_apagar is null then
    raise exception 'Cliente "Edosn Figueiredo" não encontrado — talvez já tenha sido corrigido, ou a grafia é outra.';
  end if;
  if id_manter = id_apagar then
    raise exception 'Os dois nomes apontam pro mesmo cadastro — não há duplicidade a mesclar.';
  end if;

  update pedidos set cliente_id = id_manter where cliente_id = id_apagar;
  update pedidos_alfaiataria set cliente_id = id_manter where cliente_id = id_apagar;
  update historico_vendas set cliente_id = id_manter where cliente_id = id_apagar;
  update planos_assinatura set cliente_id = id_manter where cliente_id = id_apagar;
  update clientes_historico set cliente_id = id_manter where cliente_id = id_apagar;
  update clientes set indicado_por_cliente_id = id_manter where indicado_por_cliente_id = id_apagar;

  -- Dados pessoais: completa no cadastro certo só o que estiver vazio lá.
  update clientes_dados_pessoais destino
  set endereco = coalesce(destino.endereco, origem.endereco),
      data_nascimento = coalesce(destino.data_nascimento, origem.data_nascimento),
      telefone = coalesce(destino.telefone, origem.telefone),
      email = coalesce(destino.email, origem.email),
      observacoes = coalesce(destino.observacoes, origem.observacoes),
      cpf = coalesce(destino.cpf, origem.cpf),
      cnpj = coalesce(destino.cnpj, origem.cnpj),
      razao_social = coalesce(destino.razao_social, origem.razao_social)
  from clientes_dados_pessoais origem
  where destino.cliente_id = id_manter and origem.cliente_id = id_apagar;

  -- Se o cadastro certo ainda não tinha NENHUM dado pessoal salvo, copia
  -- a linha inteira do duplicado.
  insert into clientes_dados_pessoais (
    cliente_id, endereco, data_nascimento, telefone, email, observacoes,
    consentimento, consentimento_em, tipo_pessoa, cpf, cnpj, razao_social, atualizado_em
  )
  select id_manter, endereco, data_nascimento, telefone, email, observacoes,
         consentimento, consentimento_em, tipo_pessoa, cpf, cnpj, razao_social, atualizado_em
  from clientes_dados_pessoais
  where cliente_id = id_apagar
    and not exists (select 1 from clientes_dados_pessoais where cliente_id = id_manter);

  delete from clientes_dados_pessoais where cliente_id = id_apagar;
  delete from clientes where id = id_apagar;

  raise notice 'Mesclado com sucesso: Edosn Figueiredo (%) -> Edson Figueiredo (%)', id_apagar, id_manter;
end $$;
