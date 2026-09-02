import React, { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";
import { labelDoMes, metricasDoMes } from "../lib/vendasMensais";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";

const MESES_HISTORICO = 12;

function variacao(atual, anterior) {
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

function Variacao({ valor }) {
  if (valor === null) return <span style={{ color: TEXT_MUTED, fontSize: 11 }}>—</span>;
  const positivo = valor >= 0;
  const Icon = positivo ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1" style={{ color: positivo ? "#2C6E31" : "#9C4A1E", fontSize: 11, fontWeight: 700 }}>
      <Icon size={11} /> {positivo ? "+" : ""}
      {valor.toFixed(1)}%
    </span>
  );
}

// Comparativo mês a mês de faturamento, custo real e margem — o custo
// usa os mesmos dados de tecido/aviamento/mão de obra já lançados em
// cada pedido (mesma lógica do Consolidado), não é estimativa à parte.
// Pra ver pedido a pedido com a margem de cada venda, vai em "Pedidos
// Vendidos" — aqui é só o total comparado mês a mês.
export default function ComparativoMensal({ pedidos, pecas, custoAviamentosPorPecaBase = {}, equipe = [] }) {
  const { maoDeObraPadrao } = useConfigPrecoCamisa();
  const hoje = new Date(hojeISO() + "T00:00:00");

  const meses = useMemo(() => {
    const chaves = [];
    for (let i = 0; i < MESES_HISTORICO; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return chaves.map((chaveMes) => metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe));
    // eslint-disable-next-line
  }, [pedidos, pecas, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe]);

  const [mesA, setMesA] = useState(meses[0]?.chaveMes || "");
  const [mesB, setMesB] = useState(meses[1]?.chaveMes || "");

  const dadosA = meses.find((m) => m.chaveMes === mesA) || metricasDoMes(pedidos, pecas, mesA, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe);
  const dadosB = meses.find((m) => m.chaveMes === mesB) || metricasDoMes(pedidos, pecas, mesB, custoAviamentosPorPecaBase, maoDeObraPadrao, equipe);

  const linhasComparativo = [
    { label: "Faturamento total", campo: "faturamentoTotal", formato: brl },
    { label: "Custo total", campo: "custoTotal", formato: brl },
    { label: "Margem", campo: "margemTotal", formato: brl },
    { label: "Faturamento camisaria", campo: "faturamentoCamisaria", formato: brl },
    { label: "Camisas vendidas", campo: "qtdCamisas", formato: (v) => v },
    { label: "Ticket médio — camisaria", campo: "ticketCamisaria", formato: brl },
    { label: "Faturamento alfaiataria", campo: "faturamentoAlfaiataria", formato: brl },
    { label: "Peças vendidas", campo: "qtdPecas", formato: (v) => v },
    { label: "Ticket médio — alfaiataria", campo: "ticketAlfaiataria", formato: brl },
  ];

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria" title="Comparativo Mensal" />
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: -12, marginBottom: 16 }}>
        Pra ver pedido a pedido, com a margem de cada venda, vai na aba "Pedidos Vendidos".
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Comparar dois meses
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Faturamento é o valor real de cada mês; custo e margem usam o tecido, aviamento e mão de obra já lançados
          em cada pedido/peça daquele mês. Escolha os dois meses que quer comparar.
        </div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select value={mesA} onChange={(e) => setMesA(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13 }}>
            {meses.map((m) => (
              <option key={m.chaveMes} value={m.chaveMes}>
                {labelDoMes(m.chaveMes)}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>vs</span>
          <select value={mesB} onChange={(e) => setMesB(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13 }}>
            {meses.map((m) => (
              <option key={m.chaveMes} value={m.chaveMes}>
                {labelDoMes(m.chaveMes)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                {["Métrica", labelDoMes(mesA), labelDoMes(mesB), "Variação"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasComparativo.map((l) => (
                <tr key={l.campo} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{l.label}</td>
                  <td className="fx-mono" style={{ padding: "8px 10px" }}>{l.formato(dadosA[l.campo])}</td>
                  <td className="fx-mono" style={{ padding: "8px 10px" }}>{l.formato(dadosB[l.campo])}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <Variacao valor={variacao(dadosA[l.campo], dadosB[l.campo])} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Últimos {MESES_HISTORICO} meses
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Visão rápida de todos os meses, mês mais recente primeiro.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                {["Mês", "Faturamento total", "Custo total", "Margem", "Camisaria", "Camisas", "Alfaiataria", "Peças"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.chaveMes} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{labelDoMes(m.chaveMes)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", color: BRASS, fontWeight: 700 }}>{brl(m.faturamentoTotal)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", color: TEXT_MUTED }}>{brl(m.custoTotal)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", fontWeight: 700, color: m.margemPercentual == null ? TEXT_MUTED : m.margemPercentual >= 0 ? "#2C6E31" : "#9C4A1E" }}>
                    {brl(m.margemTotal)} {m.margemPercentual != null && `(${m.margemPercentual.toFixed(0)}%)`}
                  </td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{brl(m.faturamentoCamisaria)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{m.qtdCamisas}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{brl(m.faturamentoAlfaiataria)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{m.qtdPecas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
