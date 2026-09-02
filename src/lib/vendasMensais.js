import { custoAviamentoComposicao, custoTecidoDe } from "./helpers";
import { custoEquipeMensal } from "./custoEquipe";

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

// Custo de uma peça de alfaiataria — tecido + aviamento da composição
// do tipo de peça + mão de obra. A mão de obra NÃO usa mais um campo
// por peça (hoje o Ícaro e os freelancers da alfaiataria são pagos por
// mês/diária, não por peça pronta) — usa o rateio: custo mensal de
// toda a equipe (Equipe) dividido pela quantidade de peças daquele mês
// (`maoDeObraPorPeca`, já calculado em metricasDoMes/itensDoMes).
// `estimado` vem sempre true porque é uma média do mês, não o custo
// exato daquela peça específica.
export function custoPeca(p, custoAviamentosPorPecaBase, maoDeObraPorPeca) {
  const maoDeObra = parseFloat(maoDeObraPorPeca) || 0;
  return {
    custo: custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase) + maoDeObra,
    estimado: maoDeObra > 0,
  };
}

// Faturamento/custo/margem agregados de um mês (camisaria + alfaiataria).
export function metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe) {
  const pedidosMes = (pedidos || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const faturamentoCamisaria = pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const custoCamisaria = pedidosMes.reduce((s, p) => s + custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao).custo, 0);
  const qtdCamisas = pedidosMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
  const ticketCamisaria = qtdCamisas > 0 ? faturamentoCamisaria / qtdCamisas : 0;

  const pecasMes = (pecas || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const qtdPecas = pecasMes.length;
  const maoDeObraPorPeca = qtdPecas > 0 ? custoEquipeMensal(equipe) / qtdPecas : 0;
  const faturamentoAlfaiataria = pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const custoAlfaiataria = pecasMes.reduce((s, p) => s + custoPeca(p, custoAviamentosPorPecaBase, maoDeObraPorPeca).custo, 0);
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
// peças de alfaiataria juntas, com custo e margem de cada um.
// `custoEstimado` marca quando o custo usou uma média/reserva em vez do
// valor exato daquele pedido: na camisa, quando a mão de obra da Fabi
// ainda não foi preenchida (usa a padrão); na peça de alfaiataria,
// sempre — a mão de obra ali é o rateio da equipe do mês, não um valor
// exato por peça.
export function itensDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe) {
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

  const pecasMes = (pecas || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes);
  const maoDeObraPorPeca = pecasMes.length > 0 ? custoEquipeMensal(equipe) / pecasMes.length : 0;
  const pecasDoMes = pecasMes.map((p) => {
    const valor = parseFloat(p.valorVenda) || 0;
    const { custo, estimado } = custoPeca(p, custoAviamentosPorPecaBase, maoDeObraPorPeca);
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
