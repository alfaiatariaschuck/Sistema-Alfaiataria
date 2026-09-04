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

// Categorias de despesa que já entram no custo do mês por outro caminho
// (direto da config de Custos do Ateliê/Camisaria) — contar de novo aqui
// a partir da despesa lançada em Contas a Pagar duplicaria o valor. Fica
// só como rede de segurança extra — o filtro que realmente evita a
// duplicação é o de descrição exata, abaixo.
const CATEGORIAS_JA_CONTADAS = ["Pró-labore", "Aluguel", "Água/Luz/Internet", "Plano de Saúde"];

// Descrições EXATAS que o botão "Lançar custos fixos deste mês"
// (Configurações) usa pra criar a despesa de cada custo fixo — inclusive
// "Outros custos fixos PJ", que vai pra Contas a Pagar com categoria
// "Outros" (não cai nas categorias acima) e sem esse filtro contaria em
// dobro: uma vez pelo valor configurado, outra pela despesa lançada.
const DESCRICOES_CUSTOS_FIXOS_AUTO = [
  "Pró-labore",
  "Aluguel — Ateliê",
  "Luz — Ateliê",
  "Aluguel — Loja",
  "Luz — Loja",
  "Plano de saúde empresarial",
  "Outros custos fixos PJ",
];

// Quanto de TODAS as outras despesas lançadas em Contas a Pagar (frete,
// fornecedor avulso, manutenção, o que for) cai em cada linha nesse mês —
// pra elas passarem a contar de verdade no custo real usado na Meta e no
// Ponto de Equilíbrio, não só ficarem só no Contas a Pagar. Usa o
// vencimento pra decidir o mês (a despesa já é um gasto assumido, esteja
// paga ou não) e o mesmo critério de rateio já usado em Contas a Pagar:
// Camisaria/Alfaiataria discriminados quando a despesa tem os dois
// campos preenchidos, senão a "Linha" marcada inteira, senão cai como
// Compartilhado (rateado por receita, igual ao resto do compartilhado).
// Despesas com "pedidoId" são as da mão de obra da Fabiana, geradas
// sozinhas a partir do pedido — já contam via custoMaoDeObraFabianaEfetivo,
// então ficam de fora daqui pra não duplicar.
export function outrasDespesasDoMes(despesas, chaveMes) {
  const totais = { Camisaria: 0, Alfaiataria: 0, Compartilhado: 0 };
  (despesas || [])
    .filter(
      (d) =>
        d.vencimento &&
        d.vencimento.slice(0, 7) === chaveMes &&
        !d.pedidoId &&
        !CATEGORIAS_JA_CONTADAS.includes(d.categoria) &&
        !DESCRICOES_CUSTOS_FIXOS_AUTO.includes(d.descricao)
    )
    .forEach((d) => {
      const total = (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
      const cam = parseFloat(d.valorCamisaria) || 0;
      const alf = parseFloat(d.valorAlfaiataria) || 0;
      if (cam > 0 || alf > 0) {
        totais.Camisaria += cam;
        totais.Alfaiataria += alf;
        const resto = total - cam - alf;
        if (resto > 0) totais.Compartilhado += resto;
      } else if (d.linha === "Camisaria" || d.linha === "Alfaiataria") {
        totais[d.linha] += total;
      } else {
        totais.Compartilhado += total;
      }
    });
  return totais;
}

// Ponto de equilíbrio completo de UM mês, por linha — junta mão de obra +
// estrutura + tecido/aviamento (dessa linha) + fatia do compartilhado
// rateada por receita + outras despesas do Contas a Pagar daquele mês.
// Um "pacote" só com a mesma conta usada em Metas.jsx, extraída pra
// poder rodar tanto pro mês corrente (ao vivo, ainda incompleto até
// fechar) quanto pra tirar a média de meses já fechados (referência mais
// estável, porque tem o dado completo).
export function pontoEquilibrioDoMes({
  chaveMes,
  pedidosDoMes,
  pecasDoMes,
  despesas,
  custoMaoDeObraFabiana,
  equipe,
  custoAviamentosPorPecaBase,
  aluguelLoja,
  luzLoja,
  aluguelAtelie,
  luzAtelie,
  prolabore,
  custosFixosPJ,
  planoSaudePJ,
  receitaCamisaria,
  receitaAlfaiataria,
}) {
  const custoCamisaria = custoCamisariaDoMes({ pedidosDoMes, custoMaoDeObraFabiana, custoAviamentosPorPecaBase, aluguel: aluguelLoja, luz: luzLoja });
  const custoAtelie = custoAtelieDoMes({ equipe, pecasDoMes, custoAviamentosPorPecaBase, aluguel: aluguelAtelie, luz: luzAtelie });
  const rateioCamisaria = custoCompartilhadoRateado({ prolabore, custosFixosPJ, planoSaudePJ, receitaLinha: receitaCamisaria, receitaOutraLinha: receitaAlfaiataria });
  const rateioAlfaiataria = custoCompartilhadoRateado({ prolabore, custosFixosPJ, planoSaudePJ, receitaLinha: receitaAlfaiataria, receitaOutraLinha: receitaCamisaria });
  const outras = outrasDespesasDoMes(despesas, chaveMes);
  const receitaTotal = (receitaCamisaria || 0) + (receitaAlfaiataria || 0);
  const fatiaCamisaria = receitaTotal > 0 ? receitaCamisaria / receitaTotal : 0.5;
  return {
    camisaria: custoCamisaria + rateioCamisaria + outras.Camisaria + outras.Compartilhado * fatiaCamisaria,
    alfaiataria: custoAtelie + rateioAlfaiataria + outras.Alfaiataria + outras.Compartilhado * (1 - fatiaCamisaria),
  };
}

// Quanto foi de fato PAGO (dinheiro que saiu de verdade) num mês — usa a
// data do último pagamento registrado (data_pagamento), não o
// vencimento. É a conta certa pra bater com o extrato bancário no fim do
// mês; é DIFERENTE do "custo do mês" (esse usa vencimento e mede
// compromisso assumido, não saída de caixa de fato — os dois são úteis,
// só que pra perguntas diferentes). Conta tudo que foi pago, sem
// exclusão nenhuma (inclusive Fabiana e os custos fixos lançados pelo
// botão de Configurações) — aqui não tem risco de duplicar porque essa
// conta não se mistura com o custo por vencimento em nenhum outro lugar.
// Limitação: se uma despesa foi paga em partes em meses diferentes, o
// valor pago acumulado fica todo atribuído ao mês do pagamento MAIS
// RECENTE — não existe um histórico de cada parcela paga separada.
export function pagoNoMes(despesas, chaveMes) {
  return (despesas || [])
    .filter((d) => d.dataPagamento && d.dataPagamento.slice(0, 7) === chaveMes && (parseFloat(d.valorPago) || 0) > 0)
    .reduce((s, d) => s + (parseFloat(d.valorPago) || 0), 0);
}

// Meta de faturamento com margem — custo total ÷ (1 − margem/100), a
// mesma conta da Calculadora de preço mínimo. Margem 0 = ponto de
// equilíbrio (só cobre o custo, sem sobrar nada); acima disso já embute o
// lucro desejado dentro da própria meta.
export function metaComMargem(custoTotalComRateio, margemDesejada) {
  const margem = Math.min(parseFloat(margemDesejada) || 0, 99);
  return (custoTotalComRateio || 0) / (1 - margem / 100);
}
