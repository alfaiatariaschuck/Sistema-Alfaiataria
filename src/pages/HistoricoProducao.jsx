import React, { useMemo } from "react";
import { AlertTriangle, Clock, Hourglass, PackageCheck, Timer, Wallet, Zap } from "lucide-react";
import { BarraDuasSeries, BarraSimples, Card, Empty, PageTitle, StatCard } from "../components/ui";
import {
  BRASS,
  COR_REAL,
  COR_REFERENCIA,
  HORAS_PRODUTIVAS_POR_DIA_PADRAO,
  HORAS_REFERENCIA_TIPO_PECA,
  INK,
  LINE,
  TEXT_MUTED,
} from "../lib/constants";
import { brl, diasEsperaCliente, diasProducaoReal, fmtData } from "../lib/helpers";

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
export default function HistoricoProducao({ pecas, mostrarMargem = false }) {
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
  const comEsperaCliente = useMemo(() => entregues.map((p) => diasEsperaCliente(p)).filter((d) => d > 0), [entregues]);
  const mediaEsperaCliente = useMemo(
    () => (comEsperaCliente.length ? Math.round(comEsperaCliente.reduce((s, v) => s + v, 0) / comEsperaCliente.length) : null),
    [comEsperaCliente]
  );

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

  // Margem por peça: venda menos o valor devido ao Ícaro (custo de mão
  // de obra) — não desconta tecido porque isso não é rastreado por
  // peça no sistema, então é uma margem bruta aproximada, não líquida.
  // Só entra quem tem valor de venda lançado. Só calculado quando
  // mostrarMargem=true (tela do Ícaro não recebe valor_venda/valor_total
  // do banco, então nem teria como calcular isso direito).
  const comMargem = useMemo(() => {
    if (!mostrarMargem) return [];
    return entregues
      .filter((p) => p.valorVenda !== "" && p.valorVenda != null)
      .map((p) => {
        const venda = parseFloat(p.valorVenda) || 0;
        const custo = parseFloat(p.valorTotal) || 0;
        const dias = diasProducaoReal(p);
        return { ...p, margem: venda - custo, margemPorDia: dias ? (venda - custo) / dias : null };
      });
  }, [entregues, mostrarMargem]);

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
        <StatCard label="Espera média por prova" value={mediaEsperaCliente !== null ? `${mediaEsperaCliente}d` : "—"} icon={Hourglass} />
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
      {mediaEsperaCliente === null && (
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

      {comparativo.length > 0 && (
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

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Peças vendidas por mês
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Quantidade de peças vendidas por mês, desde o início (agrupada pela data do pedido — entregues ou não).
          </div>
          <BarraSimples dados={vendasPorMes} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) vendida(s)`} />
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Sazonalidade (vendas por mês do ano)
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
            Soma de todos os anos, por mês — mostra picos que se repetem (ex: casamentos), independente do ano exato.
          </div>
          <BarraSimples dados={sazonalidade} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${d.valor} peça(s) vendida(s) (todos os anos)`} />
        </Card>
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Vendidas vs. Entregues por mês
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          Confronto direto, mês a mês — mostra se a produção está no ritmo das vendas. Uma peça vendida num mês pode ser entregue em outro, então não é exatamente "sobra", mas mostra a tendência.
        </div>
        <BarraVendasEntregas dados={vendasVsEntregasPorMes} />
      </Card>

      {retrabalhoPorResponsavel.length > 0 && (
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

      {mostrarMargem && (
        margemPorTipo.length > 0 ? (
          <>
            <Card style={{ padding: 20 }} className="mb-6">
              <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
                Margem média por tipo de peça
              </div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
                Venda menos o valor devido ao Ícaro (mão de obra) — não desconta tecido, que não é rastreado por peça. Margem bruta aproximada.
                {margemResumo && ` Margem total (entregues): ${brl(margemResumo.total)}.`}
              </div>
              <BarraSimples dados={margemPorTipo} sufixoValor="" formatarTooltip={(d) => `${d.chave}: ${brl(d.valor)} de margem em média (${d.qtd} peça(s))`} />
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

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Média de dias de produção por responsável
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          Mesma métrica, agrupada por quem produziu.
        </div>
        <BarraSimples dados={porResponsavel} sufixoValor="d" formatarTooltip={(d) => `${d.chave}: ${d.valor} dias em média (${d.qtd} peça(s))`} />
      </Card>

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
    </div>
  );
}
