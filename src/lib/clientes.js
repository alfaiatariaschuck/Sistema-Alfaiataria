import { supabase } from "../supabaseClient";

// Corrige o nome de um cliente já existente (ex: erro de digitação no
// lançamento do pedido) — atualiza em cascata em todo lugar que exibe
// esse cliente (pedidos, peças, Clientes), já que tudo é ligado por
// clienteId, não por texto solto. nome_normalizado tem índice único, então
// isso falha se já existir outro cliente com o nome corrigido (nesse caso
// é duplicidade de verdade — precisa mesclar, não só renomear).
export async function renomearCliente(clienteId, novoNome) {
  const nome = (novoNome || "").trim();
  if (!clienteId || !nome) return;
  const { error } = await supabase.from("clientes").update({ nome }).eq("id", clienteId);
  if (error) throw error;
}

// Cliente novo criado pelo login de um vendedor entra automaticamente na
// carteira dele (foi ele quem prospectou/atendeu) — o dono pode
// transferir depois em Clientes. Criado pelo dono, fica sem carteira
// definida (cai no "Tales" por padrão em todo lugar que usa esse campo,
// como o crédito de venda em VendedorGestao).
async function carteiraPadraoDoCriador() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from("perfis").select("papel").eq("id", user.id).maybeSingle();
  return perfil?.papel === "vendedor" ? user.id : null;
}

export async function encontrarOuCriarCliente(nome, opcoes = {}) {
  const nomeNormalizado = nome.trim().toLowerCase();
  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .eq("nome_normalizado", nomeNormalizado)
    .maybeSingle();
  if (existente) return existente.id;

  const donoCarteiraId = await carteiraPadraoDoCriador();

  // "Indicado por" é digitado como texto livre (mesmo campo de
  // autocomplete do nome do cliente) — se bater com um cliente já
  // cadastrado, linka por ID também, pra o Ranking de Indicação
  // (RankingIndicacao.jsx) somar certo sem depender de nome igual
  // letra por letra. Não achando, fica só o texto (indicador ainda não
  // é cliente cadastrado, ou nome digitado diferente).
  let indicadoPorClienteId = null;
  const indicadoPorTexto = (opcoes.indicadoPor || "").trim();
  if (indicadoPorTexto) {
    const { data: indicador } = await supabase
      .from("clientes")
      .select("id")
      .eq("nome_normalizado", indicadoPorTexto.toLowerCase())
      .maybeSingle();
    indicadoPorClienteId = indicador?.id || null;
  }

  const { data: criado, error } = await supabase
    .from("clientes")
    .insert({
      nome: nome.trim(),
      dono_carteira_id: donoCarteiraId,
      origem: opcoes.origem || null,
      indicado_por: indicadoPorTexto || null,
      indicado_por_cliente_id: indicadoPorClienteId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return criado.id;
}

// Transferência de carteira — só o dono consegue de verdade (RLS: só ele
// tem UPDATE em "clientes"), então essa função nem existe pro vendedor
// na prática.
export async function definirDonoCarteira(clienteId, donoCarteiraId) {
  const { error } = await supabase.from("clientes").update({ dono_carteira_id: donoCarteiraId }).eq("id", clienteId);
  if (error) throw error;
}

// Timeline de observações/histórico do cliente — nunca sobrescreve, só
// adiciona. "marco" opcional identifica uma ação de pós-venda concluída
// (D+1, D+15 etc — ver FunilPosVenda), pra não repetir o alerta.
export async function adicionarHistoricoCliente(clienteId, texto, marco = null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("clientes_historico").insert({
    cliente_id: clienteId,
    autor_id: user?.id || null,
    texto,
    marco,
  });
  if (error) throw error;
}

// Só grava se pelo menos um campo foi preenchido — não cria uma linha vazia
// na tabela toda vez que um pedido é lançado sem dado pessoal nenhum.
export async function salvarDadosPessoaisCliente(clienteId, dados) {
  if (!clienteId || !dados) return;
  const temAlgo = [dados.telefone, dados.email, dados.dataNascimento, dados.endereco, dados.cep, dados.cpf, dados.cnpj, dados.razaoSocial, dados.observacoes].some(
    (v) => (v || "").trim()
  );
  if (!temAlgo) return;

  await supabase.from("clientes_dados_pessoais").upsert({
    cliente_id: clienteId,
    tipo_pessoa: dados.tipoPessoa || "PF",
    telefone: dados.telefone || null,
    email: dados.email || null,
    data_nascimento: dados.dataNascimento || null,
    endereco: dados.endereco || null,
    cep: dados.cep || null,
    cpf: dados.cpf || null,
    cnpj: dados.cnpj || null,
    razao_social: dados.razaoSocial || null,
    observacoes: dados.observacoes || null,
    consentimento: !!dados.consentimento,
    consentimento_em: dados.consentimento ? new Date().toISOString().slice(0, 10) : null,
    atualizado_em: new Date().toISOString(),
  });
}
