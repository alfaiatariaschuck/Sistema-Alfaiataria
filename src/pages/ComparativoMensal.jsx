import React, { useMemo, useState } from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS, LINE, PAG_STYLE, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, fmtData, hojeISO } from "../lib/helpers";

const MESES_HISTORICO = 12;

function custoCamisa(p, custoAviamentosPorPecaBase) {
  return custoTecidoDe(p.tecidos) + (custoAviamentosPorPecaBase["Camisa"] || 0) * (parseFloat(p.quantidade) || 0) + (parseFloat(p.pagoFabiana?.valor) || 0);
}

function custoPeca(p, custoAviamentosPorPecaBase) {
  return custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase) + (parseFloat(p.valorTotal) || 0);
}

function metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase) {
  const pedidosMes = (pedidos || []).filter(
    (p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes
  );
  const faturamentoCamisaria = pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const custoCamisaria = pedidosMes.reduce((s, p) => s + custoCamisa(p, custoAviamentosPorPecaBase), 0);
  const qtdCamisas = pedidosMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
  const ticketCamisaria = qtdCamisas > 0 ? faturamentoCamisaria / qtdCamisas : 0;

  const pecasMes = (pecas || []).filter(
    (p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes
  );
  const faturamentoAlfaiataria = pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const custoAlfaiataria = pecasMes.reduce((s, p) => s + custoPeca(p, custoAviamentosPorPecaBase), 0);
  const qtdPecas = pecasMes.length;
  const ticketAlfaiataria = qtdPecas > 0 ? faturamentoAlfaiataria / qtdPecas : 0;

  const faturamentoTotal = faturamentoCamisaria + faturamentoAlfaiataria;
  const custoTotal = custoCamisaria + custoAlfaiataria;
  const margemTotal = faturamentoTotal - custoTotal;

  return {
    chaveMes,
    faturamentoCamisaria,
    qtdCamisas,
    ticketCamisaria,
    faturamentoAlfaiataria,
    qtdPecas,
    ticketAlfaiataria,
    faturamentoTotal,
    custoTotal,
    margemTotal,
    margemPercentual: faturamentoTotal > 0 ? (margemTotal / faturamentoTotal) * 100 : null,
  };
}

// Lista, pedido a pedido, tudo que foi feito num mês — camisas e peças
// de alfaiataria juntas, com custo real e margem de cada um. É o
// "histórico mês a mês" propriamente dito: dá pra abrir qualquer mês
// passado e ver exatamente o que foi vendido e quanto sobrou.
function itensDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase) {
  const camisas = (pedidos || [])
    .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
    .map((p) => {
      const valor = parseFloat(p.aReceber?.valor) || 0;
      const custo = custoCamisa(p, custoAviamentosPorPecaBase);
      return {
        id: "pedido-" + p.id,
        linha: "Camisaria",
        tipo: "Camisa",
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: parseFloat(p.quantidade) || 0,
        valor,
        custo,
        margem: valor - custo,
        statusPagamento: p.aReceber?.statusPagamento || "Pendente",
        status: p.status,
        origemId: p.id,
      };
    });

  const pecasDoMes = (pecas || [])
    .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
    .map((p) => {
      const valor = parseFloat(p.valorVenda) || 0;
      const custo = custoPeca(p, custoAviamentosPorPecaBase);
      return {
        id: "peca-" + p.id,
        linha: "Alfaiataria",
        tipo: p.tipoPeca,
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: 1,
        valor,
        custo,
        margem: valor - custo,
        statusPagamento: p.statusPagamentoVenda || "Pendente",
        status: p.status,
        origemId: p.id,
      };
    });

  return [...camisas, ...pecasDoMes].sort((a, b) => b.dataPedido.localeCompare(a.dataPedido));
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

// Comparativo mês a mês de faturamento, custo real e margem — o custo
// usa os mesmos dados de tecido/aviamento/mão de obra já lançados em
// cada pedido (mesma lógica do Consolidado), não é estimativa à parte.
export default function ComparativoMensal({ pedidos, pecas, custoAviamentosPorPecaBase = {}, irPara, irParaPeca }) {
  const hoje = new Date(hojeISO() + "T00:00:00");

  const meses = useMemo(() => {
    const chaves = [];
    for (let i = 0; i < MESES_HISTORICO; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return chaves.map((chaveMes) => metricasDoMes(pedidos, pecas, chaveMes, custoAviamentosPorPecaBase));
    // eslint-disable-next-line
  }, [pedidos, pecas, custoAviamentosPorPecaBase]);

  const [mesA, setMesA] = useState(meses[0]?.chaveMes || "");
  const [mesB, setMesB] = useState(meses[1]?.chaveMes || "");
  const [mesDetalhe, setMesDetalhe] = useState(meses[0]?.chaveMes || "");

  const dadosA = meses.find((m) => m.chaveMes === mesA) || metricasDoMes(pedidos, pecas, mesA, custoAviamentosPorPecaBase);
  const dadosB = meses.find((m) => m.chaveMes === mesB) || metricasDoMes(pedidos, pecas, mesB, custoAviamentosPorPecaBase);

  const itensDetalhe = useMemo(() => itensDoMes(pedidos, pecas, mesDetalhe, custoAviamentosPorPecaBase), [pedidos, pecas, mesDetalhe, custoAviamentosPorPecaBase]);

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

  function abrirItem(item) {
    if (item.linha === "Camisaria" && irPara) irPara(item.origemId);
    else if (item.linha === "Alfaiataria" && irParaPeca) irParaPeca(item.origemId);
  }

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria" title="Comparativo Mensal" />

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

      <Card style={{ padding: 20 }} className="mb-6">
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

      <Card style={{ padding: 20 }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            Histórico do mês — pedido a pedido
          </div>
          <select value={mesDetalhe} onChange={(e) => setMesDetalhe(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 13 }}>
            {meses.map((m) => (
              <option key={m.chaveMes} value={m.chaveMes}>
                {labelDoMes(m.chaveMes)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Cada camisa e cada peça vendida naquele mês, com custo real e margem — toque pra abrir o pedido/peça.
        </div>
        {itensDetalhe.length === 0 && <Empty texto="Nenhum pedido nesse mês." />}
        {itensDetalhe.length > 0 && (
          <div>
            {itensDetalhe.map((item, i) => {
              const margemPercentual = item.valor > 0 ? (item.margem / item.valor) * 100 : null;
              const clicavel = !!(item.linha === "Camisaria" ? irPara : irParaPeca);
              return (
                <div
                  key={item.id}
                  onClick={() => clicavel && abrirItem(item)}
                  className="w-full flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < itensDetalhe.length - 1 ? `1px solid ${LINE}` : "none",
                    cursor: clicavel ? "pointer" : "default",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.cliente || "Sem nome"}</span>
                      <Pill text={item.linha} style={item.linha === "Camisaria" ? { bg: "#DCE4EE", fg: "#2E4A6B" } : { bg: "#EADCEE", fg: "#5B2E6B" }} />
                    </div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                      {item.tipo} · {fmtData(item.dataPedido)} · {item.quantidade} un
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {margemPercentual !== null && (
                      <span
                        className="fx-mono"
                        title={`Margem: ${brl(item.margem)} (custo ${brl(item.custo)})`}
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
