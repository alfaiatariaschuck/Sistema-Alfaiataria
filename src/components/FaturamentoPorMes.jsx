import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { brl } from "../lib/helpers";

// Mesma paleta camisaria/alfaiataria do gráfico "Peças vendidas por ano"
// em Clientes.jsx — consistência entre os gráficos do sistema.
const AZUL = "#2A78D6";
const ALTURA_GRAFICO = 150;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

// Faturamento bruto lançado no mês (não é caixa recebido — isso já tem
// seção própria de "Projeção"). Doação e pedidos emitidos de plano saem
// da conta, mesmo critério do Relatório (não são venda nova).
function calcularFaturamentoPorMes(pedidos, pecas) {
  const mapa = new Map();
  function bucket(mes) {
    if (!mapa.has(mes)) mapa.set(mes, { camisaria: 0, alfaiataria: 0 });
    return mapa.get(mes);
  }
  pedidos.forEach((p) => {
    if (p.status === "Doação" || p.origemPlanoId || !p.dataPedido) return;
    const valor = parseFloat(p.aReceber?.valor) || 0;
    if (!valor) return;
    bucket(p.dataPedido.slice(0, 7)).camisaria += valor;
  });
  (pecas || []).forEach((p) => {
    if (p.status === "Doação" || !p.dataPedido) return;
    const valor = parseFloat(p.valorVenda) || 0;
    if (!valor) return;
    bucket(p.dataPedido.slice(0, 7)).alfaiataria += valor;
  });
  return [...mapa.entries()]
    .map(([mes, v]) => ({ mes, ...v, total: v.camisaria + v.alfaiataria }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12);
}

export default function FaturamentoPorMes({ pedidos, pecas }) {
  const dados = useMemo(() => calcularFaturamentoPorMes(pedidos, pecas), [pedidos, pecas]);
  const [hover, setHover] = useState(null);
  const maxTotal = Math.max(1, ...dados.map((d) => d.total));

  if (dados.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Faturamento por mês
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 11, color: TEXT_MUTED }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: AZUL, display: "inline-block" }} /> Camisaria
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: BRASS, display: "inline-block" }} /> Alfaiataria
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        Últimos 12 meses, valor de venda lançado (não é caixa recebido) — exclui Doação e vendas de Plano de
        Assinatura (não geram receita nova).
      </div>

      <div className="flex items-end gap-2 md:gap-4" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const alturaTotal = (d.total / maxTotal) * ALTURA_GRAFICO;
          const alturaAlfaiataria = d.total > 0 ? (d.alfaiataria / d.total) * alturaTotal : 0;
          const alturaCamisaria = alturaTotal - alturaAlfaiataria;
          const emFoco = hover === d.mes;
          return (
            <div
              key={d.mes}
              className="flex flex-col items-center"
              style={{ flex: 1, minWidth: 30, position: "relative" }}
              onMouseEnter={() => setHover(d.mes)}
              onMouseLeave={() => setHover(null)}
            >
              {emFoco && (
                <div
                  style={{
                    position: "absolute",
                    bottom: alturaTotal + 34,
                    background: INK,
                    color: "#FFF",
                    padding: "7px 11px",
                    borderRadius: 6,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {rotuloMes(d.mes)}: {brl(d.total)} · Camisaria {brl(d.camisaria)} · Alfaiataria {brl(d.alfaiataria)}
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {brl(d.total)}
              </div>
              <div className="flex flex-col justify-end w-full" style={{ height: ALTURA_GRAFICO, maxWidth: 44, margin: "0 auto" }}>
                {alturaAlfaiataria > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaAlfaiataria, 3),
                      background: BRASS,
                      borderRadius: "4px 4px 0 0",
                      marginBottom: alturaCamisaria > 0 ? 2 : 0,
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
                {alturaCamisaria > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaCamisaria, 3),
                      background: AZUL,
                      borderRadius: alturaAlfaiataria > 0 ? "0 0 0 0" : "4px 4px 0 0",
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
              </div>
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
                {rotuloMes(d.mes)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${LINE}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: TEXT_MUTED }}>
              <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600 }}>Mês</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Camisaria</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Alfaiataria</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="fx-mono" style={{ borderTop: `1px solid ${LINE}` }}>
                <td style={{ padding: "5px 8px" }}>{rotuloMes(d.mes)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{brl(d.camisaria)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{brl(d.alfaiataria)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{brl(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
