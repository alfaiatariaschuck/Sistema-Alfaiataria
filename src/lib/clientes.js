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

// Todos os bigramas (pares de letras seguidas) de uma string, minúscula
// e sem espaço nas pontas — base do coeficiente de Dice abaixo, no
// mesmo espírito da similarity() do pg_trgm usada em
// consulta_clientes_duplicados.sql, só que rodando no navegador.
function bigramas(str) {
  const s = (str || "").trim().toLowerCase();
  const pares = [];
  for (let i = 0; i < s.length - 1; i++) pares.push(s.slice(i, i + 2));
  return pares;
}

function dice(x, y) {
  const bx = bigramas(x);
  const by = [...bigramas(y)];
  if (bx.length === 0 || by.length === 0) return 0;
  let comuns = 0;
  bx.forEach((bg) => {
    const idx = by.indexOf(bg);
    if (idx !== -1) {
      comuns++;
      by.splice(idx, 1);
    }
  });
  return (2 * comuns) / (bigramas(x).length + bigramas(y).length);
}

// Quão parecidas duas strings são, de 0 (nada) a 1 (idênticas) — conta
// quantos bigramas as duas têm em comum. Só cai pra comparar apenas a
// primeira palavra quando um dos dois nomes é uma palavra só (o caso do
// "Gabrr" sem sobrenome nenhum) — comparar sempre só o primeiro nome
// faria dois clientes normais com o mesmo primeiro nome (ex: "João
// Silva" x "João Pedro") aparecerem como duplicados, o que é ruído, não
// aviso de verdade.
export function similaridadeNomes(a, b) {
  const palavras = (s) => (s || "").trim().split(/\s+/).filter(Boolean);
  const palavrasA = palavras(a);
  const palavrasB = palavras(b);
  if (palavrasA.length === 1 || palavrasB.length === 1) {
    return Math.max(dice(a, b), dice(palavrasA[0] || "", palavrasB[0] || ""));
  }
  return dice(a, b);
}

const LIMIAR_NOME_PARECIDO = 0.5;

// Acha, numa lista de nomes já cadastrados, o mais parecido com o nome
// digitado — ignora nome idêntico (isso já vira o mesmo cliente
// sozinho, sem risco de duplicidade) e só devolve algo acima do limiar,
// senão vira aviso demais pra nome que só por acaso começa igual.
export function nomeParecidoExistente(nomeDigitado, listaNomes) {
  const nome = (nomeDigitado || "").trim();
  if (nome.length < 3) return null;
  const nomeNormalizado = nome.toLowerCase();
  let melhor = null;
  (listaNomes || []).forEach((existente) => {
    if (existente.trim().toLowerCase() === nomeNormalizado) return;
    const score = similaridadeNomes(nome, existente);
    if (score >= LIMIAR_NOME_PARECIDO && (!melhor || score > melhor.score)) {
      melhor = { nome: existente, score };
    }
  });
  return melhor;
}

// Mesclagem de cliente duplicado, direto do app — mesma lógica que
// antes só dava pra rodar via SQL manual: transfere pedidos, peças de
// alfaiataria, plano de assinatura, histórico de vendas, anotações e
// indicações do cadastro "a apagar" pro "a manter", completa os dados
// pessoais que estiverem faltando, e por fim apaga o duplicado.
export async function mesclarClientes(idManter, idApagar) {
  if (!idManter || !idApagar || idManter === idApagar) throw new Error("Selecione dois clientes diferentes.");

  async function mover(tabela, coluna = "cliente_id") {
    const { error } = await supabase.from(tabela).update({ [coluna]: idManter }).eq(coluna, idApagar);
    if (error) throw error;
  }

  await mover("pedidos");
  await mover("pedidos_alfaiataria");
  await mover("historico_vendas");
  await mover("planos_assinatura");
  await mover("clientes_historico");
  await mover("clientes", "indicado_por_cliente_id");

  // Dados pessoais: só completa no cadastro certo o que estiver vazio —
  // nunca sobrescreve algo que já tinha valor.
  const { data: dadosApagar } = await supabase.from("clientes_dados_pessoais").select("*").eq("cliente_id", idApagar).maybeSingle();
  if (dadosApagar) {
    const { data: dadosManter } = await supabase.from("clientes_dados_pessoais").select("*").eq("cliente_id", idManter).maybeSingle();
    if (dadosManter) {
      const completado = { ...dadosApagar, ...dadosManter };
      Object.keys(completado).forEach((k) => {
        if (dadosManter[k] === null || dadosManter[k] === "") completado[k] = dadosApagar[k];
      });
      delete completado.cliente_id;
      const { error } = await supabase.from("clientes_dados_pessoais").update(completado).eq("cliente_id", idManter);
      if (error) throw error;
    } else {
      const { cliente_id, ...resto } = dadosApagar;
      const { error } = await supabase.from("clientes_dados_pessoais").insert({ cliente_id: idManter, ...resto });
      if (error) throw error;
    }
    await supabase.from("clientes_dados_pessoais").delete().eq("cliente_id", idApagar);
  }

  const { error: erroDelete } = await supabase.from("clientes").delete().eq("id", idApagar);
  if (erroDelete) throw erroDelete;
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
  // (RankingIndicacao.jsx) somar certo sem depender de nome igual letra
  // por letra. Se NÃO bater e vier um CPF junto (a pessoa confirmou que
  // quer mesmo cadastrar esse indicador), cria um registro de cliente
  // pra ele — mesmo sem nenhum pedido próprio, só pra existir e poder
  // ganhar prêmio de indicação — e já grava o CPF (fica em
  // clientes_dados_pessoais, protegido por LGPD igual qualquer outro).
  let indicadoPorClienteId = null;
  const indicadoPorTexto = (opcoes.indicadoPor || "").trim();
  const indicadoPorCpf = (opcoes.indicadoPorCpf || "").trim();
  if (indicadoPorTexto) {
    const { data: indicador } = await supabase
      .from("clientes")
      .select("id")
      .eq("nome_normalizado", indicadoPorTexto.toLowerCase())
      .maybeSingle();
    if (indicador) {
      indicadoPorClienteId = indicador.id;
    } else if (indicadoPorCpf) {
      indicadoPorClienteId = await encontrarOuCriarCliente(indicadoPorTexto);
      await salvarDadosPessoaisCliente(indicadoPorClienteId, { cpf: indicadoPorCpf });
    }
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

// Vincula (ou corrige) o indicador de um cliente já cadastrado — cobre o
// caso de "lancei o pedido só com o nome de quem indicou, não tinha o
// CPF na hora" (a pessoa que indicou nem sempre já é cliente, então na
// hora do pedido não dava pra cadastrar ela ainda). Cria (ou acha) o
// registro de cliente do indicador, salva o CPF, e atualiza o
// indicado_por_cliente_id do cliente indicado — só assim ele passa a
// contar de verdade no Ranking de Indicação (que soma por ID, não por
// nome digitado).
export async function vincularIndicador(clienteId, nomeIndicador, cpfIndicador) {
  const nome = (nomeIndicador || "").trim();
  if (!clienteId || !nome) return null;
  const indicadorId = await encontrarOuCriarCliente(nome);
  if ((cpfIndicador || "").trim()) await salvarDadosPessoaisCliente(indicadorId, { cpf: cpfIndicador });
  const { error } = await supabase.from("clientes").update({ indicado_por: nome, indicado_por_cliente_id: indicadorId }).eq("id", clienteId);
  if (error) throw error;
  return indicadorId;
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

  const { error } = await supabase.from("clientes_dados_pessoais").upsert({
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
  if (error) throw error;
}
