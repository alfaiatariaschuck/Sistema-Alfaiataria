import React, { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";

const MESES_HISTORICO = 12;

function metricasDoMes(pedidos, pecas, chaveMes) {
  const pedidosMes = (pedidos || []).filter(
    (p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes
  );
  const faturamentoCamisaria = pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const qtdCamisas = pedidosMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
  const ticketCamisaria = qtdCamisas > 0 ? faturamentoCamisaria / qtdCamisas : 0;

  const pecasMes = (pecas || []).filter(
    (p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes
  );
  const faturamentoAlfaiataria = pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const qtdPecas = pecasMes.length;
  const ticketAlfaiataria = qtdPecas > 0 ? faturamentoAlfaiataria / qtdPecas : 0;

  return {
    chaveMes,
    faturamentoCamisaria,
    qtdCamisas,
    ticketCamisaria,
    faturamentoAlfaiataria,
    qtdPecas,
    ticketAlfaiataria,
    faturamentoTotal: faturamentoCamisaria + faturamentoAlfaiataria,
  };
}

function labelDoMes(chaveMes) {
  const [ano, mes] = chaveMes.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

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

// Comparativo mês a mês de faturamento e ticket médio — não depende de
// custo histórico (que a gente não guarda), só usa o que já é real e
// gravado em cada pedido/peça: valor de venda e data.
export default function ComparativoMensal({ pedidos, pecas }) {
  const hoje = new Date(hojeISO() + "T00:00:00");

  const meses = useMemo(() => {
    const chaves = [];
    for (let i = 0; i < MESES_HISTORICO; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return chaves.map((chaveMes) => metricasDoMes(pedidos, pecas, chaveMes));
    // eslint-disable-next-line
  }, [pedidos, pecas]);

  const [mesA, setMesA] = useState(meses[0]?.chaveMes || "");
  const [mesB, setMesB] = useState(meses[1]?.chaveMes || "");

  const dadosA = meses.find((m) => m.chaveMes === mesA) || metricasDoMes(pedidos, pecas, mesA);
  const dadosB = meses.find((m) => m.chaveMes === mesB) || metricasDoMes(pedidos, pecas, mesB);

  const linhasComparativo = [
    { label: "Faturamento total", campo: "faturamentoTotal", formato: brl },
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

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Comparar dois meses
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Faturamento e ticket médio são valores reais de cada mês (não dependem de custo estimado). Escolha os dois
          meses que quer comparar.
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
                {["Mês", "Faturamento total", "Camisaria", "Camisas", "Ticket cam.", "Alfaiataria", "Peças", "Ticket alf."].map((h) => (
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
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{brl(m.faturamentoCamisaria)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{m.qtdCamisas}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{brl(m.ticketCamisaria)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{brl(m.faturamentoAlfaiataria)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{m.qtdPecas}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px" }}>{brl(m.ticketAlfaiataria)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
