import { custoAviamentoComposicao, custoTecidoDe } from "./helpers";

// Mão de obra da camisa — usa o valor real "a pagar à Fabiana" quando já
// preenchido; sem isso, cai pra mão de obra padrão × quantidade (mesma
// reserva usada no cartão de estimativa do pedido), pra não fingir custo
// zero só porque o campo ainda não foi preenchido. `estimado` avisa qual
// dos dois foi usado.
function maoDeObraCamisa(p, maoDeObraPadrao) {
  const real = parseFloat(p.pagoFabiana?.valor) || 0;
  if (real > 0) return { valor: real, estimado: false };
  const padrao = (parseFloat(maoDeObraPadrao) || 0) * (parseFloat(p.quantidade) || 0);
  return { valor: padrao, estimado: padrao > 0 };
}

// Custo de uma camisa/pedido — tecido (metragem × valor/metro já
// lançados) + aviamento da camisa (peça-base "Camisa") + mão de obra
// (real quando preenchida, senão estimada pela mão de obra padrão).
export function custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao) {
  const mao = maoDeObraCamisa(p, maoDeObraPadrao);
  return {
    custo: custoTecidoDe(p.tecidos) + (custoAviamentosPorPecaBase["Camisa"] || 0) * (parseFloat(p.quantidade) || 0) + mao.valor,
    estimado: mao.estimado,
  };
}

// Custo real de uma peça de alfaiataria — tecido + aviamento da
// composição do tipo de peça + mão de obra (valor devido ao Ícaro).
export function custoPeca(p, custoAviamentosPorPecaBase) {
  return { custo: custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase) + (parseFloat(p.valorTotal) || 0), estimado: false };
}

// Faturamento/custo/margem agregados de um mês (camisaria + alfaiataria).
export function metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao) {
  const pedidosMes = (pedidos || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const faturamentoCamisaria = pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const custoCamisaria = pedidosMes.reduce((s, p) => s + custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao).custo, 0);
  const qtdCamisas = pedidosMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
  const ticketCamisaria = qtdCamisas > 0 ? faturamentoCamisaria / qtdCamisas : 0;

  const pecasMes = (pecas || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const faturamentoAlfaiataria = pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const custoAlfaiataria = pecasMes.reduce((s, p) => s + custoPeca(p, custoAviamentosPorPecaBase).custo, 0);
  const qtdPecas = pecasMes.length;
  const ticketAlfaiataria = qtdPecas > 0 ? faturamentoAlfaiataria / qtdPecas : 0;

  const faturamentoTotal = faturamentoCamisaria + faturamentoAlfaiataria;
  const custoTotal = custoCamisaria + custoAlfaiataria;
  const margemTotal = faturamentoTotal - custoTotal;
  const margemCamisaria = faturamentoCamisaria - custoCamisaria;
  const margemAlfaiataria = faturamentoAlfaiataria - custoAlfaiataria;

  return {
    chaveMes,
    faturamentoCamisaria,
    custoCamisaria,
    margemCamisaria,
    margemPercentualCamisaria: faturamentoCamisaria > 0 ? (margemCamisaria / faturamentoCamisaria) * 100 : null,
    qtdCamisas,
    ticketCamisaria,
    faturamentoAlfaiataria,
    custoAlfaiataria,
    margemAlfaiataria,
    margemPercentualAlfaiataria: faturamentoAlfaiataria > 0 ? (margemAlfaiataria / faturamentoAlfaiataria) * 100 : null,
    qtdPecas,
    ticketAlfaiataria,
    faturamentoTotal,
    custoTotal,
    margemTotal,
    margemPercentual: faturamentoTotal > 0 ? (margemTotal / faturamentoTotal) * 100 : null,
  };
}

// Lista, pedido a pedido, tudo que foi vendido num mês — camisas e
// peças de alfaiataria juntas, com custo e margem de cada um. `custoEstimado`
// marca quando a mão de obra da camisa ainda não foi preenchida de
// verdade (usou a padrão como reserva) — o custo ali é uma aproximação.
export function itensDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao) {
  const camisas = (pedidos || [])
    .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
    .map((p) => {
      const valor = parseFloat(p.aReceber?.valor) || 0;
      const { custo, estimado } = custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao);
      return {
        id: "pedido-" + p.id,
        linha: "Camisaria",
        tipo: "Camisa",
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: parseFloat(p.quantidade) || 0,
        valor,
        custo,
        custoEstimado: estimado,
        margem: valor - custo,
        statusPagamento: p.aReceber?.statusPagamento || "Pendente",
        status: p.status,
        origemId: p.id,
      };
    });

  const pecasDoMes = (pecas || [])
    .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
    .map((p) => {
      const valor = parseFloat(p.valorVenda) || 0;
      const { custo, estimado } = custoPeca(p, custoAviamentosPorPecaBase);
      return {
        id: "peca-" + p.id,
        linha: "Alfaiataria",
        tipo: p.tipoPeca,
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: 1,
        valor,
        custo,
        custoEstimado: estimado,
        margem: valor - custo,
        statusPagamento: p.statusPagamentoVenda || "Pendente",
        status: p.status,
        origemId: p.id,
      };
    });

  return [...camisas, ...pecasDoMes].sort((a, b) => b.dataPedido.localeCompare(a.dataPedido));
}

export function labelDoMes(chaveMes) {
  const [ano, mes] = chaveMes.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
