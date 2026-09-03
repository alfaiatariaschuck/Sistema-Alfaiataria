import { custoAviamentoComposicao, custoTecidoDe } from "./helpers";
import { custoEquipeMensal } from "./custoEquipe";

// Custo próprio do ateliê (alfaiataria) no mês — mão de obra da equipe +
// aluguel/luz do ateliê + tecido e aviamentos das peças pedidas nesse mês.
// Não inclui o rateio dos custos compartilhados da empresa (ver
// custoCompartilhadoRateado) — mesma composição usada em Custos do Ateliê.
export function custoAtelieDoMes({ equipe, pecasDoMes, custoAviamentosPorPecaBase, aluguel, luz }) {
  const custoEquipeTotal = custoEquipeMensal(equipe || []);
  const custoEstrutura = (parseFloat(aluguel) || 0) + (parseFloat(luz) || 0);
  const custoProducaoTecido = (pecasDoMes || []).reduce((s, p) => s + custoTecidoDe(p.tecidos), 0);
  const custoAviamentos = (pecasDoMes || []).reduce((s, p) => s + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase), 0);
  return custoEquipeTotal + custoEstrutura + custoProducaoTecido + custoAviamentos;
}

// Quanto pagar à Fabiana no mês, com a mesma projeção usada em Custos da
// Camisaria: cedo no mês o valor real pago ainda está incompleto (ela é
// paga ao longo do mês), então usa o total do mês anterior como
// estimativa até o valor real ultrapassar aquele patamar.
export function custoMaoDeObraFabianaEfetivo(pedidos, mesAtualStr, mesAnteriorStr) {
  const doMes = (chaveMes) =>
    (pedidos || [])
      .filter((p) => p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
      .reduce((s, p) => s + (parseFloat(p.pagoFabiana?.valor) || 0), 0);
  const atual = doMes(mesAtualStr);
  const anterior = doMes(mesAnteriorStr);
  return atual >= anterior && atual > 0 ? atual : anterior;
}

// Custo próprio da camisaria no mês — mão de obra da Fabiana (projetada,
// ver acima) + aluguel/luz da loja + tecido dos pedidos + aviamentos por
// camisa vendida. Mesma composição usada em Custos da Camisaria.
// "pedidosDoMes" é TODO pedido do mês (Doação incluída — ela também
// consome tecido de verdade); só a quantidade que entra no cálculo do
// aviamento exclui Doação (não é venda).
export function custoCamisariaDoMes({ pedidosDoMes, custoMaoDeObraFabiana, custoAviamentosPorPecaBase, aluguel, luz }) {
  const custoEstrutura = (parseFloat(aluguel) || 0) + (parseFloat(luz) || 0);
  const custoProducaoTecido = (pedidosDoMes || []).reduce((s, p) => s + custoTecidoDe(p.tecidos), 0);
  const quantidadeVendida = (pedidosDoMes || [])
    .filter((p) => p.status !== "Doação")
    .reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
  const custoAviamentos = ((custoAviamentosPorPecaBase || {})["Camisa"] || 0) * quantidadeVendida;
  return (parseFloat(custoMaoDeObraFabiana) || 0) + custoEstrutura + custoProducaoTecido + custoAviamentos;
}

// Rateio do custo compartilhado da empresa (pró-labore, contador,
// sistemas, plano de saúde etc) entre as duas linhas — pró-labore meio a
// meio (é retirada pessoal, não tem a ver com quem vendeu mais), o resto
// proporcional à receita de cada linha no mês.
export function custoCompartilhadoRateado({ prolabore, custosFixosPJ, planoSaudePJ, receitaLinha, receitaOutraLinha }) {
  const receitaTotal = (receitaLinha || 0) + (receitaOutraLinha || 0);
  const fatia = receitaTotal > 0 ? receitaLinha / receitaTotal : 0.5;
  const prolaboreMetade = (parseFloat(prolabore) || 0) * 0.5;
  const rateavel = (parseFloat(custosFixosPJ) || 0) + (parseFloat(planoSaudePJ) || 0);
  return prolaboreMetade + rateavel * fatia;
}

// Meta de faturamento com margem — custo total ÷ (1 − margem/100), a
// mesma conta da Calculadora de preço mínimo. Margem 0 = ponto de
// equilíbrio (só cobre o custo, sem sobrar nada); acima disso já embute o
// lucro desejado dentro da própria meta.
export function metaComMargem(custoTotalComRateio, margemDesejada) {
  const margem = Math.min(parseFloat(margemDesejada) || 0, 99);
  return (custoTotalComRateio || 0) / (1 - margem / 100);
}
