import React, { useMemo, useState } from "react";
import { Clock, Hourglass, PackageCheck, Timer, Zap } from "lucide-react";
import { Card, Empty, PageTitle, StatCard } from "../components/ui";
import {
  BRASS,
  HORAS_PRODUTIVAS_POR_DIA_PADRAO,
  HORAS_REFERENCIA_TIPO_PECA,
  INK,
  LINE,
  TEXT_MUTED,
} from "../lib/constants";
import { diasEsperaCliente, diasProducaoReal, fmtData } from "../lib/helpers";

// Cores de comparação (2 séries categóricas) — validadas com o
// verificador de paleta do skill de dataviz (blue/orange, slots 1-2 da
// paleta de referência): passam piso de croma, contraste e separação
// por daltonismo. As cores da marca (BRASS/INK_SOFT) não passam o piso
// de croma pra uso categórico, por isso essa dupla à parte só aqui.
const COR_REFERENCIA = "#eb6834";
const COR_REAL = "#2a78d6";

// Aqui "referência" é sempre a conta pura de horas de desenvolvimento
// da planilha de parâmetros (ex.: 23h pra um traje) convertida em dias
// pela capacidade produtiva padrão — de propósito NÃO usa
// DIAS_REFERENCIA_TIPO_PECA (esse número já foi recalibrado com o
// próprio histórico real, então empataria com a barra "Real" e
// esconderia o atraso que é justamente o que esse gráfico existe pra
// mostrar).
function diasReferenciaTipo(tipo) {
  const horas = HORAS_REFERENCIA_TIPO_PECA[tipo];
  if (!horas) return null;
  return Math.max(1, Math.round(horas / HORAS_PRODUTIVAS_POR_DIA_PADRAO));
}

