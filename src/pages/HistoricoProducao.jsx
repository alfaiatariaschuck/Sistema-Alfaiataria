import React, { useMemo, useState } from "react";
import { AlertTriangle, Clock, Hourglass, PackageCheck, Timer, TrendingUp, Users, Wallet, Zap } from "lucide-react";
import { BarraDuasSeries, BarraSimples, Card, Empty, PageTitle, StatCard } from "../components/ui";
import {
  BRASS,
  COMPOSICAO_AVIAMENTOS,
  COR_REAL,
  COR_REFERENCIA,
  HORAS_PRODUTIVAS_POR_DIA_PADRAO,
  HORAS_REFERENCIA_TIPO_PECA,
  INK,
  LINE,
  TEXT_MUTED,
  TIPOS_SAIDA_SEM_VENDA,
  inputStyle,
} from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, diasEntre, diasProducaoReal, fmtData, hojeISO, mediaEsperaCliente } from "../lib/helpers";
import { custoEquipeMensal, custoMaoDeObraPeca, custoMensalDe, custoPorHoraAlfaiataria } from "../lib/custoEquipe";
import { useConfigCustosFixos } from "../hooks/useConfigCustosFixos";

// "YYYY-MM" de N meses atrás (0 = mês atual) — usado pros atalhos de
// período (Últimos 3/6/12 meses) do consolidado.
function mesAtrasISO(n) {
  const hoje = new Date(hojeISO() + "T00:00:00");
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Quantos meses de calendário existem entre início e fim (inclusive) —
// pra multiplicar folha/ateliê (custo fixo mensal) pelo período
// selecionado, não só aplicar o valor de 1 mês num período maior.
function qtdMesesEntre(mesInicio, mesFim) {
  const [anoI, mesI] = mesInicio.split("-").map(Number);
  const [anoF, mesF] = mesFim.split("-").map(Number);
  return Math.max(1, (anoF - anoI) * 12 + (mesF - mesI) + 1);
}

// Dias de produção pura (máquina/trabalho manual), sem prova nem
// espera — vem das horas de desenvolvimento da planilha de parâmetros
// (ex.: 23h pra um traje) convertidas em dias pela capacidade
// produtiva padrão. Isso sozinho é otimista demais como "referência":
// não conta o gargalo real de prova/peça parada, que segundo o Tales é
// inevitável mesmo indo tudo bem — por isso a referência final soma
// esse número de produção com o "gargalo típico" (melhor resultado
// real já registrado menos a produção pura), em vez de usar só a
// conta de horas.
function diasProducaoBaseTipo(tipo) {
  const horas = HORAS_REFERENCIA_TIPO_PECA[tipo];
  if (!horas) return null;
  return Math.max(1, Math.round(horas / HORAS_PRODUTIVAS_POR_DIA_PADRAO));
}

function BarraComparativa({ dados }) {
  const dadosAB = dados.map((d) => ({ chave: d.chave, a: d.referencia, b: d.real, producaoBase: d.producaoBase, gargalo: d.gargalo }));
  return (
    <BarraDuasSeries
      dados={dadosAB}
      corA={COR_REFERENCIA}
      corB={COR_REAL}
      legendaA="Referência (produção + gargalo típico)"
      legendaB="Real (histórico)"
      tooltipDe={(d) =>
        `${d.chave}: referência ${d.a ?? "—"}d (${d.producaoBase}d produção + ${d.gargalo}d prova/espera) · real ${d.b ?? "—"}d` +
        (d.a && d.b ? ` — ${(d.b / d.a).toFixed(1)}x mais devagar` : "")
      }
      notaDe={(d) =>
        d.a && d.b ? (
          <div className="fx-mono" style={{ fontSize: 11, fontWeight: 700, color: COR_REAL, marginTop: 2, textAlign: "center" }}>
            {(d.b / d.a).toFixed(1)}x
          </div>
        ) : null
      }
    />
  );
}

// Vendidas vs entregues, mês a mês — pra ver se a produção está
// acompanhando o ritmo de vendas (não é "sobra" exata, já que uma venda
// de um mês pode entregar só depois, mas mostra a tendência).
function BarraVendasEntregas({ dados }) {
  return (
    <BarraDuasSeries
      dados={dados}
      corA={COR_REFERENCIA}
      corB={COR_REAL}
      legendaA="Vendidas"
      legendaB="Entregues"
      tooltipDe={(d) => `${d.chave}: ${d.a} vendida(s) · ${d.b} entregue(s)`}
    />
  );
}

// Histórico de produção da alfaiataria: médias reais (início -> entrega,
// já sem pausas) por tipo de peça e por responsável, com gráficos —
// pensado pra apresentação/reunião de equipe, não pra edição de nada.
export default function HistoricoProducao({ pecas, equipe, mostrarMargem = false, mostrarComparativos = true, custoAviamentosPorPecaBase = {} }) {
  const [mesInicio, setMesInicio] = useState("2026-09");
  const [mesFim, setMesFim] = useState("2026-09");
  const [margemMinimaPct, setMargemMinimaPct] = useState(30);
  const [mostrarBacklog, setMostrarBacklog] = useState(false);
  const { aliquotaImposto, aluguelAtelie, luzAtelie } = useConfigCustosFixos();

  // Custo de mão de obra por hora (equipe real, rateada) — mesmo número
  // canônico usado no resto do sistema (Painel, Consolidado, Agente de
  // Precificação, estimador ao vivo), pra mostrar o custo de ateliê por
  // peça aqui também, no lugar do antigo campo solto "valor Ícaro".
  const custoHoraGeral = useMemo(() => custoPorHoraAlfaiataria(pecas, equipe), [pecas, equipe]);

  // Detalhe peça a peça de um mês — pedido lançado (dataPedido) naquele
  // mês, com exatamente o que está cadastrado (valor de venda, cada item
  // de tecido com seu R$/metro, e o aviamento pela composição do tipo).
  // Serve pra auditar de onde vem um "Material médio" baixo — mostra
  // item de tecido sem R$/metro cadastrado em vez de esconder como R$0.
  //
  // Desmembramento até a margem líquida (pedido do Tales, 24/10/2026):
  // imposto é a alíquota configurada em Custos (mesma usada na
  // Camisaria) sobre o valor de venda, não sobre o lucro — é assim que o
  // DAS do Simples Nacional funciona. "Espaço pra remuneração" é quanto
  // ainda dá pra aumentar o custo de mão de obra da equipe nessa peça
  // sem a margem cair abaixo do mínimo desejado (editável, default 30%)
  // — serve de teto pro estudo de remuneração, não é um valor já pago.
  //
  // O rateio de mão de obra por pessoa (pelo peso de cada um na folha)
  // foi tentado e tirado de novo (24/10/2026) — o Tales achou confuso
  // peça a peça; o que importa pra ele é o total consolidado do mês
  // (ver totalDetalheMes), não o rateio individual.
  const detalheMes = useMemo(() => {
    const pctImposto = (parseFloat(aliquotaImposto) || 0) / 100;
    const pctMargemMinima = (parseFloat(margemMinimaPct) || 0) / 100;
    return pecas
      .filter((p) => {
        const mes = (p.dataPedido || "").slice(0, 7);
        return mes >= mesInicio && mes <= mesFim;
      })
      .map((p) => {
        const itensTecido = (p.tecidos || []).filter((t) => t.codigo || t.metragem || t.valorMetro);
        const custoTecido = custoTecidoDe(p.tecidos);
        const custoAviamento = custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase);
        const horasReferencia = HORAS_REFERENCIA_TIPO_PECA[p.tipoPeca] || 0;
        const custoMaoDeObra = custoMaoDeObraPeca(p.tipoPeca, custoHoraGeral);
        const custoAtelie = custoTecido + custoAviamento + custoMaoDeObra;
        const valorVenda = parseFloat(p.valorVenda) || 0;
        const imposto = valorVenda * pctImposto;
        const margemLiquida = valorVenda - custoAtelie - imposto;
        const margemMinima = valorVenda * pctMargemMinima;
        const espacoRemuneracao = margemLiquida - margemMinima;
        return {
          id: p.id,
          cliente: p.cliente || "Sem nome",
          tipoPeca: p.tipoPeca,
          status: p.status,
          dataPedido: p.dataPedido,
          valorVenda,
          itensTecido,
          custoTecido,
          composicaoAviamento: COMPOSICAO_AVIAMENTOS[p.tipoPeca] || [],
          custoAviamento,
          horasReferencia,
          custoMaoDeObra,
          custoAtelie,
          imposto,
          margemLiquida,
          margemMinima,
          espacoRemuneracao,
        };
      })
      .sort((a, b) => (a.dataPedido || "").localeCompare(b.dataPedido || ""));
  }, [pecas, mesInicio, mesFim, custoAviamentosPorPecaBase, custoHoraGeral, aliquotaImposto, margemMinimaPct]);

  // Total do mês — mesmos campos do detalhe, somados, pra ver o teto
  // consolidado de remuneração de uma vez (não só peça a peça).
  const totalDetalheMes = useMemo(() => {
    return detalheMes.reduce(
      (acc, p) => ({
        valorVenda: acc.valorVenda + p.valorVenda,
        custoTecido: acc.custoTecido + p.custoTecido,
        custoAviamento: acc.custoAviamento + p.custoAviamento,
        custoMaoDeObra: acc.custoMaoDeObra + p.custoMaoDeObra,
        custoAtelie: acc.custoAtelie + p.custoAtelie,
        imposto: acc.imposto + p.imposto,
        margemLiquida: acc.margemLiquida + p.margemLiquida,
        margemMinima: acc.margemMinima + p.margemMinima,
        espacoRemuneracao: acc.espacoRemuneracao + p.espacoRemuneracao,
      }),
      {
        valorVenda: 0,
        custoTecido: 0,
        custoAviamento: 0,
        custoMaoDeObra: 0,
        custoAtelie: 0,
        imposto: 0,
        margemLiquida: 0,
        margemMinima: 0,
        espacoRemuneracao: 0,
      }
    );
  }, [detalheMes]);

  // Folha real (fixa, paga por mês) por pessoa + custo de estrutura do
  // ateliê (aluguel+luz) — pedido do Tales (24/10/2026): no consolidado
  // do mês, quer ver quanto gastou de folha, por pessoa da equipe, e o
  // custo do ateliê, não a versão "rateada pela hora" que já aparece
  // peça a peça. Usa a equipe/estrutura de HOJE (igual à tela Custos do
  // Ateliê) — não existe histórico salvo de folha/aluguel mês a mês,
  // então pra um mês passado isso é uma aproximação, não o valor exato
  // daquele mês.
  const folhaEMes = useMemo(() => {
    const qtdMeses = qtdMesesEntre(mesInicio, mesFim);
    const membros = (equipe || [])
      .filter((m) => m.ativo)
      .map((m) => ({ ...m, custoMensal: custoMensalDe(m), custoPeriodo: custoMensalDe(m) * qtdMeses }))
      .sort((a, b) => b.custoPeriodo - a.custoPeriodo);
    const custoFolha = membros.reduce((s, m) => s + m.custoPeriodo, 0);
    const custoEstrutura = ((parseFloat(aluguelAtelie) || 0) + (parseFloat(luzAtelie) || 0)) * qtdMeses;
    const pctMargemMinima = (parseFloat(margemMinimaPct) || 0) / 100;
    const margemConsolidada = totalDetalheMes.valorVenda - totalDetalheMes.custoTecido - totalDetalheMes.custoAviamento - custoFolha - custoEstrutura - totalDetalheMes.imposto;
    const margemMinimaConsolidada = totalDetalheMes.valorVenda * pctMargemMinima;
    return {
      qtdMeses,
      membros,
      custoFolha,
      custoEstrutura,
      margemConsolidada,
      espacoConsolidado: margemConsolidada - margemMinimaConsolidada,
    };
  }, [equipe, aluguelAtelie, luzAtelie, margemMinimaPct, totalDetalheMes, mesInicio, mesFim]);

  // Vendidas vs entregues NESSE período (não é a mesma peça virando
  // "entregue" — uma vendida no período pode entregar só depois, e uma
  // entregue no período pode ter sido vendida antes; cada lado conta o
  // que aconteceu dentro do intervalo). Serve de termômetro rápido de
  // desempenho do ateliê junto do consolidado financeiro (pedido do
  // Tales, 24/10/2026): se entregou bem menos do que vendeu, o backlog
  // tá crescendo nesse período.
  const desempenhoPeriodo = useMemo(() => {
    const vendidas = detalheMes.length;
    const entregues = (pecas || []).filter((p) => {
      const mes = (p.dataEntrega || "").slice(0, 7);
      return p.status === "Entregue" && mes >= mesInicio && mes <= mesFim;
    }).length;
    // Quais peças especificamente compõem o backlog — vendidas dentro do
    // período e que ainda não saíram (até hoje, não só até o fim do
    // período), pra dar pra ver quem é, não só o número.
    const emAberto = detalheMes
      .filter((p) => p.status !== "Entregue")
      .map((p) => ({ ...p, diasEmAberto: diasEntre(p.dataPedido, hojeISO()) }))
      .sort((a, b) => (b.diasEmAberto || 0) - (a.diasEmAberto || 0));
    return { vendidas, entregues, diferenca: vendidas - entregues, emAberto };
  }, [pecas, detalheMes, mesInicio, mesFim]);

  // Resumo mensal de tecido lançado — visão rápida de quantas peças
  // (vendidas, excluindo doação/permuta/uso próprio) já têm tecido com
  // R$/metro cadastrado em cada mês, pra priorizar onde lançar valor
  // retroativo primeiro. Clicar num mês seleciona ele sozinho (início =
  // fim) no período do detalhe peça a peça logo abaixo.
  const resumoTecidoPorMes = useMemo(() => {
    const porMes = new Map();
    pecas.forEach((p) => {
      if (TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida)) return;
      const mes = (p.dataPedido || "").slice(0, 7);
      if (!mes) return;
      if (!porMes.has(mes)) {
        porMes.set(mes, { mes, qtdPecas: 0, valorVenda: 0, custoTecido: 0, pecasSemTecido: 0, itensSemValor: 0 });
      }
      const grupo = porMes.get(mes);
      grupo.qtdPecas += 1;
      grupo.valorVenda += parseFloat(p.valorVenda) || 0;
      grupo.custoTecido += custoTecidoDe(p.tecidos);
      const itensLancados = (p.tecidos || []).filter((t) => t.codigo || t.metragem || t.valorMetro);
      if (itensLancados.length === 0) {
        grupo.pecasSemTecido += 1;
      } else {
        grupo.itensSemValor += itensLancados.filter((t) => !t.valorMetro || !t.metragem).length;
      }
    });
    return Array.from(porMes.values()).sort((a, b) => b.mes.localeCompare(a.mes));
  }, [pecas]);

  const entregues = useMemo(
    () => pecas.filter((p) => p.status === "Entregue" && p.dataInicioProducao && p.dataEntrega),
    [pecas]
  );

  const valoresPorTipo = useMemo(() => {
    const mapa = new Map();
    entregues.forEach((p) => {
      const dias = diasProducaoReal(p);
      if (dias === null) return;
      if (!mapa.has(p.tipoPeca)) mapa.set(p.tipoPeca, []);
      mapa.get(p.tipoPeca).push(dias);
    });
    return mapa;
  }, [entregues]);

  const porTipo = useMemo(
    () =>
      [...valoresPorTipo.entries()]
        .map(([tipo, valores]) => ({
          chave: tipo,
          valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
          qtd: valores.length,
        }))
        .sort((a, b) => b.valor - a.valor),
    [valoresPorTipo]
  );

  // Melhor resultado real já registrado por tipo — "dando tudo certo",
  // já inclui o gargalo de prova/espera que sempre existe na prática
  // (diferente do cálculo puro de horas, que é otimista demais).
  const melhorCasoPorTipo = useMemo(() => {
    const mapa = new Map();
    valoresPorTipo.forEach((valores, tipo) => mapa.set(tipo, Math.min(...valores)));
    return mapa;
  }, [valoresPorTipo]);

  const porResponsavel = useMemo(() => {
    const mapa = new Map();
    entregues.forEach((p) => {
      const nome = p.responsavel || "Sem responsável";
      const dias = diasProducaoReal(p);
      if (dias === null) return;
      if (!mapa.has(nome)) mapa.set(nome, []);
      mapa.get(nome).push(dias);
    });
    return [...mapa.entries()]
      .map(([nome, valores]) => ({
        chave: nome,
        valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
        qtd: valores.length,
      }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [entregues]);

  const mediaGeral = useMemo(() => {
    const validos = entregues.map((p) => diasProducaoReal(p)).filter((d) => d !== null);
    if (!validos.length) return null;
    return Math.round(validos.reduce((s, v) => s + v, 0) / validos.length);
  }, [entregues]);

  const maisRapido = porTipo[porTipo.length - 1];
  const maisLento = porTipo[0];

  // Espera pelo cliente pra vir fazer a prova, separada da produção em
  // si — só existe pras pausas registradas com esse motivo depois que
  // esse controle entrou no ar (os pedidos históricos importados não
  // têm esse detalhe: a planilha antiga só guardava uma data por etapa,
  // sem separar quando a peça ficou pronta de quando o cliente veio).
  const mediaEsperaClienteValor = useMemo(() => mediaEsperaCliente(entregues), [entregues]);

  // Referência = produção pura (horas de desenvolvimento) + gargalo
  // típico (melhor resultado real já registrado menos a produção pura)
  // — soma os dois porque o Tales apontou que só a conta de horas é
  // otimista demais: nem o melhor caso escapa de prova/espera, então a
  // referência tem que incluir esse gargalo pra ser honesta. Só entra
  // na comparação o tipo que tem parâmetro de horas configurado.
  const comparativo = useMemo(
    () =>
      porTipo
        .map((d) => {
          const producaoBase = diasProducaoBaseTipo(d.chave);
          if (producaoBase === null) return null;
          const melhorCaso = melhorCasoPorTipo.get(d.chave) ?? producaoBase;
          const gargalo = Math.max(0, melhorCaso - producaoBase);
          return {
            chave: d.chave,
            real: d.valor,
            referencia: producaoBase + gargalo,
            producaoBase,
            gargalo,
            qtd: d.qtd,
          };
        })
        .filter(Boolean),
    [porTipo, melhorCasoPorTipo]
  );

  // Resumo geral do atraso: soma dos dias reais vs soma dos dias de
  // referência, ponderado pela quantidade de peças de cada tipo — dá
  // um único número (múltiplo) pra responder "o quanto estamos
  // atrasados" sem precisar olhar tipo por tipo.
  const atrasoResumo = useMemo(() => {
    if (!comparativo.length) return null;
    const somaReal = comparativo.reduce((s, d) => s + d.real * d.qtd, 0);
    const somaRef = comparativo.reduce((s, d) => s + d.referencia * d.qtd, 0);
    if (!somaRef) return null;
    return somaReal / somaRef;
  }, [comparativo]);

  // Quantidade de peças entregues por tipo (mesma lista do gráfico de
  // média, mas ordenada e lida pela quantidade em vez do tempo).
  const qtdPorTipo = useMemo(
    () =>
      [...porTipo].sort((a, b) => b.qtd - a.qtd).map((d) => ({ chave: d.chave, valor: d.qtd })),
    [porTipo]
  );

  // Quantidade de peças entregues por mês, desde o início do histórico
  // (agrupado pela data de entrega — sem limite de meses, é justamente
  // pra ver a evolução completa).
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  function rotuloMes(mes) {
    const [ano, m] = mes.split("-");
    return `${MESES[parseInt(m, 10) - 1]}/${ano.slice(2)}`;
  }
  const entregasPorMesRaw = useMemo(() => {
    const mapa = new Map();
    entregues.forEach((p) => {
      const mes = p.dataEntrega.slice(0, 7);
      mapa.set(mes, (mapa.get(mes) || 0) + 1);
    });
    return mapa;
  }, [entregues]);

  const porMes = useMemo(
    () => [...entregasPorMesRaw.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, qtd]) => ({ chave: rotuloMes(mes), valor: qtd })),
    [entregasPorMesRaw]
  );

  // Quantidade de peças VENDIDAS por mês (data do pedido, não da
  // entrega) — todas as peças, entregues ou não, desde o início.
  const vendasPorMesRaw = useMemo(() => {
    const mapa = new Map();
    pecas.forEach((p) => {
      if (!p.dataPedido) return;
      const mes = p.dataPedido.slice(0, 7);
      mapa.set(mes, (mapa.get(mes) || 0) + 1);
    });
    return mapa;
  }, [pecas]);

  const vendasPorMes = useMemo(
    () => [...vendasPorMesRaw.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, qtd]) => ({ chave: rotuloMes(mes), valor: qtd })),
    [vendasPorMesRaw]
  );

  // Confronto vendidas vs entregues, mês a mês — pra enxergar se a
  // produção está dando conta do ritmo de vendas ou se o backlog está
  // crescendo. Uma peça vendida num mês pode ser entregue só em outro,
  // então isso não é "sobrou X sem entregar" — é o ritmo de cada lado.
  const vendasVsEntregasPorMes = useMemo(() => {
    const meses = new Set([...vendasPorMesRaw.keys(), ...entregasPorMesRaw.keys()]);
    return [...meses]
      .sort((a, b) => a.localeCompare(b))
      .map((mes) => ({ chave: rotuloMes(mes), a: vendasPorMesRaw.get(mes) || 0, b: entregasPorMesRaw.get(mes) || 0 }));
  }, [vendasPorMesRaw, entregasPorMesRaw]);

  const tabela = useMemo(
    () =>
      entregues
        .map((p) => ({ ...p, dias: diasProducaoReal(p) }))
        .sort((a, b) => (b.dataEntrega || "").localeCompare(a.dataEntrega || "")),
    [entregues]
  );

  // Custo real da equipe (Ícaro/Zonzo), vindo do cadastro em Equipe —
  // mesmo número usado em Custos do Ateliê. Não dá pra usar o campo
  // solto "valor devido ao Ícaro" de cada peça como mão de obra: ele é
  // lançado à mão, inconsistente, e a equipe é paga fixo por mês, não
  // por peça.
  const custoEquipeMensalReal = useMemo(() => custoEquipeMensal(equipe), [equipe]);

  // Margem por peça: venda menos o custo real (tecido + aviamentos pela
  // composição do tipo de peça + mão de obra). Mão de obra é o custo
  // fixo mensal real da equipe (Equipe), rateado proporcional à hora de
  // referência de cada tipo de peça dentro do mês em que foi pedida —
  // uma Calça (5h) não pode pesar igual a um Traje (26,5h). Só entra
  // quem tem valor de venda lançado, E só quem foi venda de verdade —
  // doação/permuta/uso próprio não são venda (mesmo critério já usado
  // no faturamento), senão um valor "de brincadeira" lançado numa peça
  // dessas distorce a margem média do tipo. Só calculado quando
  // mostrarMargem=true (tela do Ícaro não recebe valor_venda do banco,
  // então nem teria como calcular isso direito).
  const comMargem = useMemo(() => {
    if (!mostrarMargem) return [];
    const candidatas = entregues.filter((p) => p.valorVenda !== "" && p.valorVenda != null && !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida));

    const horasPorMes = new Map();
    candidatas.forEach((p) => {
      const mes = (p.dataPedido || "").slice(0, 7);
      const horas = HORAS_REFERENCIA_TIPO_PECA[p.tipoPeca] || 0;
      horasPorMes.set(mes, (horasPorMes.get(mes) || 0) + horas);
    });

    return candidatas.map((p) => {
      const venda = parseFloat(p.valorVenda) || 0;
      const custoMaterial = custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase);
      const mes = (p.dataPedido || "").slice(0, 7);
      const horasPeca = HORAS_REFERENCIA_TIPO_PECA[p.tipoPeca] || 0;
      const horasMes = horasPorMes.get(mes) || 0;
      const custoMaoDeObra = horasMes > 0 ? (custoEquipeMensalReal * horasPeca) / horasMes : 0;
      const custo = custoMaterial + custoMaoDeObra;
      const dias = diasProducaoReal(p);
      return { ...p, custoMaterial, custoMaoDeObra, margem: venda - custo, margemPorDia: dias ? (venda - custo) / dias : null };
    });
  }, [entregues, mostrarMargem, custoAviamentosPorPecaBase, custoEquipeMensalReal]);

  const margemPorTipo = useMemo(() => {
    const mapa = new Map();
    comMargem.forEach((p) => {
      if (!mapa.has(p.tipoPeca)) mapa.set(p.tipoPeca, []);
      mapa.get(p.tipoPeca).push(p.margem);
    });
    return [...mapa.entries()]
      .map(([tipo, valores]) => ({ chave: tipo, valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length), qtd: valores.length }))
      .sort((a, b) => b.valor - a.valor);
  }, [comMargem]);

  const margemPorCliente = useMemo(() => {
    const mapa = new Map();
    comMargem.forEach((p) => {
      const nome = p.cliente || "Sem nome";
      mapa.set(nome, (mapa.get(nome) || 0) + p.margem);
    });
    return [...mapa.entries()]
      .map(([nome, total]) => ({ chave: nome, valor: Math.round(total) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [comMargem]);

  // Preço médio de venda e custo médio (tecido + aviamentos + mão de obra
  // do Ícaro) por tipo de peça — separado material de mão de obra (não só
  // a margem líquida), pra dar base pra decisão de crescimento (quanto
  // custa fazer mais um de cada tipo, quanto é material x mão de obra,
  // quanto ele rende) e pra achar o teto de mão de obra que mantém a
  // margem desejada.
  const precoCustoPorTipo = useMemo(() => {
    const mapa = new Map();
    comMargem.forEach((p) => {
      const venda = parseFloat(p.valorVenda) || 0;
      if (!mapa.has(p.tipoPeca)) mapa.set(p.tipoPeca, { vendas: [], materiais: [], maoDeObra: [] });
      const grupo = mapa.get(p.tipoPeca);
      grupo.vendas.push(venda);
      grupo.materiais.push(p.custoMaterial);
      grupo.maoDeObra.push(p.custoMaoDeObra);
    });
    return [...mapa.entries()]
      .map(([tipo, { vendas, materiais, maoDeObra }]) => {
        const qtd = vendas.length;
        const media = (arr) => arr.reduce((s, v) => s + v, 0) / qtd;
        const precoMedio = media(vendas);
        const materialMedio = media(materiais);
        const maoDeObraMedia = media(maoDeObra);
        const custoMedio = materialMedio + maoDeObraMedia;
        const margemMedia = precoMedio - custoMedio;
        return {
          tipo,
          qtd,
          precoMedio,
          materialMedio,
          maoDeObraMedia,
          custoMedio,
          margemMedia,
          margemPercentual: precoMedio > 0 ? (margemMedia / precoMedio) * 100 : 0,
        };
      })
      .sort((a, b) => b.qtd - a.qtd);
  }, [comMargem]);

  const margemResumo = useMemo(() => {
    if (!comMargem.length) return null;
    const total = comMargem.reduce((s, p) => s + p.margem, 0);
    return { total, media: total / comMargem.length };
  }, [comMargem]);

  // Retrabalho: peças que precisaram de ajuste extra além do fluxo
  // normal — sinaliza onde a produção está perdendo tempo/qualidade
  // além do previsto.
  const taxaRetrabalho = useMemo(() => {
    if (!entregues.length) return null;
    const qtd = entregues.filter((p) => p.retrabalho).length;
    return Math.round((qtd / entregues.length) * 100);
  }, [entregues]);

  const retrabalhoPorResponsavel = useMemo(() => {
    const mapa = new Map();
    entregues
      .filter((p) => p.retrabalho)
      .forEach((p) => {
        const nome = p.responsavel || "Sem responsável";
        mapa.set(nome, (mapa.get(nome) || 0) + 1);
      });
    return [...mapa.entries()].map(([nome, qtd]) => ({ chave: nome, valor: qtd })).sort((a, b) => b.valor - a.valor);
  }, [entregues]);

  // Sazonalidade: vendas agrupadas por MÊS DO ANO (não pela data
  // cronológica) — soma todos os anos disponíveis, pra revelar picos
  // que se repetem (ex: casamentos em dezembro), independente de quando
  // exatamente cada venda aconteceu.
  const MESES_NOME = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const sazonalidade = useMemo(() => {
    const somaPorMes = Array(12).fill(0);
    pecas.forEach((p) => {
      if (!p.dataPedido) return;
      const mes = parseInt(p.dataPedido.slice(5, 7), 10) - 1;
      if (mes >= 0 && mes < 12) somaPorMes[mes]++;
    });
    return MESES_NOME.map((nome, i) => ({ chave: nome, valor: somaPorMes[i] }));
  }, [pecas]);

  if (pecas.length === 0) {
    return (
      <div>
        <PageTitle eyebrow="Alfaiataria — histórico" title="Histórico de Produção" />
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhuma peça registrada ainda." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — histórico" title="Histórico de Produção" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Peças entregues" value={entregues.length} icon={PackageCheck} />
        <StatCard label="Média geral de produção" value={mediaGeral !== null ? `${mediaGeral}d` : "—"} icon={Timer} />
        {maisRapido && <StatCard label="Mais rápida em média" value={`${maisRapido.chave} · ${maisRapido.valor}d`} icon={Zap} />}
        {maisLento && <StatCard label="Mais demorada em média" value={`${maisLento.chave} · ${maisLento.valor}d`} icon={Clock} />}
        <StatCard label="Espera média por prova" value={mediaEsperaClienteValor !== null ? `${mediaEsperaClienteValor}d` : "—"} icon={Hourglass} />
        <StatCard
          label="Taxa de retrabalho"
          value={taxaRetrabalho !== null ? `${taxaRetrabalho}%` : "—"}
          icon={AlertTriangle}
          accent={taxaRetrabalho > 0 ? "#9C4A1E" : undefined}
        />
        {mostrarMargem && margemResumo !== null && (
          <StatCard label="Margem média por peça" value={brl(margemResumo.media)} icon={Wallet} />
        )}
      </div>
      {mediaEsperaClienteValor === null && (
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: -16, marginBottom: 20 }}>
          "Espera média por prova" é uma métrica nova: só conta peças pausadas com o motivo "aguardando prova" a partir de agora — os pedidos históricos importados não têm esse detalhe registrado.
        </div>
      )}

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Média de dias de produção por tipo de peça
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          Do início real da produção até a entrega, já descontando pausas — só peças já entregues.
        </div>
        <BarraSimples dados={porTipo} sufixoValor="d" formatarTooltip={(d) => `${d.chave}: ${d.valor} dias em média (${d.qtd} peça(s))`} />
      </Card>

      {mostrarComparativos && comparativo.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Referência vs. Real por tipo de peça
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Referência = dias de produção pura (horas de máquina) + gargalo típico de prova/espera (a diferença entre o melhor resultado já registrado e a produção pura) — contra a média real do histórico. A diferença que sobra é o atraso de verdade, não o gargalo que já era esperado.
          </div>
          {atrasoResumo !== null && (
            <div
              className="fx-mono"
              style={{ fontSize: 12, fontWeight: 700, color: COR_REAL, marginBottom: 16, background: "#EAF1FB", display: "inline-block", padding: "6px 12px", borderRadius: 6 }}
            >
              No geral, a produção está levando {atrasoResumo.toFixed(1)}x o tempo de referência (produção + gargalo típico)
            </div>
          )}
          <BarraComparativa dados={comparativo} />
        </Card>
      )}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Peças entregues por tipo
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Quantidade de peças, agrupada por tipo — só peças já entregues.
          </div>
          <BarraSimples dados={qtdPorTipo} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) entregue(s)`} />
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Peças entregues por mês
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Quantidade entregue por mês, desde o início do histórico (agrupada pela data de entrega).
          </div>
          <BarraSimples dados={porMes} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) entregue(s)`} />
        </Card>

        {mostrarComparativos && (
          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
              Peças vendidas por mês
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
              Quantidade de peças vendidas por mês, desde o início (agrupada pela data do pedido — entregues ou não).
            </div>
            <BarraSimples dados={vendasPorMes} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) vendida(s)`} />
          </Card>
        )}

        {mostrarComparativos && (
          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
              Sazonalidade (vendas por mês do ano)
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
              Soma de todos os anos, por mês — mostra picos que se repetem (ex: casamentos), independente do ano exato.
            </div>
            <BarraSimples dados={sazonalidade} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) vendida(s) (todos os anos)`} />
          </Card>
        )}
      </div>

      {mostrarComparativos && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Vendidas vs. Entregues por mês
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Confronto direto, mês a mês — mostra se a produção está no ritmo das vendas. Uma peça vendida num mês pode ser entregue em outro, então não é exatamente "sobra", mas mostra a tendência.
          </div>
          <BarraVendasEntregas dados={vendasVsEntregasPorMes} />
        </Card>
      )}

      {mostrarComparativos && retrabalhoPorResponsavel.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Retrabalho por responsável
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Quantidade de peças que precisaram de ajuste extra além do fluxo normal, por quem produziu.
          </div>
          <BarraSimples dados={retrabalhoPorResponsavel} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) com retrabalho`} />
        </Card>
      )}

      {mostrarMargem && resumoTecidoPorMes.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Tecido lançado por mês
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
            Peças vendidas (exclui doação/permuta/uso próprio) por mês do pedido, com o tecido já lançado e quantas ainda
            faltam valor retroativo. Clique num mês pra abrir o detalhe peça a peça logo abaixo.
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left", color: TEXT_MUTED }}>
                  <th style={{ padding: "6px 8px" }}>Mês</th>
                  <th style={{ padding: "6px 8px" }}>Peças vendidas</th>
                  <th style={{ padding: "6px 8px" }}>Venda total</th>
                  <th style={{ padding: "6px 8px" }}>Tecido lançado</th>
                  <th style={{ padding: "6px 8px" }}>Média tecido/peça</th>
                  <th style={{ padding: "6px 8px" }}>Peças sem tecido lançado</th>
                  <th style={{ padding: "6px 8px" }}>Itens sem R$/metro</th>
                </tr>
              </thead>
              <tbody>
                {resumoTecidoPorMes.map((m) => (
                  <tr
                    key={m.mes}
                    onClick={() => {
                      setMesInicio(m.mes);
                      setMesFim(m.mes);
                    }}
                    style={{
                      borderBottom: `1px solid ${LINE}`,
                      cursor: "pointer",
                      background: m.mes >= mesInicio && m.mes <= mesFim ? "#F3EEDF" : "transparent",
                    }}
                  >
                    <td className="fx-mono" style={{ padding: "6px 8px", fontWeight: 700, color: INK }}>
                      {m.mes}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{m.qtdPecas}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{brl(m.valorVenda)}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{brl(m.custoTecido)}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{brl(m.qtdPecas ? m.custoTecido / m.qtdPecas : 0)}</td>
                    <td style={{ padding: "6px 8px", fontWeight: m.pecasSemTecido > 0 ? 700 : 400, color: m.pecasSemTecido > 0 ? "#9C4A1E" : INK }}>
                      {m.pecasSemTecido}
                    </td>
                    <td style={{ padding: "6px 8px", fontWeight: m.itensSemValor > 0 ? 700 : 400, color: m.itensSemValor > 0 ? "#9C4A1E" : INK }}>
                      {m.itensSemValor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {mostrarMargem && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Detalhe por peça — período
            </div>
            <label style={{ fontSize: 11, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6 }}>
              Margem mínima desejada
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                style={{ ...inputStyle, width: 60 }}
                value={margemMinimaPct}
                onChange={(e) => setMargemMinimaPct(e.target.value)}
              />
              %
            </label>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {[
              { label: "Este mês", meses: 0 },
              { label: "Últimos 3 meses", meses: 2 },
              { label: "Últimos 4 meses", meses: 3 },
              { label: "Últimos 6 meses", meses: 5 },
              { label: "Últimos 12 meses", meses: 11 },
            ].map((opc) => (
              <button
                key={opc.label}
                onClick={() => {
                  setMesInicio(mesAtrasISO(opc.meses));
                  setMesFim(mesAtrasISO(0));
                }}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${LINE}`,
                  background: mesFim === mesAtrasISO(0) && mesInicio === mesAtrasISO(opc.meses) ? BRASS : "#fff",
                  color: mesFim === mesAtrasISO(0) && mesInicio === mesAtrasISO(opc.meses) ? "#fff" : TEXT_MUTED,
                  cursor: "pointer",
                }}
              >
                {opc.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <label style={{ fontSize: 11, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6 }}>
              De
              <input type="month" style={{ ...inputStyle, width: "auto" }} value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} />
            </label>
            <label style={{ fontSize: 11, color: TEXT_MUTED, display: "flex", alignItems: "center", gap: 6 }}>
              Até
              <input type="month" style={{ ...inputStyle, width: "auto" }} value={mesFim} onChange={(e) => setMesFim(e.target.value)} />
            </label>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16, marginTop: 8 }}>
            Cada peça pedida no período selecionado, exatamente como está lançada — valor de venda, cada item de tecido com seu
            R$/metro (ou "sem valor cadastrado" se faltar), o aviamento pela composição do tipo, o custo de ateliê (tecido +
            aviamento + mão de obra real da equipe, rateada pela hora de referência do tipo), o imposto (alíquota de{" "}
            {(parseFloat(aliquotaImposto) || 0).toFixed(1)}% configurada em Custos, sobre a venda) e a margem líquida. "Espaço
            pra remuneração" é quanto ainda dá pra aumentar o custo de mão de obra da equipe nessa peça sem a margem cair
            abaixo do mínimo ao lado — é um teto pro estudo, não um valor já pago.
          </div>
          {detalheMes.length > 0 && (
            <div
              className="mb-4"
              style={{ background: "#F3EEDF", borderRadius: 8, padding: "14px" }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 2 }}>
                Consolidado do período ({mesInicio === mesFim ? mesInicio : `${mesInicio} a ${mesFim}`})
              </div>
              <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: TEXT_MUTED }}>
                  Vendidas no período: <strong style={{ color: INK }}>{desempenhoPeriodo.vendidas}</strong>
                </span>
                <span style={{ color: TEXT_MUTED }}>·</span>
                <span style={{ color: TEXT_MUTED }}>
                  Entregues no período: <strong style={{ color: INK }}>{desempenhoPeriodo.entregues}</strong>
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: desempenhoPeriodo.diferenca > 0 ? "#F6E3D9" : "#DCEBDD",
                    color: desempenhoPeriodo.diferenca > 0 ? "#9C4A1E" : "#2C6E31",
                  }}
                >
                  {desempenhoPeriodo.diferenca > 0
                    ? `backlog +${desempenhoPeriodo.diferenca}`
                    : desempenhoPeriodo.diferenca < 0
                    ? `entregou ${Math.abs(desempenhoPeriodo.diferenca)} a mais do que vendeu (reduzindo backlog antigo)`
                    : "vendeu e entregou igual"}
                </span>
                {desempenhoPeriodo.emAberto.length > 0 && (
                  <button
                    onClick={() => setMostrarBacklog((v) => !v)}
                    style={{ fontSize: 11, color: BRASS, fontWeight: 600, textDecoration: "underline" }}
                  >
                    {mostrarBacklog ? "ocultar" : "ver"} as {desempenhoPeriodo.emAberto.length} peça(s) em aberto
                  </button>
                )}
              </div>
              {mostrarBacklog && desempenhoPeriodo.emAberto.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 6 }}>
                    Vendidas no período que ainda não foram entregues até hoje (não só até o fim do período selecionado):
                  </div>
                  <div className="flex flex-col gap-1">
                    {desempenhoPeriodo.emAberto.map((p) => (
                      <div key={p.id} className="flex items-center justify-between fx-mono" style={{ fontSize: 12 }}>
                        <span style={{ color: INK }}>
                          <strong>{p.cliente}</strong>
                          <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>
                            {" "}
                            — {p.tipoPeca} · pedido {fmtData(p.dataPedido)} · {p.status}
                          </span>
                        </span>
                        <span style={{ color: (p.diasEmAberto || 0) > 30 ? "#9C4A1E" : TEXT_MUTED, fontWeight: 700 }}>
                          {p.diasEmAberto ?? "—"}d em aberto
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 10 }}>
                Vendida = pedido lançado no período (pode entregar depois). Entregue = peça marcada "Entregue" com data
                de entrega no período (pode ter sido vendida antes) — não é a mesma peça virando entregue, é o ritmo de
                cada lado nesse intervalo. Folha e estrutura do ateliê usam a equipe e os custos cadastrados hoje
                (aluguel/luz em Configurações), multiplicados por {folhaEMes.qtdMeses} mês(es) do período — se parte do
                período for passado, é uma aproximação do patamar atual, não o valor exato de cada mês.
              </div>

              <div style={{ background: "#fff", borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
                <div className="flex items-center gap-1" style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 6 }}>
                  <Users size={12} /> Folha da equipe no período ({folhaEMes.qtdMeses} mês(es), por pessoa)
                </div>
                {folhaEMes.membros.filter((m) => m.custoMensal > 0).length === 0 ? (
                  <div style={{ fontSize: 11, color: "#9C4A1E" }}>Ninguém com remuneração cadastrada em Equipe ainda.</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {folhaEMes.membros
                      .filter((m) => m.custoMensal > 0)
                      .map((m) => (
                        <div key={m.id} className="flex items-center justify-between fx-mono" style={{ fontSize: 12 }}>
                          <span style={{ color: INK, fontWeight: 600 }}>
                            {m.nome}
                            <span style={{ fontWeight: 400, color: TEXT_MUTED }}>
                              {" "}
                              — {m.tipoRemuneracao === "mensal" ? "mensalista" : `diarista, ${m.diasPorSemana}x/semana`}, {brl(m.custoMensal)}/mês
                            </span>
                          </span>
                          <span style={{ color: INK }}>{brl(m.custoPeriodo)}</span>
                        </div>
                      ))}
                    <div className="flex items-center justify-between fx-mono" style={{ fontSize: 12, fontWeight: 700, borderTop: `1px solid ${LINE}`, paddingTop: 4, marginTop: 2 }}>
                      <span style={{ color: INK }}>Total da folha no período</span>
                      <span style={{ color: INK }}>{brl(folhaEMes.custoFolha)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <div style={{ background: "#fff", borderRadius: 6, padding: "10px 12px" }}>
                  <div className="flex items-center gap-1" style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>
                    <Wallet size={12} /> Custo do ateliê (aluguel + luz)
                  </div>
                  <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700, color: INK }}>{brl(folhaEMes.custoEstrutura)}</div>
                </div>
                <div style={{ background: "#fff", borderRadius: 6, padding: "10px 12px" }}>
                  <div className="flex items-center gap-1" style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>
                    <TrendingUp size={12} /> Margem líquida do período
                  </div>
                  <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700, color: folhaEMes.margemConsolidada >= 0 ? "#2C6E31" : "#9C4A1E" }}>
                    {brl(folhaEMes.margemConsolidada)}
                    {totalDetalheMes.valorVenda > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_MUTED }}>
                        {" "}
                        ({((folhaEMes.margemConsolidada / totalDetalheMes.valorVenda) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 6, padding: "10px 12px" }}>
                  <div className="flex items-center gap-1" style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2 }}>
                    <TrendingUp size={12} /> Espaço pra aumentar folha/capacidade (mantendo {margemMinimaPct}% de margem)
                  </div>
                  <div
                    className="fx-mono"
                    style={{ fontSize: 18, fontWeight: 700, color: folhaEMes.espacoConsolidado >= 0 ? "#2C6E31" : "#9C4A1E" }}
                  >
                    {brl(folhaEMes.espacoConsolidado)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  venda <strong style={{ color: INK }}>{brl(totalDetalheMes.valorVenda)}</strong>
                </span>
                <span className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  material (tecido+aviamento) <strong style={{ color: INK }}>{brl(totalDetalheMes.custoTecido + totalDetalheMes.custoAviamento)}</strong>
                </span>
                <span className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  imposto <strong style={{ color: INK }}>{brl(totalDetalheMes.imposto)}</strong>
                </span>
              </div>
            </div>
          )}
          {detalheMes.length === 0 && <Empty texto="Nenhuma peça pedida nesse mês." />}
          {detalheMes.map((p) => (
            <div key={p.id} className="py-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {p.cliente} <span style={{ fontWeight: 400, color: TEXT_MUTED }}>· {p.tipoPeca} · pedido {fmtData(p.dataPedido)}</span>
                </span>
                <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  venda <strong style={{ color: INK }}>{brl(p.valorVenda)}</strong>
                </span>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 2 }}>
                Tecido: {p.itensTecido.length === 0 && "nenhum item lançado"}
                {p.itensTecido.map((t, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {t.codigo || "(sem código)"} — {t.metragem || "0"}m ×{" "}
                    {t.valorMetro ? brl(parseFloat(t.valorMetro)) + "/m" : <strong style={{ color: "#9C4A1E" }}>sem valor/metro cadastrado</strong>}
                  </span>
                ))}
                {" "}— total <strong style={{ color: INK }}>{brl(p.custoTecido)}</strong>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 2 }}>
                Aviamento ({p.composicaoAviamento.join(" + ") || "sem composição"}): <strong style={{ color: INK }}>{brl(p.custoAviamento)}</strong>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 2 }}>
                Mão de obra (custo atual real da equipe — o que já é pago hoje): <strong style={{ color: INK }}>{brl(p.custoMaoDeObra)}</strong>
                <span style={{ fontSize: 11 }}>
                  {" "}— conta: {p.horasReferencia}h de referência do tipo "{p.tipoPeca}" × {brl(custoHoraGeral)}/h (custo mensal de toda a
                  equipe ÷ média de horas produzidas por mês, últimos 6 meses fechados)
                </span>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 2 }}>
                Custo de ateliê (tecido + aviamento + mão de obra): <strong style={{ color: INK }}>{brl(p.custoAtelie)}</strong>
                {" "}· Imposto ({(parseFloat(aliquotaImposto) || 0).toFixed(1)}%): <strong style={{ color: INK }}>{brl(p.imposto)}</strong>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 2 }}>
                Margem líquida: <strong style={{ color: INK }}>{brl(p.margemLiquida)}</strong>
                {p.valorVenda > 0 && <span> ({((p.margemLiquida / p.valorVenda) * 100).toFixed(1)}% da venda)</span>}
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                Margem mínima desejada ({margemMinimaPct}%): <strong style={{ color: INK }}>{brl(p.margemMinima)}</strong>
                {" "}· Espaço pra remuneração da equipe:{" "}
                <strong style={{ color: p.espacoRemuneracao >= 0 ? "#2C6E31" : "#9C4A1E" }}>{brl(p.espacoRemuneracao)}</strong>
              </div>
            </div>
          ))}
        </Card>
      )}

      {mostrarMargem && (
        margemPorTipo.length > 0 ? (
          <>
            <Card style={{ padding: 20 }} className="mb-6">
              <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
                Margem média por tipo de peça
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
                Venda menos o custo real (tecido + aviamentos pela composição do tipo + mão de obra real da equipe, rateada pela hora). Margem líquida aproximada.
                {margemResumo && ` Margem total (entregues): ${brl(margemResumo.total)}.`}
              </div>
              <BarraSimples dados={margemPorTipo} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${brl(d.valor)} de margem em média (${d.qtd} peça(s))`} />
            </Card>

            <Card style={{ padding: 20 }} className="mb-6">
              <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
                Preço médio e custo por tipo de peça
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
                Preço de venda e custo — material (tecido + aviamentos) separado de mão de obra (custo real da equipe cadastrada em Equipe, rateado pela hora de referência de cada tipo) — base pra decidir se compensa crescer a produção de um tipo específico, ou qual o teto de mão de obra que mantém a margem.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${LINE}`, color: TEXT_MUTED, textAlign: "left" }}>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Tipo</th>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Qtd</th>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Preço médio de venda</th>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Material médio</th>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Mão de obra média</th>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Margem média</th>
                      <th style={{ padding: "6px 8px", fontWeight: 600 }}>Margem %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {precoCustoPorTipo.map((r) => (
                      <tr key={r.tipo} style={{ borderBottom: `1px solid ${LINE}` }}>
                        <td style={{ padding: "8px", fontWeight: 600, color: INK }}>{r.tipo}</td>
                        <td className="fx-mono" style={{ padding: "8px" }}>{r.qtd}</td>
                        <td className="fx-mono" style={{ padding: "8px" }}>{brl(r.precoMedio)}</td>
                        <td className="fx-mono" style={{ padding: "8px" }}>{brl(r.materialMedio)}</td>
                        <td className="fx-mono" style={{ padding: "8px" }}>{brl(r.maoDeObraMedia)}</td>
                        <td className="fx-mono" style={{ padding: "8px", fontWeight: 600 }}>{brl(r.margemMedia)}</td>
                        <td className="fx-mono" style={{ padding: "8px" }}>{r.margemPercentual.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card style={{ padding: 20 }} className="mb-6">
              <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
                Top 10 clientes por margem total
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
                Soma da margem de todas as peças entregues de cada cliente.
              </div>
              <BarraSimples dados={margemPorCliente} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${brl(d.valor)} de margem total`} />
            </Card>
          </>
        ) : (
          <Card style={{ padding: 20 }} className="mb-6">
            <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
              Margem por tipo de peça / cliente
            </div>
            <Empty texto="Nenhuma peça entregue tem valor de venda registrado ainda — as 15 peças históricas importadas só têm dados de produção, sem valor. Preencha 'Valor de venda' nas próximas entregas pra essa métrica aparecer." />
          </Card>
        )
      )}

      {mostrarComparativos && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Média de dias de produção por responsável
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Mesma métrica, agrupada por quem produziu.
          </div>
          <BarraSimples dados={porResponsavel} sufixoValor="d" formatarTooltip={(d) => `${d.chave}: ${d.valor} dias em média (${d.qtd} peça(s))`} />
        </Card>
      )}

      {mostrarComparativos && (
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-5 pt-4 pb-2 fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Peças entregues (detalhado)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}`, background: "#F7F4EC" }}>
                {["Cliente", "Tipo", "Responsável", "Início", "Entrega", "Dias de produção"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{p.cliente || "Sem nome"}</td>
                  <td style={{ padding: "8px 12px" }}>{p.tipoPeca}</td>
                  <td style={{ padding: "8px 12px", color: TEXT_MUTED }}>{p.responsavel || "—"}</td>
                  <td style={{ padding: "8px 12px", color: TEXT_MUTED }}>{fmtData(p.dataInicioProducao)}</td>
                  <td style={{ padding: "8px 12px", color: TEXT_MUTED }}>{fmtData(p.dataEntrega)}</td>
                  <td className="fx-mono" style={{ padding: "8px 12px", color: BRASS, fontWeight: 700 }}>
                    {p.dias !== null ? `${p.dias}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
}
