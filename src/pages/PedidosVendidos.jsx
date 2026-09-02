import React, { useMemo, useState } from "react";
import { ChevronRight, DollarSign, Percent, Scissors, Shirt, ShoppingBag, TrendingDown } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, LINE, PAG_STYLE, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, fmtData, hojeISO } from "../lib/helpers";
import { itensDoMes, labelDoMes, metricasDoMes } from "../lib/vendasMensais";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";

const MESES_HISTORICO = 24;
const LINHAS = ["Todos", "Camisaria", "Alfaiataria"];

function BlocoLinha({ titulo, icon: Icon, faturamento, custo, margem, margemPercentual }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={14} color={BRASS} />
        <span className="fx-serif" style={{ fontSize: 14, fontWeight: 600 }}>
          {titulo}
        </span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <StatCard label="Faturamento" value={brl(faturamento)} icon={ShoppingBag} />
        <StatCard label="Custo" value={brl(custo)} icon={TrendingDown} accent={TEXT_MUTED} />
        <StatCard label="Margem" value={brl(margem)} icon={DollarSign} accent={margem >= 0 ? "#2C6E31" : "#9C4A1E"} />
        <StatCard
          label="Margem %"
          value={margemPercentual == null ? "—" : `${margemPercentual.toFixed(0)}%`}
          icon={Percent}
          accent={margemPercentual == null ? TEXT_MUTED : margemPercentual >= 0 ? "#2C6E31" : "#9C4A1E"}
        />
      </div>
    </div>
  );
}

// Cada camisa e cada peça vendida, mês a mês, com o custo real (tecido +
// aviamento + mão de obra já lançados no pedido) e a margem — separado
// por linha (Camisaria x Alfaiataria) pra comparar o desempenho de
// cada uma. Complementa o Comparativo Mensal (que só compara totais).
export default function PedidosVendidos({ pedidos, pecas, custoAviamentosPorPecaBase = {}, equipe = [], irPara, irParaPeca }) {
  const { maoDeObraPadrao } = useConfigPrecoCamisa();
  const hoje = new Date(hojeISO() + "T00:00:00");

  const meses = useMemo(() => {
    const chaves = [];
    for (let i = 0; i < MESES_HISTORICO; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return chaves;
    // eslint-disable-next-line
  }, []);

  const [chaveMes, setChaveMes] = useState(meses[0]);
  const [linhaFiltro, setLinhaFiltro] = useState("Todos");

  const resumo = useMemo(
    () => metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe),
    [pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe]
  );
  const itens = useMemo(
    () => itensDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe),
    [pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe]
  );
  const itensFiltrados = linhaFiltro === "Todos" ? itens : itens.filter((i) => i.linha === linhaFiltro);

  function abrirItem(item) {
    if (item.linha === "Camisaria" && irPara) irPara(item.origemId);
    else if (item.linha === "Alfaiataria" && irParaPeca) irParaPeca(item.origemId);
  }

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria" title="Pedidos Vendidos" />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={chaveMes} onChange={(e) => setChaveMes(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13, fontWeight: 600 }}>
          {meses.map((m) => (
            <option key={m} value={m}>
              {labelDoMes(m)}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
          Custo e margem usam o tecido e aviamento já lançados em cada pedido/peça. Mão de obra: na camisaria é o
          valor a pagar à Fabiana; na alfaiataria é o rateio do custo mensal da equipe (Equipe) pela quantidade de
          peças do mês, já que Ícaro e freelancers são pagos por mês/diária, não por peça pronta.
        </span>
      </div>

      <BlocoLinha
        titulo="Camisaria"
        icon={Shirt}
        faturamento={resumo.faturamentoCamisaria}
        custo={resumo.custoCamisaria}
        margem={resumo.margemCamisaria}
        margemPercentual={resumo.margemPercentualCamisaria}
      />
      <BlocoLinha
        titulo="Alfaiataria"
        icon={Scissors}
        faturamento={resumo.faturamentoAlfaiataria}
        custo={resumo.custoAlfaiataria}
        margem={resumo.margemAlfaiataria}
        margemPercentual={resumo.margemPercentualAlfaiataria}
      />

      <Card style={{ padding: 20 }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            {labelDoMes(chaveMes)} — pedido a pedido
          </div>
          <div className="flex gap-1">
            {LINHAS.map((l) => (
              <button
                key={l}
                onClick={() => setLinhaFiltro(l)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: linhaFiltro === l ? BRASS : "#EDEAE0",
                  color: linhaFiltro === l ? "#FFF" : TEXT_MUTED,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Toque num item pra abrir o pedido/peça. {resumo.qtdCamisas} camisa(s) e {resumo.qtdPecas} peça(s) nesse mês.
        </div>
        {itensFiltrados.length === 0 && <Empty texto="Nenhum pedido vendido nesse mês (com esse filtro)." />}
        {itensFiltrados.length > 0 && (
          <div>
            {itensFiltrados.map((item, i) => {
              const margemPercentual = item.valor > 0 ? (item.margem / item.valor) * 100 : null;
              const clicavel = !!(item.linha === "Camisaria" ? irPara : irParaPeca);
              return (
                <div
                  key={item.id}
                  onClick={() => clicavel && abrirItem(item)}
                  className="w-full flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < itensFiltrados.length - 1 ? `1px solid ${LINE}` : "none",
                    cursor: clicavel ? "pointer" : "default",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.cliente || "Sem nome"}</span>
                      <Pill text={item.linha} style={item.linha === "Camisaria" ? { bg: "#DCE4EE", fg: "#2E4A6B" } : { bg: "#EADCEE", fg: "#5B2E6B" }} />
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                      {item.tipo} · {fmtData(item.dataPedido)} · {item.quantidade} un · custo {brl(item.custo)}
                      {item.custoEstimado && (
                        <span
                          title={
                            item.linha === "Camisaria"
                              ? "Mão de obra ainda não preenchida nesse pedido — usando a mão de obra padrão como reserva."
                              : "Mão de obra é o rateio do custo mensal da equipe (Equipe) dividido pelas peças desse mês — não é um valor exato dessa peça."
                          }
                        >
                          {" "}
                          (estimado)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {margemPercentual !== null && (
                      <span
                        className="fx-mono"
                        title={`Margem: ${brl(item.margem)}`}
                        style={{ fontSize: 11, fontWeight: 700, color: item.margem >= 0 ? "#2C6E31" : "#9C4A1E" }}
                      >
                        {margemPercentual.toFixed(0)}%
                      </span>
                    )}
                    <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {brl(item.valor)}
                    </span>
                    <Pill text={item.statusPagamento} style={PAG_STYLE[item.statusPagamento] || { bg: "#EDEAE0", fg: "#2A3B4D" }} />
                    <Pill text={item.status} style={STATUS_STYLE[item.status] || { bg: "#EDEAE0", fg: "#2A3B4D" }} />
                    {clicavel && <ChevronRight size={16} color={TEXT_MUTED} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