// Gráfico de barras pareadas (2 séries) — mesmo padrão visual da
// BarraSimples, mas com duas barras lado a lado por categoria e legenda
// (obrigatória pra 2+ séries pelo skill de dataviz). Genérico: recebe
// dados já no formato {chave, a, b} e as cores/legendas/tooltip de cada
// série, pra servir tanto pra "Referência vs Real" quanto pra "Vendidas
// vs Entregues".
function BarraDuasSeries({ dados, corA, corB, legendaA, legendaB, tooltipDe, notaDe }) {
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.flatMap((d) => [d.a ?? 0, d.b ?? 0]));
  const ALTURA = 130;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: corA, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>{legendaA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: corB, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>{legendaB}</span>
        </div>
      </div>
      <div className="flex items-end gap-4 flex-wrap" style={{ minHeight: ALTURA + 50 }}>
        {dados.map((d) => {
          const emFoco = hover === d.chave;
          return (
            <div
              key={d.chave}
              className="flex flex-col items-center"
              style={{ flex: "1 0 90px", minWidth: 90, position: "relative" }}
              onMouseEnter={() => setHover(d.chave)}
              onMouseLeave={() => setHover(null)}
            >
              {emFoco && (
                <div
                  style={{
                    position: "absolute",
                    bottom: ALTURA + 34,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: INK,
                    color: "#FFF",
                    padding: "7px 11px",
                    borderRadius: 6,
                    fontSize: 11,
                    whiteSpace: "normal",
                    maxWidth: 220,
                    textAlign: "center",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {tooltipDe ? tooltipDe(d) : `${d.chave}: ${legendaA} ${d.a ?? "—"} · ${legendaB} ${d.b ?? "—"}`}
                </div>
              )}
              <div className="flex items-end gap-1.5" style={{ height: ALTURA }}>
                {[
                  { valor: d.a, cor: corA },
                  { valor: d.b, cor: corB },
                ].map((serie, i) => {
                  const altura = serie.valor ? (serie.valor / maxValor) * ALTURA : 0;
                  return (
                    <div key={i} className="flex flex-col items-center justify-end" style={{ height: ALTURA, width: 30 }}>
                      {serie.valor != null && (
                        <div className="fx-mono" style={{ fontSize: 11, fontWeight: 700, color: emFoco ? serie.cor : INK, marginBottom: 4 }}>
                          {serie.valor}
                        </div>
                      )}
                      <div
                        style={{
                          height: Math.max(serie.valor ? altura : 0, serie.valor ? 3 : 0),
                          width: "100%",
                          background: serie.cor,
                          borderRadius: "4px 4px 0 0",
                          opacity: emFoco ? 1 : 0.9,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, textAlign: "center" }}>
                {d.chave}
              </div>
              {notaDe && notaDe(d)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarraComparativa({ dados }) {
  const dadosAB = dados.map((d) => ({ chave: d.chave, a: d.referencia, b: d.real, horas: d.horas }));
  return (
    <BarraDuasSeries
      dados={dadosAB}
      corA={COR_REFERENCIA}
      corB={COR_REAL}
      legendaA="Referência (parâmetro)"
      legendaB="Real (histórico)"
      tooltipDe={(d) =>
        `${d.chave}: referência ${d.a ?? "—"}d${d.horas ? ` (${d.horas}h)` : ""} · real ${d.b ?? "—"}d` +
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

// Barra simples, mesmo estilo do gráfico de tempo médio por mês já
// usado no painel — uma cor só (BRASS), rótulo direto acima da barra,
// tooltip no hover. Genérico o bastante pra servir tanto pra "por tipo"
// quanto "por responsável".
function BarraSimples({ dados, sufixoValor, formatarTooltip }) {
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.map((d) => d.valor));
  const ALTURA = 130;

  return (
    <div className="flex items-end gap-3 flex-wrap" style={{ minHeight: ALTURA + 50 }}>
      {dados.map((d) => {
        const altura = (d.valor / maxValor) * ALTURA;
        const emFoco = hover === d.chave;
        return (
          <div
            key={d.chave}
            className="flex flex-col items-center"
            style={{ flex: "1 0 60px", minWidth: 60, position: "relative" }}
            onMouseEnter={() => setHover(d.chave)}
            onMouseLeave={() => setHover(null)}
          >
            {emFoco && (
              <div
                style={{
                  position: "absolute",
                  bottom: altura + 34,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: INK,
                  color: "#FFF",
                  padding: "7px 11px",
                  borderRadius: 6,
                  fontSize: 11,
                  whiteSpace: "normal",
                  maxWidth: 220,
                  textAlign: "center",
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {formatarTooltip ? formatarTooltip(d) : `${d.chave}: ${d.valor}${sufixoValor || ""}`}
              </div>
            )}
            <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
              {d.valor}
              {sufixoValor || ""}
            </div>
            <div
              style={{
                height: Math.max(altura, 3),
                width: "100%",
                maxWidth: 44,
                margin: "0 auto",
                background: BRASS,
                borderRadius: "4px 4px 0 0",
                opacity: emFoco ? 1 : 0.9,
              }}
            />
            <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, textAlign: "center" }}>
              {d.chave}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Histórico de produção da alfaiataria: médias reais (início -> entrega,
// já sem pausas) por tipo de peça e por responsável, com gráficos —
// pensado pra apresentação/reunião de equipe, não pra edição de nada.
export default function HistoricoProducao({ pecas }) {
  const entregues = useMemo(
    () => pecas.filter((p) => p.status === "Entregue" && p.dataInicioProducao && p.dataEntrega),
    [pecas]
  );

  const porTipo = useMemo(() => {
    const mapa = new Map();
    entregues.forEach((p) => {
      const dias = diasProducaoReal(p);
      if (dias === null) return;
      if (!mapa.has(p.tipoPeca)) mapa.set(p.tipoPeca, []);
      mapa.get(p.tipoPeca).push(dias);
    });
    return [...mapa.entries()]
      .map(([tipo, valores]) => ({
        chave: tipo,
        valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
        qtd: valores.length,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [entregues]);

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

  // Referência (parâmetro de horas de desenvolvimento, convertido em
  // dias) vs Real (média histórica) — só entra na comparação o tipo que
  // tem referência configurada.
  const comparativo = useMemo(
    () =>
      porTipo
        .map((d) => ({
          chave: d.chave,
          real: d.valor,
          referencia: diasReferenciaTipo(d.chave),
          horas: HORAS_REFERENCIA_TIPO_PECA[d.chave] || null,
          qtd: d.qtd,
        }))
        .filter((d) => d.referencia !== null),
    [porTipo]
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
            Dias de trabalho previstos na planilha de parâmetros (ex.: 23h pra um traje) contra a média real do histórico de produção — o tamanho da diferença é o atraso real da produção.
          </div>
          {atrasoResumo !== null && (
            <div
              className="fx-mono"
              style={{ fontSize: 12, fontWeight: 700, color: COR_REAL, marginBottom: 16, background: "#EAF1FB", display: "inline-block", padding: "6px 12px", borderRadius: 6 }}
            >
              No geral, a produção está levando {atrasoResumo.toFixed(1)}x o tempo previsto no parâmetro
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
