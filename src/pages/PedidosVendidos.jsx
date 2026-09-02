import React, { useMemo, useState } from "react";
import { ChevronRight, DollarSign, Percent, ShoppingBag, TrendingDown } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { LINE, PAG_STYLE, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, fmtData, hojeISO } from "../lib/helpers";
import { itensDoMes, labelDoMes, metricasDoMes } from "../lib/vendasMensais";

const MESES_HISTORICO = 24;

// Cada camisa e cada peça vendida, mês a mês, com o custo real (tecido +
// aviamento + mão de obra já lançados no pedido) e a margem — é o
// histórico que alimenta "quanto preciso vender pra ter tal lucro" mais
// pra frente. Complementa o Comparativo Mensal (que só compara totais).
export default function PedidosVendidos({ pedidos, pecas, custoAviamentosPorPecaBase = {}, irPara, irParaPeca }) {
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

  const resumo = useMemo(() => metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase), [pedidos, pecas, chaveMes, custoAviamentosPorPecaBase]);
  const itens = useMemo(() => itensDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase), [pedidos, pecas, chaveMes, custoAviamentosPorPecaBase]);

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
          Custo e margem usam o tecido, aviamento e mão de obra já lançados em cada pedido/peça — não é estimativa à parte.
        </span>
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard label="Faturamento" value={brl(resumo.faturamentoTotal)} icon={ShoppingBag} />
        <StatCard label="Custo total" value={brl(resumo.custoTotal)} icon={TrendingDown} accent={TEXT_MUTED} />
        <StatCard
          label="Margem"
          value={brl(resumo.margemTotal)}
          icon={DollarSign}
          accent={resumo.margemTotal >= 0 ? "#2C6E31" : "#9C4A1E"}
        />
        <StatCard
          label="Margem %"
          value={resumo.margemPercentual == null ? "—" : `${resumo.margemPercentual.toFixed(0)}%`}
          icon={Percent}
          accent={resumo.margemPercentual == null ? TEXT_MUTED : resumo.margemPercentual >= 0 ? "#2C6E31" : "#9C4A1E"}
        />
      </div>

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          {labelDoMes(chaveMes)} — pedido a pedido
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Toque num item pra abrir o pedido/peça. {resumo.qtdCamisas} camisa(s) e {resumo.qtdPecas} peça(s) nesse mês.
        </div>
        {itens.length === 0 && <Empty texto="Nenhum pedido vendido nesse mês." />}
        {itens.length > 0 && (
          <div>
            {itens.map((item, i) => {
              const margemPercentual = item.valor > 0 ? (item.margem / item.valor) * 100 : null;
              const clicavel = !!(item.linha === "Camisaria" ? irPara : irParaPeca);
              return (
                <div
                  key={item.id}
                  onClick={() => clicavel && abrirItem(item)}
                  className="w-full flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < itens.length - 1 ? `1px solid ${LINE}` : "none",
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
