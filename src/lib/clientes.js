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

export async function encontrarOuCriarCliente(nome) {
  const nomeNormalizado = nome.trim().toLowerCase();
  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .eq("nome_normalizado", nomeNormalizado)
    .maybeSingle();
  if (existente) return existente.id;
  const { data: criado, error } = await supabase.from("clientes").insert({ nome: nome.trim() }).select("id").single();
  if (error) throw error;
  return criado.id;
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
