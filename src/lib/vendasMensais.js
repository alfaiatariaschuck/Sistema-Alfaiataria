import { custoAviamentoComposicao, custoTecidoDe } from "./helpers";

// Custo real de uma camisa/pedido — tecido (metragem × valor/metro já
// lançados) + aviamento da camisa (peça-base "Camisa") + mão de obra
// (valor efetivamente pago/a pagar à Fabiana). Não é estimativa: usa
// só dado já gravado no pedido.
export function custoCamisa(p, custoAviamentosPorPecaBase) {
  return custoTecidoDe(p.tecidos) + (custoAviamentosPorPecaBase["Camisa"] || 0) * (parseFloat(p.quantidade) || 0) + (parseFloat(p.pagoFabiana?.valor) || 0);
}

// Custo real de uma peça de alfaiataria — tecido + aviamento da
// composição do tipo de peça + mão de obra (valor devido ao Ícaro).
export function custoPeca(p, custoAviamentosPorPecaBase) {
  return custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase) + (parseFloat(p.valorTotal) || 0);
}

// Faturamento/custo/margem agregados de um mês (camisaria + alfaiataria).
export function metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase) {
  const pedidosMes = (pedidos || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const faturamentoCamisaria = pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const custoCamisaria = pedidosMes.reduce((s, p) => s + custoCamisa(p, custoAviamentosPorPecaBase), 0);
  const qtdCamisas = pedidosMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
  const ticketCamisaria = qtdCamisas > 0 ? faturamentoCamisaria / qtdCamisas : 0;

  const pecasMes = (pecas || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const faturamentoAlfaiataria = pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const custoAlfaiataria = pecasMes.reduce((s, p) => s + custoPeca(p, custoAviamentosPorPecaBase), 0);
  const qtdPecas = pecasMes.length;
  const ticketAlfaiataria = qtdPecas > 0 ? faturamentoAlfaiataria / qtdPecas : 0;

  const faturamentoTotal = faturamentoCamisaria + faturamentoAlfaiataria;
  const custoTotal = custoCamisaria + custoAlfaiataria;
  const margemTotal = faturamentoTotal - custoTotal;

  return {
    chaveMes,
    faturamentoCamisaria,
    qtdCamisas,
    ticketCamisaria,
    faturamentoAlfaiataria,
    qtdPecas,
    ticketAlfaiataria,
    faturamentoTotal,
    custoTotal,
    margemTotal,
    margemPercentual: faturamentoTotal > 0 ? (margemTotal / faturamentoTotal) * 100 : null,
  };
}

// Lista, pedido a pedido, tudo que foi vendido num mês — camisas e
// peças de alfaiataria juntas, com custo real e margem de cada um.
export function itensDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase) {
  const camisas = (pedidos || [])
    .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
    .map((p) => {
      const valor = parseFloat(p.aReceber?.valor) || 0;
      const custo = custoCamisa(p, custoAviamentosPorPecaBase);
      return {
        id: "pedido-" + p.id,
        linha: "Camisaria",
        tipo: "Camisa",
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: parseFloat(p.quantidade) || 0,
        valor,
        custo,
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
      const custo = custoPeca(p, custoAviamentosPorPecaBase);
      return {
        id: "peca-" + p.id,
        linha: "Alfaiataria",
        tipo: p.tipoPeca,
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: 1,
        valor,
        custo,
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
