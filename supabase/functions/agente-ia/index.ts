// Edge Function "agente-ia" — ponte segura entre o app e a API da
// Anthropic. A chave (ANTHROPIC_API_KEY) só existe aqui, como secret do
// projeto — nunca chega no navegador/celular de ninguém.
//
// Só o login "dono" pode chamar essa function (checado abaixo contra a
// tabela perfis, com o mesmo critério de is_dono() usado no resto do
// banco: sem linha em perfis = dono). Vendedor e produção nunca devem
// ver os dois agentes que essa function atende (Precificação e
// Financeiro) — são dados estratégicos/financeiros da empresa inteira.
//
// Deploy: cole este arquivo no Supabase Dashboard → Edge Functions →
// Deploy a new function (nome: "agente-ia"). Não precisa de CLI.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Cada agente tem seu próprio "papel" (system prompt) e um jeito de
// transformar os dados recebidos do app numa pergunta pro modelo.
const AGENTES: Record<string, { system: string; montarPergunta: (dados: any) => string }> = {
  precificacao: {
    system:
      "Você é um consultor de precificação pra um ateliê de alfaiataria e camisaria sob medida no Brasil (Schuck Alfaiataria). " +
      "Responda em português do Brasil, direto e prático, sem enrolação, sem disclaimer genérico. " +
      "Seu trabalho: olhar o custo real (tecido + aviamento + mão de obra) e o preço médio praticado por tipo de peça, " +
      "comparar com a meta de pró-labore do dono, e dizer objetivamente se os preços atuais sustentam a meta — e se não, " +
      "quanto precisaria vender de cada tipo (ou reajustar de preço) pra chegar lá. Use os números exatos que foram passados, " +
      "não invente dado que não foi dado. Se um dado estiver faltando ou parecer incompleto, diga isso claramente em vez de estimar.",
    montarPergunta: (d) => `
Mês de referência (o "este mês" abaixo): ${d.mesReferencia}
Meta de pró-labore mensal do dono: R$ ${d.metaProLabore}

Custos fixos PAGOS neste mês (aluguel, contador, sistemas, etc, SEM contar tecido/mão de obra por peça): R$ ${d.custosFixosMes}
Atenção: se o mês ainda está em andamento, esse número pode estar parcial (nem todo custo fixo do mês já foi pago na data de hoje) — considere isso antes de tirar conclusão definitiva.

IMPORTANTE sobre os números de peça abaixo: "preço médio"/"custo médio"/"margem" são médias de TODO O HISTÓRICO de peças entregues (mais confiável estatisticamente), não só deste mês. "Quantidade entregue este mês" é o volume REAL do mês de referência. Pra estimar quanto esse mês está rendendo, multiplique a margem média histórica pela quantidade DESTE MÊS — nunca pela quantidade do histórico, que é de um período bem maior.

Camisaria (por camisa):
- Preço médio de venda (histórico): R$ ${d.camisaria?.precoMedio ?? "sem dado"}
- Custo médio (histórico; tecido + mão de obra da costureira, NÃO inclui aviamento avulso da camisa): R$ ${d.camisaria?.custoMedio ?? "sem dado"}
- Margem padrão configurada pelo dono: ${d.camisaria?.margemPadraoConfig ?? "não configurada"}%
- Quantidade entregue ESTE MÊS: ${d.camisaria?.qtdMesAtual ?? 0} (histórico total considerado: ${d.camisaria?.qtdHistorico ?? 0} camisa(s))

Alfaiataria (por tipo de peça; custo = tecido + aviamento da composição + valor pago ao responsável):
${(d.alfaiataria || []).map((t: any) => `- ${t.tipo}: preço médio histórico R$ ${t.precoMedio}, custo médio histórico R$ ${t.custoMedio}, margem média histórica R$ ${t.margemMedia} (${t.margemPercentual}%) — entregue ESTE MÊS: ${t.qtdMesAtual}, histórico total: ${t.qtdHistorico} peça(s)`).join("\n") || "sem peças de alfaiataria com valor de venda registrado"}

Com base nisso, a precificação atual sustenta a meta de pró-labore ESTE MÊS? O que ajustar?`,
  },
  financeiro: {
    system:
      "Você é um consultor financeiro pra um ateliê de alfaiataria e camisaria sob medida no Brasil (Schuck Alfaiataria), regime de caixa (o que entrou/saiu de verdade, não o que foi vendido). " +
      "Responda em português do Brasil, direto e prático. Aponte riscos reais (ex: vencimentos concentrados, categoria de despesa fora do padrão, saldo apertado) " +
      "e o que vale a pena fazer a respeito — não repita os números de volta sem análise, e não invente dado que não foi passado. " +
      "SEMPRE termine a resposta com uma seção \"## Recomendações\": de 2 a 4 ações concretas e executáveis, em ordem de prioridade (mais urgente primeiro). " +
      "Cada recomendação tem que ser específica aos dados recebidos nesta análise — cite a categoria, o valor ou o vencimento exato envolvido — nunca conselho " +
      "genérico de educação financeira (nada de \"controle seus gastos\" ou \"tenha uma reserva de emergência\" sem ligar isso a um número real que você recebeu). " +
      "Se identificar um problema (ex: saldo negativo, vencimento concentrado), a recomendação tem que dizer o que fazer sobre ESSE problema específico, com foco em execução " +
      "(o que fazer, quando, e o efeito esperado) — pense como alguém que vai executar aquilo essa semana, não como quem está só descrevendo a situação.",
    montarPergunta: (d) => `
Período de referência (pode ser um único mês ou uma janela de meses somados — leia com atenção qual dos dois é): ${d.mes}
Caixa atual informado pelo dono: R$ ${d.caixaAtual}
Receita recebida no período: R$ ${d.receitaRecebida}
Despesas pagas no período: R$ ${d.despesasPagas}
Saldo do período (recebido - pago): R$ ${d.saldoMes}

Despesas pagas no período, por categoria:
${(d.despesasPorCategoria || []).map((c: any) => `- ${c.categoria}: R$ ${c.total}`).join("\n") || "nenhuma despesa paga registrada"}

Contas a pagar em aberto nos próximos 30 dias (a partir de hoje, não faz parte do período de referência acima):
${(d.proximosVencimentos || []).map((v: any) => `- ${v.data}: ${v.descricao} — R$ ${v.valor}`).join("\n") || "nenhuma conta em aberto nos próximos 30 dias"}

Total em aberto nos próximos 30 dias: R$ ${d.totalProximosVencimentos}

Com base nisso, como está a saúde financeira e o que precisa de atenção?`,
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse({ error: "Não autenticado." }, 401);

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) return jsonResponse({ error: "Não autenticado." }, 401);

    // Mesmo critério de is_dono(): sem linha em perfis = dono (fallback
    // combinado com o resto do banco). Vendedor/produção sempre têm
    // linha própria em perfis, então caem no "papel !== dono" abaixo.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: perfil } = await supabaseAdmin.from("perfis").select("papel").eq("id", userData.user.id).maybeSingle();
    const papel = perfil?.papel || "dono";
    if (papel !== "dono") return jsonResponse({ error: "Acesso restrito ao dono do ateliê." }, 403);

    const { agente, dados } = await req.json();
    const config = AGENTES[agente];
    if (!config) return jsonResponse({ error: `Agente "${agente}" não existe.` }, 400);

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4096,
        system: config.system,
        messages: [{ role: "user", content: config.montarPergunta(dados) }],
      }),
    });

    if (!anthropicResp.ok) {
      const erroTexto = await anthropicResp.text();
      return jsonResponse({ error: `Erro ao chamar a IA: ${erroTexto}` }, 502);
    }

    const anthropicData = await anthropicResp.json();
    const resposta = (anthropicData.content || []).map((b: any) => b.text || "").join("\n").trim();
    if (!resposta) {
      // Acontecia com max_tokens baixo demais pra pergunta mais longa (ex:
      // Financeiro) — a IA gastava o limite "pensando" e nunca escrevia a
      // resposta final, voltando em branco sem erro nenhum. Se acontecer
      // de novo mesmo com o limite maior, pelo menos avisa com detalhe em
      // vez de voltar vazio sem explicação.
      return jsonResponse({ error: `A IA não retornou texto (motivo: ${anthropicData.stop_reason || "desconhecido"}). Tenta de novo.` }, 502);
    }
    return jsonResponse({ resposta });
  } catch (e) {
    return jsonResponse({ error: `Erro inesperado: ${e instanceof Error ? e.message : String(e)}` }, 500);
  }
});
